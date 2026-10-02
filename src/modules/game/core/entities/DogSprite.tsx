import { useImage, type SkImage } from '@shopify/react-native-skia';
import { SpriteFrame } from './SpriteFrame';
import { forwardFrame, reverseFrame, selectDirectionalClip } from '../systems/spritePlayback';
import type { DogAgent, DogState } from '../systems/dogStateMachine';
import {
  DOG_FRAME_SIZE,
  DogDirection,
  dogIdleColumn,
  dogIdleRow,
  dogWalkAtlas,
  dogWalkRow,
} from '../assets/dog/dogWalkAtlas';
import type { DogActionKey, DogAssetManifest, DogSpriteDirection } from '../../../dog/types';

interface DogSpriteProps {
  dog: DogAgent;
  /** This dog's real asset manifest, or null to always use the placeholder atlas below. */
  manifest: DogAssetManifest | null;
  /** Ball-play borrows SNIFF/IDLE poses while a throw is in progress — when set, render
   * this instead of `dog.state`/its sub-phase (a pose override never has reverse-playback
   * timing of its own, so it just rides the shared env clock like any other loop). */
  renderStateOverride?: DogState;
  /** 4-way facing (docs/map-dog-sprites.md) — DOWN/UP pick that direction's own front/rear
   * art when the manifest has it, LEFT mirrors RIGHT's, and the placeholder atlas path
   * below derives its own 3-row FRONT/SIDE/REAR + flipX from this same value. */
  direction: DogSpriteDirection;
  /** The shared 8-step environment clock (250ms/step) — used for looping actions instead
   * of a from-scratch per-dog timer, and for the old placeholder atlas's own columns. */
  envAnimFrame: number;
  /** Which of the 3 placeholder identities to fall back to when there's no real manifest
   * (or this dog's manifest doesn't have the action it's currently in). */
  identity: number;
  /** Screen-space ground/foot position — NOT a top-left corner (each path below picks its
   * own anchor: the manifest's real `anchorPixels`, or the placeholder atlas's center). */
  groundX: number;
  groundY: number;
  size: number;
}

const PLACEHOLDER_DIRECTION: Record<DogSpriteDirection, { row: DogDirection; flipX: boolean }> = {
  UP: { row: DogDirection.REAR, flipX: false },
  DOWN: { row: DogDirection.FRONT, flipX: false },
  RIGHT: { row: DogDirection.SIDE, flipX: false },
  LEFT: { row: DogDirection.SIDE, flipX: true },
};

/**
 * Renders one dog frame from its real per-action manifest (docs/dog-action-playback-spec.md,
 * docs/map-dog-sprites.md) when it has one loaded for the action+direction it's currently
 * in, falling back to the old 3-identity placeholder atlas (dogWalkAtlas.ts) otherwise — a
 * dog with a manifest that's merely missing ONE action (e.g. no SIT asset yet) still falls
 * back per-action, not per-dog, since `selectDirectionalClip` is what actually checks.
 */
export function DogSprite({
  dog,
  manifest,
  renderStateOverride,
  direction,
  envAnimFrame,
  identity,
  groundX,
  groundY,
  size,
}: DogSpriteProps) {
  // Fixed-count useImage calls (same reasoning as GameScreen.tsx's waterFrames array) —
  // rules of hooks forbid calling it conditionally per this dog's actual availableActions,
  // which varies dog to dog. Slots for actions/directions this dog doesn't have just get
  // `undefined` and resolve to `null`.
  const sheets: Partial<Record<DogActionKey, SkImage | null>> = {
    IDLE: useImage(manifest?.animations.IDLE?.spritesheetUrl),
    WALK: useImage(manifest?.animations.WALK?.spritesheetUrl),
    RUN: useImage(manifest?.animations.RUN?.spritesheetUrl),
    SNIFF: useImage(manifest?.animations.SNIFF?.spritesheetUrl),
    TAIL_WAG: useImage(manifest?.animations.TAIL_WAG?.spritesheetUrl),
    BACK_OFF: useImage(manifest?.animations.BACK_OFF?.spritesheetUrl),
    SIT: useImage(manifest?.animations.SIT?.spritesheetUrl),
    LIE_DOWN: useImage(manifest?.animations.LIE_DOWN?.spritesheetUrl),
  };
  // mapDirections currently only ever has IDLE/WALK for DOWN/UP (docs/map-dog-sprites.md) —
  // fixed slots for just those, not a full 8-action×3-direction cross product that mostly
  // wouldn't have real files behind it yet.
  const downIdleSheet = useImage(manifest?.mapDirections?.DOWN?.IDLE?.spritesheetUrl);
  const downWalkSheet = useImage(manifest?.mapDirections?.DOWN?.WALK?.spritesheetUrl);
  const upIdleSheet = useImage(manifest?.mapDirections?.UP?.IDLE?.spritesheetUrl);
  const upWalkSheet = useImage(manifest?.mapDirections?.UP?.WALK?.spritesheetUrl);
  const fallbackSheet = useImage(dogWalkAtlas);

  const state = renderStateOverride ?? dog.state;
  const selected = manifest ? selectDirectionalClip(manifest, state, direction) : null;

  if (manifest && selected) {
    // Keyed by URL (unique per file within one manifest) rather than by action/direction,
    // since `selected` may have substituted a different action's art (RUN/BACK_OFF → WALK).
    const sheetsByUrl: Record<string, SkImage | null> = {};
    for (const key of Object.keys(sheets) as DogActionKey[]) {
      const url = manifest.animations[key]?.spritesheetUrl;
      if (url) {
        sheetsByUrl[url] = sheets[key] ?? null;
      }
    }
    const down = manifest.mapDirections?.DOWN;
    const up = manifest.mapDirections?.UP;
    if (down?.IDLE) sheetsByUrl[down.IDLE.spritesheetUrl] = downIdleSheet;
    if (down?.WALK) sheetsByUrl[down.WALK.spritesheetUrl] = downWalkSheet;
    if (up?.IDLE) sheetsByUrl[up.IDLE.spritesheetUrl] = upIdleSheet;
    if (up?.WALK) sheetsByUrl[up.WALK.spritesheetUrl] = upWalkSheet;

    const sheet = sheetsByUrl[selected.clip.spritesheetUrl];
    if (sheet) {
      const clip = selected.clip;
      // Only SIT/LIE_DOWN ever set subPhase, and neither substitutes a different action
      // nor has directional art — `clip` here is always the exact same object
      // dogStateMachine.ts computed dog.subPhase/reverseFromFrame/clipElapsedMs against.
      const isOwnState = renderStateOverride === undefined;
      let frameIndex: number;
      if (isOwnState && dog.subPhase === 'REVERSE') {
        frameIndex = reverseFrame(clip, dog.reverseFromFrame, dog.clipElapsedMs).index;
      } else if (isOwnState && dog.subPhase === 'ENTER') {
        frameIndex = forwardFrame(clip, dog.clipElapsedMs);
      } else if (isOwnState && dog.subPhase === 'HOLD') {
        frameIndex = clip.frames.length - 1;
      } else {
        // A plain looping action (or a ball-play pose override, which has no elapsed-time
        // tracking of its own) — ride the shared env clock converted to ms.
        frameIndex = forwardFrame(clip, envAnimFrame * (clip.frames[0]?.durationMs ?? 1));
      }
      const scale = size / manifest.frameSize.width;
      return (
        <SpriteFrame
          sheet={sheet}
          frameSize={manifest.frameSize.width}
          col={frameIndex}
          row={0}
          x={groundX - manifest.anchorPixels.x * scale}
          y={groundY - manifest.anchorPixels.y * scale}
          size={size}
          flipX={selected.flipX}
        />
      );
    }
  }

  // Fallback: the placeholder atlas, centered on the ground point (its anchor ≈ center).
  if (!fallbackSheet) {
    return null;
  }
  const { row: placeholderDirection, flipX } = PLACEHOLDER_DIRECTION[direction];
  const moving = state === 'WALK' || state === 'RUN' || state === 'BACK_OFF';
  const row = moving ? dogWalkRow(identity, placeholderDirection) : dogIdleRow(identity);
  const col = moving ? envAnimFrame : dogIdleColumn(state, envAnimFrame);
  return (
    <SpriteFrame
      sheet={fallbackSheet}
      frameSize={DOG_FRAME_SIZE}
      col={col}
      row={row}
      x={groundX - size / 2}
      y={groundY - size / 2}
      size={size}
      flipX={flipX}
    />
  );
}

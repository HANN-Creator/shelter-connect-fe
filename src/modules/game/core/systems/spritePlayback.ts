import type { DogActionKey, DogAssetClip, DogAssetManifest, DogSpriteDirection } from '../../../dog/types';

// Ported from the backend team's own reference implementation
// (core/assets/dog/real-v1/reference-playback.ts, docs/dog-action-playback-spec.md v2) —
// frame-timing math only, no RN/Skia dependency (game/core stays platform-agnostic).

/** Total playback time of `clip`, or just its first `uptoFrameIndex + 1` frames — used to time
 * the ENTER/HOLD/REVERSE phases of a SIT/LIE_DOWN sub-machine (dogStateMachine.ts). */
export function clipDurationMs(clip: DogAssetClip, uptoFrameIndex?: number): number {
  const end =
    uptoFrameIndex === undefined ? clip.frames.length - 1 : Math.max(0, Math.min(clip.frames.length - 1, uptoFrameIndex));
  let total = 0;
  for (let i = 0; i <= end; i++) {
    total += clip.frames[i].durationMs;
  }
  return total;
}

/** Current frame index for forward playback: loops if `clip.loop`, else holds on the last frame. */
export function forwardFrame(clip: DogAssetClip, elapsedMs: number): number {
  const total = clip.frames.reduce((sum, f) => sum + f.durationMs, 0);
  if (!clip.frames.length || total <= 0) {
    throw new Error('Invalid animation clip');
  }
  let remaining = Math.max(0, elapsedMs);
  if (clip.loop) {
    remaining %= total;
  }
  for (let i = 0; i < clip.frames.length; i++) {
    if (remaining < clip.frames[i].durationMs) {
      return i;
    }
    remaining -= clip.frames[i].durationMs;
  }
  return clip.frames.length - 1;
}

/**
 * Walks backward from `fromIndex` (the frame playback was interrupted on — mid-entry or
 * mid-hold), consuming `elapsedMs` against each frame's own duration. `done:true` once it
 * reaches frame 0 — the caller should transition out of the reversing state then.
 */
export function reverseFrame(
  clip: DogAssetClip,
  fromIndex: number,
  elapsedMs: number,
): { index: number; done: boolean } {
  let remaining = Math.max(0, elapsedMs);
  const start = Math.max(0, Math.min(clip.frames.length - 1, Math.floor(fromIndex)));
  for (let i = start; i >= 0; i--) {
    if (remaining < clip.frames[i].durationMs) {
      return { index: i, done: false };
    }
    remaining -= clip.frames[i].durationMs;
  }
  return { index: 0, done: true };
}

// docs/map-dog-sprites.md (2026.09.28) — facing/clip-selection for the 4-direction
// mapDirections art. Ported (renamed/retyped against this file's own DogAssetManifest
// rather than duplicated as a separate manifest shape) from the backend team's own
// dogSpritePlayback.ts reference.

/**
 * Facing direction from actual movement displacement (not a target point — a dog blocked
 * by an obstacle isn't actually moving, so it shouldn't animate as if it is). Keeps the
 * previous axis near diagonals instead of flickering every tick, and near-zero movement
 * keeps the previous direction outright. `backwards` is for BACK_OFF: the dog moves
 * opposite its displacement but should still face the way it's retreating from.
 */
export function movementFacing(dx: number, dy: number, previous: DogSpriteDirection, backwards = false): DogSpriteDirection {
  if (Math.hypot(dx, dy) < 0.001) {
    return previous;
  }
  const [fx, fy] = backwards ? [-dx, -dy] : [dx, dy];
  const horizontal = previous === 'LEFT' || previous === 'RIGHT';
  if (Math.abs(fx) > Math.abs(fy) * (horizontal ? 0.85 : 1.15)) {
    return fx < 0 ? 'LEFT' : 'RIGHT';
  }
  return fy < 0 ? 'UP' : 'DOWN';
}

export interface SelectedDogClip {
  action: DogActionKey;
  clip: DogAssetClip;
  flipX: boolean;
}

/**
 * Which clip to actually draw for `action` facing `direction`: that direction's own art
 * for this action, else (LEFT only) RIGHT's art mirrored, else the original single-
 * direction `animations` clip (mirrored if LEFT) — RUN/BACK_OFF fall back to WALK's
 * directional art first since those don't have their own front/rear frames yet, and
 * anything still unresolved falls back to `fallbackAction` (normally IDLE).
 */
export function selectDirectionalClip(
  manifest: DogAssetManifest,
  action: DogActionKey,
  direction: DogSpriteDirection,
): SelectedDogClip | null {
  const candidates: DogActionKey[] = [
    action,
    ...(action === 'RUN' || action === 'BACK_OFF' ? (['WALK'] as const) : []),
    manifest.fallbackAction,
  ];
  for (const key of candidates) {
    if (!manifest.availableActions.includes(key)) {
      continue;
    }
    const direct = manifest.mapDirections?.[direction]?.[key];
    if (direct) {
      return { action: key, clip: direct, flipX: false };
    }
    if (direction === 'LEFT') {
      const right = manifest.mapDirections?.RIGHT?.[key];
      if (right) {
        return { action: key, clip: right, flipX: true };
      }
    }
    const legacy = manifest.animations[key];
    if (legacy) {
      return { action: key, clip: legacy, flipX: direction === 'LEFT' };
    }
  }
  return null;
}

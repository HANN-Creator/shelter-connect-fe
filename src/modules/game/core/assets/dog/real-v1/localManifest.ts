// TEMPORARY, Phase 1 only — a stand-in DogAssetManifest built from this bundle's own
// manifest.json + sheets/*.png so the new manifest-driven playback engine
// (dogStateMachine.ts's subPhase machinery, DogSprite.tsx) can be verified on a real
// device with real (if not per-dog) art before the /v1/dogs/{dogId}/assets network call
// exists. Delete this file (and its one usage in GameScreen.tsx) once Phase 2 lands.
import { Image } from 'react-native';
import type { DogActionKey, DogAssetClip, DogAssetManifest, DogBehaviorSettings } from '../../../../../dog/types';
import rawManifest from './manifest.json';

const animationsById = rawManifest.animations as Record<string, any>;

const SHEET_SOURCES: Record<DogActionKey, number> = {
  IDLE: require('./sheets/idle.png'),
  WALK: require('./sheets/walk.png'),
  RUN: require('./sheets/run.png'),
  SNIFF: require('./sheets/sniff.png'),
  TAIL_WAG: require('./sheets/tail_wag.png'),
  BACK_OFF: require('./sheets/back_off.png'),
  SIT: require('./sheets/sit.png'),
  LIE_DOWN: require('./sheets/lie_down.png'),
};

function resolveUri(source: number): string {
  return Image.resolveAssetSource(source)?.uri ?? '';
}

const animations: Partial<Record<DogActionKey, DogAssetClip>> = {};
for (const code of Object.keys(animationsById) as DogActionKey[]) {
  const raw = animationsById[code];
  animations[code] = {
    spritesheetUrl: resolveUri(SHEET_SOURCES[code]),
    frameCount: raw.frameCount,
    loop: raw.loop,
    holdLastFrame: raw.holdLastFrame,
    returnToIdle: raw.returnToIdle as DogAssetClip['returnToIdle'],
    frames: raw.frames,
    movement: raw.movement as DogAssetClip['movement'],
  };
}

// docs/map-dog-sprites.md — DOWN/UP idle+walk art, added 2026.09.28. Frame layout is
// fixed/known (single row, 64px steps) rather than parsed from a bundled manifest.json,
// since there's no such file to parse here — this is our own local test stand-in, not a
// copy of the delivered ZIP's manifest.
function directionalFrames(count: number, durationMs: number): DogAssetClip['frames'] {
  return Array.from({ length: count }, (_, i) => ({ x: i * 64, y: 0, width: 64, height: 64, durationMs }));
}

function directionalClip(source: number, frameCount: number, durationMs: number): DogAssetClip {
  return {
    spritesheetUrl: resolveUri(source),
    frameCount,
    loop: true,
    holdLastFrame: false,
    returnToIdle: 'DIRECT',
    frames: directionalFrames(frameCount, durationMs),
  };
}

export const localDogAssetManifest: DogAssetManifest = {
  id: 'local-real-v1',
  availableActions: rawManifest.availableActions as DogActionKey[],
  fallbackAction: rawManifest.fallbackAction as DogActionKey,
  frameSize: rawManifest.frameSize,
  anchorPixels: rawManifest.anchorPixels,
  baseUrl: rawManifest.baseUrl,
  expiresAt: '2099-01-01T00:00:00Z', // local bundle, never expires
  animations,
  mapDirections: {
    DOWN: {
      IDLE: directionalClip(require('../real-map-v1/idle-south.png'), 1, 1440),
      WALK: directionalClip(require('../real-map-v1/walk-south.png'), 16, 90),
    },
    UP: {
      IDLE: directionalClip(require('../real-map-v1/idle-north.png'), 1, 1440),
      WALK: directionalClip(require('../real-map-v1/walk-north.png'), 16, 90),
    },
  },
};

/**
 * TEMPORARY, Phase 1 only (same lifecycle as localDogAssetManifest above) — the real
 * dev-server dogs are all `basis:DEFAULT`, whose weights/ranges keep SIT/LIE_DOWN/
 * BACK_OFF/TAIL_WAG rare or unreachable (e.g. personalSpaceTiles too small to ever
 * trigger a reaction). Floors those specific fields just enough to actually SEE all 8
 * actions play out on-device; every other field (speeds, other actions' weights, ball
 * play) passes through untouched.
 */
export function withLocalTestWeights(settings: DogBehaviorSettings): DogBehaviorSettings {
  return {
    ...settings,
    approachDistanceTiles: Math.max(settings.approachDistanceTiles, 4),
    personalSpaceTiles: Math.max(settings.personalSpaceTiles, 1.5),
    reactionDelayMs: Math.min(settings.reactionDelayMs || 500, 500),
    actions: {
      ...settings.actions,
      SIT: { ...settings.actions.SIT, weight: Math.max(settings.actions.SIT.weight, 40), cooldownMs: Math.min(settings.actions.SIT.cooldownMs, 3000) },
      LIE_DOWN: { ...settings.actions.LIE_DOWN, weight: Math.max(settings.actions.LIE_DOWN.weight, 40), cooldownMs: Math.min(settings.actions.LIE_DOWN.cooldownMs, 3000) },
      BACK_OFF: { ...settings.actions.BACK_OFF, weight: Math.max(settings.actions.BACK_OFF.weight, 10), cooldownMs: Math.min(settings.actions.BACK_OFF.cooldownMs, 3000) },
      TAIL_WAG: { ...settings.actions.TAIL_WAG, weight: Math.max(settings.actions.TAIL_WAG.weight, 10), cooldownMs: Math.min(settings.actions.TAIL_WAG.cooldownMs, 3000) },
    },
  };
}

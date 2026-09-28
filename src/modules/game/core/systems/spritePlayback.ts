import type { DogAssetClip } from '../../../dog/types';

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

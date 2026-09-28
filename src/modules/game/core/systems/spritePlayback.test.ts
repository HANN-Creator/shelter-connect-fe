import { forwardFrame, reverseFrame } from './spritePlayback';
import type { DogAssetClip } from '../../../dog/types';

function makeClip(overrides: Partial<DogAssetClip> = {}): DogAssetClip {
  return {
    spritesheetUrl: 'sheets/idle.png',
    frameCount: 4,
    loop: true,
    holdLastFrame: false,
    returnToIdle: 'DIRECT',
    frames: [
      { x: 0, y: 0, width: 64, height: 64, durationMs: 100 },
      { x: 64, y: 0, width: 64, height: 64, durationMs: 100 },
      { x: 128, y: 0, width: 64, height: 64, durationMs: 100 },
      { x: 192, y: 0, width: 64, height: 64, durationMs: 100 },
    ],
    movement: { mode: 'STATIONARY', defaultSpeedTilesPerSecond: 0 },
    ...overrides,
  };
}

describe('forwardFrame', () => {
  test('steps through frames in order within one cycle', () => {
    const clip = makeClip();
    expect(forwardFrame(clip, 0)).toBe(0);
    expect(forwardFrame(clip, 50)).toBe(0);
    expect(forwardFrame(clip, 150)).toBe(1);
    expect(forwardFrame(clip, 350)).toBe(3);
  });

  test('wraps around when looping', () => {
    const clip = makeClip(); // total duration 400ms
    expect(forwardFrame(clip, 400)).toBe(0); // exactly one full cycle
    expect(forwardFrame(clip, 450)).toBe(0);
    expect(forwardFrame(clip, 550)).toBe(1);
  });

  test('holds on the last frame when not looping (SIT/LIE_DOWN entry)', () => {
    const clip = makeClip({ loop: false, holdLastFrame: true, returnToIdle: 'REVERSE_FRAMES' });
    expect(forwardFrame(clip, 350)).toBe(3);
    expect(forwardFrame(clip, 10_000)).toBe(3); // way past the clip's own duration — still holds
  });

  test('throws on a clip with no frames', () => {
    const clip = makeClip({ frames: [] });
    expect(() => forwardFrame(clip, 0)).toThrow();
  });
});

describe('reverseFrame', () => {
  test('walks backward from the given frame to 0', () => {
    const clip = makeClip();
    expect(reverseFrame(clip, 3, 0)).toEqual({ index: 3, done: false });
    expect(reverseFrame(clip, 3, 100)).toEqual({ index: 2, done: false });
    expect(reverseFrame(clip, 3, 300)).toEqual({ index: 0, done: false });
    expect(reverseFrame(clip, 3, 400)).toEqual({ index: 0, done: true });
  });

  test('starts mid-animation when interrupted before reaching the last frame', () => {
    // Interrupted while still entering SIT, sitting at frame 1 — reverse should start there,
    // not from the clip's last frame.
    const clip = makeClip({ loop: false, holdLastFrame: true, returnToIdle: 'REVERSE_FRAMES' });
    expect(reverseFrame(clip, 1, 0)).toEqual({ index: 1, done: false });
    expect(reverseFrame(clip, 1, 100)).toEqual({ index: 0, done: false });
    expect(reverseFrame(clip, 1, 200)).toEqual({ index: 0, done: true });
  });

  test('clamps an out-of-range fromIndex into the clip', () => {
    const clip = makeClip();
    expect(reverseFrame(clip, 99, 0)).toEqual({ index: 3, done: false });
  });
});

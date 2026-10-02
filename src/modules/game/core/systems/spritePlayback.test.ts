import { forwardFrame, movementFacing, reverseFrame, selectDirectionalClip } from './spritePlayback';
import type { DogAssetClip, DogAssetManifest } from '../../../dog/types';

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

describe('movementFacing', () => {
  test('picks the dominant axis of actual displacement', () => {
    expect(movementFacing(5, 0, 'DOWN')).toBe('RIGHT');
    expect(movementFacing(-5, 0, 'DOWN')).toBe('LEFT');
    expect(movementFacing(0, 5, 'RIGHT')).toBe('DOWN');
    expect(movementFacing(0, -5, 'RIGHT')).toBe('UP');
  });

  test('keeps the previous direction when barely moving (blocked by an obstacle)', () => {
    expect(movementFacing(0.0001, 0.0001, 'UP')).toBe('UP');
  });

  test('keeps the previous axis near a diagonal instead of flickering', () => {
    // Was facing horizontally; a slightly-more-vertical nudge shouldn't flip it to
    // vertical outright (needs to clear the previous axis's own hysteresis band).
    expect(movementFacing(5, 5.5, 'RIGHT')).toBe('RIGHT');
    expect(movementFacing(5, 6, 'DOWN')).toBe('DOWN');
  });

  test('backwards flips the displacement (BACK_OFF faces where it came from)', () => {
    expect(movementFacing(5, 0, 'DOWN', true)).toBe('LEFT');
  });
});

describe('selectDirectionalClip', () => {
  function makeManifest(overrides: Partial<DogAssetManifest> = {}): DogAssetManifest {
    const rightClip = makeClip({ spritesheetUrl: 'sheets/walk.png' });
    return {
      id: 'm1',
      availableActions: ['IDLE', 'WALK', 'RUN', 'BACK_OFF'],
      fallbackAction: 'IDLE',
      frameSize: { width: 64, height: 64 },
      anchorPixels: { x: 32, y: 60 },
      baseUrl: 'base.png',
      expiresAt: '2099-01-01T00:00:00Z',
      animations: { IDLE: makeClip({ spritesheetUrl: 'sheets/idle.png' }), WALK: rightClip },
      mapDirections: {
        DOWN: { WALK: makeClip({ spritesheetUrl: 'sheets/walk-south.png' }) },
      },
      ...overrides,
    };
  }

  test('uses that direction\'s own art when available', () => {
    const result = selectDirectionalClip(makeManifest(), 'WALK', 'DOWN');
    expect(result).toMatchObject({ action: 'WALK', flipX: false });
    expect(result?.clip.spritesheetUrl).toBe('sheets/walk-south.png');
  });

  test('LEFT falls back to RIGHT (legacy single-direction art) mirrored', () => {
    const result = selectDirectionalClip(makeManifest(), 'WALK', 'LEFT');
    expect(result).toMatchObject({ action: 'WALK', flipX: true });
    expect(result?.clip.spritesheetUrl).toBe('sheets/walk.png');
  });

  test('UP has no directional art yet, falls back to legacy (unmirrored)', () => {
    const result = selectDirectionalClip(makeManifest(), 'WALK', 'UP');
    expect(result).toMatchObject({ action: 'WALK', flipX: false });
    expect(result?.clip.spritesheetUrl).toBe('sheets/walk.png');
  });

  test('RUN/BACK_OFF fall back to WALK\'s directional art before legacy', () => {
    const result = selectDirectionalClip(makeManifest(), 'RUN', 'DOWN');
    expect(result).toMatchObject({ action: 'WALK', flipX: false });
    expect(result?.clip.spritesheetUrl).toBe('sheets/walk-south.png');
  });

  test('falls all the way back to fallbackAction when nothing else matches', () => {
    const manifest = makeManifest({ availableActions: ['IDLE'], mapDirections: undefined });
    const result = selectDirectionalClip(manifest, 'WALK', 'DOWN');
    expect(result).toMatchObject({ action: 'IDLE', flipX: false });
  });

  test('returns null when even the fallback action has no clip anywhere', () => {
    const manifest = makeManifest({ animations: {}, mapDirections: undefined, availableActions: ['IDLE'] });
    expect(selectDirectionalClip(manifest, 'WALK', 'DOWN')).toBeNull();
  });
});

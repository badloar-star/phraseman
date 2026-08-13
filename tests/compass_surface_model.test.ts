import {
  canAcknowledgeCompassVisualClose,
  compassCompactScrollSpacer,
  reduceCompassSurface,
  resolveCompassSurfaceRelease,
  type CompassSurfaceReleaseInput,
  type CompassSurfaceState,
} from '../app/compass_surface_model';

const GEOMETRY = {
  expandedY: 100,
  compactY: 500,
} as const;

function release(
  overrides: Partial<CompassSurfaceReleaseInput> = {},
): CompassSurfaceState {
  return resolveCompassSurfaceRelease({
    ...GEOMETRY,
    translateY: GEOMETRY.compactY,
    velocityY: 0,
    ...overrides,
  });
}

describe('Compass surface state machine', () => {
  it('opens at compact and only expands from the visible compact state', () => {
    expect(reduceCompassSurface('closed', { type: 'open' })).toBe('compact');
    expect(reduceCompassSurface('compact', { type: 'expand' })).toBe('expanded');
    expect(reduceCompassSurface('closed', { type: 'expand' })).toBe('closed');
  });

  it('handles Back as expanded -> compact -> closed and is idempotent when closed', () => {
    const compact = reduceCompassSurface('expanded', { type: 'back' });
    const closed = reduceCompassSurface(compact, { type: 'back' });

    expect(compact).toBe('compact');
    expect(closed).toBe('closed');
    expect(reduceCompassSurface(closed, { type: 'back' })).toBe('closed');
  });

  it('collapses without dismissing and dismisses from every detent', () => {
    expect(reduceCompassSurface('expanded', { type: 'collapse' })).toBe('compact');

    for (const state of ['closed', 'compact', 'expanded'] as const) {
      expect(reduceCompassSurface(state, { type: 'dismiss' })).toBe('closed');
    }
  });
});

describe('Compass projected drag release', () => {
  it('dismisses for a downward fling above the strict velocity threshold', () => {
    expect(release({ translateY: 300, velocityY: 901 })).toBe('closed');
    expect(release({ translateY: 300, velocityY: 900 })).toBe('compact');
  });

  it('dismisses only after crossing 88 px beyond compact', () => {
    expect(release({ translateY: 589 })).toBe('closed');
    expect(release({ translateY: 588 })).toBe('compact');
  });

  it('expands for an upward fling below the strict velocity threshold', () => {
    expect(release({ translateY: 500, velocityY: -651 })).toBe('expanded');
    expect(release({ translateY: 500, velocityY: -650 })).toBe('compact');
  });

  it('uses the projected position and snaps at the midpoint boundary', () => {
    expect(release({ translateY: 320, velocityY: -200 })).toBe('expanded');
    expect(release({ translateY: 299, velocityY: 0 })).toBe('expanded');
    expect(release({ translateY: 300, velocityY: 0 })).toBe('compact');
  });
});

describe('Compass visual close guard', () => {
  it('rejects a stale close callback after abort and a fresh open', () => {
    expect(canAcknowledgeCompassVisualClose({ phase: 'closing', closeId: 7 }, 7)).toBe(true);
    expect(canAcknowledgeCompassVisualClose({ phase: 'idle', closeId: null }, 7)).toBe(false);
    expect(canAcknowledgeCompassVisualClose({ phase: 'open', closeId: null }, 7)).toBe(false);
    expect(canAcknowledgeCompassVisualClose({ phase: 'closing', closeId: 8 }, 7)).toBe(false);
  });

  it('adds exactly the translated-offscreen distance only at compact', () => {
    expect(compassCompactScrollSpacer(false, 54, 420)).toBe(366);
    expect(compassCompactScrollSpacer(true, 54, 420)).toBe(0);
    expect(compassCompactScrollSpacer(false, 420, 54)).toBe(0);
  });
});

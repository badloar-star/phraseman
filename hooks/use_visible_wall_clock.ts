import { useEffect, useState } from 'react';
import { visibleWallClock } from '../app/visible_wall_clock';

export function useVisibleWallClock(runtimeActive: boolean, cadenceMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runtimeActive) {
      setNow(Date.now());
      return undefined;
    }
    let lastPublishedAt: number | null = null;
    return visibleWallClock.subscribe((nextNow) => {
      if (lastPublishedAt !== null && nextNow - lastPublishedAt < cadenceMs) return;
      lastPublishedAt = nextNow;
      setNow(nextNow);
    });
  }, [cadenceMs, runtimeActive]);

  return now;
}

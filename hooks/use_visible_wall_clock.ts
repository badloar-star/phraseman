import { useEffect, useState } from 'react';
import { visibleWallClock } from '../app/visible_wall_clock';

export function useVisibleWallClock(runtimeActive: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!runtimeActive) {
      setNow(Date.now());
      return undefined;
    }
    return visibleWallClock.subscribe(setNow);
  }, [runtimeActive]);

  return now;
}

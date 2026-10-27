import { useEffect, useState } from 'react';

/**
 * Current time for elapsed labels. The interval only runs while something is
 * active, so an idle dashboard renders no timers at all.
 */
export function useClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}

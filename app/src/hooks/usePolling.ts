import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void, interval: number, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    callbackRef.current();
    const timer = setInterval(() => callbackRef.current(), interval);
    return () => clearInterval(timer);
  }, [interval, enabled]);
}

import { useEffect, useState } from 'react';
import {
  useInView,
  type IntersectionOptions,
} from 'react-intersection-observer';

export interface HookResponse {
  ref?: ((node?: Element | null) => void) | undefined;
  inView: boolean;
}

const DELAY = 50;

// A wrapper around `useInView` to add a brief delay so that it won't be triggered by a momentary
// appearance in the viewport like when the user jumps between ends of the page.
export function useDelayedInView(options: IntersectionOptions): HookResponse {
  /* eslint-disable react-hooks/rules-of-hooks */
  if (import.meta.env.SSR) {
    return { inView: true };
  } else {
    const { ref, inView: originalInView } = useInView(options);
    const [inView, setInView] = useState(false);

    const [mountTime, setMountTime] = useState<
      DOMHighResTimeStamp | undefined
    >();

    useEffect(() => {
      setMountTime(performance.now());
    }, []);

    useEffect(() => {
      if (!inView && originalInView) {
        // Avoid adding a delay if the component is already in view when it mounts, by checking for
        // the duration since the mount.
        // (N.B. `now - mountTime` would be `NaN` if `mountTime === undefined` (sry).)
        if (!(performance.now() - mountTime! > DELAY)) {
          setInView(true);
        } else {
          const timeout = setTimeout(() => setInView(true), DELAY);
          return () => clearTimeout(timeout);
        }
      }
    }, [originalInView]);

    return { ref, inView };
  }
  /* eslint-enable */
}

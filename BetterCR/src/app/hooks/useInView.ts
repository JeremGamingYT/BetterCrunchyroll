import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Reveals an element once it scrolls into view (entry animations). Includes a
 * safety fallback so content still appears if the observer never fires (e.g. in
 * an initially-hidden iframe).
 */
export function useInView<T extends Element>(margin = '0px 0px -8% 0px'): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    const fallback = window.setTimeout(() => {
      setVisible(true);
      observer.disconnect();
    }, 1100);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [margin]);

  return [ref, visible];
}

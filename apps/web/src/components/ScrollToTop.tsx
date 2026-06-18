import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Auto-scroll ke atas pada setiap navigasi route.
 * Reset window + container utama (app shell main pane).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    // App shell main column biasanya overflow-y auto — reset juga
    const mains = document.querySelectorAll('.shell__main, main');
    mains.forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  }, [pathname]);

  return null;
}

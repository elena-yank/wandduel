import * as React from "react";

// Robust phone detection that does not rely solely on viewport width
// Combines user agent, coarse pointer, and resize/orientation updates
export function useIsPhone() {
  const [isPhone, setIsPhone] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const check = () => {
      const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
      const isUAPhone = /iphone|android.*mobile|windows phone|blackberry|mobile safari/.test(ua);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const coarsePointerMql = window.matchMedia && window.matchMedia('(pointer: coarse)');
      const isCoarse = coarsePointerMql ? coarsePointerMql.matches : false;

      // Consider as phone if UA says mobile OR coarse pointer with touch
      // Avoid misclassifying large tablets/desktops by requiring touch/coarse
      const result = isUAPhone || (hasTouch && isCoarse);
      setIsPhone(!!result);
    };

    check();

    const onResize = () => check();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize as any);
    if (window.matchMedia) {
      const mql = window.matchMedia('(pointer: coarse)');
      const handler = () => check();
      mql.addEventListener?.('change', handler);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize as any);
    };
  }, []);

  return !!isPhone;
}
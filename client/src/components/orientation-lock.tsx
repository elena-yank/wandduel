import { useState, useEffect } from "react";
import { RotateCw } from "lucide-react";

export default function OrientationLock() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Attempt to lock orientation to landscape on capable devices
    const tryLockLandscape = async () => {
      try {
        const isMobile = Math.min(window.screen.width, window.screen.height) < 1024;
        // Only try on mobile contexts
        if (!isMobile) return;
        // Screen Orientation API guard
        const orientation = (screen as any).orientation || (screen as any).msOrientation || (screen as any).mozOrientation;
        if (orientation && typeof orientation.lock === "function") {
          await orientation.lock("landscape");
        }
      } catch {
        // Silently ignore if the environment disallows locking (e.g. iOS WKWebView)
      }
    };

    const checkOrientation = () => {
      // Check if device is mobile (screen width < 1024px) and in portrait mode
      const isMobile = window.innerWidth < 1024;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && isPortraitMode);
    };

    // Check on mount
    checkOrientation();
    // Try to enforce landscape when app becomes visible or on mount
    tryLockLandscape();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryLockLandscape();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for orientation and resize changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col items-center justify-center p-8">
      <div className="magical-bg opacity-50"></div>
      <div className="relative z-10 text-center">
        <div className="mb-8 animate-bounce">
          <RotateCw className="w-24 h-24 text-primary mx-auto" />
        </div>
        <h1 className="text-3xl font-angst mb-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
          МАГИЧЕСКАЯ ДУЭЛЬ
        </h1>
        <p className="text-xl text-foreground font-serif mb-2">
          Пожалуйста, поверните устройство
        </p>
        <p className="text-base text-muted-foreground font-serif">
          Для лучшего опыта игры используйте горизонтальную ориентацию
        </p>
      </div>
    </div>
  );
}

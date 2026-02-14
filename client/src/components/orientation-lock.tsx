import { useState, useEffect } from "react";
import { RotateCw } from "lucide-react";

export default function OrientationLock() {
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isVKCtx, setIsVKCtx] = useState(false);
  const [rotateFailed, setRotateFailed] = useState(false);

  useEffect(() => {
    const isVKWebApp = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("vk_platform")) return true;
        if (typeof (window as any).vkBridge !== "undefined") return true;
        if ((window as any).ReactNativeWebView) return true;
      } catch {}
      return false;
    };
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const isVKReferrer = (() => {
      try {
        return /(^|\.)vk\.(com|ru)/i.test(new URL(document.referrer || "", window.location.href).hostname);
      } catch {
        return false;
      }
    })();
    const isVKContext = () => isVKWebApp() || (isInIframe && isVKReferrer);

    setIsVKCtx(isVKContext());

    const tryLockLandscape = async () => {
      try {
        const isMobile = Math.min(window.screen.width, window.screen.height) < 1024;
        if (!isMobile) return;
        if (!isVKContext()) return;
        const orientation = (screen as any).orientation || (screen as any).msOrientation || (screen as any).mozOrientation;
        if (orientation && typeof orientation.lock === "function") {
          try {
            await orientation.lock("landscape-primary");
          } catch {
            try {
              await orientation.lock("landscape");
            } catch {
              try {
                await orientation.lock("landscape-secondary");
              } catch {}
            }
          }
        }
      } catch {
        // Silently ignore if the environment disallows locking (e.g. iOS WKWebView)
      }
    };

    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortraitMode);
    };

    checkOrientation();
    tryLockLandscape();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryLockLandscape();
        setIsVKCtx(isVKContext());
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    window.addEventListener("resize", checkOrientation);
    const onOrientationChange = () => {
      checkOrientation();
      tryLockLandscape();
    };
    window.addEventListener("orientationchange", onOrientationChange);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!isMobilePortrait) return null;

  if (isVKCtx) {
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
        <div className="mt-6">
          <button
            onClick={async () => {
              setRotateFailed(false);
              const el: any = document.documentElement;
              const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
              const tryLock = async () => {
                const orientation: any = (screen as any).orientation || (screen as any).msOrientation || (screen as any).mozOrientation;
                if (!orientation || typeof orientation.lock !== "function") return false;
                try {
                  await orientation.lock("landscape-primary");
                  return true;
                } catch {
                  try {
                    await orientation.lock("landscape");
                    return true;
                  } catch {
                    try {
                      await orientation.lock("landscape-secondary");
                      return true;
                    } catch {
                      return false;
                    }
                  }
                }
              };
              try {
                if (!document.fullscreenElement && fs) {
                  try {
                    await fs.call(el);
                  } catch {}
                }
                let ok = await tryLock();
                if (!ok) {
                  await new Promise<void>((resolve) => {
                    const onFs = async () => {
                      document.removeEventListener("fullscreenchange", onFs);
                      await tryLock();
                      resolve();
                    };
                    document.addEventListener("fullscreenchange", onFs, { once: true });
                  });
                }
              } catch {}
              const stillPortrait = window.innerHeight > window.innerWidth;
              if (stillPortrait) setRotateFailed(true);
            }}
            className="px-6 py-3 rounded-md bg-primary text-primary-foreground shadow hover:brightness-110 active:scale-95 transition"
          >
            Повернуть экран
          </button>
          {rotateFailed ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Не удалось повернуть автоматически. Включите автоповорот и поверните устройство.
            </p>
          ) : null}
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center px-4 pointer-events-none">
      <button
        onClick={async () => {
          setRotateFailed(false);
          const el: any = document.documentElement;
          const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
          const tryLock = async () => {
            const orientation: any = (screen as any).orientation || (screen as any).msOrientation || (screen as any).mozOrientation;
            if (!orientation || typeof orientation.lock !== "function") return false;
            try {
              await orientation.lock("landscape-primary");
              return true;
            } catch {
              try {
                await orientation.lock("landscape");
                return true;
              } catch {
                try {
                  await orientation.lock("landscape-secondary");
                  return true;
                } catch {
                  return false;
                }
              }
            }
          };
          try {
            if (!document.fullscreenElement && fs) {
              try {
                await fs.call(el);
              } catch {}
            }
            let ok = await tryLock();
            if (!ok) {
              await new Promise<void>((resolve) => {
                const onFs = async () => {
                  document.removeEventListener("fullscreenchange", onFs);
                  await tryLock();
                  resolve();
                };
                document.addEventListener("fullscreenchange", onFs, { once: true });
              });
            }
          } catch {}
          const stillPortrait = window.innerHeight > window.innerWidth;
          if (stillPortrait) setRotateFailed(true);
        }}
        className="pointer-events-auto px-4 py-2 rounded-md bg-primary text-primary-foreground shadow hover:brightness-110 active:scale-95 transition"
      >
        Повернуть экран
      </button>
    </div>
  );
}

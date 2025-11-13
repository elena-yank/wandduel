import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import GestureCanvas, { type GestureCanvasRef } from "@/components/gesture-canvas";
import { SPELL_COLORS } from "@/components/compact-color-palette";
import { queryClient, apiRequest, apiUrl } from "@/lib/queryClient";
import { type Spell, type Point } from "@shared/schema";
// Explicitly import the TypeScript ESM module to avoid CJS named export issues
import { evaluateDrawing, isValidDrawing } from "@shared/advanced-gesture-recognition.ts";
import { useIsPhone } from "@/hooks/use-phone";
import { LogOut } from "lucide-react";
import { GAME_VERSION } from "@shared/config";

export default function TrainingMode() {
  const isPhone = useIsPhone();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/rooms/:roomId/training");
  const roomId = params?.roomId || "";
  const canvasRef = useRef<GestureCanvasRef>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"attack" | "counter">("attack");
  const [accuracyText, setAccuracyText] = useState<string>("");
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [referenceShown, setReferenceShown] = useState(false);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Fetch spells for listing and local recognition
  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["/api/spells"],
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const attackSpells = allSpells.filter(s => s.type === "attack");
  const counterSpells = allSpells.filter(s => s.type === "counter");

  // Соответствие цвета от палитры дуэли к HEX для рисования
  const getDrawColor = (): string => {
    if (!selectedColor) return "hsl(259, 74%, 56%)"; // дефолтный фиолетовый как в дуэли
    const colorObj = SPELL_COLORS.find(c => c.colorName === selectedColor);
    return colorObj?.hex || "hsl(259, 74%, 56%)";
  };
  const drawColor = getDrawColor();

  // Auto-join the newly created room's session as a single player
  useEffect(() => {
    const join = async () => {
      if (!roomId) return;
      const getUserId = () => {
        let userId = sessionStorage.getItem("userId");
        if (!userId) {
          userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem("userId", userId);
        }
        return userId;
      };

      try {
        const sessionRes = await fetch(apiUrl(`/api/rooms/${roomId}/session`));
        if (!sessionRes.ok) return; // If no session, allow offline training
        const session = await sessionRes.json();
        const sessionId = session.id;

        const userId = getUserId();
        const userName = localStorage.getItem("userName") || "Player";
        const userHouse = localStorage.getItem("userHouse") || "gryffindor";

        const joinRes = await apiRequest("POST", `/api/sessions/${sessionId}/join`, {
          userId,
          userName,
          role: "player",
          house: userHouse,
        });
        if (joinRes.ok) {
          const participant = await joinRes.json();
          localStorage.setItem(`participantId:${roomId}`, participant.id);
          localStorage.setItem(`userRole:${roomId}`, "player");
          localStorage.setItem(`currentSessionId:${roomId}`, sessionId);
          if (participant.playerNumber) {
            localStorage.setItem(`playerNumber:${roomId}`, participant.playerNumber.toString());
          }
        }
      } catch (e) {
        console.warn("Training join skipped:", e);
      }
    };
    join();
  }, [roomId]);

  const clearOverlay = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawReferenceOverlay = (gesture: Point[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || gesture.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Очистить предыдущий оверлей
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Параметры рамки должны совпадать с GestureCanvas (mobile padding = 0, desktop = 40)
    const pad = isPhone ? 0 : 40;
    // Учтём свечение и толщину линии, чтобы они не выходили за рамку
    const lineWidth = 3;
    const glowBlur = isPhone ? 10 : 12;
    const safeMargin = glowBlur + lineWidth; // минимальный внутренний отступ от краёв
    const innerW = canvas.width - pad * 2 - safeMargin * 2;
    const innerH = canvas.height - pad * 2 - safeMargin * 2;

    // Клиппируем всю отрисовку внутри квадратной области ограничений
    ctx.beginPath();
    ctx.rect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);
    ctx.clip();

    // Найти исходный bbox жеста
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of gesture) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const srcW = Math.max(1, maxX - minX);
    const srcH = Math.max(1, maxY - minY);
    // Масштаб, чтобы полностью вписать в внутренний квадрат, с небольшим отступом
    const scale = Math.min(innerW / srcW, innerH / srcH) * 0.9;
    const scaledW = srcW * scale;
    const scaledH = srcH * scale;

    // Центрировать внутри рамки
    const offsetX = pad + safeMargin + (innerW - scaledW) / 2;
    const offsetY = pad + safeMargin + (innerH - scaledH) / 2;

    // Рисовать фиолетовый паттерн с glow
    ctx.beginPath();
    ctx.strokeStyle = "#a855f7"; // purple
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = glowBlur;
    ctx.shadowColor = "#a855f7";

    for (let i = 0; i < gesture.length; i++) {
      const x = (gesture[i].x - minX) * scale + offsetX;
      const y = (gesture[i].y - minY) * scale + offsetY;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const handleGestureComplete = useCallback((gesture: Point[]) => {
    if (!gesture || gesture.length === 0) return;
    if (!isValidDrawing(gesture)) {
      setAccuracyText("Рисунок слишком мал или невалиден");
      return;
    }

    // Строго ограничиваем пул типом выбранного режима
    let selectedPool = allSpells.filter((s) => s.type === mode);
    // Если выбран цвет, учитываем его — сравниваем только заклинания этого цвета
    if (selectedColor) {
      selectedPool = selectedPool.filter((s) => s.colorName === selectedColor);
    }
    if (selectedPool.length === 0) {
      setAccuracyText(selectedColor
        ? `Нет заклинаний выбранного цвета: ${selectedColor}`
        : "Нет доступных заклинаний для сравнения");
      return;
    }
    const matchesSelected = selectedPool.map(spell => {
      const pattern = Array.isArray(spell.gesturePattern) ? (spell.gesturePattern as Point[]) : [];
      const { score, valid } = evaluateDrawing(gesture, pattern);
      const accuracy = Number.isFinite(score) ? Math.round(score) : 0;
      return { spell, accuracy, valid };
    })
    // Prefer valid patterns; if all invalid, keep list to show best score anyway
    .sort((a, b) => b.accuracy - a.accuracy);

    const bestSelected = matchesSelected[0];

    // Дополнительно посчитаем лучшие совпадения противоположного типа,
    // чтобы предотвратить "распознавание не того режима".
    const oppositeType = mode === "attack" ? "counter" : "attack";
    const oppositePool = allSpells.filter((s) => s.type === oppositeType);
    const matchesOpposite = oppositePool.map(spell => {
      const pattern = Array.isArray(spell.gesturePattern) ? (spell.gesturePattern as Point[]) : [];
      const { score } = evaluateDrawing(gesture, pattern);
      const accuracy = Number.isFinite(score) ? Math.round(score) : 0;
      return { spell, accuracy };
    }).sort((a, b) => b.accuracy - a.accuracy);

    const bestOpposite = matchesOpposite[0];

    // Порог распознавания и зазор между режимами
    const minAcceptable = 60; // минимум, чтобы считать, что жест похож
    const modeMargin = 8;     // требуемое преимущество над противоположным режимом

    // Если лучший противоположный вариант существенно лучше — показываем подсказку, что выбран не тот режим
    if (bestOpposite && (!bestSelected || bestOpposite.accuracy >= bestSelected.accuracy + modeMargin) && bestOpposite.accuracy >= minAcceptable) {
      const hint = `Жест похож на ${oppositeType === "attack" ? "атакующее" : "защитное"} заклинание: ${bestOpposite.spell.name} — точность ${bestOpposite.accuracy}%`;
      setAccuracyText(`${hint}. Переключите режим на "${oppositeType === "attack" ? "Атакующее" : "Защитное"}" для корректного распознавания.`);
      return;
    }

    if (!bestSelected || bestSelected.accuracy < minAcceptable) {
      setAccuracyText("Жест не распознан в текущем режиме");
      return;
    }

    setAccuracyText(`Наиболее похоже на: ${bestSelected.spell.name} — точность ${bestSelected.accuracy}%`);
  }, [mode, selectedColor, allSpells]);

  const onShowReference = () => {
    setShowReferenceDialog(true);
  };

  const onHideReference = () => {
    clearOverlay();
    setReferenceShown(false);
    setSelectedSpell(null);
  };

  const onSelectSpell = (spell: Spell) => {
    setSelectedSpell(spell);
    setShowReferenceDialog(false);
    drawReferenceOverlay(spell.gesturePattern as Point[]);
    setReferenceShown(true);
  };

  const handleLeave = async () => {
    try {
      const participantId = roomId ? localStorage.getItem(`participantId:${roomId}`) : null;
      const sessionId = roomId ? localStorage.getItem(`currentSessionId:${roomId}`) : null;
      if (participantId && sessionId) {
        await apiRequest("DELETE", `/api/sessions/${sessionId}/participants/${participantId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "participants"] });
      }
    } catch (err) {
      console.error("Failed to leave training:", err);
    } finally {
      if (roomId) {
        localStorage.removeItem(`userRole:${roomId}`);
        localStorage.removeItem(`currentSessionId:${roomId}`);
        localStorage.removeItem(`participantId:${roomId}`);
        localStorage.removeItem(`playerNumber:${roomId}`);
      }
      setLocation("/");
    }
  };

  return (
    <div className="phone-safe-area min-h-screen flex items-center justify-center px-3 py-1 sm:py-3 sm:px-4">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-6 relative">
          <h1 className="text-3xl sm:text-5xl font-angst tracking-wider bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            Режим тренировки
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-serif">Версия {`v${GAME_VERSION}`}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            className="absolute top-0 right-0 gap-2"
            data-testid="button-leave-training"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        </header>

        <Card className="spell-card border-border/20">
          <CardContent className="p-3 sm:p-4 overflow-hidden">
            {/* Три равных блока по горизонтали: левый (контролы + точность), центр (канва), правый (палитра) */}
            <div className="grid grid-cols-[1fr_2fr_1.2fr] sm:grid-cols-[1fr_2fr_0.9fr] gap-y-4 gap-x-2 sm:gap-x-3 items-stretch min-w-0">
              {/* Левый блок: тумблер, кнопки, строка точности сразу под кнопками */}
              <div className="overflow-hidden min-w-0 h-full">
                <div className="flex flex-col h-full">
                  <div className="flex flex-col gap-3">
                    <ToggleGroup
                      type="single"
                      value={mode}
                      onValueChange={(v) => v && setMode(v as any)}
                      className="justify-start self-start"
                      size="sm"
                    >
                      <ToggleGroupItem value="attack" className="text-[0.67rem] px-2 py-1">Атакующее</ToggleGroupItem>
                      <ToggleGroupItem value="counter" className="text-[0.67rem] px-2 py-1">Защитное</ToggleGroupItem>
                    </ToggleGroup>
                    <div className={isPhone ? "flex gap-2 justify-start w-full mt-2" : "flex items-center gap-2 justify-start w-auto mt-0"}>
                      <Button variant="secondary" size="sm" className="text-[0.67rem] px-2" onClick={() => { canvasRef.current?.clearCanvas(); }}>
                        Стереть
                      </Button>
                      {referenceShown ? (
                        <Button
                          size="sm"
                          className={isPhone
                            ? "px-2 py-1 text-[0.58rem] leading-[0.72rem] whitespace-normal text-center"
                            : "text-[0.67rem] px-2"}
                          onClick={onHideReference}
                        >
                          Скрыть эталон
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={isPhone
                            ? "px-2 py-1 text-[0.58rem] leading-[0.72rem] whitespace-normal text-center"
                            : "text-[0.67rem] px-2"}
                          onClick={onShowReference}
                        >
                          Показать эталон
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 text-xs sm:text-xs text-muted-foreground whitespace-normal break-words">
                      {accuracyText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Центральный блок: канва */}
              <div className="relative aspect-square overflow-hidden flex items-center justify-center">
                <div className="relative w-full h-full">
                  <GestureCanvas
                    ref={canvasRef}
                    onGestureComplete={handleGestureComplete}
                    className="w-full"
                    drawColor={drawColor}
                    restrictToSquare
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    width={500}
                    height={500}
                    className="absolute inset-0 pointer-events-none w-full h-full"
                  />
                </div>
              </div>

              {/* Правый блок: палитра цветов заклинания (новая разметка) */}
              <div className="overflow-hidden min-w-0 h-full">
                <div className="h-full flex flex-col justify-start gap-0 min-w-0">
                  <div className="text-[9px] text-muted-foreground/70 font-medium">Цвет заклинания:</div>
                  {[
                    [null, "Красный", "Зелёный"],
                    ["Голубой", "Жёлтый", "Золотой"],
                    ["Оранжевый", "Розовый", "Фиолетовый"],
                    ["Серебряный", "Серый", "Белый"],
                    ["Бело-жёлтый", "Бирюзовый", "Бесцветный"],
                    ["Пламенный шар"],
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-0 w-full min-w-0 overflow-x-hidden">
                      {row.map((item, jdx) => {
                        if (item === null) {
                          return (
                            <button
                              key={`reset-${jdx}`}
                              onClick={() => setSelectedColor(null)}
                              className={
                                `h-7 w-full min-w-0 rounded-sm border transition-all flex items-center justify-center text-[9px] font-medium px-1 truncate ` +
                                (selectedColor === null ? "border-primary ring-1 ring-primary bg-primary/20" : "border-muted-foreground/30 hover:border-primary/50")
                              }
                              title="Все цвета"
                              data-testid="color-reset"
                            >
                              Все
                            </button>
                          );
                        }

                        const color = SPELL_COLORS.find((c) => c.colorName === item);
                        if (!color) {
                          return <div key={`empty-${jdx}`} className="h-7" />;
                        }

                        return (
                          <button
                            key={color.colorName}
                            onClick={() => setSelectedColor(color.colorName)}
                            className={
                              `h-7 w-full min-w-0 rounded-sm border transition-all flex items-center justify-center gap-0.5 px-1 truncate ` +
                              (selectedColor === color.colorName ? "border-primary ring-1 ring-primary shadow-md" : "border-transparent hover:border-primary/50")
                            }
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: selectedColor === color.colorName ? `0 0 8px ${color.hex}` : undefined,
                            }}
                            title={color.name}
                            data-testid={`color-${color.colorName}`}
                          >
                            <span
                              className="text-[9px] font-bold leading-none truncate"
                              style={{
                                color: ["#FFFFFF", "#FFFACD", "#E5E5E5", "#C0C0C0"].includes(color.hex) ? "#000" : "#FFF",
                                textShadow: ["#FFFFFF", "#FFFACD", "#E5E5E5", "#C0C0C0"].includes(color.hex)
                                  ? "0 0 2px rgba(0,0,0,0.5)"
                                  : "0 0 2px rgba(0,0,0,0.8)",
                              }}
                            >
                              {color.name}
                            </span>
                          </button>
                        );
                      })}

                      {/* Заполняем недостающие клетки, чтобы сохранить 3 колонки */}
                      {Array.from({ length: Math.max(0, 3 - row.length) }).map((_, k) => (
                        <div key={`spacer-${k}`} className="h-7 min-w-0" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Строка точности на мобиле находится в левом нижнем блоке */}
          </CardContent>
        </Card>
        {/* Диалог выбора эталона */}
        <Dialog open={showReferenceDialog} onOpenChange={setShowReferenceDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md" data-testid="dialog-reference-spells">
            <DialogHeader>
              <DialogTitle className="font-decorative text-xl sm:text-2xl decorative-text">Выберите заклинание</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Показаны только {mode === "attack" ? "атакующие" : "контр"}-заклинания
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(() => {
                const base = mode === "attack" ? attackSpells : counterSpells;
                const filtered = selectedColor ? base.filter(s => s.colorName === selectedColor) : base;
                if (filtered.length === 0) {
                  return (
                    <div className="text-sm text-muted-foreground">
                      {selectedColor ? `Нет заклинаний выбранного цвета: ${selectedColor}` : "Нет доступных заклинаний"}
                    </div>
                  );
                }
                return filtered.map(spell => (
                  <button
                    key={spell.id}
                    onClick={() => onSelectSpell(spell)}
                    className="w-full text-left px-3 py-2 rounded border border-border/30 hover:bg-muted/30"
                  >
                    {spell.name}
                  </button>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
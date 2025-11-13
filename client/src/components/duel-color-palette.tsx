import { cn } from "@/lib/utils";
import { SPELL_COLORS } from "@/components/compact-color-palette";

interface DuelColorPaletteProps {
  selectedColor: string | null;
  onColorSelect: (colorName: string | null) => void;
  className?: string;
}

// Wide, readable palette specifically for duel player cards.
// Uses the same SPELL_COLORS data to avoid diverging logic.
export default function DuelColorPalette({ selectedColor, onColorSelect, className = "" }: DuelColorPaletteProps) {
  // Exact 4-per-row layout and order required for duel
  const rows: (string | null)[][] = [
    [null, "Красный", "Зелёный", "Голубой"],
    ["Жёлтый", "Золотой", "Оранжевый", "Розовый"],
    ["Фиолетовый", "Серебряный", "Серый", "Белый"],
    ["Бело-жёлтый", "Бирюзовый", "Бесцветный", "Пламенный шар"],
  ];

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div className="text-xs text-muted-foreground/70 font-medium">Цвет заклинания:</div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-4 gap-x-1 gap-y-px w-full">
          {row.map((item, jdx) => {
            if (item === null) {
              return (
                <button
                  key={`reset-${jdx}`}
                  onClick={() => onColorSelect(null)}
                  className={cn(
                    "h-8 w-full rounded-md border transition-all px-1 py-1 text-[11px] font-semibold",
                    selectedColor === null
                      ? "border-primary ring-1 ring-primary bg-primary/10"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                  title="Все цвета"
                  data-testid="color-reset"
                >
                  Все
                </button>
              );
            }

            const color = SPELL_COLORS.find((c) => c.colorName === item);
            if (!color) {
              return <div key={`empty-${jdx}`} className="h-8" />;
            }

            return (
              <button
                key={color.colorName}
                onClick={() => onColorSelect(color.colorName)}
                className={cn(
                  "h-8 w-full rounded-md border transition-all px-1 py-1 text-[11px] font-semibold",
                  selectedColor === color.colorName
                    ? "border-primary ring-1 ring-primary shadow-md"
                    : "border-transparent hover:border-primary/50"
                )}
                style={{
                  backgroundColor: color.hex,
                  boxShadow: selectedColor === color.colorName ? `0 0 8px ${color.hex}` : undefined,
                }}
                title={color.name}
                data-testid={`color-${color.colorName}`}
              >
                <span
                  className="leading-none font-serif font-bold"
                  style={{
                    color: ["#FFFFFF", "#FFFACD", "#E5E5E5", "#C0C0C0"].includes(color.hex)
                      ? "#000"
                      : "#FFF",
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
        </div>
      ))}
    </div>
  );
}
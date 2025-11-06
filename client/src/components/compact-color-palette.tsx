import { cn } from "@/lib/utils";

interface CompactColorPaletteProps {
  selectedColor: string | null;
  onColorSelect: (colorName: string | null) => void;
  className?: string;
}

// Spell color groups with their Russian names (compact version)
export const SPELL_COLORS = [
  { name: "Красный", hex: "#EF4444", colorName: "Красный" },
  { name: "Зелёный", hex: "#22C55E", colorName: "Зелёный" },
  { name: "Голубой", hex: "#3B82F6", colorName: "Голубой" },
  { name: "Жёлтый", hex: "#FBBF24", colorName: "Жёлтый" },
  { name: "Золотой", hex: "#FFD700", colorName: "Золотой" },
  { name: "Оранжевый", hex: "#FFA500", colorName: "Оранжевый" },
  { name: "Розовый", hex: "#EC4899", colorName: "Розовый" },
  { name: "Фиолетовый", hex: "#8B00FF", colorName: "Фиолетовый" },
  { name: "Серебро", hex: "#C0C0C0", colorName: "Серебряный" },
  { name: "Серый", hex: "#808080", colorName: "Серый" },
  { name: "Белый", hex: "#FFFFFF", colorName: "Белый" },
  { name: "Бело-жёлт.", hex: "#FFFACD", colorName: "Бело-жёлтый" },
  { name: "Бирюзовый", hex: "#40E0D0", colorName: "Бирюзовый" },
  { name: "Бесцв.", hex: "#E5E5E5", colorName: "Бесцветный" },
  { name: "Пламя", hex: "#FF4500", colorName: "Пламенный шар" },
] as const;

export default function CompactColorPalette({ selectedColor, onColorSelect, className = "" }: CompactColorPaletteProps) {
  // Заданный порядок: 6 строк
  const rows: (string | null)[][] = [
    [null, "Красный", "Зелёный"],
    ["Голубой", "Жёлтый", "Золотой"],
    ["Оранжевый", "Розовый", "Фиолетовый"],
    ["Серебряный", "Серый", "Белый"],
    ["Бело-жёлтый", "Бирюзовый", "Бесцветный"],
    ["Пламенный шар"],
  ];

  return (
    <div className={cn("flex flex-col gap-0 justify-start w-full h-full min-w-0", className)}>
      <div className="text-[9px] text-muted-foreground/70 font-medium">Цвет заклинания:</div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-3 gap-0 w-full min-w-0 overflow-x-hidden">
          {row.map((item, jdx) => {
            if (item === null) {
              return (
                <button
                  key={`reset-${jdx}`}
                  onClick={() => onColorSelect(null)}
                  className={cn(
                    "h-7 w-1/3 justify-self-start min-w-0 rounded-sm border transition-all flex items-center justify-center text-[9px] font-medium px-1 truncate",
                    selectedColor === null
                      ? "border-primary bg-primary/20 ring-1 ring-primary"
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
              return <div key={`empty-${jdx}`} className="h-7" />;
            }

            return (
              <button
                key={color.colorName}
                onClick={() => onColorSelect(color.colorName)}
                className={cn(
                  "h-7 w-1/3 justify-self-start min-w-0 rounded-sm border transition-all flex items-center justify-center gap-0.5 px-1 truncate",
                  selectedColor === color.colorName
                    ? "border-primary shadow-md ring-1 ring-primary"
                    : "border-transparent hover:border-primary/50"
                )}
                style={{
                  backgroundColor: color.hex,
                  boxShadow:
                    selectedColor === color.colorName ? `0 0 8px ${color.hex}` : undefined,
                }}
                title={color.name}
                data-testid={`color-${color.colorName}`}
              >
                <span
                  className="text-[9px] font-bold leading-none truncate"
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

          {/* Заполняем недостающие клетки, чтобы сохранить 3 колонки */}
          {Array.from({ length: Math.max(0, 3 - row.length) }).map((_, k) => (
            <div key={`spacer-${k}`} className="h-7 min-w-0" />
          ))}
        </div>
      ))}
    </div>
  );
}

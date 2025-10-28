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
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[10px] text-muted-foreground/70 font-medium">
        Цвет заклинания:
      </div>
      <div className="grid grid-cols-4 gap-1">
        {/* Reset button */}
        <button
          onClick={() => onColorSelect(null)}
          className={cn(
            "h-7 rounded border transition-all flex items-center justify-center text-[9px] font-medium",
            selectedColor === null 
              ? "border-primary bg-primary/20 scale-105" 
              : "border-muted-foreground/30 hover:border-primary/50"
          )}
          title="Все цвета"
          data-testid="color-reset"
        >
          Все
        </button>

        {/* Color buttons with labels */}
        {SPELL_COLORS.map((color) => (
          <button
            key={color.colorName}
            onClick={() => onColorSelect(color.colorName)}
            className={cn(
              "h-7 rounded border transition-all flex items-center justify-center gap-1 px-1",
              selectedColor === color.colorName 
                ? "border-primary scale-105 shadow-md" 
                : "border-transparent hover:border-primary/50"
            )}
            style={{ 
              backgroundColor: color.hex,
              boxShadow: selectedColor === color.colorName ? `0 0 8px ${color.hex}` : undefined
            }}
            title={color.name}
            data-testid={`color-${color.colorName}`}
          >
            <span 
              className="text-[9px] font-bold leading-none"
              style={{ 
                color: ['#FFFFFF', '#FFFACD', '#E5E5E5', '#C0C0C0'].includes(color.hex) ? '#000' : '#FFF',
                textShadow: ['#FFFFFF', '#FFFACD', '#E5E5E5', '#C0C0C0'].includes(color.hex) 
                  ? '0 0 2px rgba(0,0,0,0.5)' 
                  : '0 0 2px rgba(0,0,0,0.8)'
              }}
            >
              {color.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

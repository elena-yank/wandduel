import { cn } from "@/lib/utils";

interface ColorPaletteProps {
  selectedColor: string | null;
  onColorSelect: (colorName: string | null) => void;
  className?: string;
}

// Spell color groups with their Russian names
const SPELL_COLORS = [
  { name: "Красный", hex: "#EF4444", colorName: "Красный" },
  { name: "Зелёный", hex: "#22C55E", colorName: "Зелёный" },
  { name: "Голубой", hex: "#3B82F6", colorName: "Голубой" },
  { name: "Синий", hex: "#0000FF", colorName: "Синий" },
  { name: "Жёлтый", hex: "#FBBF24", colorName: "Жёлтый" },
  { name: "Золотой", hex: "#FFD700", colorName: "Золотой" },
  { name: "Оранжевый", hex: "#FFA500", colorName: "Оранжевый" },
  { name: "Розовый", hex: "#EC4899", colorName: "Розовый" },
  { name: "Фиолетовый", hex: "#8B00FF", colorName: "Фиолетовый" },
  { name: "Серебряный", hex: "#C0C0C0", colorName: "Серебряный" },
  { name: "Серый", hex: "#808080", colorName: "Серый" },
  { name: "Белый", hex: "#FFFFFF", colorName: "Белый" },
  { name: "Бело-жёлтый", hex: "#FFFACD", colorName: "Бело-жёлтый" },
  { name: "Бирюзовый", hex: "#40E0D0", colorName: "Бирюзовый" },
  { name: "Бесцветный", hex: "#E5E5E5", colorName: "Бесцветный" },
  { name: "Пламенный шар", hex: "#FF4500", colorName: "Пламенный шар" },
] as const;

export default function ColorPalette({ selectedColor, onColorSelect, className = "" }: ColorPaletteProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-xs text-muted-foreground/70 font-medium">
        Цвет заклинания:
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Reset button */}
        <button
          onClick={() => onColorSelect(null)}
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold",
            selectedColor === null 
              ? "border-primary bg-primary/20 scale-110" 
              : "border-muted-foreground/30 hover:border-primary/50"
          )}
          title="Все цвета"
          data-testid="color-reset"
        >
          ✕
        </button>

        {/* Color buttons */}
        {SPELL_COLORS.map((color) => (
          <button
            key={color.colorName}
            onClick={() => onColorSelect(color.colorName)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all",
              selectedColor === color.colorName 
                ? "border-primary scale-110 shadow-lg" 
                : "border-transparent hover:border-primary/50"
            )}
            style={{ 
              backgroundColor: color.hex,
              boxShadow: selectedColor === color.colorName ? `0 0 12px ${color.hex}` : undefined
            }}
            title={color.name}
            data-testid={`color-${color.colorName}`}
          />
        ))}
      </div>
      
      {/* Selected color label */}
      {selectedColor && (
        <div className="text-xs text-primary font-medium">
          Выбран: {SPELL_COLORS.find(c => c.colorName === selectedColor)?.name}
        </div>
      )}
    </div>
  );
}

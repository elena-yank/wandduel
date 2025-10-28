import { useState, forwardRef, useEffect, type ReactElement } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Wand2, Shield, Info } from "lucide-react";
import { type Spell, type Point } from "@shared/schema";

interface SpellDatabaseProps {
  attackSpells: Spell[];
  counterSpells: Spell[];
  highlightSpellId?: string | null;
  onHighlightComplete?: () => void;
}

const SpellDatabase = forwardRef<HTMLDivElement, SpellDatabaseProps>(({ 
  attackSpells, 
  counterSpells, 
  highlightSpellId,
  onHighlightComplete,
  ...props 
}, ref) => {
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [showGestureDialog, setShowGestureDialog] = useState(false);
  const [highlightedSpellId, setHighlightedSpellId] = useState<string | null>(null);

  useEffect(() => {
    if (highlightSpellId) {
      setHighlightedSpellId(highlightSpellId);
      
      // Scroll to the highlighted spell
      const spellElement = document.getElementById(`spell-${highlightSpellId}`);
      if (spellElement) {
        spellElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      
      // Remove highlight after 1 second
      const timer = setTimeout(() => {
        setHighlightedSpellId(null);
        onHighlightComplete?.();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightSpellId, onHighlightComplete]);

  const handleGestureClick = (spell: Spell) => {
    setSelectedSpell(spell);
    setShowGestureDialog(true);
  };
  const renderSpellCard = (spell: Spell, isCounter: boolean = false) => (
    <div
      id={`spell-${spell.id}`}
      key={spell.id}
      className={`bg-background/50 rounded-lg p-4 border transition-all ${
        isCounter ? "border-accent/20 hover:border-accent/40" : "border-destructive/20 hover:border-destructive/40"
      } ${
        highlightedSpellId === spell.id ? "ring-4 ring-[#FFD700] shadow-2xl shadow-[#FFD700]/50 scale-105" : ""
      }`}
      data-testid={`spell-card-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-serif font-bold text-foreground text-lg" data-testid={`text-spell-name-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}>
            {spell.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => handleGestureClick(spell)}
              className="text-sm text-muted-foreground text-left hover:text-foreground transition-colors flex items-center gap-1 underline decoration-muted-foreground/50"
              data-testid={`text-spell-description-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {spell.description}
              <Info className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: spell.color }}
                data-testid={`color-indicator-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <span className="text-xs text-muted-foreground" data-testid={`text-color-name-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}>
                {spell.colorName}
              </span>
            </div>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isCounter ? "bg-accent/10" : "bg-destructive/10"
        }`}>
          {isCounter ? (
            <Shield className={`w-6 h-6 ${isCounter ? "text-accent" : "text-destructive"}`} />
          ) : (
            <Wand2 className={`w-6 h-6 ${isCounter ? "text-accent" : "text-destructive"}`} />
          )}
        </div>
      </div>
    </div>
  );

  // Render gesture pattern visualization
  const renderGesturePattern = (pattern: Point[]): ReactElement | null => {
    if (!pattern || pattern.length === 0) return null;

    // Special case: single point pattern - show in center
    if (pattern.length === 1) {
      return (
        <svg 
          viewBox="0 0 300 300" 
          className="w-full h-full border-2 border-dashed border-border/30 rounded-lg bg-background/50"
        >
          {/* Draw single point in center */}
          <circle
            cx={150}
            cy={150}
            r={8}
            fill={selectedSpell?.color || "#888"}
            opacity={1}
          />
          {/* Glow effect */}
          <circle
            cx={150}
            cy={150}
            r={12}
            fill={selectedSpell?.color || "#888"}
            opacity={0.3}
          />
        </svg>
      );
    }

    // Find bounds of the pattern
    const xs = pattern.map(p => p.x);
    const ys = pattern.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Calculate size and scaling with centered positioning
    const width = maxX - minX || 100;
    const height = maxY - minY || 100;
    const scale = 250 / Math.max(width, height);
    
    // Center the pattern in the 300x300 viewBox
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const offsetX = (300 - scaledWidth) / 2 - minX * scale;
    const offsetY = (300 - scaledHeight) / 2 - minY * scale;

    // Create SVG path
    const pathData = pattern.map((point, index) => {
      const x = point.x * scale + offsetX;
      const y = point.y * scale + offsetY;
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    return (
      <svg 
        viewBox="0 0 300 300" 
        className="w-full h-full border-2 border-dashed border-border/30 rounded-lg bg-background/50"
      >
        {/* Draw path */}
        <path
          d={pathData}
          stroke={selectedSpell?.color || "#888"}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Draw points */}
        {pattern.map((point, index) => {
          const x = point.x * scale + offsetX;
          const y = point.y * scale + offsetY;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={index === 0 ? 6 : 4}
              fill={index === 0 ? selectedSpell?.color || "#888" : "#666"}
              opacity={index === 0 ? 1 : 0.6}
            />
          );
        })}
        {/* Start marker */}
        <text
          x={pattern[0].x * scale + offsetX}
          y={pattern[0].y * scale + offsetY - 10}
          textAnchor="middle"
          className="text-xs fill-foreground font-bold"
        >
          START
        </text>
      </svg>
    );
  };

  // Find counter spell for an attack spell
  const findCounterSpell = (attackSpell: Spell): Spell | null => {
    return counterSpells.find(counter => {
      const counters = counter.counters as string[] | null;
      return counters && Array.isArray(counters) && counters.includes(attackSpell.id);
    }) || null;
  };

  return (
    <div ref={ref} className="max-w-7xl mx-auto" {...props}>
      <h2 className="text-3xl font-serif font-bold text-foreground mb-6 flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        Книга заклинаний
      </h2>
      
      {/* Attack-Counter Mappings */}
      <div className="space-y-4 mb-8">
        {attackSpells.map(attackSpell => {
          const counterSpell = findCounterSpell(attackSpell);
          return (
            <Card key={attackSpell.id} className="spell-card border-border/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Attack Spell */}
                  <div>
                    <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Атакующее заклинание
                    </h4>
                    {renderSpellCard(attackSpell, false)}
                  </div>
                  
                  {/* Counter Spell */}
                  <div>
                    <h4 className="text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Контр-заклинание
                    </h4>
                    {counterSpell ? (
                      renderSpellCard(counterSpell, true)
                    ) : (
                      <div className="bg-background/30 rounded-lg p-4 border border-muted/20 text-center">
                        <p className="text-muted-foreground text-sm">Нет контр-заклинания</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gesture Pattern Dialog */}
      <Dialog open={showGestureDialog} onOpenChange={setShowGestureDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-gesture-pattern">
          <DialogHeader>
            <DialogTitle className="font-decorative text-xl sm:text-2xl decorative-text">
              {selectedSpell?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Паттерн жеста для 100% точности
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 sm:py-4">
            <div className="aspect-square w-full max-w-[250px] sm:max-w-full mx-auto mb-3 sm:mb-4">
              {selectedSpell?.gesturePattern ? renderGesturePattern(selectedSpell.gesturePattern as Point[]) : null}
            </div>
            <div className="bg-muted/20 rounded-lg p-3 sm:p-4 border border-border/20">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                <span className="font-semibold text-foreground">Описание движения:</span>
              </p>
              <p className="text-xs sm:text-sm text-foreground">
                {selectedSpell?.description}
              </p>
              <div className="flex items-center gap-2 mt-2 sm:mt-3">
                <div 
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" 
                  style={{ backgroundColor: selectedSpell?.color }}
                />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Цвет: {selectedSpell?.colorName}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

SpellDatabase.displayName = "SpellDatabase";

export default SpellDatabase;

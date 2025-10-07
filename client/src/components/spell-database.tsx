import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Wand2, Shield } from "lucide-react";
import { type Spell } from "@shared/schema";

interface SpellDatabaseProps {
  attackSpells: Spell[];
  counterSpells: Spell[];
}

export default function SpellDatabase({ attackSpells, counterSpells, ...props }: SpellDatabaseProps) {
  const renderSpellCard = (spell: Spell, isCounter: boolean = false) => (
    <div
      key={spell.id}
      className={`bg-background/50 rounded-lg p-4 border transition-colors ${
        isCounter ? "border-accent/20 hover:border-accent/40" : "border-destructive/20 hover:border-destructive/40"
      }`}
      data-testid={`spell-card-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-serif font-bold text-foreground text-lg" data-testid={`text-spell-name-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}>
            {spell.name}
          </h4>
          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-spell-description-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}>
            {spell.description}
          </p>
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
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: spell.color }}
            data-testid={`color-indicator-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
          />
          <span className="text-xs text-muted-foreground" data-testid={`text-color-name-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}>
            {spell.colorName}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {isCounter ? (
            <span>Counter spell</span>
          ) : (
            <span>Attack spell</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto" {...props}>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6 flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        Spell Grimoire
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Attack Spells */}
        <Card className="spell-card border-border/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-bold text-destructive mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive"></span>
              Attack Spells
            </h3>
            
            <div className="space-y-3" data-testid="attack-spells-list">
              {attackSpells.length > 0 ? (
                attackSpells.map(spell => renderSpellCard(spell, false))
              ) : (
                <p className="text-muted-foreground text-sm">No attack spells available</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Counter Spells */}
        <Card className="spell-card border-border/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-bold text-accent mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Counter Spells
            </h3>
            
            <div className="space-y-3" data-testid="counter-spells-list">
              {counterSpells.length > 0 ? (
                counterSpells.map(spell => renderSpellCard(spell, true))
              ) : (
                <p className="text-muted-foreground text-sm">No counter spells available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

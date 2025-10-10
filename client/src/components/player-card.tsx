import { Card, CardContent } from "@/components/ui/card";
import { User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Spell } from "@shared/schema";

interface SpellHistoryItem {
  roundNumber: number;
  spell: Spell | null;
  accuracy: number;
  successful: boolean;
}

interface PlayerCardProps {
  player: 1 | 2;
  playerName?: string;
  playerHouse?: string;
  houseIcon?: string;
  isActive: boolean;
  lastSpell: string;
  lastAccuracy: string;
  accuracy: number;
  spellHistory?: SpellHistoryItem[];
  onSpellClick?: (spellId: string) => void;
}

export default function PlayerCard({
  player,
  playerName,
  playerHouse,
  houseIcon,
  isActive,
  lastSpell,
  lastAccuracy,
  accuracy,
  spellHistory = [],
  onSpellClick,
  ...props
}: PlayerCardProps) {
  const playerColor = player === 1 ? "primary" : "accent";
  const playerRole = player === 1 ? "Атакующий" : "Защищающийся";
  const displayName = playerName || `Player ${player}`;

  // Create array for all 5 rounds
  const roundsDisplay = Array.from({ length: 5 }, (_, i) => {
    const roundNum = i + 1;
    const historyItem = spellHistory.find(h => h.roundNumber === roundNum);
    return {
      roundNumber: roundNum,
      spell: historyItem?.spell || null,
      accuracy: historyItem?.accuracy || 0,
      successful: historyItem?.successful ?? true
    };
  });

  return (
    <Card 
      className={cn(
        "spell-card border-border/20",
        isActive && "player-active"
      )}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            player === 1 ? "bg-primary/20" : "bg-accent/20"
          )}>
            {houseIcon ? (
              <img 
                src={houseIcon} 
                alt={playerHouse || "House"} 
                className="w-10 h-10 object-contain"
              />
            ) : (
              <User className={cn(
                "w-6 h-6",
                player === 1 ? "text-primary" : "text-accent"
              )} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-foreground" data-testid={`text-player-${player}-name`}>
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-player-${player}-role`}>
              {playerRole}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Last {player === 1 ? "Spell" : "Counter-Spell"} Cast
            </p>
            <div className="bg-background/50 rounded-lg p-3 border border-border/30 min-h-[60px]">
              {roundsDisplay.some(r => r.spell || !r.successful) ? (
                <div className="flex flex-wrap gap-1">
                  {roundsDisplay.map((round) => (
                    <div 
                      key={round.roundNumber}
                      onClick={() => round.spell && onSpellClick?.(round.spell.id)}
                      className={cn(
                        "px-2 py-1 rounded text-xs border transition-all flex items-center gap-1",
                        round.spell || !round.successful ? "opacity-100" : "opacity-30 border-dashed",
                        !round.successful ? "border-destructive/50" : round.spell ? (player === 1 ? "border-primary/30" : "border-accent/30") : "border-border/30",
                        round.spell && onSpellClick && "cursor-pointer hover:scale-105 hover:shadow-md"
                      )}
                      title={round.spell ? `${round.spell.name} (${round.accuracy}%)${!round.successful ? " - Неверная защита" : ""}\n\nКликните, чтобы открыть в гримуаре` : !round.successful ? "Неверная защита" : `Раунд ${round.roundNumber}`}
                    >
                      {round.spell ? (
                        <>
                          {!round.successful && (
                            <X className="w-3 h-3 text-destructive" />
                          )}
                          <span className={cn(
                            "font-serif font-semibold",
                            round.successful ? (player === 1 ? "text-primary" : "text-accent") : "text-destructive"
                          )}>
                            {round.spell.name}
                          </span>
                          <span className={cn(
                            "text-xs font-medium ml-1",
                            round.accuracy <= 55 ? "text-red-500" : 
                            round.accuracy <= 75 ? "text-yellow-500" : 
                            "text-green-500"
                          )}>
                            {round.accuracy}%
                          </span>
                        </>
                      ) : !round.successful ? (
                        <span className="text-destructive text-lg">❌</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={cn(
                  "font-serif font-bold",
                  player === 1 ? "text-primary" : "text-accent"
                )} data-testid={`text-player-${player}-last-spell`}>
                  {lastSpell}
                </p>
              )}
              {!roundsDisplay.some(r => r.spell || !r.successful) && (
                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-player-${player}-last-accuracy`}>
                  {lastAccuracy}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Точность движения палочкой</p>
            <div className="bg-background/50 rounded-full h-3 overflow-hidden">
              <div 
                className="accuracy-bar h-full transition-all duration-500" 
                style={{ width: `${accuracy}%` }}
                data-testid={`accuracy-bar-player-${player}`}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground mt-1" data-testid={`text-player-${player}-accuracy`}>
              {accuracy}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

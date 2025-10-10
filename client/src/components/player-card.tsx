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
  opponentSpell?: string; // For Player 2 to see Player 1's attack
  opponentAccuracy?: string; // For Player 2 to see Player 1's accuracy
}

// House color themes with actual color values
const houseColors = {
  gryffindor: {
    borderColor: "#DC2626", // red-600
    borderActiveColor: "#EF4444", // red-500
    bgColor: "rgba(220, 38, 38, 0.15)", // red-600/15
    iconBg: "rgba(220, 38, 38, 0.25)", // red-600/25
    textColor: "#EF4444", // red-500
    accentColor: "#EAB308", // yellow-500
    barGradient: "linear-gradient(to right, #DC2626, #EAB308)" // red to yellow
  },
  slytherin: {
    borderColor: "#059669", // green-600
    borderActiveColor: "#10B981", // green-500
    bgColor: "rgba(5, 150, 105, 0.15)", // green-600/15
    iconBg: "rgba(5, 150, 105, 0.25)", // green-600/25
    textColor: "#10B981", // green-500
    accentColor: "#9CA3AF", // gray-400
    barGradient: "linear-gradient(to right, #059669, #9CA3AF)" // green to gray
  },
  ravenclaw: {
    borderColor: "#2563EB", // blue-600
    borderActiveColor: "#3B82F6", // blue-500
    bgColor: "rgba(37, 99, 235, 0.15)", // blue-600/15
    iconBg: "rgba(37, 99, 235, 0.25)", // blue-600/25
    textColor: "#3B82F6", // blue-500
    accentColor: "#9CA3AF", // gray-400
    barGradient: "linear-gradient(to right, #2563EB, #9CA3AF)" // blue to gray
  },
  hufflepuff: {
    borderColor: "#CA8A04", // yellow-600
    borderActiveColor: "#EAB308", // yellow-500
    bgColor: "rgba(202, 138, 4, 0.15)", // yellow-600/15
    iconBg: "rgba(202, 138, 4, 0.25)", // yellow-600/25
    textColor: "#EAB308", // yellow-500
    accentColor: "#374151", // gray-700
    barGradient: "linear-gradient(to right, #CA8A04, #374151)" // yellow to gray
  }
} as const;

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
  opponentSpell,
  opponentAccuracy,
  ...props
}: PlayerCardProps) {
  const playerColor = player === 1 ? "primary" : "accent";
  const playerRole = player === 1 ? "Атакующий" : "Защищающийся";
  const displayName = playerName || `Player ${player}`;
  
  // Get house colors or fallback to default
  const houseTheme = playerHouse && playerHouse in houseColors 
    ? houseColors[playerHouse as keyof typeof houseColors]
    : null;

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
        "spell-card border-2 transition-all",
        !houseTheme && "border-border/20",
        isActive && !houseTheme && "player-active"
      )}
      style={houseTheme ? {
        borderColor: isActive ? houseTheme.borderActiveColor : houseTheme.borderColor,
        backgroundColor: houseTheme.bgColor
      } : undefined}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={houseTheme ? { backgroundColor: houseTheme.iconBg } : undefined}
          >
            {houseIcon ? (
              <img 
                src={houseIcon} 
                alt={playerHouse || "House"} 
                className="w-10 h-10 object-contain"
              />
            ) : (
              <User 
                className={cn(
                  "w-6 h-6",
                  !houseTheme && (player === 1 ? "text-primary" : "text-accent")
                )}
                style={houseTheme ? { color: houseTheme.textColor } : undefined}
              />
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
          {/* Show opponent's attack spell for Player 2 */}
          {player === 2 && opponentSpell && opponentSpell !== "-" && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                ⚔️ Атакующее заклинание противника
              </p>
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
                <p className="font-serif font-bold text-destructive" data-testid="text-opponent-spell">
                  {opponentSpell}
                </p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-opponent-accuracy">
                  {opponentAccuracy}
                </p>
              </div>
            </div>
          )}
          
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
                        !round.successful ? "border-destructive/50" : round.spell ? (
                          !houseTheme && (player === 1 ? "border-primary/30" : "border-accent/30")
                        ) : "border-border/30",
                        round.spell && onSpellClick && "cursor-pointer hover:scale-105 hover:shadow-md"
                      )}
                      style={houseTheme && round.spell && round.successful ? {
                        borderColor: houseTheme.borderColor + "4D" // 30% opacity
                      } : undefined}
                      title={round.spell ? `${round.spell.name} (${round.accuracy}%)${!round.successful ? " - Неверная защита" : ""}\n\nКликните, чтобы открыть в гримуаре` : !round.successful ? "Неверная защита" : `Раунд ${round.roundNumber}`}
                    >
                      {round.spell ? (
                        <>
                          {!round.successful && (
                            <X className="w-3 h-3 text-destructive" />
                          )}
                          <span 
                            className={cn(
                              "font-serif font-semibold",
                              round.successful ? (
                                !houseTheme && (player === 1 ? "text-primary" : "text-accent")
                              ) : "text-destructive"
                            )}
                            style={houseTheme && round.successful ? { color: houseTheme.textColor } : undefined}
                          >
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
                <p 
                  className={cn(
                    "font-serif font-bold",
                    !houseTheme && (player === 1 ? "text-primary" : "text-accent")
                  )}
                  style={houseTheme ? { color: houseTheme.textColor } : undefined}
                  data-testid={`text-player-${player}-last-spell`}
                >
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
                className={cn(
                  "h-full transition-all duration-500",
                  !houseTheme && "accuracy-bar"
                )}
                style={houseTheme ? {
                  width: `${accuracy}%`,
                  backgroundImage: houseTheme.barGradient
                } : { width: `${accuracy}%` }}
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

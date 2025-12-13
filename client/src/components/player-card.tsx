import { Card, CardContent } from "@/components/ui/card";
import { User, X, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Spell } from "@shared/schema";
import CompactColorPalette from "@/components/compact-color-palette";
import DuelColorPalette from "@/components/duel-color-palette";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsPhone } from "@/hooks/use-phone";
import { useState } from "react";
import { MIN_RECOGNITION_THRESHOLD } from "@shared/config";

interface SpellHistoryItem {
  roundNumber: number;
  spell: Spell | null;
  accuracy: number;
  successful: boolean;
  isBonusRound?: boolean; // Add this to indicate if the round is a bonus round
}

interface PlayerCardProps {
  player: 1 | 2;
  playerName?: string;
  playerHouse?: string;
  houseIcon?: string;
  isActive: boolean;
  lastSpell: string;
  lastSpellId?: string; // ID of last spell for clicking
  lastAccuracy: string;
  accuracy: number;
  spellHistory?: SpellHistoryItem[];
  onSpellClick?: (spellId: string) => void;
  selectedColor?: string | null;
  onColorSelect?: (colorName: string | null) => void;
  showColorPalette?: boolean;
  currentRound?: number; // Add current round to determine role
  isBonusRound?: boolean; // Add bonus round flag
  timeLeft?: number | null; // Add timer props
  isTimerActive?: boolean; // Add timer props
}
// House color themes with actual color values
const houseColors = {
  gryffindor: {
    borderColor: "#DC2626", // red-600
    borderActiveColor: "#EF4444", // red-500
    bgColor: "rgba(220, 38, 38, 0.35)", // red-600/35 - increased from 15%
    iconBg: "rgba(220, 38, 38, 0.25)", // red-600/25
    textColor: "#EF4444", // red-500
    accentColor: "#EAB308", // yellow-500
    barGradient: "linear-gradient(to right, #DC2626, #EAB308)" // red to yellow
  },
  slytherin: {
    borderColor: "#059669", // green-600
    borderActiveColor: "#10B981", // green-500
    bgColor: "rgba(5, 150, 105, 0.35)", // green-600/35 - increased from 15%
    iconBg: "rgba(5, 150, 105, 0.25)", // green-600/25
    textColor: "#10B981", // green-500
    accentColor: "#9CA3AF", // gray-400
    barGradient: "linear-gradient(to right, #059669, #9CA3AF)" // green to gray
  },
  ravenclaw: {
    borderColor: "#2563EB", // blue-600
    borderActiveColor: "#3B82F6", // blue-500
    bgColor: "rgba(37, 99, 235, 0.35)", // blue-600/35 - increased from 15%
    iconBg: "rgba(37, 99, 235, 0.25)", // blue-600/25
    textColor: "#3B82F6", // blue-500
    accentColor: "#9CA3AF", // gray-400
    barGradient: "linear-gradient(to right, #2563EB, #9CA3AF)" // blue to gray
  },
  hufflepuff: {
    borderColor: "#CA8A04", // yellow-600
    borderActiveColor: "#EAB308", // yellow-500
    bgColor: "rgba(202, 138, 4, 0.35)", // yellow-600/35 - increased from 15%
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
  lastSpellId,
  lastAccuracy,
  accuracy,
  spellHistory = [],
  onSpellClick,
  selectedColor,
  onColorSelect,
  showColorPalette = false,
  currentRound = 1,
  isBonusRound = false,
  timeLeft,
  isTimerActive,
  ...props
}: PlayerCardProps) {
  const [isColorPopupOpen, setIsColorPopupOpen] = useState(false);
  const isMobile = useIsPhone();
  const isOddRound = currentRound % 2 === 1;
  const isAttacker = player === (isOddRound ? 1 : 2);
  const playerRole = isAttacker ? "Атакующий" : "Защищающийся";
  const houseTheme = playerHouse ? houseColors[playerHouse as keyof typeof houseColors] : null;
  const displayName = playerName || `Игрок ${player}`;


  // Format time for display (MM:SS)
  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "01:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Create array for all rounds (including bonus rounds)
  // Find the maximum round number in the history to determine how many rounds to display
  const maxRoundNumber = Math.max(...spellHistory.map(h => h.roundNumber), currentRound || 10);
  const roundsDisplay = Array.from({ length: maxRoundNumber }, (_, i) => {
    const roundNum = i + 1;
    const historyItem = spellHistory.find(h => h.roundNumber === roundNum);
    const isBonusRound = historyItem?.isBonusRound ?? false;
    const recognized = (historyItem?.accuracy ?? 0) >= MIN_RECOGNITION_THRESHOLD && !!historyItem?.spell;
    return {
      roundNumber: roundNum,
      spell: recognized ? (historyItem!.spell as Spell) : null,
      accuracy: recognized ? (historyItem!.accuracy as number) : 0,
      successful: recognized ? (historyItem!.successful as boolean) : true,
      isBonusRound: isBonusRound
    };
  });

  const attacks = roundsDisplay.filter(round => {
    const isOdd = round.roundNumber % 2 === 1;
    const isBonus = round.isBonusRound || false;
    if (isBonus) {
      return player === (isOdd ? 1 : 2);
    }
    return player === 1 ? isOdd : !isOdd;
  });
  const defenses = roundsDisplay.filter(round => {
    const isOdd = round.roundNumber % 2 === 1;
    const isBonus = round.isBonusRound || false;
    if (isBonus) {
      return player === (isOdd ? 2 : 1);
    }
    return player === 1 ? !isOdd : isOdd;
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
        backgroundColor: houseTheme.bgColor,
        boxShadow: isActive ? `0 10px 15px -3px ${houseTheme.borderActiveColor}80, 0 4px 6px -4px ${houseTheme.borderActiveColor}80` : undefined
      } : undefined}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 flex items-center justify-center">
            {houseIcon ? (
              <img 
                src={houseIcon} 
                alt={playerHouse || "House"} 
                className="w-12 h-12 object-contain"
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
            <h3 
              className="text-xl font-serif font-bold" 
              style={houseTheme ? { color: houseTheme.textColor } : undefined}
              data-testid={`text-player-${player}-name`}
            >
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-player-${player}-role`}>
              {playerRole}
            </p>
            {/* Timer display */}
            {isTimerActive && timeLeft !== undefined && timeLeft !== null && (
              <div className="mt-1">
                <p className="text-xs font-mono font-bold" style={houseTheme ? { color: houseTheme.textColor } : undefined}>
                  {formatTime(timeLeft ?? null)}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Attack Spells Section */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              последнее атакующее заклинание
            </p>
            <div 
              className="bg-background/50 rounded-lg p-3 border min-h-[60px]"
              style={houseTheme ? {
                borderColor: houseTheme.borderColor + "80"
              } : {
                borderColor: 'hsl(var(--border) / 0.3)'
              }}
            >
              {attacks.some(r => r.spell || !r.successful) ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  {attacks.map((round) => (
                    <div 
                      key={round.roundNumber}
                      onClick={() => round.spell && onSpellClick?.(round.spell.id)}
                      className={cn(
                        "px-2 py-1 rounded text-xs border transition-all flex items-center gap-1",
                        round.spell || !round.successful ? "opacity-100" : "opacity-30 border-dashed",
                        !houseTheme && (player === 1 ? "border-primary/30" : "border-accent/30"),
                        round.spell && onSpellClick && "cursor-pointer hover:scale-105 hover:shadow-md"
                      )}
                      style={houseTheme && round.spell ? { borderColor: houseTheme.borderColor + "4D" } : undefined}
                      title={round.spell ? `${round.spell.name} (${round.accuracy}%)\n\nКликните, чтобы открыть в гримуаре` : `Раунд ${round.roundNumber}`}
                    >
                      {round.spell ? (
                        <>
                          <span 
                            className={cn(
                              "font-serif font-semibold",
                              !houseTheme && (player === 1 ? "text-primary" : "text-accent")
                            )}
                            style={houseTheme ? { color: houseTheme.textColor } : undefined}
                          >
                            {round.spell.name}
                          </span>
                          <span className={cn(
                            "text-xs font-medium ml-1",
                            (round.accuracy ?? 0) < MIN_RECOGNITION_THRESHOLD ? "text-muted-foreground" : (
                              round.accuracy <= 55 ? "text-red-500" : 
                              round.accuracy <= 75 ? "text-yellow-500" : 
                              "text-green-500"
                            )
                          )}>
                            {`${round.accuracy}%`}
                          </span>
                          {round.isBonusRound && (
                            <span className="ml-1 px-1 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-bold rounded">
                              БОНУС
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Ожидание...
                </div>
              )}
            </div>
          </div>

          {/* Defense Spells Section */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              последнее контр-заклинание
            </p>
            <div 
              className="bg-background/50 rounded-lg p-3 border min-h-[60px]"
              style={houseTheme ? {
                borderColor: houseTheme.borderColor + "80"
              } : {
                borderColor: 'hsl(var(--border) / 0.3)'
              }}
            >
              {defenses.some(r => r.spell || !r.successful) ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  {defenses.map((round) => (
                    <div 
                      key={round.roundNumber}
                      onClick={() => round.spell && onSpellClick?.(round.spell.id)}
                      className={cn(
                        "px-2 py-1 rounded text-xs border transition-all flex items-center gap-1",
                        round.spell || !round.successful ? "opacity-100" : "opacity-30 border-dashed",
                        (!round.successful && round.accuracy >= 50) ? "border-destructive/50" : round.spell ? (
                          !houseTheme && (player === 1 ? "border-primary/30" : "border-accent/30")
                        ) : "border-border/30",
                        round.spell && onSpellClick && "cursor-pointer hover:scale-105 hover:shadow-md"
                      )}
                      style={houseTheme && round.spell && round.successful ? {
                        borderColor: houseTheme.borderColor + "4D"
                      } : undefined}
                      title={round.spell ? `${round.spell.name} (${round.accuracy}%)\n\nКликните, чтобы открыть в гримуаре` : `Раунд ${round.roundNumber}`}
                    >
                      {round.spell ? (
                        <>
                          {null}
                          <span 
                            className={cn(
                              "font-serif font-semibold",
                              (round.successful || round.accuracy < 50) ? (
                                !houseTheme && (player === 1 ? "text-primary" : "text-accent")
                              ) : "text-destructive"
                            )}
                            style={houseTheme && round.successful ? { color: houseTheme.textColor } : undefined}
                          >
                            {round.spell ? round.spell.name : "-"}
                          </span>
                          <span className={cn(
                            "text-xs font-medium ml-1",
                            (round.accuracy ?? 0) < MIN_RECOGNITION_THRESHOLD ? "text-muted-foreground" : (
                              round.accuracy <= 55 ? "text-red-500" : 
                              round.accuracy <= 75 ? "text-yellow-500" : 
                              "text-green-500"
                            )
                          )}>
                            {round.spell ? `${round.accuracy}%` : "—"}
                          </span>
                          {round.isBonusRound && (
                            <span className="ml-1 px-1 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-bold rounded">
                              БОНУС
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Ожидание...
                </div>
              )}
            </div>
          </div>
          
          {/* Accuracy block removed per request */}

          {/* Color Palette */}
          {showColorPalette && onColorSelect && (
            !isMobile ? (
              <div className="pt-2">
                <DuelColorPalette
                  selectedColor={selectedColor || null}
                  onColorSelect={onColorSelect}
                />
              </div>
            ) : (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsColorPopupOpen(true)}
                  className={cn(
                    "w-8 h-8 rounded-full border bg-background/60 flex items-center justify-center",
                    !houseTheme && (player === 1 ? "border-primary/40" : "border-accent/40"),
                  )}
                  style={houseTheme ? { borderColor: houseTheme.borderColor + "66", backgroundColor: houseTheme.iconBg } : undefined}
                  aria-label="Выбор цвета заклинания"
                  data-testid={`open-color-popup-player-${player}`}
                >
                  <Palette className="w-4 h-4" style={houseTheme ? { color: houseTheme.textColor } : undefined} />
                </button>

                {/* Mobile color picker popup */}
                <Dialog open={isColorPopupOpen} onOpenChange={setIsColorPopupOpen}>
                  <DialogContent className="max-w-[22rem] p-4">
                    <DialogTitle className="text-sm">Выбор цвета заклинания</DialogTitle>
                    <DuelColorPalette
                      selectedColor={selectedColor || null}
                      onColorSelect={(color) => {
                        onColorSelect?.(color);
                        setIsColorPopupOpen(false);
                      }}
                      className="mt-2"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

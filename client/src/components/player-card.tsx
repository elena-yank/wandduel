import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: 1 | 2;
  playerName?: string;
  isActive: boolean;
  lastSpell: string;
  lastAccuracy: string;
  accuracy: number;
}

export default function PlayerCard({
  player,
  playerName,
  isActive,
  lastSpell,
  lastAccuracy,
  accuracy,
  ...props
}: PlayerCardProps) {
  const playerColor = player === 1 ? "primary" : "accent";
  const playerRole = player === 1 ? "Атакующий" : "Защищающийся";
  const displayName = playerName || `Player ${player}`;

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
            <User className={cn(
              "w-6 h-6",
              player === 1 ? "text-primary" : "text-accent"
            )} />
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
            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
              <p className={cn(
                "font-serif font-bold",
                player === 1 ? "text-primary" : "text-accent"
              )} data-testid={`text-player-${player}-last-spell`}>
                {lastSpell}
              </p>
              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-player-${player}-last-accuracy`}>
                {lastAccuracy}
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Gesture Accuracy</p>
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

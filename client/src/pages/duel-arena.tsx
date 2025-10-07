import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type GameSession, type Spell, type Point, type SessionParticipant } from "@shared/schema";
import GestureCanvas, { type GestureCanvasRef } from "@/components/gesture-canvas";
import PlayerCard from "@/components/player-card";
import SpellDatabase from "@/components/spell-database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Sparkles, Trophy, Info, Users, Eye, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RecognitionResult = {
  recognized: boolean;
  spell?: Spell;
  accuracy: number;
  isValidCounter?: boolean;
  successful: boolean;
  message?: string;
  multipleMatches?: boolean;
  matches?: Array<{ spell: Spell; accuracy: number }>;
  wrongDefenseUsed?: boolean;
};

export default function DuelArena() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/rooms/:roomId/arena");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastGesture, setLastGesture] = useState<Point[]>([]);
  const [roundPhase, setRoundPhase] = useState<"attack" | "counter" | "complete">("attack");
  const [attackResult, setAttackResult] = useState<RecognitionResult | null>(null);
  const [counterResult, setCounterResult] = useState<RecognitionResult | null>(null);
  const [spellChoices, setSpellChoices] = useState<Array<{ spell: Spell; accuracy: number }> | null>(null);
  const [showSpellChoice, setShowSpellChoice] = useState(false);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<GestureCanvasRef>(null);
  const roundCompleteShownForRound = useRef<number | null>(null);

  const roomId = params?.roomId;

  // Fetch spells
  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["/api/spells"],
  });

  // Fetch current session
  const { data: session, isLoading: sessionLoading } = useQuery<GameSession>({
    queryKey: ["/api/sessions", currentSessionId],
    enabled: !!currentSessionId,
    refetchInterval: 2000, // Refresh every 2 seconds to see updates from other players
  });

  // Fetch session participants
  const { data: participants = [] } = useQuery<SessionParticipant[]>({
    queryKey: ["/api/sessions", currentSessionId, "participants"],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const res = await fetch(`/api/sessions/${currentSessionId}/participants`);
      return res.json();
    },
    enabled: !!currentSessionId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Fetch spell history
  const { data: spellHistory = [] } = useQuery<Array<{
    roundNumber: number;
    playerId: number;
    spell: Spell | null;
    accuracy: number;
    successful: boolean;
  }>>({
    queryKey: ["/api/sessions", currentSessionId, "spell-history"],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const res = await fetch(`/api/sessions/${currentSessionId}/spell-history`);
      return res.json();
    },
    enabled: !!currentSessionId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Recognize gesture mutation
  const recognizeGestureMutation = useMutation({
    mutationFn: async ({ gesture, playerId }: { gesture: Point[]; playerId: number }) => {
      if (!currentSessionId) throw new Error("No active session");
      const res = await apiRequest("POST", `/api/sessions/${currentSessionId}/recognize-gesture`, {
        gesture,
        playerId,
      });
      return res.json();
    },
    onSuccess: (result: RecognitionResult) => {
      // Handle multiple spell matches - show choice dialog
      if (result.multipleMatches && result.matches) {
        setSpellChoices(result.matches);
        setShowSpellChoice(true);
        return;
      }

      // Handle wrong defense used - show toast and set counter result
      if (result.wrongDefenseUsed) {
        const description = result.spell?.name 
          ? `Вы использовали ${result.spell.name}, но это не защищает от данной атаки.`
          : "Вы использовали неправильное заклинание.";
          
        toast({
          title: "Неверная защита!",
          description,
          variant: "destructive",
        });
        
        // Set failed counter result
        setCounterResult({
          recognized: true,
          spell: result.spell,
          accuracy: result.accuracy,
          isValidCounter: false,
          successful: false
        });
        
        // Invalidate spell history to show the failed attempt
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId, "spell-history"] });
        return;
      }
      
      if (result.recognized && result.successful) {
        if (roundPhase === "attack") {
          setAttackResult(result);
        } else if (roundPhase === "counter") {
          setCounterResult(result);
        }
        // Invalidate session to get updated phase from server
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
      } else {
        toast({
          title: "Spell Recognition",
          description: result.message || "Try drawing the gesture more precisely",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recognize gesture",
        variant: "destructive",
      });
    },
  });

  // Complete round mutation
  const completeRoundMutation = useMutation({
    mutationFn: async (data: {
      attackSpellId: string | null;
      counterSuccess: boolean;
      player1Accuracy: number;
      player2Accuracy: number;
    }) => {
      if (!currentSessionId) throw new Error("No active session");
      const res = await apiRequest("POST", `/api/sessions/${currentSessionId}/complete-round`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId, "spell-history"] });
      setAttackResult(null);
      setCounterResult(null);
      setShowRoundComplete(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete round",
        variant: "destructive",
      });
    },
  });

  const players = participants.filter(p => p.role === "player");
  const spectators = participants.filter(p => p.role === "spectator");
  
  // Get player names
  const player1 = players.find(p => p.playerNumber === 1);
  const player2 = players.find(p => p.playerNumber === 2);
  const player1Name = player1?.userName || "Player 1";
  const player2Name = player2?.userName || "Player 2";

  // Find current user's participant to get their actual player number
  const currentParticipant = userId ? participants.find(p => p.userId === userId) : null;
  const actualPlayerNumber = currentParticipant?.playerNumber || playerNumber;

  // Sync roundPhase with session.currentPhase
  useEffect(() => {
    if (session?.currentPhase) {
      setRoundPhase(session.currentPhase as "attack" | "counter" | "complete");
    }
  }, [session?.currentPhase]);

  // Load attack spell info when in counter phase
  useEffect(() => {
    const loadAttackSpell = async () => {
      if (session?.currentPhase === "counter" && session.lastAttackSpellId) {
        // Fetch the attack spell details
        const spell = allSpells.find(s => s.id === session.lastAttackSpellId);
        if (spell && !attackResult) {
          // Set attack result from session data
          setAttackResult({
            recognized: true,
            spell: spell,
            accuracy: session.lastAttackAccuracy || 100,
            successful: true
          });
        }
      } else if (session?.currentPhase === "attack") {
        // Clear results when new round starts
        setAttackResult(null);
        setCounterResult(null);
      }
    };

    loadAttackSpell();
  }, [session?.currentPhase, session?.lastAttackSpellId, session?.lastAttackAccuracy, allSpells]);

  // Load counter spell info from spell history for all players
  useEffect(() => {
    if (session && spellHistory.length > 0) {
      const currentRound = session.currentRound || 1;
      const player2Attempt = spellHistory.find(
        h => h.roundNumber === currentRound && h.playerId === 2
      );
      
      if (player2Attempt && player2Attempt.spell && !counterResult) {
        setCounterResult({
          recognized: true,
          spell: player2Attempt.spell,
          accuracy: player2Attempt.accuracy,
          isValidCounter: player2Attempt.successful,
          successful: player2Attempt.successful
        });
      }
    }
  }, [session, spellHistory, counterResult]);

  // Check for role and session on component mount
  useEffect(() => {
    if (!roomId) {
      setLocation("/");
      return;
    }

    const role = localStorage.getItem(`userRole:${roomId}`);
    if (!role) {
      // If no role selected, redirect to role selection for this room
      setLocation(`/rooms/${roomId}/role-selection`);
      return;
    }
    
    setUserRole(role);

    // Get userId from sessionStorage (unique per tab)
    const currentUserId = sessionStorage.getItem("userId");
    if (currentUserId) {
      setUserId(currentUserId);
    }

    // Get session for this room
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/session`);
        if (!res.ok) {
          throw new Error("Session not found");
        }
        const sessionData = await res.json();
        setCurrentSessionId(sessionData.id);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить сессию",
          variant: "destructive",
        });
        setLocation("/");
      }
    };

    fetchSession();
  }, [roomId, setLocation, toast]);

  const handleGestureComplete = (gesture: Point[]) => {
    // Check if user is spectator
    if (userRole === "spectator") {
      toast({
        title: "Наблюдатель",
        description: "Наблюдатели не могут рисовать заклинания",
        variant: "destructive",
      });
      return;
    }

    // Check if it's this player's turn
    if (actualPlayerNumber) {
      const activePlayer = roundPhase === "attack" ? 1 : 2;
      if (actualPlayerNumber !== activePlayer) {
        toast({
          title: "Не ваш ход",
          description: `Сейчас ходит Player ${activePlayer}`,
          variant: "destructive",
        });
        return;
      }
    }

    setLastGesture(gesture);
    if (gesture.length < 1) {
      toast({
        title: "Invalid Gesture",
        description: "Please draw a gesture to cast a spell",
        variant: "destructive",
      });
      return;
    }

    if (actualPlayerNumber) {
      recognizeGestureMutation.mutate({ gesture, playerId: actualPlayerNumber });
    }
  };

  // Show round complete dialog after Player 2 counter spell
  useEffect(() => {
    const currentRound = session?.currentRound || 1;
    
    if (
      roundPhase === "counter" && 
      attackResult && 
      counterResult && 
      !showRoundComplete &&
      roundCompleteShownForRound.current !== currentRound
    ) {
      // Wait a moment to show the result, then show round complete dialog
      const timer = setTimeout(() => {
        setShowRoundComplete(true);
        roundCompleteShownForRound.current = currentRound;
      }, 1500); // 1.5 second delay to show result
      
      return () => clearTimeout(timer);
    }
  }, [roundPhase, attackResult, counterResult, showRoundComplete, session?.currentRound]);

  const handleLeave = () => {
    if (roomId) {
      // Clear room-scoped localStorage keys
      localStorage.removeItem(`userRole:${roomId}`);
      localStorage.removeItem(`currentSessionId:${roomId}`);
      localStorage.removeItem(`participantId:${roomId}`);
      localStorage.removeItem(`playerNumber:${roomId}`);
    }
    setLocation("/");
  };

  const handleSpellChoice = async (choice: { spell: Spell; accuracy: number }) => {
    // Close dialog
    setShowSpellChoice(false);
    setSpellChoices(null);

    // Create result object with chosen spell
    const result: RecognitionResult = {
      recognized: true,
      spell: choice.spell,
      accuracy: choice.accuracy,
      successful: true
    };

    // Process as normal recognition
    if (roundPhase === "attack") {
      setAttackResult(result);
      
      // Save spell attempt to history
      if (currentSessionId && actualPlayerNumber) {
        try {
          await apiRequest("POST", `/api/sessions/${currentSessionId}/save-spell-attempt`, {
            spellId: choice.spell.id,
            playerId: actualPlayerNumber,
            accuracy: choice.accuracy,
            gesture: lastGesture
          });
          
          // Invalidate spell history to show the new attempt
          queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId, "spell-history"] });
        } catch (error) {
          console.error("Failed to save spell attempt:", error);
        }
      }
      
      // Update session with selected attack spell
      if (currentSessionId) {
        try {
          await apiRequest("PATCH", `/api/sessions/${currentSessionId}`, {
            currentPhase: "counter",
            lastAttackSpellId: choice.spell.id,
            lastAttackAccuracy: choice.accuracy
          });
          // Invalidate session to get updated phase from server
          queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
        } catch (error) {
          console.error("Failed to update session:", error);
        }
      }
    }
  };

  const attackSpells = allSpells.filter(spell => spell.type === "attack");
  const counterSpells = allSpells.filter(spell => spell.type === "counter");

  const getPhaseText = () => {
    if (roundPhase === "attack") return "Player 1 - Attack";
    if (roundPhase === "counter") return "Player 2 - Counter";
    return "Round Complete";
  };

  const getCurrentPlayer = () => roundPhase === "attack" ? 1 : 2;

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Game completed - show results
  if (session?.gameStatus === "completed") {
    const winner = (session.player1Score ?? 0) > (session.player2Score ?? 0) ? 1 : 
                   (session.player2Score ?? 0) > (session.player1Score ?? 0) ? 2 : 
                   null;
    const winnerName = winner === 1 ? player1Name : winner === 2 ? player2Name : null;

    return (
      <div className="relative z-10 min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="spell-card border-border/20 max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-primary pulse-glow" />
            <h1 className="text-4xl md:text-5xl font-decorative decorative-text mb-4">
              Дуэль завершена!
            </h1>
            
            {winner ? (
              <>
                <p className="text-2xl font-serif mb-8">
                  Победитель: <span className="text-primary font-bold">{winnerName}</span>
                </p>
              </>
            ) : (
              <p className="text-2xl font-serif mb-8 text-muted-foreground">
                Ничья!
              </p>
            )}

            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{player1Name}</p>
                <p className="text-4xl font-bold text-primary">{session.player1Score ?? 0}</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{player2Name}</p>
                <p className="text-4xl font-bold text-accent">{session.player2Score ?? 0}</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-8">
              Всего раундов: {(session.currentRound ?? 1) - 1} из 5
            </p>

            <Button 
              onClick={handleLeave}
              className="glow-primary"
              size="lg"
              data-testid="button-return-lobby"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Вернуться в лобби
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="text-center mb-8 md:mb-12 relative">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-decorative decorative-text mb-4 tracking-wider">
          MAGICAL DUEL ARENA
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-serif">
          Cast your spells with precision and courage
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLeave}
          className="absolute top-0 right-0 gap-2"
          data-testid="button-leave-duel"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </Button>
      </header>

      {/* Game Status Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="spell-card border-border/20">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-primary pulse-glow" />
              <span className="text-sm font-medium text-muted-foreground">
                Round <span className="text-foreground font-bold">{session?.currentRound || 1}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Player 1 Score</p>
                <p className="text-2xl font-bold text-primary">{session?.player1Score || 0}</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Player 2 Score</p>
                <p className="text-2xl font-bold text-accent">{session?.player2Score || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Current Phase:</span>
              <span className="px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-sm">
                {getPhaseText()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="spell-card border-border/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Игроки: {players.length}/2</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Наблюдатели: {spectators.length}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ваша роль:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  userRole === "player" ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
                }`} data-testid="text-user-role">
                  {userRole === "player" ? `Player ${actualPlayerNumber}` : "Наблюдатель"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6 mb-8">
        {/* Player 1 Info */}
        <PlayerCard
          player={1}
          playerName={player1Name}
          isActive={getCurrentPlayer() === 1}
          lastSpell={attackResult?.spell?.name || "-"}
          lastAccuracy={attackResult ? `${attackResult.accuracy}% accuracy` : "Waiting..."}
          accuracy={attackResult?.accuracy || 0}
          spellHistory={spellHistory.filter(h => h.playerId === 1)}
          data-testid="player-card-1"
        />

        {/* Drawing Canvas */}
        <div className="lg:col-span-1 flex flex-col">
          <Card className="spell-card border-border/20 flex-1 flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif font-bold text-foreground">Cast Your Spell</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-muted/20 hover:bg-muted/40"
                  disabled={userRole === "spectator"}
                  onClick={() => canvasRef.current?.clearCanvas()}
                  data-testid="button-clear-canvas"
                >
                  Clear
                </Button>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <GestureCanvas
                  ref={canvasRef}
                  onGestureComplete={handleGestureComplete}
                  isDisabled={recognizeGestureMutation.isPending || userRole === "spectator" || (actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer())}
                  className="canvas-container"
                  data-testid="gesture-canvas"
                />
              </div>
              
              {userRole === "spectator" && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Вы наблюдаете за дуэлью
                </div>
              )}
              
              {userRole === "player" && actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer() && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Сейчас ходит Player {getCurrentPlayer()}
                </div>
              )}
              
              <div className="mt-4">
                <Button 
                  onClick={() => handleGestureComplete(lastGesture)}
                  disabled={lastGesture.length < 3 || recognizeGestureMutation.isPending || userRole === "spectator" || (actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer())}
                  className="w-full glow-primary"
                  data-testid="button-recognize-spell"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {recognizeGestureMutation.isPending ? "Recognizing..." : "Recognize Spell"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player 2 Info */}
        <PlayerCard
          player={2}
          playerName={player2Name}
          isActive={getCurrentPlayer() === 2}
          lastSpell={counterResult?.spell?.name || "-"}
          lastAccuracy={counterResult ? 
            `${counterResult.accuracy}% accuracy${counterResult.isValidCounter ? " - Valid counter!" : ""}` : 
            "Waiting..."}
          accuracy={counterResult?.accuracy || 0}
          spellHistory={spellHistory.filter(h => h.playerId === 2)}
          data-testid="player-card-2"
        />
      </div>

      {/* Spell Database */}
      <SpellDatabase 
        attackSpells={attackSpells} 
        counterSpells={counterSpells} 
        data-testid="spell-database"
      />

      {/* Game Instructions */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="spell-card border-border/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-secondary" />
              How to Duel
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Player 1 Attacks</h4>
                <p className="text-sm text-muted-foreground">
                  Draw an attack spell gesture on the canvas. The system will recognize it and show accuracy percentage.
                </p>
              </div>
              
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                  <span className="text-accent font-bold">2</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Player 2 Counters</h4>
                <p className="text-sm text-muted-foreground">
                  Draw the correct counter-spell gesture. System validates if it matches the attack spell.
                </p>
              </div>
              
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-3">
                  <span className="text-secondary font-bold">3</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Score Points</h4>
                <p className="text-sm text-muted-foreground">
                  Successful attacks and accurate counters earn points. First to 10 points wins the duel!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spell Choice Dialog */}
      <Dialog open={showSpellChoice} onOpenChange={setShowSpellChoice}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-spell-choice">
          <DialogHeader>
            <DialogTitle className="font-decorative text-xl decorative-text">
              Выберите заклинание
            </DialogTitle>
            <DialogDescription className="text-sm">
              Несколько заклинаний соответствуют вашему движению. Выберите нужное:
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-3">
            {spellChoices?.map((choice, index) => (
              <Button
                key={choice.spell.id}
                onClick={() => handleSpellChoice(choice)}
                variant="outline"
                className="h-auto flex flex-col items-start p-3 text-left hover:bg-primary/10 transition-colors"
                data-testid={`button-spell-choice-${index}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: choice.spell.color }}
                  />
                  <div className="flex-1">
                    <p className="font-serif font-semibold text-sm text-foreground">
                      {choice.spell.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {choice.spell.colorName} • {choice.accuracy.toFixed(0)}% точность
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Round Complete Dialog */}
      <Dialog open={showRoundComplete} onOpenChange={setShowRoundComplete}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-round-complete">
          <DialogHeader>
            <DialogTitle className="font-decorative text-xl decorative-text">
              Раунд завершен
            </DialogTitle>
            <DialogDescription className="text-sm">
              Результаты раунда
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Атака Player 1</p>
              <p className="text-base font-semibold text-foreground">
                {attackResult?.spell?.name}
              </p>
              <p className="text-xs text-primary">
                Точность: {attackResult?.accuracy}%
              </p>
            </div>
            
            <div className={`rounded-lg p-3 border ${
              counterResult?.isValidCounter 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <p className="text-xs text-muted-foreground mb-1">Защита Player 2</p>
              <p className="text-base font-semibold text-foreground">
                {counterResult?.spell?.name || "Не выполнено"}
              </p>
              <p className={`text-xs ${counterResult?.isValidCounter ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                Точность: {counterResult?.accuracy}%
              </p>
              <p className={`text-xs font-semibold mt-1 ${counterResult?.isValidCounter ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {counterResult?.isValidCounter ? '✓ Правильная защита' : '✗ Неудачная попытка защиты'}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              if (attackResult && counterResult) {
                completeRoundMutation.mutate({
                  attackSpellId: attackResult.spell?.id || null,
                  counterSuccess: counterResult.successful && (counterResult.isValidCounter ?? false),
                  player1Accuracy: attackResult.accuracy,
                  player2Accuracy: counterResult.accuracy,
                });
              }
            }}
            className="w-full glow-primary"
            data-testid="button-continue-next-round"
          >
            Следующий раунд
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

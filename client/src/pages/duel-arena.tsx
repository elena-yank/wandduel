import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type GameSession, type Spell, type Point, type SessionParticipant } from "@shared/schema";
import GestureCanvas from "@/components/gesture-canvas";
import PlayerCard from "@/components/player-card";
import SpellDatabase from "@/components/spell-database";
import FeedbackModal from "@/components/feedback-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Sparkles, Trophy, Info, Users, Eye, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RecognitionResult = {
  recognized: boolean;
  spell?: Spell;
  accuracy: number;
  isValidCounter?: boolean;
  successful: boolean;
  message?: string;
};

export default function DuelArena() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/rooms/:roomId/arena");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<RecognitionResult | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastGesture, setLastGesture] = useState<Point[]>([]);
  const [roundPhase, setRoundPhase] = useState<"attack" | "counter" | "complete">("attack");
  const [attackResult, setAttackResult] = useState<RecognitionResult | null>(null);
  const { toast } = useToast();

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
      setFeedbackResult(result);
      setShowFeedback(true);
      
      if (result.recognized && result.successful) {
        if (roundPhase === "attack") {
          setAttackResult(result);
          setRoundPhase("counter");
        }
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
      setRoundPhase("attack");
      setAttackResult(null);
      setFeedbackResult(null);
      toast({
        title: "Round Complete",
        description: "Starting next round...",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete round",
        variant: "destructive",
      });
    },
  });

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

    setLastGesture(gesture);
    if (gesture.length < 1) {
      toast({
        title: "Invalid Gesture",
        description: "Please draw a gesture to cast a spell",
        variant: "destructive",
      });
      return;
    }

    const currentPlayer = roundPhase === "attack" ? 1 : 2;
    recognizeGestureMutation.mutate({ gesture, playerId: currentPlayer });
  };

  const players = participants.filter(p => p.role === "player");
  const spectators = participants.filter(p => p.role === "spectator");

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

  const handleCompleteRound = () => {
    if (!attackResult || !feedbackResult) {
      toast({
        title: "Round Incomplete",
        description: "Both players must cast spells to complete the round",
        variant: "destructive",
      });
      return;
    }

    completeRoundMutation.mutate({
      attackSpellId: attackResult.spell?.id || null,
      counterSuccess: feedbackResult.successful && (feedbackResult.isValidCounter ?? false),
      player1Accuracy: attackResult.accuracy,
      player2Accuracy: feedbackResult.accuracy,
    });
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
                  {userRole === "player" ? "Игрок" : "Наблюдатель"}
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
          isActive={getCurrentPlayer() === 1}
          lastSpell={attackResult?.spell?.name || "-"}
          lastAccuracy={attackResult ? `${attackResult.accuracy}% accuracy` : "Waiting..."}
          accuracy={attackResult?.accuracy || 0}
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
                  data-testid="button-clear-canvas"
                >
                  Clear
                </Button>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <GestureCanvas
                  onGestureComplete={handleGestureComplete}
                  isDisabled={recognizeGestureMutation.isPending || userRole === "spectator"}
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
              
              <div className="mt-4 flex gap-3">
                <Button 
                  onClick={() => handleGestureComplete(lastGesture)}
                  disabled={lastGesture.length < 3 || recognizeGestureMutation.isPending || userRole === "spectator"}
                  className="flex-1 glow-primary"
                  data-testid="button-recognize-spell"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {recognizeGestureMutation.isPending ? "Recognizing..." : "Recognize Spell"}
                </Button>
                <Button 
                  onClick={handleCompleteRound}
                  variant="secondary"
                  disabled={roundPhase !== "counter" || !feedbackResult?.successful || completeRoundMutation.isPending || userRole === "spectator"}
                  data-testid="button-complete-round"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Complete Round
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player 2 Info */}
        <PlayerCard
          player={2}
          isActive={getCurrentPlayer() === 2}
          lastSpell={roundPhase === "counter" && feedbackResult?.spell ? feedbackResult.spell.name : "-"}
          lastAccuracy={roundPhase === "counter" && feedbackResult ? 
            `${feedbackResult.accuracy}% accuracy${feedbackResult.isValidCounter ? " - Valid counter!" : ""}` : 
            "Waiting..."}
          accuracy={roundPhase === "counter" && feedbackResult ? feedbackResult.accuracy : 0}
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        result={feedbackResult}
        isCounterPhase={roundPhase === "counter"}
        data-testid="feedback-modal"
      />
    </div>
  );
}

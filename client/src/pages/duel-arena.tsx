import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type GameSession, type Spell, type Point, type SessionParticipant } from "@shared/schema";
import GestureCanvas, { type GestureCanvasRef } from "@/components/gesture-canvas";
import PlayerCard from "@/components/player-card";
import SpellDatabase from "@/components/spell-database";
import { SPELL_COLORS } from "@/components/compact-color-palette";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Sparkles, Trophy, Info, Users, Eye, LogOut, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import duelIconPath from "@assets/image_1760081444104.png";
import gryffindorIcon from "@assets/icons8-hogwarts-legacy-gryffindor-480_1760083007155.png";
import ravenclawIcon from "@assets/icons8-hogwarts-legacy-ravenclaw-480_1760083011315.png";
import slytherinIcon from "@assets/icons8-hogwarts-legacy-slytherin-480_1760083015546.png";
import hufflepuffIcon from "@assets/icons8-hogwarts-legacy-hufflepuff-480_1760083019603.png";

const houseIcons: Record<string, string> = {
  gryffindor: gryffindorIcon,
  ravenclaw: ravenclawIcon,
  slytherin: slytherinIcon,
  hufflepuff: hufflepuffIcon,
};

// House colors matching player-card.tsx
const houseColors = {
  gryffindor: "#EF4444", // red-500
  ravenclaw: "#3B82F6", // blue-500
  slytherin: "#10B981", // green-500
  hufflepuff: "#EAB308" // yellow-500
};

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
  gesture?: Point[]; // Gesture data for saving later when user chooses
};

// Helper function to calculate points earned from a spell
// With the new scoring system, only 1 point is awarded per round to the player with higher accuracy
function calculatePoints(spell: Spell | undefined, accuracy: number, isPointWinner: boolean): number {
  // Return 1 if this player won the point for this round, 0 otherwise
  return isPointWinner ? 1 : 0;
}

// Component to display a small preview of drawn gesture
function GesturePreview({ gesture, className = "" }: { gesture: Point[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gesture || gesture.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Normalize gesture to fit in the small canvas
    const minX = Math.min(...gesture.map(p => p.x));
    const maxX = Math.max(...gesture.map(p => p.x));
    const minY = Math.min(...gesture.map(p => p.y));
    const maxY = Math.max(...gesture.map(p => p.y));
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scale = Math.min(canvas.width / width, canvas.height / height) * 0.8;
    
    const offsetX = (canvas.width - width * scale) / 2;
    const offsetY = (canvas.height - height * scale) / 2;

    // Draw gesture
    ctx.strokeStyle = 'rgb(147, 51, 234)'; // Purple color
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    gesture.forEach((point, index) => {
      const x = (point.x - minX) * scale + offsetX;
      const y = (point.y - minY) * scale + offsetY;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }, [gesture]);

  return (
    <canvas 
      ref={canvasRef} 
      width={80} 
      height={80} 
      className={`bg-background/50 rounded border border-primary/20 ${className}`}
    />
  );
}

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
  const [pendingGesture, setPendingGesture] = useState<Point[] | null>(null);
  const [showSpellChoice, setShowSpellChoice] = useState(false);
  const [showRoundComplete, setShowRoundComplete] = useState(false);
  const [showScrollToCanvas, setShowScrollToCanvas] = useState(false);
  const [highlightSpellId, setHighlightSpellId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  // Timer states
  const [player1TimeLeft, setPlayer1TimeLeft] = useState<number | null>(null);
  const [player2TimeLeft, setPlayer2TimeLeft] = useState<number | null>(null);
  const [player1TimerActive, setPlayer1TimerActive] = useState(false);
  const [player2TimerActive, setPlayer2TimerActive] = useState(false);
  const { toast } = useToast();
  const canvasRef = useRef<GestureCanvasRef>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const spellDatabaseRef = useRef<HTMLDivElement>(null);
  const roundCompleteShownForRound = useRef<string | null>(null);
  const dismissedDialogForRound = useRef<string | null>(null); // Track when user dismisses dialog
  const previousRoundRef = useRef<number | null>(null); // Track previous round number
  
  // Refs to store current timer states for use in interval callback
  const player1TimeLeftRef = useRef<number | null>(player1TimeLeft);
  const player2TimeLeftRef = useRef<number | null>(player2TimeLeft);
  const player1TimerActiveRef = useRef<boolean>(player1TimerActive);
  const player2TimerActiveRef = useRef<boolean>(player2TimerActive);

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
    drawnGesture: Point[];
    isBonusRound?: boolean;
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
    mutationFn: async ({ gesture, playerId, colorFilter }: { gesture: Point[]; playerId: number; colorFilter?: string | null }) => {
      if (!currentSessionId) throw new Error("No active session");
      const res = await apiRequest("POST", `/api/sessions/${currentSessionId}/recognize-gesture`, {
        gesture,
        playerId,
        colorFilter: colorFilter || undefined,
      });
      return res.json();
    },
    onSuccess: (result: RecognitionResult) => {
      // Handle multiple spell matches - show choice dialog
      if (result.multipleMatches && result.matches) {
        setSpellChoices(result.matches);
        setPendingGesture(result.gesture || null); // Save gesture for later
        setShowSpellChoice(true);
        // Don't clear canvas yet - user needs to see their drawing while choosing
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
        
        // Clear canvas after wrong defense
        canvasRef.current?.clearCanvas();
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
        
        // Clear canvas after successful recognition
        canvasRef.current?.clearCanvas();
      } else {
        toast({
          title: "Spell Recognition",
          description: result.message || "Try drawing the gesture more precisely",
          variant: "destructive",
        });
        
        // Clear canvas after failed recognition
        canvasRef.current?.clearCanvas();
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

  // Get hex color for drawing based on selected color
  const getDrawColor = (): string => {
    if (!selectedColor) return "hsl(259, 74%, 56%)"; // Default purple
    const colorObj = SPELL_COLORS.find(c => c.colorName === selectedColor);
    return colorObj?.hex || "hsl(259, 74%, 56%)";
  };


  // Find current user's participant to get their actual player number
  const currentParticipant = userId ? participants.find(p => p.userId === userId) : null;
  const actualPlayerNumber = currentParticipant?.playerNumber || playerNumber;

  // Sync roundPhase with session.currentPhase
  useEffect(() => {
    if (session?.currentPhase) {
      setRoundPhase(session.currentPhase as "attack" | "counter" | "complete");
    }
  }, [session?.currentPhase]);

  // Timer effect - handles countdown logic
  useEffect(() => {
    // Clear any existing timers
    let timer: NodeJS.Timeout | null = null;
    
    // Calculate current player within the effect
    const currentRound = session?.currentRound || 1;
    const isOddRound = currentRound % 2 === 1;
    const isBonusRound = session?.isBonusRound || false;
    let currentPlayer = 1;
    
    if (roundPhase === "attack") {
      currentPlayer = isBonusRound ? 1 : (isOddRound ? 1 : 2);
    } else {
      currentPlayer = isBonusRound ? 2 : (isOddRound ? 2 : 1);
    }
    
    // Update previous round ref
    if (session?.currentRound) {
      previousRoundRef.current = session.currentRound;
    }
    
    // Reset timers when round changes
    if (session?.currentRound && previousRoundRef.current !== session.currentRound) {
      // Reset both timers to 60 seconds when round changes
      setPlayer1TimeLeft(60);
      setPlayer2TimeLeft(60);
    }
    
    // Start timer for current player if it's their turn and they can draw
    if (roundPhase === "attack" || roundPhase === "counter") {
      if (currentPlayer === 1) {
        // Activate Player 1 timer and deactivate Player 2 timer
        // Only start Player 1's timer if both players have joined
        if (!player1TimerActive && players.length >= 2) {
          setPlayer1TimerActive(true);
          setPlayer1TimeLeft(60); // Start with 60 seconds
        }
        if (player2TimerActive) {
          setPlayer2TimerActive(false);
        }
      } else if (currentPlayer === 2) {
        // Activate Player 2 timer and deactivate Player 1 timer
        if (!player2TimerActive) {
          setPlayer2TimerActive(true);
          setPlayer2TimeLeft(60); // Start with 60 seconds
        }
        if (player1TimerActive) {
          setPlayer1TimerActive(false);
        }
      }
      
      // Start the countdown for the active player
      // Always start timer interval when in attack or counter phase
      timer = setInterval(() => {
        // Update time for current player only if their timer is active and time is > 0
        if (currentPlayer === 1 && player1TimerActiveRef.current && player1TimeLeftRef.current !== null && player1TimeLeftRef.current > 0) {
          setPlayer1TimeLeft(prev => (prev !== null ? prev - 1 : null));
          player1TimeLeftRef.current = player1TimeLeftRef.current !== null ? player1TimeLeftRef.current - 1 : null;
        } else if (currentPlayer === 2 && player2TimerActiveRef.current && player2TimeLeftRef.current !== null && player2TimeLeftRef.current > 0) {
          setPlayer2TimeLeft(prev => (prev !== null ? prev - 1 : null));
          player2TimeLeftRef.current = player2TimeLeftRef.current !== null ? player2TimeLeftRef.current - 1 : null;
        }
        
        // Check if timer has expired for either player
        if (currentPlayer === 1 && player1TimerActiveRef.current && player1TimeLeftRef.current === 1) {
          // Player 1's timer expired, Player 2 wins the round
          toast({
            title: "Время вышло!",
            description: `${player2Name} побеждает в этом раунде!`,
            variant: "default",
          });
          
          // Complete round with Player 2 as winner
          completeRoundMutation.mutate({
            attackSpellId: null,
            counterSuccess: false,
            player1Accuracy: 0,
            player2Accuracy: 100
          });
        } else if (currentPlayer === 2 && player2TimerActiveRef.current && player2TimeLeftRef.current === 1) {
          // Player 2's timer expired, Player 1 wins the round
          toast({
            title: "Время вышло!",
            description: `${player1Name} побеждает в этом раунде!`,
            variant: "default",
          });
          
          // Complete round with Player 1 as winner
          completeRoundMutation.mutate({
            attackSpellId: null,
            counterSuccess: false,
            player1Accuracy: 100,
            player2Accuracy: 0
          });
        }
      }, 1000);
    } else {
      // Round is complete, stop all timers
      setPlayer1TimerActive(false);
      setPlayer2TimerActive(false);
    }
    
    // Cleanup function to clear timer
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [roundPhase, session?.currentRound, session?.isBonusRound, players]);

  // Update timer state refs when timer states change
  useEffect(() => {
    player1TimeLeftRef.current = player1TimeLeft;
    player2TimeLeftRef.current = player2TimeLeft;
    player1TimerActiveRef.current = player1TimerActive;
    player2TimerActiveRef.current = player2TimerActive;
  }, [player1TimeLeft, player2TimeLeft, player1TimerActive, player2TimerActive]);
  
  // Reset dialog tracking when round number changes
  useEffect(() => {
    // Reset both round trackers when a new round starts
    roundCompleteShownForRound.current = null;
    dismissedDialogForRound.current = null;
  }, [session?.currentRound]);

  // Load attack spell info when in counter phase
  useEffect(() => {
    const loadAttackSpell = async () => {
      // If Player 2 has round complete dialog open, don't update to new phase yet
      if (actualPlayerNumber === 2 && showRoundComplete) {
        return; // Wait until Player 2 closes their dialog
      }

      if (session?.currentPhase === "counter" && session.lastAttackSpellId) {
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
  }, [session?.currentPhase, session?.lastAttackSpellId, session?.lastAttackAccuracy, session?.currentRound, allSpells, actualPlayerNumber, showRoundComplete]);

  // Load counter spell info from spell history or pending session data
  useEffect(() => {
    // If Player 2 has round complete dialog open, don't update yet
    if (actualPlayerNumber === 2 && showRoundComplete) {
      return; // Wait until Player 2 closes their dialog
    }

    // First, try to get from pending session data (most up-to-date)
    if (session?.pendingCounterSpellId) {
      const pendingSpell = allSpells.find(s => s.id === session.pendingCounterSpellId);
      if (pendingSpell) {
        const needsUpdate = !counterResult || 
          !counterResult.spell || 
          counterResult.spell.id !== pendingSpell.id;
          
        if (needsUpdate) {
          // Check if it's a valid counter for the attack spell
          const isValidCounter = !!(session.lastAttackSpellId && 
            Array.isArray(pendingSpell.counters) &&
            pendingSpell.counters.includes(session.lastAttackSpellId));
            
          setCounterResult({
            recognized: true,
            spell: pendingSpell,
            accuracy: session.pendingCounterAccuracy || 0,
            isValidCounter: isValidCounter,
            successful: (session.pendingCounterAccuracy || 0) >= 57
          });
        }
      }
    }
    // Otherwise, load from spell history
    else if (session && spellHistory.length > 0) {
      const currentRound = session.currentRound || 1;
      const player2Attempt = spellHistory.find(
        h => h.roundNumber === currentRound && h.playerId === 2
      );
      
      if (player2Attempt && player2Attempt.spell) {
        // Check if we need to update counterResult for current round
        const needsUpdate = !counterResult || 
          !counterResult.spell || 
          counterResult.spell.id !== player2Attempt.spell.id;
          
        if (needsUpdate) {
          setCounterResult({
            recognized: true,
            spell: player2Attempt.spell,
            accuracy: player2Attempt.accuracy,
            isValidCounter: player2Attempt.successful,
            successful: player2Attempt.successful
          });
        }
      }
    }
  }, [session, spellHistory, allSpells, actualPlayerNumber, showRoundComplete]);

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

  // Track scroll position to show/hide scroll-to-canvas button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowScrollToCanvas(scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to canvas function
  const scrollToCanvas = () => {
    if (canvasContainerRef.current) {
      const canvasRect = canvasContainerRef.current.getBoundingClientRect();
      const absoluteTop = canvasRect.top + window.scrollY;
      const canvasHeight = canvasRect.height;
      const viewportHeight = window.innerHeight;
      
      // Calculate position to center the canvas
      const scrollTo = absoluteTop - (viewportHeight / 2) + (canvasHeight / 2);
      
      window.scrollTo({
        top: scrollTo,
        behavior: "smooth"
      });
    }
  };

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
      const activePlayer = getCurrentPlayer();
      if (actualPlayerNumber !== activePlayer) {
        // Determine role based on current round
        const currentRound = session?.currentRound || 1;
        const isOddRound = currentRound % 2 === 1;
        const attacker = isOddRound ? 1 : 2;
        const activePlayerRole = activePlayer === attacker ? "Атакующий" : "Защищающийся";
        
        toast({
          title: "Не ваш ход",
          description: `Сейчас ходит ${activePlayerRole}`,
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
      recognizeGestureMutation.mutate({ gesture, playerId: actualPlayerNumber, colorFilter: selectedColor });
    }
  };

  // Show round complete dialog when a round is completed
  useEffect(() => {
    // Show dialog if we have lastCompletedRoundNumber and haven't shown/dismissed this round yet
    if (session?.lastCompletedRoundNumber && !showRoundComplete) {
      const roundKey = `${session.lastCompletedRoundNumber}`;
      
      // Only show if we haven't shown for this round AND user hasn't dismissed it
      if (roundCompleteShownForRound.current !== roundKey && dismissedDialogForRound.current !== roundKey) {
        setShowRoundComplete(true);
        roundCompleteShownForRound.current = roundKey;
      }
    }
  }, [session?.lastCompletedRoundNumber, showRoundComplete]);

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
      
      // Save spell attempt to history using the pending gesture
      if (currentSessionId && actualPlayerNumber && pendingGesture) {
        try {
          await apiRequest("POST", `/api/sessions/${currentSessionId}/save-spell-attempt`, {
            spellId: choice.spell.id,
            playerId: actualPlayerNumber,
            accuracy: choice.accuracy,
            gesture: pendingGesture
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
    
    // Clear pending gesture and canvas after spell choice
    setPendingGesture(null);
    canvasRef.current?.clearCanvas();
  };

  const attackSpells = allSpells.filter(spell => spell.type === "attack");
  const counterSpells = allSpells.filter(spell => spell.type === "counter");

  const handleSpellClick = (spellId: string) => {
    // Set highlight
    setHighlightSpellId(spellId);
    
    // Scroll to spell database
    if (spellDatabaseRef.current) {
      spellDatabaseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getCurrentPlayer = () => {
    const currentRound = session?.currentRound || 1;
    // Нечетные раунды (1,3,5,7,9): Игрок 1 атакует, Игрок 2 защищается
    // Четные раунды (2,4,6,8,10): Игрок 2 атакует, Игрок 1 защищается
    // В бонусных раундах всегда атакует Игрок 1
    const isOddRound = currentRound % 2 === 1;
    const isBonusRound = session?.isBonusRound || false;
    
    if (roundPhase === "attack") {
      return isBonusRound ? 1 : (isOddRound ? 1 : 2);
    } else {
      return isBonusRound ? 2 : (isOddRound ? 2 : 1);
    }
  };

  // Enhanced spell history: add pending spells for current round
  const getEnhancedSpellHistory = (playerId: number) => {
    const baseHistory = spellHistory.filter(h => h.playerId === playerId);
    const currentRound = session?.currentRound || 1;
    
    // Determine who attacks in current round
    // Нечетные раунды (1,3,5,7,9): Игрок 1 атакует, Игрок 2 защищается
    // Четные раунды (2,4,6,8,10): Игрок 2 атакует, Игрок 1 защищается
    // В бонусных раундах всегда атакует Игрок 1
    const isOddRound = currentRound % 2 === 1;
    const isBonusRound = session?.isBonusRound || false;
    const currentAttacker = isBonusRound ? 1 : (isOddRound ? 1 : 2);
    const currentDefender = isBonusRound ? 2 : (isOddRound ? 2 : 1);
    
    // Add pending attack for the attacker
    if (playerId === currentAttacker && session?.pendingAttackSpellId) {
      const pendingSpell = allSpells.find(s => s.id === session.pendingAttackSpellId);
      if (pendingSpell) {
        const rawAccuracy = session.pendingAttackAccuracy || 0;
        return [
          ...baseHistory,
          {
            roundNumber: currentRound,
            playerId: playerId,
            spell: pendingSpell,
            accuracy: rawAccuracy,
            successful: rawAccuracy >= 57,
            drawnGesture: (session.pendingAttackGesture as Point[]) || [],
            isBonusRound: session.isBonusRound || false
          }
        ];
      }
    }
    
    // Add pending counter for the defender
    if (playerId === currentDefender && session?.pendingCounterSpellId) {
      const pendingSpell = allSpells.find(s => s.id === session.pendingCounterSpellId);
      if (pendingSpell) {
        const rawAccuracy = session.pendingCounterAccuracy || 0;
        return [
          ...baseHistory,
          {
            roundNumber: currentRound,
            playerId: playerId,
            spell: pendingSpell,
            accuracy: rawAccuracy,
            successful: rawAccuracy >= 57,
            drawnGesture: (session.pendingCounterGesture as Point[]) || [],
            isBonusRound: session.isBonusRound || false
          }
        ];
      }
    }
    
    return baseHistory;
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Game completed - show results
  if (session?.gameStatus === "completed") {
    // Determine winner - if bonus round winner exists, use that, otherwise compare scores
    let winner = null;
    let winnerName = null;
    let winnerHouse = null;
    
    if (session.bonusRoundWinner) {
      // Bonus round winner
      winner = session.bonusRoundWinner;
      winnerName = winner === 1 ? player1Name : player2Name;
      winnerHouse = winner === 1 ? player1?.house : player2?.house;
    } else {
      // Regular winner based on scores
      const player1Score = Number(session.player1Score) || 0;
      const player2Score = Number(session.player2Score) || 0;
      winner = player1Score > player2Score ? 1 :
               player2Score > player1Score ? 2 :
               null;
      winnerName = winner === 1 ? player1Name : winner === 2 ? player2Name : null;
      winnerHouse = winner === 1 ? player1?.house : winner === 2 ? player2?.house : null;
    }
    
    // House colors matching player-card.tsx
    const houseColors = {
      gryffindor: "#EF4444", // red-500
      ravenclaw: "#3B82F6", // blue-500
      slytherin: "#10B981", // green-500
      hufflepuff: "#EAB308" // yellow-500
    };
    
    const winnerColor = winnerHouse && winnerHouse in houseColors 
      ? houseColors[winnerHouse as keyof typeof houseColors] 
      : undefined;

    const player1Color = player1?.house && player1.house in houseColors 
      ? houseColors[player1.house as keyof typeof houseColors] 
      : undefined;
      
    const player2Color = player2?.house && player2.house in houseColors 
      ? houseColors[player2.house as keyof typeof houseColors] 
      : undefined;

    return (
      <div className="relative z-10 min-h-screen p-4 md:p-8 flex items-center justify-center">
        <Card className="spell-card border-border/20 max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-6">
              <img src={duelIconPath} alt="Дуэльная арена" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-angst mb-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
              Дуэль завершена!
            </h1>
            
            {session?.bonusRoundWinner ? (
              <>
                <p className="text-2xl font-serif mb-8">
                  Победитель бонусного раунда: <span
                    className="font-bold"
                    style={winnerColor ? { color: winnerColor } : undefined}
                  >
                    {winnerName}
                  </span>
                </p>
                <p className="text-lg font-serif mb-8 text-muted-foreground">
                  После 10 раундов счет был равным, поэтому был сыгран бонусный раунд!
                </p>
              </>
            ) : winner ? (
              <>
                <p className="text-2xl font-serif mb-8">
                  Победитель: <span
                    className="font-bold"
                    style={winnerColor ? { color: winnerColor } : undefined}
                  >
                    {winnerName}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-2xl font-serif mb-8 text-muted-foreground">
                Ничья!
              </p>
            )}

            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {player1?.house && houseIcons[player1.house] && (
                    <img 
                      src={houseIcons[player1.house]} 
                      alt={player1.house} 
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <p 
                    className="text-sm font-medium"
                    style={player1Color ? { color: player1Color } : undefined}
                  >
                    {player1Name}
                  </p>
                </div>
                <p className="text-4xl font-bold text-primary">{session.player1Score ?? 0}</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {player2?.house && houseIcons[player2.house] && (
                    <img 
                      src={houseIcons[player2.house]} 
                      alt={player2.house} 
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <p 
                    className="text-sm font-medium"
                    style={player2Color ? { color: player2Color } : undefined}
                  >
                    {player2Name}
                  </p>
                </div>
                <p className="text-4xl font-bold text-accent">{session.player2Score ?? 0}</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-4">
              Всего раундов: {(session.currentRound ?? 1) - 1} из 10
            </p>

            {/* Round History */}
            <div className="mb-8 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-serif font-semibold mb-3 text-foreground">История раундов</h3>
              <div className="space-y-2">
                {(() => {
                  // Group spell history by round number and bonus round status
                  const roundsMap = new Map<string, { attack: any; defense: any }>();
                  
                  spellHistory.forEach(history => {
                    const key = `${history.roundNumber}-${history.isBonusRound ? 'bonus' : 'regular'}`;
                    if (!roundsMap.has(key)) {
                      roundsMap.set(key, { attack: null, defense: null });
                    }
                    
                    const round = roundsMap.get(key)!;
                    if (history.playerId === 1) {
                      round.attack = history;
                    } else {
                      round.defense = history;
                    }
                  });
                  
                  // Convert map to array and sort
                  const rounds = Array.from(roundsMap.entries()).map(([key, round]) => {
                    const [roundNum, type] = key.split('-');
                    return {
                      roundNumber: parseInt(roundNum),
                      isBonusRound: type === 'bonus',
                      attack: round.attack,
                      defense: round.defense
                    };
                  }).sort((a, b) => {
                    // Sort by round number first, then regular rounds before bonus rounds
                    if (a.roundNumber !== b.roundNumber) {
                      return a.roundNumber - b.roundNumber;
                    }
                    return a.isBonusRound ? 1 : -1;
                  });
                  
                  return rounds.map(({ roundNumber, isBonusRound, attack: attackHistory, defense: defenseHistory }) => {
                    if (!attackHistory) return null;
                    
                    const isOddRound = roundNumber % 2 === 1;
                    // In bonus rounds, Player 1 always attacks, Player 2 always defends
                    const attackerId = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                    const defenderId = isBonusRound ? 2 : (isOddRound ? 2 : 1);
                    
                    // Calculate points for attack and defense
                    // Determine point winner based on higher accuracy
                    const attackAccuracy = attackHistory.accuracy || 0;
                    const defenseAccuracy = defenseHistory?.accuracy || 0;
                    
                    // For attack points: 1 point if attacker had higher accuracy
                    const attackPoints = attackHistory.successful ? calculatePoints(attackHistory.spell || undefined, attackHistory.accuracy, attackAccuracy > defenseAccuracy) : 0;
                    
                    // For defense points: 1 point if defender had higher accuracy
                    const defensePoints = defenseHistory?.successful ? calculatePoints(defenseHistory.spell || undefined, defenseHistory.accuracy, defenseAccuracy > attackAccuracy) : 0;
                    
                    return (
                      <div key={`${roundNumber}-${isBonusRound ? 'bonus' : 'regular'}`} className="bg-background/50 rounded-lg p-2 border border-border/30 text-left">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold text-muted-foreground w-16">
                            {isBonusRound ? (
                              <span className="text-yellow-500">БОНУСНЫЙ РАУНД</span>
                            ) : (
                              `Раунд ${roundNumber}`
                            )}
                          </div>
                          
                          {/* Attack */}
                          <div className="flex items-center gap-2 flex-1">
                            <GesturePreview gesture={attackHistory.drawnGesture || []} className="w-10 h-10 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{
                                color: attackerId === 1 ? player1Color : player2Color
                              }}>
                                {attackHistory.spell?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {attackerId === 1 ? player1Name : player2Name} - {attackHistory.accuracy}%
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-10 h-10 rounded border border-border/50 flex items-center justify-center bg-background/30">
                              <span className="text-xs font-bold" style={{
                                color: attackerId === 1 ? player1Color : player2Color
                              }}>
                                {attackPoints > 0 ? attackPoints : "—"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Defense */}
                          {defenseHistory && (
                            <div className="flex items-center gap-2 flex-1">
                              <GesturePreview gesture={defenseHistory.drawnGesture || []} className="w-10 h-10 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-xs font-semibold truncate",
                                  !defenseHistory.successful && "text-destructive"
                                )} style={defenseHistory.successful ? {
                                  color: defenderId === 1 ? player1Color : player2Color
                                } : undefined}>
                                  {defenseHistory.spell?.name || "Unknown"}
                                  {!defenseHistory.successful && " ❌"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {defenderId === 1 ? player1Name : player2Name} - {defenseHistory.accuracy}%
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-10 h-10 rounded border border-border/50 flex items-center justify-center bg-background/30">
                                <span className="text-xs font-bold" style={{
                                  color: defenderId === 1 ? player1Color : player2Color
                                }}>
                                  {defensePoints > 0 ? defensePoints : "—"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

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
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-angst mb-4 tracking-wider bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
          МАГИЧЕСКАЯ ДУЭЛЬ
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-serif">
          Каждый взмах палочки решает исход
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
                {session?.isBonusRound ? (
                  <span className="text-yellow-500 font-bold">БОНУСНЫЙ РАУНД</span>
                ) : (
                  <>
                    Раунд <span className="text-foreground font-bold">{session?.currentRound || 1}</span>
                  </>
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-6 flex-grow justify-center">
              <div className="text-center">
                <p
                  className="text-xs mb-1 font-medium"
                  style={{ color: player1?.house && houseColors[player1.house as keyof typeof houseColors] || undefined }}
                >
                  {player1Name}
                </p>
                <p className="text-2xl font-bold text-primary">{session?.player1Score || 0}</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <p
                  className="text-xs mb-1 font-medium"
                  style={{ color: player2?.house && houseColors[player2.house as keyof typeof houseColors] || undefined }}
                >
                  {player2Name}
                </p>
                <p className="text-2xl font-bold text-accent">{session?.player2Score || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
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
                  {(() => {
                    if (userRole !== "player") return "Наблюдатель";
                    const currentRound = session?.currentRound || 1;
                    const isOddRound = currentRound % 2 === 1;
                    const isBonusRound = session?.isBonusRound || false;
                    const attacker = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                    return actualPlayerNumber === attacker ? "Атакующий" : "Защищающийся";
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6 mb-8">
        {/* Player 1 Info */}
        <PlayerCard
          player={1}
          playerName={player1Name}
          playerHouse={player1?.house}
          houseIcon={player1?.house ? houseIcons[player1.house] : undefined}
          isActive={getCurrentPlayer() === 1}
          lastSpell={attackResult?.spell?.name || "-"}
          lastSpellId={attackResult?.spell?.id}
          lastAccuracy={attackResult ? `${attackResult.accuracy}% accuracy` : "Waiting..."}
          accuracy={attackResult?.accuracy || 0}
          spellHistory={getEnhancedSpellHistory(1)}
          onSpellClick={handleSpellClick}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          showColorPalette={userRole === "player" && actualPlayerNumber === 1 && getCurrentPlayer() === 1}
          currentRound={session?.currentRound || 1}
          isBonusRound={session?.isBonusRound || false}
          timeLeft={player1TimeLeft}
          isTimerActive={player1TimerActive && getCurrentPlayer() === 1}
          data-testid="player-card-1"
        />

        {/* Drawing Canvas */}
        <div className="flex flex-col" ref={canvasContainerRef}>
          <Card className="spell-card border-border/20 flex-1 flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif font-bold text-foreground">Примени свое заклинание</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-muted/20 hover:bg-muted/40"
                  disabled={userRole === "spectator"}
                  onClick={() => canvasRef.current?.clearCanvas()}
                  data-testid="button-clear-canvas"
                >
                  Стереть
                </Button>
              </div>
              
              {/* Show waiting message for Player 1 when Player 2 hasn't joined yet */}
              {userRole === "player" && actualPlayerNumber === 1 && players.length < 2 && (
                <div className="text-center text-sm text-yellow-600 dark:text-yellow-400 mb-4 font-medium">
                  Ожидание подключения второго игрока...
                </div>
              )}
              
              <div className="flex-1 flex items-center justify-center">
                <GestureCanvas
                  ref={canvasRef}
                  onGestureComplete={handleGestureComplete}
                  isDisabled={recognizeGestureMutation.isPending || userRole === "spectator" || (actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer()) || (userRole === "player" && actualPlayerNumber === 1 && players.length < 2)}
                  className="canvas-container"
                  drawColor={getDrawColor()}
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
                  {(() => {
                    const currentPlayer = getCurrentPlayer();
                    const currentRound = session?.currentRound || 1;
                    const isOddRound = currentRound % 2 === 1;
                    const isBonusRound = session?.isBonusRound || false;
                    const attacker = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                    const currentPlayerRole = currentPlayer === attacker ? "Атакующий" : "Защищающийся";
                    return `Сейчас ходит ${currentPlayerRole}`;
                  })()}
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
                  {recognizeGestureMutation.isPending ? "Recognizing..." : "Опознать заклинание"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Player 2 Info */}
        <PlayerCard
          player={2}
          playerName={player2Name}
          playerHouse={player2?.house}
          houseIcon={player2?.house ? houseIcons[player2.house] : undefined}
          isActive={getCurrentPlayer() === 2}
          lastSpell={counterResult?.spell?.name || "-"}
          lastSpellId={counterResult?.spell?.id}
          lastAccuracy={counterResult ?
            `${counterResult.accuracy}% accuracy${counterResult.isValidCounter ? " - Valid counter!" : ""}` :
            "Waiting..."}
          accuracy={counterResult?.accuracy || 0}
          spellHistory={getEnhancedSpellHistory(2)}
          onSpellClick={handleSpellClick}
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          showColorPalette={userRole === "player" && actualPlayerNumber === 2 && getCurrentPlayer() === 2}
          currentRound={session?.currentRound || 1}
          isBonusRound={session?.isBonusRound || false}
          timeLeft={player2TimeLeft}
          isTimerActive={player2TimerActive && getCurrentPlayer() === 2}
          data-testid="player-card-2"
        />
      </div>

      {/* Spell Database */}
      <SpellDatabase 
        ref={spellDatabaseRef}
        attackSpells={attackSpells} 
        counterSpells={counterSpells}
        highlightSpellId={highlightSpellId}
        onHighlightComplete={() => setHighlightSpellId(null)}
        data-testid="spell-database"
      />

      {/* Game Instructions */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="spell-card border-border/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
              <Info className="w-6 h-6 text-secondary" />
              Как сражаться
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Игрок 1 атакует</h4>
                <p className="text-sm text-muted-foreground">
                  Нарисуй движение палочкой для атакующего заклинания.
                </p>
              </div>
              
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-3">
                  <span className="text-accent font-bold">2</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Игрок 2 защищается</h4>
                <p className="text-sm text-muted-foreground">
                  Нарисуй движение палочкой для верного контр-заклинания.
                </p>
              </div>
              
              <div className="bg-background/30 rounded-lg p-4 border border-border/20">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-3">
                  <span className="text-secondary font-bold">3</span>
                </div>
                <h4 className="font-serif font-semibold text-foreground mb-2">Зарабатывай очки</h4>
                <p className="text-sm text-muted-foreground">
                  Кто лучше справился с заклинанием получает 1 очко. У кого в конце 10 раундов больше очков — тот и победил!
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
      <Dialog open={showRoundComplete} onOpenChange={(open) => {
        if (!open) {
          // Mark this round as dismissed when dialog is closed
          const completedRound = session?.lastCompletedRoundNumber || 1;
          const roundKey = `${completedRound}`;
          dismissedDialogForRound.current = roundKey;
        }
        setShowRoundComplete(open);
      }}>
        <DialogContent className="sm:max-w-xs" data-testid="dialog-round-complete">
          <DialogHeader>
            <DialogTitle className="font-decorative text-lg decorative-text">
              {session?.isBonusRound ? "БОНУСНЫЙ РАУНД ЗАВЕРШЕН" : "Раунд завершен"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {session?.isBonusRound ? "Результаты бонусного раунда" : "Результаты раунда"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="bg-primary/10 rounded-lg p-2 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Атакующий</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-foreground text-sm">
                    {session?.lastCompletedAttackSpellId ?
                      allSpells.find(s => s.id === session.lastCompletedAttackSpellId)?.name :
                      "Неизвестно"}
                  </p>
                  <p className="text-xs text-primary">
                    Точность: {session?.lastCompletedAttackAccuracy || 0}%
                  </p>
                </div>
                {(() => {
                  const attackGesture = session?.lastCompletedAttackGesture as Point[] | undefined;
                  
                  return attackGesture && attackGesture.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <GesturePreview gesture={attackGesture} className="flex-shrink-0 w-12 h-12" />
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            
            <div className={`rounded-lg p-2 border ${
              session?.lastCompletedCounterSuccess
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <p className="text-xs text-muted-foreground mb-1">Защищающийся</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-foreground text-sm">
                    {session?.lastCompletedCounterSpellId ?
                      allSpells.find(s => s.id === session.lastCompletedCounterSpellId)?.name :
                      "Не выполнено"}
                  </p>
                  <p className={`text-xs ${session?.lastCompletedCounterSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    Точность: {session?.lastCompletedCounterAccuracy || 0}%
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${session?.lastCompletedCounterSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {session?.lastCompletedCounterSuccess ? '✓ Правильная защита' : '✗ Неудачная попытка защиты'}
                  </p>
                </div>
                {(() => {
                  const counterGesture = session?.lastCompletedCounterGesture as Point[] | undefined;
                  
                  return counterGesture && counterGesture.length > 0 ? (
                    <div className="flex items-center justify-center">
                      <GesturePreview gesture={counterGesture} className="flex-shrink-0 w-12 h-12" />
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              // Mark this round as dismissed for this player using round number
              const completedRound = session?.lastCompletedRoundNumber || 1;
              const roundKey = `${completedRound}`;
              dismissedDialogForRound.current = roundKey;
              
              // Just close the dialog - data will be cleared when next attack starts
              setShowRoundComplete(false);
            }}
            className="w-full glow-primary text-sm py-2"
            data-testid="button-continue-next-round"
          >
            Следующий раунд
          </Button>
        </DialogContent>
      </Dialog>

      {/* Scroll to Canvas Button */}
      {showScrollToCanvas && (
        <Button
          onClick={scrollToCanvas}
          className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 shadow-lg glow-primary z-50"
          variant="default"
          size="icon"
          data-testid="button-scroll-to-canvas"
        >
          <Wand2 className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

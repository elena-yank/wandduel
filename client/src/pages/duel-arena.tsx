import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { queryClient, apiRequest, apiUrl } from "@/lib/queryClient";
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
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";
import GesturePreview from "@/components/gesture-preview";
import SpellChoiceDialog from "@/components/spell-choice-dialog";
import RoundCompleteDialog from "@/components/round-complete-dialog";
import duelIconPath from "@assets/image_1760081444104.png";
import gryffindorIcon from "@assets/icons8-hogwarts-legacy-gryffindor-480_1760083007155.png";
import ravenclawIcon from "@assets/icons8-hogwarts-legacy-ravenclaw-480_1760083011315.png";
import slytherinIcon from "@assets/icons8-hogwarts-legacy-slytherin-480_1760083015546.png";
import hufflepuffIcon from "@assets/icons8-hogwarts-legacy-hufflepuff-480_1760083019603.png";
import { useToast } from "@/hooks/use-toast";
import { useIsPhone } from "@/hooks/use-phone";
import { GAME_VERSION } from "@shared/config";

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
// GesturePreview moved to '@/components/gesture-preview'

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
  const [canvasCleared, setCanvasCleared] = useState(false);
  // Snapshot of last completed round data to keep dialog content stable while open
  const [lastCompletedSnapshot, setLastCompletedSnapshot] = useState<{
    lastCompletedRoundNumber?: number | null;
    lastCompletedAttackSpellId?: string | null;
    lastCompletedAttackAccuracy?: number | null;
    lastCompletedAttackGesture?: Point[] | null;
    lastCompletedCounterSpellId?: string | null;
    lastCompletedCounterAccuracy?: number | null;
    lastCompletedCounterGesture?: Point[] | null;
    lastCompletedCounterSuccess?: boolean | null;
    isBonusRound?: boolean | null;
  } | null>(null);
  const [showScrollToCanvas, setShowScrollToCanvas] = useState(false);
  const [highlightSpellId, setHighlightSpellId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  // Timer states - now synchronized with server
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const canvasRef = useRef<GestureCanvasRef>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const spellDatabaseRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const roundCompleteShownForRound = useRef<string | null>(null);
  const dismissedDialogForRound = useRef<string | null>(null); // Track when user dismisses dialog
  const previousRoundRef = useRef<number | null>(null); // Track previous round number
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const isPhone = useIsPhone();
  const [isCooldown, setIsCooldown] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPhaseRef = useRef<"attack" | "counter" | "complete" | null>(null);

  const roomId = params?.roomId;

  // Initialize WebSocket connection only when we have sessionId and userId
  const { isConnected: wsConnected, connectionError: wsError } = useWebSocket({
    sessionId: currentSessionId || undefined,
    userId: userId || undefined,
    onMessage: (message) => {
      console.log('WebSocket message in DuelArena:', message);
      
      // Handle real-time updates
      if (message.type === 'session_update') {
        // Убраны всплывающие оповещения: не показываем тосты на событиях
        // При необходимости можно добавить ненавязчивое логирование
        // console.log('Session update:', message.updateType)
      }
    },
    onConnect: () => {
      console.log('WebSocket connected in DuelArena');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected in DuelArena');
    }
  });

  // Server time synchronization functions
  const syncServerTime = async () => {
    try {
      const res = await fetch(apiUrl('/api/server-time'));
      const data = await res.json();
      setServerTime(data.timestamp);
    } catch (error) {
      console.error('Failed to sync server time:', error);
    }
  };

  const calculateTimeRemaining = (session: GameSession | undefined, currentServerTime?: number) => {
    if (!session?.roundStartTime || !session?.timeLimit) return null;
    
    const roundStartTime = new Date(session.roundStartTime).getTime();
    const timeLimit = session.timeLimit * 1000; // Convert to milliseconds
    const currentTime = currentServerTime || serverTime;
    const elapsed = currentTime - roundStartTime;
    const remaining = Math.max(0, timeLimit - elapsed);
    
    return Math.ceil(remaining / 1000); // Convert back to seconds
  };

  const checkTimeout = async () => {
    if (!currentSessionId) return;
    
    try {
      const res = await fetch(apiUrl(`/api/sessions/${currentSessionId}/check-timeout`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.timeout) {
        // Server handled the timeout, refresh session data
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", currentSessionId] });
      }
    } catch (error) {
      console.error('Failed to check timeout:', error);
    }
  };

  // Fetch spells
  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["/api/spells"],
    staleTime: Infinity, // Заклинания никогда не меняются
    gcTime: Infinity, // Держать в кэше навсегда
  });

  // Fetch current session
  const { data: session, isLoading: sessionLoading } = useQuery<GameSession>({
    queryKey: ["/api/sessions", currentSessionId],
    enabled: !!currentSessionId,
    refetchInterval: wsConnected ? false : (query) => {
    // Если WebSocket подключен, отключаем polling
    // Иначе используем адаптивные интервалы как fallback
    if (query?.state?.data?.gameStatus === "active" && (query?.state?.data?.currentPhase === "attack" || query?.state?.data?.currentPhase === "counter")) {
    return 3000; // 3 секунды во время активной фазы
    }
    return 8000; // 8 секунд в остальное время
    },
  });

  // Debug WebSocket connection status
  console.log('WebSocket status - sessionId:', currentSessionId, 'userId:', userId, 'wsConnected:', wsConnected, 'wsError:', wsError);

  // Fetch session participants
  const { data: participants = [] } = useQuery<SessionParticipant[]>({
    queryKey: ["/api/sessions", currentSessionId, "participants"],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const res = await fetch(apiUrl(`/api/sessions/${currentSessionId}/participants`));
      return res.json();
    },
    enabled: !!currentSessionId,
    refetchInterval: wsConnected ? false : 10000, // Отключаем polling если WebSocket активен
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
    timeSpentSeconds?: number;
  }>>({
    queryKey: ["/api/sessions", currentSessionId, "spell-history"],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const res = await fetch(apiUrl(`/api/sessions/${currentSessionId}/spell-history`));
      return res.json();
    },
    enabled: !!currentSessionId,
    refetchInterval: wsConnected ? false : (data) => {
      // История заклинаний обновляется только после завершения раундов
      if (session?.gameStatus === "completed") {
        return false; // Не обновлять после завершения игры
      }
      return 5000; // 5 секунд во время игры
    },
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

      // Handle wrong defense used - show toast, but suppress for very low accuracy (<50%)
      if (result.wrongDefenseUsed && (result.accuracy ?? 0) >= 50) {
        // Show correct gesture for 1 second before clearing
        if (result.spell && canvasRef.current) {
          canvasRef.current.showCorrectGesture(result.spell.gesturePattern as Point[]);
        }
        
        toast({
          title: "Неверное заклинание",
          description: "Использована неверная защита против текущей атаки",
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
        
        // Clear canvas after showing correct gesture (handled by showCorrectGesture)
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
        
        // Show reference pattern for 1.5 seconds before clearing canvas (only for the player who drew the spell)
        if (result.spell && canvasRef.current && actualPlayerNumber === getCurrentPlayer()) {
          canvasRef.current.showReferencePattern(result.spell.gesturePattern as Point[], () => {
            setCanvasCleared(true);
          });
        } else {
          // Clear canvas immediately for other players or if conditions not met
          canvasRef.current?.clearCanvas();
        }
      } else {
        // Failure handling: show "not recognized" only when it was NOT recognized
        const msg = result.message || "";
        const isDuplicateAttack = msg.includes("уже было использовано");

        if (isDuplicateAttack) {
          // Explicit duplicate-attack case keeps its own message
          toast({
            title: "Атака уже использована",
            description: msg || undefined,
          });
        } else if (!result.recognized) {
          // Spell was not recognized by the system
          toast({
            title: "Заклинание не опознано",
            description: msg || "Попробуйте другое заклинание или перерисуйте жест",
          });
        }

        // Clear canvas after failed recognition
        canvasRef.current?.clearCanvas();
      }
    },
    onError: () => {
      // Убраны всплывающие оповещения: не показываем тост ошибки
      console.warn("Failed to recognize gesture");
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
      // Убраны всплывающие оповещения: не показываем тост ошибки
      console.warn("Failed to complete round");
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

<<<<<<< HEAD
=======
  // Cooldown after defense: disable drawing for 1.5s right after phase switches from counter -> attack
  useEffect(() => {
    const prev = lastPhaseRef.current;
    const curr = roundPhase;
    if (prev === "counter" && curr === "attack") {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      setIsCooldown(true);
      cooldownTimerRef.current = setTimeout(() => {
        setIsCooldown(false);
        cooldownTimerRef.current = null;
      }, 1500);
    }
    lastPhaseRef.current = curr;
  }, [roundPhase]);

>>>>>>> local-changes
  // Timer effect - handles countdown logic
  // Timer synchronization effect
  useEffect(() => {
    // Sync server time initially and periodically
    syncServerTime();
    
    // Адаптивная синхронизация времени с учетом WebSocket
    const getSyncInterval = () => {
      // Если WebSocket подключен, синхронизируем реже
      if (wsConnected) {
        return 60000; // 1 минута при активном WebSocket
      }
      
      // Fallback интервалы без WebSocket
      if (session?.gameStatus === "active" && (session?.currentPhase === "attack" || session?.currentPhase === "counter")) {
        return 15000; // 15 секунд во время активной фазы
      }
      return 30000; // 30 секунд в остальное время
    };
    
    const syncInterval = setInterval(syncServerTime, getSyncInterval());
    
    return () => clearInterval(syncInterval);
  }, [session?.gameStatus, session?.currentPhase]);

  // Timer management effect
  useEffect(() => {
    // Clear existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Calculate current time remaining
    const remaining = calculateTimeRemaining(session);
    setTimeRemaining(remaining);

    // Determine if timer should be active
    const shouldBeActive = (roundPhase === "attack" || roundPhase === "counter") && 
                          players.length >= 2 && 
                          remaining !== null && 
                          remaining > 0 &&
                          session?.gameStatus !== "completed";
    
    setIsTimerActive(shouldBeActive);

    if (shouldBeActive) {
      // Start timer interval
      timerIntervalRef.current = setInterval(() => {
        // Update server time
        const newServerTime = Date.now();
        setServerTime(newServerTime);
        
        // Check for timeout
        checkTimeout();
        
        // Recalculate remaining time with current server time
        const newRemaining = calculateTimeRemaining(session, newServerTime);
        setTimeRemaining(newRemaining);
        
        if (newRemaining !== null && newRemaining <= 0) {
          setIsTimerActive(false);
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [roundPhase, session?.currentRound, session?.roundStartTime, session?.timeLimit, session?.gameStatus, players.length]);
  
  // Reset dialog tracking when round number changes
  useEffect(() => {
    // Reset both round trackers when a new round starts
    roundCompleteShownForRound.current = null;
    dismissedDialogForRound.current = null;
    // Reset canvas cleared state when a new round starts
    setCanvasCleared(false);
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
        const res = await fetch(apiUrl(`/api/rooms/${roomId}/session`));
        if (!res.ok) {
          throw new Error("Session not found");
        }
        const sessionData = await res.json();
        setCurrentSessionId(sessionData.id);
      } catch (error) {
        // Убраны всплывающие оповещения: не показываем тост ошибки
        console.warn("Не удалось загрузить сессию");
        setLocation("/");
      }
    };

    fetchSession();
  }, [roomId, setLocation]);

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
      // Убраны всплывающие оповещания: просто игнорируем попытку рисовать
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
        
        // Убраны всплывающие оповещения: не показываем тост, просто выходим
        return;
      }
    }

    setLastGesture(gesture);
    if (gesture.length < 1) {
      // Убраны всплывающие оповещения: не показываем тост
      return;
    }

    if (actualPlayerNumber) {
      recognizeGestureMutation.mutate({ gesture, playerId: actualPlayerNumber, colorFilter: selectedColor });
    }
  };

  // Show round complete dialog when a round is completed and canvas has been cleared
  useEffect(() => {
    // Show dialog if we have lastCompletedRoundNumber, canvas has been cleared, and haven't shown/dismissed this round yet
    if (session?.lastCompletedRoundNumber && canvasCleared && !showRoundComplete) {
      const roundKey = `${session.lastCompletedRoundNumber}`;
      
      // Only show if we haven't shown for this round AND user hasn't dismissed it
      if (roundCompleteShownForRound.current !== roundKey && dismissedDialogForRound.current !== roundKey) {
        // Take a snapshot of the last completed data so the dialog doesn't change
        setLastCompletedSnapshot({
          lastCompletedRoundNumber: session.lastCompletedRoundNumber,
          lastCompletedAttackSpellId: session.lastCompletedAttackSpellId,
          lastCompletedAttackAccuracy: session.lastCompletedAttackAccuracy,
          lastCompletedAttackGesture: session.lastCompletedAttackGesture as Point[] | null,
          lastCompletedCounterSpellId: session.lastCompletedCounterSpellId,
          lastCompletedCounterAccuracy: session.lastCompletedCounterAccuracy,
          lastCompletedCounterGesture: session.lastCompletedCounterGesture as Point[] | null,
          lastCompletedCounterSuccess: session.lastCompletedCounterSuccess,
          isBonusRound: session.isBonusRound ?? null,
        });
        setShowRoundComplete(true);
        roundCompleteShownForRound.current = roundKey;
        // Reset canvasCleared state
        setCanvasCleared(false);
      }
    }
  }, [session?.lastCompletedRoundNumber, canvasCleared, showRoundComplete]);

  const handleLeave = async () => {
    try {
      const participantId = roomId ? localStorage.getItem(`participantId:${roomId}`) : null;
      const sessionIdToUse = currentSessionId;
      if (participantId && sessionIdToUse) {
        await apiRequest("DELETE", `/api/sessions/${sessionIdToUse}/participants/${participantId}`);
        // Ensure participants list refreshes quickly
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionIdToUse, "participants"] });
      }
    } catch (err) {
      console.error("Failed to leave session:", err);
    } finally {
      if (roomId) {
        // Clear room-scoped localStorage keys
        localStorage.removeItem(`userRole:${roomId}`);
        localStorage.removeItem(`currentSessionId:${roomId}`);
        localStorage.removeItem(`participantId:${roomId}`);
        localStorage.removeItem(`playerNumber:${roomId}`);
      }
      setLocation("/");
    }
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
    
    // Scroll to spell database instantly to avoid long animation
    if (spellDatabaseRef.current) {
      spellDatabaseRef.current.scrollIntoView({ behavior: "auto", block: "start" });
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
<<<<<<< HEAD
    if (playerId === currentAttacker && session?.pendingAttackSpellId) {
=======
    // Guard against race conditions: only include pending attack
    // when it belongs to the computed attacker and phase is counter
    if (
      playerId === currentAttacker &&
      session?.pendingAttackSpellId &&
      session?.pendingAttackPlayerId === currentAttacker &&
      session?.currentPhase === "counter"
    ) {
>>>>>>> local-changes
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
            isBonusRound: session.isBonusRound || false,
            timeSpentSeconds: session.pendingAttackTimeSpent || undefined
          }
        ];
      }
    }
    
    // Add pending counter for the defender
<<<<<<< HEAD
    if (playerId === currentDefender && session?.pendingCounterSpellId) {
=======
    // Guard against race conditions similarly
    if (
      playerId === currentDefender &&
      session?.pendingCounterSpellId &&
      session?.pendingCounterPlayerId === currentDefender &&
      session?.currentPhase === "counter"
    ) {
>>>>>>> local-changes
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
            isBonusRound: session.isBonusRound || false,
            timeSpentSeconds: session.pendingCounterTimeSpent || undefined
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

    const handleSaveResults = async () => {
      if (!exportRef.current) {
        toast({ title: "Не удалось подготовить экспорт", description: "Попробуйте ещё раз." });
        return;
      }
      try {
        setExporting(true);
        const node = exportRef.current;

        // Сохраняем старые стили и делаем оригинальный контейнер видимым для корректного захвата
        const prevStyle = {
          position: node.style.position,
          left: node.style.left,
          top: node.style.top,
          opacity: node.style.opacity,
          visibility: node.style.visibility,
          zIndex: node.style.zIndex,
        };
        Object.assign(node.style, {
          position: 'fixed',
          left: '0px',
          top: '0px',
          opacity: '1',
          visibility: 'visible',
          zIndex: '99999',
          pointerEvents: 'none'
        });

        // Убедиться, что изображения декодированы
        const imgs = Array.from(node.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));

        // Дождаться рефлоу
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const naturalWidth = node.scrollWidth || Math.round(node.getBoundingClientRect().width) || 1920;
        const naturalHeight = node.scrollHeight || Math.round(node.getBoundingClientRect().height) || 1080;

        const maxHeight = 1080;
        const scale = Math.min(1, maxHeight / Math.max(1, naturalHeight));
        const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          width: targetWidth,
          height: targetHeight,
        });

        // Возвращаем старые стили
        Object.assign(node.style, prevStyle);

        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        link.download = `duel-results-${date}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "Изображение сохранено", description: "Результаты дуэли экспортированы." });
      } catch (err) {
        console.error('Export error:', err);
        toast({ title: "Ошибка экспорта", description: "Не удалось сохранить изображение.", variant: 'destructive' });
      } finally {
        setExporting(false);
      }
    };

    return (
      <div className="relative z-10 min-h-screen p-4 md:p-8 flex items-center justify-center">
        <span className="absolute top-0 left-0 text-xs md:text-sm text-muted-foreground">Версия {`v${GAME_VERSION}`}</span>
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
                  // Store per-player histories; attacker/defender depends on round parity
                  const roundsMap = new Map<string, { player1: any; player2: any }>();

                  spellHistory.forEach(history => {
                    const key = `${history.roundNumber}-${history.isBonusRound ? 'bonus' : 'regular'}`;
                    if (!roundsMap.has(key)) {
                      roundsMap.set(key, { player1: null, player2: null });
                    }

                    const round = roundsMap.get(key)!;
                    if (history.playerId === 1) {
                      round.player1 = history;
                    } else if (history.playerId === 2) {
                      round.player2 = history;
                    }
                  });

                  // Convert map to array and sort
                  const rounds = Array.from(roundsMap.entries()).map(([key, round]) => {
                    const [roundNum, type] = key.split('-');
                    return {
                      roundNumber: parseInt(roundNum),
                      isBonusRound: type === 'bonus',
                      player1: round.player1,
                      player2: round.player2
                    };
                  }).sort((a, b) => {
                    // Sort by round number first, then regular rounds before bonus rounds
                    if (a.roundNumber !== b.roundNumber) {
                      return a.roundNumber - b.roundNumber;
                    }
                    return a.isBonusRound ? 1 : -1;
                  });

                  return rounds.map(({ roundNumber, isBonusRound, player1, player2 }) => {
                    // Without attacker history, skip round
                    if (!player1 && !player2) return null;

                    const isOddRound = roundNumber % 2 === 1;
                    // In bonus rounds, Player 1 always attacks, Player 2 always defends
                    const attackerId = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                    const defenderId = isBonusRound ? 2 : (isOddRound ? 2 : 1);

                    const attackHistory = attackerId === 1 ? player1 : player2;
                    const defenseHistory = defenderId === 1 ? player1 : player2;
                    if (!attackHistory) return null;

                    // Determine accuracies
                    const attackAccuracy = attackHistory?.accuracy || 0;
                    const defenseAccuracy = defenseHistory?.accuracy || 0;

                    // Points calculation
                    const attackPoints = attackHistory?.successful ? calculatePoints(attackHistory.spell || undefined, attackHistory.accuracy, attackAccuracy > defenseAccuracy) : 0;
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
                            <GesturePreview gesture={attackHistory?.drawnGesture || []} className="w-10 h-10 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{
                                color: attackerId === 1 ? player1Color : player2Color
                              }}>
                                {attackHistory?.spell?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {attackerId === 1 ? player1Name : player2Name} - {attackHistory?.accuracy}%
                              </p>
                            </div>
                            <div className="flex-shrink-0 w-12 grid grid-rows-2 gap-1">
                              <div className="h-5 rounded border border-border/50 flex items-center justify-center bg-transparent">
                                <span className="text-xs font-bold" style={{
                                  color: attackerId === 1 ? player1Color : player2Color
                                }}>
                                  {attackPoints > 0 ? attackPoints : "—"}
                                </span>
                              </div>
                              <div className="h-5 rounded border border-border/50 flex items-center justify-center bg-transparent">
                                <span className="text-[11px] text-muted-foreground">
                                  {typeof attackHistory?.timeSpentSeconds === 'number' ? `${attackHistory.timeSpentSeconds} сек.` : "— сек."}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Defense */}
                          {defenseHistory && (
                            <div className="flex items-center gap-2 flex-1">
                              <GesturePreview gesture={defenseHistory?.drawnGesture || []} className="w-10 h-10 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                {(() => {
                                  // Consider low accuracy if below the success threshold (57%)
                                  const lowAcc = (defenseHistory?.accuracy ?? 0) < 57;
                                  return (
                                    <p
                                      className={cn(
                                        "text-xs font-semibold truncate",
                                        (!defenseHistory?.successful && !lowAcc) && "text-destructive"
                                      )}
                                      style={(defenseHistory?.successful || lowAcc) ? {
                                        color: defenderId === 1 ? player1Color : player2Color
                                      } : undefined}
                                    >
                                      {defenseHistory?.spell?.name || "Unknown"}
                                      {(!defenseHistory?.successful && !lowAcc) && " ❌"}
                                    </p>
                                  );
                                })()}
                                <p className="text-xs text-muted-foreground">
                                  {defenderId === 1 ? player1Name : player2Name} - {defenseHistory?.accuracy != null ? defenseHistory.accuracy : "—"}%
                                </p>
                              </div>
                              <div className="flex-shrink-0 w-12 grid grid-rows-2 gap-1">
                                <div className="h-5 rounded border border-border/50 flex items-center justify-center bg-transparent">
                                  <span className="text-xs font-bold" style={{
                                    color: defenderId === 1 ? player1Color : player2Color
                                  }}>
                                    {defensePoints > 0 ? defensePoints : "—"}
                                  </span>
                                </div>
                                <div className="h-5 rounded border border-border/50 flex items-center justify-center bg-transparent">
                                  <span className="text-[11px] text-muted-foreground">
                                    {typeof defenseHistory?.timeSpentSeconds === 'number' ? `${defenseHistory.timeSpentSeconds} сек.` : "— сек."}
                                  </span>
                                </div>
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

            {/* Save Results Button */}
            <div className="flex flex-col items-center gap-3 mb-2">
              <Button
                onClick={handleSaveResults}
                className="glow-primary"
                size="lg"
                disabled={exporting}
                data-testid="button-save-results"
              >
                {exporting ? "Сохранение..." : "Сохранить результаты"}
              </Button>
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

        {/* Hidden export container: full results without scroll, compact grid */}
        <div
          ref={exportRef}
          // Размещаем контейнер вне экрана, он видим, но не мешает взаимодействию
          style={{ position: "fixed", left: -10000, top: 0, width: 1920, background: "hsl(259, 74%, 12%)", padding: 24, pointerEvents: "none", opacity: 0.01, visibility: "visible", zIndex: -1 }}
        >
          <div>
            {/* Header */}
            <div className="flex items-center gap-16 mb-24">
              <div className="flex items-center gap-12">
                <img src={duelIconPath} alt="Дуэль" style={{ width: 80, height: 80, objectFit: "contain" }} />
                <div>
                  <div style={{ fontSize: 42, fontFamily: "serif", fontWeight: 700 }}>Итоги дуэли</div>
                  <div style={{ fontSize: 22, color: "#9CA3AF" }}>Всего раундов: {(session.currentRound ?? 1) - 1}</div>
                </div>
              </div>
              <div className="flex items-center gap-12" style={{ marginLeft: "auto" }}>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    {player1?.house && houseIcons[player1.house] && (
                      <img src={houseIcons[player1.house]} alt={player1?.house || ""} style={{ width: 40, height: 40, objectFit: "contain" }} />
                    )}
                    <div style={{ fontSize: 18, fontWeight: 600, color: player1Color || undefined }}>{player1Name}</div>
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#22C55E" }}>{session.player1Score ?? 0}</div>
                </div>
                <div style={{ width: 2, height: 80, background: "#E5E7EB" }} />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    {player2?.house && houseIcons[player2.house] && (
                      <img src={houseIcons[player2.house]} alt={player2?.house || ""} style={{ width: 40, height: 40, objectFit: "contain" }} />
                    )}
                    <div style={{ fontSize: 18, fontWeight: 600, color: player2Color || undefined }}>{player2Name}</div>
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#F59E0B" }}>{session.player2Score ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Compact grid of rounds */}
            <div className="grid gap-16" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
              {(() => {
                const roundsMap = new Map<string, { player1: any; player2: any }>();

                spellHistory.forEach(history => {
                  const key = `${history.roundNumber}-${history.isBonusRound ? 'bonus' : 'regular'}`;
                  if (!roundsMap.has(key)) {
                    roundsMap.set(key, { player1: null, player2: null });
                  }

                  const round = roundsMap.get(key)!;
                  if (history.playerId === 1) {
                    round.player1 = history;
                  } else if (history.playerId === 2) {
                    round.player2 = history;
                  }
                });

                const rounds = Array.from(roundsMap.entries()).map(([key, round]) => {
                  const [roundNum, type] = key.split('-');
                  return {
                    roundNumber: parseInt(roundNum),
                    isBonusRound: type === 'bonus',
                    player1: round.player1,
                    player2: round.player2
                  };
                }).sort((a, b) => {
                  if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
                  return a.isBonusRound ? 1 : -1;
                });

                return rounds.map(({ roundNumber, isBonusRound, player1, player2 }) => {
                  if (!player1 && !player2) return null;
                  const isOddRound = roundNumber % 2 === 1;
                  const attackerId = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                  const defenderId = isBonusRound ? 2 : (isOddRound ? 2 : 1);
                  const attackHistory = attackerId === 1 ? player1 : player2;
                  const defenseHistory = defenderId === 1 ? player1 : player2;
                  if (!attackHistory) return null;

                  const attackAccuracy = attackHistory?.accuracy || 0;
                  const defenseAccuracy = defenseHistory?.accuracy || 0;
                  const attackPoints = attackHistory?.successful ? calculatePoints(attackHistory.spell || undefined, attackHistory.accuracy, attackAccuracy > defenseAccuracy) : 0;
                  const defensePoints = defenseHistory?.successful ? calculatePoints(defenseHistory.spell || undefined, defenseHistory.accuracy, defenseAccuracy > attackAccuracy) : 0;

                  return (
                    <div key={`${roundNumber}-${isBonusRound ? 'bonus' : 'regular'}`} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: isBonusRound ? "#F59E0B" : "#6B7280", marginBottom: 10 }}>
                        {isBonusRound ? "БОНУСНЫЙ" : `Раунд ${roundNumber}`}
                      </div>
                      {/* Attack */}
                      <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 56px", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <GesturePreview gesture={attackHistory?.drawnGesture || []} className="w-12 h-12" />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: attackerId === 1 ? (player1Color || undefined) : (player2Color || undefined) }}>{attackHistory?.spell?.name || "Unknown"}</div>
                          <div style={{ fontSize: 12, color: "#6B7280" }}>{attackerId === 1 ? player1Name : player2Name} — {attackHistory?.accuracy}%</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, width: 48, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: attackerId === 1 ? (player1Color || undefined) : (player2Color || undefined) }}>{attackPoints > 0 ? attackPoints : "—"}</span>
                          </div>
                          <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, width: 48, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
                            <span style={{ fontSize: 12, color: "#6B7280" }}>{typeof attackHistory?.timeSpentSeconds === 'number' ? `${attackHistory.timeSpentSeconds} сек` : '— сек'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Defense */}
                      {defenseHistory && (
                        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 56px", alignItems: "center", gap: 10 }}>
                          <GesturePreview gesture={defenseHistory?.drawnGesture || []} className="w-12 h-12" />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: defenderId === 1 ? (player1Color || undefined) : (player2Color || undefined) }}>{defenseHistory?.spell?.name || "Unknown"}{(!defenseHistory?.successful && (defenseHistory?.accuracy ?? 0) >= 57) ? " ❌" : ''}</div>
                            <div style={{ fontSize: 12, color: "#6B7280" }}>{defenderId === 1 ? player1Name : player2Name} — {defenseHistory?.accuracy != null ? defenseHistory.accuracy : "—"}%</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, width: 48, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: defenderId === 1 ? (player1Color || undefined) : (player2Color || undefined) }}>{defensePoints > 0 ? defensePoints : "—"}</span>
                            </div>
                            <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, width: 48, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
                              <span style={{ fontSize: 12, color: "#6B7280" }}>{typeof defenseHistory?.timeSpentSeconds === 'number' ? `${defenseHistory.timeSpentSeconds} сек` : '— сек'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative z-10 min-h-[100dvh] p-4 md:p-8", isPhone && "phone-safe-area")}> 
      {/* Header */}
      <header className="text-center mb-8 md:mb-12 relative">
        <span className="absolute top-0 left-0 text-xs md:text-sm text-muted-foreground">Версия {`v${GAME_VERSION}`}</span>
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
                  <span className="text-sm font-medium text-muted-foreground">
                    {`Наблюдатели (${spectators.length}): `}
                    {spectators.length > 0 ? (
                      spectators.map((s, i) => (
                        <span
                          key={s.id}
                          style={{ color: s.house ? (houseColors as any)[s.house] : undefined }}
                        >
                          {s.userName}{i < spectators.length - 1 ? ', ' : ''}
                        </span>
                      ))
                    ) : (
                      '—'
                    )}
                  </span>
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
          timeLeft={timeRemaining || 0}
          isTimerActive={isTimerActive && getCurrentPlayer() === 1}
          data-testid="player-card-1"
        />

        {/* Drawing Canvas */}
        <div className="flex flex-col" ref={canvasContainerRef}>
          <Card className="spell-card border-border/20 flex-1 flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-serif font-bold text-foreground">Примени свое заклинание</h3>
              </div>
              
              {/* Show waiting message for Player 1 when Player 2 hasn't joined yet */}
              {userRole === "player" && actualPlayerNumber === 1 && players.length < 2 && (
                <div className="text-center text-sm text-yellow-600 dark:text-yellow-400 mb-4 font-medium">
                  Ожидание подключения второго игрока...
                </div>
              )}
              
              <div className="flex-1 flex items-center justify-center">
<<<<<<< HEAD
                <GestureCanvas
                ref={canvasRef}
                onGestureComplete={handleGestureComplete}
                isDisabled={recognizeGestureMutation.isPending || userRole === "spectator" || (actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer()) || (userRole === "player" && actualPlayerNumber === 1 && players.length < 2)}
                className="canvas-container"
                drawColor={getDrawColor()}
                showFeedback={(correctGesture) => canvasRef.current?.showCorrectGesture(correctGesture)}
                data-testid="gesture-canvas"
                />
=======
                <div className="relative w-full h-full">
                  <GestureCanvas
                  ref={canvasRef}
                  onGestureComplete={handleGestureComplete}
                isDisabled={recognizeGestureMutation.isPending || userRole === "spectator" || isCooldown || (actualPlayerNumber !== null && actualPlayerNumber !== getCurrentPlayer()) || (userRole === "player" && actualPlayerNumber === 1 && players.length < 2)}
                  className="canvas-container"
                  drawColor={getDrawColor()}
                  showFeedback={(correctGesture) => canvasRef.current?.showCorrectGesture(correctGesture)}
                  data-testid="gesture-canvas"
                />
                  {isCooldown && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 text-yellow-300 text-sm font-medium">
                      Подождите 1.5 сек. до начала следующего раунда
                    </div>
                  )}
                </div>
>>>>>>> local-changes
              </div>
              
              {userRole === "spectator" && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Вы наблюдаете за дуэлью
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground mt-2">
                {(() => {
                  // Единый статус по фазе: в фазе атаки — атакующий, в фазе защиты — защищающийся
                  const phase = roundPhase; // синхронизируется с session.currentPhase
                  const currentRound = session?.currentRound || 1;
                  const isOddRound = currentRound % 2 === 1;
                  const isBonusRound = session?.isBonusRound || false;
                  const attacker = isBonusRound ? 1 : (isOddRound ? 1 : 2);
                  const defender = isBonusRound ? 2 : (isOddRound ? 2 : 1);
                  const active = phase === "counter" ? defender : attacker;
                  const actionText = phase === "counter" ? "защищайся!" : "атакуй!";
                  const name = active === 1 ? player1Name : player2Name;
                  const house = active === 1 ? player1?.house : player2?.house;
                  const color = house ? houseColors[house as keyof typeof houseColors] : undefined;
                  return (
                    <>
                      <span
                        className="wave-underline"
                        key={`${phase}-${active}-${currentRound}-${isBonusRound ? 1 : 0}`}
                        style={color ? ({ color, ['--house-color' as any]: color } as any) : undefined}
                      >
                        {name}
                      </span>, {actionText}
                    </>
                  );
                })()}
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
          timeLeft={timeRemaining || 0}
          isTimerActive={isTimerActive && getCurrentPlayer() === 2}
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
      <SpellChoiceDialog
        open={showSpellChoice}
        onOpenChange={setShowSpellChoice}
        choices={spellChoices || undefined}
        onSelect={handleSpellChoice}
      />

      {/* Round Complete Dialog */}
      <RoundCompleteDialog
        open={showRoundComplete}
        onOpenChange={(open) => {
          if (!open) {
            const completedRound = session?.lastCompletedRoundNumber || 1;
            const roundKey = `${completedRound}`;
            dismissedDialogForRound.current = roundKey;
            // Clear snapshot once dialog is dismissed
            setLastCompletedSnapshot(null);
            // Reset canvas cleared state when dialog is dismissed
            setCanvasCleared(false);
          }
          setShowRoundComplete(open);
        }}
        session={lastCompletedSnapshot ? { ...session, ...lastCompletedSnapshot } as any : session}
        allSpells={allSpells}
        onContinue={() => {
          const completedRound = session?.lastCompletedRoundNumber || 1;
          const roundKey = `${completedRound}`;
          dismissedDialogForRound.current = roundKey;
          setShowRoundComplete(false);
          // Clear snapshot when user continues
          setLastCompletedSnapshot(null);
          // Reset canvas cleared state when dialog is continued
          setCanvasCleared(false);
        }}
      />

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

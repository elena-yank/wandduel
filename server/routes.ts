import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertGameSessionSchema, insertGestureAttemptSchema, insertSpellSchema, insertSessionParticipantSchema, insertGameRoomSchema, type Point, type GameSession } from "@shared/schema";
import { ATTACK_SUCCESS_THRESHOLD, COUNTER_SUCCESS_THRESHOLD, TOTAL_ROUNDS, MIN_RECOGNITION_THRESHOLD, MULTI_MATCH_DELTA, MULTI_MATCH_MAX_COUNT, MULTI_MATCH_MIN_SCORE } from "@shared/config";
import { z } from "zod";
import type { IStorage } from "./storage";
import { evaluateDrawing } from "@shared/advanced-gesture-recognition";
import { awardPointForRound, calculateBonusRoundOutcome, nextRoundState } from "./utils/rounds";

// Gesture recognition function with improved accuracy calculation
function calculateGestureAccuracy(drawnGesture: Point[], targetPattern: Point[]): number {
  const result = evaluateDrawing(drawnGesture, targetPattern as Point[]);
  // If the drawing is invalid (scribbles), return 0
  if (!result.valid) {
    return 0;
  }
  // Return the score (0-100)
  return result.score;
}

export async function registerRoutes(app: Express, storage: IStorage): Promise<Server> {
  // WebSocket test page
  app.get("/websocket-test", (req, res) => {
    res.sendFile(require('path').join(process.cwd(), 'websocket-test.html'));
  });

  // Get all spells
  app.get("/api/spells", async (_req, res) => {
    try {
      const spells = await storage.getSpells();
      res.json(spells);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spells" });
    }
  });

  // Get spells by type
  app.get("/api/spells/:type", async (req, res) => {
    try {
      const { type } = req.params;
      if (type !== "attack" && type !== "counter") {
        return res.status(400).json({ message: "Invalid spell type" });
      }
      const spells = await storage.getSpellsByType(type);
      res.json(spells);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spells by type" });
    }
  });

  // Delete all spells
  app.delete("/api/spells", async (_req, res) => {
    try {
      await storage.deleteAllSpells();
      res.json({ message: "All spells deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete spells" });
    }
  });

  // Create new spell
  app.post("/api/spells", async (req, res) => {
    try {
      const spellData = insertSpellSchema.parse(req.body);
      const spell = await storage.createSpell(spellData);
      res.json(spell);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid spell data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create spell" });
    }
  });

  // Create new game room
  app.post("/api/rooms", async (req, res) => {
    try {
      const { hostName } = req.body;
      if (!hostName) {
        return res.status(400).json({ message: "hostName is required" });
      }

      const roomData = insertGameRoomSchema.parse({ hostName });
      const room = await storage.createGameRoom(roomData);
      
      // Create a session for this room
      const sessionData = insertGameSessionSchema.parse({ roomId: room.id });
      const session = await storage.createGameSession(sessionData);
      
      res.json({ room, session });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Get room by ID
  app.get("/api/rooms/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getGameRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to get room" });
    }
  });

  // Get room session
  app.get("/api/rooms/:roomId/session", async (req, res) => {
    try {
      const { roomId } = req.params;
      
      // Check if room exists
      const room = await storage.getGameRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Get session for this room
      const session = await storage.getGameSessionByRoomId(roomId);
      if (!session) {
        return res.status(404).json({ message: "Session not found for this room" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to get room session" });
    }
  });

  // Create new game session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertGameSessionSchema.parse(req.body || {});
      
      // Initialize timer fields for new session
      const sessionWithTimer = {
        ...sessionData,
        roundStartTime: new Date().toISOString(),
        timeLimit: 60,
        currentPlayerTurn: 1 // Player 1 starts first
      };
      
      const session = await storage.createGameSession(sessionWithTimer);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create game session" });
    }
  });

  // Join session as player or spectator
  app.post("/api/sessions/:sessionId/join", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userId, userName, role, house } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }

      if (!house) {
        return res.status(400).json({ message: "house is required" });
      }

      // Check if session exists
      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if user is already a participant in this session
      const existingParticipant = await storage.getParticipantByUserId(sessionId, userId);
      if (existingParticipant) {
        // User already joined this session, return their existing participant record
        return res.json(existingParticipant);
      }

      // If joining as player, check if there's room
      if (role === "player") {
        const players = await storage.getParticipantsByRole(sessionId, "player");
        if (players.length >= 2) {
          return res.status(400).json({ 
            message: "Game is full. You can join as a spectator.",
            canJoinAsSpectator: true
          });
        }

        // Assign player number
        const playerNumber = players.length === 0 ? 1 : 2;
        const participantData = insertSessionParticipantSchema.parse({
          sessionId,
          userId,
          userName: userName || "Player",
          role: "player",
          playerNumber,
          house
        });

        const participant = await storage.addParticipant(participantData);
        
        // If this is the second player joining, initialize the timer for the game to start
        if (playerNumber === 2) {
          await storage.updateGameSession(sessionId, {
            roundStartTime: new Date().toISOString(),
            timeLimit: 60,
            currentPlayerTurn: 1 // Player 1 starts first
          });
        }
        
        // Broadcast player join event via WebSocket
        const wsServer = (global as any).wsServer;
        if (wsServer) {
          wsServer.broadcastSessionUpdate(sessionId, 'player_joined', {
            participant,
            playerCount: players.length + 1,
            gameReady: playerNumber === 2
          });
        }
        
        return res.json(participant);
      }

      // Join as spectator
      const participantData = insertSessionParticipantSchema.parse({
        sessionId,
        userId,
        userName: userName || "Player",
        role: "spectator",
        playerNumber: null,
        house
      });

      const participant = await storage.addParticipant(participantData);
      
      // Broadcast spectator join event via WebSocket
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastSessionUpdate(sessionId, 'spectator_joined', {
          participant
        });
      }
      
      res.json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to join session" });
    }
  });

  // Get server time for synchronization
  app.get("/api/server-time", (req, res) => {
    res.json({ 
      serverTime: new Date().toISOString(),
      timestamp: Date.now()
    });
  });

  // Get session participants
  app.get("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const participants = await storage.getSessionParticipants(sessionId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  // Remove participant from session
  app.delete("/api/sessions/:sessionId/participants/:participantId", async (req, res) => {
    try {
      const { sessionId, participantId } = req.params as { sessionId: string; participantId: string };

      // Ensure session exists
      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Find participant in session
      const participants = await storage.getSessionParticipants(sessionId);
      const participant = participants.find((p: any) => p.id === participantId);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      await storage.removeParticipant(participantId);

      // Broadcast leave event via WebSocket so clients refresh lists
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastSessionUpdate(sessionId, 'participant_left', {
          participantId,
          role: participant.role,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to remove participant:', error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // Get game session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getGameSession(id);
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game session" });
    }
  });

  // Get spell history for session (with spell details)
  app.get("/api/sessions/:sessionId/spell-history", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const attempts = await storage.getGestureAttemptsBySession(sessionId);
      
      // Get session to check if any rounds were bonus rounds
      const session = await storage.getGameSession(sessionId);
      
      // Get spell details for each attempt
      const historyWithSpells = await Promise.all(
        attempts.map(async (attempt: any) => {
          const spell = attempt.spellId ? await storage.getSpellById(attempt.spellId) : null;
          // Ensure accuracy is present: if missing or zero but we have gesture+spell, recompute for display
          let displayAccuracy = attempt.accuracy;
          if ((displayAccuracy === null || displayAccuracy === undefined || displayAccuracy === 0) && spell && attempt.drawnGesture) {
            try {
              displayAccuracy = calculateGestureAccuracy(attempt.drawnGesture as Point[], (spell.gesturePattern as Point[])) || 0;
            } catch {}
          }
          return {
            roundNumber: attempt.roundNumber,
            playerId: attempt.playerId,
            spell: spell,
            accuracy: displayAccuracy,
            successful: attempt.successful,
            drawnGesture: attempt.drawnGesture,
            isBonusRound: attempt.isBonusRound || false,
            timeSpentSeconds: attempt.timeSpentSeconds ?? null
          };
        })
      );
      
      res.json(historyWithSpells);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spell history" });
    }
  });

  // Update game session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const session = await storage.updateGameSession(id, updates);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game session" });
    }
  });

  // Recognize gesture and find matching spell
  app.post("/api/sessions/:sessionId/recognize-gesture", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { gesture, playerId, colorFilter } = req.body;
      
      if (!gesture || !Array.isArray(gesture) || gesture.length < 1) {
        return res.status(400).json({ message: "Invalid gesture data" });
      }
      
      // Validate playerId is a number (1 or 2, not UUID)
      if (typeof playerId !== 'number' || (playerId !== 1 && playerId !== 2)) {
        return res.status(400).json({ message: "Invalid playerId. Must be 1 or 2, not UUID." });
      }

      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }
      
      const currentRound = session.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = session.isBonusRound || false;
      const expectedAttacker = isBonusRound ? (isOddRound ? 1 : 2) : (isOddRound ? 1 : 2);
      const expectedDefender = isBonusRound ? (isOddRound ? 2 : 1) : (isOddRound ? 2 : 1);
      const expectedPlayer = session.currentPhase === "attack" ? expectedAttacker : expectedDefender;
      if (playerId !== expectedPlayer) {
        return res.json({ recognized: false, message: "Сейчас не ваш ход. Дождитесь своей фазы.", accuracy: 0 });
      }
      // Get appropriate spells based on current phase
      const spellType = session.currentPhase === "attack" ? "attack" : "counter";
      let availableSpells = await storage.getSpellsByType(spellType);

      // If it's attack phase, get used spells for this player (but don't filter them out)
      let usedSpellIds: string[] = [];
      if (spellType === "attack") {
        usedSpellIds = playerId === 1
          ? (session.player1UsedAttackSpells as string[] || [])
          : (session.player2UsedAttackSpells as string[] || []);
      }

      // If it's counter phase, filter by spells that can counter the last attack
      if (spellType === "counter" && session.lastAttackSpellId) {
        const lastAttackSpell = await storage.getSpellById(session.lastAttackSpellId);
        if (lastAttackSpell) {
          availableSpells = availableSpells.filter((spell: any) =>
            spell.counters && Array.isArray(spell.counters) &&
            spell.counters.includes(lastAttackSpell.id)
          );
        }
      }

      // Filter by color if colorFilter is provided
      if (colorFilter) {
        availableSpells = availableSpells.filter((spell: any) => spell.colorName === colorFilter);
      }

      // Calculate accuracy for all spells
      const spellMatches = availableSpells.map((spell: any) => {
        return {
          spell,
          accuracy: calculateGestureAccuracy(gesture, spell.gesturePattern as Point[])
        };
      }).sort((a: any, b: any) => b.accuracy - a.accuracy);

      // Log gesture recognition details (gated by env)
      if (process.env.DEBUG_GESTURES === '1') {
        console.log('\n=== GESTURE RECOGNITION DEBUG ===');
        console.log('Player gesture points:', gesture.length);
        console.log('Phase:', session.currentPhase);
        console.log('Spell matches:');
        spellMatches.forEach((match: any) => {
          console.log(`  - ${match.spell.name}: ${match.accuracy}% (pattern: ${(match.spell.gesturePattern as Point[]).length} points)`);
        });
        console.log('================================\n');
      }

      // Get best match
      const bestMatch = spellMatches[0];

      // If the best match is below minimal recognition threshold, treat as not recognized
      if (bestMatch && bestMatch.accuracy < MIN_RECOGNITION_THRESHOLD) {
        return res.json({
          recognized: false,
          message: "Жест не распознан.",
          accuracy: bestMatch.accuracy,
        });
      }

      // Special case: if this is an attack spell and the best match is a spell the player has already used,
      // provide a specific error message
      if (spellType === "attack" && bestMatch) {
        const usedSpellIds = playerId === 1
          ? (session.player1UsedAttackSpells as string[] || [])
          : (session.player2UsedAttackSpells as string[] || []);
        
        if (usedSpellIds.includes(bestMatch.spell.id)) {
          return res.json({
            recognized: false,
            message: "Это заклинание уже было использовано. Пожалуйста, используйте другое заклинание.",
            accuracy: bestMatch.accuracy
          });
        }
      }
      // provide a specific error message
      if (spellType === "attack" && bestMatch) {
        const usedSpellIds = playerId === 1
          ? (session.player1UsedAttackSpells as string[] || [])
          : (session.player2UsedAttackSpells as string[] || []);
        
        if (usedSpellIds.includes(bestMatch.spell.id)) {
          return res.json({
            recognized: false,
            message: "Это заклинание уже было использовано. Пожалуйста, используйте другое заклинание.",
            accuracy: bestMatch.accuracy
          });
        }
      }

      // If no match at all, return not recognized
      if (!bestMatch) {
        return res.json({
          recognized: false,
          message: "Жест не распознан.",
          accuracy: 0
        });
      }

      // Present multiple-match selection for attacks when top results are close
      if (spellType === "attack" && bestMatch) {
        // Exclude already used attack spells from choices
        const usedIds = playerId === 1
          ? (session.player1UsedAttackSpells as string[] || [])
          : (session.player2UsedAttackSpells as string[] || []);

        const candidates = spellMatches.filter((m: any) => !usedIds.includes(m.spell.id));
        const second = candidates[1];
        if (
          second &&
          bestMatch.accuracy >= MULTI_MATCH_MIN_SCORE &&
          second.accuracy >= MULTI_MATCH_MIN_SCORE &&
          Math.abs(bestMatch.accuracy - second.accuracy) <= MULTI_MATCH_DELTA
        ) {
          return res.json({
            recognized: false,
            multipleMatches: true,
            matches: candidates.slice(0, MULTI_MATCH_MAX_COUNT),
            gesture,
          });
        }
      }

      // Single match or counter spell - proceed normally
      const selectedSpell = bestMatch.spell;
      const selectedAccuracy = bestMatch.accuracy;

      // Extra guard: block attacks below minimal threshold
      if (spellType === "attack" && selectedAccuracy < MIN_RECOGNITION_THRESHOLD) {
        return res.json({
          recognized: false,
          message: "Жест не распознан.",
          accuracy: selectedAccuracy,
        });
      }

      // Extra guard: block counters below minimal threshold (do not record or progress round)
      if (spellType === "counter" && selectedAccuracy < MIN_RECOGNITION_THRESHOLD) {
        return res.json({
          recognized: false,
          message: "Жест не распознан.",
          accuracy: selectedAccuracy,
        });
      }

      // For counter spells, validate if it's the correct counter
      let isValidCounter = true;
      let wrongDefenseUsed = false;
      
      if (spellType === "counter" && session.lastAttackSpellId) {
        const counters = selectedSpell.counters as string[] | null;
        isValidCounter = counters !== null && 
          Array.isArray(counters) && 
          counters.includes(session.lastAttackSpellId);
        
        // If player used a counter spell but it's not the right one, mark as wrong defense
        if (!isValidCounter && selectedSpell.type === "counter") {
          wrongDefenseUsed = true;
        }
      }

      // Save pending attempt data (will be saved to history when round completes)
      if (spellType === "attack") {
        // Compute time spent in attack phase
        const now = new Date();
        const attackStart = new Date(session.roundStartTime || now);
        const attackTimeSpent = Math.max(0, Math.floor((now.getTime() - attackStart.getTime()) / 1000));
        // Update used spells for this player
        const usedSpellIds = playerId === 1
          ? (session.player1UsedAttackSpells as string[] || [])
          : (session.player2UsedAttackSpells as string[] || []);
        
        // Add this spell to the player's used spells if not already there
        let updatedUsedSpells = [...usedSpellIds];
        if (!updatedUsedSpells.includes(selectedSpell.id)) {
          updatedUsedSpells.push(selectedSpell.id);
        }

        const updateData: Partial<GameSession> = {
          pendingAttackPlayerId: playerId,
          pendingAttackSpellId: selectedSpell.id,
          pendingAttackGesture: gesture,
          pendingAttackAccuracy: selectedAccuracy,
          pendingAttackTimeSpent: attackTimeSpent,
          // Always pass turn to defender regardless of accuracy
          currentPhase: "counter",
          lastAttackSpellId: selectedSpell.id,
          lastAttackAccuracy: selectedAccuracy,
          // Update timer fields when switching to counter phase
          roundStartTime: new Date().toISOString(),
          currentPlayerTurn: (() => { const cr = session.currentRound || 1; return cr % 2 === 1 ? 2 : 1; })(),
          // Clear lastCompleted data when new attack starts (so previous round dialog data is removed)
          lastCompletedRoundNumber: null,
          lastCompletedAttackSpellId: null,
          lastCompletedAttackAccuracy: null,
          lastCompletedAttackGesture: null,
          lastCompletedCounterSpellId: null,
          lastCompletedCounterAccuracy: null,
          lastCompletedCounterGesture: null,
          lastCompletedCounterSuccess: null
        };
        
        // Update player's used attack spells
        if (playerId === 1) {
          updateData.player1UsedAttackSpells = updatedUsedSpells;
        } else {
          updateData.player2UsedAttackSpells = updatedUsedSpells;
        }
        
        await storage.updateGameSession(sessionId, updateData);

        // Record the attack attempt immediately (single attempt regardless of accuracy)
        await storage.createGestureAttempt({
          sessionId,
          playerId,
          spellId: selectedSpell.id,
          drawnGesture: gesture,
          accuracy: selectedAccuracy,
          successful: selectedAccuracy >= ATTACK_SUCCESS_THRESHOLD,
          roundNumber: session.currentRound || 1,
          isBonusRound: session.isBonusRound || false,
          timeSpentSeconds: attackTimeSpent
        });
      } else {
        // Counter spell
        

        // Compute time spent in counter phase and save pending data first
        const now = new Date();
        const counterStart = new Date(session.roundStartTime || now);
        const counterTimeSpent = Math.max(0, Math.floor((now.getTime() - counterStart.getTime()) / 1000));
        await storage.updateGameSession(sessionId, {
          pendingCounterPlayerId: playerId,
          pendingCounterSpellId: selectedSpell.id,
          pendingCounterGesture: gesture,
          pendingCounterAccuracy: selectedAccuracy,
          pendingCounterTimeSpent: counterTimeSpent
        });
        
        // Auto-complete round after counter spell is cast (single attempt only)
          const currentRound = session.currentRound || 1;
          const attemptIsBonusRound = session.isBonusRound || false;
          
          // Attack attempt already recorded during attack phase

          // Save counter attempt
          await storage.createGestureAttempt({
            sessionId,
            playerId: playerId,
            spellId: selectedSpell.id,
            drawnGesture: gesture,
            accuracy: selectedAccuracy,
            successful: selectedAccuracy >= COUNTER_SUCCESS_THRESHOLD && isValidCounter,
            roundNumber: currentRound,
            isBonusRound: attemptIsBonusRound,
            timeSpentSeconds: counterTimeSpent
          });

          // Update scores - only 1 point per round to player with higher accuracy
          const updatedSession = await storage.getGameSession(sessionId);
          if (!updatedSession) {
            throw new Error("Session not found");
          }

          let player1Score = Number(updatedSession.player1Score) || 0;
          let player2Score = Number(updatedSession.player2Score) || 0;

          // Compare accuracies and award 1 point to player with higher accuracy
          const attackAccuracy = session.pendingAttackAccuracy || 0;
          const counterAccuracy = selectedAccuracy;
          const counterSuccessful = selectedAccuracy >= COUNTER_SUCCESS_THRESHOLD && isValidCounter;
          
          // Award 1 point to player with higher accuracy
          const award = awardPointForRound({
            session,
            attackAccuracy,
            counterAccuracy,
            playerId,
            pendingAttackPlayerId: session.pendingAttackPlayerId ?? null,
            attackTimeSpentSeconds: session.pendingAttackTimeSpent ?? null,
            counterTimeSpentSeconds: counterTimeSpent
          });
          player1Score += award.p1;
          player2Score += award.p2;

          // Determine next round and bonus/winner state via utils
          const transition = nextRoundState(session, player1Score, player2Score, TOTAL_ROUNDS);
          const bonusOutcome = calculateBonusRoundOutcome(
            session,
            attackAccuracy,
            counterAccuracy,
            session.pendingAttackTimeSpent ?? null,
            counterTimeSpent
          );
          const nextRound = transition.nextRound;
          const baseBonus = session.isBonusRound || transition.isBonusRound || award.tie;
          const bonusRoundWinner = bonusOutcome.bonusRoundWinner;
          const isFinalBonus = baseBonus && (currentRound === TOTAL_ROUNDS) && (player1Score === player2Score);
          // Do not add extra points here: bonus rounds already award exactly 1 point
          const isGameComplete = bonusOutcome.isGameComplete || transition.isGameComplete;
          let gameStatus: "active" | "completed" | "paused" = isGameComplete ? "completed" : "active";
          const isOdd = currentRound % 2 === 1;
          const isBonusRound = baseBonus && !(bonusRoundWinner && !isFinalBonus);
          const nextAttacker = isBonusRound ? (nextRound % 2 === 1 ? 1 : 2) : (nextRound % 2 === 1 ? 1 : 2);
          
          // Advance to next round or complete game
          await storage.updateGameSession(sessionId, {
            currentRound: nextRound,
            currentPhase: isGameComplete ? null : "attack",
            currentPlayer: isGameComplete ? (updatedSession.currentPlayer ?? null) : nextAttacker,
            player1Score: player1Score.toString(),
            player2Score: player2Score.toString(),
            gameStatus,
            isBonusRound,
            bonusRoundWinner,
            // Reset timer for the new attack phase/round
            roundStartTime: isGameComplete ? (updatedSession.roundStartTime ?? null) : new Date().toISOString(),
            timeLimit: isGameComplete ? (updatedSession.timeLimit ?? 60) : 60,
            currentPlayerTurn: isGameComplete ? (updatedSession.currentPlayerTurn ?? null) : nextAttacker,
            // Save last completed round data for dialog display
            lastCompletedRoundNumber: session.isBonusRound ? currentRound : currentRound,
            lastCompletedAttackSpellId: session.pendingAttackSpellId,
            lastCompletedAttackAccuracy: session.pendingAttackAccuracy,
            lastCompletedAttackGesture: session.pendingAttackGesture,
            lastCompletedAttackTimeSpent: session.pendingAttackTimeSpent ?? null,
            lastCompletedCounterSpellId: selectedSpell.id,
            lastCompletedCounterAccuracy: selectedAccuracy,
            lastCompletedCounterGesture: gesture,
            lastCompletedCounterSuccess: counterSuccessful,
            lastCompletedCounterTimeSpent: counterTimeSpent,
            // Clear pending data
            pendingAttackPlayerId: null,
            pendingAttackSpellId: null,
            pendingAttackGesture: null,
            pendingAttackAccuracy: null,
            pendingAttackTimeSpent: null,
            pendingCounterPlayerId: null,
            pendingCounterSpellId: null,
            pendingCounterGesture: null,
            pendingCounterAccuracy: null,
            pendingCounterTimeSpent: null,
            lastAttackSpellId: null,
            lastAttackAccuracy: null
          });
        
      }

      res.json({
        recognized: true,
        spell: selectedSpell,
        accuracy: selectedAccuracy,
        isValidCounter,
        wrongDefenseUsed,
        successful: spellType === "attack"
          ? (selectedAccuracy >= ATTACK_SUCCESS_THRESHOLD)
          : (selectedAccuracy >= COUNTER_SUCCESS_THRESHOLD && isValidCounter)
      });

      // Broadcast gesture recognition via WebSocket
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastSessionUpdate(sessionId, 'gesture_recognized', {
          playerId,
          spell: selectedSpell,
          accuracy: selectedAccuracy,
          phase: spellType,
          successful: spellType === "attack"
            ? (selectedAccuracy >= ATTACK_SUCCESS_THRESHOLD)
            : (selectedAccuracy >= COUNTER_SUCCESS_THRESHOLD && isValidCounter)
        });
      }

    } catch (error) {
      console.error("Gesture recognition error:", error);
      res.status(500).json({ message: "Failed to recognize gesture" });
    }
  });

  // Save spell attempt (for when user chooses from multiple matches)
  app.post("/api/sessions/:sessionId/save-spell-attempt", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { spellId, playerId, accuracy, gesture } = req.body;

      console.log("=== SAVE SPELL ATTEMPT ===");
      console.log("Session ID:", sessionId);
      console.log("Player ID:", playerId);
      console.log("Spell ID:", spellId);
      console.log("Accuracy:", accuracy);
      console.log("==========================");

      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }
      
      const currentRound = session.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = session.isBonusRound || false;
      const expectedAttacker = isBonusRound ? (isOddRound ? 1 : 2) : (isOddRound ? 1 : 2);
      if (playerId !== expectedAttacker || session.currentPhase !== "attack") {
        return res.json({ recognized: false, message: "Сейчас не ваш ход. Дождитесь своей фазы.", accuracy: 0 });
      }
      // Update used spells for this player
      const usedSpellIds = playerId === 1
        ? (session.player1UsedAttackSpells as string[] || [])
        : (session.player2UsedAttackSpells as string[] || []);
      
      // Validate the provided gesture against the selected spell and compute accuracy server-side
      const selectedSpell = await storage.getSpellById(spellId);
      if (!selectedSpell) {
        return res.status(400).json({ message: "Invalid spellId" });
      }
      const calculatedAccuracy = calculateGestureAccuracy(gesture, selectedSpell.gesturePattern as Point[]);
      if (calculatedAccuracy < MIN_RECOGNITION_THRESHOLD) {
        return res.json({ recognized: false, message: "Жест не распознан.", accuracy: calculatedAccuracy });
      }

      // Add this spell to the player's used spells if not already there
      let updatedUsedSpells = [...usedSpellIds];
      if (!updatedUsedSpells.includes(spellId)) {
        updatedUsedSpells.push(spellId);
      }
      
      // Compute time spent in attack phase up to this saved attempt
      const now = new Date();
      const attackStart = new Date(session.roundStartTime || now);
      const attackTimeSpent = Math.max(0, Math.floor((now.getTime() - attackStart.getTime()) / 1000));
      const updateData: Partial<GameSession> = {
        pendingAttackPlayerId: playerId,
        pendingAttackSpellId: spellId,
        pendingAttackGesture: gesture,
        pendingAttackAccuracy: calculatedAccuracy,
        pendingAttackTimeSpent: attackTimeSpent,
        // Always pass turn to defender regardless of accuracy
        currentPhase: "counter",
        lastAttackSpellId: spellId,
        lastAttackAccuracy: calculatedAccuracy,
        // Update timer fields when switching to counter phase
        roundStartTime: new Date().toISOString(),
        currentPlayerTurn: (() => { const cr = session.currentRound || 1; return cr % 2 === 1 ? 2 : 1; })(),
        // Clear lastCompleted data when new attack starts
        lastCompletedRoundNumber: null,
        lastCompletedAttackSpellId: null,
        lastCompletedAttackAccuracy: null,
        lastCompletedAttackGesture: null,
        lastCompletedCounterSpellId: null,
        lastCompletedCounterAccuracy: null,
        lastCompletedCounterGesture: null,
        lastCompletedCounterSuccess: null
      };
      
      // Update player's used attack spells
      if (playerId === 1) {
        updateData.player1UsedAttackSpells = updatedUsedSpells;
      } else {
        updateData.player2UsedAttackSpells = updatedUsedSpells;
      }
      
      // Save pending attempt data and immediately record attempt
      await storage.updateGameSession(sessionId, updateData);

      await storage.createGestureAttempt({
        sessionId,
        playerId,
        spellId,
        drawnGesture: gesture,
        accuracy: calculatedAccuracy,
        successful: calculatedAccuracy >= ATTACK_SUCCESS_THRESHOLD,
        roundNumber: session.currentRound || 1,
        isBonusRound: session.isBonusRound || false,
        timeSpentSeconds: attackTimeSpent
      });
      
      // Broadcast that an attack was selected/saved so other clients refresh session
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastSessionUpdate(sessionId, 'attack_saved', {
          playerId,
          spellId,
          accuracy,
          gesture,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Save spell attempt error:", error);
      res.status(500).json({ message: "Failed to save spell attempt" });
    }
  });

  // Check for timeout and handle it
  app.post("/api/sessions/:sessionId/check-timeout", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }

      // Don't process timeouts for completed games
      if (session.gameStatus === "completed") {
        return res.json({ 
          timeout: false, 
          timeElapsed: 0,
          timeRemaining: 0,
          message: "Game is already completed"
        });
      }

      // Calculate time elapsed since round start
      const now = new Date();
      const roundStartTime = new Date(session.roundStartTime || now);
      const timeElapsed = Math.floor((now.getTime() - roundStartTime.getTime()) / 1000);
      const timeLimit = session.timeLimit || 60;
      
      if (timeElapsed >= timeLimit) {
        // Timeout occurred - determine winner based on current phase
        const currentRound = session.currentRound || 1;
        const isOddRound = currentRound % 2 === 1;
        const isBonusRound = session.isBonusRound || false;
        
        let player1Accuracy = 0;
        let player2Accuracy = 0;
        
        if (session.currentPhase === "attack") {
          // Attacker timed out, defender wins
          const attacker = isBonusRound ? (isOddRound ? 1 : 2) : (isOddRound ? 1 : 2);
          if (attacker === 1) {
            player2Accuracy = 100; // Player 2 wins
          } else {
            player1Accuracy = 100; // Player 1 wins
          }
        } else {
          // Defender timed out, attacker wins
          const attacker = isBonusRound ? (isOddRound ? 1 : 2) : (isOddRound ? 1 : 2);
          if (attacker === 1) {
            player1Accuracy = 100; // Player 1 wins
          } else {
            player2Accuracy = 100; // Player 2 wins
          }
        }
        
        // Complete the round due to timeout
        const completeRoundResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/sessions/${sessionId}/complete-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attackSpellId: null,
            counterSuccess: false,
            player1Accuracy,
            player2Accuracy
          })
        });
        
        if (completeRoundResponse.ok) {
          const result = await completeRoundResponse.json();
          return res.json({ 
            timeout: true, 
            timeElapsed,
            session: result.session,
            message: "Round completed due to timeout"
          });
        } else {
          return res.status(500).json({ message: "Failed to complete round after timeout" });
        }
      }
      
      // No timeout yet
      res.json({ 
        timeout: false, 
        timeElapsed,
        timeRemaining: Math.max(0, timeLimit - timeElapsed)
      });
      
    } catch (error) {
      console.error("Check timeout error:", error);
      res.status(500).json({ message: "Failed to check timeout" });
    }
  });

  // Complete round and update game state
  app.post("/api/sessions/:sessionId/complete-round", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { attackSpellId, counterSuccess, player1Accuracy, player2Accuracy } = req.body;

      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }

      // Save pending attempts to history now that the round is complete
      const currentRound = session.currentRound ?? 1;
      
      console.log("=== COMPLETE ROUND - SAVE PENDING ATTEMPTS ===");
      console.log("Session pending attack player:", session.pendingAttackPlayerId);
      console.log("Session pending attack spell:", session.pendingAttackSpellId);
      console.log("Session pending attack accuracy:", session.pendingAttackAccuracy);
      console.log("Session pending counter player:", session.pendingCounterPlayerId);
      console.log("Session pending counter spell:", session.pendingCounterSpellId);
      console.log("Session pending counter accuracy:", session.pendingCounterAccuracy);
      
      // Save attack attempt if exists
      if (session.pendingAttackPlayerId !== null && session.pendingAttackPlayerId !== undefined) {
        console.log("Saving attack attempt to history...");
        const attackAttemptData = insertGestureAttemptSchema.parse({
          sessionId,
          playerId: session.pendingAttackPlayerId,
          roundNumber: currentRound,
          spellId: session.pendingAttackSpellId,
          drawnGesture: session.pendingAttackGesture,
          accuracy: session.pendingAttackAccuracy ?? 0,
    successful: (session.pendingAttackAccuracy ?? 0) >= ATTACK_SUCCESS_THRESHOLD,
          isBonusRound: session.isBonusRound || false,
          timeSpentSeconds: session.pendingAttackTimeSpent ?? null
        });
        await storage.createGestureAttempt(attackAttemptData);
        console.log("Attack attempt saved!");
      } else {
        console.log("No attack attempt to save (pendingAttackPlayerId is null/undefined)");
      }

      // Save counter attempt if exists
      if (session.pendingCounterPlayerId !== null && session.pendingCounterPlayerId !== undefined) {
        console.log("Saving counter attempt to history...");
        const counterAttemptData = insertGestureAttemptSchema.parse({
          sessionId,
          playerId: session.pendingCounterPlayerId,
          roundNumber: currentRound,
          spellId: session.pendingCounterSpellId,
          drawnGesture: session.pendingCounterGesture,
          accuracy: session.pendingCounterAccuracy ?? 0,
    successful: counterSuccess && (session.pendingCounterAccuracy ?? 0) >= ATTACK_SUCCESS_THRESHOLD,
          isBonusRound: session.isBonusRound || false,
          timeSpentSeconds: session.pendingCounterTimeSpent ?? null
        });
        await storage.createGestureAttempt(counterAttemptData);
        console.log("Counter attempt saved!");
      } else {
        console.log("No counter attempt to save (pendingCounterPlayerId is null/undefined)");
      }
      console.log("===============================================");

      // Update scores - only 1 point per round to player with higher accuracy
      let player1Score = Number(session.player1Score) || 0;
      let player2Score = Number(session.player2Score) || 0;

      // Check if this is a timeout case (attackSpellId is null)
      const isTimeout = attackSpellId === null;
      
      let attackAccuracy, counterAccuracy;
      
      if (isTimeout) {
        // In timeout cases, use the accuracy values passed from client
        attackAccuracy = player1Accuracy || 0;
        counterAccuracy = player2Accuracy || 0;
      } else {
        // In normal cases, use pending accuracy values from session
        attackAccuracy = session.pendingAttackAccuracy || 0;
        counterAccuracy = session.pendingCounterAccuracy || 0;
      }

      // Award 1 point based on higher accuracy or timeout logic
      if (isTimeout) {
        // In timeout cases, the defender gets the point
        // If Player 2 was attacking (counterAccuracy = 0), Player 1 (defender) gets the point
        if (attackAccuracy === 0 && counterAccuracy === 100) {
          // Player 1 was attacker and timed out, Player 2 gets the point
          player2Score += 1;
        } else if (attackAccuracy === 100 && counterAccuracy === 0) {
          // Player 2 was attacker and timed out, Player 1 gets the point
          player1Score += 1;
        }
      } else {
        const award = awardPointForRound({
          session,
          attackAccuracy,
          counterAccuracy,
          playerId: session.pendingCounterPlayerId ?? (((session.currentRound || 1) % 2 === 1) ? 2 : 1),
          pendingAttackPlayerId: session.pendingAttackPlayerId ?? null,
          attackTimeSpentSeconds: session.pendingAttackTimeSpent ?? null,
          counterTimeSpentSeconds: session.pendingCounterTimeSpent ?? null,
        });
        player1Score += award.p1;
        player2Score += award.p2;
        if (award.tie) {
          session.isBonusRound = true;
        }
      }

      // Check if scores are equal after 10 rounds to trigger bonus round
      const nextRound = currentRound + 1;
      let isGameComplete = nextRound > 10;
      let gameStatus: "active" | "completed" | "paused" = isGameComplete ? "completed" : (session.gameStatus || "active");
      let isBonusRound = session.isBonusRound || false;
      let bonusRoundWinner = null;
      
      // If we're at the end of round 10, check for tie
  if (currentRound === TOTAL_ROUNDS && player1Score === player2Score) {
        // Scores are tied, start bonus round
        isGameComplete = false; // Don't complete game yet
        gameStatus = "active";
        isBonusRound = true;
        // Keep same round number for bonus round
      }
      
      // If this is a bonus round, check if we have a winner
      if (isBonusRound) {
        const outcome = calculateBonusRoundOutcome(
          session,
          attackAccuracy,
          counterAccuracy,
          session.pendingAttackTimeSpent ?? null,
          session.pendingCounterTimeSpent ?? null
        );
        bonusRoundWinner = outcome.bonusRoundWinner;
        isGameComplete = outcome.isGameComplete;
        if (isGameComplete) {
          gameStatus = "completed";
        } else {
          gameStatus = "active";
          isBonusRound = true;
        }
      }
      
      // Determine attacker for next round
      // Odd rounds (1,3,5,7,9): Player 1 attacks
      // Even rounds (2,4,6,8,10): Player 2 attacks
      const nextAttacker = isBonusRound ? (nextRound % 2 === 1 ? 1 : 2) : (nextRound % 2 === 1 ? 1 : 2);
      
      const updates = {
        currentRound: nextRound,
        currentPlayer: nextAttacker,
        currentPhase: "attack" as const,
        player1Score: player1Score.toString(),
        player2Score: player2Score.toString(),
        lastAttackSpellId: null,
        lastAttackAccuracy: null,
        gameStatus,
        isBonusRound,
        bonusRoundWinner,
        // Update timer fields for new round
        roundStartTime: new Date().toISOString(),
        timeLimit: 60,
        currentPlayerTurn: nextAttacker,
        // Clear pending attempt data
        pendingAttackPlayerId: null,
        pendingAttackSpellId: null,
        pendingAttackGesture: null,
        pendingAttackAccuracy: null,
        pendingAttackTimeSpent: null,
        pendingCounterPlayerId: null,
        pendingCounterSpellId: null,
        pendingCounterGesture: null,
        pendingCounterAccuracy: null,
        pendingCounterTimeSpent: null
      };

      const updatedSession = await storage.updateGameSession(sessionId, updates);
      
      // Broadcast session update via WebSocket
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastSessionUpdate(sessionId, 'round_completed', {
          session: updatedSession,
          pointsAwarded: {
            player1: 0,
            player2: 0
          }
        });
      }
      
      res.json({
        session: updatedSession,
        pointsAwarded: {
          player1: 0, // Not used in new system, but kept for compatibility
          player2: 0  // Not used in new system, but kept for compatibility
        }
      });

    } catch (error) {
      console.error("Complete round error:", error);
      res.status(500).json({ message: "Failed to complete round" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

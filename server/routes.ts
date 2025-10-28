import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertGameSessionSchema, insertGestureAttemptSchema, insertSpellSchema, insertSessionParticipantSchema, insertGameRoomSchema, type Point, type GameSession } from "@shared/schema";
import { z } from "zod";
import type { IStorage } from "./storage";
import { evaluateDrawing } from "@shared/gesture-recognition";

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
      const session = await storage.createGameSession(sessionData);
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
      res.json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to join session" });
    }
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
          return {
            roundNumber: attempt.roundNumber,
            playerId: attempt.playerId,
            spell: spell,
            accuracy: attempt.accuracy,
            successful: attempt.successful,
            drawnGesture: attempt.drawnGesture,
            isBonusRound: attempt.isBonusRound || false
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

      // Log gesture recognition details
      console.log('\n=== GESTURE RECOGNITION DEBUG ===');
      console.log('Player gesture points:', gesture.length);
      console.log('Phase:', session.currentPhase);
      console.log('Spell matches:');
      spellMatches.forEach((match: any) => {
        console.log(`  - ${match.spell.name}: ${match.accuracy}% (pattern: ${(match.spell.gesturePattern as Point[]).length} points)`);
      });
      console.log('================================\n');

      // Get best match
      const bestMatch = spellMatches[0];

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

      // Require minimum 50% accuracy for recognition (more lenient threshold)
      if (!bestMatch || bestMatch.accuracy < 50) {
        // Save pending attempt data (will be saved to history when round completes)
        if (spellType === "attack") {
          await storage.updateGameSession(sessionId, {
            pendingAttackPlayerId: playerId,
            pendingAttackSpellId: bestMatch?.spell.id || null,
            pendingAttackGesture: gesture,
            pendingAttackAccuracy: bestMatch?.accuracy || 0
          });
        } else {
          await storage.updateGameSession(sessionId, {
            pendingCounterPlayerId: playerId,
            pendingCounterSpellId: bestMatch?.spell.id || null,
            pendingCounterGesture: gesture,
            pendingCounterAccuracy: bestMatch?.accuracy || 0
          });
        }
        
        // If in counter phase and no spell matched, it's wrong defense
        if (spellType === "counter") {
          return res.json({
            recognized: false,
            wrongDefenseUsed: true,
            spell: bestMatch?.spell || null,
            message: "Неверная защита! Вы использовали неправильное движение.",
            accuracy: bestMatch?.accuracy || 0
          });
        }
        
        // Check if the best match is a spell that has already been used
        if (bestMatch && spellType === "attack") {
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
        
        return res.json({
          recognized: false,
          message: "Жест не распознан. Попробуйте нарисовать точнее.",
          accuracy: bestMatch?.accuracy || 0
        });
      }

      // Find all successful matches (>= 50% accuracy) for attack spells (more lenient threshold)
      const successfulMatches = spellMatches.filter((m: any) => m.accuracy >= 50);
      
      // If multiple successful attack spells match, return them all for user to choose
      if (spellType === "attack" && successfulMatches.length > 1) {
        // Save pending data with first match as default (will be updated when user chooses)
        const firstMatch = successfulMatches[0];
        await storage.updateGameSession(sessionId, {
          pendingAttackPlayerId: playerId,
          pendingAttackSpellId: firstMatch.spell.id,
          pendingAttackGesture: gesture,
          pendingAttackAccuracy: firstMatch.accuracy
        });
        
        return res.json({
          recognized: true,
          multipleMatches: true,
          matches: successfulMatches.map((m: any) => ({
            spell: m.spell,
            accuracy: m.accuracy
          })),
          gesture, // Return gesture so frontend can pass it to save-spell-attempt
          message: "Multiple spells match this gesture. Please choose one."
        });
      }

      // Single match or counter spell - proceed normally
      const selectedSpell = bestMatch.spell;
      const selectedAccuracy = bestMatch.accuracy;

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
          currentPhase: selectedAccuracy >= 50 ? "counter" : session.currentPhase,
          lastAttackSpellId: selectedAccuracy >= 50 ? selectedSpell.id : session.lastAttackSpellId,
          lastAttackAccuracy: selectedAccuracy >= 50 ? selectedAccuracy : session.lastAttackAccuracy,
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
      } else {
        // Counter spell - save pending data first
        await storage.updateGameSession(sessionId, {
          pendingCounterPlayerId: playerId,
          pendingCounterSpellId: selectedSpell.id,
          pendingCounterGesture: gesture,
          pendingCounterAccuracy: selectedAccuracy
        });

        // Auto-complete round after counter spell is cast
        if (selectedAccuracy >= 52) {
          // Save both attack and counter attempts to history
          const currentRound = session.currentRound || 1;
          const attemptIsBonusRound = session.isBonusRound || false;
          
          // Save attack attempt from pending data
          if (session.pendingAttackSpellId && session.pendingAttackPlayerId) {
            await storage.createGestureAttempt({
              sessionId,
              playerId: session.pendingAttackPlayerId,
              spellId: session.pendingAttackSpellId,
              drawnGesture: session.pendingAttackGesture as Point[] || [],
              accuracy: session.pendingAttackAccuracy || 0,
              successful: (session.pendingAttackAccuracy || 0) >= 50,
              roundNumber: currentRound,
              isBonusRound: attemptIsBonusRound
            });
          }

          // Save counter attempt
          await storage.createGestureAttempt({
            sessionId,
            playerId: playerId,
            spellId: selectedSpell.id,
            drawnGesture: gesture,
            accuracy: selectedAccuracy,
            successful: selectedAccuracy >= 50 && isValidCounter,
            roundNumber: currentRound,
            isBonusRound: attemptIsBonusRound
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
          const counterSuccessful = selectedAccuracy >= 52 && isValidCounter;
          
          // Award 1 point to player with higher accuracy
          if (attackAccuracy > counterAccuracy) {
            // Attack player has higher accuracy
            if (session.pendingAttackPlayerId === 1) {
              player1Score += 1;
            } else {
              player2Score += 1;
            }
          } else if (counterAccuracy > attackAccuracy) {
            // Counter player has higher accuracy
            if (playerId === 1) {
              player1Score += 1;
            } else {
              player2Score += 1;
            }
          }
          // If accuracies are equal, no points are awarded

          // Check if scores are equal after 10 rounds to trigger bonus round
          const nextRound = currentRound + 1;
          let isGameComplete = nextRound > 10;
          let gameStatus: "active" | "completed" | "paused" = isGameComplete ? "completed" : "active";
          let isBonusRound = false;
          let bonusRoundWinner = null;
          
          // If we're at the end of round 10, check for tie
          if (currentRound === 10 && player1Score === player2Score) {
            // Scores are tied, start bonus round
            isGameComplete = false; // Don't complete game yet
            gameStatus = "active";
            isBonusRound = true;
            // Keep same round number for bonus round
          }
          
          // If this is a bonus round, check if we have a winner
          if (session.isBonusRound) {
            // Determine winner based on higher accuracy in the bonus round
            if (attackAccuracy > counterAccuracy) {
              bonusRoundWinner = session.pendingAttackPlayerId;
            } else if (counterAccuracy > attackAccuracy) {
              bonusRoundWinner = playerId;
            }
            // If accuracies are equal, continue with another bonus round
            if (attackAccuracy === counterAccuracy) {
              isGameComplete = false; // Don't complete game yet
              gameStatus = "active";
              isBonusRound = true; // Continue with bonus round
              // Keep same round number for bonus round
            } else {
              // Complete the game since bonus round is over with a winner
              isGameComplete = true;
              gameStatus = "completed";
            }
          }
          
          // Advance to next round or complete game
          await storage.updateGameSession(sessionId, {
            currentRound: isBonusRound ? (session.isBonusRound ? currentRound + 1 : 11) : nextRound, // For bonus rounds, start at 11 and increment
            currentPhase: isGameComplete ? null : "attack",
            player1Score: player1Score.toString(),
            player2Score: player2Score.toString(),
            gameStatus,
            isBonusRound,
            bonusRoundWinner,
            // Save last completed round data for dialog display
            lastCompletedRoundNumber: session.isBonusRound ? currentRound : currentRound,
            lastCompletedAttackSpellId: session.pendingAttackSpellId,
            lastCompletedAttackAccuracy: session.pendingAttackAccuracy,
            lastCompletedAttackGesture: session.pendingAttackGesture,
            lastCompletedCounterSpellId: selectedSpell.id,
            lastCompletedCounterAccuracy: selectedAccuracy,
            lastCompletedCounterGesture: gesture,
            lastCompletedCounterSuccess: counterSuccessful,
            // Clear pending data
            pendingAttackPlayerId: null,
            pendingAttackSpellId: null,
            pendingAttackGesture: null,
            pendingAttackAccuracy: null,
            pendingCounterPlayerId: null,
            pendingCounterSpellId: null,
            pendingCounterGesture: null,
            pendingCounterAccuracy: null,
            lastAttackSpellId: null,
            lastAttackAccuracy: null
          });
        }
      }

      res.json({
        recognized: true,
        spell: selectedSpell,
        accuracy: selectedAccuracy,
        isValidCounter,
        wrongDefenseUsed,
        successful: selectedAccuracy >= 52 && (spellType === "attack" || isValidCounter)
      });

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

      // Update used spells for this player
      const usedSpellIds = playerId === 1
        ? (session.player1UsedAttackSpells as string[] || [])
        : (session.player2UsedAttackSpells as string[] || []);
      
      // Add this spell to the player's used spells if not already there
      let updatedUsedSpells = [...usedSpellIds];
      if (!updatedUsedSpells.includes(spellId)) {
        updatedUsedSpells.push(spellId);
      }
      
      const updateData: Partial<GameSession> = {
        pendingAttackPlayerId: playerId,
        pendingAttackSpellId: spellId,
        pendingAttackGesture: gesture,
        pendingAttackAccuracy: accuracy,
        currentPhase: accuracy >= 50 ? "counter" : session.currentPhase,
        lastAttackSpellId: accuracy >= 50 ? spellId : session.lastAttackSpellId,
        lastAttackAccuracy: accuracy >= 50 ? accuracy : session.lastAttackAccuracy
      };
      
      // Update player's used attack spells
      if (playerId === 1) {
        updateData.player1UsedAttackSpells = updatedUsedSpells;
      } else {
        updateData.player2UsedAttackSpells = updatedUsedSpells;
      }
      
      // Save pending attempt data (will be saved to history when round completes)
      // This is always attack phase (multiple matches only happen for attack spells)
      await storage.updateGameSession(sessionId, updateData);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Save spell attempt error:", error);
      res.status(500).json({ message: "Failed to save spell attempt" });
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
          successful: (session.pendingAttackAccuracy ?? 0) >= 50,
          isBonusRound: session.isBonusRound || false
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
          successful: counterSuccess && (session.pendingCounterAccuracy ?? 0) >= 50,
          isBonusRound: session.isBonusRound || false
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
        // If Player 1 was attacking (attackAccuracy = 0), Player 2 (defender) gets the point
        // If Player 2 was attacking (counterAccuracy = 0), Player 1 (defender) gets the point
        if (attackAccuracy === 0 && counterAccuracy === 100) {
          // Player 1 was attacker and timed out, Player 2 gets the point
          player2Score += 1;
        } else if (attackAccuracy === 100 && counterAccuracy === 0) {
          // Player 2 was attacker and timed out, Player 1 gets the point
          player1Score += 1;
        }
      } else {
        // Normal case - award point to player with higher accuracy
        if (attackAccuracy > counterAccuracy) {
          // Attack player has higher accuracy
          // Determine which player is the attack player based on current round
          const currentRoundNum = session.currentRound || 1;
          const isOddRound = currentRoundNum % 2 === 1;
          const isBonusRound = session.isBonusRound || false;
          const attackPlayer = isBonusRound ? 1 : (isOddRound ? 1 : 2);
          
          if (attackPlayer === 1) {
            player1Score += 1;
          } else {
            player2Score += 1;
          }
        } else if (counterAccuracy > attackAccuracy) {
          // Counter player has higher accuracy
          // Determine which player is the counter player based on current round
          const currentRoundNum = session.currentRound || 1;
          const isOddRound = currentRoundNum % 2 === 1;
          const isBonusRound = session.isBonusRound || false;
          const counterPlayer = isBonusRound ? 2 : (isOddRound ? 2 : 1);
          
          if (counterPlayer === 1) {
            player1Score += 1;
          } else {
            player2Score += 1;
          }
        }
        // If accuracies are equal, no points are awarded
      }

      // Check if scores are equal after 10 rounds to trigger bonus round
      const nextRound = currentRound + 1;
      let isGameComplete = nextRound > 10;
      let gameStatus: "active" | "completed" | "paused" = isGameComplete ? "completed" : (session.gameStatus || "active");
      let isBonusRound = false;
      let bonusRoundWinner = null;
      
      // If we're at the end of round 10, check for tie
      if (currentRound === 10 && player1Score === player2Score) {
        // Scores are tied, start bonus round
        isGameComplete = false; // Don't complete game yet
        gameStatus = "active";
        isBonusRound = true;
        // Keep same round number for bonus round
      }
      
      // If this is a bonus round, check if we have a winner
      if (session.isBonusRound) {
        // Determine winner based on higher accuracy in the bonus round
        if (attackAccuracy > counterAccuracy) {
          // In bonus rounds, Player 1 is always the attacker
          bonusRoundWinner = 1;
        } else if (counterAccuracy > attackAccuracy) {
          // In bonus rounds, Player 2 is always the counter
          bonusRoundWinner = 2;
        }
        // If accuracies are equal, continue with another bonus round
        if (attackAccuracy === counterAccuracy) {
          isGameComplete = false; // Don't complete game yet
          gameStatus = "active";
          isBonusRound = true; // Continue with bonus round
          // Keep same round number for bonus round
        } else {
          // Complete the game since bonus round is over with a winner
          isGameComplete = true;
          gameStatus = "completed";
        }
      }
      
      // Determine attacker for next round
      // Odd rounds (1,3,5,7,9): Player 1 attacks
      // Even rounds (2,4,6,8,10): Player 2 attacks
      // For bonus round, Player 1 always attacks first
      const nextAttacker = isBonusRound ? 1 : (nextRound % 2 === 1 ? 1 : 2);
      
      const updates = {
        currentRound: isBonusRound ? (session.isBonusRound ? currentRound + 1 : 11) : nextRound, // For bonus rounds, start at 11 and increment
        currentPlayer: nextAttacker,
        currentPhase: "attack" as const,
        player1Score: player1Score.toString(),
        player2Score: player2Score.toString(),
        lastAttackSpellId: null,
        lastAttackAccuracy: null,
        gameStatus,
        isBonusRound,
        bonusRoundWinner,
        // Clear pending attempt data
        pendingAttackPlayerId: null,
        pendingAttackSpellId: null,
        pendingAttackGesture: null,
        pendingAttackAccuracy: null,
        pendingCounterPlayerId: null,
        pendingCounterSpellId: null,
        pendingCounterGesture: null,
        pendingCounterAccuracy: null
      };

      const updatedSession = await storage.updateGameSession(sessionId, updates);
      
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

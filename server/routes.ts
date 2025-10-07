import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertGestureAttemptSchema, insertSpellSchema, insertSessionParticipantSchema, insertGameRoomSchema, type Point } from "@shared/schema";
import { z } from "zod";

// Gesture recognition function
function calculateGestureAccuracy(drawnGesture: Point[], targetPattern: Point[]): number {
  if (drawnGesture.length < 1 || targetPattern.length < 1) {
    return 0;
  }

  // Special case: both gestures are single points
  if (drawnGesture.length === 1 && targetPattern.length === 1) {
    const drawn = drawnGesture[0];
    const target = targetPattern[0];
    
    // Calculate distance between the two points
    const dx = drawn.x - target.x;
    const dy = drawn.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize distance to canvas size (assuming 400x400 canvas)
    const maxDistance = Math.sqrt(400 * 400 + 400 * 400);
    const similarity = Math.max(0, 1 - (distance / maxDistance));
    
    return Math.round(similarity * 100);
  }

  // If one gesture is a single point and the other is multi-point, they can't match
  if ((drawnGesture.length === 1 && targetPattern.length > 1) || 
      (drawnGesture.length > 1 && targetPattern.length === 1)) {
    return 0;
  }

  // Normalize both gestures to 0-100 coordinate space
  const normalizeGesture = (gesture: Point[]) => {
    const minX = Math.min(...gesture.map(p => p.x));
    const maxX = Math.max(...gesture.map(p => p.x));
    const minY = Math.min(...gesture.map(p => p.y));
    const maxY = Math.max(...gesture.map(p => p.y));
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    
    return gesture.map(p => ({
      x: ((p.x - minX) / width) * 100,
      y: ((p.y - minY) / height) * 100
    }));
  };

  const normalizedDrawn = normalizeGesture(drawnGesture);
  const normalizedTarget = normalizeGesture(targetPattern);

  // Resample both gestures to have the same number of points
  const resampleGesture = (gesture: Point[], targetLength: number) => {
    if (gesture.length === targetLength) return gesture;
    
    const resampled: Point[] = [];
    const step = (gesture.length - 1) / (targetLength - 1);
    
    for (let i = 0; i < targetLength; i++) {
      const index = i * step;
      const lowerIndex = Math.floor(index);
      const upperIndex = Math.ceil(index);
      
      if (lowerIndex === upperIndex) {
        resampled.push(gesture[lowerIndex]);
      } else {
        const t = index - lowerIndex;
        const p1 = gesture[lowerIndex];
        const p2 = gesture[upperIndex];
        
        resampled.push({
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y)
        });
      }
    }
    
    return resampled;
  };

  const sampleCount = Math.max(normalizedDrawn.length, normalizedTarget.length);
  const resampledDrawn = resampleGesture(normalizedDrawn, sampleCount);
  const resampledTarget = resampleGesture(normalizedTarget, sampleCount);

  // Calculate similarity using euclidean distance
  let totalDistance = 0;
  for (let i = 0; i < sampleCount; i++) {
    const dx = resampledDrawn[i].x - resampledTarget[i].x;
    const dy = resampledDrawn[i].y - resampledTarget[i].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  const maxPossibleDistance = sampleCount * Math.sqrt(100 * 100 + 100 * 100); // Max diagonal distance
  const similarity = Math.max(0, 1 - (totalDistance / maxPossibleDistance));
  
  // No multiplier - use raw similarity percentage for maximum strictness
  return Math.min(100, Math.round(similarity * 100));
}

export async function registerRoutes(app: Express): Promise<Server> {
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
      const { userId, userName, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
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
          playerNumber
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
        playerNumber: null
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
      
      // Get spell details for each attempt
      const historyWithSpells = await Promise.all(
        attempts.map(async (attempt) => {
          const spell = attempt.spellId ? await storage.getSpellById(attempt.spellId) : null;
          return {
            roundNumber: attempt.roundNumber,
            playerId: attempt.playerId,
            spell: spell,
            accuracy: attempt.accuracy,
            successful: attempt.successful
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
      const { gesture, playerId } = req.body;
      
      if (!gesture || !Array.isArray(gesture) || gesture.length < 1) {
        return res.status(400).json({ message: "Invalid gesture data" });
      }

      const session = await storage.getGameSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Game session not found" });
      }

      // Get appropriate spells based on current phase
      const spellType = session.currentPhase === "attack" ? "attack" : "counter";
      let availableSpells = await storage.getSpellsByType(spellType);

      // If it's counter phase, filter by spells that can counter the last attack
      if (spellType === "counter" && session.lastAttackSpellId) {
        const lastAttackSpell = await storage.getSpellById(session.lastAttackSpellId);
        if (lastAttackSpell) {
          availableSpells = availableSpells.filter(spell => 
            spell.counters && Array.isArray(spell.counters) && 
            spell.counters.includes(lastAttackSpell.id)
          );
        }
      }

      // Calculate accuracy for all spells
      const spellMatches = availableSpells.map(spell => {
        const patternPoints = (spell.gesturePattern as Point[]).length;
        const gesturePoints = gesture.length;
        
        // Check for gesture complexity mismatch
        // If pattern has many points (>10) but gesture has few (<10), it's wrong
        if (patternPoints > 10 && gesturePoints < 10) {
          return { spell, accuracy: 0 };
        }
        // If pattern has few points (<10) but gesture has many (>10), it's wrong  
        if (patternPoints < 10 && gesturePoints > 10) {
          return { spell, accuracy: 0 };
        }
        
        return {
          spell,
          accuracy: calculateGestureAccuracy(gesture, spell.gesturePattern as Point[])
        };
      }).sort((a, b) => b.accuracy - a.accuracy);

      // Log gesture recognition details
      console.log('\n=== GESTURE RECOGNITION DEBUG ===');
      console.log('Player gesture points:', gesture.length);
      console.log('Phase:', session.currentPhase);
      console.log('Spell matches:');
      spellMatches.forEach(match => {
        console.log(`  - ${match.spell.name}: ${match.accuracy}% (pattern: ${(match.spell.gesturePattern as Point[]).length} points)`);
      });
      console.log('================================\n');

      // Get best match
      const bestMatch = spellMatches[0];

      // Require minimum 50% accuracy for recognition
      if (!bestMatch || bestMatch.accuracy < 50) {
        // If in counter phase and no spell matched, it's wrong defense
        if (spellType === "counter") {
          // Save failed gesture attempt so it appears in history with red X
          const attemptData = insertGestureAttemptSchema.parse({
            sessionId,
            playerId,
            roundNumber: session.currentRound,
            spellId: bestMatch?.spell.id || null,
            drawnGesture: gesture,
            accuracy: bestMatch?.accuracy || 0,
            successful: false
          });
          await storage.createGestureAttempt(attemptData);
          
          return res.json({
            recognized: false,
            wrongDefenseUsed: true,
            spell: bestMatch?.spell || null,
            message: "Неверная защита! Вы использовали неправильное движение.",
            accuracy: bestMatch?.accuracy || 0
          });
        }
        
        return res.json({
          recognized: false,
          message: "Gesture not recognized. Try again with more precision.",
          accuracy: bestMatch?.accuracy || 0
        });
      }

      // Find all successful matches (>= 60% accuracy) for attack spells
      const successfulMatches = spellMatches.filter(m => m.accuracy >= 60);
      
      // If multiple successful attack spells match, return them all for user to choose
      if (spellType === "attack" && successfulMatches.length > 1) {
        return res.json({
          recognized: true,
          multipleMatches: true,
          matches: successfulMatches.map(m => ({
            spell: m.spell,
            accuracy: m.accuracy
          })),
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

      // Create gesture attempt record with correct successful value
      const attemptData = insertGestureAttemptSchema.parse({
        sessionId,
        playerId,
        roundNumber: session.currentRound,
        spellId: selectedSpell.id,
        drawnGesture: gesture,
        accuracy: selectedAccuracy,
        successful: selectedAccuracy >= 60 && (spellType === "attack" || isValidCounter)
      });

      await storage.createGestureAttempt(attemptData);

      // If it's a successful attack spell, update session phase and save the spell
      if (spellType === "attack" && selectedAccuracy >= 60) {
        await storage.updateGameSession(sessionId, {
          currentPhase: "counter",
          lastAttackSpellId: selectedSpell.id,
          lastAttackAccuracy: selectedAccuracy
        });
      }

      res.json({
        recognized: true,
        spell: selectedSpell,
        accuracy: selectedAccuracy,
        isValidCounter,
        wrongDefenseUsed,
        successful: selectedAccuracy >= 60 && (spellType === "attack" || isValidCounter)
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

      const attemptData = insertGestureAttemptSchema.parse({
        sessionId,
        playerId,
        roundNumber: session.currentRound,
        spellId,
        drawnGesture: gesture,
        accuracy,
        successful: accuracy >= 60
      });

      const savedAttempt = await storage.createGestureAttempt(attemptData);
      console.log("Saved attempt:", savedAttempt);
      
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

      // Award points based on performance
      let player1ScoreIncrease = 0;
      let player2ScoreIncrease = 0;

      // Player 1 gets points for successful attack
      if (player1Accuracy >= 60) {
        player1ScoreIncrease = Math.floor(player1Accuracy / 15); // 4-6 points based on accuracy
      }

      // Player 2 gets points for successful counter
      if (counterSuccess && player2Accuracy >= 60) {
        player2ScoreIncrease = Math.floor(player2Accuracy / 12); // 5-8 points based on accuracy
      }

      // Update game session
      const currentRound = session.currentRound ?? 1;
      const player1Score = session.player1Score ?? 0;
      const player2Score = session.player2Score ?? 0;
      
      // Game ends after 5 rounds or when a player reaches winning score
      const nextRound = currentRound + 1;
      const isGameComplete = nextRound > 5;
      
      const updates = {
        currentRound: nextRound,
        currentPlayer: 1, // Player 1 always attacks
        currentPhase: "attack" as const,
        player1Score: player1Score + player1ScoreIncrease,
        player2Score: player2Score + player2ScoreIncrease,
        lastAttackSpellId: null,
        lastAttackAccuracy: null,
        gameStatus: isGameComplete ? "completed" as const : session.gameStatus
      };

      const updatedSession = await storage.updateGameSession(sessionId, updates);
      
      res.json({
        session: updatedSession,
        pointsAwarded: {
          player1: player1ScoreIncrease,
          player2: player2ScoreIncrease
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

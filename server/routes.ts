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
  
  return Math.round(similarity * 100);
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

      // Find best matching spell
      let bestMatch = null;
      let bestAccuracy = 0;

      for (const spell of availableSpells) {
        const accuracy = calculateGestureAccuracy(gesture, spell.gesturePattern as Point[]);
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestMatch = spell;
        }
      }

      // Require minimum 60% accuracy for recognition
      if (!bestMatch || bestAccuracy < 60) {
        return res.json({
          recognized: false,
          message: "Gesture not recognized. Try again with more precision.",
          accuracy: bestAccuracy
        });
      }

      // Create gesture attempt record
      const attemptData = insertGestureAttemptSchema.parse({
        sessionId,
        playerId,
        spellId: bestMatch.id,
        drawnGesture: gesture,
        accuracy: bestAccuracy,
        successful: bestAccuracy >= 70
      });

      await storage.createGestureAttempt(attemptData);

      // For counter spells, validate if it's the correct counter
      let isValidCounter = true;
      if (spellType === "counter" && session.lastAttackSpellId) {
        const counters = bestMatch.counters as string[] | null;
        isValidCounter = counters !== null && 
          Array.isArray(counters) && 
          counters.includes(session.lastAttackSpellId);
      }

      // If it's a successful attack spell, update session phase and save the spell
      if (spellType === "attack" && bestAccuracy >= 70) {
        await storage.updateGameSession(sessionId, {
          currentPhase: "counter",
          lastAttackSpellId: bestMatch.id,
          lastAttackAccuracy: bestAccuracy
        });
      }

      res.json({
        recognized: true,
        spell: bestMatch,
        accuracy: bestAccuracy,
        isValidCounter,
        successful: bestAccuracy >= 70 && (spellType === "attack" || isValidCounter)
      });

    } catch (error) {
      console.error("Gesture recognition error:", error);
      res.status(500).json({ message: "Failed to recognize gesture" });
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
      if (player1Accuracy >= 70) {
        player1ScoreIncrease = Math.floor(player1Accuracy / 20); // 3-5 points based on accuracy
      }

      // Player 2 gets points for successful counter
      if (counterSuccess && player2Accuracy >= 70) {
        player2ScoreIncrease = Math.floor(player2Accuracy / 15); // 4-6 points based on accuracy
      }

      // Update game session
      const currentRound = session.currentRound ?? 1;
      const currentPlayer = session.currentPlayer ?? 1;
      const player1Score = session.player1Score ?? 0;
      const player2Score = session.player2Score ?? 0;
      
      const updates = {
        currentRound: currentRound + 1,
        currentPlayer: currentPlayer === 1 ? 2 : 1,
        currentPhase: "attack" as const,
        player1Score: player1Score + player1ScoreIncrease,
        player2Score: player2Score + player2ScoreIncrease,
        lastAttackSpellId: null,
        lastAttackAccuracy: null,
        gameStatus: (player1Score + player1ScoreIncrease >= 10 || 
                    player2Score + player2ScoreIncrease >= 10) ? 
                    "completed" as const : session.gameStatus
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

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSessionSchema, insertGestureAttemptSchema, insertSpellSchema, insertSessionParticipantSchema, insertGameRoomSchema, type Point } from "@shared/schema";
import { z } from "zod";

// Gesture recognition function with MAXIMUM STRICTNESS
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

  // Minimum points requirement: need at least 5 points for a valid gesture
  if (drawnGesture.length < 5) {
    return 0;
  }

  // Normalize to 0-100 space WITH centering - but use strict penalties elsewhere
  const normalizeGestureStrict = (gesture: Point[]) => {
    const minX = Math.min(...gesture.map(p => p.x));
    const maxX = Math.max(...gesture.map(p => p.x));
    const minY = Math.min(...gesture.map(p => p.y));
    const maxY = Math.max(...gesture.map(p => p.y));
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    
    // Scale to fit in 100x100 space while preserving aspect ratio
    const scale = Math.max(width, height);
    
    // Center the gesture in 100x100 space for position invariance
    const offsetX = (100 - (width / scale * 100)) / 2;
    const offsetY = (100 - (height / scale * 100)) / 2;
    
    return gesture.map(p => ({
      x: ((p.x - minX) / scale) * 100 + offsetX,
      y: ((p.y - minY) / scale) * 100 + offsetY
    }));
  };

  const normalizedDrawn = normalizeGestureStrict(drawnGesture);
  const normalizedTarget = normalizeGestureStrict(targetPattern);
  
  // Calculate aspect ratio difference penalty (stricter)
  const getAspectRatio = (gesture: Point[]) => {
    const minX = Math.min(...gesture.map(p => p.x));
    const maxX = Math.max(...gesture.map(p => p.x));
    const minY = Math.min(...gesture.map(p => p.y));
    const maxY = Math.max(...gesture.map(p => p.y));
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    return width / height;
  };
  
  const drawnAspectRatio = getAspectRatio(drawnGesture);
  const targetAspectRatio = getAspectRatio(targetPattern);
  const aspectRatioDiff = Math.abs(drawnAspectRatio - targetAspectRatio) / Math.max(drawnAspectRatio, targetAspectRatio);
  // Multiplicative penalty - max 10% reduction
  const aspectRatioPenaltyFactor = Math.min(0.10, aspectRatioDiff * 0.15);

  // Penalty for point count mismatch (both too many or too few)
  const targetPointCount = (targetPattern as Point[]).length;
  const drawnPointCount = drawnGesture.length;
  const pointCountRatio = drawnPointCount / targetPointCount;
  let pointCountPenaltyFactor = 0;
  
  // For very simple patterns (1-2 points), be very lenient
  if (targetPointCount <= 2) {
    // Simple patterns: minimal penalty
    if (pointCountRatio > 15) {
      pointCountPenaltyFactor = 0.05; // Very mild penalty only for extreme cases
    }
    // No penalty for too few points on simple patterns
  } else {
    // Complex patterns: apply moderate penalties
    // Penalty for too many points (scribbling/filling)
    if (pointCountRatio > 5) {
      pointCountPenaltyFactor = Math.min(0.10, (pointCountRatio - 5) * 0.03); // Up to 10% penalty
    }
    
    // Penalty for too few points (insufficient detail)
    if (pointCountRatio < 0.4) {
      pointCountPenaltyFactor = Math.min(0.10, (0.4 - pointCountRatio) * 0.3); // Up to 10% penalty
    }
  }
  
  console.log(`[Gesture Debug] Drawn: ${drawnPointCount} points, Target: ${targetPointCount} points, Ratio: ${pointCountRatio.toFixed(2)}, Point penalty: ${(pointCountPenaltyFactor * 100).toFixed(1)}%, Aspect penalty: ${(aspectRatioPenaltyFactor * 100).toFixed(1)}%`);

  // Resample to same number of points for comparison
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

  const sampleCount = 64;
  const resampledDrawn = resampleGesture(normalizedDrawn, sampleCount);
  const resampledTarget = resampleGesture(normalizedTarget, sampleCount);

  // Try multiple starting offsets - more variants for better recognition
  let bestDistance = Infinity;
  const offsetsToTry = [0, sampleCount / 8, sampleCount / 5, sampleCount / 3, sampleCount / 2, (sampleCount * 2) / 3, (sampleCount * 7) / 8]; // Try 0%, 12.5%, 20%, 33%, 50%, 67%, 87.5% offsets
  
  for (const offset of offsetsToTry) {
    let distance = 0;
    for (let i = 0; i < sampleCount; i++) {
      const targetIndex = Math.floor((i + offset) % sampleCount);
      const dx = resampledDrawn[i].x - resampledTarget[targetIndex].x;
      const dy = resampledDrawn[i].y - resampledTarget[targetIndex].y;
      distance += Math.sqrt(dx * dx + dy * dy);
    }
    
    if (distance < bestDistance) {
      bestDistance = distance;
    }
  }
  
  const totalDistance = bestDistance;

  // Use stricter similarity calculation
  const maxPossibleDistance = sampleCount * Math.sqrt(100 * 100 + 100 * 100);
  let baseSimilarity = Math.max(0, 1 - (totalDistance / maxPossibleDistance));
  
  console.log(`[Gesture Debug] Base similarity before penalties: ${(baseSimilarity * 100).toFixed(1)}%`);
  
  // Apply penalties multiplicatively (reduces impact, keeps good matches high)
  baseSimilarity = baseSimilarity * (1 - aspectRatioPenaltyFactor) * (1 - pointCountPenaltyFactor);
  
  // No exponential strictness - direct score
  
  const finalAccuracy = Math.min(100, Math.round(baseSimilarity * 100));
  console.log(`[Gesture Debug] Final accuracy after penalties: ${finalAccuracy}%`);
  
  return finalAccuracy;
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
      
      // Get spell details for each attempt
      const historyWithSpells = await Promise.all(
        attempts.map(async (attempt) => {
          const spell = attempt.spellId ? await storage.getSpellById(attempt.spellId) : null;
          return {
            roundNumber: attempt.roundNumber,
            playerId: attempt.playerId,
            spell: spell,
            accuracy: attempt.accuracy,
            successful: attempt.successful,
            drawnGesture: attempt.drawnGesture
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

      // Filter by color if colorFilter is provided
      if (colorFilter) {
        availableSpells = availableSpells.filter(spell => spell.colorName === colorFilter);
      }

      // Calculate accuracy for all spells
      const spellMatches = availableSpells.map(spell => {
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

      // Require minimum 52% accuracy for recognition (balanced threshold)
      if (!bestMatch || bestMatch.accuracy < 52) {
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
        
        return res.json({
          recognized: false,
          message: "Жест не распознан. Попробуйте нарисовать точнее.",
          accuracy: bestMatch?.accuracy || 0
        });
      }

      // Find all successful matches (>= 52% accuracy) for attack spells (balanced threshold)
      const successfulMatches = spellMatches.filter(m => m.accuracy >= 52);
      
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
          matches: successfulMatches.map(m => ({
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
        await storage.updateGameSession(sessionId, {
          pendingAttackPlayerId: playerId,
          pendingAttackSpellId: selectedSpell.id,
          pendingAttackGesture: gesture,
          pendingAttackAccuracy: selectedAccuracy,
          currentPhase: selectedAccuracy >= 52 ? "counter" : session.currentPhase,
          lastAttackSpellId: selectedAccuracy >= 52 ? selectedSpell.id : session.lastAttackSpellId,
          lastAttackAccuracy: selectedAccuracy >= 52 ? selectedAccuracy : session.lastAttackAccuracy,
          // Clear lastCompleted data when new attack starts (so previous round dialog data is removed)
          lastCompletedRoundNumber: null,
          lastCompletedAttackSpellId: null,
          lastCompletedAttackAccuracy: null,
          lastCompletedAttackGesture: null,
          lastCompletedCounterSpellId: null,
          lastCompletedCounterAccuracy: null,
          lastCompletedCounterGesture: null,
          lastCompletedCounterSuccess: null
        });
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
          
          // Save attack attempt from pending data
          if (session.pendingAttackSpellId && session.pendingAttackPlayerId) {
            await storage.createGestureAttempt({
              sessionId,
              playerId: session.pendingAttackPlayerId,
              spellId: session.pendingAttackSpellId,
              drawnGesture: session.pendingAttackGesture as Point[] || [],
              accuracy: session.pendingAttackAccuracy || 0,
              successful: (session.pendingAttackAccuracy || 0) >= 52,
              roundNumber: currentRound
            });
          }

          // Save counter attempt
          await storage.createGestureAttempt({
            sessionId,
            playerId: playerId,
            spellId: selectedSpell.id,
            drawnGesture: gesture,
            accuracy: selectedAccuracy,
            successful: selectedAccuracy >= 52 && isValidCounter,
            roundNumber: currentRound
          });

          // Update scores based on spell complexity
          const updatedSession = await storage.getGameSession(sessionId);
          if (!updatedSession) {
            throw new Error("Session not found");
          }

          let player1Score = Number(updatedSession.player1Score) || 0;
          let player2Score = Number(updatedSession.player2Score) || 0;

          // Determine who is attacker and defender in current round
          // Odd rounds (1,3,5,7,9): Player 1 attacks, Player 2 defends
          // Even rounds (2,4,6,8,10): Player 2 attacks, Player 1 defends
          const isOddRound = currentRound % 2 === 1;
          const attackerPlayerId = isOddRound ? 1 : 2;
          const defenderPlayerId = isOddRound ? 2 : 1;

          // Helper function to calculate accuracy bonus
          const getAccuracyBonus = (accuracy: number, patternPoints: number, isAttack: boolean): number => {
            // 1-point attack spells get no bonus
            if (isAttack && patternPoints === 1) {
              return 0;
            }
            
            // 1-point defense spells get max 0.5 bonus
            const maxBonus = (!isAttack && patternPoints === 1) ? 0.5 : 3;
            
            if (accuracy >= 55 && accuracy <= 70) {
              return Math.min(1, maxBonus);
            } else if (accuracy >= 71 && accuracy <= 90) {
              return Math.min(2, maxBonus);
            } else if (accuracy >= 91 && accuracy <= 100) {
              return Math.min(3, maxBonus);
            }
            return 0;
          };

          // Award attacker points if attack was successful (>= 52%)
          const attackSuccessful = (session.pendingAttackAccuracy || 0) >= 52;
          if (attackSuccessful && session.pendingAttackSpellId) {
            const attackSpell = await storage.getSpellById(session.pendingAttackSpellId);
            if (attackSpell && attackSpell.gesturePattern) {
              const patternPoints = (attackSpell.gesturePattern as any[]).length;
              let baseAttackPoints = 0;
              
              if (patternPoints === 1) {
                baseAttackPoints = 1;
              } else if (patternPoints >= 2 && patternPoints <= 10) {
                baseAttackPoints = 3;
              } else if (patternPoints >= 11) {
                baseAttackPoints = 4;
              }
              
              const accuracyBonus = getAccuracyBonus(session.pendingAttackAccuracy || 0, patternPoints, true);
              const attackPoints = baseAttackPoints + accuracyBonus;
              
              if (attackerPlayerId === 1) {
                player1Score += attackPoints;
              } else {
                player2Score += attackPoints;
              }
            }
          }

          // Award defender points if counter was successful (>= 52% AND valid counter)
          const counterSuccessful = selectedAccuracy >= 52 && isValidCounter;
          if (counterSuccessful) {
            const counterSpell = selectedSpell;
            if (counterSpell && counterSpell.gesturePattern) {
              const patternPoints = (counterSpell.gesturePattern as any[]).length;
              let baseDefensePoints = 0;
              
              if (patternPoints === 1) {
                baseDefensePoints = 2;
              } else if (patternPoints >= 2 && patternPoints <= 10) {
                baseDefensePoints = 4;
              } else if (patternPoints >= 11) {
                baseDefensePoints = 5;
              }
              
              const accuracyBonus = getAccuracyBonus(selectedAccuracy, patternPoints, false);
              const defensePoints = baseDefensePoints + accuracyBonus;
              
              if (defenderPlayerId === 1) {
                player1Score += defensePoints;
              } else {
                player2Score += defensePoints;
              }
            }
          }

          // Determine if game is complete (after 10 rounds)
          const nextRound = currentRound + 1;
          const isGameComplete = nextRound > 10;
          const gameStatus = isGameComplete ? "completed" : "active";
          
          // Advance to next round or complete game
          await storage.updateGameSession(sessionId, {
            currentRound: nextRound,
            currentPhase: isGameComplete ? null : "attack",
            player1Score: player1Score.toString(),
            player2Score: player2Score.toString(),
            gameStatus,
            // Save last completed round data for dialog display
            lastCompletedRoundNumber: currentRound,
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

      // Save pending attempt data (will be saved to history when round completes)
      // This is always attack phase (multiple matches only happen for attack spells)
      await storage.updateGameSession(sessionId, {
        pendingAttackPlayerId: playerId,
        pendingAttackSpellId: spellId,
        pendingAttackGesture: gesture,
        pendingAttackAccuracy: accuracy,
        currentPhase: accuracy >= 52 ? "counter" : session.currentPhase,
        lastAttackSpellId: accuracy >= 52 ? spellId : session.lastAttackSpellId,
        lastAttackAccuracy: accuracy >= 52 ? accuracy : session.lastAttackAccuracy
      });
      
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
          successful: (session.pendingAttackAccuracy ?? 0) >= 52
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
          successful: counterSuccess && (session.pendingCounterAccuracy ?? 0) >= 52
        });
        await storage.createGestureAttempt(counterAttemptData);
        console.log("Counter attempt saved!");
      } else {
        console.log("No counter attempt to save (pendingCounterPlayerId is null/undefined)");
      }
      console.log("===============================================");

      // Helper function to calculate accuracy bonus
      const getAccuracyBonus = (accuracy: number, patternPoints: number, isAttack: boolean): number => {
        // 1-point attack spells get no bonus
        if (isAttack && patternPoints === 1) {
          return 0;
        }
        
        // 1-point defense spells get max 0.5 bonus
        const maxBonus = (!isAttack && patternPoints === 1) ? 0.5 : 3;
        
        if (accuracy >= 55 && accuracy <= 70) {
          return Math.min(1, maxBonus);
        } else if (accuracy >= 71 && accuracy <= 90) {
          return Math.min(2, maxBonus);
        } else if (accuracy >= 91 && accuracy <= 100) {
          return Math.min(3, maxBonus);
        }
        return 0;
      };

      // Award points based on spell complexity (pattern point count)
      let player1ScoreIncrease = 0;
      let player2ScoreIncrease = 0;

      // Determine who is attacker and defender in current round
      // Odd rounds (1,3,5,7,9): Player 1 attacks, Player 2 defends
      // Even rounds (2,4,6,8,10): Player 2 attacks, Player 1 defends
      const isOddRound = currentRound % 2 === 1;
      const attackerPlayerId = isOddRound ? 1 : 2;
      const defenderPlayerId = isOddRound ? 2 : 1;

      // Get attack spell and calculate attacker points
      if (session.pendingAttackSpellId && session.pendingAttackAccuracy && session.pendingAttackAccuracy >= 52) {
        const attackSpell = await storage.getSpellById(session.pendingAttackSpellId);
        if (attackSpell && attackSpell.gesturePattern) {
          const patternPoints = (attackSpell.gesturePattern as any[]).length;
          let baseAttackPoints = 0;
          
          if (patternPoints === 1) {
            baseAttackPoints = 1;
          } else if (patternPoints >= 2 && patternPoints <= 10) {
            baseAttackPoints = 3;
          } else if (patternPoints >= 11) {
            baseAttackPoints = 4;
          }
          
          const accuracyBonus = getAccuracyBonus(session.pendingAttackAccuracy, patternPoints, true);
          const attackPoints = baseAttackPoints + accuracyBonus;
          
          if (attackerPlayerId === 1) {
            player1ScoreIncrease = attackPoints;
          } else {
            player2ScoreIncrease = attackPoints;
          }
        }
      }

      // Get counter spell and calculate defender points (only if valid counter and successful)
      if (counterSuccess && session.pendingCounterSpellId && session.pendingCounterAccuracy && session.pendingCounterAccuracy >= 52) {
        const counterSpell = await storage.getSpellById(session.pendingCounterSpellId);
        if (counterSpell && counterSpell.gesturePattern) {
          const patternPoints = (counterSpell.gesturePattern as any[]).length;
          let baseDefensePoints = 0;
          
          if (patternPoints === 1) {
            baseDefensePoints = 2;
          } else if (patternPoints >= 2 && patternPoints <= 10) {
            baseDefensePoints = 4;
          } else if (patternPoints >= 11) {
            baseDefensePoints = 5;
          }
          
          const accuracyBonus = getAccuracyBonus(session.pendingCounterAccuracy, patternPoints, false);
          const defensePoints = baseDefensePoints + accuracyBonus;
          
          if (defenderPlayerId === 1) {
            player1ScoreIncrease = defensePoints;
          } else {
            player2ScoreIncrease = defensePoints;
          }
        }
      }

      // Update game session
      const player1Score = Number(session.player1Score) || 0;
      const player2Score = Number(session.player2Score) || 0;
      
      // Game ends after 10 rounds
      const nextRound = currentRound + 1;
      const isGameComplete = nextRound > 10;
      
      // Determine attacker for next round
      // Odd rounds (1,3,5,7,9): Player 1 attacks
      // Even rounds (2,4,6,8,10): Player 2 attacks
      const nextAttacker = nextRound % 2 === 1 ? 1 : 2;
      
      const updates = {
        currentRound: nextRound,
        currentPlayer: nextAttacker,
        currentPhase: "attack" as const,
        player1Score: (player1Score + player1ScoreIncrease).toString(),
        player2Score: (player2Score + player2ScoreIncrease).toString(),
        lastAttackSpellId: null,
        lastAttackAccuracy: null,
        gameStatus: isGameComplete ? "completed" as const : session.gameStatus,
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

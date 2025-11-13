import { MemStorage } from "./server/storage";
import { type GameSession, type Spell, type Point } from "./shared/schema";

/**
 * Automated test to check game behavior when players don't use spells in time
 * starting from round 3, with specific scoring in rounds 1 and 2.
 */
async function testRoundsBehavior() {
  console.log("=== Testing Rounds Behavior ===\n");
  
  // Initialize storage
  const storage = new MemStorage();
  
  // Create test spells
  const attackSpell: Spell = {
    id: "attack-1",
    name: "Test Attack",
    type: "attack",
    color: "#FF0000",
    colorName: "red",
    description: "Test attack spell",
    gesturePattern: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    counters: null
  };
  
  const counterSpell: Spell = {
    id: "counter-1",
    name: "Test Counter",
    type: "counter",
    color: "#00FF00",
    colorName: "green",
    description: "Test counter spell",
    gesturePattern: [{ x: 0, y: 100 }, { x: 100, y: 0 }],
    counters: ["attack-1"]
  };
  
  await storage.createSpell(attackSpell);
  await storage.createSpell(counterSpell);
  
  // Create a test game session
  const sessionId = "test-session";
  const session: any = {
    id: sessionId,
    roomId: "test-room",
    currentPlayer: 1,
    currentPhase: "attack",
    currentRound: 1,
    player1Score: "0",
    player2Score: "0",
    player1UsedAttackSpells: [],
    player2UsedAttackSpells: [],
    pendingAttackPlayerId: null,
    pendingAttackSpellId: null,
    pendingAttackGesture: null,
    pendingAttackAccuracy: null,
    pendingCounterPlayerId: null,
    pendingCounterSpellId: null,
    pendingCounterGesture: null,
    pendingCounterAccuracy: null,
    lastAttackSpellId: null,
    lastAttackAccuracy: null,
    lastCompletedRoundNumber: null,
    lastCompletedAttackSpellId: null,
    lastCompletedAttackAccuracy: null,
    lastCompletedAttackGesture: null,
    lastCompletedCounterSpellId: null,
    lastCompletedCounterAccuracy: null,
    lastCompletedCounterGesture: null,
    lastCompletedCounterSuccess: null,
    gameStatus: "active",
    isBonusRound: false,
    bonusRoundWinner: null,
    timerActive: true,
    timerStartTime: new Date().toISOString(),
    timerDuration: 60,
    timerExpired: false,
    createdAt: new Date().toISOString()
  };
  
  await storage.createGameSession(session);
  
  console.log("Initial setup:");
  console.log("- Round 1: Player 1 should get point");
  console.log("- Round 2: Player 2 should get point");
  console.log("- Rounds 3-10: Neither player uses spells in time (timeout cases)");
  console.log("");
  
  // Simulate round 1: Player 1 gets point
  console.log("--- Round 1 ---");
  await simulateRoundCompletion(storage, sessionId, {
    attackSpellId: attackSpell.id,
    counterSuccess: false,
    player1Accuracy: 80,
    player2Accuracy: 60
  });
  
  let updatedSession = await storage.getGameSession(sessionId);
  console.log(`After round 1: Round ${updatedSession?.currentRound}, Score P1:${updatedSession?.player1Score} P2:${updatedSession?.player2Score}`);
  
  // Simulate round 2: Player 2 gets point
  console.log("\n--- Round 2 ---");
  await simulateRoundCompletion(storage, sessionId, {
    attackSpellId: attackSpell.id,
    counterSuccess: false,
    player1Accuracy: 60,
    player2Accuracy: 80
  });
  
  updatedSession = await storage.getGameSession(sessionId);
  console.log(`After round 2: Round ${updatedSession?.currentRound}, Score P1:${updatedSession?.player1Score} P2:${updatedSession?.player2Score}`);
  
  // Simulate rounds 3-10 with timeouts
  for (let round = 3; round <= 10; round++) {
    console.log(`\n--- Round ${round} (timeout) ---`);
    const isOddRound = round % 2 === 1;
    // For timeout cases, the defender gets the point
    // When Player 1 attacks (odd rounds) and times out, Player 2 gets point
    // When Player 2 attacks (even rounds) and times out, Player 1 gets point
    if (isOddRound) {
      // Player 1 is attacking and times out, Player 2 gets point
      await simulateRoundCompletion(storage, sessionId, {
        attackSpellId: null, // Indicates timeout
        counterSuccess: false,
        player1Accuracy: 0,   // Player 1 timed out
        player2Accuracy: 100  // Player 2 gets point as defender
      });
    } else {
      // Player 2 is attacking and times out, Player 1 gets point
      await simulateRoundCompletion(storage, sessionId, {
        attackSpellId: null, // Indicates timeout
        counterSuccess: false,
        player1Accuracy: 100, // Player 1 gets point as defender
        player2Accuracy: 0    // Player 2 timed out
      });
    }
    
    updatedSession = await storage.getGameSession(sessionId);
    console.log(`After round ${round}: Round ${updatedSession?.currentRound}, Score P1:${updatedSession?.player1Score} P2:${updatedSession?.player2Score}`);
    
    // Check for bonus round condition
    const p1Score = parseInt(updatedSession?.player1Score || "0");
    const p2Score = parseInt(updatedSession?.player2Score || "0");
    if (round === 10 && p1Score === p2Score) {
      console.log("Scores are tied after round 10 - bonus round should start!");
    }
  }
  
  // Check final state
  updatedSession = await storage.getGameSession(sessionId);
  console.log("\n=== Final State ===");
  console.log(`Current Round: ${updatedSession?.currentRound}`);
  console.log(`Current Phase: ${updatedSession?.currentPhase}`);
  console.log(`Game Status: ${updatedSession?.gameStatus}`);
  console.log(`Is Bonus Round: ${updatedSession?.isBonusRound}`);
  console.log(`Player 1 Score: ${updatedSession?.player1Score}`);
  console.log(`Player 2 Score: ${updatedSession?.player2Score}`);
  
  if (updatedSession?.isBonusRound) {
    console.log("\n--- Bonus Round ---");
    // Simulate bonus round with timeout
    await simulateRoundCompletion(storage, sessionId, {
      attackSpellId: null, // Indicates timeout
      counterSuccess: false,
      player1Accuracy: 0,   // Player 1 timed out
      player2Accuracy: 100  // Player 2 gets point as defender
    });
    
    updatedSession = await storage.getGameSession(sessionId);
    console.log(`After bonus round: Round ${updatedSession?.currentRound}, Score P1:${updatedSession?.player1Score} P2:${updatedSession?.player2Score}`);
    console.log(`Game Status: ${updatedSession?.gameStatus}`);
    console.log(`Bonus Round Winner: ${updatedSession?.bonusRoundWinner}`);
  }
  
  console.log("\n=== Test Completed ===");
}

async function simulateRoundCompletion(
  storage: MemStorage,
  sessionId: string,
  data: {
    attackSpellId: string | null;
    counterSuccess: boolean;
    player1Accuracy: number;
    player2Accuracy: number;
  }
) {
  const session = await storage.getGameSession(sessionId);
  if (!session) {
    console.error("Session not found");
    return;
  }
  
  // Update scores based on the data
  let player1Score = Number(session.player1Score) || 0;
  let player2Score = Number(session.player2Score) || 0;
  
  const isTimeout = data.attackSpellId === null;
  
  if (isTimeout) {
    // In timeout cases, the defender gets the point
    if (data.player1Accuracy === 0 && data.player2Accuracy === 100) {
      // Player 1 was attacker and timed out, Player 2 gets the point
      player2Score += 1;
    } else if (data.player1Accuracy === 100 && data.player2Accuracy === 0) {
      // Player 2 was attacker and timed out, Player 1 gets the point
      player1Score += 1;
    }
  } else {
    // Normal case - award point to player with higher accuracy
    if (data.player1Accuracy > data.player2Accuracy) {
      const currentRound = session.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = session.isBonusRound || false;
      const attackPlayer = isBonusRound ? 1 : (isOddRound ? 1 : 2);
      
      if (attackPlayer === 1) {
        player1Score += 1;
      } else {
        player2Score += 1;
      }
    } else if (data.player2Accuracy > data.player1Accuracy) {
      const currentRound = session.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = session.isBonusRound || false;
      const counterPlayer = isBonusRound ? 2 : (isOddRound ? 2 : 1);
      
      if (counterPlayer === 1) {
        player1Score += 1;
      } else {
        player2Score += 1;
      }
    }
  }
  
  // Check if scores are equal after 10 rounds to trigger bonus round
  const currentRound = session.currentRound ?? 1;
  const nextRound = currentRound + 1;
  let isGameComplete = nextRound > 10;
  let gameStatus: "active" | "completed" | "paused" = isGameComplete ? "completed" : (session.gameStatus || "active");
  let isBonusRound = false;
  let bonusRoundWinner = null;
  
  // If we're at the end of round 10, check for tie
  if (currentRound === 10 && player1Score === player2Score) {
    console.log("  -> Detected tie after round 10, starting bonus round");
    isGameComplete = false; // Don't complete game yet
    gameStatus = "active";
    isBonusRound = true;
    // Keep same round number for bonus round
  }
  
  // If this is a bonus round, check if we have a winner
  if (session.isBonusRound) {
    console.log("  -> Processing bonus round completion");
    // Determine winner based on higher accuracy in the bonus round
    if (data.player1Accuracy > data.player2Accuracy) {
      // In bonus rounds, Player 1 is always the attacker
      bonusRoundWinner = 1;
    } else if (data.player2Accuracy > data.player1Accuracy) {
      // In bonus rounds, Player 2 is always the counter
      bonusRoundWinner = 2;
    }
    
    // If accuracies are equal, continue with another bonus round
    if (data.player1Accuracy === data.player2Accuracy) {
      isGameComplete = false; // Don't complete game yet
      gameStatus = "active";
      isBonusRound = true; // Continue with bonus round
      // Keep same round number for bonus round
      console.log("  -> Bonus round tie, continuing with another bonus round");
    } else {
      // Complete the game since bonus round is over with a winner
      isGameComplete = true;
      gameStatus = "completed";
      console.log(`  -> Bonus round winner determined: Player ${bonusRoundWinner}`);
    }
  }
  
  // Determine attacker for next round
  // Odd rounds (1,3,5,7,9): Player 1 attacks
  // Even rounds (2,4,6,8,10): Player 2 attacks
  // For bonus round, Player 1 always attacks first
  const nextAttacker = isBonusRound ? 1 : (nextRound % 2 === 1 ? 1 : 2);
  
  // Special handling for round 1->2 transition issue
  // Make sure we don't skip round 2 when transitioning from round 1 timeout
  const isRound1Timeout = isTimeout && currentRound === 1 && session.isBonusRound === false;
  
  // Special handling for round 7->8 transition issue
  // Make sure we don't skip round 8 when transitioning from round 7
  const isRound7Timeout = isTimeout && currentRound === 7 && session.isBonusRound === false;
  
  // Determine the current round number
  let updatedCurrentRound = nextRound;
  if (isBonusRound) {
    if (session.isBonusRound) {
      // Already in bonus round, increment round number
      updatedCurrentRound = currentRound + 1;
    } else {
      // Transitioning to bonus round, start at round 11
      updatedCurrentRound = 11;
    }
  }
  
  if (isRound1Timeout) {
    updatedCurrentRound = 2;
    isBonusRound = false;
  } else if (isRound7Timeout) {
    updatedCurrentRound = 8;
    isBonusRound = false;
  } else if (isTimeout) {
    updatedCurrentRound = currentRound + 1;
  } else if (!isTimeout && currentRound >= 1 && currentRound < 10) {
    updatedCurrentRound = currentRound + 1;
  }
  
  const updates: any = {
    currentRound: updatedCurrentRound,
    currentPlayer: nextAttacker,
    currentPhase: "attack",
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
    pendingCounterAccuracy: null,
    // Reset timer for next player's turn
    timerActive: isGameComplete ? false : true,
    timerStartTime: isGameComplete ? null : new Date().toISOString(),
    timerDuration: 60, // 60 seconds
    timerExpired: false
  };
  
  await storage.updateGameSession(sessionId, updates);
}

// Run the test
testRoundsBehavior().catch(console.error);
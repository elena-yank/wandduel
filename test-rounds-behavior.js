/**
 * Test to check round progression behavior when players don't use spells in time
 */

// Simulate the round completion logic
function simulateRoundCompletion(currentSession, data) {
  // Update scores based on the data
  let player1Score = Number(currentSession.player1Score) || 0;
  let player2Score = Number(currentSession.player2Score) || 0;
  
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
      const currentRound = currentSession.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = currentSession.isBonusRound || false;
      const attackPlayer = isBonusRound ? 1 : (isOddRound ? 1 : 2);
      
      if (attackPlayer === 1) {
        player1Score += 1;
      } else {
        player2Score += 1;
      }
    } else if (data.player2Accuracy > data.player1Accuracy) {
      const currentRound = currentSession.currentRound || 1;
      const isOddRound = currentRound % 2 === 1;
      const isBonusRound = currentSession.isBonusRound || false;
      const counterPlayer = isBonusRound ? 2 : (isOddRound ? 2 : 1);
      
      if (counterPlayer === 1) {
        player1Score += 1;
      } else {
        player2Score += 1;
      }
    }
  }
  
  // Check if scores are equal after 10 rounds to trigger bonus round
  const currentRound = currentSession.currentRound ?? 1;
  const nextRound = currentRound + 1;
  let isGameComplete = nextRound > 10;
  let gameStatus = isGameComplete ? "completed" : (currentSession.gameStatus || "active");
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
  if (currentSession.isBonusRound) {
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
  
  // Determine the current round number
  let updatedCurrentRound = nextRound;
  if (isBonusRound) {
    if (currentSession.isBonusRound) {
      // Already in bonus round, increment round number
      updatedCurrentRound = currentRound + 1;
    } else {
      // Transitioning to bonus round, start at round 11
      updatedCurrentRound = 11;
    }
  }
  
  // Special handling for round 1->2 transition issue
  // Make sure we don't skip round 2 when transitioning from round 1 timeout
  const isRound1Timeout = isTimeout && currentRound === 1 && currentSession.isBonusRound === false;
  
  // Special handling for round 7->8 transition issue
  // Make sure we don't skip round 8 when transitioning from round 7
  const isRound7Timeout = isTimeout && currentRound === 7 && currentSession.isBonusRound === false;
  
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
  
  return {
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
}

// Test the rounds behavior
function testRoundsBehavior() {
  console.log("=== Testing Rounds Behavior ===\n");
  
  console.log("Initial setup:");
  console.log("- Round 1: Player 1 should get point");
  console.log("- Round 2: Player 2 should get point");
  console.log("- Rounds 3-10: Neither player uses spells in time (timeout cases)");
  console.log("");
  
  // Initialize session
  let session = {
    currentPlayer: 1,
    currentPhase: "attack",
    currentRound: 1,
    player1Score: "0",
    player2Score: "0",
    gameStatus: "active",
    isBonusRound: false,
    bonusRoundWinner: null,
    timerActive: true,
    timerStartTime: new Date().toISOString(),
    timerDuration: 60,
    timerExpired: false
  };
  
  // Simulate round 1: Player 1 gets point
  console.log("--- Round 1 ---");
  session = {
    ...session,
    ...simulateRoundCompletion(session, {
      attackSpellId: "attack-1",
      counterSuccess: false,
      player1Accuracy: 80,
      player2Accuracy: 60
    })
  };
  console.log(`After round 1: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
  
  // Simulate round 2: Player 2 gets point
  console.log("\n--- Round 2 ---");
  session = {
    ...session,
    ...simulateRoundCompletion(session, {
      attackSpellId: "attack-1",
      counterSuccess: false,
      player1Accuracy: 60,
      player2Accuracy: 80
    })
  };
  console.log(`After round 2: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
  
  // Simulate rounds 3-10 with timeouts
  for (let round = 3; round <= 10; round++) {
    console.log(`\n--- Round ${round} (timeout) ---`);
    const isOddRound = round % 2 === 1;
    // For timeout cases, the defender gets the point
    // When Player 1 attacks (odd rounds) and times out, Player 2 gets point
    // When Player 2 attacks (even rounds) and times out, Player 1 gets point
    if (isOddRound) {
      // Player 1 is attacking and times out, Player 2 gets point
      session = {
        ...session,
        ...simulateRoundCompletion(session, {
          attackSpellId: null, // Indicates timeout
          counterSuccess: false,
          player1Accuracy: 0,   // Player 1 timed out
          player2Accuracy: 100  // Player 2 gets point as defender
        })
      };
    } else {
      // Player 2 is attacking and times out, Player 1 gets point
      session = {
        ...session,
        ...simulateRoundCompletion(session, {
          attackSpellId: null, // Indicates timeout
          counterSuccess: false,
          player1Accuracy: 100, // Player 1 gets point as defender
          player2Accuracy: 0    // Player 2 timed out
        })
      };
    }
    
    console.log(`After round ${round}: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
    
    // Check for bonus round condition
    const p1Score = parseInt(session.player1Score || "0");
    const p2Score = parseInt(session.player2Score || "0");
    if (round === 10 && p1Score === p2Score) {
      console.log("Scores are tied after round 10 - bonus round should start!");
    }
  }
  
  // Check final state
  console.log("\n=== Final State ===");
  console.log(`Current Round: ${session.currentRound}`);
  console.log(`Current Phase: ${session.currentPhase}`);
  console.log(`Game Status: ${session.gameStatus}`);
  console.log(`Is Bonus Round: ${session.isBonusRound}`);
  console.log(`Player 1 Score: ${session.player1Score}`);
  console.log(`Player 2 Score: ${session.player2Score}`);
  
  if (session.isBonusRound) {
    console.log("\n--- Bonus Round ---");
    // Simulate bonus round with timeout
    session = {
      ...session,
      ...simulateRoundCompletion(session, {
        attackSpellId: null, // Indicates timeout
        counterSuccess: false,
        player1Accuracy: 0,   // Player 1 timed out
        player2Accuracy: 100  // Player 2 gets point as defender
      })
    };
    
    console.log(`After bonus round: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
    console.log(`Game Status: ${session.gameStatus}`);
    console.log(`Bonus Round Winner: ${session.bonusRoundWinner}`);
  }
  
  console.log("\n=== Test Completed ===");
}

// Run the test
testRoundsBehavior();
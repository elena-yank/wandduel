/**
 * Test to reproduce the quick round completion scenario:
 * 1. Round 1: Player 1 times out
 * 2. Round 2: Timer starts but completes in just 3 seconds
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
    isGameComplete = false; // Don't complete game yet
    gameStatus = "active";
    isBonusRound = true;
    // Keep same round number for bonus round
  }
  
  // If this is a bonus round, check if we have a winner
  if (currentSession.isBonusRound) {
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
    } else {
      // Complete the game since bonus round is over with a winner
      isGameComplete = true;
      gameStatus = "completed";
    }
  }
  
  // Special handling for round 1->2 transition issue
  // Make sure we don't skip round 2 when transitioning from round 1 timeout
  const isRound1Timeout = isTimeout && currentRound === 1 && currentSession.isBonusRound === false;
  
  // Special handling for round 7->8 transition issue
  // Make sure we don't skip round 8 when transitioning from round 7
  const isRound7Timeout = isTimeout && currentRound === 7 && currentSession.isBonusRound === false;
  
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

// Test the quick round completion scenario
function testQuickRoundCompletion() {
  console.log("=== Testing Quick Round Completion Scenario ===\n");
  
  console.log("Scenario:");
  console.log("1. Round 1: Player 1 times out");
  console.log("2. Round 2: Timer starts but completes very quickly (simulating the issue)");
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
  
  console.log(`Initial state: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
  
  // Simulate Round 1: Player 1 times out
  console.log("\n--- Round 1: Player 1 times out ---");
  session = {
    ...session,
    ...simulateRoundCompletion(session, {
      attackSpellId: null, // Indicates timeout
      counterSuccess: false,
      player1Accuracy: 0,   // Player 1 timed out
      player2Accuracy: 100  // Player 2 gets point as defender
    })
  };
  console.log(`After round 1: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
  
  // Check if we properly transitioned to round 2
  if (session.currentRound === 2) {
    console.log("✓ Correctly transitioned to round 2");
  } else {
    console.log(`✗ ERROR: Expected round 2, but got round ${session.currentRound}`);
  }
  
  // Simulate Round 2: Player 2 times out quickly (the issue scenario)
  console.log("\n--- Round 2: Player 2 times out quickly ---");
  session = {
    ...session,
    ...simulateRoundCompletion(session, {
      attackSpellId: null, // Indicates timeout
      counterSuccess: false,
      player1Accuracy: 100, // Player 1 gets point as defender
      player2Accuracy: 0    // Player 2 timed out
    })
  };
  console.log(`After round 2: Round ${session.currentRound}, Score P1:${session.player1Score} P2:${session.player2Score}`);
  
  // Check if we properly transitioned to round 3
  if (session.currentRound === 3) {
    console.log("✓ Correctly transitioned to round 3");
  } else {
    console.log(`✗ ERROR: Expected round 3, but got round ${session.currentRound}`);
  }
  
  console.log("\n=== Test Completed ===");
}

// Run the test
testQuickRoundCompletion();
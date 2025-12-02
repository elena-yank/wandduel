/**
 * Mid-game bonus test: tie in round 7 (odd) -> bonus with attacker = Player 1
 * - Bonus winner gets +1 point
 * - Game continues to round 8 (even), attacker = Player 2
 * - If bonus also a perfect tie (acc+time), start another bonus (same round 7) until winner appears
 */

function logState(label, s) {
  console.log(`${label}: Round ${s.currentRound}, Phase ${s.currentPhase}, Status ${s.gameStatus}, Bonus ${s.isBonusRound}, Scores P1:${s.player1Score} P2:${s.player2Score}, Attacker:${s.currentPlayer}`);
}

function nextAttackerForRound(round) {
  return round % 2 === 1 ? 1 : 2;
}

function bonusAttackerForMidGame(tiedRound) {
  return tiedRound % 2 === 1 ? 1 : 2;
}

function processNormalRound(session, p1Acc, p2Acc, p1Time, p2Time) {
  const round = session.currentRound;
  let p1 = Number(session.player1Score);
  let p2 = Number(session.player2Score);

  if (p1Acc > p2Acc) {
    p1 += 1;
    session.isBonusRound = false;
    session.currentRound = round + 1;
  } else if (p2Acc > p1Acc) {
    p2 += 1;
    session.isBonusRound = false;
    session.currentRound = round + 1;
  } else {
    // accuracy tie -> check times
    if (p1Time < p2Time) {
      p1 += 1;
      session.isBonusRound = false;
      session.currentRound = round + 1;
    } else if (p2Time < p1Time) {
      p2 += 1;
      session.isBonusRound = false;
      session.currentRound = round + 1;
    } else {
      // perfect tie -> start bonus on same round
      session.isBonusRound = true;
      session.currentRound = round;
      session.currentPlayer = bonusAttackerForMidGame(round);
      session.currentPhase = "attack";
      session.gameStatus = "active";
      session.player1Score = p1.toString();
      session.player2Score = p2.toString();
      return session;
    }
  }

  session.currentPlayer = nextAttackerForRound(session.currentRound);
  session.currentPhase = "attack";
  session.gameStatus = "active";
  session.player1Score = p1.toString();
  session.player2Score = p2.toString();
  return session;
}

function processMidGameBonus(session, p1Acc, p2Acc, p1Time, p2Time) {
  const tiedRound = session.currentRound;
  let p1 = Number(session.player1Score);
  let p2 = Number(session.player2Score);

  let winner = null;
  if (p1Acc > p2Acc) winner = 1;
  else if (p2Acc > p1Acc) winner = 2;
  else {
    if (p1Time < p2Time) winner = 1;
    else if (p2Time < p1Time) winner = 2;
    else winner = null; // perfect tie -> another bonus
  }

  if (winner == null) {
    // continue bonus on same round
    session.isBonusRound = true;
    session.currentRound = tiedRound;
    session.currentPlayer = bonusAttackerForMidGame(tiedRound);
    session.currentPhase = "attack";
    session.gameStatus = "active";
  } else {
    // award 1 point in mid-game bonus and proceed to next regular round
    if (winner === 1) p1 += 1; else p2 += 1;
    session.isBonusRound = false;
    session.currentRound = tiedRound + 1;
    session.currentPlayer = nextAttackerForRound(session.currentRound);
    session.currentPhase = "attack";
    session.gameStatus = "active";
  }

  session.player1Score = p1.toString();
  session.player2Score = p2.toString();
  return session;
}

function run() {
  let session = {
    currentPlayer: 1,
    currentPhase: "attack",
    currentRound: 1,
    player1Score: "0",
    player2Score: "0",
    gameStatus: "active",
    isBonusRound: false
  };

  console.log("=== Mid-game Bonus Round 7 Test ===");
  logState("Start", session);

  // Rounds 1..6: deterministic winners
  // R1 (odd): P1 attacks, P1 wins
  session = processNormalRound(session, 80, 60, 10, 12);
  logState("After R1", session);
  // R2 (even): P2 attacks, P2 wins
  session = processNormalRound(session, 60, 80, 12, 10);
  logState("After R2", session);
  // R3 (odd): P1 wins
  session = processNormalRound(session, 82, 70, 9, 11);
  logState("After R3", session);
  // R4 (even): P2 wins
  session = processNormalRound(session, 70, 85, 12, 9);
  logState("After R4", session);
  // R5 (odd): P1 wins
  session = processNormalRound(session, 88, 70, 8, 11);
  logState("After R5", session);
  // R6 (even): P2 wins
  session = processNormalRound(session, 65, 90, 11, 8);
  logState("After R6", session);

  // R7 (odd): perfect tie (accuracy and time equal) -> start bonus with attacker = Player 1
  session = processNormalRound(session, 80, 80, 10, 10);
  console.log("\nTie detected in Round 7 -> Start Bonus");
  logState("After R7 tie", session);

  // Bonus (mid-game): make a winner (e.g., defender faster)
  session = processMidGameBonus(session, 80, 80, 10, 9); // Defender faster → winner = Player 2
  console.log("\nBonus resolved (mid-game), should proceed to Round 8");
  logState("After Bonus", session);

  // Validate expectations:
  const p1 = Number(session.player1Score);
  const p2 = Number(session.player2Score);
  const okRound = session.currentRound === 8;
  const okAttacker = session.currentPlayer === 2; // Round 8 attacker = Player 2
  const okNoBonus = session.isBonusRound === false;
  const okScoresChanged = p1 === 3 && p2 === 4; // based on wins path above

  console.log("\n=== Assertions ===");
  console.log(`Next round is 8: ${okRound ? "OK" : "FAIL"} (got ${session.currentRound})`);
  console.log(`Attacker is Player 2: ${okAttacker ? "OK" : "FAIL"} (got ${session.currentPlayer})`);
  console.log(`Bonus disabled: ${okNoBonus ? "OK" : "FAIL"} (isBonusRound=${session.isBonusRound})`);
  console.log(`Scores updated: ${okScoresChanged ? "OK" : "CHECK"} (P1:${p1} P2:${p2})`);
}

run();

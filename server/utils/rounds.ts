import type { GameSession } from "@shared/schema";

export type AwardArgs = {
  session: GameSession;
  attackAccuracy: number;
  counterAccuracy: number;
  playerId: number; // current counter player id in context
  pendingAttackPlayerId?: number | null; // if known
  isTimeout?: boolean;
};

export function awardPointForRound(args: AwardArgs) {
  const { session, attackAccuracy, counterAccuracy, playerId, pendingAttackPlayerId, isTimeout } = args;
  let p1 = 0;
  let p2 = 0;

  if (isTimeout) {
    // Defender gets point depending on who timed out
    if (attackAccuracy === 0 && counterAccuracy === 100) {
      p2 += 1;
    } else if (attackAccuracy === 100 && counterAccuracy === 0) {
      p1 += 1;
    }
    return { p1, p2 };
  }

  if (attackAccuracy > counterAccuracy) {
    // Attacker gets point
    const attacker = pendingAttackPlayerId
      ?? (session.isBonusRound ? 1 : ((session.currentRound ?? 1) % 2 === 1 ? 1 : 2));
    if (attacker === 1) p1 += 1; else p2 += 1;
  } else if (counterAccuracy > attackAccuracy) {
    // Defender gets point
    const defender = session.isBonusRound ? 2 : ((session.currentRound ?? 1) % 2 === 1 ? 2 : 1);
    if (defender === 1) p1 += 1; else p2 += 1;
  }
  // tie -> no points
  return { p1, p2 };
}

export function calculateBonusRoundOutcome(session: GameSession, attackAccuracy: number, counterAccuracy: number) {
  let isGameComplete = false;
  let bonusRoundWinner: number | null = null;

  if (session.isBonusRound) {
    if (attackAccuracy > counterAccuracy) {
      bonusRoundWinner = 1; // In bonus rounds, Player 1 attacks
      isGameComplete = true;
    } else if (counterAccuracy > attackAccuracy) {
      bonusRoundWinner = 2; // Player 2 defends
      isGameComplete = true;
    } else {
      // tie - continue bonus round
      isGameComplete = false;
    }
  }

  return { isGameComplete, bonusRoundWinner };
}

export function nextRoundState(session: GameSession, player1Score: number, player2Score: number, totalRounds: number) {
  const currentRound = session.currentRound ?? 1;
  const nextRound = currentRound + 1;
  let isGameComplete = nextRound > totalRounds;
  let isBonusRound = false;

  if (currentRound === totalRounds && player1Score === player2Score) {
    isGameComplete = false;
    isBonusRound = true;
  }

  const nextAttacker = isBonusRound ? 1 : (nextRound % 2 === 1 ? 1 : 2);

  return { nextRound, isGameComplete, isBonusRound, nextAttacker };
}
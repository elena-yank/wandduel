import type { GameSession } from "@shared/schema";

export type AwardArgs = {
  session: GameSession;
  attackAccuracy: number;
  counterAccuracy: number;
  playerId: number; // current counter player id in context
  pendingAttackPlayerId?: number | null; // if known
  isTimeout?: boolean;
  attackTimeSpentSeconds?: number | null;
  counterTimeSpentSeconds?: number | null;
};

export function awardPointForRound(args: AwardArgs) {
  const { session, attackAccuracy, counterAccuracy, playerId, pendingAttackPlayerId, isTimeout, attackTimeSpentSeconds, counterTimeSpentSeconds } = args;
  let p1 = 0;
  let p2 = 0;
  let tie = false;

  if (isTimeout) {
    // Defender gets point depending on who timed out
    if (attackAccuracy === 0 && counterAccuracy === 100) {
      p2 += 1;
    } else if (attackAccuracy === 100 && counterAccuracy === 0) {
      p1 += 1;
    }
    return { p1, p2, tie };
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
  } else {
    const attacker = pendingAttackPlayerId
      ?? (session.isBonusRound ? 1 : ((session.currentRound ?? 1) % 2 === 1 ? 1 : 2));
    const defender = session.isBonusRound ? 2 : ((session.currentRound ?? 1) % 2 === 1 ? 2 : 1);
    const ta = typeof attackTimeSpentSeconds === 'number' ? attackTimeSpentSeconds : null;
    const tc = typeof counterTimeSpentSeconds === 'number' ? counterTimeSpentSeconds : null;
    if (ta != null && tc != null) {
      if (ta < tc) {
        if (attacker === 1) p1 += 1; else p2 += 1;
      } else if (tc < ta) {
        if (defender === 1) p1 += 1; else p2 += 1;
      } else {
        tie = true;
      }
    } else {
      tie = true;
    }
  }
  return { p1, p2, tie };
}

export function calculateBonusRoundOutcome(session: GameSession, attackAccuracy: number, counterAccuracy: number, attackTimeSpentSeconds?: number | null, counterTimeSpentSeconds?: number | null) {
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
      // tie -> resolve by time spent (faster wins)
      const ta = typeof attackTimeSpentSeconds === 'number' ? attackTimeSpentSeconds : null;
      const tc = typeof counterTimeSpentSeconds === 'number' ? counterTimeSpentSeconds : null;
      if (ta != null && tc != null) {
        if (ta < tc) {
          bonusRoundWinner = 1;
          isGameComplete = true;
        } else if (tc < ta) {
          bonusRoundWinner = 2;
          isGameComplete = true;
        } else {
          isGameComplete = false; // absolute tie in time as well -> continue
        }
      } else {
        isGameComplete = false;
      }
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
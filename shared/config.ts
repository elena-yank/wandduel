// Centralized constants for gesture recognition and game rules
export const DTW_SCALE_FACTOR = 8; // Empirically determined for human-friendly scoring

// Thresholds for recognizing successful attempts
export const ATTACK_SUCCESS_THRESHOLD = 50; // % accuracy to accept attack
export const COUNTER_SUCCESS_THRESHOLD = 52; // slightly stricter counter threshold

// Minimum accuracy to consider a gesture recognized at all
export const MIN_RECOGNITION_THRESHOLD = 12;

// Rounds and scoring
export const TOTAL_ROUNDS = 10;

// Game version
export const GAME_VERSION = "1.2.0";

// Multi-match dialog config
export const MULTI_MATCH_DELTA = 10; // show choice if top-2 within 10%
export const MULTI_MATCH_MAX_COUNT = 3; // offer up to 3 closest spells
export const MULTI_MATCH_MIN_SCORE = 20; // only trigger if scores are reasonably high

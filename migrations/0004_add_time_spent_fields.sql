-- Add time spent tracking fields
ALTER TABLE gesture_attempts
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS pending_attack_time_spent INTEGER,
  ADD COLUMN IF NOT EXISTS pending_counter_time_spent INTEGER,
  ADD COLUMN IF NOT EXISTS last_completed_attack_time_spent INTEGER,
  ADD COLUMN IF NOT EXISTS last_completed_counter_time_spent INTEGER;
-- Add timer synchronization fields to game_sessions table
ALTER TABLE game_sessions 
ADD COLUMN round_start_time TEXT,
ADD COLUMN time_limit INTEGER DEFAULT 60,
ADD COLUMN current_player_turn INTEGER;
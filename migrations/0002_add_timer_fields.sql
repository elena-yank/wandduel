ALTER TABLE "game_sessions" ADD COLUMN "timer_active" boolean DEFAULT false;
ALTER TABLE "game_sessions" ADD COLUMN "timer_start_time" text;
ALTER TABLE "game_sessions" ADD COLUMN "timer_duration" integer DEFAULT 60;
ALTER TABLE "game_sessions" ADD COLUMN "timer_expired" boolean DEFAULT false;
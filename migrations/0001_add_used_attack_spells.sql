ALTER TABLE "game_sessions" ADD COLUMN "player1_used_attack_spells" jsonb DEFAULT '[]';
ALTER TABLE "game_sessions" ADD COLUMN "player2_used_attack_spells" jsonb DEFAULT '[]';
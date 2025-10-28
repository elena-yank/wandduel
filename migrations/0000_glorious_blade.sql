CREATE TABLE "game_rooms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_name" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"current_round" integer DEFAULT 1,
	"current_player" integer DEFAULT 1,
	"current_phase" varchar DEFAULT 'attack',
	"player1_score" numeric DEFAULT '0',
	"player2_score" numeric DEFAULT '0',
	"last_attack_spell_id" varchar,
	"last_attack_accuracy" integer,
	"game_status" varchar DEFAULT 'active',
	"is_bonus_round" boolean DEFAULT false,
	"bonus_round_winner" integer,
	"pending_attack_player_id" integer,
	"pending_attack_spell_id" varchar,
	"pending_attack_gesture" jsonb,
	"pending_attack_accuracy" integer,
	"pending_counter_player_id" integer,
	"pending_counter_spell_id" varchar,
	"pending_counter_gesture" jsonb,
	"pending_counter_accuracy" integer,
	"last_completed_round_number" integer,
	"last_completed_attack_spell_id" varchar,
	"last_completed_attack_accuracy" integer,
	"last_completed_attack_gesture" jsonb,
	"last_completed_counter_spell_id" varchar,
	"last_completed_counter_accuracy" integer,
	"last_completed_counter_gesture" jsonb,
	"last_completed_counter_success" boolean,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "gesture_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar,
	"player_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"spell_id" varchar,
	"drawn_gesture" jsonb NOT NULL,
	"accuracy" integer NOT NULL,
	"successful" boolean DEFAULT false,
	"is_bonus_round" boolean DEFAULT false,
	"created_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"role" varchar NOT NULL,
	"player_number" integer,
	"house" varchar NOT NULL,
	"joined_at" text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "spells" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" varchar NOT NULL,
	"color" text NOT NULL,
	"color_name" text NOT NULL,
	"description" text NOT NULL,
	"gesture_pattern" jsonb NOT NULL,
	"counters" jsonb
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gesture_attempts" ADD CONSTRAINT "gesture_attempts_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gesture_attempts" ADD CONSTRAINT "gesture_attempts_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;
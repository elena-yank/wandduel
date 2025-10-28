# Database Setup and Migration Instructions

To fix the "failed to create room" error (500 status code), you need to set up the database schema and apply the migration that adds the new columns for tracking used attack spells.

## Initial Database Setup

First, you need to set up the initial database schema. The initial schema is located at: `migrations/0000_glorious_blade.sql`

Content:
```sql
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
```

## Migration File

The migration file for adding the new columns is located at: `migrations/0001_add_used_attack_spells.sql`

Content:
```sql
ALTER TABLE "game_sessions" ADD COLUMN "player1_used_attack_spells" jsonb DEFAULT '[]';
ALTER TABLE "game_sessions" ADD COLUMN "player2_used_attack_spells" jsonb DEFAULT '[]';
```

## How to Apply the Database Setup and Migration

1. Connect to your PostgreSQL database using your preferred database client (psql, pgAdmin, etc.)

2. Execute the SQL commands from the initial schema file (`migrations/0000_glorious_blade.sql`) to create all the tables:
   ```sql
   -- Execute the entire content of migrations/0000_glorious_blade.sql
   ```

3. Verify that the tables were created successfully by running:
   ```sql
   \dt
   ```
   or
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

4. Execute the SQL commands from the migration file (`migrations/0001_add_used_attack_spells.sql`) to add the new columns:
   ```sql
   ALTER TABLE "game_sessions" ADD COLUMN "player1_used_attack_spells" jsonb DEFAULT '[]';
   ALTER TABLE "game_sessions" ADD COLUMN "player2_used_attack_spells" jsonb DEFAULT '[]';
   ```

5. Verify that the columns were added successfully by running:
   ```sql
   \d game_sessions
   ```
   or
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'game_sessions' 
   AND column_name IN ('player1_used_attack_spells', 'player2_used_attack_spells');
   ```

## Alternative Method (if using Drizzle Kit)

If you have access to the DATABASE_URL environment variable, you can apply the migrations using Drizzle Kit:

1. Set the DATABASE_URL environment variable:
   ```bash
   export DATABASE_URL=your_database_connection_string
   ```
   or on Windows:
   ```cmd
   set DATABASE_URL=your_database_connection_string
   ```

2. Run the migrations:
   ```bash
   npx drizzle-kit migrate
   ```

After applying both the initial schema and the migration, the room creation should work correctly.
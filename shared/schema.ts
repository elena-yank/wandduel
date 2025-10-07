import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Spells table
export const spells = pgTable("spells", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["attack", "counter"] }).notNull(),
  color: text("color").notNull(),
  colorName: text("color_name").notNull(),
  description: text("description").notNull(),
  gesturePattern: jsonb("gesture_pattern").notNull(), // Array of normalized points
  counters: jsonb("counters"), // Array of spell IDs this spell counters (for counter spells)
});

// Game sessions table
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  currentRound: integer("current_round").default(1),
  currentPlayer: integer("current_player").default(1),
  currentPhase: varchar("current_phase", { enum: ["attack", "counter"] }).default("attack"),
  player1Score: integer("player1_score").default(0),
  player2Score: integer("player2_score").default(0),
  lastAttackSpellId: varchar("last_attack_spell_id"),
  gameStatus: varchar("game_status", { enum: ["active", "completed", "paused"] }).default("active"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Gesture attempts table
export const gestureAttempts = pgTable("gesture_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => gameSessions.id),
  playerId: integer("player_id").notNull(),
  spellId: varchar("spell_id").references(() => spells.id),
  drawnGesture: jsonb("drawn_gesture").notNull(), // Array of points drawn by user
  accuracy: integer("accuracy").notNull(), // Percentage 0-100
  successful: boolean("successful").default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Schemas
export const insertSpellSchema = createInsertSchema(spells).omit({
  id: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

export const insertGestureAttemptSchema = createInsertSchema(gestureAttempts).omit({
  id: true,
  createdAt: true,
});

// Types
export type Spell = typeof spells.$inferSelect;
export type InsertSpell = z.infer<typeof insertSpellSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GestureAttempt = typeof gestureAttempts.$inferSelect;
export type InsertGestureAttempt = z.infer<typeof insertGestureAttemptSchema>;

// Point type for gesture patterns
export type Point = { x: number; y: number };
export type GesturePattern = Point[];

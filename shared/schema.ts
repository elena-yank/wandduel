import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean, numeric } from "drizzle-orm/pg-core";
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

// Game rooms table
export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostName: text("host_name").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Game sessions table
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => gameRooms.id),
  currentRound: integer("current_round").default(1),
  currentPlayer: integer("current_player").default(1),
  currentPhase: varchar("current_phase", { enum: ["attack", "counter"] }).default("attack"),
  player1Score: numeric("player1_score").default("0"),
  player2Score: numeric("player2_score").default("0"),
  lastAttackSpellId: varchar("last_attack_spell_id"),
  lastAttackAccuracy: integer("last_attack_accuracy"),
  gameStatus: varchar("game_status", { enum: ["active", "completed", "paused"] }).default("active"),
  isBonusRound: boolean("is_bonus_round").default(false),
  bonusRoundWinner: integer("bonus_round_winner"), // 1 or 2 for player, null for no winner yet
  // Track used attack spells for each player
  player1UsedAttackSpells: jsonb("player1_used_attack_spells").default([]), // Array of spell IDs
  player2UsedAttackSpells: jsonb("player2_used_attack_spells").default([]), // Array of spell IDs
  // Pending attempt data (saved only when round completes)
  pendingAttackPlayerId: integer("pending_attack_player_id"),
  pendingAttackSpellId: varchar("pending_attack_spell_id"),
  pendingAttackGesture: jsonb("pending_attack_gesture"),
  pendingAttackAccuracy: integer("pending_attack_accuracy"),
  pendingCounterPlayerId: integer("pending_counter_player_id"),
  pendingCounterSpellId: varchar("pending_counter_spell_id"),
  pendingCounterGesture: jsonb("pending_counter_gesture"),
  pendingCounterAccuracy: integer("pending_counter_accuracy"),
  // Last completed round data (for showing round complete dialog)
  lastCompletedRoundNumber: integer("last_completed_round_number"),
  lastCompletedAttackSpellId: varchar("last_completed_attack_spell_id"),
  lastCompletedAttackAccuracy: integer("last_completed_attack_accuracy"),
  lastCompletedAttackGesture: jsonb("last_completed_attack_gesture"),
  lastCompletedCounterSpellId: varchar("last_completed_counter_spell_id"),
  lastCompletedCounterAccuracy: integer("last_completed_counter_accuracy"),
  lastCompletedCounterGesture: jsonb("last_completed_counter_gesture"),
  lastCompletedCounterSuccess: boolean("last_completed_counter_success"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Session participants table
export const sessionParticipants = pgTable("session_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => gameSessions.id),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  role: varchar("role", { enum: ["player", "spectator"] }).notNull(),
  playerNumber: integer("player_number"), // 1 or 2 for players, null for spectators
  house: varchar("house", { enum: ["gryffindor", "ravenclaw", "slytherin", "hufflepuff"] }).notNull(),
  joinedAt: text("joined_at").default(sql`CURRENT_TIMESTAMP`),
});

// Gesture attempts table
export const gestureAttempts = pgTable("gesture_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => gameSessions.id),
  playerId: integer("player_id").notNull(),
  roundNumber: integer("round_number").notNull(), // 1-10
  spellId: varchar("spell_id").references(() => spells.id, { onDelete: 'cascade' }),
  drawnGesture: jsonb("drawn_gesture").notNull(), // Array of points drawn by user
  accuracy: integer("accuracy").notNull(), // Percentage 0-100
  successful: boolean("successful").default(false),
  isBonusRound: boolean("is_bonus_round").default(false), // Whether this attempt was in a bonus round
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Schemas
export const insertSpellSchema = createInsertSchema(spells).omit({
  id: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  createdAt: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

export const insertSessionParticipantSchema = createInsertSchema(sessionParticipants).omit({
  id: true,
  joinedAt: true,
}).extend({
  userName: z.string().optional(),
});

export const insertGestureAttemptSchema = createInsertSchema(gestureAttempts).omit({
  id: true,
  createdAt: true,
});

// Types
export type Spell = typeof spells.$inferSelect;
export type InsertSpell = z.infer<typeof insertSpellSchema>;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type InsertSessionParticipant = z.infer<typeof insertSessionParticipantSchema>;
export type GestureAttempt = typeof gestureAttempts.$inferSelect;
export type InsertGestureAttempt = z.infer<typeof insertGestureAttemptSchema>;

// Point type for gesture patterns
export type Point = { x: number; y: number };
export type GesturePattern = Point[];

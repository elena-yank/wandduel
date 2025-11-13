"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertGestureAttemptSchema = exports.insertSessionParticipantSchema = exports.insertGameSessionSchema = exports.insertGameRoomSchema = exports.insertSpellSchema = exports.gestureAttempts = exports.sessionParticipants = exports.gameSessions = exports.gameRooms = exports.spells = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Spells table
exports.spells = (0, pg_core_1.pgTable)("spells", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    type: (0, pg_core_1.varchar)("type", { enum: ["attack", "counter"] }).notNull(),
    color: (0, pg_core_1.text)("color").notNull(),
    colorName: (0, pg_core_1.text)("color_name").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    gesturePattern: (0, pg_core_1.jsonb)("gesture_pattern").notNull(), // Array of normalized points
    counters: (0, pg_core_1.jsonb)("counters"), // Array of spell IDs this spell counters (for counter spells)
});
// Game rooms table
exports.gameRooms = (0, pg_core_1.pgTable)("game_rooms", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    hostName: (0, pg_core_1.text)("host_name").notNull(),
    createdAt: (0, pg_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
// Game sessions table
exports.gameSessions = (0, pg_core_1.pgTable)("game_sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    roomId: (0, pg_core_1.varchar)("room_id").notNull().references(() => exports.gameRooms.id),
    currentRound: (0, pg_core_1.integer)("current_round").default(1),
    currentPlayer: (0, pg_core_1.integer)("current_player").default(1),
    currentPhase: (0, pg_core_1.varchar)("current_phase", { enum: ["attack", "counter"] }).default("attack"),
    player1Score: (0, pg_core_1.numeric)("player1_score").default("0"),
    player2Score: (0, pg_core_1.numeric)("player2_score").default("0"),
    lastAttackSpellId: (0, pg_core_1.varchar)("last_attack_spell_id"),
    lastAttackAccuracy: (0, pg_core_1.integer)("last_attack_accuracy"),
    gameStatus: (0, pg_core_1.varchar)("game_status", { enum: ["active", "completed", "paused"] }).default("active"),
    isBonusRound: (0, pg_core_1.boolean)("is_bonus_round").default(false),
    bonusRoundWinner: (0, pg_core_1.integer)("bonus_round_winner"), // 1 or 2 for player, null for no winner yet
    // Track used attack spells for each player
    player1UsedAttackSpells: (0, pg_core_1.jsonb)("player1_used_attack_spells").default([]), // Array of spell IDs
    player2UsedAttackSpells: (0, pg_core_1.jsonb)("player2_used_attack_spells").default([]), // Array of spell IDs
    // Pending attempt data (saved only when round completes)
    pendingAttackPlayerId: (0, pg_core_1.integer)("pending_attack_player_id"),
    pendingAttackSpellId: (0, pg_core_1.varchar)("pending_attack_spell_id"),
    pendingAttackGesture: (0, pg_core_1.jsonb)("pending_attack_gesture"),
    pendingAttackAccuracy: (0, pg_core_1.integer)("pending_attack_accuracy"),
    pendingAttackTimeSpent: (0, pg_core_1.integer)("pending_attack_time_spent"), // seconds
    pendingCounterPlayerId: (0, pg_core_1.integer)("pending_counter_player_id"),
    pendingCounterSpellId: (0, pg_core_1.varchar)("pending_counter_spell_id"),
    pendingCounterGesture: (0, pg_core_1.jsonb)("pending_counter_gesture"),
    pendingCounterAccuracy: (0, pg_core_1.integer)("pending_counter_accuracy"),
    pendingCounterTimeSpent: (0, pg_core_1.integer)("pending_counter_time_spent"), // seconds
    // Last completed round data (for showing round complete dialog)
    lastCompletedRoundNumber: (0, pg_core_1.integer)("last_completed_round_number"),
    lastCompletedAttackSpellId: (0, pg_core_1.varchar)("last_completed_attack_spell_id"),
    lastCompletedAttackAccuracy: (0, pg_core_1.integer)("last_completed_attack_accuracy"),
    lastCompletedAttackGesture: (0, pg_core_1.jsonb)("last_completed_attack_gesture"),
    lastCompletedAttackTimeSpent: (0, pg_core_1.integer)("last_completed_attack_time_spent"), // seconds
    lastCompletedCounterSpellId: (0, pg_core_1.varchar)("last_completed_counter_spell_id"),
    lastCompletedCounterAccuracy: (0, pg_core_1.integer)("last_completed_counter_accuracy"),
    lastCompletedCounterGesture: (0, pg_core_1.jsonb)("last_completed_counter_gesture"),
    lastCompletedCounterSuccess: (0, pg_core_1.boolean)("last_completed_counter_success"),
    lastCompletedCounterTimeSpent: (0, pg_core_1.integer)("last_completed_counter_time_spent"), // seconds
    // Timer synchronization fields
    roundStartTime: (0, pg_core_1.text)("round_start_time"), // ISO timestamp when current round/phase started
    timeLimit: (0, pg_core_1.integer)("time_limit").default(60), // Time limit in seconds for current phase
    currentPlayerTurn: (0, pg_core_1.integer)("current_player_turn"), // Which player's turn it is (1 or 2)
    createdAt: (0, pg_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
// Session participants table
exports.sessionParticipants = (0, pg_core_1.pgTable)("session_participants", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    sessionId: (0, pg_core_1.varchar)("session_id").notNull().references(() => exports.gameSessions.id),
    userId: (0, pg_core_1.varchar)("user_id").notNull(),
    userName: (0, pg_core_1.text)("user_name").notNull(),
    role: (0, pg_core_1.varchar)("role", { enum: ["player", "spectator"] }).notNull(),
    playerNumber: (0, pg_core_1.integer)("player_number"), // 1 or 2 for players, null for spectators
    house: (0, pg_core_1.varchar)("house", { enum: ["gryffindor", "ravenclaw", "slytherin", "hufflepuff"] }).notNull(),
    joinedAt: (0, pg_core_1.text)("joined_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
// Gesture attempts table
exports.gestureAttempts = (0, pg_core_1.pgTable)("gesture_attempts", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    sessionId: (0, pg_core_1.varchar)("session_id").references(() => exports.gameSessions.id),
    playerId: (0, pg_core_1.integer)("player_id").notNull(),
    roundNumber: (0, pg_core_1.integer)("round_number").notNull(), // 1-10
    spellId: (0, pg_core_1.varchar)("spell_id").references(() => exports.spells.id, { onDelete: 'cascade' }),
    drawnGesture: (0, pg_core_1.jsonb)("drawn_gesture").notNull(), // Array of points drawn by user
    accuracy: (0, pg_core_1.integer)("accuracy").notNull(), // Percentage 0-100
    successful: (0, pg_core_1.boolean)("successful").default(false),
    isBonusRound: (0, pg_core_1.boolean)("is_bonus_round").default(false), // Whether this attempt was in a bonus round
    timeSpentSeconds: (0, pg_core_1.integer)("time_spent_seconds"), // seconds spent for this attempt
    createdAt: (0, pg_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
// Schemas
exports.insertSpellSchema = (0, drizzle_zod_1.createInsertSchema)(exports.spells).omit({
    id: true,
});
exports.insertGameRoomSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gameRooms).omit({
    id: true,
    createdAt: true,
});
exports.insertGameSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gameSessions).omit({
    id: true,
    createdAt: true,
});
exports.insertSessionParticipantSchema = (0, drizzle_zod_1.createInsertSchema)(exports.sessionParticipants).omit({
    id: true,
    joinedAt: true,
}).extend({
    userName: zod_1.z.string().optional(),
});
exports.insertGestureAttemptSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gestureAttempts).omit({
    id: true,
    createdAt: true,
});

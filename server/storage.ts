import { type Spell, type InsertSpell, type GameRoom, type InsertGameRoom, type GameSession, type InsertGameSession, type GestureAttempt, type InsertGestureAttempt, type SessionParticipant, type InsertSessionParticipant, type Point, spells, gameRooms, gameSessions, sessionParticipants, gestureAttempts } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
const { Pool } = pg;

export interface IStorage {
  // Spells
  getSpells(): Promise<Spell[]>;
  getSpellById(id: string): Promise<Spell | undefined>;
  getSpellsByType(type: "attack" | "counter"): Promise<Spell[]>;
  createSpell(spell: InsertSpell): Promise<Spell>;
  deleteAllSpells(): Promise<void>;

  // Game Rooms
  createGameRoom(room: InsertGameRoom): Promise<GameRoom>;
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getAllGameRooms(): Promise<GameRoom[]>;

  // Game Sessions
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  getGameSessionByRoomId(roomId: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession>;

  // Session Participants
  addParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant>;
  getSessionParticipants(sessionId: string): Promise<SessionParticipant[]>;
  getParticipantsByRole(sessionId: string, role: "player" | "spectator"): Promise<SessionParticipant[]>;
  getParticipantByUserId(sessionId: string, userId: string): Promise<SessionParticipant | undefined>;
  removeParticipant(participantId: string): Promise<void>;

  // Gesture Attempts
  createGestureAttempt(attempt: InsertGestureAttempt): Promise<GestureAttempt>;
  getGestureAttemptsBySession(sessionId: string): Promise<GestureAttempt[]>;
  updateGestureAttempt(id: string, updates: Partial<InsertGestureAttempt>): Promise<GestureAttempt | undefined>;
  deleteAllGestureAttempts(): Promise<void>;
}

export class MemStorage implements IStorage {
  private spells: Map<string, Spell> = new Map();
  private gameRooms: Map<string, GameRoom> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private sessionParticipants: Map<string, SessionParticipant> = new Map();
  private gestureAttempts: Map<string, GestureAttempt> = new Map();

  constructor() {
  }

  private initializeSpells() {
    // Attack Spells
    const attackSpells: InsertSpell[] = [
      {
        name: "Stupefy",
        type: "attack",
        color: "#EF4444",
        colorName: "Red",
        description: "Stunning spell",
        gesturePattern: [
          { x: 0, y: 50 },
          { x: 100, y: 50 }
        ], // Straight horizontal line
      },
      {
        name: "Expelliarmus",
        type: "attack",
        color: "#DC2626",
        colorName: "Scarlet",
        description: "Disarming charm",
        gesturePattern: [
          { x: 20, y: 80 },
          { x: 50, y: 40 },
          { x: 80, y: 20 }
        ], // Upward diagonal swish
      },
      {
        name: "Incendio",
        type: "attack",
        color: "#F97316",
        colorName: "Orange",
        description: "Fire spell",
        gesturePattern: [
          { x: 50, y: 20 },
          { x: 80, y: 50 },
          { x: 50, y: 80 },
          { x: 20, y: 50 },
          { x: 50, y: 20 }
        ], // Circular motion
      }
    ];

    // Counter Spells
    const counterSpells: InsertSpell[] = [
      {
        name: "Protego",
        type: "counter",
        color: "#3B82F6",
        colorName: "Blue",
        description: "Shield charm",
        gesturePattern: [
          { x: 30, y: 70 },
          { x: 50, y: 30 },
          { x: 70, y: 70 }
        ], // Upward V shape
        counters: [], // Will be filled after creating attack spells
      },
      {
        name: "Finite Incantatem",
        type: "counter",
        color: "#A855F7",
        colorName: "Purple",
        description: "Spell cancellation",
        gesturePattern: [
          { x: 20, y: 20 },
          { x: 80, y: 80 },
          { x: 20, y: 80 },
          { x: 80, y: 20 }
        ], // X pattern
        counters: [],
      },
      {
        name: "Aguamenti",
        type: "counter",
        color: "#06B6D4",
        colorName: "Aqua",
        description: "Water conjuring",
        gesturePattern: [
          { x: 50, y: 20 },
          { x: 30, y: 40 },
          { x: 70, y: 60 },
          { x: 50, y: 80 }
        ], // Wavy pattern
        counters: [],
      }
    ];

    // Create attack spells first
    const createdAttackSpells: Spell[] = [];
    attackSpells.forEach(spell => {
      createdAttackSpells.push(this.createSpellSync(spell));
    });

    // Create counter spells and set up counters relationships
    counterSpells.forEach((spell, index) => {
      if (index < createdAttackSpells.length) {
        spell.counters = [createdAttackSpells[index].id];
      }
      this.createSpellSync(spell);
    });
  }

  private createSpellSync(insertSpell: InsertSpell): Spell {
    const id = randomUUID();
    const spell: Spell = { 
      ...insertSpell, 
      id,
      counters: insertSpell.counters || null
    };
    this.spells.set(id, spell);
    return spell;
  }

  async getSpells(): Promise<Spell[]> {
    return Array.from(this.spells.values());
  }

  async getSpellById(id: string): Promise<Spell | undefined> {
    return this.spells.get(id);
  }

  async getSpellsByType(type: "attack" | "counter"): Promise<Spell[]> {
    return Array.from(this.spells.values()).filter(spell => spell.type === type);
  }

  async createSpell(insertSpell: InsertSpell): Promise<Spell> {
    return this.createSpellSync(insertSpell);
  }

  async deleteAllSpells(): Promise<void> {
    this.spells.clear();
  }

  async createGameRoom(insertRoom: InsertGameRoom): Promise<GameRoom> {
    const id = randomUUID();
    const room: GameRoom = {
      ...insertRoom,
      id,
      createdAt: new Date().toISOString()
    };
    this.gameRooms.set(id, room);
    return room;
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(id);
  }

  async getAllGameRooms(): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values());
  }

  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = {
      id,
      roomId: insertSession.roomId,
      currentRound: insertSession.currentRound ?? 1,
      currentPlayer: insertSession.currentPlayer ?? 1,
      currentPhase: insertSession.currentPhase ?? "attack",
      player1Score: insertSession.player1Score ?? "0",
      player2Score: insertSession.player2Score ?? "0",
      lastAttackSpellId: insertSession.lastAttackSpellId ?? null,
      lastAttackAccuracy: insertSession.lastAttackAccuracy ?? null,
      gameStatus: insertSession.gameStatus ?? "active",
      isBonusRound: insertSession.isBonusRound ?? false,
      bonusRoundWinner: insertSession.bonusRoundWinner ?? null,
      player1UsedAttackSpells: insertSession.player1UsedAttackSpells ?? [],
      player2UsedAttackSpells: insertSession.player2UsedAttackSpells ?? [],
      pendingAttackPlayerId: insertSession.pendingAttackPlayerId ?? null,
      pendingAttackSpellId: insertSession.pendingAttackSpellId ?? null,
      pendingAttackGesture: insertSession.pendingAttackGesture ?? null,
      pendingAttackAccuracy: insertSession.pendingAttackAccuracy ?? null,
      pendingAttackTimeSpent: insertSession.pendingAttackTimeSpent ?? null,
      pendingCounterPlayerId: insertSession.pendingCounterPlayerId ?? null,
      pendingCounterSpellId: insertSession.pendingCounterSpellId ?? null,
      pendingCounterGesture: insertSession.pendingCounterGesture ?? null,
      pendingCounterAccuracy: insertSession.pendingCounterAccuracy ?? null,
      pendingCounterTimeSpent: insertSession.pendingCounterTimeSpent ?? null,
      lastCompletedRoundNumber: insertSession.lastCompletedRoundNumber ?? null,
      lastCompletedAttackSpellId: insertSession.lastCompletedAttackSpellId ?? null,
      lastCompletedAttackAccuracy: insertSession.lastCompletedAttackAccuracy ?? null,
      lastCompletedAttackGesture: insertSession.lastCompletedAttackGesture ?? null,
      lastCompletedAttackTimeSpent: insertSession.lastCompletedAttackTimeSpent ?? null,
      lastCompletedCounterSpellId: insertSession.lastCompletedCounterSpellId ?? null,
      lastCompletedCounterAccuracy: insertSession.lastCompletedCounterAccuracy ?? null,
      lastCompletedCounterGesture: insertSession.lastCompletedCounterGesture ?? null,
      lastCompletedCounterSuccess: insertSession.lastCompletedCounterSuccess ?? null,
      lastCompletedCounterTimeSpent: insertSession.lastCompletedCounterTimeSpent ?? null,
      roundStartTime: insertSession.roundStartTime ?? null,
      timeLimit: insertSession.timeLimit ?? 60,
      currentPlayerTurn: insertSession.currentPlayerTurn ?? null,
      createdAt: new Date().toISOString(),
    };

    this.gameSessions.set(id, session);
    return session;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async getGameSessionByRoomId(roomId: string): Promise<GameSession | undefined> {
    return Array.from(this.gameSessions.values()).find(
      session => session.roomId === roomId
    );
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession> {
    const session = this.gameSessions.get(id);
    if (!session) {
      throw new Error(`Game session ${id} not found`);
    }
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  async addParticipant(insertParticipant: InsertSessionParticipant): Promise<SessionParticipant> {
    const id = randomUUID();
    const participant: SessionParticipant = {
      ...insertParticipant,
      id,
      userName: insertParticipant.userName || "Player",
      playerNumber: insertParticipant.playerNumber ?? null,
      joinedAt: new Date().toISOString()
    };
    this.sessionParticipants.set(id, participant);
    return participant;
  }

  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return Array.from(this.sessionParticipants.values()).filter(
      p => p.sessionId === sessionId
    );
  }

  async getParticipantsByRole(sessionId: string, role: "player" | "spectator"): Promise<SessionParticipant[]> {
    return Array.from(this.sessionParticipants.values()).filter(
      p => p.sessionId === sessionId && p.role === role
    );
  }

  async getParticipantByUserId(sessionId: string, userId: string): Promise<SessionParticipant | undefined> {
    return Array.from(this.sessionParticipants.values()).find(
      p => p.sessionId === sessionId && p.userId === userId
    );
  }

  async removeParticipant(participantId: string): Promise<void> {
    this.sessionParticipants.delete(participantId);
  }

  async createGestureAttempt(insertAttempt: InsertGestureAttempt): Promise<GestureAttempt> {
    const id = randomUUID();
    const attempt: GestureAttempt = {
      sessionId: null,
      spellId: null,
      successful: false,
      isBonusRound: insertAttempt.isBonusRound ?? false,
      ...insertAttempt,
      id,
      createdAt: new Date().toISOString(),
      timeSpentSeconds: insertAttempt.timeSpentSeconds ?? null,
    };
    this.gestureAttempts.set(id, attempt);
    return attempt;
  }

  async getGestureAttemptsBySession(sessionId: string): Promise<GestureAttempt[]> {
    return Array.from(this.gestureAttempts.values()).filter(
      attempt => attempt.sessionId === sessionId
    );
  }

  async updateGestureAttempt(id: string, updates: Partial<InsertGestureAttempt>): Promise<GestureAttempt | undefined> {
    const attempt = this.gestureAttempts.get(id);
    if (!attempt) return undefined;
    
    const updated = { ...attempt, ...updates };
    this.gestureAttempts.set(id, updated);
    return updated;
  }

  async deleteAllGestureAttempts(): Promise<void> {
    this.gestureAttempts.clear();
  }
}

export class PostgresStorage implements IStorage {
  private db;

  constructor(pool: pg.Pool) {
    this.db = drizzle(pool);
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        console.warn(`Database operation failed, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw new Error("Unexpected error in executeWithRetry");
  }

  // Spells
  async getSpells(): Promise<Spell[]> {
    return await this.executeWithRetry(async () => {
      return await this.db.select().from(spells);
    });
  }

  async getSpellById(id: string): Promise<Spell | undefined> {
    const result = await this.db.select().from(spells).where(eq(spells.id, id));
    return result[0];
  }

  async getSpellsByType(type: "attack" | "counter"): Promise<Spell[]> {
    return await this.db.select().from(spells).where(eq(spells.type, type));
  }

  async createSpell(insertSpell: InsertSpell): Promise<Spell> {
    const result = await this.db.insert(spells).values(insertSpell).returning();
    return result[0];
  }

  async deleteAllSpells(): Promise<void> {
    await this.db.delete(spells);
  }

  async updateSpell(id: string, updates: Partial<InsertSpell>): Promise<Spell> {
    console.log(`Updating spell ${id} with updates:`, updates);
    const result = await this.db.update(spells).set(updates).where(eq(spells.id, id)).returning();
    console.log(`Update result:`, result[0]);
    return result[0];
  }

  // Game Rooms
  async createGameRoom(room: InsertGameRoom): Promise<GameRoom> {
    return await this.executeWithRetry(async () => {
      const result = await this.db.insert(gameRooms).values(room).returning();
      return result[0];
    });
  }

  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    const result = await this.db.select().from(gameRooms).where(eq(gameRooms.id, id));
    return result[0];
  }

  async getAllGameRooms(): Promise<GameRoom[]> {
    return await this.db.select().from(gameRooms);
  }

  // Game Sessions
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    return await this.executeWithRetry(async () => {
      // Provide default values for new fields if not present
      const sessionWithDefaults: InsertGameSession = {
        player1UsedAttackSpells: session.player1UsedAttackSpells ?? [],
        player2UsedAttackSpells: session.player2UsedAttackSpells ?? [],
        isBonusRound: session.isBonusRound ?? false,
        bonusRoundWinner: session.bonusRoundWinner ?? null,
        ...session
      };
      
      const result = await this.db.insert(gameSessions).values(sessionWithDefaults).returning();
      return result[0];
    });
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const result = await this.db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return result[0];
  }

  async getGameSessionByRoomId(roomId: string): Promise<GameSession | undefined> {
    const result = await this.db.select().from(gameSessions).where(eq(gameSessions.roomId, roomId));
    return result[0];
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession> {
    const result = await this.db.update(gameSessions).set(updates).where(eq(gameSessions.id, id)).returning();
    return result[0];
  }

  // Session Participants
  async addParticipant(participant: InsertSessionParticipant): Promise<SessionParticipant> {
    const participantWithName = {
      ...participant,
      userName: participant.userName || 'Anonymous'
    };
    const result = await this.db.insert(sessionParticipants).values(participantWithName).returning();
    return result[0];
  }

  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return await this.db.select().from(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
  }

  async getParticipantsByRole(sessionId: string, role: "player" | "spectator"): Promise<SessionParticipant[]> {
    return await this.db.select().from(sessionParticipants)
      .where(and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.role, role)
      ));
  }

  async getParticipantByUserId(sessionId: string, userId: string): Promise<SessionParticipant | undefined> {
    const result = await this.db.select().from(sessionParticipants)
      .where(and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.userId, userId)
      ));
    return result[0];
  }

  async removeParticipant(participantId: string): Promise<void> {
    await this.db.delete(sessionParticipants).where(eq(sessionParticipants.id, participantId));
  }

  // Gesture Attempts
  async createGestureAttempt(attempt: InsertGestureAttempt): Promise<GestureAttempt> {
    // Provide default value for isBonusRound if not present
    const attemptWithDefaults: InsertGestureAttempt = {
      isBonusRound: attempt.isBonusRound ?? false,
      ...attempt
    };
    
    const result = await this.db.insert(gestureAttempts).values(attemptWithDefaults).returning();
    return result[0];
  }

  async getGestureAttemptsBySession(sessionId: string): Promise<GestureAttempt[]> {
    return await this.db.select().from(gestureAttempts).where(eq(gestureAttempts.sessionId, sessionId));
  }

  async updateGestureAttempt(id: string, updates: Partial<InsertGestureAttempt>): Promise<GestureAttempt | undefined> {
    const result = await this.db.update(gestureAttempts)
      .set(updates)
      .where(eq(gestureAttempts.id, id))
      .returning();
    return result[0];
  }

  async deleteAllGestureAttempts(): Promise<void> {
    await this.db.delete(gestureAttempts);
  }
}

// Export a function to create storage instance with a pool
export function createPostgresStorage(pool: pg.Pool): PostgresStorage {
  return new PostgresStorage(pool);
}

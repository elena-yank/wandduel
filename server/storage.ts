import { type Spell, type InsertSpell, type GameRoom, type InsertGameRoom, type GameSession, type InsertGameSession, type GestureAttempt, type InsertGestureAttempt, type SessionParticipant, type InsertSessionParticipant, type Point } from "@shared/schema";
import { randomUUID } from "crypto";

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
      currentRound: 1,
      currentPlayer: 1,
      currentPhase: "attack",
      player1Score: 0,
      player2Score: 0,
      lastAttackSpellId: null,
      lastAttackAccuracy: null,
      gameStatus: "active",
      ...insertSession, 
      id, 
      createdAt: new Date().toISOString()
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
      ...insertAttempt, 
      id, 
      createdAt: new Date().toISOString()
    };
    this.gestureAttempts.set(id, attempt);
    return attempt;
  }

  async getGestureAttemptsBySession(sessionId: string): Promise<GestureAttempt[]> {
    return Array.from(this.gestureAttempts.values()).filter(
      attempt => attempt.sessionId === sessionId
    );
  }
}

export const storage = new MemStorage();

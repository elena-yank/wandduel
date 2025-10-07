import { type Spell, type InsertSpell, type GameSession, type InsertGameSession, type GestureAttempt, type InsertGestureAttempt, type Point } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Spells
  getSpells(): Promise<Spell[]>;
  getSpellById(id: string): Promise<Spell | undefined>;
  getSpellsByType(type: "attack" | "counter"): Promise<Spell[]>;
  createSpell(spell: InsertSpell): Promise<Spell>;

  // Game Sessions
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession>;

  // Gesture Attempts
  createGestureAttempt(attempt: InsertGestureAttempt): Promise<GestureAttempt>;
  getGestureAttemptsBySession(sessionId: string): Promise<GestureAttempt[]>;
}

export class MemStorage implements IStorage {
  private spells: Map<string, Spell> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private gestureAttempts: Map<string, GestureAttempt> = new Map();

  constructor() {
    this.initializeSpells();
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

  async createGameSession(insertSession: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const session: GameSession = { 
      currentRound: 1,
      currentPlayer: 1,
      currentPhase: "attack",
      player1Score: 0,
      player2Score: 0,
      lastAttackSpellId: null,
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

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession> {
    const session = this.gameSessions.get(id);
    if (!session) {
      throw new Error(`Game session ${id} not found`);
    }
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
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

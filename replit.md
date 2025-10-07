# Wizard Duel Arena

## Overview

A magical spell-casting duel game where two players compete by drawing gesture patterns to cast attack and counter spells. The application uses gesture recognition to match player drawings against predefined spell patterns, calculating accuracy scores to determine successful casts. Player 1 always attacks, Player 2 always defends - roles are fixed throughout the game. Each duel consists of exactly 5 rounds, after which the game automatically ends and displays the final results. 

**Multi-Room System**: The application now supports multiple concurrent game rooms, allowing different groups of players to play simultaneously. Players start at a lobby where they can create a new room or join an existing one by entering a room ID. Each room has its own isolated game session, participants, and game state.

**Role System**: Users can join sessions as either active players (maximum 2) or spectators (unlimited). Players can cast spells and participate in duels, while spectators can observe the game but cannot interact with spell-casting controls. Role selection happens before entering the arena, with automatic fallback to spectator if player slots are full. Users can leave the duel at any time via the "Выйти" button in the arena header to return to the main lobby.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: The client is built as a single-page application using React 18 with TypeScript, leveraging Vite as the build tool and development server. The application uses Wouter for client-side routing with three main pages: room lobby (/), role selection (/rooms/:roomId/role-selection), and duel arena (/rooms/:roomId/arena). User role and session data is persisted in localStorage with automatic redirection if role is not selected. Each room has its own isolated URL space.

**UI Component System**: Implements shadcn/ui component library with Radix UI primitives and Tailwind CSS for styling. The design system uses a magical theme with custom CSS variables for colors, shadows with glowing effects, and specialized fonts (Cinzel for headings, Inter for body text). Components follow the "New York" style variant.

**State Management**: Uses TanStack Query (React Query) for server state management with custom query client configuration. Local component state is managed with React hooks. Session data auto-refreshes every 2 seconds and participants every 3 seconds to enable real-time synchronization. The roundPhase state syncs with session.phase via useEffect to ensure all players see the same game state.

**Multi-Tab User Identification**: Each browser tab gets a unique userId stored in sessionStorage (with timestamp for guaranteed uniqueness). This ensures multiple tabs/windows can join the same room as different players without ID conflicts. The userId format is `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.

**Gesture Recognition System**: Custom canvas-based drawing interface captures user input as point arrays. Client-side gesture normalization and resampling algorithms prepare drawings for comparison. The recognition logic normalizes gestures to a 0-100 coordinate space and resamples them to consistent point counts for accurate pattern matching.

### Backend Architecture

**Express.js REST API**: Node.js server using Express with TypeScript, serving both API endpoints and the built frontend in production. The server implements custom request logging middleware that captures response times and truncates long log messages.

**In-Memory Storage**: Temporary storage implementation using Map data structures for rooms, spells, game sessions, and gesture attempts. Pre-initializes with predefined spell patterns for both attack and counter spells. All game data (sessions, participants, attempts) is scoped by roomId to ensure isolation between concurrent games. This is designed to be replaced with database persistence later.

**Gesture Accuracy Algorithm**: Server-side pattern matching compares drawn gestures against target patterns using normalized coordinates, resampling, and euclidean distance calculations. Returns accuracy percentage (0-100) and validates counter spell relationships.

**Game Flow Management**: Tracks game sessions with phases (attack/counter), round numbers (1-5), player scores, and current turn state. Player 1 always attacks, Player 2 always defends - roles are fixed. Validates spell casting based on game phase and enforces counter spell logic. After Player 2 successfully defends, the round automatically completes and advances to the next round after a 1.5-second delay. Game automatically ends after 5 rounds, displaying final results and winner. Manages participant joining with role validation - returns error when attempting to join as player if 2 slots are filled, automatically suggesting spectator role instead.

**Room Management**: Each game room has a unique UUID and is associated with exactly one game session. When a room is created, a session is automatically created for it. Rooms can be joined by entering the room ID. The GET /api/rooms/:roomId/session endpoint retrieves the session for a specific room.

**Role-Based Access Control**: Frontend enforces role restrictions by disabling spell-casting controls (canvas, buttons) for spectators. Backend validates participant roles during join operations. Participants list auto-refreshes every 3 seconds to keep role counts and user states synchronized.

### Data Models

**Game Rooms Schema**: Defines room properties including unique roomId (UUID), owner name, and creation timestamp. Each room is associated with exactly one game session. Rooms serve as the top-level isolation boundary for concurrent games.

**Spells Schema**: Defines spell properties including name, type (attack/counter), color coding, gesture patterns (array of x/y points), and counter relationships. Uses PostgreSQL JSONB for storing point arrays and counter spell references.

**Game Sessions Schema**: Tracks active games with current round (1-5), player turn (always 1 since Player 1 always attacks), phase state (attack/counter), scores, last attack spell ID, and last attack accuracy. Includes game status (active/completed), creation timestamp, and roomId foreign key linking to the parent room. Sessions are room-scoped. Game automatically completes when round exceeds 5.

**Gesture Attempts Schema**: Records each player's drawing attempt with session reference, player ID, spell ID, drawn gesture points, calculated accuracy score, and success status. Attempts are indirectly room-scoped through sessionId.

**Session Participants Schema**: Tracks all participants in a game session with their assigned roles (player/spectator), unique user IDs, and player numbers (1 or 2 for active players, null for spectators). Enforces maximum 2 players per session while allowing unlimited spectators. Participants are indirectly room-scoped through sessionId.

### External Dependencies

**Database**: Configured for PostgreSQL via Drizzle ORM with Neon serverless driver. Database URL required via environment variable. Uses Drizzle Kit for schema migrations with schema defined in shared directory.

**UI Libraries**: Extensive use of Radix UI primitives for accessible components (dialogs, popovers, dropdowns, etc.). TailwindCSS for utility-first styling with PostCSS processing.

**Development Tools**: Replit-specific plugins for error overlays, cartographer integration, and dev banners in development mode. ESBuild bundles the server for production deployment.

**Session Management**: Integrates connect-pg-simple for PostgreSQL session storage (though actual session middleware setup not visible in provided files).

**Validation**: Zod for runtime schema validation, integrated with Drizzle through drizzle-zod for type-safe insertions.
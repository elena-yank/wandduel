# Wizard Duel Arena

## Overview

A magical spell-casting duel game where two players compete by drawing gesture patterns to cast attack and counter spells. The application uses gesture recognition to match player drawings against predefined spell patterns, calculating accuracy scores to determine successful casts. Players alternate between attacking and countering phases, with specific counter spells able to block certain attack spells. 

**Role System**: Users can join sessions as either active players (maximum 2) or spectators (unlimited). Players can cast spells and participate in duels, while spectators can observe the game but cannot interact with spell-casting controls. Role selection happens before entering the arena, with automatic fallback to spectator if player slots are full. Users can leave the duel at any time via the "Выйти" button in the arena header to return to role selection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: The client is built as a single-page application using React 18 with TypeScript, leveraging Vite as the build tool and development server. The application uses Wouter for client-side routing with two main pages: role selection (/role-selection) and duel arena (/arena). User role and session data is persisted in localStorage with automatic redirection if role is not selected.

**UI Component System**: Implements shadcn/ui component library with Radix UI primitives and Tailwind CSS for styling. The design system uses a magical theme with custom CSS variables for colors, shadows with glowing effects, and specialized fonts (Cinzel for headings, Inter for body text). Components follow the "New York" style variant.

**State Management**: Uses TanStack Query (React Query) for server state management with custom query client configuration. Local component state is managed with React hooks. The application disables automatic refetching and sets infinite stale time for cached data.

**Gesture Recognition System**: Custom canvas-based drawing interface captures user input as point arrays. Client-side gesture normalization and resampling algorithms prepare drawings for comparison. The recognition logic normalizes gestures to a 0-100 coordinate space and resamples them to consistent point counts for accurate pattern matching.

### Backend Architecture

**Express.js REST API**: Node.js server using Express with TypeScript, serving both API endpoints and the built frontend in production. The server implements custom request logging middleware that captures response times and truncates long log messages.

**In-Memory Storage**: Temporary storage implementation using Map data structures for spells, game sessions, and gesture attempts. Pre-initializes with predefined spell patterns for both attack and counter spells. This is designed to be replaced with database persistence later.

**Gesture Accuracy Algorithm**: Server-side pattern matching compares drawn gestures against target patterns using normalized coordinates, resampling, and euclidean distance calculations. Returns accuracy percentage (0-100) and validates counter spell relationships.

**Game Flow Management**: Tracks game sessions with phases (attack/counter/complete), round numbers, player scores, and current turn state. Validates spell casting based on game phase and enforces counter spell logic. Manages participant joining with role validation - returns error when attempting to join as player if 2 slots are filled, automatically suggesting spectator role instead.

**Role-Based Access Control**: Frontend enforces role restrictions by disabling spell-casting controls (canvas, buttons) for spectators. Backend validates participant roles during join operations. Participants list auto-refreshes every 3 seconds to keep role counts and user states synchronized.

### Data Models

**Spells Schema**: Defines spell properties including name, type (attack/counter), color coding, gesture patterns (array of x/y points), and counter relationships. Uses PostgreSQL JSONB for storing point arrays and counter spell references.

**Game Sessions Schema**: Tracks active games with current round, player turn, phase state, scores, and last attack spell. Includes game status (active/completed/paused) and creation timestamp.

**Gesture Attempts Schema**: Records each player's drawing attempt with session reference, player ID, spell ID, drawn gesture points, calculated accuracy score, and success status.

**Session Participants Schema**: Tracks all participants in a game session with their assigned roles (player/spectator), unique user IDs, and player numbers (1 or 2 for active players, null for spectators). Enforces maximum 2 players per session while allowing unlimited spectators.

### External Dependencies

**Database**: Configured for PostgreSQL via Drizzle ORM with Neon serverless driver. Database URL required via environment variable. Uses Drizzle Kit for schema migrations with schema defined in shared directory.

**UI Libraries**: Extensive use of Radix UI primitives for accessible components (dialogs, popovers, dropdowns, etc.). TailwindCSS for utility-first styling with PostCSS processing.

**Development Tools**: Replit-specific plugins for error overlays, cartographer integration, and dev banners in development mode. ESBuild bundles the server for production deployment.

**Session Management**: Integrates connect-pg-simple for PostgreSQL session storage (though actual session middleware setup not visible in provided files).

**Validation**: Zod for runtime schema validation, integrated with Drizzle through drizzle-zod for type-safe insertions.
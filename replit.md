# Wizard Duel Arena

## Overview

Wizard Duel Arena is a magical spell-casting game where two players compete by drawing gesture patterns to cast attack and counter spells. The application uses gesture recognition to match player drawings against predefined spell patterns, determining successful casts. Player 1 always attacks, and Player 2 always defends. Each duel consists of exactly 5 rounds. The game supports multiple concurrent rooms, allowing players to create or join existing duels. Users can join as active players or spectators, with a system for selecting Hogwarts houses, which influences in-game visuals. The project aims to provide an engaging and visually rich spell-dueling experience.

## Recent Changes (October 10, 2025)

- **House Selection Enhancement**: House selection cards now highlight with their respective house colors instead of golden:
  - Gryffindor: Red (#EF4444)
  - Ravenclaw: Blue (#3B82F6)
  - Slytherin: Green (#10B981)
  - Hufflepuff: Yellow (#EAB308)
- **Improved Visibility**: Increased player card background opacity from 15% to 35% for better house color visibility against the blue application background
- **Round Dialog Gesture Fix**: Round completion dialog now correctly displays drawn gestures from pending session data instead of history data
- **Spell History Real-time Display**: Player cards now show spell history immediately after recognition using `getEnhancedSpellHistory()` function that merges base history with pending session data, eliminating the delay where players couldn't see what spell was recognized until round completion
- **Color Palette Relocation**: Moved color filter palette from center canvas area to individual player cards for better mobile-friendliness. Palette appears only for the active player during their turn
- **Gesture Drawing Color**: Gestures now draw in the selected spell color from the palette instead of default purple, providing visual feedback of color selection
- **Accuracy Display Boost**: All displayed accuracy percentages are now boosted by +15% (max 100%) for better user experience, while actual accuracy values sent to backend remain unchanged to preserve game logic

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client is a React 18 SPA with TypeScript, built using Vite. It uses Wouter for routing (lobby, role selection, arena) and stores user/session data in localStorage. The UI is built with shadcn/ui, Radix UI primitives, and Tailwind CSS, featuring a magical theme with custom fonts (Cinzel, Inter) and glowing effects. State management uses TanStack Query for server state and React hooks for local state. Session and participant data refresh every 2-3 seconds for real-time synchronization. Multi-tab user identification is handled via unique `userId`s in `sessionStorage`. Gesture recognition involves a custom canvas interface, client-side normalization, and resampling algorithms.

### Backend Architecture

The backend is an Express.js REST API using Node.js with TypeScript. It serves API endpoints and the frontend. Core features include an in-memory storage for rooms, spells, and game sessions (designed for later database migration), a gesture accuracy algorithm for pattern matching, and game flow management that tracks phases, rounds, scores, and enforces spell casting logic. Room management provides unique UUIDs for each game room, with an associated game session. Role-based access control restricts spectator actions and validates participant roles.

### Data Models

Data models include:
- **Game Rooms Schema**: Defines unique `roomId`, owner, and creation timestamp, linking to a single game session.
- **Spells Schema**: Stores spell name, type (attack/counter), color, gesture patterns (JSONB array of points), and counter relationships.
- **Game Sessions Schema**: Tracks game state (round, phase, scores, last spell, status), creation timestamp, and `roomId`.
- **Gesture Attempts Schema**: Records player attempts, including session, player ID, spell ID, drawn gesture, accuracy, and success.
- **Session Participants Schema**: Tracks participants, roles (player/spectator), user IDs, and player numbers, enforcing a maximum of 2 players per session.

## External Dependencies

- **Database**: PostgreSQL via Drizzle ORM, utilizing the Neon serverless driver. Drizzle Kit is used for schema migrations.
- **UI Libraries**: Radix UI for accessible components and Tailwind CSS for utility-first styling.
- **Development Tools**: Replit-specific plugins, ESBuild for server bundling.
- **Session Management**: `connect-pg-simple` for PostgreSQL session storage.
- **Validation**: Zod for runtime schema validation, integrated with Drizzle through `drizzle-zod`.
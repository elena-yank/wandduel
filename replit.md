# Wizard Duel Arena

## Overview

A magical spell-casting duel game where two players compete by drawing gesture patterns to cast attack and counter spells. The application uses gesture recognition to match player drawings against predefined spell patterns, calculating accuracy scores to determine successful casts. Player 1 always attacks, Player 2 always defends - roles are fixed throughout the game. Each duel consists of exactly 5 rounds, after which the game automatically ends and displays the final results. 

**Multi-Room System**: The application now supports multiple concurrent game rooms, allowing different groups of players to play simultaneously. Players start at a lobby where they can create a new room or join an existing one by entering a room ID. Each room has its own isolated game session, participants, and game state.

**Role System**: Users can join sessions as either active players (maximum 2) or spectators (unlimited). Players can cast spells and participate in duels, while spectators can observe the game but cannot interact with spell-casting controls. Role selection happens before entering the arena, with automatic fallback to spectator if player slots are full. Users can leave the duel at any time via the "Выйти" button in the arena header to return to the main lobby.

**Spell Choice System**: When multiple attack spells share identical gesture patterns and both achieve ≥50% accuracy, the system displays a spell selection dialog for the player to choose which spell they intended to cast. Currently, "алАрте аскЕндаре" (golden) and "баубИллиус" (white-yellow) both use the same gesture (point at opponent) and trigger this choice dialog. After selection, the game proceeds normally with the chosen spell.

## Recent Changes (October 2025)

**History Saving Fix (October 10, 2025)**:
- **Fixed Bug**: Spells now save to history only after round completes, not during recognition
- **Pending Data System**: Added pending fields to gameSessions schema to temporarily store attempt data
- **Recognition Flow**: /recognize-gesture saves pending data to session (all cases: failed, multiple matches, single match)
- **Round Completion**: /complete-round reads pending data, saves to gestureAttempts table, clears pending fields
- **Multiple Matches**: When multiple spells match, saves first match as default with gesture, updates if user chooses different spell

**House Selection System (October 10, 2025)**:
- **House Selection**: Players now choose their Hogwarts house (Гриффиндор, Когтевран, Слизерин, Пуффендуй) when creating or joining a room
- **Visual Cards**: House selection UI features 2x2 grid with house crests/icons for each faction
- **Database**: Added `house` field to sessionParticipants table with enum validation (gryffindor, ravenclaw, slytherin, hufflepuff)
- **Icon Display**: House crests shown next to player names in arena player cards and game completion screen
- **Persistence**: Selected house stored in localStorage and passed through join flow to database

**UI/UX Improvements (October 9-10, 2025)**:
- **Thinner Drawing Line**: Reduced canvas drawing line width from 1.5px to 1px for more elegant, precise spell casting
- **Audio Removed**: Removed sparkle sound effect during drawing based on user preference
- **Mobile Role Selection**: Optimized role selection screen for mobile landscape mode with side-by-side card layout, responsive typography (14px minimum), and 44px touch targets for accessibility
- **Custom Angst Font**: Added "Angst Bold Serif" font for main titles "Добро пожаловать!" and "МАГИЧЕСКАЯ ДУЭЛЬ" with gradient text effect
- **Localization Complete**: Fully localized interface - renamed "MAGICAL DUEL ARENA" to "МАГИЧЕСКАЯ ДУЭЛЬ", changed subtitle to "Каждый взмах палочки решает исход"
- **Golden Glow Effect**: Added drop-shadow golden glow (rgba(234,179,8,0.5)) to all main titles for magical appearance
- **House Selection Styling**: Changed selected house border from purple to golden (border-yellow-500) with golden shadow for better visibility
- **Recognition Tuning**: Reduced aspect ratio penalty from 30% to 20%, increased offset variants from 5 to 7 for better complex pattern recognition (especially иммобулюс)
- **House-Themed Player Cards**: Player cards now display in house colors - Gryffindor (red/gold), Slytherin (green/gray), Ravenclaw (blue/gray), Hufflepuff (yellow/black). Borders, icons, spell names, and accuracy bars all use house-specific color gradients

**Database Migration Completed (October 7, 2025)**: Successfully migrated from in-memory storage to PostgreSQL for permanent data persistence. All spell patterns now stored in database. Changed from Neon serverless driver to node-postgres (pg) driver due to WebSocket compatibility issues in development environment.

**New Spells Added**: 
- мИмбл вІмбл (blue, knot pattern, 26 points from SVG) added as counter spell for кАнтис attack
- кОллошу (colorless, shoe pattern, 12 points from SVG) added as attack spell
- релАшио (yellow, vertical line, 2 points from SVG) added as counter spell for кОллошу attack
- локомОтор мОртис (red, boot pattern, 8 points from SVG) added as attack spell
- діффІндо (counter version - green, V with hook, same pattern as attack version) added as counter spell for локомОтор мОртис

All 14 spells (8 attack + 6 counter) now stored permanently in database. Note: діффІндо exists as both attack and counter spell with identical gesture patterns.

**Gesture Recognition Requirements (Gentler Settings)**: The system uses gentler gesture recognition for better pattern matching:
- **Enhanced offset tolerance**: 7 start-point offsets (0%, 12.5%, 20%, 33%, 50%, 67%, 87.5%) for better cyclic matching
- **Aspect ratio penalty**: 20% penalty for gestures with wrong proportions - gentler than before
- **Point-count penalty**: Up to 20% penalty for excessive points (>3x target), moderate penalty for scribbling
- **Centering preserved**: Position-invariant matching works correctly
- Minimum accuracy for recognition: 52%
- Minimum accuracy for successful spell cast: 57%
- Scoring system: Player 1 gets accuracy/10 points, Player 2 gets accuracy/12 points (min 57% required)

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
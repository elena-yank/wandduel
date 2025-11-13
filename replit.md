# Wizard Duel Arena

## Overview

Wizard Duel Arena is a magical spell-casting game where two players compete by drawing gesture patterns to cast attack and counter spells. The application uses gesture recognition to match player drawings against predefined spell patterns, determining successful casts. The duel consists of 10 rounds with alternating attacker/defender roles: odd rounds have Player 1 attacking while Player 2 defends, and even rounds reverse the roles. The game supports multiple concurrent rooms, allowing players to create or join existing duels. Users can join as active players or spectators, with a system for selecting Hogwarts houses, which influences in-game visuals. The project aims to provide an engaging and visually rich spell-dueling experience.

## Recent Changes (October 11, 2025)

- **Accuracy Bonus System**: Implemented bonus points based on gesture accuracy:
  - 55%-70% accuracy: +1 bonus point
  - 71%-90% accuracy: +2 bonus points  
  - 91%-100% accuracy: +3 bonus points
  - Special rules for 1-point pattern spells:
    - Attack spells (1 point): no accuracy bonus
    - Defense spells (1 point): max +0.5 bonus
  - Points can now be fractional (e.g., 2.5)
  - Applied consistently in both auto-complete and manual round completion paths
- **Grimoire Highlight Enhancement**: Improved spell highlight when clicking spell history:
  - Duration reduced from 3 seconds to 1 second for faster feedback
  - Changed highlight color from blue/purple to golden (#FFD700) with matching shadow
- **Round Count Display Fix**: Fixed bug where final results showed "9 из 10" instead of "10 из 10"
  - Auto-complete path now consistently increments currentRound after each round, even when game completes
  - Both auto and manual completion paths now use identical round advancement logic
- **Results Dialog UI Update**: Enhanced final results dialog styling:
  - "Дуэль завершена!" title now uses Angst Bold Serif font with golden gradient and glow effect (matching "Добро пожаловать")
  - Replaced trophy icon with crossed wands image from home screen for thematic consistency
- **Релашио Spell Pattern Update**: Enhanced "релАшио" counter spell gesture pattern:
  - Increased from 2 points to 4 points (added 2 intermediate points)
  - Now uses 2-10 point pattern tier for complexity scoring (4 base defense points instead of 2)
  - Maintains vertical line appearance with smoother recognition

## Recent Changes (October 10, 2025)

- **10-Round Duel System**: Extended game from 5 to 10 rounds with alternating attacker/defender roles:
  - Odd rounds (1,3,5,7,9): Player 1 attacks, Player 2 defends
  - Even rounds (2,4,6,8,10): Player 2 attacks, Player 1 defends
  - Player roles dynamically update based on current round number
- **Separated Attack/Defense Display**: Player cards now show attacks and counter-spells in separate sections for clarity
- **Comprehensive Game Summary**: Final results dialog displays all 10 rounds with compact gesture previews and spell details

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
- **Gesture Recognition Improvements**: Enhanced gesture validation with minimum 5-point requirement to prevent single dots/clicks from matching complex patterns. Added penalty up to 30% for gestures with insufficient detail (< 50% of target point count)
- **Accuracy Display**: All accuracy percentages now display honest values without any artificial boosting
- **Round Completion Dialog Improvements**: 
  - Dialog now uses round number tracking instead of spell combination to prevent duplicate displays when same spells are used
  - Each player controls their dialog independently without triggering popups for the other player
  - Player 2's view is frozen during round completion dialog to prevent seeing Player 1's new attack prematurely
  - Dialog dismissal triggers session query invalidation for proper state synchronization
  - Both onOpenChange and button click properly mark rounds as dismissed
- **Auto Round Completion**: Fixed critical bug where counter-spell recognition didn't automatically complete rounds. Backend now automatically:
  - Saves both attack and counter attempts to history when counter spell is cast with ≥57% accuracy
  - Updates player scores (Player 1 for successful attack, Player 2 for successful and valid counter)
  - Advances to next round or completes game after 10 rounds
  - Stores completed round data in lastCompleted* fields for round dialog display
  - Clears lastCompleted* data when dialog is dismissed to prepare for next round
- **Turn Validation Fix**: Fixed bug where Player 2 received "Not your turn" error when attacking in even rounds. Frontend turn validation now correctly uses `getCurrentPlayer()` function which determines active player based on round parity instead of hardcoded phase logic
- **Spell History Display Fix**: Fixed bug where Player 2's attack spells appeared in Player 1's counter-spell section. The `getEnhancedSpellHistory()` function now correctly assigns pending spells based on round parity:
  - Odd rounds: Player 1 gets pendingAttack, Player 2 gets pendingCounter
  - Even rounds: Player 2 gets pendingAttack, Player 1 gets pendingCounter
- **Complexity-Based Scoring System**: Implemented new scoring system based on spell gesture pattern complexity instead of accuracy:
  - Attack spells: 1 point (1-point pattern), 3 points (2-10 point pattern), 4 points (11+ point pattern)
  - Defense spells: 2 points (1-point pattern), 4 points (2-10 point pattern), 5 points (11+ point pattern)
  - Points awarded to correct player based on their role (attacker/defender) determined by round parity
  - Applied consistently in both auto-complete (recognize-gesture) and manual (complete-round) paths
  - Requires 52% accuracy threshold and valid counter spell check before awarding points
- **Gesture Recognition Optimization**: Improved recognition algorithm to be more forgiving while maintaining spell distinction:
  - Changed penalty system from additive to multiplicative (base × (1 - penalty1) × (1 - penalty2))
  - Reduced maximum penalties to 10% each (aspect ratio and point count) from previous 20-30%
  - Simple patterns (1-2 points) have very lenient penalties (max 5% only for extreme cases > 15x points)
  - Complex patterns (3+ points) have moderate penalties (max 10% each for aspect ratio and point count)
  - Lowered success threshold from 57% to 52% for better gameplay balance

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
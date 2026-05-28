# Hundred Acre Realm - Magic Realm Data Parser & Web Viewer

A comprehensive web application for parsing, organizing, and viewing Magic Realm game data, built with Next.js, TypeScript, and Tailwind CSS.

This project extracts and structures data from Magic Realm's XML files and game logs, providing an interactive web interface to browse characters, monsters, natives, items, spells, tiles, and game session logs with advanced scoring and analysis features.

## Features

- **Core Game Data Parsing**: Extract and organize all Magic Realm entities from XML
- **Session Log Analysis**: Parse and visualize game session logs with detailed combat and character actions
- **Advanced Scoring System**: Calculate final scores using official Magic Realm rules with faction-specific fame/notoriety filtering
- **Character Analysis**: Track character inventories, stats, and progression throughout game sessions
- **Interactive Web Interface**: Browse characters, monsters, natives, items, and spells with tooltips
- **Game Session Viewer**: View parsed game logs with item tooltips, combat details, and scoring breakdowns
- **Map Visualization**: Interactive map display with tile positions and rotations
- **Responsive Design**: Modern UI with Magic Realm 1979 Avalon Hill aesthetic
- **RESTful API**: Comprehensive API endpoints for all game data and session analysis

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS 4
- **Data Parsing**: Node.js with XML parsing libraries
- **Icons**: Heroicons
- **Fonts**: EB Garamond
- **Data Processing**: Custom parsers for Magic Realm file formats

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/KrystoferRobin/hundreacrerealm.git
cd hundreacrerealm
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Admin panel and secrets

Copy `.env.example` to `.env` and set a strong `JWT_SECRET`. For admin login, copy `data/admin-users.example.json` to `data/admin-users.json` and change the password. Discord webhooks belong in `.env` (`DISCORD_WEBHOOK_URL`) or the admin panel only — never in committed files.

## Data Parsing

This project includes comprehensive parsers for Magic Realm data. All parsers are located in the `scripts/` directory.

### Core Game Data Parsers

Run the master parser to extract all core game data (stored in MagicRealmData.xml, extracted from RealmSpeak. Replace with the latest version to update the core data via the following scripts):

```bash
node scripts/parse-all-core-data.js
```

This will create the following structure in `coregamedata/`:
- `characters/` - All playable characters with their chits and attributes
- `monsters/` - Monster data organized by name with parts
- `natives/` - Native groups organized by dwelling
- `items/` - Items categorized as treasures, armor, or weapons
- `spells/` - Spells organized by level (I-VIII, special)
- `tiles/` - Game tiles with normal and enchanted states
- `chits/` - Warning, sound, treasure location, and dwelling chits

### Individual Parsers

You can run parsers individually:

```bash
# Parse characters (includes .rschar files)
node scripts/parse-characters.js

# Parse monsters
node scripts/parse-monsters.js

# Parse natives
node scripts/parse-natives.js

# Parse items (treasures, armor, weapons)
node scripts/parse-items.js

# Parse spells by level
node scripts/parse-spells.js

# Parse game tiles
node scripts/parse-tiles.js

# Parse chits
node scripts/parse-chits.js
```

### Session Log Parsers

Parse game session logs from `.rslog` and `.rsgame` files:

```bash
# Process all sessions in uploads directory
node scripts/process_all_sessions.js

# Process a single session
node scripts/process_session.js <session-name>

# Parse individual log with detailed combat analysis
node scripts/parse_game_log_detailed.js

# Parse basic log structure
node scripts/parse_game_log.js

# Extract character inventories and stats
node scripts/extract_character_inventories.js <session-name>
node scripts/extract_character_stats.js <session-name>

# Calculate final scores
node scripts/calculate_scoring.js <session-name>

# Add scoring to all existing sessions
node scripts/add_scoring_to_all_sessions.js
```

## API Endpoints

The application provides comprehensive RESTful API endpoints:

### Core Data APIs
- `GET /api/characters` - List all characters
- `GET /api/characters/[name]` - Get specific character data
- `GET /api/monsters` - List all monsters
- `GET /api/natives` - List all natives
- `GET /api/items` - List all items
- `GET /api/tiles/[filename]` - Get tile data

### Session APIs
- `GET /api/sessions` - List all game sessions
- `GET /api/sessions/[id]` - Get session metadata
- `GET /api/session/[id]` - Get detailed session data
- `GET /api/session/[id]/scoring` - Get session scoring data
- `GET /api/session/[id]/final-scores` - Get calculated final scores
- `GET /api/session/[id]/character-stats` - Get character statistics
- `GET /api/session/[id]/character-inventories` - Get character inventories
- `GET /api/session/[id]/map-locations` - Get map location data
- `GET /api/session/[id]/inventory` - Get session inventory summary

### Utility APIs
- `GET /api/health` - Health check endpoint
- `GET /api/debug-sessions` - Debug session data
- `GET /api/game-sessions` - List game sessions
- `GET /api/import-sessions` - Import session data

## Project Structure

```
hundreacrerealm/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── characters/    # Character APIs
│   │   ├── monsters/      # Monster APIs
│   │   ├── natives/       # Native APIs
│   │   ├── items/         # Item APIs
│   │   ├── tiles/         # Tile APIs
│   │   ├── sessions/      # Session listing APIs
│   │   ├── session/       # Session detail APIs
│   │   └── health/        # Health check API
│   ├── characters/        # Character pages
│   ├── game-logs/         # Game logs listing
│   ├── monsters/          # Monsters page
│   ├── natives/           # Natives page
│   ├── session/           # Session viewer
│   └── page.tsx           # Homepage
├── coregamedata/          # Parsed game data
│   ├── characters/        # Character JSON files
│   ├── monsters/          # Monster JSON files
│   ├── natives/           # Native JSON files
│   ├── items/             # Item JSON files
│   ├── spells/            # Spell JSON files
│   ├── tiles/             # Tile JSON files
│   └── chits/             # Chit JSON files
├── parsed_sessions/       # Parsed game session logs
├── public/                # Static assets
│   ├── images/            # Game images and icons
│   │   ├── charportraits/ # Character portraits
│   │   ├── charsymbol/    # Character symbols
│   │   └── tiles/         # Tile GIF images (served at /images/tiles/)
│   └── parsed_sessions/   # Public session data
├── scripts/               # Data parsing scripts
│   ├── README.md          # Scripts documentation
│   ├── process_all_sessions.js
│   ├── process_session.js
│   ├── calculate_scoring.js
│   ├── extract_character_inventories.js
│   └── ...                # Other parsing scripts
├── data/                  # Application configuration
├── MagicRealmData.xml     # Source XML data
└── characters/            # .rschar character files
```

## Web Interface

### Pages

- **Homepage**: Overview with recent game sessions and navigation
- **Cast of Characters**: Browse all characters with icons and details
- **Monsters**: View monsters grouped by name with chit displays
- **Natives**: Browse natives organized by dwelling
- **Game Logs**: List all parsed game sessions
- **Session Viewer**: Detailed view of individual game sessions with scoring

### Features

- **Item Tooltips**: Hover over item names to see chit-style tooltips
- **Character Details**: View character portraits, chits, and equipment
- **Combat Visualization**: Detailed combat logs with round-by-round analysis
- **Scoring Display**: View calculated final scores with breakdowns
- **Map Visualization**: Interactive map with tile positions
- **Character Analysis**: Track character progression and inventories
- **Responsive Design**: Works on desktop and mobile devices

## Session Analysis Features

### Scoring System
- **Official Rules**: Follows Magic Realm scoring rules exactly
- **Faction Filtering**: Fame/notoriety values filtered by character faction
- **Item Valuation**: Proper fame/notoriety values for all items
- **Score Breakdown**: Detailed breakdown of basic and bonus scores

### Character Tracking
- **Inventory Analysis**: Complete character inventories with item details
- **Stat Tracking**: Gold, fame, notoriety, great treasures, learned spells
- **Progression Timeline**: Day-by-day character actions and events
- **Combat Analysis**: Detailed battle logs with monster interactions

### Map Analysis
- **Tile Positioning**: Exact tile positions and rotations
- **Path Analysis**: Clearing connections and movement patterns
- **Location Tracking**: Character and monster locations throughout game

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Data Structure

The parsers create JSON files with the following structure:

- **Characters**: Main character data with nested parts (chits)
- **Monsters**: Monster data with parts (heads, weapons, etc.)
- **Natives**: Native groups with contained parts
- **Items**: Item data with attributes and effects
- **Spells**: Spell data organized by level
- **Tiles**: Tile data with paths, clearings, and states
- **Chits**: Various game chits with attributes
- **Sessions**: Complete session data with scoring and analysis

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. Start the production server: `npm run start`
3. Or use `./deploy.sh` if you have PM2 configured for your environment

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All code generated by Cursor - This is purely an AI project, directed by myself, Krystofer Robin.
- Magic Realm board game by Avalon Hill (1979)
- All contributors and supporters of the project

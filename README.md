# Hundred Acre Realm - Magic Realm Data Parser & Web Viewer

A comprehensive web application for parsing, organizing, and viewing Magic Realm game data, built with Next.js, TypeScript, and Tailwind CSS.

This project extracts and structures data from Magic Realm's XML files and game logs, providing an interactive web interface to browse characters, monsters, natives, items, spells, tiles, and game session logs.

## Features

- **Core Game Data Parsing**: Extract and organize all Magic Realm entities from XML
- **Session Log Analysis**: Parse and visualize game session logs with detailed combat and character actions
- **Interactive Web Interface**: Browse characters, monsters, natives, items, and spells with tooltips
- **Game Session Viewer**: View parsed game logs with item tooltips and combat details
- **Responsive Design**: Modern UI with Magic Realm 1979 Avalon Hill aesthetic

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS 4
- **Data Parsing**: Node.js with XML parsing libraries
- **Icons**: Heroicons
- **Fonts**: EB Garamond

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hundreacrerealm.git
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

## Data Parsing

This project includes comprehensive parsers for Magic Realm data. All parsers are located in the `scripts/` directory.

### Core Game Data Parsers

Run the master parser to extract all core game data (stored in MagicRealmData.xml, extracted from RealmSpeak.  Replace with the latest version to update the core data via the following scripts):

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

Parse game session logs from `.rslog` files:

```bash
# Parse all logs in upload folder
node scripts/parse_all_logs.js

# Parse individual log with detailed combat analysis
node scripts/parse_game_log_detailed.js

# Parse basic log structure
node scripts/parse_game_log.js
```

## Project Structure

```
hundreacrerealm/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
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
│   └── images/            # Game images and icons
├── scripts/               # Data parsing scripts
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
- **Session Viewer**: Detailed view of individual game sessions

### Features

- **Item Tooltips**: Hover over item names to see chit-style tooltips
- **Character Details**: View character portraits, chits, and equipment
- **Combat Visualization**: Detailed combat logs with round-by-round analysis
- **Responsive Design**: Works on desktop and mobile devices

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- All code generated by Cursor - This is purely an AI projected, directed by myself, Krystofer Robin.
- Magic Realm board game by Avalon Hill (1979)
- All contributors and supporters of the project

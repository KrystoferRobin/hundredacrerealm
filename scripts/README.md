# Magic Realm Session Parsers

This directory contains parsers for processing Magic Realm game sessions from `.rslog` and `.rsgame` files.

## Quick Start

### Process a Single Session
```bash
node scripts/process_session.js <session-name>
```

Example:
```bash
node scripts/process_session.js learning-woodsgirl
```

### Process All Sessions
```bash
node scripts/process_all_sessions.js
```

This will automatically find all `.rslog` and `.rsgame` files in the `public/uploads` directory and process them.

## Individual Parsers

### 1. Main Session Parser
Extracts XML from `.rsgame` files and notes log files.
```bash
node scripts/parse_game_session.js <session-name>
```

### 2. Basic Log Parser
Splits `.rslog` files into individual day files.
```bash
node scripts/parse_game_log.js <session-name>
```

### 3. Detailed Log Parser
Parses day files into structured session data with character turns, battles, and actions.
```bash
node scripts/parse_game_log_detailed.js <session-name>
```

### 4. Map Parser
Extracts map tile data from the game XML.
```bash
node scripts/parse_map_data.js <session-name>
```

## File Structure

After processing, each session will have its own directory in `parsed_sessions/`:

```
parsed_sessions/
└── <session-name>/
    ├── extracted_game.xml          # Raw game XML from .rsgame
    ├── parsed_session.json         # Structured session data
    ├── map_data.json              # Map tile positions and rotations
    ├── full_log.txt               # Decompressed full log
    └── day_*.txt                  # Individual day files (103 files)
```

## Adding New Sessions

1. Place your `.rslog` and/or `.rsgame` files in `public/uploads/`
2. Run the master script: `node scripts/process_all_sessions.js`
3. Or process individually: `node scripts/process_session.js <session-name>`

## Generated Data

### parsed_session.json
Contains structured session data:
- Player information
- Character turns with actions
- Battles with detailed combat data
- Monster spawns and blocks
- Day-by-day timeline

### map_data.json
Contains map information:
- Tile positions (x,y coordinates)
- Tile rotations
- Tile names and types
- Grouped by tile type

### Day Files
Individual text files for each game day, useful for debugging or custom parsing.

## Usage Examples

```bash
# Process a specific session
node scripts/process_session.js my-game-session

# Process all sessions in uploads directory
node scripts/process_all_sessions.js

# Just extract map data for an existing session
node scripts/parse_map_data.js my-game-session
```

## Requirements

- Node.js
- Required packages: `xml2js`, `adm-zip` (for .rschar files)
- Magic Realm `.rslog` and/or `.rsgame` files in `public/uploads/` 
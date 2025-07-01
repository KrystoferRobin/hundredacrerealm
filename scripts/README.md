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

### 5. Character Inventory Extractor
Extracts final character inventories with item details and fame/notoriety values.
```bash
node scripts/extract_character_inventories.js <session-name>
```

### 6. Scoring Calculator
Calculates final scores using official Magic Realm rules with faction-specific fame/notoriety filtering.
```bash
node scripts/calculate_scoring.js <session-name>
```

### 7. Missing Data Extractor
Extracts character stats and scoring data from existing XML files.
```bash
node scripts/extract_missing_data.js <session-name>
```

### 8. Add Scoring to All Sessions
Adds scoring data to all existing sessions that don't have it yet.
```bash
node scripts/add_scoring_to_all_sessions.js
```

## File Structure

After processing, each session will have its own directory in `parsed_sessions/`:

```
parsed_sessions/
└── <session-name>/
    ├── extracted_game.xml          # Raw game XML from .rsgame
    ├── parsed_session.json         # Structured session data
    ├── map_data.json              # Map tile positions and rotations
    ├── character_stats.json       # Character end-game stats (gold, fame, notoriety, etc.)
    ├── scoring.json               # Victory point assignments and starting gold deficits
    ├── character_inventories.json # Final character inventories with item details
    ├── final_scores.json          # Calculated final scores for each character
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

### character_stats.json
Contains end-game character statistics:
- Gold, fame, notoriety values
- Great treasures and learned spells counts
- Starting spell counts

### scoring.json
Contains victory point assignments and starting gold deficits:
- Victory points assigned to each category (GT, Spells, Fame, Notoriety, Gold)
- Starting gold deficits for each character

### character_inventories.json
Contains final character inventories:
- All items carried at end of game
- Item details including fame/notoriety values
- Proper categorization (weapons, armor, treasures, etc.)

### final_scores.json
Contains calculated final scores:
- Total score for each character
- Breakdown by category (basic and bonus scores)
- Item fame/notoriety contributions
- Follows official Magic Realm scoring rules

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
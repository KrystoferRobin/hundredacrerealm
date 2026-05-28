# Magic Realm Parser System Documentation

## Overview

The Magic Realm parser system is a comprehensive pipeline for processing game session files (`.rslog` and `.rsgame`) from the Magic Realm board game. The system extracts structured data from these files and creates detailed session reports, character statistics, map data, and scoring information.

## Main Entry Point: Folder Icon Parser

### Location: Homepage Folder Icon
**File:** `app/page.tsx` - `handleImportSessions()` function

**Trigger:** Clicking the folder icon in the footer of any page

**Function:** 
- Calls the `/api/import-sessions` endpoint
- This endpoint runs `scripts/process_all_sessions.js`
- Processes all `.rslog` and `.rsgame` files in the `public/uploads` directory
- Cleans up the uploads directory after processing

**Input:** Files uploaded via drag-and-drop or file picker to `public/uploads/`
**Output:** Processed session data in `public/parsed_sessions/[session-id]/`

---

## Primary Parser Pipeline

### 1. Main Session Processor
**File:** `scripts/process_all_sessions.js`

**Purpose:** Orchestrates the entire parsing pipeline for all uploaded sessions

**Process:**
1. **File Discovery:** Scans `public/uploads/` for `.rslog` and `.rsgame` files
2. **Session Creation:** Creates unique session folders with timestamps and random IDs
3. **File Organization:** Copies and renames source files to session folders
4. **Pipeline Execution:** Runs all parsers in sequence for each session
5. **Cleanup:** Removes processed files from uploads directory
6. **Master Stats:** Builds master statistics after all sessions are processed

**Dependencies:** None (entry point)
**Output:** Organized session folders with all parsed data

---

### 2. Game Session Parser
**File:** `scripts/parse_game_session.js`

**Purpose:** Extracts XML data from `.rsgame` files and initiates the parsing pipeline

**Process:**
1. **XML Extraction:** Extracts XML data from `.rsgame` files using `parse_rsgame_map.js`
2. **Map Location Extraction:** Extracts map tile locations using `extract_map_locations.js`
3. **Character Stats Extraction:** Extracts character statistics using `extract_character_stats.js`
4. **Scoring Data Extraction:** Extracts victory point assignments and starting gold
5. **Basic Log Processing:** Splits `.rslog` files into daily segments

**Input:** `.rsgame` and `.rslog` files in session directory
**Output:** 
- `extracted_game.xml` - Raw game XML data
- `map_locations.json` - Map tile locations
- `character_stats.json` - Character statistics
- `scoring.json` - Victory point assignments
- Daily log files (`day_1_1.txt`, `day_1_2.txt`, etc.)

---

### 3. Detailed Log Parser
**File:** `scripts/parse_game_log_detailed.js`

**Purpose:** Creates comprehensive structured data from daily log files

**Process:**
1. **Day File Parsing:** Processes each daily log file (`day_X_Y.txt`)
2. **Combat Analysis:** Extracts detailed battle information including:
   - Battle locations and participants
   - Combat rounds and phases
   - Character actions (attacks, spells, tactics)
   - Monster spawns and blocks
   - Damage, armor destruction, and deaths
   - Fame/notoriety gains
3. **Character Turn Tracking:** Records character movements and actions
4. **Monster Die Rolls:** Tracks monster die roll results
5. **Session Metadata:** Extracts player information and session details

**Input:** Daily log files (`day_X_Y.txt`)
**Output:** `parsed_session.json` with structured session data

---

### 4. Map Data Parser
**File:** `scripts/parse_map_data.js`

**Purpose:** Extracts and processes map tile information from game XML

**Process:**
1. **Tile Extraction:** Parses map tile data from `extracted_game.xml`
2. **Location Mapping:** Creates mapping between tile names and locations
3. **Tile Properties:** Extracts tile characteristics (clearing types, connections)
4. **Map State:** Tracks tile states throughout the game

**Input:** `extracted_game.xml`
**Output:** Enhanced `map_locations.json` with tile properties

---

### 5. Character Stats Extractor
**File:** `scripts/extract_character_stats.js`

**Purpose:** Extracts detailed character statistics from game XML

**Process:**
1. **Character Identification:** Identifies all player characters in the game
2. **Attribute Extraction:** Extracts character attributes, abilities, and starting conditions
3. **Level Information:** Processes character levels and progression
4. **Equipment Tracking:** Records starting equipment and character chits
5. **Vulnerability Analysis:** Extracts character vulnerabilities and starting locations

**Input:** `extracted_game.xml`
**Output:** Enhanced `character_stats.json` with detailed character information

---

### 6. Character Inventory Extractor
**File:** `scripts/extract_character_inventories.js`

**Purpose:** Extracts final character inventories and item details

**Process:**
1. **Inventory Analysis:** Processes character final inventories
2. **Item Details:** Extracts item names, types, and properties
3. **Fame/Notoriety:** Calculates fame and notoriety values for items
4. **Treasure Classification:** Categorizes items as armor, weapons, treasures, or spells
5. **Value Calculation:** Computes total inventory values

**Input:** `parsed_session.json` and `extracted_game.xml`
**Output:** `character_inventories.json` with detailed inventory data

---

### 7. Scoring Calculator
**File:** `scripts/calculate_scoring.js`

**Purpose:** Calculates final scores using official Magic Realm rules

**Process:**
1. **Victory Point Calculation:** Applies official scoring rules
2. **Faction Filtering:** Filters fame/notoriety by character faction
3. **Treasure Valuation:** Calculates treasure point values
4. **Spell Scoring:** Processes spell-related victory points
5. **Final Totals:** Computes total victory points for each character

**Input:** `character_stats.json`, `scoring.json`, and `character_inventories.json`
**Output:** `final_scores.json` with calculated victory points

---

### 8. Session Title Generator
**File:** `scripts/generate_session_titles.js`

**Purpose:** Creates descriptive titles for game sessions

**Process:**
1. **Session Analysis:** Analyzes session data for key events
2. **Character Identification:** Identifies main characters and their outcomes
3. **Event Extraction:** Finds notable events (deaths, victories, discoveries)
4. **Title Generation:** Creates descriptive titles based on session content
5. **Subtitle Creation:** Generates additional context for the session

**Input:** `parsed_session.json`, `map_locations.json`, and `final_scores.json`
**Output:** `session_titles.json` with main title and subtitle

---

### 9. Map State Tracker
**File:** `scripts/track_map_state.js`

**Purpose:** Tracks map state changes throughout the game

**Process:**
1. **State Initialization:** Sets up initial map state
2. **Movement Tracking:** Records character movements between tiles
3. **Event Recording:** Tracks events that affect map state
4. **Timeline Creation:** Builds chronological map state timeline
5. **State Snapshots:** Creates snapshots of map state at key moments

**Input:** `parsed_session.json` and `map_locations.json`
**Output:** `map_state_data.json` with map state timeline

---

## Supplemental Parsers

### 10. Master Stats Builder
**File:** `scripts/build_master_stats.js`

**Purpose:** Aggregates statistics across all sessions

**Process:**
1. **Session Scanning:** Reads all processed sessions
2. **Character Statistics:** Aggregates character performance data
3. **Game Statistics:** Calculates overall game statistics
4. **Trend Analysis:** Identifies patterns across sessions
5. **Report Generation:** Creates comprehensive statistics report

**Input:** All session data in `public/parsed_sessions/`
**Output:** `public/stats/master_stats.json`

---

### 11. Missing Data Extractor
**File:** `scripts/extract_missing_data.js`

**Purpose:** Extracts additional data from existing sessions

**Process:**
1. **Session Analysis:** Identifies sessions missing certain data
2. **Data Extraction:** Extracts missing character stats and scoring
3. **Data Validation:** Ensures extracted data is complete
4. **File Generation:** Creates missing data files for sessions

**Input:** Existing session data
**Output:** Missing data files for incomplete sessions

---

### 12. Reprocess Existing Sessions
**File:** `scripts/reprocess_existing_sessions.js`

**Purpose:** Adds missing files to existing sessions

**Process:**
1. **Session Discovery:** Finds existing sessions without complete data
2. **File Analysis:** Identifies missing files for each session
3. **Selective Processing:** Runs only necessary parsers for missing data
4. **Data Completion:** Ensures all sessions have complete data sets

**Input:** Existing session folders
**Output:** Completed session data sets

---

### 13. Add Scoring to All Sessions
**File:** `scripts/add_scoring_to_all_sessions.js`

**Purpose:** Adds scoring data to sessions that don't have it

**Process:**
1. **Session Scanning:** Identifies sessions without scoring data
2. **Scoring Calculation:** Runs scoring calculator for each session
3. **Data Validation:** Ensures scoring data is accurate
4. **File Creation:** Creates scoring files for each session

**Input:** Sessions without scoring data
**Output:** `final_scores.json` files for all sessions

---

## Core Data Parsers

### 14. Character Parser
**File:** `scripts/parse-characters.js`

**Purpose:** Parses character data from core game files

**Process:**
1. **XML Parsing:** Extracts character data from XML files
2. **Attribute Processing:** Processes character attributes and abilities
3. **Level Extraction:** Extracts character level information
4. **Equipment Processing:** Processes starting equipment
5. **JSON Generation:** Creates structured character JSON files

**Input:** Character XML files from core game data
**Output:** Character JSON files in `coregamedata/characters/`

---

### 15. Item Parser
**File:** `scripts/parse-items.js`

**Purpose:** Parses item data from core game files

**Process:**
1. **Item Classification:** Categorizes items as armor, weapons, or treasures
2. **Attribute Extraction:** Extracts item attributes and properties
3. **Chit Processing:** Processes item chit data
4. **Value Calculation:** Calculates item values and properties
5. **JSON Generation:** Creates structured item JSON files

**Input:** Item XML files from core game data
**Output:** Item JSON files in `coregamedata/items/`

---

### 16. Monster Parser
**File:** `scripts/parse-monsters.js`

**Purpose:** Parses monster data from core game files

**Process:**
1. **Monster Identification:** Identifies all monster types
2. **Attribute Extraction:** Extracts monster attributes and abilities
3. **Combat Processing:** Processes combat-related data
4. **Spawn Information:** Extracts monster spawn data
5. **JSON Generation:** Creates structured monster JSON files

**Input:** Monster XML files from core game data
**Output:** Monster JSON files in `coregamedata/monsters/`

---

### 17. Native Parser
**File:** `scripts/parse-natives.js`

**Purpose:** Parses native data from core game files

**Process:**
1. **Native Identification:** Identifies all native types
2. **Attribute Extraction:** Extracts native attributes and abilities
3. **Location Processing:** Processes native location data
4. **Interaction Data:** Extracts interaction information
5. **JSON Generation:** Creates structured native JSON files

**Input:** Native XML files from core game data
**Output:** Native JSON files in `coregamedata/natives/`

---

### 18. Spell Parser
**File:** `scripts/parse-spells.js`

**Purpose:** Parses spell data from core game files

**Process:**
1. **Spell Classification:** Categorizes spells by type and level
2. **Attribute Extraction:** Extracts spell attributes and effects
3. **Casting Processing:** Processes casting requirements
4. **Effect Analysis:** Analyzes spell effects and durations
5. **JSON Generation:** Creates structured spell JSON files

**Input:** Spell XML files from core game data
**Output:** Spell JSON files in `coregamedata/spells/`

---

### 19. Tile Parser
**File:** `scripts/parse-tiles.js`

**Purpose:** Parses tile data from core game files

**Process:**
1. **Tile Identification:** Identifies all tile types
2. **Attribute Extraction:** Extracts tile attributes and properties
3. **Connection Processing:** Processes tile connection data
4. **Location Analysis:** Analyzes tile location information
5. **JSON Generation:** Creates structured tile JSON files

**Input:** Tile XML files from core game data
**Output:** Tile JSON files in `coregamedata/tiles/`

---

### 20. Chit Parser
**File:** `scripts/parse-chits.js`

**Purpose:** Parses chit data from core game files

**Process:**
1. **Chit Classification:** Categorizes chits by type
2. **Attribute Extraction:** Extracts chit attributes and properties
3. **Side Processing:** Processes chit sides and values
4. **Color Analysis:** Analyzes chit color information
5. **JSON Generation:** Creates structured chit JSON files

**Input:** Chit XML files from core game data
**Output:** Chit JSON files in `coregamedata/chits/`

---

## File Structure After Processing

Each processed session creates a folder structure like this:

```
public/parsed_sessions/[session-id]/
├── [session-id].rslog          # Original log file
├── [session-id].rsgame         # Original game file
├── extracted_game.xml          # Extracted XML data
├── parsed_session.json         # Structured session data
├── map_locations.json          # Map tile locations
├── character_stats.json        # Character statistics
├── character_inventories.json  # Character inventories
├── scoring.json               # Victory point assignments
├── final_scores.json          # Calculated final scores
├── session_titles.json        # Session title and subtitle
├── map_state_data.json        # Map state timeline
├── metadata.json              # Processing metadata
└── day_X_Y.txt               # Daily log files
```

## Error Handling

The parser system includes comprehensive error handling:

1. **Graceful Failures:** Individual parser failures don't stop the entire pipeline
2. **Error Logging:** All errors are logged with detailed information
3. **Partial Processing:** Sessions are processed as much as possible even with errors
4. **Recovery:** Failed sessions can be reprocessed using supplemental parsers
5. **Validation:** Data validation ensures output quality

## Performance Considerations

1. **Parallel Processing:** Sessions are processed sequentially to avoid conflicts
2. **Memory Management:** Large files are processed in chunks
3. **File Cleanup:** Temporary files are cleaned up after processing
4. **Caching:** Parsed data is cached to avoid reprocessing
5. **Incremental Updates:** Only missing data is processed for existing sessions

## Dependencies

The parser system requires several Node.js packages:
- `xml2js` - XML parsing
- `fs` - File system operations
- `path` - Path manipulation
- `child_process` - Script execution

## Future Enhancements

Potential improvements to the parser system:
1. **Parallel Processing:** Process multiple sessions simultaneously
2. **Real-time Processing:** Process sessions as they're uploaded
3. **Incremental Updates:** Update existing sessions with new data
4. **Data Validation:** Enhanced validation of parsed data
5. **Performance Optimization:** Optimize parsing algorithms for speed
6. **Error Recovery:** Automatic retry mechanisms for failed parsers 
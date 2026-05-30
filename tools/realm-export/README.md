# Hundred Acre Realm Hub

Java/Swing companion for [RealmSpeak](https://github.com/sch4fchen/RealmSpeak): launch the game and utilities, export completed saves, and upload session bundles to the Hundred Acre Realm site.

## Requirements

- **JDK 15+** (same as RealmSpeak)
- A local **RealmSpeak** install with `RealmSpeakFull.jar`, `mail.jar`, `activation.jar`, and `gameData/MagicRealmData.xml`

## Build and run (development)

From `tools/realm-export`:

```bat
build.bat
run.bat
```

On macOS:

```bash
chmod +x run-mac.sh
./run-mac.sh
```

Set `REALMSPEAK_HOME` to your install folder, or rely on the default dev path (`RealmSpeak-src/build/RealmSpeak1258`).

## Ship with a RealmSpeak build

```bat
deploy-to-realmspeak.bat ..\..\RealmSpeak-src\build\RealmSpeak1258
```

This copies `HundredAcreRealm.jar` and `run-hundred-acre.bat` into the install folder. Players double-click `run-hundred-acre.bat` to open the hub.

## Tabs

| Tab | Purpose |
|-----|---------|
| **Launcher** | Start RealmSpeak and bundled tools (Battle Builder, Character Builder, etc.) |
| **Upload** | Pick a `.rsgame`, export, and optionally upload to the site |
| **Settings** | RealmSpeak folder, site URL, API key, default export folder |

Settings persist as `hundred-acre-realm.json` in the RealmSpeak install directory (ideal for installers to pre-fill).

## What upload exports

For each selected save, choose an output folder. The tool writes:

| File | Purpose |
|------|---------|
| `<basename>.rsgame` | Copy of the save |
| `<basename>.rslog` | Matching log, if present beside the save |
| `extracted_game.xml` | Full `GameData_CHEATER_.xml` from the save ZIP |
| `setup_card.json` | All setup-card holders (`ts_section`), contents, and held denizens/treasures |
| `full_export.json` | Manifest + metadata + paths for the web pipeline |

## Site API workflow

1. In **Admin → API Keys**, generate a key (shown once).
2. In the export tool, set **Site URL** (e.g. `http://localhost:3000`) and paste the API key.
3. Choose a `.rsgame` and click **Allocate ID → Export → Upload**.

The tool will:

1. `POST /api/realm/v1/sessions/allocate` with a **realmKey** derived from the save (see below).
2. Export **full display bundle** locally (Node `scripts/run-session-pipeline.js`: log parse, map, scoring, inventories, titles, map state).
3. Build `{sessionId}.realm-session.zip` and `PUT /api/realm/v1/sessions/{sessionId}/bundle`.

The site only lists sessions that include **`parsed_session.json`** (and related display JSON). Public uploads include `.rsgame`, `.rslog`, `extracted_game.xml`, and all display JSON; only **`setup_card.json`** is omitted (treasure layout).

If a bundle arrives without `parsed_session.json` but includes `.rslog` or `.rsgame`, the server runs the same pipeline after import as a safety net.

### Stable table identity (realmKey)

| Priority | Source | Shared by all players? |
|----------|--------|-------------------------|
| 1 | Host Preferences `gp__` + save `_rseed` | Yes — same hosted game instance |
| 2 | Host Preferences `gp__` only (no `_rseed`) | Legacy fallback — one session per port |
| 3 | `_rseed` + host `g_title` / `g_pass` | Usually same table |
| 4 | Sorted `character_keys` roster | Same campaign setup |
| 5 | `_rseed` + save `name` | Solo / local games |

Any player at the same table can upload; the server returns the **same sessionId** for the same realmKey. Re-uploading the same save (same port + seed) updates that session; a **new game** gets a new `_rseed` and therefore a new session.

### Public vs admin profile

- **Public** (default): full display JSON plus `.rsgame`, `.rslog`, and `extracted_game.xml` — setup card omitted only.
- **Admin**: includes everything including `setup_card.json`.

### Display artifacts (public bundle)

`parsed_session.json`, `map_data.json`, `map_locations.json`, `game_state.json`, `character_stats.json`, `scoring.json`, `character_inventories.json`, `final_scores.json`, `enhanced_session.json`, `map_state_data.json`, `item_cache.json`, `session_listing.json`, plus day log splits (`day_*.txt`) when present.

## API reference

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/realm/v1/sessions/allocate` | Bearer API key |
| PUT | `/api/realm/v1/sessions/{id}/bundle` | Bearer API key (`Content-Type: application/zip`) |
| GET | `/api/realm/v1/sessions/{id}` | Bearer API key |

Headless CLI:

```bat
export-cli.bat path\to\save.rsgame path\to\output admin
```

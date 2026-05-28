# Realm Export Utility

Small Java/Swing tool (same stack as RealmSpeak) to pick a completed `.rsgame` save and produce an **upload bundle** with the save, log, extracted XML, and full treasure-setup-card data.

## Requirements

- **JDK 15+** (same as RealmSpeak)
- A local **RealmSpeak** install with `RealmSpeakFull.jar`, `mail.jar`, `activation.jar`, and `gameData/MagicRealmData.xml`

## Setup

Set `REALMSPEAK_HOME` to your RealmSpeak folder, or rely on the default relative path (`../../../RealmSpeak` from this directory).

Example:

```bat
set REALMSPEAK_HOME=C:\Users\chris\Documents\e-Sword\RealmSpeak
```

## Build and run

```bat
build.bat
run.bat
```

## What it exports

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
2. Export display JSON locally (runs Node `extract_realmspeak_save.js` when available).
3. Build `{sessionId}.realm-session.zip` and `PUT /api/realm/v1/sessions/{sessionId}/bundle`.

### Stable table identity (realmKey)

| Priority | Source | Shared by all players? |
|----------|--------|-------------------------|
| 1 | Host Preferences `gp__` (game port) | Yes — hosted online games |
| 2 | `_rseed` + host `g_title` / `g_pass` | Usually same table |
| 3 | Sorted `character_keys` roster | Same campaign setup |

Any player at the same table can upload; the server returns the **same sessionId** for the same realmKey.

### Public vs admin profile

- **Public** (default): bundle has map/display JSON only — no raw `.rsgame`, log, setup card, or full XML.
- **Admin**: includes everything for archive / re-processing.

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

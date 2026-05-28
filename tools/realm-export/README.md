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

Expand `SessionExporter` later for spells, native chart-only rows, and direct upload to Hundred Acre Realm.

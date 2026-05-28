# Hundred Acre Realm — cross-platform installer

Self-contained installers bundle **RealmSpeak**, the **Hundred Acre Realm hub**, and a **Temurin JRE 21** so players do not need Java pre-installed.

## What gets installed

| Component | Location after install |
|-----------|------------------------|
| RealmSpeak + game data | `{install}/` (flat folder) |
| Bundled JRE | `{install}/jre/` |
| Hub (`HundredAcreRealm.jar`) | `{install}/HundredAcreRealm.jar` |
| Settings | `{install}/hundred-acre-realm.json` |
| Launcher | `{install}/run-hundred-acre.sh` or `.bat` |

Default install paths (user can change during setup):

| OS | Default |
|----|---------|
| Windows | `%LOCALAPPDATA%\HundredAcreRealm\RealmSpeak` |
| macOS / Linux | `~/Games/Hundred-Acre-Realm` |

Pre-filled settings:

- `siteUrl`: `https://realm.hundredacre.club`
- `apiKey`: empty (you issue keys manually)
- `outputFolder`: `~/Documents/Hundred Acre Realm Exports`

Shortcuts:

- **Windows**: Start Menu + optional desktop (`.bat` launcher)
- **Linux**: `.desktop` in application menu (+ optional desktop link)
- **macOS**: `~/Applications/Hundred Acre Realm.app`

## Prerequisites before building

1. Place the RealmSpeak release build at `RealmSpeak-src/build/RealmSpeak1258/` (or set `REALMSPEAK_SOURCE`).
2. Build the hub jar once: `tools/realm-export/build.bat` (or let the staging script build it).
3. **Unix/macOS**: `bash`, `curl`, `tar`, `rsync`
4. **Windows**: PowerShell 5+, [Inno Setup 6](https://jrsoftware.org/isinfo.php) for a single `.exe` (otherwise a `.zip` fallback is produced)

## Build locally

```bash
cd tools/installer
chmod +x build.sh scripts/*.sh
./build.sh local          # current OS/arch
./build.sh all            # all six targets (macOS, Linux, Windows — from a Mac)
./build.sh mac-aarch64    # specific target
```

**Linux** and **Windows** installers can be built on macOS (Windows uses a 7-Zip self-extracting `.exe`; requires `brew install p7zip`).

Windows (also cross-platform from Mac):

```bash
./build.sh windows-x64
./build.sh windows-aarch64
```

On Windows, Inno Setup remains optional for a classic wizard installer:

```powershell
powershell -File tools/installer/windows/build-windows.ps1 -Arch x64
```

Output: `tools/installer/output/`

## Release artifacts (one file per OS × CPU)

| File | Platform |
|------|----------|
| `hundred-acre-realm-*-windows-x64.exe` | Windows 64-bit |
| `hundred-acre-realm-*-windows-aarch64.exe` | Windows ARM |
| `hundred-acre-realm-*-linux-x64.run` | Linux amd64 |
| `hundred-acre-realm-*-linux-aarch64.run` | Linux arm64 |
| `hundred-acre-realm-*-mac-x64.run` | macOS Intel |
| `hundred-acre-realm-*-mac-aarch64.run` | macOS Apple Silicon |

Each `.run` file is a self-extracting shell archive (~250–350 MB depending on platform).

CI builds all six via `.github/workflows/installer.yml` on push/tag.

## Things to know

### Upload tab and Node.js

The **Launcher** tab works fully offline with the bundled JRE only.

The **Upload** tab runs a local Node pipeline when possible. If Node is not installed, uploads still work in many cases because [the server can process incomplete bundles](https://realm.hundredacre.club) after import. For the 2–3 users who upload regularly, install Node 20+ separately or set `HUNDRED_ACRE_REALM_HOME` to a checkout of this repo.

### Code signing

Unsigned macOS/Windows builds may show Gatekeeper / SmartScreen warnings. For a small trusted group this is usually fine; for wider distribution, sign the macOS `.app`/`.pkg` and the Windows `.exe`.

### Size and updates

Installers are large (~200 MB game data + ~50 MB JRE). There is no auto-update yet; ship a new installer version and bump `VERSION`.

### RealmSpeak license

RealmSpeak is GPL-3.0. Distributing it in this installer must comply with the license (source availability, etc.).

### Linux package formats

A single `.run` works on Debian, Fedora, and Arch without separate deb/rpm packages. If you later want store-style packages, wrap the same staged payload with `fpm` or `nfpm`.

## Installer pre-seed for automation

Your future meta-installer can drop `hundred-acre-realm.json` after copying files, or run:

```bash
scripts/write-settings.sh "/path/to/install" "https://realm.hundredacre.club" "$HOME/Documents/Hundred Acre Realm Exports"
```

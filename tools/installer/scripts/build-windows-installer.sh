#!/usr/bin/env bash
# Build a Windows self-extracting installer (.exe) on macOS/Linux using 7-Zip SFX.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

ARCH="${1:-}"
if [[ -z "$ARCH" ]]; then
	die "Usage: build-windows-installer.sh <x64|aarch64>"
fi

"$SCRIPT_DIR/stage-payload.sh"
"$SCRIPT_DIR/fetch-jre.sh" windows "$ARCH"

cp "$SCRIPT_DIR/install.ps1" "$STAGING_DIR/install.ps1"
cp "$INSTALLER_ROOT/templates/SETUP.bat" "$STAGING_DIR/SETUP.bat"

mkdir -p "$OUTPUT_DIR"
OUT_BASE="${PRODUCT_SLUG}-${VERSION}-windows-${ARCH}"
PAYLOAD_7Z="$OUTPUT_DIR/.${OUT_BASE}.7z"
OUT_EXE="$OUTPUT_DIR/${OUT_BASE}.exe"
OUT_ZIP="$OUTPUT_DIR/${OUT_BASE}.zip"

log "Packaging Windows payload"
rm -f "$PAYLOAD_7Z" "$OUT_EXE" "$OUT_ZIP"
(
	cd "$STAGING_DIR"
	if command -v 7z >/dev/null 2>&1; then
		7z a -t7z -mx=9 "$PAYLOAD_7Z" game jre install.ps1 SETUP.bat site-url.txt version.txt app-icon.jpg 2>/dev/null \
			|| 7z a -t7z -mx=9 "$PAYLOAD_7Z" game jre install.ps1 SETUP.bat site-url.txt version.txt
	else
		die "7-Zip (7z) is required for Windows installers. Install with: brew install p7zip"
	fi
)

ensure_sfx_module() {
	local sfx="$CACHE_DIR/7zCon.sfx"
	if [[ -f "$sfx" ]]; then
		printf '%s' "$sfx"
		return
	fi
	log "Extracting 7-Zip SFX module (one-time)..."
	local installer="$CACHE_DIR/7z2501-x64.exe"
	if [[ ! -f "$installer" ]]; then
		curl -fsSL "https://www.7-zip.org/a/7z2501-x64.exe" -o "$installer"
	fi
	7z e -y "-o$CACHE_DIR" "$installer" "7zCon.sfx" >/dev/null
	[[ -f "$sfx" ]] || die "Failed to extract 7zCon.sfx from 7-Zip installer"
	printf '%s' "$sfx"
}

SFX="$(ensure_sfx_module)"
CONFIG="$(mktemp)"
cat > "$CONFIG" <<EOF
;!@Install@!UTF-8!
Title="${PRODUCT_NAME} ${VERSION}"
BeginPrompt="Install ${PRODUCT_NAME} and RealmSpeak?"
RunProgram="SETUP.bat"
;!@InstallEnd@!
EOF

log "Creating self-extracting installer $OUT_EXE"
cat "$SFX" "$CONFIG" "$PAYLOAD_7Z" > "$OUT_EXE"
rm -f "$CONFIG" "$PAYLOAD_7Z"

if command -v zip >/dev/null 2>&1; then
	log "Also writing zip fallback $OUT_ZIP"
	(
		cd "$STAGING_DIR"
		zip -qr "$OUT_ZIP" game jre install.ps1 SETUP.bat site-url.txt version.txt app-icon.jpg 2>/dev/null \
			|| zip -qr "$OUT_ZIP" game jre install.ps1 SETUP.bat site-url.txt version.txt
	)
fi

log "Built $OUT_EXE ($(du -sh "$OUT_EXE" | awk '{print $1}'))"

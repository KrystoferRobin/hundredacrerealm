#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_realmspeak_source
ensure_hub_jar

log "Staging payload from $REALMSPEAK_SOURCE"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/game"

rsync -a \
	--exclude 'HundredAcreRealm.jar' \
	--exclude 'run-hundred-acre.*' \
	--exclude 'hundred-acre-realm.json' \
	"$REALMSPEAK_SOURCE/" "$STAGING_DIR/game/"

cp "$HUB_JAR" "$STAGING_DIR/game/HundredAcreRealm.jar"
cp "$INSTALLER_ROOT/templates/run-hundred-acre.sh" "$STAGING_DIR/game/run-hundred-acre.sh"
cp "$INSTALLER_ROOT/templates/run-hundred-acre.bat" "$STAGING_DIR/game/run-hundred-acre.bat"
chmod +x "$STAGING_DIR/game/run-hundred-acre.sh"

if command -v unzip >/dev/null 2>&1; then
	unzip -p "$STAGING_DIR/game/RealmSpeakFull.jar" resources/images/logo/rs_logo.jpg \
		> "$STAGING_DIR/app-icon.jpg" 2>/dev/null || true
fi

printf '%s\n' "$VERSION" > "$STAGING_DIR/version.txt"
printf '%s\n' "$SITE_URL" > "$STAGING_DIR/site-url.txt"

log "Payload staged in $STAGING_DIR/game ($(du -sh "$STAGING_DIR/game" | awk '{print $1}'))"

#!/usr/bin/env bash
# Shared helpers for installer build scripts.
set -euo pipefail

INSTALLER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$INSTALLER_ROOT/../.." && pwd)"
STAGING_DIR="${STAGING_DIR:-$INSTALLER_ROOT/staging}"
OUTPUT_DIR="${OUTPUT_DIR:-$INSTALLER_ROOT/output}"
CACHE_DIR="${CACHE_DIR:-$INSTALLER_ROOT/cache}"
REALMSPEAK_SOURCE="${REALMSPEAK_SOURCE:-$REPO_ROOT/RealmSpeak-src/build/RealmSpeak1258}"
HUB_JAR="${HUB_JAR:-$REPO_ROOT/tools/realm-export/HundredAcreRealm.jar}"
SITE_URL="${SITE_URL:-https://realm.hundredacre.club}"
PRODUCT_NAME="${PRODUCT_NAME:-Hundred Acre Realm}"
PRODUCT_SLUG="${PRODUCT_SLUG:-hundred-acre-realm}"
VERSION="${VERSION:-1.0.1}"

log() { printf '==> %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

ensure_hub_jar() {
	if [[ -f "$HUB_JAR" ]]; then
		return 0
	fi
	log "Building HundredAcreRealm.jar..."
	(
		cd "$REPO_ROOT/tools/realm-export"
		export REALMSPEAK_HOME="$REALMSPEAK_SOURCE"
		if [[ -x /opt/homebrew/opt/openjdk@21/bin/javac ]]; then
			export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
		fi
		CP="$REALMSPEAK_SOURCE/mail.jar:$REALMSPEAK_SOURCE/activation.jar:$REALMSPEAK_SOURCE/RealmSpeakFull.jar"
		mkdir -p build
		javac -encoding UTF-8 -cp "$CP" -d build src/com/hundredacre/realm/export/*.java
		printf 'Main-Class: com.hundredacre.realm.export.RealmExportApp\n' > build/manifest.txt
		jar cfm HundredAcreRealm.jar build/manifest.txt -C build com
	)
	[[ -f "$HUB_JAR" ]] || die "Failed to build $HUB_JAR"
}

require_realmspeak_source() {
	[[ -d "$REALMSPEAK_SOURCE" ]] || die "RealmSpeak build not found: $REALMSPEAK_SOURCE"
	[[ -f "$REALMSPEAK_SOURCE/RealmSpeakFull.jar" ]] || die "RealmSpeakFull.jar missing in $REALMSPEAK_SOURCE"
}

adoptium_os() {
	case "$1" in
		linux|mac|windows) echo "$1" ;;
		*) die "Unsupported OS for JRE fetch: $1" ;;
	esac
}

adoptium_arch() {
	case "$1" in
		x64|amd64) echo "x64" ;;
		aarch64|arm64) echo "aarch64" ;;
		*) die "Unsupported arch for JRE fetch: $1" ;;
	esac
}

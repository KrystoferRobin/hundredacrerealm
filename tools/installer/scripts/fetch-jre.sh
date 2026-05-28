#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

OS="${1:-}"
ARCH="${2:-}"
if [[ -z "$OS" || -z "$ARCH" ]]; then
	die "Usage: fetch-jre.sh <linux|mac|windows> <x64|aarch64>"
fi

OS_API="$(adoptium_os "$OS")"
ARCH_API="$(adoptium_arch "$ARCH")"
CACHE_KEY="temurin-21-jre-${OS_API}-${ARCH_API}"
CACHE_FILE="$CACHE_DIR/${CACHE_KEY}.archive"

mkdir -p "$CACHE_DIR" "$STAGING_DIR"

ARCHIVE_PATH="${CACHE_FILE}.tar.gz"
if [[ "$OS_API" == "windows" ]]; then
	ARCHIVE_PATH="${CACHE_FILE}.zip"
fi

if [[ ! -f "$ARCHIVE_PATH" ]]; then
	URL="https://api.adoptium.net/v3/binary/latest/21/ga/${OS_API}/${ARCH_API}/jre/hotspot/normal/eclipse?project=jdk"
	log "Downloading JRE 21 ($OS_API/$ARCH_API)..."
	if [[ "$OS_API" == "windows" ]]; then
		curl -fsSL "$URL" -o "$ARCHIVE_PATH"
	else
		curl -fsSL "$URL" -o "$ARCHIVE_PATH"
	fi
fi

find_jre_home() {
	local root="$1"
	local java_bin
	java_bin="$(find "$root" -type f \( -name java -o -name 'java.exe' \) -path '*/bin/*' 2>/dev/null | head -1)"
	[[ -n "$java_bin" ]] || return 1
	dirname "$(dirname "$java_bin")"
}

copy_jre_tree() {
	local src="$1"
	local dest="$2"
	if [[ "$(uname -s)" == "Darwin" ]] && command -v ditto >/dev/null 2>&1; then
		ditto "$src" "$dest"
	else
		cp -a "$src/." "$dest/"
	fi
}

JRE_DIR="$STAGING_DIR/jre"
log "Extracting JRE to $JRE_DIR"
rm -rf "$JRE_DIR"
mkdir -p "$JRE_DIR"

TMP_EXTRACT="$(mktemp -d)"
cleanup() { rm -rf "$TMP_EXTRACT"; }
trap cleanup EXIT

if [[ "$OS_API" == "windows" ]]; then
	unzip -q "$ARCHIVE_PATH" -d "$TMP_EXTRACT"
else
	tar xzf "$ARCHIVE_PATH" -C "$TMP_EXTRACT"
fi

JRE_ROOT="$(find_jre_home "$TMP_EXTRACT" || true)"
[[ -n "$JRE_ROOT" ]] || die "Could not locate JRE home in downloaded archive"
copy_jre_tree "$JRE_ROOT" "$JRE_DIR"
trap - EXIT
cleanup

[[ -x "$JRE_DIR/bin/java" || -x "$JRE_DIR/bin/java.exe" ]] || die "JRE extraction failed"
log "JRE ready at $JRE_DIR ($(du -sh "$JRE_DIR" | awk '{print $1}'))"

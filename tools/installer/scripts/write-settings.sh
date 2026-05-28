#!/usr/bin/env bash
# Write hundred-acre-realm.json for an install directory.
set -euo pipefail

INSTALL_DIR="${1:?install dir}"
SITE_URL="${2:-https://realm.hundredacre.club}"
OUTPUT_FOLDER="${3:-$HOME/Documents/Hundred Acre Realm Exports}"

json_escape() {
	local s="$1"
	s="${s//\\/\\\\}"
	s="${s//\"/\\\"}"
	s="${s//$'\n'/\\n}"
	s="${s//$'\r'/\\r}"
	s="${s//$'\t'/\\t}"
	printf '%s' "$s"
}

INSTALL_ESC="$(json_escape "$(cd "$INSTALL_DIR" && pwd)")"
SITE_ESC="$(json_escape "$SITE_URL")"
OUT_ESC="$(json_escape "$OUTPUT_FOLDER")"

cat > "$INSTALL_DIR/hundred-acre-realm.json" <<EOF
{
  "realmspeakHome": "$INSTALL_ESC",
  "siteUrl": "$SITE_ESC",
  "apiKey": "",
  "outputFolder": "$OUT_ESC",
  "lastSaveDirectory": ""
}
EOF

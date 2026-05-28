#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

TARGET_OS="${1:-}"
TARGET_ARCH="${2:-}"
if [[ -z "$TARGET_OS" || -z "$TARGET_ARCH" ]]; then
	die "Usage: build-unix-installer.sh <linux|mac> <x64|aarch64>"
fi

"$SCRIPT_DIR/stage-payload.sh"
"$SCRIPT_DIR/fetch-jre.sh" "$TARGET_OS" "$TARGET_ARCH"

cp "$SCRIPT_DIR/install.sh" "$STAGING_DIR/install.sh"
cp "$SCRIPT_DIR/write-settings.sh" "$STAGING_DIR/write-settings.sh"
chmod +x "$STAGING_DIR/install.sh" "$STAGING_DIR/write-settings.sh"

mkdir -p "$OUTPUT_DIR"
ARCHIVE="$(mktemp)"
PAYLOAD_TAR="$OUTPUT_DIR/.payload-$$.tar.gz"
tar czf "$PAYLOAD_TAR" -C "$STAGING_DIR" .

OUT_NAME="${PRODUCT_SLUG}-${VERSION}-${TARGET_OS}-${TARGET_ARCH}.run"
OUT_FILE="$OUTPUT_DIR/$OUT_NAME"

{
	cat <<'HEADER'
#!/usr/bin/env bash
set -euo pipefail
ARCHIVE_LINE=$(awk '/^__ARCHIVE_BELOW__$/ {print NR + 1; exit 0; }' "$0")
TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
tail -n +"$ARCHIVE_LINE" "$0" | tar xzf - -C "$TMP"
bash "$TMP/install.sh" "$TMP"
exit 0
__ARCHIVE_BELOW__
HEADER
	cat "$PAYLOAD_TAR"
} > "$OUT_FILE"
chmod +x "$OUT_FILE"
rm -f "$PAYLOAD_TAR"

log "Built $OUT_FILE ($(du -sh "$OUT_FILE" | awk '{print $1}'))"

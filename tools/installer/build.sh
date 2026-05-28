#!/usr/bin/env bash
# Build installers for the current platform or a specified target.
set -euo pipefail
INSTALLER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/common.sh
source "$INSTALLER_ROOT/scripts/common.sh"

usage() {
	cat <<EOF
Usage: $(basename "$0") [target]

Targets:
  mac-aarch64       macOS Apple Silicon (.run)
  mac-x64           macOS Intel (.run)
  linux-x64         Linux amd64 (.run)
  linux-aarch64     Linux arm64 (.run)
  windows-x64       Windows x64 (.exe self-extractor, built cross-platform via 7-Zip)
  windows-aarch64   Windows ARM64 (.exe self-extractor)
  local             Build for current OS/arch
  all-local         Build all targets for current OS (both arches if applicable)
  all               Build all six installers (macOS, Linux, Windows — from macOS/Linux)

Environment:
  REALMSPEAK_SOURCE   Path to RealmSpeak1258 build folder
  VERSION             Installer version (default: $VERSION)
  SITE_URL            Default API URL (default: $SITE_URL)
EOF
}

build_unix() {
	local os="$1" arch="$2"
	STAGING_DIR="$STAGING_DIR" OUTPUT_DIR="$OUTPUT_DIR" \
		"$INSTALLER_ROOT/scripts/build-unix-installer.sh" "$os" "$arch"
}

build_windows() {
	local arch="$1"
	STAGING_DIR="$STAGING_DIR" OUTPUT_DIR="$OUTPUT_DIR" \
		"$INSTALLER_ROOT/scripts/build-windows-installer.sh" "$arch"
}

build_local() {
	local uname_s uname_m
	uname_s="$(uname -s)"
	uname_m="$(uname -m)"
	case "$uname_s" in
		Darwin)
			case "$uname_m" in
				arm64) build_unix mac aarch64 ;;
				x86_64) build_unix mac x64 ;;
				*) die "Unsupported Mac arch: $uname_m" ;;
			esac
			;;
		Linux)
			case "$uname_m" in
				x86_64) build_unix linux x64 ;;
				aarch64|arm64) build_unix linux aarch64 ;;
				*) die "Unsupported Linux arch: $uname_m" ;;
			esac
			;;
		*)
			die "Use Windows build script on Windows: powershell windows/build-windows.ps1"
			;;
	esac
}

TARGET="${1:-local}"
mkdir -p "$OUTPUT_DIR" "$CACHE_DIR"

case "$TARGET" in
	mac-aarch64) build_unix mac aarch64 ;;
	mac-x64) build_unix mac x64 ;;
	linux-x64) build_unix linux x64 ;;
	linux-aarch64) build_unix linux aarch64 ;;
	windows-x64) build_windows x64 ;;
	windows-aarch64) build_windows aarch64 ;;
	local) build_local ;;
	all)
		build_unix mac aarch64
		build_unix mac x64
		build_unix linux x64
		build_unix linux aarch64
		build_windows x64
		build_windows aarch64
		;;
	all-local)
		case "$(uname -s)" in
			Darwin)
				build_unix mac aarch64
				build_unix mac x64
				;;
			Linux)
				build_unix linux x64
				build_unix linux aarch64
				;;
		esac
		;;
	-h|--help) usage; exit 0 ;;
	*) die "Unknown target: $TARGET (see --help)" ;;
esac

log "Output directory: $OUTPUT_DIR"

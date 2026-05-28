#!/usr/bin/env bash
# Bundled with the installer — copies RealmSpeak + JRE and registers shortcuts.
set -euo pipefail

BUNDLE_ROOT="${1:?bundle root}"
PRODUCT_NAME="${PRODUCT_NAME:-Hundred Acre Realm}"
SITE_URL="$(cat "$BUNDLE_ROOT/site-url.txt" 2>/dev/null || echo 'https://realm.hundredacre.club')"

detect_os() {
	case "$(uname -s)" in
		Darwin) echo mac ;;
		Linux) echo linux ;;
		MINGW*|MSYS*|CYGWIN*) echo windows ;;
		*) echo unknown ;;
	esac
}

default_install_dir() {
	local os="$1"
	case "$os" in
		mac) printf '%s/Games/Hundred-Acre-Realm' "$HOME" ;;
		linux) printf '%s/Games/Hundred-Acre-Realm' "$HOME" ;;
		windows)
			if [[ -n "${LOCALAPPDATA:-}" ]]; then
				printf '%s/HundredAcreRealm/RealmSpeak' "$LOCALAPPDATA"
			else
				printf '%s/HundredAcreRealm/RealmSpeak' "$HOME/AppData/Local"
			fi
			;;
		*) printf '%s/Hundred-Acre-Realm' "$HOME" ;;
	esac
}

prompt_install_dir() {
	local os="$1"
	local default
	default="$(default_install_dir "$os")"

	if [[ -n "${INSTALL_DIR:-}" ]]; then
		printf '%s' "$INSTALL_DIR"
		return
	fi

	case "$os" in
		mac)
			local picked
			picked="$(osascript -e 'POSIX path of (choose folder with prompt "Choose install folder for Hundred Acre Realm")' 2>/dev/null || true)"
			picked="${picked%/}"
			if [[ -n "$picked" ]]; then
				printf '%s/Hundred-Acre-Realm' "$picked"
			else
				printf '%s' "$default"
			fi
			;;
		linux)
			if command -v zenity >/dev/null 2>&1; then
				local picked
				picked="$(zenity --file-selection --directory --title="Choose install folder" 2>/dev/null || true)"
				if [[ -n "$picked" ]]; then
					printf '%s/Hundred-Acre-Realm' "$picked"
					return
				fi
			fi
			printf '%s\n' "Install to: $default" >&2
			read -r -p "Press Enter to accept, or type a path: " reply || true
			if [[ -n "${reply:-}" ]]; then
				printf '%s' "$reply"
			else
				printf '%s' "$default"
			fi
			;;
		*)
			printf '%s' "$default"
			;;
	esac
}

install_files() {
	local target="$1"
	mkdir -p "$target"
	rsync -a "$BUNDLE_ROOT/game/" "$target/"
	rsync -a "$BUNDLE_ROOT/jre/" "$target/jre/"
	chmod +x "$target/run-hundred-acre.sh" 2>/dev/null || true
	if [[ -f "$BUNDLE_ROOT/app-icon.jpg" ]]; then
		cp "$BUNDLE_ROOT/app-icon.jpg" "$target/app-icon.jpg"
	fi
}

write_settings() {
	local target="$1"
	local exports="$HOME/Documents/Hundred Acre Realm Exports"
	mkdir -p "$exports"
	"$BUNDLE_ROOT/write-settings.sh" "$target" "$SITE_URL" "$exports"
}

install_linux_shortcuts() {
	local target="$1"
	local desktop_dir="$HOME/.local/share/applications"
	local icon="$target/app-icon.jpg"
	mkdir -p "$desktop_dir"
	cat > "$desktop_dir/hundred-acre-realm.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=${PRODUCT_NAME}
Comment=Launch RealmSpeak and the Hundred Acre Realm hub
Exec=${target}/run-hundred-acre.sh
Path=${target}
Icon=${icon}
Terminal=false
Categories=Game;
EOF
	chmod +x "$desktop_dir/hundred-acre-realm.desktop"
	if command -v update-desktop-database >/dev/null 2>&1; then
		update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
	fi
	if [[ -d "$HOME/Desktop" ]]; then
		ln -sf "$target/run-hundred-acre.sh" "$HOME/Desktop/Hundred Acre Realm.run" 2>/dev/null || true
	fi
}

install_mac_app() {
	local target="$1"
	local app="$HOME/Applications/${PRODUCT_NAME}.app"
	mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
	cat > "$app/Contents/MacOS/${PRODUCT_NAME}" <<EOF
#!/bin/bash
exec "${target}/run-hundred-acre.sh"
EOF
	chmod +x "$app/Contents/MacOS/${PRODUCT_NAME}"
	if [[ -f "$target/app-icon.jpg" ]]; then
		cp "$target/app-icon.jpg" "$app/Contents/Resources/app-icon.jpg"
	fi
	cat > "$app/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${PRODUCT_NAME}</string>
  <key>CFBundleDisplayName</key><string>${PRODUCT_NAME}</string>
  <key>CFBundleIdentifier</key><string>club.hundredacre.realm</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleExecutable</key><string>${PRODUCT_NAME}</string>
  <key>CFBundleIconFile</key><string>app-icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict>
</plist>
EOF
}

main() {
	local os target
	os="$(detect_os)"
	target="$(prompt_install_dir "$os")"
	target="$(cd "$(dirname "$target")" && pwd)/$(basename "$target")"

	printf '\nInstalling to:\n  %s\n\n' "$target"
	install_files "$target"
	write_settings "$target"

	case "$os" in
		linux) install_linux_shortcuts "$target" ;;
		mac) install_mac_app "$target" ;;
	esac

	printf '\nInstallation complete.\n'
	printf 'Launch from: %s/run-hundred-acre.sh\n' "$target"
	case "$os" in
		mac) printf 'Or open: ~/Applications/%s.app\n' "$PRODUCT_NAME" ;;
		linux) printf 'Or find "%s" in your application menu.\n' "$PRODUCT_NAME" ;;
	esac
}

main "$@"

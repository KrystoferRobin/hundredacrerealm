#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -z "${REALMSPEAK_HOME:-}" ]]; then
  DEV_HOME="$(cd ../../RealmSpeak-src/build/RealmSpeak1258 2>/dev/null && pwd || true)"
  if [[ -n "$DEV_HOME" && -f "$DEV_HOME/RealmSpeakFull.jar" ]]; then
    export REALMSPEAK_HOME="$DEV_HOME"
  else
    export REALMSPEAK_HOME="$(cd ../../../RealmSpeak 2>/dev/null && pwd || echo "")"
  fi
fi

if [[ ! -f "$REALMSPEAK_HOME/RealmSpeakFull.jar" ]]; then
  echo "ERROR: RealmSpeak not found. Set REALMSPEAK_HOME." >&2
  exit 1
fi

if [[ ! -f build/com/hundredacre/realm/export/RealmExportApp.class ]]; then
  CP="$REALMSPEAK_HOME/mail.jar:$REALMSPEAK_HOME/activation.jar:$REALMSPEAK_HOME/RealmSpeakFull.jar"
  mkdir -p build
  javac -encoding UTF-8 -cp "$CP" -d build src/com/hundredacre/realm/export/*.java
fi

CP="build:$REALMSPEAK_HOME/mail.jar:$REALMSPEAK_HOME/activation.jar:$REALMSPEAK_HOME/RealmSpeakFull.jar"
exec java -mx512m -cp "$CP" com.hundredacre.realm.export.RealmExportApp

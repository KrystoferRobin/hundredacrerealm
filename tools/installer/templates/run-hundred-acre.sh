#!/usr/bin/env bash
cd "$(dirname "$0")"
INSTALL_DIR="$(pwd)"
export REALMSPEAK_HOME="$INSTALL_DIR"

if [[ -x "$INSTALL_DIR/jre/bin/java" ]]; then
	JAVA="$INSTALL_DIR/jre/bin/java"
else
	JAVA="${JAVA:-java}"
fi

CP="HundredAcreRealm.jar:mail.jar:activation.jar:RealmSpeakFull.jar"
exec "$JAVA" -mx512m -cp "$CP" com.hundredacre.realm.export.RealmExportApp

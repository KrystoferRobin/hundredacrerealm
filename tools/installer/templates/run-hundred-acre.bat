@echo off
cd /d "%~dp0"
set "REALMSPEAK_HOME=%~dp0"
set "CP=HundredAcreRealm.jar;mail.jar;activation.jar;RealmSpeakFull.jar"

if exist "%~dp0jre\bin\javaw.exe" (
  start "" "%~dp0jre\bin\javaw.exe" -mx512m -cp "%CP%" com.hundredacre.realm.export.RealmExportApp
) else if exist "%~dp0jre\bin\java.exe" (
  start "" "%~dp0jre\bin\java.exe" -mx512m -cp "%CP%" com.hundredacre.realm.export.RealmExportApp
) else (
  start javaw -mx512m -cp "%CP%" com.hundredacre.realm.export.RealmExportApp
)

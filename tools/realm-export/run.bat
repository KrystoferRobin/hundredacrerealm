@echo off
setlocal
cd /d "%~dp0"

if not exist build\com\hundredacre\realm\export\RealmExportApp.class (
  call build.bat
  if errorlevel 1 exit /b 1
)

call :resolve_realmspeak_home
if errorlevel 1 exit /b 1

set "CP=build;%REALMSPEAK_HOME%\mail.jar;%REALMSPEAK_HOME%\activation.jar;%REALMSPEAK_HOME%\RealmSpeakFull.jar"
echo Using RealmSpeak: %REALMSPEAK_HOME%
start javaw -mx512m -cp "%CP%" com.hundredacre.realm.export.RealmExportApp
exit /b 0

:resolve_realmspeak_home
if not "%REALMSPEAK_HOME%"=="" goto :verify_rs_home
set "REALMSPEAK_HOME=%~dp0..\..\..\RealmSpeak"
:verify_rs_home
if not exist "%REALMSPEAK_HOME%\RealmSpeakFull.jar" (
  echo ERROR: RealmSpeak not found at "%REALMSPEAK_HOME%"
  exit /b 1
)
exit /b 0

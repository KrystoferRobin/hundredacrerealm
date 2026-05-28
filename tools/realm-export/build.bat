@echo off
setlocal
cd /d "%~dp0"

call :resolve_realmspeak_home
if errorlevel 1 exit /b 1

set "CP=build;%REALMSPEAK_HOME%\mail.jar;%REALMSPEAK_HOME%\activation.jar;%REALMSPEAK_HOME%\RealmSpeakFull.jar"
if not exist build mkdir build

echo Building Hundred Acre Realm hub (classpath: RealmSpeakFull.jar)...
javac -encoding UTF-8 -cp "%CP%" -d build src\com\hundredacre\realm\export\*.java
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

echo Creating HundredAcreRealm.jar...
echo Main-Class: com.hundredacre.realm.export.RealmExportApp> build\manifest.txt
jar cfm HundredAcreRealm.jar build\manifest.txt -C build com
if errorlevel 1 (
  echo JAR packaging failed.
  exit /b 1
)

echo Build OK: HundredAcreRealm.jar
exit /b 0

:resolve_realmspeak_home
if not "%REALMSPEAK_HOME%"=="" goto :verify_rs_home
set "REALMSPEAK_HOME=%~dp0..\..\RealmSpeak-src\build\RealmSpeak1258"
if exist "%REALMSPEAK_HOME%\RealmSpeakFull.jar" goto :done
set "REALMSPEAK_HOME=%~dp0..\..\..\RealmSpeak"
:verify_rs_home
if not exist "%REALMSPEAK_HOME%\RealmSpeakFull.jar" (
  echo ERROR: RealmSpeak not found at "%REALMSPEAK_HOME%"
  echo Set REALMSPEAK_HOME to your RealmSpeak install directory.
  exit /b 1
)
:done
exit /b 0

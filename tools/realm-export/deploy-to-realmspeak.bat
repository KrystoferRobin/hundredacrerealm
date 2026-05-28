@echo off
setlocal
cd /d "%~dp0"

if not exist HundredAcreRealm.jar (
  call build.bat
  if errorlevel 1 exit /b 1
)

if "%~1"=="" (
  echo Usage: deploy-to-realmspeak.bat ^<RealmSpeak install folder^>
  echo Example: deploy-to-realmspeak.bat ..\..\RealmSpeak-src\build\RealmSpeak1258
  exit /b 1
)

set "TARGET=%~f1"
if not exist "%TARGET%\RealmSpeakFull.jar" (
  echo ERROR: "%TARGET%" does not look like a RealmSpeak install.
  exit /b 1
)

copy /Y HundredAcreRealm.jar "%TARGET%\HundredAcreRealm.jar" >nul
copy /Y run-hundred-acre.bat "%TARGET%\run-hundred-acre.bat" >nul

echo Deployed HundredAcreRealm.jar and run-hundred-acre.bat to:
echo   %TARGET%
exit /b 0

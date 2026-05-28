@echo off
cd /d "%~dp0"
if not exist build\com\hundredacre\realm\export\SessionExporterCli.class call build.bat
call :resolve_realmspeak_home
set "CP=build;%REALMSPEAK_HOME%\mail.jar;%REALMSPEAK_HOME%\activation.jar;%REALMSPEAK_HOME%\RealmSpeakFull.jar"
java -mx512m -cp "%CP%" com.hundredacre.realm.export.SessionExporterCli %*
exit /b %ERRORLEVEL%

:resolve_realmspeak_home
if not "%REALMSPEAK_HOME%"=="" goto :done
set "REALMSPEAK_HOME=%~dp0..\..\..\RealmSpeak"
:done
exit /b 0

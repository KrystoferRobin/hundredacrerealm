; Hundred Acre Realm — Windows installer (Inno Setup 6+)
; Build: iscc /DMyAppVersion=1.0.0 /DStagingDir=...\staging /DOutputDir=...\output hundred-acre-realm.iss

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef StagingDir
  #define StagingDir "..\staging"
#endif
#ifndef OutputDir
  #define OutputDir "..\output"
#endif
#ifndef OutputBase
  #define OutputBase "hundred-acre-realm-" + MyAppVersion + "-windows-x64"
#endif
#ifndef ArchitecturesAllowed
  #define ArchitecturesAllowed "x64compatible"
#endif
#ifndef ArchitecturesInstallIn64BitMode
  #define ArchitecturesInstallIn64BitMode "x64compatible"
#endif

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName=Hundred Acre Realm
AppVersion={#MyAppVersion}
AppPublisher=Hundred Acre Realm
DefaultDirName={localappdata}\HundredAcreRealm\RealmSpeak
DefaultGroupName=Hundred Acre Realm
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBase}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed={#ArchitecturesAllowed}
ArchitecturesInstallIn64BitMode={#ArchitecturesInstallIn64BitMode}
PrivilegesRequired=lowest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "{#StagingDir}\game\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#StagingDir}\jre\*"; DestDir: "{app}\jre"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Hundred Acre Realm"; Filename: "{app}\run-hundred-acre.bat"; WorkingDir: "{app}"
Name: "{autodesktop}\Hundred Acre Realm"; Filename: "{app}\run-hundred-acre.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\run-hundred-acre.bat"; Description: "Launch Hundred Acre Realm"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  JsonPath, ExportsDir, SiteUrl: String;
  Json: String;
begin
  if CurStep = ssPostInstall then
  begin
    ExportsDir := ExpandConstant('{userdocs}\Hundred Acre Realm Exports');
    ForceDirectories(ExportsDir);
    SiteUrl := 'https://realm.hundredacre.club';
    JsonPath := ExpandConstant('{app}\hundred-acre-realm.json');
    Json := '{' + #13#10 +
      '  "realmspeakHome": "' + ReplaceStr(ExpandConstant('{app}'), '\', '\\') + '",' + #13#10 +
      '  "siteUrl": "' + SiteUrl + '",' + #13#10 +
      '  "apiKey": "",' + #13#10 +
      '  "outputFolder": "' + ReplaceStr(ExportsDir, '\', '\\') + '",' + #13#10 +
      '  "lastSaveDirectory": ""' + #13#10 +
      '}';
    SaveStringToFile(JsonPath, Json, False);
  end;
end;

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

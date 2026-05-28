#requires -Version 5.1
param(
    [ValidateSet("x64", "aarch64")]
    [string]$Arch = "x64"
)

$ErrorActionPreference = "Stop"
$InstallerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $InstallerRoot "..\..")
$StagingDir = Join-Path $InstallerRoot "staging"
$OutputDir = Join-Path $InstallerRoot "output"
$RealmSpeakSource = if ($env:REALMSPEAK_SOURCE) { $env:REALMSPEAK_SOURCE } else { Join-Path $RepoRoot "RealmSpeak-src\build\RealmSpeak1258" }
$Version = if ($env:VERSION) { $env:VERSION } else { "1.0.0" }
$SiteUrl = if ($env:SITE_URL) { $env:SITE_URL } else { "https://realm.hundredacre.club" }

function Write-SettingsJson {
    param([string]$InstallDir)
    $exports = Join-Path $env:USERPROFILE "Documents\Hundred Acre Realm Exports"
    New-Item -ItemType Directory -Force -Path $exports | Out-Null
    $json = @{
        realmspeakHome = $InstallDir
        siteUrl = $SiteUrl
        apiKey = ""
        outputFolder = $exports
        lastSaveDirectory = ""
    } | ConvertTo-Json -Compress
    Set-Content -Path (Join-Path $InstallDir "hundred-acre-realm.json") -Value $json -Encoding UTF8
}

Write-Host "==> Staging Windows payload ($Arch)"
if (-not (Test-Path $RealmSpeakSource)) { throw "RealmSpeak build not found: $RealmSpeakSource" }

$StageGame = Join-Path $StagingDir "game"
$StageJre = Join-Path $StagingDir "jre"
Remove-Item -Recurse -Force $StagingDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $StageGame | Out-Null

robocopy $RealmSpeakSource $StageGame /E /XD .git /XF HundredAcreRealm.jar run-hundred-acre.bat hundred-acre-realm.json | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $LASTEXITCODE" }

$HubJar = Join-Path $RepoRoot "tools\realm-export\HundredAcreRealm.jar"
if (-not (Test-Path $HubJar)) { throw "Build HundredAcreRealm.jar first: $HubJar" }
Copy-Item $HubJar (Join-Path $StageGame "HundredAcreRealm.jar") -Force
Copy-Item (Join-Path $InstallerRoot "templates\run-hundred-acre.bat") (Join-Path $StageGame "run-hundred-acre.bat") -Force
Set-Content -Path (Join-Path $StagingDir "site-url.txt") -Value $SiteUrl
Set-Content -Path (Join-Path $StagingDir "version.txt") -Value $Version

Write-Host "==> Downloading Temurin JRE 21 (windows/$Arch)"
$CacheDir = Join-Path $InstallerRoot "cache"
New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
$CacheFile = Join-Path $CacheDir "temurin-21-jre-windows-$Arch.zip"
if (-not (Test-Path $CacheFile)) {
    $Url = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/$Arch/jre/hotspot/normal/eclipse?project=jdk"
    Invoke-WebRequest -Uri $Url -OutFile $CacheFile
}

Remove-Item -Recurse -Force $StageJre -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $StageJre | Out-Null
$ExtractTemp = Join-Path $env:TEMP "har-jre-$Arch"
Remove-Item -Recurse -Force $ExtractTemp -ErrorAction SilentlyContinue
Expand-Archive -Path $CacheFile -DestinationPath $ExtractTemp -Force
$JavaBin = Get-ChildItem -Path $ExtractTemp -Recurse -Filter java.exe -File |
    Where-Object { $_.Directory.Name -eq 'bin' } |
    Select-Object -First 1
if (-not $JavaBin) { throw "Could not locate java.exe in downloaded JRE" }
$JreRoot = $JavaBin.Directory.Parent.FullName
Copy-Item -Path (Join-Path $JreRoot '*') -Destination $StageJre -Recurse -Force
Remove-Item -Recurse -Force $ExtractTemp

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$IssFile = Join-Path $InstallerRoot "windows\hundred-acre-realm.iss"
$OutBase = "hundred-acre-realm-$Version-windows-$Arch"

if (Get-Command iscc.exe -ErrorAction SilentlyContinue) {
    Write-Host "==> Building Inno Setup installer"
    $ArchAllowed = if ($Arch -eq "aarch64") { "arm64" } else { "x64compatible" }
    $ArchInstall = $ArchAllowed
    & iscc.exe `
        "/DMyAppVersion=$Version" `
        "/DStagingDir=$StagingDir" `
        "/DOutputDir=$OutputDir" `
        "/DOutputBase=$OutBase" `
        "/DArchitecturesAllowed=$ArchAllowed" `
        "/DArchitecturesInstallIn64BitMode=$ArchInstall" `
        $IssFile
} else {
    Write-Host "==> Inno Setup not found; creating ZIP fallback"
    $ZipPath = Join-Path $OutputDir "$OutBase.zip"
    if (Test-Path $ZipPath) { Remove-Item $ZipPath }
    Compress-Archive -Path (Join-Path $StagingDir "*") -DestinationPath $ZipPath
    Write-Host "Built $ZipPath (install Inno Setup for a single .exe)"
}

Write-Host "==> Done"

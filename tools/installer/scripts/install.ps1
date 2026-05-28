# Bundled with the Windows installer — run via SETUP.bat or SFX post-extract.
param(
    [string]$BundleRoot = $PSScriptRoot,
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"
$ProductName = "Hundred Acre Realm"
$SiteUrl = "https://realm.hundredacre.club"
$siteUrlFile = Join-Path $BundleRoot "site-url.txt"
if (Test-Path $siteUrlFile) {
    $SiteUrl = (Get-Content $siteUrlFile -Raw).Trim()
}

function Get-DefaultInstallDir {
    return Join-Path $env:LOCALAPPDATA "HundredAcreRealm\RealmSpeak"
}

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = Get-DefaultInstallDir
    Write-Host ""
    Write-Host "Default install folder:"
    Write-Host "  $InstallDir"
    $reply = Read-Host "Press Enter to accept, or type a different path"
    if (-not [string]::IsNullOrWhiteSpace($reply)) {
        $InstallDir = $reply.Trim()
    }
}

$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
$gameSrc = Join-Path $BundleRoot "game"
$jreSrc = Join-Path $BundleRoot "jre"

if (-not (Test-Path (Join-Path $gameSrc "RealmSpeakFull.jar"))) {
    throw "Invalid installer bundle: game payload missing."
}

Write-Host ""
Write-Host "Installing to:"
Write-Host "  $InstallDir"
Write-Host ""

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $gameSrc "*") -Destination $InstallDir -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "jre") | Out-Null
Copy-Item -Path (Join-Path $jreSrc "*") -Destination (Join-Path $InstallDir "jre") -Recurse -Force

$exports = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Hundred Acre Realm Exports"
New-Item -ItemType Directory -Force -Path $exports | Out-Null

$settings = @{
    realmspeakHome = $InstallDir
    siteUrl = $SiteUrl
    apiKey = ""
    outputFolder = $exports
    lastSaveDirectory = ""
} | ConvertTo-Json -Compress

Set-Content -Path (Join-Path $InstallDir "hundred-acre-realm.json") -Value $settings -Encoding UTF8

$startMenu = [Environment]::GetFolderPath("Programs")
$shortcutDir = Join-Path $startMenu $ProductName
New-Item -ItemType Directory -Force -Path $shortcutDir | Out-Null
$launcher = Join-Path $InstallDir "run-hundred-acre.bat"
$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut((Join-Path $shortcutDir "$ProductName.lnk"))
$lnk.TargetPath = $launcher
$lnk.WorkingDirectory = $InstallDir
$lnk.Description = "Launch RealmSpeak and the Hundred Acre Realm hub"
$lnk.Save()

$desktop = [Environment]::GetFolderPath("Desktop")
if (Test-Path $desktop) {
    $desktopLnk = Join-Path $desktop "$ProductName.lnk"
    if (Test-Path $desktopLnk) { Remove-Item $desktopLnk -Force }
    Copy-Item (Join-Path $shortcutDir "$ProductName.lnk") $desktopLnk
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Launch from: $launcher"
Write-Host "Or Start Menu: $ProductName"
Write-Host ""
Read-Host "Press Enter to close"

[CmdletBinding()]
param(
    [ValidateSet('install', 'uninstall')]
    [string]$Action = 'install'
)

$ErrorActionPreference = 'Stop'
$launcherName = 'lyssna-lyrics-legacy.mjs'
$pixelLauncherName = 'spicy-lyrics-pixel.mjs'
$previousLauncherName = 'lyssna-lyrics.mjs'
$launcherUrl = "https://raw.githubusercontent.com/LyssnaHQ/lyssna-lyrics-legacy/refs/heads/dev/builds/$launcherName"
$spicetifyCommand = Get-Command spicetify -ErrorAction SilentlyContinue
if (-not $spicetifyCommand) {
    throw 'Install and set up Spicetify first: https://spicetify.app/docs/getting-started'
}

function Invoke-Spicetify {
    param([string[]]$CliArguments)
    & $spicetifyCommand @CliArguments
    if ($LASTEXITCODE -ne 0) {
        throw ('Spicetify failed: spicetify ' + ($CliArguments -join ' '))
    }
}

$configOutput = @(& $spicetifyCommand -c)
if ($LASTEXITCODE -ne 0 -or $configOutput.Count -ne 1) {
    throw 'Could not find the Spicetify config. Finish Spicetify setup before continuing.'
}
$configFile = ([string]$configOutput[0]).Trim()
if (-not $configFile -or -not (Test-Path -LiteralPath $configFile -PathType Leaf)) {
    throw 'Spicetify has no config file yet. Finish Spicetify setup before continuing.'
}
$extensionDirectory = Join-Path (Split-Path -Parent $configFile) 'Extensions'
$launcherPath = Join-Path $extensionDirectory $launcherName
$previousLauncherPath = Join-Path $extensionDirectory $previousLauncherName
$supersededLaunchers = @($pixelLauncherName)
# The rewrite also uses the old filename. Only migrate copies that point to Legacy.
$legacyEntrypoint = 'https://(cdn\.jsdelivr\.net/gh/(iPixelGalaxy/(lyssna-lyrics|spicy-lyrics)|LyssnaHQ/lyssna-lyrics-legacy)@[^/]+/builds/(v2\.0|main)/entrypoint\.mjs|ipixelgalaxy\.com/(lyssna-plugin/)?entrypoint\.mjs)'
if ((Test-Path -LiteralPath $previousLauncherPath -PathType Leaf) -and
    (Get-Content -LiteralPath $previousLauncherPath -Raw) -match $legacyEntrypoint) {
    $supersededLaunchers += $previousLauncherName
}

if ($Action -eq 'install') {
    New-Item -ItemType Directory -Path $extensionDirectory -Force | Out-Null
    $downloadPath = Join-Path $extensionDirectory ('.lyssna-lyrics-' + [guid]::NewGuid().ToString('N') + '.download')
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri $launcherUrl -OutFile $downloadPath -TimeoutSec 60
        Move-Item -LiteralPath $downloadPath -Destination $launcherPath -Force
    } finally {
        if (Test-Path -LiteralPath $downloadPath) {
            Remove-Item -LiteralPath $downloadPath -Force
        }
    }

    Invoke-Spicetify -CliArguments @('config', 'extensions', $launcherName)
    foreach ($name in $supersededLaunchers) {
        Invoke-Spicetify -CliArguments @('config', 'extensions', ($name + '-'))
    }
    Invoke-Spicetify -CliArguments @('apply')
    Write-Host 'Lyssna Lyrics installed. Open lyrics with the microphone button in Spotify.'
} else {
    $installedLaunchers = @($launcherName) + $supersededLaunchers
    foreach ($name in $installedLaunchers) {
        Invoke-Spicetify -CliArguments @('config', 'extensions', ($name + '-'))
    }
    Invoke-Spicetify -CliArguments @('apply')
    foreach ($name in $installedLaunchers) {
        $installedPath = Join-Path $extensionDirectory $name
        if (Test-Path -LiteralPath $installedPath -PathType Leaf) {
            Remove-Item -LiteralPath $installedPath -Force
        }
    }
    Write-Host 'Lyssna Lyrics uninstalled. Your saved lyric settings have been kept.'
}

<# Builds the AI voice package from frozen, selected game audio inputs. #>
param([switch]$SkipNpmInstall)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
$PackDir = Join-Path $ScriptDir 'pack/with_audio'
$Ccmixar = Join-Path $ScriptDir '.github/bin/ccmixar/ccmixar.exe'

function Invoke-Checked {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

function Convert-SubtitleEncoding {
    param([string]$FilePath)
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    if ($bytes.Length -lt 2) { throw "Empty subtitle: $FilePath" }
    if ($bytes[0] -eq 255 -and $bytes[1] -eq 254) { return }
    if ($bytes[0] -ne 254 -or $bytes[1] -ne 255) { throw "Expected UTF-16 subtitle BOM: $FilePath" }
    $content = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $bytes.Length - 2)
    $content = $content -replace '\r?\n', "`r`n"
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.Encoding]::Unicode)
}

Invoke-Checked 'node' @('.github/scripts/check-voice-inputs.js')
foreach ($inputPath in @('.github/bin/ccmixar/ccmixar.exe', 'csf/ra2.zh_Hans.json', 'csf/ra2md.zh_Hans.json',
    'cameo/ra2', 'cameo/yr', 'cameo/titles-ra2.csv', 'cameo/titles-yr.csv',
    'bik/ra2', 'bik/yr', 'credits/credits.txt', 'credits/creditsmd.txt',
    'fnt/game.fnt', 'shp/grfxtxt.shp', 'subtitle/subtitle.txt', 'subtitle/subtitlemd.txt',
    '_src_files/language', '_src_files/langmd', '_src_files/taunts')) {
    if (-not (Test-Path -LiteralPath $inputPath)) { throw "Missing build input: $inputPath" }
}
$SevenZip = (Get-Command 7z -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $PackDir, 'Taunts', '_src_files/cameo', '_src_files/cameomd' -Force | Out-Null

Write-Host 'Convert JSON to CSF'
Push-Location '.github/scripts/convert-json-to-csf'
try { Invoke-Checked 'node' @('index.js') } finally { Pop-Location }
Copy-Item './ra2.csf' -Destination './_src_files/language/' -Force
Copy-Item './ra2md.csf' -Destination './_src_files/langmd/' -Force
Convert-SubtitleEncoding './subtitle/subtitle.txt'
Convert-SubtitleEncoding './subtitle/subtitlemd.txt'

Write-Host 'Convert and pack cameos'
Push-Location '.github/scripts/convert-png-to-shp'
try {
    if (-not $SkipNpmInstall) { Invoke-Checked 'npm' @('ci') }
    Invoke-Checked 'node' @('index.js')
} finally { Pop-Location }
Copy-Item './cameo/ra2/*.shp' -Destination './_src_files/cameo/' -Force
Copy-Item './cameo/yr/*.shp' -Destination './_src_files/cameomd/' -Force
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/cameo', '-mix', './_src_files/language/cameo.mix', '-checksum', '-encrypt')
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/cameomd', '-mix', './_src_files/langmd/cameomd.mix', '-checksum', '-encrypt')

Copy-Item './bik/ra2/*' -Destination './_src_files/language/' -Force
Copy-Item './bik/yr/*' -Destination './_src_files/langmd/' -Force
Copy-Item './credits/credits.txt' -Destination './_src_files/language/' -Force
Copy-Item './credits/creditsmd.txt' -Destination './_src_files/langmd/' -Force
Copy-Item './fnt/game.fnt' -Destination './_src_files/language/' -Force
Copy-Item './shp/grfxtxt.shp' -Destination './_src_files/language/' -Force
Copy-Item './_src_files/taunts/*' -Destination './Taunts/' -Force

# The selected BAG/IDX and loose WAV snapshot is authoritative. Re-inserting
# older synthesis WAVs here would silently undo the reviewed package choices.
Write-Host 'Pack frozen AI voice containers'
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/audio', '-mix', './_src_files/language/audio.mix')
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/audiomd', '-mix', './_src_files/langmd/audiomd.mix')
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/language', '-mix', './language.mix', '-checksum', '-encrypt')
Invoke-Checked $Ccmixar @('pack', '-game', 'ra2', '-dir', './_src_files/langmd', '-mix', './langmd.mix', '-checksum')

$ZipWithAudio = Join-Path $PackDir 'RedAlert2-AIVoice-zh_hans.zip'
if (Test-Path -LiteralPath $ZipWithAudio) { Remove-Item -LiteralPath $ZipWithAudio }
Invoke-Checked $SevenZip @('a', '-tzip', $ZipWithAudio, 'Taunts', '.\subtitle\*', 'language.mix', 'langmd.mix', 'README.txt')
Invoke-Checked $SevenZip @('t', $ZipWithAudio)
Write-Host "Built: $ZipWithAudio"

# Generate TTS audio for each chapter using edge-tts
param(
  [string]$Manifest = "$PSScriptRoot\chapters.json",
  [string]$AudioDir = "$PSScriptRoot\audio",
  [string]$Voice = "en-IN-NeerjaNeural"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $AudioDir | Out-Null

$chapters = Get-Content $Manifest -Raw | ConvertFrom-Json
foreach ($ch in $chapters) {
  $txt = Join-Path $AudioDir "$($ch.id).txt"
  $mp3 = Join-Path $AudioDir "$($ch.id).mp3"
  Set-Content -Path $txt -Value $ch.narration -Encoding UTF8
  if (Test-Path $mp3) { Write-Host "Skip $($ch.id) (exists)"; continue }
  Write-Host "TTS $($ch.id): $($ch.title)"
  edge-tts --voice $Voice --file $txt --write-media $mp3
}
Write-Host "Audio generation complete: $AudioDir"

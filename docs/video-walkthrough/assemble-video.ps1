# Assemble walkthrough MP4 from chapters manifest, screenshots, and audio
param(
  [string]$Manifest = "$PSScriptRoot\chapters.json",
  [string]$ScreenshotDir = "$PSScriptRoot\screenshots-normalized",
  [string]$AudioDir = "$PSScriptRoot\audio",
  [string]$SegmentDir = "$PSScriptRoot\segments",
  [string]$Output = "$PSScriptRoot\SumayaEngage360-Walkthrough.mp4"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $SegmentDir | Out-Null

$chapters = Get-Content $Manifest -Raw | ConvertFrom-Json
$concatList = Join-Path $SegmentDir "concat.txt"
if (Test-Path $concatList) { Remove-Item $concatList }

$i = 0
foreach ($ch in $chapters) {
  $img = Join-Path $ScreenshotDir $ch.screenshot
  $aud = Join-Path $AudioDir "$($ch.id).mp3"
  $seg = Join-Path $SegmentDir "$($ch.id).mp4"
  if (-not (Test-Path $img)) { Write-Warning "Missing screenshot: $img"; continue }
  if (-not (Test-Path $aud)) { Write-Warning "Missing audio: $aud"; continue }
  if (Test-Path $seg) {
    Write-Host "Skip segment $($ch.id) (exists)"
    $segPath = $seg -replace '\\', '/'
    Add-Content $concatList "file '$segPath'"
    $i++
    continue
  }
  Write-Host "Segment $($ch.id): $($ch.title)"
  $args = @(
    '-y', '-loop', '1', '-i', $img, '-i', $aud,
    '-c:v', 'libx264', '-tune', 'stillimage', '-c:a', 'aac', '-b:a', '192k',
    '-pix_fmt', 'yuv420p', '-r', '1', '-shortest', $seg
  )
  $proc = Start-Process -FilePath ffmpeg -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardError (Join-Path $SegmentDir "$($ch.id)-ffmpeg.log")
  if ($proc.ExitCode -ne 0) { throw "ffmpeg failed for $($ch.id) (exit $($proc.ExitCode))" }
  $segPath = $seg -replace '\\', '/'
  Add-Content $concatList "file '$segPath'"
  $i++
}

if ($i -eq 0) { throw "No segments created" }

$concatProc = Start-Process -FilePath ffmpeg -ArgumentList @('-y', '-f', 'concat', '-safe', '0', '-i', $concatList, '-c', 'copy', $Output) -NoNewWindow -Wait -PassThru -RedirectStandardError (Join-Path $SegmentDir 'concat-ffmpeg.log')
if ($concatProc.ExitCode -ne 0) { throw "ffmpeg concat failed (exit $($concatProc.ExitCode))" }

$dur = (& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $Output)
Write-Host "Created $Output (duration: $([math]::Round([double]$dur,1))s, $i segments)"

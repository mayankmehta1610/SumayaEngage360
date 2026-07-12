# Assemble the complete 92-screen verified walkthrough with correct still-frame timing.
param(
  [string]$BaseManifest = "$PSScriptRoot\chapters.json",
  [string]$AuditManifest = "$PSScriptRoot\audit-chapters.json",
  [string]$ScreenshotDir = "$PSScriptRoot\screenshots-normalized",
  [string]$AudioDir = "$PSScriptRoot\audio",
  [string]$SegmentDir = "$PSScriptRoot\segments-verified",
  [string]$Output = "$PSScriptRoot\SumayaEngage360-Verified-Audit-Walkthrough.mp4"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $SegmentDir | Out-Null

$chapters = @()
$chapters += Get-Content $BaseManifest -Raw | ConvertFrom-Json
$chapters += Get-Content $AuditManifest -Raw | ConvertFrom-Json
$concatList = Join-Path $SegmentDir "concat.txt"
if (Test-Path $concatList) { Remove-Item $concatList }

foreach ($ch in $chapters) {
  $img = Join-Path $ScreenshotDir $ch.screenshot
  $aud = Join-Path $AudioDir "$($ch.id).mp3"
  $seg = Join-Path $SegmentDir "$($ch.id).mp4"
  if (-not (Test-Path $img)) { throw "Missing screenshot: $img" }
  if (-not (Test-Path $aud)) { throw "Missing audio: $aud" }

  if (-not (Test-Path $seg)) {
    Write-Host "Segment $($ch.id): $($ch.title)"
    $log = Join-Path $SegmentDir "$($ch.id)-ffmpeg.log"
    $args = @(
      '-y', '-framerate', '1', '-loop', '1', '-i', $img, '-i', $aud,
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'stillimage',
      '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p', '-r', '1',
      '-shortest', $seg
    )
    $proc = Start-Process -FilePath ffmpeg -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardError $log
    if ($proc.ExitCode -ne 0) { throw "ffmpeg failed for $($ch.id) (exit $($proc.ExitCode))" }
  }

  $segPath = $seg -replace '\\', '/'
  Add-Content $concatList "file '$segPath'"
}

$log = Join-Path $SegmentDir 'concat-ffmpeg.log'
$proc = Start-Process -FilePath ffmpeg -ArgumentList @(
  '-y', '-f', 'concat', '-safe', '0', '-i', $concatList, '-c', 'copy', $Output
) -NoNewWindow -Wait -PassThru -RedirectStandardError $log
if ($proc.ExitCode -ne 0) { throw "ffmpeg concat failed (exit $($proc.ExitCode))" }

$duration = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $Output
Write-Host "Created $Output ($($chapters.Count) screens, $([math]::Round([double]$duration, 1)) seconds)"

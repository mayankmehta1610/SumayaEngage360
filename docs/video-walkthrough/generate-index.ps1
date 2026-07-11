# Generate screenshot-index.md from chapters.json
$root = $PSScriptRoot
$chapters = Get-Content (Join-Path $root "chapters.json") -Raw | ConvertFrom-Json
$lines = @("# Screenshot Index", "", "| # | Chapter | Screenshot | Title |", "|---|---------|------------|-------|")
$i = 1
foreach ($ch in $chapters) {
  $lines += "| $i | $($ch.id) | ``$($ch.screenshot)`` | $($ch.title) |"
  $i++
}
Set-Content -Path (Join-Path $root "screenshot-index.md") -Value ($lines -join "`n") -Encoding UTF8
Write-Host "Wrote screenshot-index.md ($($chapters.Count) entries)"

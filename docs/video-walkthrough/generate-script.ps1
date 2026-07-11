# Generate script.md from chapters.json
$root = $PSScriptRoot
$chapters = Get-Content (Join-Path $root "chapters.json") -Raw | ConvertFrom-Json
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# SumayaEngage360 — Video Walkthrough Script")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("**Tenant:** sumaya (demo)  ")
[void]$sb.AppendLine("**Roles covered:** TENANT_ADMIN, HR, MANAGER, EMPLOYEE, BGC_VENDOR  ")
[void]$sb.AppendLine("**Platform:** https://engage360-web.onrender.com")
[void]$sb.AppendLine("")
foreach ($ch in $chapters) {
  [void]$sb.AppendLine("## $($ch.id): $($ch.title)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("**Screenshot:** ``screenshots/$($ch.screenshot)``")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine($ch.narration)
  [void]$sb.AppendLine("")
}
$out = Join-Path $root "script.md"
Set-Content -Path $out -Value $sb.ToString() -Encoding UTF8
Write-Host "Wrote script.md ($($chapters.Count) sections)"

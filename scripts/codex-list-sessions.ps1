param(
  [string]$SessionRoot = (Join-Path $env:USERPROFILE ".codex\sessions"),
  [int]$Count = 10,
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SessionRoot)) {
  if ($AsJson) {
    @() | ConvertTo-Json
  }
  exit 0
}

$sessions = Get-ChildItem -LiteralPath $SessionRoot -Recurse -File -Filter "*.jsonl" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First $Count |
  ForEach-Object {
    [PSCustomObject]@{
      name = $_.Name
      path = $_.FullName
      updatedAt = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
      bytes = $_.Length
    }
  }

if ($AsJson) {
  $sessions | ConvertTo-Json -Depth 4
  exit 0
}

$index = 1
foreach ($session in $sessions) {
  Write-Host ("{0}. {1} | {2} | {3} bytes" -f $index, $session.updatedAt, $session.name, $session.bytes)
  Write-Host ("   {0}" -f $session.path)
  $index++
}

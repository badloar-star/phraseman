param(
  [int]$PerLetter = 24,
  [int]$RequiredCount = 176,
  [string]$OutputPath = "content/daily-phrases/es/cvc-source-ledger.json"
)

$ErrorActionPreference = 'Stop'
$base = 'https://cvc.cervantes.es/lengua/refranero/'
$letters = @('A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','Q','R','S','T','U','V','Y','Z')

function PlainText([string]$html) {
  $withoutTags = [regex]::Replace($html, '<[^>]+>', ' ')
  $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
  return [regex]::Replace($decoded, '\s+', ' ').Trim()
}

$byLetter = @{}
foreach ($letter in $letters) {
  $page = Invoke-WebRequest -UseBasicParsing -Uri ($base + 'listado.aspx?letra=' + $letter) -TimeoutSec 30
  $byLetter[$letter] = @($page.Links |
    Where-Object { $_.href -match '^ficha\.aspx\?Par=(\d+)&(?:amp;)?Lng=0$' } |
    Select-Object -First $PerLetter |
    ForEach-Object {
      $id = [regex]::Match($_.href, 'Par=(\d+)').Groups[1].Value
      [pscustomobject]@{ letter = $letter; sourceId = $id; sourceUrl = $base + "ficha.aspx?Lng=0&Par=$id" }
    })
}

$roundRobin = [System.Collections.Generic.List[object]]::new()
for ($index = 0; $index -lt $PerLetter; $index += 1) {
  foreach ($letter in $letters) {
    if ($index -lt $byLetter[$letter].Count) { $roundRobin.Add($byLetter[$letter][$index]) }
  }
}

$fetched = $roundRobin | ForEach-Object -Parallel {
  $candidate = $_
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $candidate.sourceUrl -TimeoutSec 30
    $html = $response.Content
    function LocalPlain([string]$value) {
      $withoutTags = [regex]::Replace($value, '<[^>]+>', ' ')
      $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
      return [regex]::Replace($decoded, '\s+', ' ').Trim()
    }
    $titleMatch = [regex]::Match($html, '<h1>(.*?)</h1>', 'Singleline,IgnoreCase')
    $meaningMatch = [regex]::Match($html, '<strong>Significado:\s*</strong>(.*?)(?:</p>)', 'Singleline,IgnoreCase')
    $usageMatch = [regex]::Match($html, '<strong>Marcador de uso:\s*</strong>(.*?)(?:</p>)', 'Singleline,IgnoreCase')
    $contextMatch = [regex]::Match($html, '<strong>Contexto:\s*</strong>(.*?)(?:</p>)', 'Singleline,IgnoreCase')
    [pscustomobject]@{
      sourceId = $candidate.sourceId
      sourceUrl = $candidate.sourceUrl
      httpStatus = [int]$response.StatusCode
      targetText = if ($titleMatch.Success) { LocalPlain $titleMatch.Groups[1].Value } else { '' }
      definitionQuote = if ($meaningMatch.Success) { LocalPlain $meaningMatch.Groups[1].Value } else { '' }
      usageMarker = if ($usageMatch.Success) { LocalPlain $usageMatch.Groups[1].Value } else { '' }
      contextQuote = if ($contextMatch.Success) { LocalPlain $contextMatch.Groups[1].Value } else { '' }
    }
  } catch {
    [pscustomobject]@{ sourceId = $candidate.sourceId; sourceUrl = $candidate.sourceUrl; error = $_.Exception.Message }
  }
} -ThrottleLimit 10

$accepted = @($fetched |
  Where-Object {
    $_.httpStatus -eq 200 -and $_.targetText -and $_.definitionQuote -and
    $_.usageMarker -and $_.usageMarker -notmatch '(?i)poco usado|en desuso|anticuad|regional'
  } |
  Select-Object -First $RequiredCount)

$usageMarkerCounts = @($fetched | Where-Object { $_.usageMarker } | Group-Object usageMarker | Sort-Object Count -Descending | ForEach-Object {
  [ordered]@{ marker = $_.Name; count = $_.Count }
})

$result = [ordered]@{
  schemaVersion = 'daily-phrase-cvc-source-ledger-v1'
  studyTarget = 'es'
  source = 'Centro Virtual Cervantes — Refranero Multilingüe'
  sourceHome = 'https://cvc.cervantes.es/lengua/refranero/'
  checkedAt = [DateTime]::UtcNow.ToString('o')
  requiredCount = $RequiredCount
  acceptedCount = $accepted.Count
  status = if ($accepted.Count -eq $RequiredCount) { 'SOURCE_READY' } else { 'HOLD_INSUFFICIENT_VERIFIED_ROWS' }
  usageMarkerCounts = $usageMarkerCounts
  rows = $accepted
}

$directory = Split-Path -Parent $OutputPath
if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output ($result | ConvertTo-Json -Compress -Depth 3)
if ($accepted.Count -ne $RequiredCount) { exit 2 }

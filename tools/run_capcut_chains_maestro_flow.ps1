param(
  [string]$Flow = "maestro\flows\capcut\chains_desktop_quality_guard.yaml",
  [string]$DraftDir = "C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658",
  [string]$AssetsDir = "exports\chains\episode1\unique_explanations_approved",
  [string]$Report = "exports\chains\episode1\unique_explanations_approved\capcut_chains_quality_gate_report.json",
  [string]$IntroManifest = "exports\chains\episode1\unique_explanations_approved\intro_semantic_manifest.json",
  [switch]$SkipExplanationGate,
  [switch]$AllowCapCutOpen
)

$ErrorActionPreference = "Stop"
$maestro = "C:\maestro\bin\maestro.bat"

if (-not (Test-Path -LiteralPath $maestro)) {
  throw "Maestro CLI not found: $maestro"
}

& $maestro check-syntax $Flow
if ($LASTEXITCODE -ne 0) {
  throw "Maestro flow syntax failed: $Flow"
}

$argsList = @(
  "tools/capcut_chains_quality_gate.py",
  "--draft-dir", $DraftDir,
  "--assets-dir", $AssetsDir,
  "--report", $Report,
  "--intro-manifest", $IntroManifest
)

if ($AllowCapCutOpen) {
  $argsList += "--allow-capcut-open"
}

if ($SkipExplanationGate) {
  $argsList += "--skip-explanation-gate"
}

$env:PYTHONIOENCODING = "utf-8"
& python @argsList
if ($LASTEXITCODE -ne 0) {
  throw "CapCut Chains desktop quality gate failed. See report: $Report"
}

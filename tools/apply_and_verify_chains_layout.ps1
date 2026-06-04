param(
  [string]$DraftDir = "C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658",
  [string]$Flow = "maestro\flows\capcut\chains_desktop_quality_guard.yaml",
  [string]$AssetsDir = "exports\chains\episode1\unique_explanations_approved",
  [string]$IntroManifest = "exports\chains\episode1\unique_explanations_approved\intro_semantic_manifest.json"
)

$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"

& "C:\maestro\bin\maestro.bat" check-syntax $Flow
if ($LASTEXITCODE -ne 0) {
  throw "Maestro syntax gate failed: $Flow"
}

& python tools\repair_chains_explanations_cta_layout.py `
  --draft-dir $DraftDir `
  --report "$AssetsDir\layout_repair_report.json"
if ($LASTEXITCODE -ne 0) {
  throw "Chains layout repair failed"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\run_capcut_chains_maestro_flow.ps1 `
  -Flow $Flow `
  -DraftDir $DraftDir `
  -AssetsDir $AssetsDir `
  -IntroManifest $IntroManifest `
  -Report "$AssetsDir\capcut_chains_quality_gate_report.json"
if ($LASTEXITCODE -ne 0) {
  throw "Chains Maestro/Desktop quality flow failed"
}

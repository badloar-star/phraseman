# Полная пересборка без `gradlew clean` (на новой архитектуре RN clean часто ломается из-за CMake).
# Удаляет нативный кэш .cxx и папки outputs, чистит кэш Metro в node_modules, затем сборка заново.
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Remove-Item -Recurse -Force (Join-Path $root "android\app\.cxx") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root "android\app\build") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root "android\build") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root "node_modules\.cache") -ErrorAction SilentlyContinue

foreach ($nm in @(Get-ChildItem (Join-Path $root "node_modules") -Directory -ErrorAction SilentlyContinue)) {
  $ab = Join-Path $nm.FullName "android\build"
  Remove-Item -Recurse -Force $ab -ErrorAction SilentlyContinue
}

Write-Host "[android-hard-rebuild] Cleared android/.cxx + build dirs + metro cache under node_modules\.cache"

param(
  [Parameter(Mandatory = $true)]
  [string]$FlowPath
)

$candidates = @(
  (Join-Path $env:USERPROFILE ".maestro\bin\maestro.bat"),
  (Join-Path $env:LOCALAPPDATA "maestro\bin\maestro.bat"),
  (Join-Path $env:LOCALAPPDATA "Programs\Maestro\bin\maestro.bat"),
  "C:\maestro\bin\maestro.bat"
)

$cmd = Get-Command maestro -ErrorAction SilentlyContinue
if ($cmd -and $cmd.Source) {
  $maestro = $cmd.Source
} else {
  $maestro = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $maestro) {
  Write-Error "Maestro CLI not found. Checked PATH and: $($candidates -join ', '). Install Maestro CLI and run again."
  exit 1
}

# Maestro не рекурсирует в подпапки: для каталога собираем все *.yaml (кроме имён с подчёркиванием в корне).
$resolved = Resolve-Path -LiteralPath $FlowPath -ErrorAction SilentlyContinue
$target = if ($resolved) { $resolved.Path } else { $FlowPath }
if (Test-Path -LiteralPath $target -PathType Container) {
  $ymls = @(Get-ChildItem -Path $target -Recurse -File -Filter *.yaml -ErrorAction SilentlyContinue)
  if ($ymls.Count -eq 0) {
    Write-Error "No .yaml flows under: $target"
    exit 1
  }
  # Один эмулятор: параллельные Flow на одном UDID ломают launchApp/таб-бар.
  if ($ymls.Count -eq 1) {
    & $maestro test $ymls[0].FullName
  } else {
    $exit = 0
    foreach ($f in ($ymls | Sort-Object FullName)) {
      & $maestro test $f.FullName
      if ($LASTEXITCODE -ne 0) { $exit = $LASTEXITCODE }
    }
    exit $exit
  }
} else {
  & $maestro test $FlowPath
}
exit $LASTEXITCODE

$rows = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
  $cl = [string]$_.CommandLine
  $kind = if ($cl -match 'jest-worker|processChild') { 'worker' } elseif ($cl -match 'expo.*start|start-dev|expo[\\/]cli') { 'expo-main' } elseif ($cl -match 'jest') { 'jest' } elseif ($cl -match 'claude') { 'claude' } else { 'other' }
  [pscustomobject]@{ PID = $_.ProcessId; MB = [int]($_.WorkingSetSize / 1MB); Kind = $kind; Cmd = $cl.Substring(0, [Math]::Min(110, $cl.Length)) }
}
$rows | Group-Object Kind | ForEach-Object { '{0,-10} procs {1,3}  total {2,6} MB' -f $_.Name, $_.Count, ($_.Group | Measure-Object MB -Sum).Sum }
'--- top 12:'
$rows | Sort-Object MB -Descending | Select-Object -First 12 | ForEach-Object { '{0,6} MB  {1,-9} pid {2,-6} {3}' -f $_.MB, $_.Kind, $_.PID, $_.Cmd }
'--- watchman:'
Get-Process watchman -ErrorAction SilentlyContinue | ForEach-Object { '{0} MB  pid {1}' -f [int]($_.WorkingSet64 / 1MB), $_.Id }
$os = Get-CimInstance Win32_OperatingSystem
'free: {0} MB of {1} MB' -f [int]($os.FreePhysicalMemory / 1024), [int]($os.TotalVisibleMemorySize / 1024)

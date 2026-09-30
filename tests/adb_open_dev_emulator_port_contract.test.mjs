import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const SCRIPT_PATH = 'scripts/adb-open-dev-emulator.ps1';
const source = fs.readFileSync(SCRIPT_PATH, 'utf8').replace(/\r\n/g, '\n');
const PROTECTED_BEHAVIOR_HASH = 'df5fec71f9e009cff7ddf8cd814d3175263c03d580f56c5090ba297432e84306';

function extractFunction(candidate, name) {
  const start = candidate.indexOf(`function ${name}`);
  if (start < 0) return null;
  const open = candidate.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < candidate.length; index += 1) {
    if (candidate[index] === '{') depth += 1;
    if (candidate[index] === '}') depth -= 1;
    if (depth === 0) return candidate.slice(start, index + 1);
  }
  return null;
}

function runReversePlan(functionSource, hostPort) {
  const command = `${functionSource}\n$plan = @(Get-AdbReversePlan -HostPort ${hostPort})\nConvertTo-Json -InputObject $plan -Compress`;
  const encoded = Buffer.from(command, 'utf16le').toString('base64');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim());
}

function section(candidate, pattern, label) {
  const match = candidate.match(pattern);
  assert.ok(match, `${label} exists`);
  return match[0].replace(/[ \t]+/g, ' ').trim();
}

function protectedBehaviorHash(candidate) {
  const protectedSections = [
    section(candidate, /param\([\s\S]*?\)\n# Android Emulator/, 'parameter contract'),
    section(candidate, /\$ErrorActionPreference = "Stop"[\s\S]*?exit 1\n}/, 'adb discovery'),
    section(candidate, /\$emuSerialTrim = \$Serial\.Trim\(\)[\s\S]*?exit 1\n}/, 'serial selection'),
    section(candidate, /\$hostUrl = "127\.0\.0\.1"[\s\S]*?\$deep = .+/, 'package deep link'),
    section(candidate, /\$avd = ""[\s\S]*?if \(-not \$avd\) \{ \$avd = "unknown-avd" \}/, 'AVD label'),
    section(candidate, /if \(-not \$NoForceStop\) \{[\s\S]*?Start-Sleep -Milliseconds 250\n  }/, 'NoForceStop behavior'),
    section(candidate, /& \$adb -s \$emuSerial shell am start -a android\.intent\.action\.VIEW -d \$deep -p \$pkg/, 'launch behavior'),
    section(candidate, /exit 0\s*$/, 'success exit'),
  ];
  return crypto.createHash('sha256').update(protectedSections.join('\n---\n')).digest('hex');
}

function validateWiring(candidate) {
  assert.match(candidate, /\$reversePlan\s*=\s*@\(Get-AdbReversePlan -HostPort \$Port\)/);
  assert.match(candidate, /foreach \(\$emuSerial in \(\$serials \| Select-Object -Unique\)\)/);
  assert.match(candidate, /foreach \(\$reverseMapping in \$reversePlan\)/);
  assert.match(
    candidate,
    /& \$adb -s \$emuSerial reverse "tcp:\$\(\$reverseMapping\.DevicePort\)" "tcp:\$\(\$reverseMapping\.HostPort\)" \| Out-Null/,
  );
  assert.match(candidate, /if \(-not \$NoForceStop\) \{[\s\S]*?shell am force-stop \$pkg[\s\S]*?Start-Sleep -Milliseconds 250\n  }/);
  assert.match(candidate, /shell am start -a android\.intent\.action\.VIEW -d \$deep -p \$pkg/);
}

test('maps the requested Metro port and the baked-in 8081 fallback without duplicating the default', () => {
  const helper = extractFunction(source, 'Get-AdbReversePlan');
  assert.ok(helper, 'Get-AdbReversePlan function exists');
  assert.deepEqual(runReversePlan(helper, 8081), [
    { DevicePort: 8081, HostPort: 8081 },
  ]);
  assert.deepEqual(runReversePlan(helper, 8085), [
    { DevicePort: 8085, HostPort: 8085 },
    { DevicePort: 8081, HostPort: 8085 },
  ]);

  const wrongCondition = helper.replace('$HostPort -ne 8081', '$HostPort -eq 8081');
  assert.notEqual(wrongCondition, helper, 'condition mutation target exists');
  assert.notDeepEqual(runReversePlan(wrongCondition, 8085), runReversePlan(helper, 8085));
});

test('wires every selected emulator through the complete reverse plan and preserves launch controls', () => {
  validateWiring(source);
  const missingPlanLoop = source.replace('foreach ($reverseMapping in $reversePlan)', 'if ($false)');
  assert.notEqual(missingPlanLoop, source, 'wiring mutation target exists');
  assert.throws(() => validateWiring(missingPlanLoop));
});

test('preserves serial selection, package/deep-link launch, NoForceStop, and success behavior', () => {
  assert.equal(protectedBehaviorHash(source), PROTECTED_BEHAVIOR_HASH);
  const packageMutation = source.replace('$pkg = "app.phraseman"', '$pkg = "wrong.package"');
  assert.notEqual(protectedBehaviorHash(packageMutation), PROTECTED_BEHAVIOR_HASH);
});

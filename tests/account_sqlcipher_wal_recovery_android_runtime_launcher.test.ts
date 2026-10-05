import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const PROBE_DIR = path.join(ROOT, 'runtime-probes/android-account-sqlcipher-recovery');
const LAUNCHER = path.join(PROBE_DIR, 'launch-campaign.ps1');
const RUNNER = path.join(PROBE_DIR, 'run-proof.ps1');
const TOKEN = 'wal-campaign-authorized-by-owner-2026-09-30';

function runScript(script: string, args: readonly string[]): ReturnType<typeof spawnSync> {
  return spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args,
  ], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
}

function expectRefused(result: ReturnType<typeof spawnSync>, code: string): void {
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(String(result.stderr).trim()).toBe(code);
}

function source(file: string): string {
  return normalizeEol(fs.readFileSync(file, 'utf8'));
}

// зачем: владелец 2026-09-30 разрешил WAL-кампанию на эмуляторе, но по умолчанию и лаунчер,
// и раннер обязаны оставаться закрытыми: открывает их только точный токен авторизации,
// а неверный serial отсекается до любого вызова adb.
describe('Android Account V2 SQLCipher WAL campaign launcher authorization gate', () => {
  test.each([
    ['no authorization', []],
    ['empty authorization', ['-Authorization', '', '-Serial', 'emulator-5554']],
    ['uppercase token', ['-Authorization', TOKEN.toUpperCase(), '-Serial', 'emulator-5554']],
    ['token with suffix', ['-Authorization', `${TOKEN}x`, '-Serial', 'emulator-5554']],
    ['token prefix', ['-Authorization', TOKEN.slice(0, -1), '-Serial', 'emulator-5554']],
  ] as const)('launcher stays fail-closed without the exact authorization: %s', (_name, args) => {
    expectRefused(runScript(LAUNCHER, args), 'device_campaign_not_authorized');
  });

  test.each([
    ['missing serial', []],
    ['physical-device serial', ['-Serial', 'R58M1234ABC']],
    ['shell metacharacters', ['-Serial', 'emulator-5554;reboot']],
    ['too short port', ['-Serial', 'emulator-55']],
    ['trailing newline', ['-Serial', 'emulator-5554\n']],
  ] as const)('authorized launcher rejects an unsafe serial before any adb call: %s', (_name, args) => {
    expectRefused(runScript(LAUNCHER, ['-Authorization', TOKEN, ...args]), 'serial_invalid');
  });

  test.each([
    ['no authorization', []],
    ['wrong authorization', ['-DeviceCampaignAuthorization', 'yes', '-Serial', 'emulator-5554']],
    ['uppercase token', ['-DeviceCampaignAuthorization', TOKEN.toUpperCase(), '-Serial', 'emulator-5554']],
  ] as const)('runner stays fail-closed by default: %s', (_name, args) => {
    expectRefused(runScript(RUNNER, args), 'device_campaign_not_authorized');
  });

  test('runner opens only with the exact token and then delegates to the launcher gate', () => {
    expectRefused(
      runScript(RUNNER, ['-DeviceCampaignAuthorization', TOKEN, '-Serial', 'R58M1234ABC']),
      'serial_invalid',
    );
  });

  test('runner and launcher share one authorization token and the runner holds no device code', () => {
    const runner = source(RUNNER);
    const launcher = source(LAUNCHER);
    expect(runner).toContain(`$DeviceCampaignToken = '${TOKEN}'`);
    expect(launcher).toContain(`$CampaignToken = '${TOKEN}'`);
    expect(runner).not.toMatch(/\badb(?:\.exe)?\b|gradlew|Start-Process|npm\s+install/iu);
  });

  // зачем: мутация M8 показала, что без этой проверки гейт раннера маскируется гейтом
  // лаунчера; каждый слой обязан закрываться сам, до передачи управления дальше.
  test('runner checks the token itself before it ever resolves the launcher', () => {
    const runner = source(RUNNER);
    const gate = runner.indexOf(
      "if ($DeviceCampaignAuthorization -cne $DeviceCampaignToken) { Stop-Fixed 'device_campaign_not_authorized' }",
    );
    expect(gate).toBeGreaterThan(0);
    expect(runner.indexOf("Join-Path $PSScriptRoot 'launch-campaign.ps1'")).toBeGreaterThan(gate);
  });
});

describe('Android Account V2 SQLCipher WAL campaign launcher source contract', () => {
  const launcher = source(LAUNCHER);

  test('authorization and serial checks precede every device and host mutation', () => {
    const gate = launcher.indexOf("if ($Authorization -cne $CampaignToken) { Stop-Fixed 'device_campaign_not_authorized' }");
    const serial = launcher.indexOf("Stop-Fixed 'serial_invalid'");
    expect(gate).toBeGreaterThan(0);
    expect(serial).toBeGreaterThan(gate);
    for (const effect of ['$script:Adb =', 'function Invoke-Adb', 'Enter-PackageSwap', 'Start-OwnedMetro']) {
      expect({ effect, afterGate: launcher.indexOf(effect) > serial }).toEqual({ effect, afterGate: true });
    }
  });

  test('records bootstrap-ack, baseline-bound, launch-sent, launch-ack in the protocol order', () => {
    const order = [
      "$events.Add('bootstrap-ack')",
      "$events.Add('baseline-bound')",
      'Send-View $launchUrl',
      "$events.Add('launch-sent')",
      "Get-BoundLine 'account_sqlcipher_recovery_launch_acknowledged'",
      "$events.Add('launch-ack')",
    ].map((needle) => launcher.indexOf(needle));
    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((left, right) => left - right)).toEqual(order);
  });

  test('kills only an app-owned re-validated PID and validates WAL before SIGKILL', () => {
    expect(launcher).toContain("'run-as', $script:PackageName, 'kill', '-9'");
    const killBinding = launcher.indexOf("Invoke-Validator 'KillBinding'");
    const kill = launcher.indexOf("'kill', '-9'");
    expect(killBinding).toBeGreaterThan(0);
    expect(kill).toBeGreaterThan(killBinding);
    expect(launcher.indexOf("$events.Add('wal-delta-validated')"))
      .toBeLessThan(launcher.indexOf('$present = Invoke-Kill $binding $Mode'));
  });

  test('deletes the family exactly once, only on the accepted path, and never touches the package itself', () => {
    expect(launcher.match(/'rm', '-f'/gu)).toHaveLength(1);
    expect(launcher.indexOf("'rm', '-f'")).toBeGreaterThan(launcher.indexOf('accepted = $true'));
    expect(launcher.indexOf("'rm', '-f'")).toBeLessThan(launcher.indexOf('} catch {\n  $failureCode'));
    expect(launcher).not.toMatch(/uninstall|pm\s+clear|'clear'|git\s|stash|emulator\.exe|-avd|rm\s+-rf/iu);
  });

  test('restores package.json by compare-and-swap and never overwrites a foreign edit', () => {
    expect(launcher).toContain("Write-Trace 'package_restore_conflict package_restore_failed_journal_kept'");
    expect(launcher).toContain('if ($current -cne $script:PackageSwap.SwappedSha)');
  });

  // зачем: ревью P2 — уборка после отказа preflight не имеет права останавливать приложение
  // на устройстве, исключительность которого не доказана (чужая сессия).
  test('failure cleanup force-stops the app only after preflight reached host setup', () => {
    const flagSet = launcher.indexOf('$script:HostSetupReached = $true');
    expect(flagSet).toBeGreaterThan(launcher.indexOf("throw 'family_present_before_prepare'"));
    expect(flagSet).toBeLessThan(launcher.indexOf("  if ($EntryMode -ceq 'PackageSwap') { Enter-PackageSwap }"));
    const failure = launcher.slice(launcher.indexOf("$script:Stage = 'failure-cleanup'"));
    const guard = failure.indexOf('if ($script:HostSetupReached) {');
    const forceStop = failure.indexOf("'am', 'force-stop'");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(forceStop).toBeGreaterThan(guard);
    expect(failure.indexOf('} else {')).toBeGreaterThan(forceStop);
  });

  test('does not feed RecoveryOrdering a constant list and labels probe-derived facts', () => {
    expect(launcher).not.toContain("'committed-read'");
    expect(launcher).toContain('probeDerivedFacts');
    expect(launcher.match(/# probe-derived:/gu)).toHaveLength(2);
  });

  test('stops Metro only when the PID still has the recorded start time', () => {
    const stop = launcher.slice(launcher.indexOf('function Stop-OwnedProcessTree'));
    expect(stop.indexOf('$currentStart -ne $StartTicks')).toBeGreaterThan(0);
    expect(stop.indexOf('$currentStart -ne $StartTicks')).toBeLessThan(stop.indexOf("'taskkill.exe'"));
    expect(launcher).toContain("Stop-OwnedProcessTree $script:MetroProcess $script:MetroStartTime 'metro'");
    expect(launcher).toContain("Stop-OwnedProcessTree $script:EntryProxyProcess $script:EntryProxyStartTime 'entry_proxy'");
  });

  // зачем: ремонт №2 — подмена общего package.json видна бандлерам других сессий;
  // по умолчанию лаунчер обязан обходиться собственным прокси точки входа.
  test('defaults to the entry proxy and swaps package.json only in the explicit fallback mode', () => {
    expect(launcher).toContain("[ValidateSet('EntryProxy', 'PackageSwap')]");
    expect(launcher).toContain("[string]$EntryMode = 'EntryProxy'");
    const swapCall = launcher.indexOf('  if ($EntryMode -ceq \'PackageSwap\') { Enter-PackageSwap }');
    expect(swapCall).toBeGreaterThan(0);
    expect(launcher.match(/^\s+Enter-PackageSwap\s*$/gmu)).toBeNull();
    expect(launcher).toContain("'entry-proxy.js'");
    expect(launcher).toContain('Start-OwnedEntryProxy');
  });

  test('package.json restore retries with backoff, never throws, and keeps the journal on final failure', () => {
    const restore = launcher.slice(launcher.indexOf('function Exit-PackageSwap'), launcher.indexOf('function Test-PortListening'));
    expect(restore).toContain('AddSeconds(60)');
    expect(restore).toMatch(/catch \{[^}]*package_restore_retry/u);
    expect(restore).toContain('package_restore_failed_journal_kept');
    expect(restore).not.toMatch(/\bthrow\b/u);
  });

  test('has no silent catch blocks', () => {
    expect(launcher).not.toMatch(/catch\s*\{\s*\}/u);
  });
});

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type GuardResult = { ok: boolean; violations: string[] };

function runGuard(): GuardResult {
  const root = path.resolve(__dirname, '..');
  const stdout = execFileSync(process.execPath, [path.join(root, 'scripts', 'guard_max_voice_privacy.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(stdout) as GuardResult;
}

function runInjected(flag: string) {
  const root = path.resolve(__dirname, '..');
  return spawnSync(process.execPath, [
    path.join(root, 'scripts', 'guard_max_voice_privacy.mjs'),
    '--json',
    flag,
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
}

describe('MAX voice repository privacy guard', () => {
  it('keeps conversation content out of durable and operator surfaces', () => {
    expect(runGuard()).toEqual({ ok: true, violations: [] });
  });

  it('guards the MAX safety writer, safety_flags schema, account deletion and admin filtering', () => {
    const root = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'scripts', 'guard_max_voice_privacy.mjs'), 'utf8');
    expect(source).toContain('functions/src/max_voice_safety.ts');
    expect(source).toContain('safety_flags');
    expect(source).toContain('recordMaxVoiceSafetySignal');
    expect(source).toContain('isMaxVoiceSafetyFlag');
    expect(source).toContain("{ collection: 'safety_flags', field: 'uid', values: 'stable' }");
    expect(source).toContain("{ collection: 'safety_flags', field: 'authUid', values: 'auth' }");
    expect(source).toContain('resolver is restricted to quota ownership');
    expect(source).toContain('safety guard write contains');
  });

  it('returns a nonzero --json status for an adversarial direct-browser read', () => {
    const root = path.resolve(__dirname, '..');
    const result = spawnSync(process.execPath, [
      path.join(root, 'scripts', 'guard_max_voice_privacy.mjs'),
      '--json',
      '--inject-admin-direct-read',
    ], { cwd: root, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
    expect(result.status).not.toBe(0);
    const output = JSON.parse(result.stdout) as GuardResult;
    expect(output.ok).toBe(false);
    expect(output.violations.join('\n')).toContain('direct safety_flags collection read');
  });

  it('fails if stable identity resolution is reused outside quota ownership', () => {
    const result = runInjected('--inject-safety-resolver-misuse');
    expect(result.status).not.toBe(0);
    const output = JSON.parse(result.stdout) as GuardResult;
    expect(output.violations.join('\n')).toContain('resolver is restricted to quota ownership');
  });

  it('fails if a raw category enters the durable nested safety guard', () => {
    const result = runInjected('--inject-safety-guard-raw-kind');
    expect(result.status).not.toBe(0);
    const output = JSON.parse(result.stdout) as GuardResult;
    expect(output.violations.join('\n')).toContain('safety guard write contains kind');
  });
});

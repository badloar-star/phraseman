import { execFileSync } from 'node:child_process';
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

describe('MAX voice repository privacy guard', () => {
  it('keeps conversation content out of durable and operator surfaces', () => {
    expect(runGuard()).toEqual({ ok: true, violations: [] });
  });
});

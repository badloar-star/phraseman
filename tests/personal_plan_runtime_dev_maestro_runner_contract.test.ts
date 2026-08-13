import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const RUNNER_PATH = path.join(ROOT, 'tools', 'run_personal_plan_runtime_dev_maestro.ps1');

describe('personal plan runtime dev Maestro runner contract', () => {
  const source = fs.readFileSync(RUNNER_PATH, 'utf8');

  it('runs the dedicated runtime smoke flow and writes logs to maestro-results', () => {
    expect(source).toContain('maestro\\flows\\personal_plans\\runtime_dev_smoke.yaml');
    expect(source).toContain('maestro-results');
    expect(source).toContain('personal_plan_runtime_dev_smoke_$stamp.log');
  });

  it('checks syntax before running the live flow', () => {
    expect(source).toContain('check-syntax $Flow');
    expect(source).toContain('test $Flow');
    expect(source.indexOf('check-syntax $Flow')).toBeLessThan(source.indexOf('test $Flow'));
  });

  it('captures ADB diagnostics without destructive emulator actions', () => {
    expect(source).toContain('& $adb devices');
    expect(source).not.toMatch(/\bwipe-data\b/i);
    expect(source).not.toMatch(/\badb[^\n]+shell[^\n]+pm clear\b/i);
    expect(source).not.toMatch(/\bemu[^\n]+kill\b/i);
  });

  it('returns the Maestro exit code to the caller', () => {
    expect(source).toContain('$exitCode = $LASTEXITCODE');
    expect(source).toContain('exit $exitCode');
  });
});

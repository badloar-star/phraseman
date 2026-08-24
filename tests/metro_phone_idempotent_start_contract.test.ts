import fs from 'fs';
import path from 'path';

describe('Metro phone launcher lifecycle', () => {
  const scriptPath = path.join(process.cwd(), 'scripts', 'metro-phone.ps1');
  const script = fs.readFileSync(scriptPath, 'utf8');

  it('reuses a healthy Metro before any watchdog or Metro process is stopped', () => {
    const healthCheck = script.indexOf('$existingMetroAlive = Test-MetroAlive $Port');
    const reuseExit = script.indexOf('exit 20', healthCheck);
    const watchdogCleanup = script.indexOf('$otherWatchdogs =');
    const metroCleanup = script.indexOf('$byPort =');

    expect(healthCheck).toBeGreaterThan(-1);
    expect(reuseExit).toBeGreaterThan(healthCheck);
    expect(watchdogCleanup).toBeGreaterThan(reuseExit);
    expect(metroCleanup).toBeGreaterThan(reuseExit);

    const reuseBranch = script.slice(healthCheck, reuseExit);
    expect(reuseBranch).not.toContain('Stop-Process');
  });

  it('explains the reused-server exit code without claiming Metro stopped', () => {
    const launcher = fs.readFileSync(path.join(process.cwd(), 'START_METRO.bat'), 'utf8');

    expect(launcher).toContain('if %errorlevel% equ 20');
    expect(launcher).toContain('Existing Metro stays running');
    expect(launcher).not.toContain('timeout /t');
    expect(launcher).toContain('ping.exe -n 4 127.0.0.1 >nul');
  });
});

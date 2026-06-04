const path = require('path');

const {
  getManagedProcessSpecs,
  resolveManagedTargets,
  waitForPidExit,
} = require('../tools/telegram-bridge/manage.cjs');
const { removePidFileIfCurrent } = require('../tools/telegram-bridge/control-server.cjs');

describe('telegram bridge process manager', () => {
  test('manages bridge and control server by default', () => {
    const specs = getManagedProcessSpecs();

    expect(Object.keys(specs).sort()).toEqual(['bridge', 'control']);
    expect(specs.bridge.pidPath.replace(/\\/g, '/')).toContain('.codex-tmp/telegram-bridge/bridge.pid.json');
    expect(specs.control.pidPath.replace(/\\/g, '/')).toContain('.codex-tmp/telegram-bridge/control-server.pid.json');
    expect(path.basename(specs.control.scriptPath)).toBe('control-server.cjs');
  });

  test('resolves all targets for lifecycle commands by default', () => {
    expect(resolveManagedTargets()).toEqual(['bridge', 'control']);
    expect(resolveManagedTargets('bridge')).toEqual(['bridge']);
    expect(resolveManagedTargets('control')).toEqual(['control']);
  });

  test('control server cleanup does not remove a newer pid file', () => {
    const fs = require('fs');
    const os = require('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-control-pid-'));
    const pidPath = path.join(tempDir, 'control-server.pid.json');
    fs.writeFileSync(pidPath, JSON.stringify({ pid: 2222 }), 'utf8');

    removePidFileIfCurrent(pidPath, 1111);
    expect(JSON.parse(fs.readFileSync(pidPath, 'utf8')).pid).toBe(2222);

    removePidFileIfCurrent(pidPath, 2222);
    expect(fs.existsSync(pidPath)).toBe(false);
  });

  test('restart waits until an old process is no longer alive', async () => {
    const checks = [true, true, false];
    const stopped = await waitForPidExit(1234, {
      timeoutMs: 100,
      pollMs: 1,
      isAlive: () => checks.shift() ?? false,
    });

    expect(stopped).toBe(true);
    expect(checks).toEqual([]);
  });
});

import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const prepareSource = fs.readFileSync(
  path.join(root, 'scripts', 'metro-emulator-prepare.ps1'),
  'utf8',
);
const openSource = fs.readFileSync(
  path.join(root, 'scripts', 'metro-emulator-open.ps1'),
  'utf8',
);

describe('Android emulator desktop launcher startup contract', () => {
  test('waits for full Android readiness even when adb already reports a device', () => {
    expect(prepareSource).toContain('function Test-EmulatorReady');
    expect(prepareSource).toContain('getprop sys.boot_completed');
    expect(prepareSource).toContain('getprop dev.bootcomplete');
    expect(prepareSource).toContain('getprop init.svc.bootanim');
    expect(prepareSource).toContain('settings get global device_provisioned');
    expect(prepareSource).toContain('settings get secure user_setup_complete');
    expect(prepareSource).toContain('State: RUNNING_UNLOCKED');

    const readinessWait = prepareSource.indexOf('$readySerials = Wait-ForReadyEmulators');
    const reverseSetup = prepareSource.indexOf('reverse "tcp:$Port" "tcp:$Port"');
    expect(readinessWait).toBeGreaterThan(-1);
    expect(reverseSetup).toBeGreaterThan(readinessWait);
  });

  test('builds the first Android bundle before opening the dev client', () => {
    expect(openSource).toContain('function Wait-MetroAndroidBundle');
    expect(openSource).toContain('application/expo+json');
    expect(openSource).toContain('launchAsset.url');
    expect(openSource).toContain('ResponseHeadersRead');

    const bundleWait = openSource.indexOf('$bundleReady = Wait-MetroAndroidBundle');
    const forceStop = openSource.indexOf('shell am force-stop $pkg');
    const deepLink = openSource.indexOf('shell am start -a android.intent.action.VIEW');
    expect(bundleWait).toBeGreaterThan(-1);
    expect(forceStop).toBeGreaterThan(bundleWait);
    expect(deepLink).toBeGreaterThan(forceStop);
  });
});

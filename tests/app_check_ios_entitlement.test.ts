import fs from 'fs';
import path from 'path';

describe('iOS App Check release contract', () => {
  it('ships the production App Attest entitlement', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));

    expect(appJson.expo.ios.entitlements['com.apple.developer.devicecheck.appattest-environment'])
      .toBe('production');
  });
});

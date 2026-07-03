import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('iOS daily phrase widget App Group plugin contract', () => {
  const appJson = JSON.parse(read('app.json'));
  const pluginSource = read('plugins/withIosDailyPhraseWidgetAppGroup.js');
  const targetConfig = read('targets/widget/expo-target.config.js');
  const appGroup = 'group.app.phraseman.widget';

  it('keeps the same App Group on the app target and widget extension target', () => {
    expect(appJson.expo.ios.entitlements['com.apple.security.application-groups']).toContain(appGroup);
    expect(targetConfig).toContain(`'com.apple.security.application-groups': ['${appGroup}']`);
  });

  it('merges the App Group into app entitlements and registers App Groups on the host Xcode target', () => {
    expect(pluginSource).toContain('withEntitlementsPlist');
    expect(pluginSource).toContain('ensureAppGroup');
    expect(pluginSource).toContain('withXcodeProject');
    expect(pluginSource).toContain('REGISTER_APP_GROUPS');
    expect(pluginSource).toContain("setBuildSettingForTarget(project, target.uuid, REGISTER_APP_GROUPS_KEY, 'YES')");
  });
});

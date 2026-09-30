const fs = require('fs');
const path = require('path');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const buildConfig = require('../app.config.js');
const pkg = require('../package.json');

const read = (relativePath: string): string => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const allowedAndroidBackupIncludes = [
  ['database', 'RKStorage'],
  ['sharedpref', '.'],
];

const parseXml = (xml: string): Record<string, unknown> => {
  expect(XMLValidator.validate(xml)).toBe(true);
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
};

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]) as Record<string, unknown>[];
};

const extractIncludes = (section: unknown): string[][] => {
  expect(section).toEqual(expect.any(Object));
  return asArray((section as { include?: unknown }).include)
    .map((include) => {
      expect(Object.keys(include).sort()).toEqual(['@_domain', '@_path']);
      expect(typeof include['@_domain']).toBe('string');
      expect(typeof include['@_path']).toBe('string');
      return [include['@_domain'] as string, include['@_path'] as string];
    })
  .sort(([leftDomain, leftPath], [rightDomain, rightPath]) => (
    `${leftDomain}:${leftPath}`.localeCompare(`${rightDomain}:${rightPath}`)
  ));
};

test('PhoneStateStore ships exact expo-sqlite 16.0.10 with SQLCipher enabled', () => {
  expect(pkg.dependencies['expo-sqlite']).toBe('16.0.10');
  const config = buildConfig({ config: {} });
  const sqlitePlugins = config.plugins.filter((plugin: unknown) => (
    Array.isArray(plugin) ? plugin[0] === 'expo-sqlite' : plugin === 'expo-sqlite'
  ));
  expect(sqlitePlugins).toHaveLength(1);
  expect(sqlitePlugins[0]).toEqual([
    'expo-sqlite',
    { useSQLCipher: true, enableFTS: false },
  ]);
});

test('iOS development builds use the registered Apple team', () => {
  const config = buildConfig({ config: {} });

  expect(config.ios?.appleTeamId).toBe('KZPP5PAG8Y');
});

test('Android backup whitelist excludes encrypted PhoneState databases', () => {
  const backupRules = parseXml(read('android/app/src/main/res/xml/backup_rules.xml'));
  expect(extractIncludes(backupRules['full-backup-content'])).toEqual(
    allowedAndroidBackupIncludes,
  );

  const dataExtractionRules = parseXml(read('android/app/src/main/res/xml/data_extraction_rules.xml'));
  const extractionSections = dataExtractionRules['data-extraction-rules'] as Record<string, unknown>;
  expect(extractIncludes(extractionSections['cloud-backup'])).toEqual(allowedAndroidBackupIncludes);
  expect(extractIncludes(extractionSections['device-transfer'])).toEqual(allowedAndroidBackupIncludes);
});

test('Android Account V2 stays credential-protected and outside the backup whitelist', () => {
  const manifest = parseXml(read('android/app/src/main/AndroidManifest.xml'));
  const application = (manifest.manifest as Record<string, unknown>)
    .application as Record<string, unknown>;

  expect(application['@_android:fullBackupContent']).toBe('@xml/backup_rules');
  expect(application['@_android:dataExtractionRules']).toBe('@xml/data_extraction_rules');
  expect(application).not.toHaveProperty('@_android:defaultToDeviceProtectedStorage');
  expect(application).not.toHaveProperty('@_android:directBootAware');

  for (const relativePath of [
    'android/app/src/main/res/xml/backup_rules.xml',
    'android/app/src/main/res/xml/data_extraction_rules.xml',
  ]) {
    const rules = read(relativePath);
    expect(rules).not.toMatch(/domain=["'](?:device_)?root["']/u);
    expect(rules).not.toMatch(/path=["'][^"']*(?:SQLite|accounts-v2)[^"']*["']/iu);
  }
});

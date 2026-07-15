import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sourceFilesIn(relativeDir: string): string[] {
  const root = path.join(ROOT, relativeDir);
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(absolute);
    }
  };
  visit(root);
  return files;
}

const RUNTIME_PNGS = [
  'assets/images/onboarding_icon_cutout.png',
  'assets/images/flow_clean_202607/logo_cutout.png',
  'assets/images/flow_clean_202607/source_tiktok.png',
  'assets/images/flow_clean_202607/source_store.png',
  'assets/images/flow_clean_202607/source_social.png',
  'assets/images/flow_clean_202607/source_youtube.png',
  'assets/images/flow_clean_202607/source_google.png',
  'assets/images/flow_clean_202607/source_friends.png',
  'assets/images/flow_clean_202607/source_other.png',
  'assets/images/flow_clean_202607/level_a0.png',
  'assets/images/flow_clean_202607/level_a1.png',
  'assets/images/flow_clean_202607/level_a2.png',
  'assets/images/flow_clean_202607/level_b1.png',
  'assets/images/flow_clean_202607/level_b2.png',
  'assets/images/flow_clean_202607/goal_series.png',
  'assets/images/flow_clean_202607/goal_everyday.png',
  'assets/images/flow_clean_202607/goal_travel.png',
  'assets/images/flow_clean_202607/goal_words.png',
  'assets/images/flow_clean_202607/goal_mind.png',
  'assets/images/flow_clean_202607/minutes_5.png',
  'assets/images/flow_clean_202607/minutes_10.png',
  'assets/images/flow_clean_202607/minutes_15.png',
  'assets/images/flow_clean_202607/minutes_20.png',
  'assets/images/flow_clean_202607/intro_compass.png',
  'assets/images/flow_clean_202607/notifications.png',
  'assets/images/flow_clean_202607/plan_result.png',
  'assets/images/flow_clean_202607/start_plus.png',
  'assets/images/flow_clean_202607/start_free.png',
  'assets/images/flow_clean_202607/benefit_plan.png',
  'assets/images/flow_clean_202607/benefit_speech.png',
  'assets/images/flow_clean_202607/benefit_repeat.png',
  'assets/images/flow_clean_202607/benefit_flow.png',
  'assets/images/flow_clean_202607/paywall_yearly.png',
  'assets/images/flow_clean_202607/paywall_monthly.png',
  'assets/images/flow_clean_202607/paywall_lifetime.png',
  'assets/images/update_modal/update-modal-premium-emblem.png',
  'assets/images/splash-glyph.png',
  'assets/images/splash-wordmark.png',
] as const;

describe('Android production bundle hygiene', () => {
  it('writes static dev-module exclusions only for store prebuilds', () => {
    const plugin = require('../plugins/withProductionAndroidBundleHygiene') as {
      patchSettingsGradle: (source: string, storeRelease: boolean) => string;
    };
    const fixture = `plugins { id("expo-autolinking-settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  if (System.getenv('EXPO_USE_COMMUNITY_AUTOLINKING') == '1') {
    ex.autolinkLibrariesFromCommand()
  } else {
    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
  }
}
expoAutolinking.useExpoModules()
`;

    const production = plugin.patchSettingsGradle(fixture, true);
    expect(production).toContain('expoAutolinking.exclude =');
    expect(production).toContain('expo-dev-launcher');
    expect(production).toContain('phrasemanProductionRnConfigCommand');
    expect(production).toContain('--exclude');
    expect(production).not.toContain("System.getenv('EXPO_PUBLIC_STORE_RELEASE')");
    expect(production.indexOf('expoAutolinking.exclude =')).toBeLessThan(
      production.indexOf('phrasemanProductionRnConfigCommand'),
    );
    expect(production.match(/phraseman: production Expo module exclusions/g)).toHaveLength(1);
    expect(plugin.patchSettingsGradle(production, true)).toBe(production);

    const development = plugin.patchSettingsGradle(production, false);
    expect(development).not.toContain('phraseman: production Expo module exclusions');
    expect(development).not.toContain('expo-dev-launcher');
    expect(development).toContain('extensions.configure(com.facebook.react.ReactSettingsExtension)');
    expect(development).toContain('ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)');
    expect(development).toContain('expoAutolinking.useExpoModules()');

    const repairedDevelopment = plugin.patchSettingsGradle(
      'plugins { id("expo-autolinking-settings") }\nexpoAutolinking.useExpoModules()\n',
      false,
    );
    expect(repairedDevelopment).toContain('extensions.configure(com.facebook.react.ReactSettingsExtension)');
    expect(repairedDevelopment).toContain('ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)');
  });

  it('registers the production autolinking and stale-resource cleanup plugin', () => {
    const appConfig = JSON.parse(read('app.json')) as { expo?: { plugins?: unknown[] } };
    expect(appConfig.expo?.plugins).toContain('./plugins/withProductionAndroidBundleHygiene');
    const pluginPath = path.join(ROOT, 'plugins', 'withProductionAndroidBundleHygiene.js');
    expect(fs.existsSync(pluginPath)).toBe(true);
    const pluginSource = fs.existsSync(pluginPath) ? fs.readFileSync(pluginPath, 'utf8') : '';
    expect(pluginSource).toContain('EXPO_PUBLIC_STORE_RELEASE');
    for (const packageName of ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface']) {
      expect(pluginSource).toContain(packageName);
    }
    expect(pluginSource).toContain('createBundleReleaseJsAndAssets');
    expect(pluginSource).toContain('outputs.upToDateWhen');
    expect(pluginSource).toContain('MaxMetaspaceSize=1536m');
  });

  it('keeps Expo autolinking list options as separate CLI arguments', () => {
    const patchPath = 'patches/expo-modules-autolinking+3.0.26.patch';
    expect(fs.existsSync(path.join(ROOT, patchPath))).toBe(true);
    const patchSource = fs.existsSync(path.join(ROOT, patchPath)) ? read(patchPath) : '';
    expect(patchSource).toContain('private val optionsMap = mutableMapOf<String, List<String>>()');
    expect(patchSource).toContain('listOf("--$key") + values');
    expect(patchSource.match(/^diff --git/gm)).toHaveLength(1);
  });

  it('keeps vector icon imports and bundled font patterns limited to used families', () => {
    const sourceFiles = ['app', 'components', 'constants', 'hooks', 'contexts', 'lib', 'modules']
      .flatMap(sourceFilesIn);
    const barrelImports = sourceFiles
      .filter((file) => /from\s+['"]@expo\/vector-icons['"]/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));
    expect(barrelImports).toEqual([]);

    const appConfig = JSON.parse(read('app.json')) as {
      expo?: { updates?: { assetPatternsToBeBundled?: string[] } };
    };
    const patterns = appConfig.expo?.updates?.assetPatternsToBeBundled ?? [];
    expect(patterns).not.toContain('node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/*');
    expect(patterns).toEqual(expect.arrayContaining([
      'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
      'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf',
    ]));
  });

  it('ships runtime artwork as compressed WebP instead of PNG', () => {
    for (const pngPath of RUNTIME_PNGS) {
      expect(fs.existsSync(path.join(ROOT, pngPath))).toBe(false);
      expect(fs.existsSync(path.join(ROOT, pngPath.replace(/\.png$/, '.webp')))).toBe(true);
    }
  });

  it('embeds Inter once and keeps runtime font requires behind the dev-only module', () => {
    expect(read('app/typography.ts')).not.toContain("require('../assets/fonts/");
    const layoutSource = read('app/_layout.tsx');
    expect(layoutSource).toContain("require('./typography_dev_fonts')");
    expect(layoutSource).toMatch(/__DEV__/);

    const appConfig = JSON.parse(read('app.json')) as { expo?: { plugins?: unknown[] } };
    const fontPlugin = appConfig.expo?.plugins?.find((entry) => Array.isArray(entry) && entry[0] === 'expo-font');
    expect(fontPlugin).toEqual(expect.any(Array));
    const families = ((fontPlugin as [string, { android?: { fonts?: Array<{ fontFamily?: string }> } }])[1]
      .android?.fonts ?? []).map((font) => font.fontFamily);
    expect(families).toEqual(['Inter', 'Inter-SemiBold', 'Inter-Bold', 'Inter-Black']);
  });

  it('keeps non-runtime build inputs out of the EAS upload archive', () => {
    const easIgnore = read('.easignore');
    for (const pattern of [
      'content/',
      '.shots/',
      '.eas-logs/',
      'test-results/',
      'assets/arena_questions_*.json',
      'assets/images/flow_clean_202607/*.png',
    ]) {
      expect(easIgnore.split(/\r?\n/)).toContain(pattern);
    }
  });
});

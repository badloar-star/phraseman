const {
  withAppBuildGradle,
  withGradleProperties,
  withSettingsGradle,
} = require('@expo/config-plugins');

const SETTINGS_MARKER = '// phraseman: production Expo module exclusions';
const RN_SETTINGS_MARKER = '// phraseman: production React Native autolinking exclusions';
const RN_SETTINGS_ANCHOR = 'extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->';
const BUILD_MARKER = '// phraseman: clean Metro release outputs before bundling';
const STORE_RELEASE_ENV = 'EXPO_PUBLIC_STORE_RELEASE';
const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m';
const PRODUCTION_EXPO_EXCLUDES = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
];
const DEFAULT_RN_AUTOLINKING_BLOCK = `${RN_SETTINGS_ANCHOR}
  if (System.getenv('EXPO_USE_COMMUNITY_AUTOLINKING') == '1') {
    ex.autolinkLibrariesFromCommand()
  } else {
    ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
  }
}
`;

function patchSettingsGradle(
  source,
  storeRelease = process.env[STORE_RELEASE_ENV] === '1',
) {
  const anchor = 'expoAutolinking.useExpoModules()';
  const originalRnCommand = 'ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)';
  const managedRnCommand = 'ex.autolinkLibrariesFromCommand(phrasemanProductionRnConfigCommand)';
  const withoutManagedBlock = source
    .replace(
      /\/\/ phraseman: production React Native autolinking exclusions\r?\ndef phrasemanProductionRnConfigCommand = .*?\r?\n/,
      '',
    )
    .replace(managedRnCommand, originalRnCommand)
    .replace(
      /\/\/ phraseman: production Expo module exclusions\r?\nexpoAutolinking\.exclude = [^\r\n]*\r?\n/,
      '',
    );
  if (!withoutManagedBlock.includes(anchor)) {
    throw new Error(`withProductionAndroidBundleHygiene: missing ${anchor} in settings.gradle`);
  }
  const withRestoredRnBlock = withoutManagedBlock.includes(RN_SETTINGS_ANCHOR)
    ? withoutManagedBlock
    : withoutManagedBlock.replace(anchor, `${DEFAULT_RN_AUTOLINKING_BLOCK}${anchor}`);
  if (!storeRelease) return withRestoredRnBlock;

  const rnExclusionBlock = `${SETTINGS_MARKER}
expoAutolinking.exclude = ${JSON.stringify(PRODUCTION_EXPO_EXCLUDES)}
${RN_SETTINGS_MARKER}
def phrasemanProductionRnConfigCommand = expoAutolinking.rnConfigCommand + ${JSON.stringify(['--exclude', ...PRODUCTION_EXPO_EXCLUDES])}
`;
  let withRnExclusions = withRestoredRnBlock.replace(
    RN_SETTINGS_ANCHOR,
    `${rnExclusionBlock}${RN_SETTINGS_ANCHOR}`,
  );
  if (withRnExclusions.includes(originalRnCommand)) {
    withRnExclusions = withRnExclusions.replace(originalRnCommand, managedRnCommand);
  }
  return withRnExclusions;
}

function patchAppBuildGradle(source) {
  if (source.includes(BUILD_MARKER)) return source;
  return `${source.trimEnd()}

${BUILD_MARKER}
afterEvaluate {
    tasks.matching { it.name == 'createBundleReleaseJsAndAssets' }.configureEach {
        // Metro's incremental output directory is not self-pruning. Force this
        // one release task to execute and remove files no longer present in the graph.
        outputs.upToDateWhen { false }
        doFirst {
            project.delete(file("$buildDir/generated/res/createBundleReleaseJsAndAssets"))
            project.delete(file("$buildDir/generated/assets/createBundleReleaseJsAndAssets"))
        }
    }
}
`;
}

function patchGradleProperties(items) {
  const existing = items.find((item) => item.type === 'property' && item.key === 'org.gradle.jvmargs');
  if (existing) {
    existing.value = GRADLE_JVM_ARGS;
  } else {
    items.push({ type: 'property', key: 'org.gradle.jvmargs', value: GRADLE_JVM_ARGS });
  }
  return items;
}

/** @param {import('@expo/config').ExpoConfig} config */
module.exports = function withProductionAndroidBundleHygiene(config) {
  let nextConfig = withSettingsGradle(config, (mod) => {
    mod.modResults.contents = patchSettingsGradle(mod.modResults.contents);
    return mod;
  });

  nextConfig = withAppBuildGradle(nextConfig, (mod) => {
    mod.modResults.contents = patchAppBuildGradle(mod.modResults.contents);
    return mod;
  });

  return withGradleProperties(nextConfig, (mod) => {
    mod.modResults = patchGradleProperties(mod.modResults);
    return mod;
  });
};

module.exports.patchSettingsGradle = patchSettingsGradle;
module.exports.patchAppBuildGradle = patchAppBuildGradle;
module.exports.patchGradleProperties = patchGradleProperties;
module.exports.PRODUCTION_EXPO_EXCLUDES = PRODUCTION_EXPO_EXCLUDES;

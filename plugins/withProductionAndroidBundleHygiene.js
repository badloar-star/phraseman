const {
  withAppBuildGradle,
  withGradleProperties,
  withSettingsGradle,
} = require('@expo/config-plugins');

const SETTINGS_MARKER = '// phraseman: production Expo module exclusions';
const RN_SETTINGS_MARKER = '// phraseman: production React Native autolinking exclusions';
const RN_SETTINGS_ANCHOR = 'extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->';
const BUILD_MARKER = '// phraseman: clean Metro release outputs before bundling';
const NATIVE_SYMBOLS_MARKER = '// phraseman: keep native debug metadata outside the AAB';
const STORE_RELEASE_ENV = 'EXPO_PUBLIC_STORE_RELEASE';
const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m';
const INCLUDE_NATIVE_DEBUG_METADATA = 'android.bundle.includeNativeDebugMetadata';
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
  let patched = source;
  if (!patched.includes(NATIVE_SYMBOLS_MARKER)) {
    const buildTypesMatch = /\bbuildTypes\s*\{/.exec(patched);
    if (!buildTypesMatch) {
      throw new Error('withProductionAndroidBundleHygiene: missing buildTypes block');
    }
    const buildTypesOpen = patched.indexOf('{', buildTypesMatch.index);
    let depth = 0;
    let buildTypesClose = -1;
    for (let index = buildTypesOpen; index < patched.length; index += 1) {
      if (patched[index] === '{') depth += 1;
      else if (patched[index] === '}') depth -= 1;
      if (depth === 0) {
        buildTypesClose = index;
        break;
      }
    }
    if (buildTypesClose < 0) {
      throw new Error('withProductionAndroidBundleHygiene: unterminated buildTypes block');
    }
    const buildTypesBody = patched.slice(buildTypesOpen + 1, buildTypesClose);
    const releaseMatch = /\brelease\s*\{\r?\n/.exec(buildTypesBody);
    if (!releaseMatch) {
      throw new Error('withProductionAndroidBundleHygiene: missing buildTypes.release block');
    }
    const insertAt = buildTypesOpen + 1 + releaseMatch.index + releaseMatch[0].length;
    const nativeSymbolsBlock = `            ${NATIVE_SYMBOLS_MARKER}\n            ndk {\n                debugSymbolLevel 'none'\n            }\n`;
    patched = `${patched.slice(0, insertAt)}${nativeSymbolsBlock}${patched.slice(insertAt)}`;
  }
  if (patched.includes(BUILD_MARKER)) return patched;
  return `${patched.trimEnd()}

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
  const nativeMetadata = items.find(
    (item) => item.type === 'property' && item.key === INCLUDE_NATIVE_DEBUG_METADATA,
  );
  if (nativeMetadata) {
    nativeMetadata.value = 'false';
  } else {
    items.push({ type: 'property', key: INCLUDE_NATIVE_DEBUG_METADATA, value: 'false' });
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

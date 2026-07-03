/**
 * iOS: guarantee the phrase-of-the-day App Group on the MAIN app target.
 *
 * The widget extension (declared via `@bacons/apple-targets`,
 * targets/widget/expo-target.config.js) and the main app must share the App
 * Group `group.app.phraseman.widget`. The app writes the daily-phrase snapshot
 * into that shared container (modules/phrase-widget/ios/PhraseWidgetModule.swift)
 * and the WidgetKit extension reads it (targets/widget/PhrasePayload.swift).
 *
 * If the App Group is NOT actually granted to the app target at build time, iOS
 * silently gives each target its own private UserDefaults suite: the app's write
 * "succeeds" but the widget reads nil and shows its green "Break the ice"
 * placeholder forever, never matching the in-app phrase.
 *
 * `ios.entitlements` in app.json already lists the group, but a dedicated
 * `withEntitlementsPlist` mod makes it deterministic and ordering-proof — it
 * MERGES the group in (never clobbers any other entitlement another plugin
 * added) and is the canonical Expo way to own an entitlement.
 *
 * NOTE: this only puts the entitlement in the build. The App Group capability
 * must ALSO be registered on Apple's side for BOTH App IDs (the app and the
 * widget extension). With EAS-managed credentials that happens automatically
 * when `eas build` detects this entitlement — but a provisioning profile created
 * BEFORE the entitlement existed is stale, so after adding/​changing the widget
 * you must let EAS regenerate profiles (it will, on the next build; if it does
 * not, run `eas credentials` → iOS → Build Credentials → and re-sync).
 *
 * Keep AFTER `@bacons/apple-targets` in app.json so the extension target exists
 * first and our entitlement merge is the last word on the app target.
 */

const { withEntitlementsPlist, withXcodeProject, createRunOncePlugin, IOSConfig } = require('@expo/config-plugins');

/** Shared App Group — MUST match constants.ts / the Swift + Kotlin code. */
const APP_GROUP = 'group.app.phraseman.widget';
const ENTITLEMENT_KEY = 'com.apple.security.application-groups';
const REGISTER_APP_GROUPS_KEY = 'REGISTER_APP_GROUPS';

/**
 * Merge APP_GROUP into the app target's application-groups entitlement without
 * dropping any group another plugin may have added. Idempotent.
 * @param {Record<string, unknown>} entitlements
 * @returns {Record<string, unknown>}
 */
function ensureAppGroup(entitlements) {
  const existing = Array.isArray(entitlements[ENTITLEMENT_KEY])
    ? /** @type {string[]} */ (entitlements[ENTITLEMENT_KEY])
    : [];
  const next = existing.includes(APP_GROUP) ? existing : [...existing, APP_GROUP];
  return { ...entitlements, [ENTITLEMENT_KEY]: next };
}

function setBuildSettingForTarget(project, targetUuid, key, value) {
  const objects = project.hash?.project?.objects;
  const nativeTarget = objects?.PBXNativeTarget?.[targetUuid];
  const configListUuid = nativeTarget?.buildConfigurationList;
  const configList = objects?.XCConfigurationList?.[configListUuid];
  const buildConfigurations = Array.isArray(configList?.buildConfigurations)
    ? configList.buildConfigurations
    : [];

  for (const ref of buildConfigurations) {
    const buildConfig = objects?.XCBuildConfiguration?.[ref.value];
    if (!buildConfig?.buildSettings) continue;
    buildConfig.buildSettings[key] = value;
  }
}

const withIosDailyPhraseWidgetAppGroup = (config) => {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults = ensureAppGroup(cfg.modResults);
    return cfg;
  });

  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    // The apple-targets plugin sets REGISTER_APP_GROUPS for the extension target
    // when it sees generated.entitlements. The host app target also needs the
    // same explicit build setting so EAS/Xcode registers the shared container
    // instead of shipping a widget that can only render its placeholder.
    setBuildSettingForTarget(project, target.uuid, REGISTER_APP_GROUPS_KEY, 'YES');
    return cfg;
  });
};

const plugin = createRunOncePlugin(
  withIosDailyPhraseWidgetAppGroup,
  'withIosDailyPhraseWidgetAppGroup',
  '0.2.0',
);

plugin._ensureAppGroup = ensureAppGroup;
plugin._setBuildSettingForTarget = setBuildSettingForTarget;

module.exports = plugin;

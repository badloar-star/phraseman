// Adds the Firebase Crashlytics "upload symbols" Run Script to the iOS app target.
// Official Firebase Apple docs (SPM path + -ObjC) are for native Xcode apps; RNFirebase uses
// CocoaPods, so the correct script is "${PODS_ROOT}/FirebaseCrashlytics/run".
// Without this phase, iOS crashes may appear late, unsymbolicated, or be harder to find in Crashlytics.

const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withXcodeProject,
  createRunOncePlugin,
  IOSConfig,
} = require('@expo/config-plugins');

const PHASE_COMMENT = '[Firebase] Crashlytics — upload dSYMs';
const POST_INTEGRATE_MARKER = '# phraseman-crashlytics-phase-last';

const POST_INTEGRATE_HOOK = `
# CocoaPods adds its own app-target phases after Expo config plugins run. Keep
# Crashlytics last after integration, otherwise embedding WidgetKit can form an
# Xcode dependency cycle through Info.plist and the app dSYM.
post_integrate do |installer|
  ${POST_INTEGRATE_MARKER}
  installer.aggregate_targets.each do |aggregate_target|
    project = aggregate_target.user_project
    next unless project
    app_target = project.targets.find { |target| target.name == 'Phraseman' }
    next unless app_target
    crashlytics_phase = app_target.shell_script_build_phases.find do |phase|
      phase.shell_script.to_s.include?('FirebaseCrashlytics/run')
    end
    next unless crashlytics_phase
    app_target.build_phases.delete(crashlytics_phase)
    app_target.build_phases << crashlytics_phase
    project.save
  end
end
`;

function patchPodfileContents(contents) {
  if (contents.includes(POST_INTEGRATE_MARKER)) return contents;
  return `${contents.trimEnd()}\n${POST_INTEGRATE_HOOK}`;
}

function findCrashlyticsPhaseUuids(project) {
  const phases = project.hash?.project?.objects?.PBXShellScriptBuildPhase;
  if (!phases) return [];

  const result = [];
  for (const key of Object.keys(phases)) {
    if (key.endsWith('_comment')) continue;
    const shell = phases[key]?.shellScript;
    if (typeof shell === 'string' && shell.includes('FirebaseCrashlytics/run')) {
      result.push(key);
    }
  }

  return result;
}

function movePhasesToEnd(project, targetUuid, phaseUuids) {
  const target = project.hash?.project?.objects?.PBXNativeTarget?.[targetUuid];
  const buildPhases = target?.buildPhases;
  if (!Array.isArray(buildPhases) || phaseUuids.length === 0) return;

  const phaseSet = new Set(phaseUuids);
  const crashlyticsPhases = [];
  const otherPhases = [];

  for (const phase of buildPhases) {
    if (phaseSet.has(phase.value)) {
      crashlyticsPhases.push(phase);
    } else {
      otherPhases.push(phase);
    }
  }

  target.buildPhases = [...otherPhases, ...crashlyticsPhases];
}

function withIosFirebaseCrashlyticsUpload(config) {
  let nextConfig = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    const existingPhaseUuids = findCrashlyticsPhaseUuids(project);
    if (existingPhaseUuids.length > 0) {
      movePhasesToEnd(project, target.uuid, existingPhaseUuids);
      return cfg;
    }

    // Matches Firebase "Get started" input file list for symbol upload (CocoaPods layout).
    const inputPaths = [
      '"$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)"',
      '"$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/GoogleService-Info.plist"',
      '"$(TARGET_BUILD_DIR)/$(EXECUTABLE_PATH)"',
      '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}"',
      '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}"',
      '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Info.plist"',
    ];

    project.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      PHASE_COMMENT,
      target.uuid,
      {
        shellPath: '/bin/sh',
        shellScript: '"${PODS_ROOT}/FirebaseCrashlytics/run"',
        inputPaths,
      },
    );
    movePhasesToEnd(project, target.uuid, findCrashlyticsPhaseUuids(project));

    return cfg;
  });

  nextConfig = withDangerousMod(nextConfig, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const current = fs.readFileSync(podfilePath, 'utf8');
      const patched = patchPodfileContents(current);
      if (patched !== current) fs.writeFileSync(podfilePath, patched);
      return cfg;
    },
  ]);

  return nextConfig;
}

module.exports = createRunOncePlugin(
  withIosFirebaseCrashlyticsUpload,
  'with-ios-firebase-crashlytics-dsym-upload',
  '1.0.0',
);
module.exports.patchPodfileContents = patchPodfileContents;

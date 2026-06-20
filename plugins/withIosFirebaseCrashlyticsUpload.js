// Adds the Firebase Crashlytics "upload symbols" Run Script to the iOS app target.
// Official Firebase Apple docs (SPM path + -ObjC) are for native Xcode apps; RNFirebase uses
// CocoaPods, so the correct script is "${PODS_ROOT}/FirebaseCrashlytics/run".
// Without this phase, iOS crashes may appear late, unsymbolicated, or be harder to find in Crashlytics.

const { withXcodeProject, createRunOncePlugin, IOSConfig } = require('@expo/config-plugins');

const PHASE_COMMENT = '[Firebase] Crashlytics — upload dSYMs';

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
  return withXcodeProject(config, (cfg) => {
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
}

module.exports = createRunOncePlugin(
  withIosFirebaseCrashlyticsUpload,
  'with-ios-firebase-crashlytics-dsym-upload',
  '1.0.0',
);

// Adds the Firebase Crashlytics "upload symbols" Run Script to the iOS app target.
// Official Firebase Apple docs (SPM path + -ObjC) are for native Xcode apps; RNFirebase uses
// CocoaPods, so the correct script is "${PODS_ROOT}/FirebaseCrashlytics/run".
// Without this phase, iOS crashes may appear late, unsymbolicated, or be harder to find in Crashlytics.

const { withXcodeProject, createRunOncePlugin, IOSConfig } = require('@expo/config-plugins');

const PHASE_COMMENT = '[Firebase] Crashlytics — upload dSYMs';

function hasExistingCrashlyticsPhase(project) {
  const phases = project.hash?.project?.objects?.PBXShellScriptBuildPhase;
  if (!phases) return false;
  for (const key of Object.keys(phases)) {
    if (key.endsWith('_comment')) continue;
    const shell = phases[key]?.shellScript;
    if (typeof shell === 'string' && shell.includes('FirebaseCrashlytics/run')) {
      return true;
    }
  }
  return false;
}

function withIosFirebaseCrashlyticsUpload(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    if (hasExistingCrashlyticsPhase(project)) {
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

    return cfg;
  });
}

module.exports = createRunOncePlugin(
  withIosFirebaseCrashlyticsUpload,
  'with-ios-firebase-crashlytics-dsym-upload',
  '1.0.0',
);

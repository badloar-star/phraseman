const {
  patchPodfileContents,
} = require('../plugins/withIosFirebaseCrashlyticsUpload');

describe('iOS Crashlytics and WidgetKit phase order', () => {
  test('adds an idempotent CocoaPods post-integrate reorder hook', () => {
    const podfile = "platform :ios, '15.1'\n";
    const once = patchPodfileContents(podfile);

    expect(once).toContain('# phraseman-crashlytics-phase-last');
    expect(once).toContain("target.name == 'Phraseman'");
    expect(once).toContain("phase.shell_script.to_s.include?('FirebaseCrashlytics/run')");
    expect(once).toContain('app_target.build_phases << crashlytics_phase');
    expect(patchPodfileContents(once)).toBe(once);
  });
});

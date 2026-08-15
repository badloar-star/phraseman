const {
  patchPodfileContents,
} = require('../plugins/withIosFirebaseFunctionsSwift63Workaround');

describe('iOS Xcode 26 native workarounds', () => {
  const podfile = `platform :ios, '15.1'

target 'Phraseman' do
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`;

  test('keeps the fmt override after react_native_post_install', () => {
    const patched = patchPodfileContents(podfile);
    const reactNativeIndex = patched.indexOf('react_native_post_install(');
    const fmtIndex = patched.indexOf('# phraseman-fmt-xcode-26-workaround');

    expect(fmtIndex).toBeGreaterThan(reactNativeIndex);
    expect(patched).toContain("definitions << 'FMT_USE_CONSTEVAL=0'");
    expect(patched).toContain("config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'");
  });

  test('is idempotent', () => {
    const once = patchPodfileContents(podfile);
    expect(patchPodfileContents(once)).toBe(once);
  });
});

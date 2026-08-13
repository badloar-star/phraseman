/**
 * @bacons/apple-targets — phrase-of-the-day iOS widget extension.
 *
 * This declares a WidgetKit extension target. The library generates the Xcode
 * target, its Info.plist and entitlements, and links the App Group so the
 * extension and the main app share `group.app.phraseman.widget`.
 *
 * The matching entitlement must also be granted to the MAIN app target — see
 * the `ios.entitlements` block in app.json (added alongside this target).
 *
 * Swift sources live next to this file and are compiled into the extension.
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'PhraseWidget',
  // Shared App Group — must match constants.ts / native modules / the Swift code.
  entitlements: {
    'com.apple.security.application-groups': ['group.app.phraseman.widget'],
  },
  // iOS 17+ adds per-instance deck configuration; iOS 16 keeps Saved fallback.
  deploymentTarget: '16.0',
});

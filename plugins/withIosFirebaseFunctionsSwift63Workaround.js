// Xcode 26.4 ships Swift 6.3, whose optimizer crashes Release builds when
// Firebase Functions uses three `async let` bindings in FunctionsContext.
// Firebase fixed this upstream in 12.12.0 (firebase-ios-sdk#15974), but the
// RNFirebase version pinned by this app still resolves Firebase iOS 11.11.0.
//
// Keep the workaround in the generated Podfile so `expo prebuild --clean` and
// every later `pod install` reapply it. Once RNFirebase pins Firebase >=12.12,
// the upstream Task-based implementation is detected and this becomes a no-op.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');

const MARKER = '# phraseman-firebase-functions-swift-63-workaround';

const RUBY_WORKAROUND = `    ${MARKER}
    firebase_functions_context = File.join(
      installer.sandbox.root.to_s,
      'FirebaseFunctions',
      'FirebaseFunctions',
      'Sources',
      'Internal',
      'FunctionsContext.swift'
    )
    if File.exist?(firebase_functions_context)
      source = File.read(firebase_functions_context)
      broken = <<~'PHRASEMAN_BROKEN_SWIFT'
        func context(options: HTTPSCallableOptions?) async throws -> FunctionsContext {
          async let authToken = auth?.getToken(forcingRefresh: false)
          async let appCheckToken = getAppCheckToken(options: options)
          async let limitedUseAppCheckToken = getLimitedUseAppCheckToken(options: options)

          // Only \`authToken\` is throwing, but the formatter script removes the \`try\`
          // from \`try authToken\` and puts it in front of the initializer call.
          return try await FunctionsContext(
            authToken: authToken,
            fcmToken: messaging?.fcmToken,
            appCheckToken: appCheckToken,
            limitedUseAppCheckToken: limitedUseAppCheckToken
          )
        }
      PHRASEMAN_BROKEN_SWIFT
      fixed = <<~'PHRASEMAN_FIXED_SWIFT'
        func context(options: HTTPSCallableOptions?) async throws -> FunctionsContext {
          // Avoid Swift 6.3/Xcode 26.4 optimized-build crash in async-let teardown.
          // Upstream Firebase fix: firebase/firebase-ios-sdk#15974.
          let authToken = Task { try await auth?.getToken(forcingRefresh: false) }
          let appCheckToken = Task { await getAppCheckToken(options: options) }
          let limitedUseAppCheckToken = Task { await getLimitedUseAppCheckToken(options: options) }
          return try await withTaskCancellationHandler {
            defer {
              authToken.cancel()
              appCheckToken.cancel()
              limitedUseAppCheckToken.cancel()
            }
            return try await FunctionsContext(
              authToken: authToken.value,
              fcmToken: messaging?.fcmToken,
              appCheckToken: appCheckToken.value,
              limitedUseAppCheckToken: limitedUseAppCheckToken.value
            )
          } onCancel: {
            authToken.cancel()
            appCheckToken.cancel()
            limitedUseAppCheckToken.cancel()
          }
        }
      PHRASEMAN_FIXED_SWIFT

      # Squiggly heredocs remove the method's two-space file indentation. Put
      # it back so the guarded replacement matches the pristine pod source.
      indent_swift_method = lambda do |method_source|
        method_source.lines.map { |line| line.strip.empty? ? line : "  #{line}" }.join
      end
      broken = indent_swift_method.call(broken)
      fixed = indent_swift_method.call(fixed)

      if source.include?(broken)
        File.write(firebase_functions_context, source.sub(broken, fixed))
        Pod::UI.puts 'Applied Firebase Functions Swift 6.3 Release workaround'
      elsif !source.include?('let authToken = Task {')
        raise 'Firebase Functions context changed: review Swift 6.3 Release workaround before building'
      end
    end
`;

function patchPodfileContents(contents) {
  if (contents.includes(MARKER)) return contents;

  const anchor = '  post_install do |installer|\n';
  if (!contents.includes(anchor)) {
    throw new Error('Unable to find the iOS Podfile post_install block');
  }
  return contents.replace(anchor, `${anchor}${RUBY_WORKAROUND}`);
}

function withIosFirebaseFunctionsSwift63Workaround(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const current = fs.readFileSync(podfilePath, 'utf8');
      const patched = patchPodfileContents(current);
      if (patched !== current) fs.writeFileSync(podfilePath, patched);
      return cfg;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withIosFirebaseFunctionsSwift63Workaround,
  'with-ios-firebase-functions-swift-63-workaround',
  '1.0.0',
);
module.exports.patchPodfileContents = patchPodfileContents;

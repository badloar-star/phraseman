# League Chat UI And Keyboard Rules

Research date: 2026-06-27.

## Sources

- React Native `KeyboardAvoidingView`: https://reactnative.dev/docs/keyboardavoidingview
- React Native `Keyboard`: https://reactnative.dev/docs/keyboard
- React Native `Modal`: https://reactnative.dev/docs/modal
- Expo `android.softwareKeyboardLayoutMode`: https://docs.expo.dev/versions/latest/config/app/#softwarekeyboardlayoutmode
- Android `windowSoftInputMode`: https://developer.android.com/guide/topics/manifest/activity-element#wsoft

## Product Rule

League chat is a messenger surface, not a bottom sheet. It must open as a full-screen modal or route with a stable header, a flex message list, and a composer pinned as the last child of the screen.

Do not rebuild it as a transparent bottom overlay, partial-height sheet, absolute-positioned composer, or nested card-within-card. The design principle is spatial stability: messages scroll, the composer stays visible, and the keyboard moves the whole chat surface like Telegram.

## Cross-Platform Layout Contract

- The full-screen chat shell owns keyboard avoidance.
- `LeagueChatPanel` renders chat content only: message list plus composer.
- Layout order is always `header -> flex message list -> composer`.
- The message list must have `flex: 1` and the containing view must allow `minHeight: 0`.
- The composer must not use `position: 'absolute'`, fixed screen coordinates, or manual keyboard height padding.
- Safe-area bottom padding is allowed for the closed-keyboard state; keyboard height padding belongs to the full-screen shell.

## iPhone Rules

- Wrap the full-screen chat in `KeyboardAvoidingView` with `behavior="padding"`.
- Keep `keyboardVerticalOffset={0}` unless a native navigation header sits outside the avoiding view.
- Use `SafeAreaView` for top/side safe areas; let the composer handle bottom safe area.
- Prefer `keyboardDismissMode="interactive"` on the message `ScrollView`.
- Do not use `measureInWindow`, `Keyboard.metrics()`, or delayed manual overlap calculations for the main chat composer.

## Android Rules

- Keep `expo.android.softwareKeyboardLayoutMode` set to `"resize"` in `app.json`.
- Wrap the full-screen chat in `KeyboardAvoidingView` with `behavior="height"`.
- Do not switch the chat activity/window to pan behavior; `adjustPan` can hide the composer behind Gboard on some devices.
- Do not combine Android resize with a second manual keyboard bottom inset inside the chat panel.
- Verify with Gboard and at least one tall keyboard/language layout because suggestion bars change keyboard height.

## Acceptance Checks

- Opening chat covers the full app window; no dimmed league screen remains behind a partial sheet.
- With the keyboard open, the composer is fully visible above the keyboard on iOS and Android.
- Sending, report, hide-user, unread badges, and optimistic rows still work.
- Contract tests should assert the full-screen shell and reject main-chat `measureInWindow` or `keyboardBottomInset` logic.

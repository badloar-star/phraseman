import fs from 'fs';
import path from 'path';
import {
  createNativeModalDismissState,
  reduceNativeModalDismiss,
} from '../components/modal_fx/native_modal_dismiss_coordinator';

const source = fs.readFileSync(path.resolve(__dirname, '../components/modal_fx/HybridSheetShell.tsx'), 'utf8');

describe('HybridSheetShell native dismissal handoff', () => {
  const step = (state: ReturnType<typeof createNativeModalDismissState>, event: Parameters<typeof reduceNativeModalDismiss>[1], platform: 'ios' | 'android') => (
    reduceNativeModalDismiss(state, event, platform)
  );

  it('queues an iOS reopen until the matching native dismiss and does not notify the superseded close', () => {
    let state = createNativeModalDismissState(true);
    const presentationToken = state.token;
    const close = step(state, { type: 'sync-visible', visible: false }, 'ios');
    state = close.state;
    const token = state.token;
    expect(token).toBe(presentationToken);
    expect(close.commands).toEqual([{ type: 'set-native-visible', visible: false }]);

    const reopen = step(state, { type: 'sync-visible', visible: true }, 'ios');
    state = reopen.state;
    expect(reopen.commands).toEqual([]);
    expect(state.pendingReopen).toBe(true);

    const dismissed = step(state, { type: 'native-dismissed', token }, 'ios');
    expect(dismissed.state.phase).toBe('open');
    expect(dismissed.state.token).toBe(token + 1);
    expect(dismissed.commands).toEqual([{ type: 'set-native-visible', visible: true }]);
  });

  it('allocates a presentation token when a previously hidden modal opens', () => {
    const hidden = createNativeModalDismissState(false);
    const opened = step(hidden, { type: 'sync-visible', visible: true }, 'ios');

    expect(opened.state.phase).toBe('open');
    expect(opened.state.token).toBe(hidden.token + 1);
  });

  it('notifies once when iOS closes again before the queued native dismissal arrives', () => {
    let state = createNativeModalDismissState(true);
    state = step(state, { type: 'sync-visible', visible: false }, 'ios').state;
    const token = state.token;
    state = step(state, { type: 'sync-visible', visible: true }, 'ios').state;
    state = step(state, { type: 'sync-visible', visible: false }, 'ios').state;

    const first = step(state, { type: 'native-dismissed', token }, 'ios');
    expect(first.commands).toEqual([{ type: 'notify-dismissed', token }]);
    const duplicate = step(first.state, { type: 'native-dismissed', token }, 'ios');
    expect(duplicate.commands).toEqual([]);
  });

  it('ignores stale iOS native dismissal tokens', () => {
    let state = createNativeModalDismissState(true);
    state = step(state, { type: 'sync-visible', visible: false }, 'ios').state;
    const staleToken = state.token - 1;
    expect(step(state, { type: 'native-dismissed', token: staleToken }, 'ios').commands).toEqual([]);
  });

  it('schedules one Android barrier, cancels it on reopen, and ignores its stale elapsed callback', () => {
    let state = createNativeModalDismissState(true);
    const close = step(state, { type: 'sync-visible', visible: false }, 'android');
    state = close.state;
    const staleToken = state.token;
    expect(close.commands).toEqual([
      { type: 'set-native-visible', visible: false },
      { type: 'schedule-android-barrier', token: staleToken },
    ]);
    expect(step(state, { type: 'sync-visible', visible: false }, 'android').commands).toEqual([]);

    const reopen = step(state, { type: 'sync-visible', visible: true }, 'android');
    state = reopen.state;
    expect(reopen.commands).toEqual([
      { type: 'cancel-android-barrier', token: staleToken },
      { type: 'set-native-visible', visible: true },
    ]);
    expect(step(state, { type: 'android-barrier-elapsed', token: staleToken }, 'android').commands).toEqual([]);

    const closeAgain = step(state, { type: 'sync-visible', visible: false }, 'android');
    state = closeAgain.state;
    const freshToken = state.token;
    const elapsed = step(state, { type: 'android-barrier-elapsed', token: freshToken }, 'android');
    expect(elapsed.commands).toEqual([{ type: 'notify-dismissed', token: freshToken }]);
    expect(step(elapsed.state, { type: 'android-barrier-elapsed', token: freshToken }, 'android').commands).toEqual([]);
  });

  it('cancels an Android barrier on dispose without notifying', () => {
    let state = createNativeModalDismissState(true);
    state = step(state, { type: 'sync-visible', visible: false }, 'android').state;
    const token = state.token;
    const disposed = step(state, { type: 'dispose' }, 'android');
    expect(disposed.commands).toEqual([{ type: 'cancel-android-barrier', token }]);
    expect(step(disposed.state, { type: 'android-barrier-elapsed', token }, 'android').commands).toEqual([]);
  });

  it('keeps an absent onDismissed callback outside coordinator lifecycle scheduling', () => {
    expect(source).toContain('const dismissalEnabled = Boolean(onDismissed);');
    expect(source).toContain('dismissalEnabledRef.current = dismissalEnabled;');
    expect(source).toContain('onDismissedRef.current = onDismissed;');
    expect(source).toContain('token: coordinatorRef.current.token');
    expect(source).toContain('key={nativePresentation.token}');
    expect(source).toContain('[cancelNativeDismissFallback, dismissalEnabled, dispatchNativeDismiss, visible]');
    expect(source).toContain('if (coordinatorRef.current.disposed) {');
    expect(source).toContain('coordinatorRef.current = createNativeModalDismissState(visible);');
    expect(source).not.toContain('[cancelNativeDismissFallback, completeNativeDismiss, onDismissed, visible]');
  });
});

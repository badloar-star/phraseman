export type NativeModalPlatform = 'ios' | 'android';

export type NativeModalDismissPhase = 'open' | 'closed' | 'ios-closing' | 'android-closing';

export type NativeModalDismissState = {
  phase: NativeModalDismissPhase;
  nativeVisible: boolean;
  token: number;
  pendingReopen: boolean;
  disposed: boolean;
};

export type NativeModalDismissEvent =
  | { type: 'sync-visible'; visible: boolean }
  | { type: 'native-dismissed'; token: number }
  | { type: 'android-barrier-elapsed'; token: number }
  | { type: 'dispose' };

export type NativeModalDismissCommand =
  | { type: 'set-native-visible'; visible: boolean }
  | { type: 'schedule-android-barrier'; token: number }
  | { type: 'cancel-android-barrier'; token: number }
  | { type: 'notify-dismissed'; token: number };

export type NativeModalDismissTransition = {
  state: NativeModalDismissState;
  commands: NativeModalDismissCommand[];
};

export function createNativeModalDismissState(visible: boolean): NativeModalDismissState {
  return {
    phase: visible ? 'open' : 'closed',
    nativeVisible: visible,
    token: visible ? 1 : 0,
    pendingReopen: false,
    disposed: false,
  };
}

const unchanged = (state: NativeModalDismissState): NativeModalDismissTransition => ({ state, commands: [] });

export function reduceNativeModalDismiss(
  state: NativeModalDismissState,
  event: NativeModalDismissEvent,
  platform: NativeModalPlatform,
): NativeModalDismissTransition {
  if (state.disposed) return unchanged(state);

  if (event.type === 'dispose') {
    const commands: NativeModalDismissCommand[] = state.phase === 'android-closing'
      ? [{ type: 'cancel-android-barrier', token: state.token }]
      : [];
    return {
      state: { ...state, phase: 'closed', nativeVisible: false, pendingReopen: false, disposed: true },
      commands,
    };
  }

  if (event.type === 'sync-visible') {
    if (event.visible) {
      if (state.phase === 'closed') {
        return {
          state: {
            ...state,
            phase: 'open',
            nativeVisible: true,
            token: state.token + 1,
            pendingReopen: false,
          },
          commands: [{ type: 'set-native-visible', visible: true }],
        };
      }
      if (state.phase === 'ios-closing') {
        return { state: { ...state, pendingReopen: true }, commands: [] };
      }
      if (state.phase === 'android-closing') {
        return {
          state: {
            ...state,
            phase: 'open',
            nativeVisible: true,
            token: state.token + 1,
            pendingReopen: false,
          },
          commands: [
            { type: 'cancel-android-barrier', token: state.token },
            { type: 'set-native-visible', visible: true },
          ],
        };
      }
      return unchanged(state);
    }

    if (state.phase === 'open') {
      const token = state.token;
      const isAndroid = platform === 'android';
      return {
        state: {
          ...state,
          phase: isAndroid ? 'android-closing' : 'ios-closing',
          nativeVisible: false,
          token,
          pendingReopen: false,
        },
        commands: isAndroid
          ? [{ type: 'set-native-visible', visible: false }, { type: 'schedule-android-barrier', token }]
          : [{ type: 'set-native-visible', visible: false }],
      };
    }
    if (state.phase === 'ios-closing' && state.pendingReopen) {
      return { state: { ...state, pendingReopen: false }, commands: [] };
    }
    return unchanged(state);
  }

  if (event.type === 'native-dismissed') {
    if (platform !== 'ios' || state.phase !== 'ios-closing' || event.token !== state.token) return unchanged(state);
    if (state.pendingReopen) {
      const nextToken = state.token + 1;
      return {
        state: {
          ...state,
          phase: 'open',
          nativeVisible: true,
          token: nextToken,
          pendingReopen: false,
        },
        commands: [{ type: 'set-native-visible', visible: true }],
      };
    }
    return {
      state: { ...state, phase: 'closed', nativeVisible: false },
      commands: [{ type: 'notify-dismissed', token: state.token }],
    };
  }

  if (platform !== 'android' || state.phase !== 'android-closing' || event.token !== state.token) return unchanged(state);
  return {
    state: { ...state, phase: 'closed', nativeVisible: false },
    commands: [{ type: 'notify-dismissed', token: state.token }],
  };
}

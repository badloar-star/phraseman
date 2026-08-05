import { InteractionManager } from 'react-native';

type NavigateFn = () => void;

/** Matches the proven native-to-native handoff gap used by OverlayArbiter. */
export const NATIVE_MODAL_DISMISS_GAP_MS = 360;

/**
 * Close a native RN Modal first, then navigate.
 * On iOS especially, pushing another screen while a Modal or StoreKit sheet is still
 * dismissing can leave touches captured by the old native layer.
 */
export function navigateAfterModalClose(onClose: () => void, navigate: NavigateFn, delayMs = 120): void {
  onClose();
  const wait = Math.max(delayMs, NATIVE_MODAL_DISMISS_GAP_MS);
  InteractionManager.runAfterInteractions(() => {
    setTimeout(navigate, wait);
  });
}

export default function __RouteShim() {
  return null;
}

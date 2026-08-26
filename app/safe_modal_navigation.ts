type NavigateFn = () => void;

/** Matches the proven native-to-native handoff gap used by OverlayArbiter. */
export const NATIVE_MODAL_DISMISS_GAP_MS = 360;

/**
 * Close a native RN Modal first, then navigate.
 * On iOS especially, pushing another screen while a Modal or StoreKit sheet is still
 * dismissing can leave touches captured by the old native layer.
 */
export function navigateAfterModalClose(onClose: () => void, navigate: NavigateFn, _delayMs = 0): void {
  onClose();
  // Route is prepared immediately beneath the closing native layer. The 360-ms
  // constant remains reserved for HybridSheetShell's native-dismiss observer;
  // it is not a user-visible navigation delay.
  navigate();
}

export default function __RouteShim() {
  return null;
}

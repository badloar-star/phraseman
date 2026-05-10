import { InteractionManager, Platform } from 'react-native';

type NavigateFn = () => void;

/**
 * Close a native RN Modal first, then navigate.
 * On iOS especially, pushing another screen while a Modal or StoreKit sheet is still
 * dismissing can leave touches captured by the old native layer.
 */
export function navigateAfterModalClose(onClose: () => void, navigate: NavigateFn, delayMs = 120): void {
  onClose();
  const wait = Platform.OS === 'ios' ? Math.max(delayMs, 160) : delayMs;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(navigate, wait);
  });
}

export default function __RouteShim() {
  return null;
}

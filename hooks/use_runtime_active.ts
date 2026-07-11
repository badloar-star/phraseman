import { useAppRuntimeActive } from '../app/runtime_app_state_store';
import { useIsScreenFocused } from './use_is_screen_focused';

export function useRuntimeActive(ownerVisible = true): boolean {
  const screenFocused = useIsScreenFocused();
  const appActive = useAppRuntimeActive();
  return screenFocused && appActive && ownerVisible;
}

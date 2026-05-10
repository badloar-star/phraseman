import type { TextInputProps } from 'react-native';
import { getEffectivePlatformOS } from './platform_ui_preview';

/**
 * Пропсы для TextInput: длинное нажатие открывает системное меню (вставить / копировать),
 * жест не «съедается» родительским ScrollView (особенно iOS).
 */
export function getTextInputSystemEditMenuProps(): Readonly<Partial<TextInputProps>> {
  return {
    rejectResponderTermination: false,
    scrollEnabled: true,
    ...(getEffectivePlatformOS() === 'ios'
      ? ({
          textContentType: 'none',
          dataDetectorTypes: 'none',
        } as const)
      : {}),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}

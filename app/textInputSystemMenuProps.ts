import { Platform } from 'react-native';
import type { TextInputProps } from 'react-native';

/**
 * Пропсы для TextInput: длинное нажатие открывает системное меню (вставить / копировать),
 * жест не «съедается» родительским ScrollView (особенно iOS).
 */
export const textInputSystemEditMenuProps: Readonly<Partial<TextInputProps>> = {
  rejectResponderTermination: false,
  scrollEnabled: true,
  ...(Platform.OS === 'ios'
    ? ({
        textContentType: 'none',
        dataDetectorTypes: 'none',
      } as const)
    : {}),
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

/**
 * Стиль кнопки «Войти через Apple» по фону места вызова.
 *
 * зачем (координатор 13.10, правило владельца «никакие кнопки не сливаются»): чёрная кнопка терялась на тёмной плите онбординга.
 * По Apple HIG у Sign in with Apple два официальных стиля: белый на тёмном фоне, чёрный на светлом. Стиль выбирает место вызова
 * по своему фону. Модуль без react-native — его проверяет сторож tests/auth_apple_button_variant_contract.test.ts.
 */
export type AppleButtonVariant = 'light' | 'dark';

export function appleButtonColors(variant: AppleButtonVariant): Readonly<{ background: string; ink: string }> {
  return variant === 'dark'
    ? { background: '#FFFFFF', ink: '#000000' } // theme-exempt: официальный белый стиль Sign in with Apple
    : { background: '#000000', ink: '#FFFFFF' }; // theme-exempt: официальный чёрный стиль Sign in with Apple
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

type KeyboardEventName = Parameters<typeof Keyboard.addListener>[0];

export type KeyboardFrameCoordinates = {
  screenY?: number;
  height?: number;
} | null | undefined;

export function getKeyboardTopY(
  coordinates: KeyboardFrameCoordinates,
  screenHeight: number,
): number {
  const screenY = coordinates?.screenY;
  if (typeof screenY === 'number' && Number.isFinite(screenY) && screenY > 0) {
    return screenY;
  }

  const height = coordinates?.height;
  if (
    typeof height === 'number' &&
    Number.isFinite(height) &&
    height > 0 &&
    Number.isFinite(screenHeight) &&
    screenHeight > height
  ) {
    return screenHeight - height;
  }

  return Number.POSITIVE_INFINITY;
}

export function getKeyboardBottomInset(
  coordinates: KeyboardFrameCoordinates,
  screenHeight: number,
): number {
  const keyboardTopY = getKeyboardTopY(coordinates, screenHeight);
  if (!Number.isFinite(keyboardTopY) || !Number.isFinite(screenHeight)) {
    return 0;
  }

  return Math.max(0, Math.ceil(screenHeight - keyboardTopY));
}

export function getKeyboardAwareComposerBottomPadding(
  keyboardBottomInset: number,
  safeAreaBottomInset: number,
  keyboardVisible = keyboardBottomInset > 0,
): number {
  return keyboardVisible ? 8 : Math.max(10, safeAreaBottomInset + 4);
}

export type KeyboardAvoidanceMetrics = {
  bottomInset: number;
  visible: boolean;
};

export function useKeyboardAvoidanceMetrics(enabled = true): KeyboardAvoidanceMetrics {
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardCoordinates, setKeyboardCoordinates] = useState<KeyboardFrameCoordinates>(null);

  useEffect(() => {
    if (!enabled) {
      setKeyboardCoordinates(null);
      return;
    }

    const showEvent: KeyboardEventName = Platform.OS === 'ios'
      ? 'keyboardWillChangeFrame'
      : 'keyboardDidShow';
    const hideEvent: KeyboardEventName = Platform.OS === 'ios'
      ? 'keyboardWillHide'
      : 'keyboardDidHide';
    const updateCoordinates = (event: { endCoordinates?: KeyboardFrameCoordinates }) => {
      setKeyboardCoordinates(event.endCoordinates ?? null);
    };
    const showSub = Keyboard.addListener(showEvent, updateCoordinates);
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardCoordinates(null));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled]);

  if (!enabled || !keyboardCoordinates) {
    return { bottomInset: 0, visible: false };
  }

  return {
    bottomInset: getKeyboardBottomInset(keyboardCoordinates, windowHeight),
    visible: true,
  };
}

export function useKeyboardBottomInset(enabled = true): number {
  return useKeyboardAvoidanceMetrics(enabled).bottomInset;
}

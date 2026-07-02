// Печатающийся текст Компаса: посимвольный вывод + мигающий курсор.
// Курсор — управляемый Animated.loop, ОБЯЗАТЕЛЬНО гейтится фокусом экрана
// и AppState (паттерн components/AvatarAura.tsx), чтобы не крутиться в фоне.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { AHA_THEME } from './aha_theme';
import type { TypewriterTextProps } from './aha_types';

const DEFAULT_CHAR_MS = 32;
const CURSOR_PHASE_MS = 500;

export default function TypewriterText({ text, charMs = DEFAULT_CHAR_MS, onDone, skipOnPress }: TypewriterTextProps) {
  const [shownLength, setShownLength] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneCalledRef = useRef(false);
  const cursorOpacity = useRef(new Animated.Value(0)).current;
  const isFocused = useIsScreenFocused();

  const isComplete = shownLength >= text.length;

  const finish = () => {
    setShownLength(text.length);
    if (!doneCalledRef.current) {
      doneCalledRef.current = true;
      onDone?.();
    }
  };

  // Посимвольная печать: цепочка setTimeout с очисткой при unmount/смене текста.
  useEffect(() => {
    doneCalledRef.current = false;
    setShownLength(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (text.length === 0) {
      doneCalledRef.current = true;
      onDone?.();
      return;
    }

    let index = 0;
    const step = () => {
      index += 1;
      setShownLength(index);
      if (index < text.length) {
        timerRef.current = setTimeout(step, charMs);
      } else {
        if (!doneCalledRef.current) {
          doneCalledRef.current = true;
          onDone?.();
        }
      }
    };
    timerRef.current = setTimeout(step, charMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, charMs]);

  // Мигающий курсор — гейт по фокусу экрана + AppState (паттерн AvatarAura).
  const shouldAnimateCursor = isFocused && !isComplete;
  useEffect(() => {
    if (!shouldAnimateCursor) {
      cursorOpacity.setValue(0);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      cursorOpacity.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: CURSOR_PHASE_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: CURSOR_PHASE_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [cursorOpacity, shouldAnimateCursor]);

  const handlePress = () => {
    if (skipOnPress && !isComplete) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      finish();
    }
  };

  const shownText = text.slice(0, shownLength);

  const body = (
    <Text style={styles.text}>
      {shownText}
      {!isComplete && (
        <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>{'▍'}</Animated.Text>
      )}
    </Text>
  );

  if (!skipOnPress) {
    return body;
  }

  return <Pressable onPress={handlePress}>{body}</Pressable>;
}

const styles = StyleSheet.create({
  text: {
    color: AHA_THEME.textPrimary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  cursor: {
    color: AHA_THEME.textPrimary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
});

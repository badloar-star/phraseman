// Строка с пословной караоке-подсветкой по реальному времени воспроизведения.
// Слова не React-анимируются (Animated) — просто setState с текущим индексом,
// таймеры расставлены на каждую границу слова (макс. 7 слов в реплике сцены).

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { hapticTap } from '../../hooks/use-haptics';
import { buildKaraokeFrames } from './aha_karaoke';
import { ahaStylesCache, useAhaTheme } from './use_aha_theme';
import type { AhaTheme } from './aha_theme';
import type { KaraokeLineProps } from './aha_types';

export default function KaraokeLine({ line, playToken, variant, onPress }: KaraokeLineProps) {
  const T = useAhaTheme();
  const styles = makeStyles(T);
  const [litIndex, setLitIndex] = useState(-1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };
    clearTimers();
    setLitIndex(-1);

    const frames = buildKaraokeFrames(line);
    timersRef.current = frames.map((frame) =>
      setTimeout(() => setLitIndex(frame.wordIndex), frame.atMs),
    );

    return clearTimers;
  }, [line, playToken]);

  const handlePressIn = () => {
    hapticTap();
  };

  const content = (
    <Text style={styles.line}>
      {line.timings.map((timing, index) => {
        const isLit = index <= litIndex;
        const isLastLit = index === litIndex;
        const accentActive = variant === 'say' && isLastLit;
        return (
          <Text
            key={`${timing.word}-${index}`}
            style={[
              styles.word,
              isLit ? styles.wordLit : styles.wordIdle,
              accentActive && styles.wordAccent,
            ]}
          >
            {index > 0 ? ' ' : ''}
            {timing.word}
          </Text>
        );
      })}
    </Text>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPressIn={handlePressIn} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const makeStyles = ahaStylesCache((T: AhaTheme) => StyleSheet.create({
  line: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  word: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  wordIdle: {
    color: T.karaokeIdle,
  },
  wordLit: {
    color: T.karaokeLit,
  },
  wordAccent: {
    color: T.karaokeAccent,
  },
}));

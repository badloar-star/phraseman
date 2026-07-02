// Бит 2 АХ-сцены: сборка целевой фразы из chips.
// UX-принцип дизайн-дока: «ошибка невозможна как состояние» — нет кнопки
// «проверить», победа наступает сама, неверный тап только мягко отпружинивает.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AhaChip, ChipsAssemblyProps } from './aha_types';
import { AHA_THEME } from './aha_theme';
import { pickTri } from './aha_scenes';
import { buildChipDeck, chipWordsFromLine, isChipCorrect } from './aha_chips_logic';
import { hapticTap, hapticSuccess, hapticWarning } from '../../hooks/use-haptics';

/** Сколько подряд неверных тапов до мягкой подсветки верного chip. */
const HINT_AFTER_MISTAKES = 2;

interface AssembledWordProps {
  word: string;
}

/** Слово в строке-слоте: fade+scale-in при появлении. */
function AssembledWord({ word }: AssembledWordProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
    // однократная анимация появления — без cleanup, лимитированная по времени
  }, [anim]);

  const style = {
    opacity: anim,
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
  };

  return (
    <Animated.Text style={[styles.assembledWord, style]}>
      {word}
    </Animated.Text>
  );
}

interface ChipButtonProps {
  chip: AhaChip;
  index: number;
  hinted: boolean;
  /** Тап обработан родителем синхронно: true — верный (chip уедет), false — отпружинит. */
  onTap: (chip: AhaChip) => boolean;
  /** Верный chip доиграл scale-down — теперь родитель может убрать его из банка. */
  onVanished: (chip: AhaChip) => void;
}

/** Один chip банка: staggered появление при маунте, shake при ошибке, scale-down при верном тапе. */
function ChipButton({ chip, index, hinted, onTap, onVanished }: ChipButtonProps) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [vanishing, setVanishing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, index * 50);
    return () => clearTimeout(timer);
  }, [enterAnim, index]);

  const runShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 43, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 43, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 43, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 43, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 43, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handlePress = useCallback(() => {
    if (vanishing) return;
    const correct = onTap(chip);
    if (correct) {
      setVanishing(true);
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onVanished(chip);
      });
    } else {
      runShake();
    }
  }, [chip, onTap, onVanished, runShake, scaleAnim, vanishing]);

  const enterStyle = {
    opacity: enterAnim,
    transform: [
      { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
      { translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) },
      { scale: scaleAnim },
    ],
  };

  return (
    <Animated.View style={enterStyle}>
      <Pressable
        disabled={vanishing}
        onPressIn={() => { void hapticTap(); }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.chip,
          hinted && styles.chipHinted,
          pressed && styles.chipPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={chip.word}
      >
        <Text style={styles.chipText}>{chip.word}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ChipsAssembly({ scenario, lang, onSolved, playSay }: ChipsAssemblyProps) {
  const words = useMemo(() => chipWordsFromLine(scenario.say.text), [scenario]);
  const seed = useMemo(
    () => scenario.say.text.length + scenario.id.length,
    [scenario],
  );
  const deck = useMemo(() => buildChipDeck(scenario, seed), [scenario, seed]);

  const [assembled, setAssembled] = useState<string[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const solvedRef = useRef(false);
  // Слово, уже засчитанное как верное, но ещё доигрывающее vanish-анимацию
  // (не должно повторно приниматься другим тапом до onVanished).
  const pendingCorrectRef = useRef<Set<string>>(new Set());

  const nextExpected = words[assembled.length] ?? null;
  const hintActive = mistakeStreak >= HINT_AFTER_MISTAKES;

  /** Синхронная проверка тапа: обновляет счётчик ошибок сразу, возвращает вердикт. */
  const handleTap = useCallback((chip: AhaChip): boolean => {
    if (solvedRef.current || pendingCorrectRef.current.has(chip.id)) return false;

    const correct = isChipCorrect(chip, assembled.length, words);
    if (correct) {
      pendingCorrectRef.current.add(chip.id);
      setMistakeStreak(0);
      return true;
    }
    setMistakeStreak((prev) => prev + 1);
    void hapticWarning();
    return false;
  }, [assembled.length, words]);

  /** Chip доиграл исчезновение — фиксируем слово в строке и чистим банк.
   *  Обновители состояния остаются чистыми: победа детектится в эффекте ниже,
   *  а не внутри setState (иначе setState родителя посреди рендера ребёнка). */
  const handleVanished = useCallback((chip: AhaChip) => {
    setPickedIds((prev) => new Set(prev).add(chip.id));
    setAssembled((prev) => [...prev, chip.word]);
  }, []);

  // Фраза собрана целиком — один раз запускаем победу вне фазы рендера.
  useEffect(() => {
    if (solvedRef.current) return;
    if (words.length === 0 || assembled.length !== words.length) return;
    solvedRef.current = true;
    void hapticSuccess();
    playSay();
    onSolved();
  }, [assembled.length, onSolved, playSay, words.length]);

  const bankChips = deck.filter((chip) => !pickedIds.has(chip.id));
  const translation = pickTri(lang, scenario.say.translation);

  return (
    <View style={styles.container}>
      <View style={styles.slotCard}>
        <View style={styles.slotRow}>
          {assembled.map((word, i) => (
            <AssembledWord key={`${word}_${i}`} word={word} />
          ))}
        </View>
      </View>
      <Text style={styles.translation}>{translation}</Text>
      <View style={styles.bank}>
        {bankChips.map((chip, i) => (
          <ChipButton
            key={chip.id}
            chip={chip}
            index={i}
            hinted={hintActive && nextExpected !== null && chip.word.toLowerCase() === nextExpected.toLowerCase()}
            onTap={handleTap}
            onVanished={handleVanished}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slotCard: {
    minHeight: 64,
    backgroundColor: AHA_THEME.cardBg,
    borderColor: AHA_THEME.cardBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: AHA_THEME.radiusCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assembledWord: {
    color: AHA_THEME.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  translation: {
    color: AHA_THEME.textMuted,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 18,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: AHA_THEME.chipBg,
    borderColor: AHA_THEME.chipBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: AHA_THEME.radiusChip,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipHinted: {
    borderColor: AHA_THEME.chipHintBorder,
    borderWidth: 1.5,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    color: AHA_THEME.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
});

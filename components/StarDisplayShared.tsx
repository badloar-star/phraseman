/**
 * cards-2.0 (E5): звёздные слоты — вынесены 1:1 из app/arena_results.tsx (§3.10
 * мастер-плана) для реюза в SessionResultScreen раздела «Карточки».
 * Поведение НЕ менять: арена (arena_results) импортирует отсюда.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

// ── Одна звезда (слот) ─────────────────────────────────────────────────────────
export function StarSlot({ filled, animateIn, animateOut, delay, accentColor, size = 32, showEmpty = false }: {
  filled: boolean;
  animateIn: boolean;
  animateOut: boolean;
  delay: number;
  accentColor: string;
  /** Размер шрифта звезды; арена использует дефолт 32 */
  size?: number;
  /** true → незаполненный слот виден сразу (тусклая звезда). Арена: false (поведение 1:1). */
  showEmpty?: boolean;
}) {
  const scale = useRef(new Animated.Value((filled && !animateIn) || (showEmpty && !filled) ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(filled && !animateIn ? 1 : 0.25)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    } else if (animateOut) {
      Animated.sequence([
        Animated.delay(400 + delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, friction: 3, tension: 80 }),
          Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(100),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
      ]).start();
    }
  }, [animateIn, animateOut, delay, opacity, scale]);

  return (
    <Animated.Text style={{
      fontSize: size,
      transform: [{ scale }],
      opacity,
      color: filled ? accentColor : '#555',
    }}>
      ★
    </Animated.Text>
  );
}

// ── Блок из 3 звёздочек (арена: old→new с ранг-апом) ──────────────────────────
export function StarDisplay({ oldStars, newStars, accentColor, ready, rankChanged = false }: {
  oldStars: number;
  newStars: number;
  accentColor: string;
  ready: boolean;
  rankChanged?: boolean;
}) {
  // При ранг-апе newStars сбрасывается в 0 (earned 3rd → rank up).
  // Показываем промежуточный «заполненный» слот (oldStars+1=3), чтобы
  // 3-я звезда анимировалась ДО того как экран покажет новый ранг с 0 звёзд.
  // При демоуне (0→2 нижнего ранга) rankChanged=true, promoted=false — shows loss.
  const isRankUp = rankChanged && newStars < oldStars;
  const displayNewStars = isRankUp ? Math.min(3, oldStars + 1) : newStars;

  const gained = displayNewStars > oldStars;
  const lost = !isRankUp && newStars < oldStars && !rankChanged;
  const changedIdx = gained ? oldStars : (lost ? oldStars - 1 : -1);

  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
      {[0, 1, 2].map(i => {
        const isFilled = ready ? i < displayNewStars : i < oldStars;
        const animIn = ready && gained && i === changedIdx;
        const animOut = ready && lost && i === changedIdx;
        return (
          <StarSlot
            key={i}
            filled={isFilled}
            animateIn={animIn}
            animateOut={animOut}
            delay={0}
            accentColor={accentColor}
          />
        );
      })}
    </View>
  );
}

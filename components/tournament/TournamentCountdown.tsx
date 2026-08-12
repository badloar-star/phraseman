// ═══════════════════════════════════════════════════════════════════════════
// TournamentCountdown.tsx — крупный отсчёт до старта и кольцо таймера раунда.
//
// зачем: два места режима показывают время (hero главной и таймер вопроса),
// формат обязан быть одинаковым — иначе цифры «прыгают» при смене разряда.
// Везде моноширинные цифры (fontVariant tabular-nums) и общий formatTimeLeft.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { formatTimeLeft, type, useTournamentPalette, type TournamentPalette} from './tournament_theme';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Тикающий счётчик секунд.
 * Один interval на компонент; при уходе с экрана чистится, чтобы не жечь
 * батарею фоновым таймером (Performance Bible: guarded loops).
 */
export function useCountdown(initialSeconds: number, running = true): number {
  const [left, setLeft] = useState(Math.max(0, Math.floor(initialSeconds)));
  const targetRef = useRef(Date.now() + Math.max(0, initialSeconds) * 1000);

  useEffect(() => {
    targetRef.current = Date.now() + Math.max(0, initialSeconds) * 1000;
    setLeft(Math.max(0, Math.floor(initialSeconds)));
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) return;
    // зачем 2026-07-27: `running` теперь ещё и гвард видимости (экран скрыт —
    // таймер спит, не греет телефон). Пересчёт ВЫНЕСЕН перед setInterval:
    // иначе после паузы первую секунду висело бы устаревшее число, «пойманное»
    // в момент скрытия. Считаем от целевого момента, поэтому возврат на экран
    // сразу показывает правильный отсчёт.
    const compute = () => {
      const remain = Math.max(0, Math.round((targetRef.current - Date.now()) / 1000));
      setLeft(remain);
      return remain;
    };
    if (compute() <= 0) return;
    const id = setInterval(() => {
      if (compute() <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [running, initialSeconds]);

  return left;
}

// ── Крупный отсчёт (hero главной) ───────────────────────────────────────────

export const TimeLeft = memo(function TimeLeft({
  seconds, size = 64, color,
}: { seconds: number; size?: number; color?: string }) {
  const P = useTournamentPalette();
  // Цвет по умолчанию — из активной темы; проп остаётся переопределением.
  const resolvedColor = color ?? P.text;
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const text = useMemo(() => formatTimeLeft(seconds), [seconds]);
  return (
    <Text
      style={[styles.timer, { fontSize: size, color: resolvedColor, lineHeight: size * 1.05 }]}
    >
      {text}
    </Text>
  );
});

// ── Кольцо таймера вопроса ──────────────────────────────────────────────────

type RingProps = {
  /** Сколько секунд осталось. */
  seconds: number;
  /** Полная длительность вопроса — для расчёта дуги. */
  total: number;
  size?: number;
};

/**
 * Кольцо прогресса (макет 09-13). Почти весь вопрос — чистое кольцо без цифр
 * и декора; красным предупреждает с последних 5 секунд, а отсчёт 3-2-1
 * проявляется только в самом конце окна ответа.
 */
export const TimerRing = memo(function TimerRing({ seconds, total, size = 44 }: RingProps) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const styles = useMemo(() => makeStyles(P), [P]);
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(1);
  const low = seconds <= 5;
  // зачем 2026-08-03 (вечернее указание владельца, отменяет утреннее «цифра
  // видна всегда»): постоянная цифра и точки внутри кольца отвлекали от
  // вопроса. Кольцо молчит, цифры появляются только на последних трёх секундах.
  const showDigit = seconds > 0 && seconds <= 3;

  useEffect(() => {
    const next = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
    progress.value = withTiming(next, { duration: 950, easing: Easing.linear });
  }, [seconds, total, progress]);

  const dash = useDerivedValue(() => circumference * (1 - progress.value));
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={triLang(lang, {
        ru: `Время на вопрос: ${Math.ceil(seconds)}`,
        uk: `Час на запитання: ${Math.ceil(seconds)}`,
        es: `Tiempo para la pregunta: ${Math.ceil(seconds)}`,
        'pt-BR': `Tempo para a pergunta: ${Math.ceil(seconds)}`,
        vi: `Thời gian cho câu hỏi: ${Math.ceil(seconds)}`,
        id: `Waktu untuk pertanyaan: ${Math.ceil(seconds)}`,
        tr: `Soru için süre: ${Math.ceil(seconds)}`,
        pl: `Czas na pytanie: ${Math.ceil(seconds)}`,
      })}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={P.elev2} strokeWidth={stroke} fill="none"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={low ? P.danger : P.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showDigit && (
        <Animated.Text entering={FadeIn.duration(150)} style={styles.ringText}>
          {Math.ceil(seconds)}
        </Animated.Text>
      )}
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  timer: {
    ...type.hero,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // Цифра существует только в красной зоне (≤3 c), поэтому сразу в тоне danger.
  ringText: {
    color: P.danger,
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});

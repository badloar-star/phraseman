import React, { useMemo, useRef } from 'react';
import { View, Text, Animated, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';

// зачем: владелец попросил «три кольца дня как у Bevel» — единый one-glance статус
// дня (урок / практика ошибок / карточки) вместо пяти разных индикаторов прогресса.
// Правило нуля: кольцо с нулём никогда не показывает «0» — у новичка вместо цифр
// приглашение (текст даёт родитель), незаполненная дуга — слабый тон акцента.
// Первый кадр = финальная геометрия (Performance Bible): дуги рисуются сразу в
// конечном состоянии, без анимаций «0 → значение» и без бесконечных эффектов.

export type DayRingState = Readonly<{
  /** 0..1 — заполнение кольца; значения выше 1 обрезаются до 1 (второй виток — later). */
  progress: number;
  /** Крупная подпись в центре («64%», «4/10»). Пустая строка = не показывать цифру (новичок). */
  valueLabel: string;
  /** true — данных ещё нет по определению (новичок): дуга-анонс слабым тоном акцента. */
  isAnnounce?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}>;

export type DayRingsProps = Readonly<{
  lesson: DayRingState;
  practice: DayRingState;
  cards: DayRingState;
}>;

const RING_BOX = 92;
const RING_RADIUS = 38;
const RING_STROKE = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Светлее на k (0..1) к белому — «то же семейство, другая фаза» для кольца карточек. */
function lighten(hex: string, k: number): string {
  if (hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * k);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function withAlphaColor(color: string, alpha: number): string {
  if (color[0] !== '#') return color;
  let h = color.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

type SingleRingProps = Readonly<{
  state: DayRingState;
  color: string;
  gradientId: string;
  caption: string;
  trackColor: string;
  announceTrackColor: string;
  textColor: string;
}>;

function SingleRing({ state, color, gradientId, caption, trackColor, announceTrackColor, textColor }: SingleRingProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const pressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  const clamped = Math.max(0, Math.min(1, state.progress));
  const dashOffset = RING_CIRCUMFERENCE * (1 - clamped);
  const showArc = clamped > 0.005 && !state.isAnnounce;

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        testID={state.testID}
        accessibilityRole="button"
        accessibilityLabel={state.accessibilityLabel ?? caption}
        hitSlop={8}
        onPressIn={() => {
          Animated.spring(pressAnim, { toValue: 1, speed: 34, bounciness: 6, useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressAnim, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }).start();
        }}
        onPress={() => {
          if (!state.onPress) return;
          hapticTap();
          state.onPress();
        }}
        style={s.ringBox}
      >
        <Svg width={RING_BOX} height={RING_BOX} viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}>
          <Defs>
            {/* «Дорого» по правилам владельца: дуга — глубокий градиент тона, не плоский цвет и не рамка. */}
            <SvgLinearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity={0.72} />
              <Stop offset="1" stopColor={color} stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={state.isAnnounce ? announceTrackColor : trackColor}
            strokeWidth={RING_STROKE}
          />
          {showArc && (
            <Circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}
            />
          )}
        </Svg>
        {state.valueLabel !== '' && (
          <View pointerEvents="none" style={s.valueWrap}>
            <Text allowFontScaling={false} style={[s.valueText, { color }]} numberOfLines={1}>
              {state.valueLabel}
            </Text>
          </View>
        )}
        <Text allowFontScaling={false} style={[s.caption, { color: textColor }]} numberOfLines={1}>
          {caption}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Три кольца дня: Урок (t.accent) / Практика (t.gold — забота, никогда не красный) /
 * Карточки (t.accent +18% светлоты). Чистая презентация: значения считает родитель.
 */
export default function DayRings({ lesson, practice, cards }: DayRingsProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const colors = useMemo(() => ({
    lesson: t.accent,
    practice: t.gold,
    cards: lighten(t.accent, 0.18),
  }), [t.accent, t.gold]);

  const trackColor = useMemo(() => withAlphaColor(t.textMuted, 0.14), [t.textMuted]);
  const announceTrackColor = useMemo(() => withAlphaColor(t.accent, 0.1), [t.accent]);

  return (
    <View style={s.row}>
      <SingleRing
        state={lesson}
        color={colors.lesson}
        gradientId="dayRingLesson"
        trackColor={trackColor}
        announceTrackColor={announceTrackColor}
        textColor={t.textSecond}
        caption={triLang(lang, {
          ru: 'Урок', uk: 'Урок', es: 'Lección', 'pt-BR': 'Lição',
          vi: 'Bài học', id: 'Pelajaran', tr: 'Ders', pl: 'Lekcja',
        })}
      />
      <SingleRing
        state={practice}
        color={colors.practice}
        gradientId="dayRingPractice"
        trackColor={trackColor}
        announceTrackColor={announceTrackColor}
        textColor={t.textSecond}
        caption={triLang(lang, {
          ru: 'Практика', uk: 'Практика', es: 'Práctica', 'pt-BR': 'Prática',
          vi: 'Luyện tập', id: 'Latihan', tr: 'Pratik', pl: 'Praktyka',
        })}
      />
      <SingleRing
        state={cards}
        color={colors.cards}
        gradientId="dayRingCards"
        trackColor={trackColor}
        announceTrackColor={announceTrackColor}
        textColor={t.textSecond}
        caption={triLang(lang, {
          ru: 'Карточки', uk: 'Картки', es: 'Tarjetas', 'pt-BR': 'Cartões',
          vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki',
        })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  ringBox: {
    width: RING_BOX,
    alignItems: 'center',
  },
  valueWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: RING_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Вес 900 разрешён только числам (правило типографики №5) — здесь ровно числа.
  valueText: {
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

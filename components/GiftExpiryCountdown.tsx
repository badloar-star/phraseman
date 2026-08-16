/**
 * GiftExpiryCountdown — индивидуальный тикающий таймер подарка (чч:мм:сс).
 *
 * зачем (2026-08-02, владелец): каждый полученный подарок живёт 72 часа и
 * исчезает; видимый отсчёт — двигатель «забери, пока не сгорело». Последние
 * 6 часов подсвечиваются тёплым (порог пуша «сгорит через 6 часов»).
 *
 * Дизайн: та же тональная пилюля, что бейдж «Активно» (без обводок).
 * Layout stability: tabular-nums + фиксированная minWidth — цифры тикают
 * без сдвига геометрии. Тикер живёт только пока экран в фокусе (frozen
 * background), при нуле один раз зовёт onExpired — родитель убирает ряд.
 *
 * зачем (гибрид, 2026-08-16): сами цифры едут через AnimatedTextInput на
 * useAnimatedProps (закон №6 — никогда setState на каждый тик Text), а не
 * через JS-рендер строки на каждую секунду. Последние 6 часов «загораются»
 * — один микро-пульс SUITE.pulse и один hapticLightImpact в момент пересечения
 * порога (не на каждый тик), тон плашки уже тёплый через существующий `warn`.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, type TextProps } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { GIFT_EXPIRY_WARN_MS, giftCountdownLabel } from '../app/gift_expiry';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
import { SUITE } from '../constants/motionHybrid';
import { hapticLightImpact } from '../hooks/use-haptics';

// зачем: animatedProps типизирован только у Reanimated.createAnimatedComponent
// (см. RankChangeBanner.tsx) — обёртка над TextInput, не над Text, чтобы
// секундные цифры менялись на UI-потоке без setState/ре-рендера родителя.
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

/** Тёплая подсветка последних часов; в тон существующим акцентам наград. */
const WARN_COLOR = '#FB7185';
/** Тёмные аналоги для светлой темы: золото и красный на белом нечитаемы. */
const WARN_COLOR_LIGHT = '#B03A44';
const CALM_COLOR_LIGHT = '#5B5548';

const tone = (hex: string, alpha: string): string =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;

interface GiftExpiryCountdownProps {
  /** Мс сгорания подарка. */
  expiresAtMs: number;
  /** Акцент подарка — цвет пилюли в спокойном состоянии. */
  accent: string;
  /** Однократный колбэк при достижении нуля (родитель перезагружает список). */
  onExpired?: () => void;
  /**
   * Компактный угловой бейдж для плитки подарка: только часы («6ч»), без
   * иконки и без секунд. Полная строка чч:мм:сс на квадрате 118px не влезает.
   */
  compact?: boolean;
  testID?: string;
}

export default function GiftExpiryCountdown({
  expiresAtMs,
  accent,
  onExpired,
  compact = false,
  testID,
}: GiftExpiryCountdownProps) {
  const { lang } = useLang();
  const { themeMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const [msLeft, setMsLeft] = useState(() => Math.max(0, expiresAtMs - Date.now()));
  const expiredFiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const wasWarnRef = useRef(msLeft <= GIFT_EXPIRY_WARN_MS);

  // Текст плашки — shared value на UI-потоке; JS setState(msLeft) остаётся
  // (нужен для a11y-строки, цвета и порога warn), но САМИ цифры больше не
  // тянут родителя через рендер-дерево на каждую секунду.
  const displayText = useSharedValue(compact
    ? compactLabel(msLeft)
    : giftCountdownLabel(msLeft));
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Новый срок (перезагрузка данных) — сбрасываем «уже сгорел» и пересчитываем.
    expiredFiredRef.current = false;
    const fresh = Math.max(0, expiresAtMs - Date.now());
    setMsLeft(fresh);
    wasWarnRef.current = fresh <= GIFT_EXPIRY_WARN_MS;
  }, [expiresAtMs]);

  useFocusEffect(useCallback(() => {
    const tick = () => {
      const left = Math.max(0, expiresAtMs - Date.now());
      setMsLeft(left);
      displayText.value = compact ? compactLabel(left) : giftCountdownLabel(left);

      const nowWarn = left <= GIFT_EXPIRY_WARN_MS && left > 0;
      if (nowWarn && !wasWarnRef.current && !reduceMotion) {
        // Загорание: один микро-пульс + один хаптик — не на каждый тик,
        // а строго в момент пересечения порога «последние 6 часов».
        pulse.value = withSequence(withSpring(1.14, SUITE.pulse), withSpring(1, SUITE.pulse));
        void hapticLightImpact();
      }
      wasWarnRef.current = nowWarn;

      if (left <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpiredRef.current?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      cancelAnimation(pulse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAtMs, compact, reduceMotion]));

  const warn = msLeft <= GIFT_EXPIRY_WARN_MS;
  // зачем: владелец не смог прочитать таймер — цвет наследовался от акцента
  // подарка (эпик = золото #FFD700), и жёлтые цифры 10px на светло-жёлтой
  // плашке давали контраст ~1.3:1. На светлой теме акцент подарка для текста
  // не годится в принципе: берём тёмный спокойный тон, а «горит» — тёмно-красный.
  const isLight = isLightThemeMode(themeMode);
  const color = warn
    ? (isLight ? WARN_COLOR_LIGHT : WARN_COLOR)
    : (isLight ? CALM_COLOR_LIGHT : accent);
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
  // VoiceOver/TalkBack: цифры «71:59:59» не читаются — озвучиваем смысл.
  const a11yLabel = triLang(lang, {
    ru: `Подарок сгорит через ${hoursLeft} ч ${minutesLeft} мин`,
    uk: `Подарунок згорить через ${hoursLeft} год ${minutesLeft} хв`,
    es: `El regalo caduca en ${hoursLeft} h ${minutesLeft} min`,
    'pt-BR': `O presente expira em ${hoursLeft} h ${minutesLeft} min`,
    vi: `Quà sẽ hết hạn sau ${hoursLeft} giờ ${minutesLeft} phút`,
    id: `Hadiah hangus dalam ${hoursLeft} jam ${minutesLeft} menit`,
    tr: `Hediye ${hoursLeft} sa ${minutesLeft} dk içinde yanacak`,
    pl: `Prezent wygaśnie za ${hoursLeft} godz. ${minutesLeft} min`,
  });

  // Подложка бейджа непрозрачная: плитка под ним — картинка подарка,
  // на пёстрой иконке 12-процентная заливка не отделяет цифры от фона.
  const compactFill = isLight ? 'rgba(252,253,249,0.92)' : 'rgba(12,16,14,0.72)';

  const digitsAnimatedProps = useAnimatedProps<Partial<TextProps>>(() => ({
    text: displayText.value,
    defaultValue: displayText.value,
  } as Partial<TextProps>));
  const pillPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Reanimated.View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 0 : 4,
          borderRadius: 999,
          paddingHorizontal: compact ? 7 : 9,
          paddingVertical: compact ? 3 : 5,
          minWidth: compact ? 0 : 84,
          backgroundColor: compact ? compactFill : tone(color, '1F'),
        },
        pillPulseStyle,
      ]}
    >
      {compact ? null : <Ionicons name="time-outline" size={11} color={color} />}
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        animatedProps={digitsAnimatedProps as never}
        underlineColorAndroid="transparent"
        style={{
          color,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.4,
          fontVariant: ['tabular-nums'],
          padding: 0,
          margin: 0,
          minWidth: compact ? 22 : 56,
        }}
      />
    </Reanimated.View>
  );
}

/** Компактный бейдж плитки: «6ч» вместо «06:30:30» — на квадрате нет места,
 *  а точность до секунды там и не нужна (полный отсчёт живёт в модалке). */
function compactLabel(msLeft: number): string {
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
  return hoursLeft > 0 ? `${hoursLeft} ч` : `${minutesLeft} м`;
}

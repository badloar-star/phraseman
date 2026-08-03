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
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { GIFT_EXPIRY_WARN_MS, giftCountdownLabel } from '../app/gift_expiry';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';

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
  const [msLeft, setMsLeft] = useState(() => Math.max(0, expiresAtMs - Date.now()));
  const expiredFiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    // Новый срок (перезагрузка данных) — сбрасываем «уже сгорел» и пересчитываем.
    expiredFiredRef.current = false;
    setMsLeft(Math.max(0, expiresAtMs - Date.now()));
  }, [expiresAtMs]);

  useFocusEffect(useCallback(() => {
    const tick = () => {
      const left = Math.max(0, expiresAtMs - Date.now());
      setMsLeft(left);
      if (left <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpiredRef.current?.();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAtMs]));

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

  // Компактный бейдж плитки: «6ч» вместо «06:30:30» — на квадрате нет места,
  // а точность до секунды там и не нужна (полный отсчёт живёт в модалке).
  const compactText = hoursLeft > 0 ? `${hoursLeft} ч` : `${minutesLeft} м`;
  // Подложка бейджа непрозрачная: плитка под ним — картинка подарка,
  // на пёстрой иконке 12-процентная заливка не отделяет цифры от фона.
  const compactFill = isLight ? 'rgba(252,253,249,0.92)' : 'rgba(12,16,14,0.72)';

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : 4,
        borderRadius: 999,
        paddingHorizontal: compact ? 7 : 9,
        paddingVertical: compact ? 3 : 5,
        minWidth: compact ? 0 : 84,
        backgroundColor: compact ? compactFill : tone(color, '1F'),
      }}
    >
      {compact ? null : <Ionicons name="time-outline" size={11} color={color} />}
      <Text
        style={{
          color,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.4,
          fontVariant: ['tabular-nums'],
        }}
      >
        {compact ? compactText : giftCountdownLabel(msLeft)}
      </Text>
    </View>
  );
}

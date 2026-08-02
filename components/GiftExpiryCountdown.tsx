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
import { triLang } from '../constants/i18n';

/** Тёплая подсветка последних часов; в тон существующим акцентам наград. */
const WARN_COLOR = '#FB7185';

const tone = (hex: string, alpha: string): string =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;

interface GiftExpiryCountdownProps {
  /** Мс сгорания подарка. */
  expiresAtMs: number;
  /** Акцент подарка — цвет пилюли в спокойном состоянии. */
  accent: string;
  /** Однократный колбэк при достижении нуля (родитель перезагружает список). */
  onExpired?: () => void;
  testID?: string;
}

export default function GiftExpiryCountdown({
  expiresAtMs,
  accent,
  onExpired,
  testID,
}: GiftExpiryCountdownProps) {
  const { lang } = useLang();
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
  const color = warn ? WARN_COLOR : accent;
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

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 5,
        minWidth: 84,
        backgroundColor: tone(color, '1F'),
      }}
    >
      <Ionicons name="time-outline" size={11} color={color} />
      <Text
        style={{
          color,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.4,
          fontVariant: ['tabular-nums'],
        }}
      >
        {giftCountdownLabel(msLeft)}
      </Text>
    </View>
  );
}

/**
 * Бейдж остатка минут MAX на плитке быстрого старта главного экрана —
 * тот же язык, что EnergyCostBadge (снаружи угла кнопки, без обводки).
 *
 * зачем (владелец 2026-08-24): «в разделе MAX должен быть чёткий индикатор
 * сколько минут осталось на сегодня». Подпись мелким текстом под названием
 * плитки запрещена стилем владельца — поэтому число живёт бейджем на самой
 * иконке, а не вторым текстом рядом с «МАКС».
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';

interface MaxMinutesBadgeProps {
  /** Остаток дня в секундах; null пока не прочитан — бейдж не рисуется. */
  dayRemainingSec: number | null;
  lang: Lang;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function MaxMinutesBadge({ dayRemainingSec, lang, style, testID }: MaxMinutesBadgeProps) {
  const { theme: t } = useTheme();
  if (dayRemainingSec === null) return null;

  // Тот же порог, что и в dailyQuotaView.tone (<=60 сек: последняя минута —
  // тревога). Значения выравнены умышленно: тон бейджа и тон полосы одной
  // квоты не должны разъезжаться на границе.
  const minutes = Math.floor(Math.max(0, dayRemainingSec) / 60);
  const color = dayRemainingSec <= 60 ? t.wrong : t.textPrimary;
  // зачем (аудит 2026-08-24): было жёстко «м» — единственная не-русская
  // локаль, которую это задевало, физически видна на бейдже, не только в
  // accessibilityLabel, поэтому короткий суффикс тоже переведён.
  const label = triLang(lang, {
    ru: `${minutes}м`, uk: `${minutes}хв`, en: `${minutes}m`, es: `${minutes}m`, 'pt-BR': `${minutes}m`,
    vi: `${minutes}p`, id: `${minutes}m`, tr: `${minutes}dk`, pl: `${minutes}m`,
  });
  const a11yLabel = triLang(lang, {
    ru: `Осталось ${minutes} минут MAX на сегодня`,
    uk: `Залишилося ${minutes} хвилин MAX на сьогодні`,
    en: `${minutes} minutes of MAX left today`,
    es: `Quedan ${minutes} minutos de MAX hoy`,
    'pt-BR': `Restam ${minutes} minutos de MAX hoje`,
    vi: `Còn ${minutes} phút MAX hôm nay`,
    id: `Sisa ${minutes} menit MAX hari ini`,
    tr: `Bugün ${minutes} MAX dakikası kaldı`,
    pl: `Zostało dziś ${minutes} minut MAX`,
  });

  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[styles.badge, { backgroundColor: t.bgCard }, style]}
    >
      <Text maxFontSizeMultiplier={1.2} style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 30,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  label: {
    fontWeight: '900',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});

export default memo(MaxMinutesBadge);

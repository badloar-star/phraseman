// Weekly Boons — плашка «бонус сегодня» под полосой дней недели на главной.
//
// Персистентный (не модал) блок: emoji + заголовок + короткое описание бонуса дня.
// Сам читает текущий primary-бонус через движок, обновляется на смену remote-config
// и при возврате приложения на передний план (день/конфиг могли поменяться).

import React, { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { onAppEvent } from '../app/events';
import { getTodaysBoons } from '../app/boons/boon_engine';
import { getBoonCopy } from '../app/boons/boon_copy';
import type { BoonId } from '../app/boons/boon_types';

interface TodaysBoonStripProps {
  /** Доп. отступ сверху (по умолчанию 14, как у pulse-hint в карточке статистики). */
  marginTop?: number;
}

export default function TodaysBoonStrip({ marginTop = 14 }: TodaysBoonStripProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const [primary, setPrimary] = useState<BoonId | null>(() => getTodaysBoons().primary);

  useEffect(() => {
    const refresh = () => setPrimary(getTodaysBoons().primary);
    const sub = onAppEvent('remote_config_changed', refresh);
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, []);

  if (!primary) return null;

  const copy = getBoonCopy(primary, lang);

  return (
    <View
      accessibilityRole="text"
      style={{
        marginTop,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: `${t.accent}14`, // ~8% accent tint
        borderWidth: 1,
        borderColor: `${t.accent}33`,
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: 22 }}>
        {copy.emoji}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{ color: t.accent, fontSize: 14, fontWeight: '900', marginBottom: 2 }}
        >
          {copy.title}
        </Text>
        <Text
          allowFontScaling={false}
          numberOfLines={2}
          style={{ color: t.textSecond, fontSize: 12, fontWeight: '600', lineHeight: 16 }}
        >
          {copy.subtitle}
        </Text>
      </View>
    </View>
  );
}

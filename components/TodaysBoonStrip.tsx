// Weekly Boons — плашка «бонус сегодня» под полосой дней недели на главной.
//
// Персистентный (не модал) блок: DALL-E icon + заголовок + короткое описание бонуса дня.
// Сам читает текущий primary-бонус через движок, обновляется на смену remote-config
// и при возврате приложения на передний план (день/конфиг могли поменяться).

import React, { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { onAppEvent } from '../app/events';
import { getTodaysBoons } from '../app/boons/boon_engine';
import { getBoonCopy } from '../app/boons/boon_copy';
import type { BoonId } from '../app/boons/boon_types';
import { weeklyBoonIconSource } from '../constants/boonIconAssets';
import WeeklyBoonDetailModal from './WeeklyBoonDetailModal';

interface TodaysBoonStripProps {
  /** Доп. отступ сверху (по умолчанию 14, как у pulse-hint в карточке статистики). */
  marginTop?: number;
}

export default function TodaysBoonStrip({ marginTop = 14 }: TodaysBoonStripProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const [primary, setPrimary] = useState<BoonId | null>(() => getTodaysBoons().primary);
  const [detailOpen, setDetailOpen] = useState(false);

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
  const iconSource = weeklyBoonIconSource(primary, themeMode);

  const openDetail = () => {
    hapticTap();
    setDetailOpen(true);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={`${copy.title}. ${copy.subtitle}`}
        accessibilityLabel={copy.title}
        activeOpacity={0.85}
        onPress={openDetail}
        style={[styles.strip, {
          marginTop,
          backgroundColor: `${t.accent}14`,
          borderColor: `${t.accent}33`,
        }]}
      >
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.iconFrame}
        >
          <Image source={iconSource} resizeMode="contain" style={styles.iconImage} />
        </View>
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
        {/* Подсказка-шеврон: блок нажимается и раскрывает подробности. */}
        <Text
          allowFontScaling={false}
          style={{ color: t.accent, fontSize: 18, fontWeight: '900', opacity: 0.7, marginLeft: 2 }}
        >
          ›
        </Text>
      </TouchableOpacity>
      <WeeklyBoonDetailModal
        visible={detailOpen}
        boon={primary}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  strip: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconFrame: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconImage: {
    width: 50,
    height: 50,
  },
});

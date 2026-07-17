// Weekly Boons — плашка «бонус сегодня» под полосой дней недели на главной.
//
// Персистентный (не модал) блок: DALL-E icon + заголовок + короткое описание бонуса дня.
// Сам читает текущий primary-бонус через движок, обновляется на смену remote-config
// и при возврате приложения на передний план (день/конфиг могли поменяться).

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { onAppEvent } from '../app/events';
import { scheduleCoalescedForegroundTask } from '../app/app_resume_policy';
import { getTodaysBoons } from '../app/boons/boon_engine';
import { getBoonCopy, getMysteryChestClaimedSubtitle } from '../app/boons/boon_copy';
import { currentWeekId, MYSTERY_MONDAY_CLAIM_KEY } from '../app/boons/boon_rewards';
import type { BoonId } from '../app/boons/boon_types';
import { weeklyBoonIconSource } from '../constants/boonIconAssets';
import WeeklyBoonDetailModal from './WeeklyBoonDetailModal';

interface TodaysBoonStripProps {
  /** Доп. отступ сверху (по умолчанию 14, как у pulse-hint в карточке статистики). */
  marginTop?: number;
  /** Встраивает строку бонуса в общую градиентную поверхность статистики. */
  embedded?: boolean;
}

export default function TodaysBoonStrip({ marginTop = 14, embedded = false }: TodaysBoonStripProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const [primary, setPrimary] = useState<BoonId | null>(() => getTodaysBoons().primary);
  const [mysteryClaimed, setMysteryClaimed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const scheduledRefreshRef = React.useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    // «Сундук недели» уже забран на этой неделе? Читаем тот же claim-флаг, что пишет
    // MysteryMondayHost, — иначе плашка зовёт «открой и забери» после получения награды.
    const refreshClaimed = async () => {
      try {
        const stored = await AsyncStorage.getItem(MYSTERY_MONDAY_CLAIM_KEY);
        if (alive) setMysteryClaimed(stored === currentWeekId());
      } catch {
        if (alive) setMysteryClaimed(false);
      }
    };
    const refresh = () => {
      setPrimary(getTodaysBoons().primary);
      void refreshClaimed();
    };
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    // Сундук забрали в модалке прямо сейчас — обновить текст без перезахода в приложение.
    const claimedSub = onAppEvent('mystery_chest_claimed', refreshClaimed);
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        scheduledRefreshRef.current?.cancel();
        scheduledRefreshRef.current = scheduleCoalescedForegroundTask('todays_boon_strip_refresh', refresh);
      }
    });
    return () => {
      alive = false;
      sub.remove();
      claimedSub.remove();
      appStateSub.remove();
      scheduledRefreshRef.current?.cancel();
      scheduledRefreshRef.current = null;
    };
  }, []);

  if (!primary) return null;

  const copy = getBoonCopy(primary, lang);
  // Для «Сундука недели» после получения награды — текст «уже открыт», без зова к действию.
  const showClaimedSubtitle = primary === 'mystery_monday' && mysteryClaimed;
  const subtitle = showClaimedSubtitle ? getMysteryChestClaimedSubtitle(lang) : copy.subtitle;
  const iconSource = weeklyBoonIconSource(primary, themeMode);

  const openDetail = () => {
    hapticTap();
    setDetailOpen(true);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={`${copy.title}. ${subtitle}`}
        accessibilityLabel={copy.title}
        activeOpacity={0.85}
        onPress={openDetail}
        style={[styles.strip, embedded ? styles.embedded : {
          marginTop,
          backgroundColor: `${t.accent}14`,
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
            {subtitle}
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
        claimed={showClaimedSubtitle}
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
    borderWidth: 0,
  },
  embedded: {
    marginTop: 0,
    minHeight: 62,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    borderRadius: 0,
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

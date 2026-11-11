import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { captureAccountGeneration, isCurrentAccountGeneration } from '../../../app/account_generation';
import { decodeActiveDays } from '../../../app/friends_together/together_days';
import { readMyActiveDays } from '../../../app/friends_together/together_store';
import { getLocalDayKey } from '../../../app/local_date';
import { triLang } from '../../../constants/i18n';
import { streakWeekRowShort } from '../../../constants/streak_stats_i18n';
import { useActiveAccountOwner } from '../../../hooks/use_active_account_owner';
import { useLang } from '../../LangContext';
import { useTheme } from '../../ThemeContext';
import { auroraMaterialForTheme } from '../../../constants/aurora_material';
import HomeWeekCapsule from './HomeWeekCapsule';
import V2Pressable from '../../v2/V2Pressable';
import { homeWeekDays } from './home_week_days';
import { HOME_SCENE_INK } from './scene/home_scene_ink';

export type HomeWeekDotsProps = Readonly<{
  active: boolean;
  focusTick: number;
  todayCounted: boolean;
  onPress: () => void;
}>;

const EMPTY_DAYS: ReadonlySet<string> = new Set();

export default function HomeWeekDots({ active, focusTick, todayCounted, onPress }: HomeWeekDotsProps) {
  const { lang } = useLang();
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const owner = useActiveAccountOwner();
  const [history, setHistory] = useState<Readonly<{ owner: string; days: ReadonlySet<string> }> | null>(null);

  useEffect(() => {
    if (!active || !owner) return;
    const generation = captureAccountGeneration();
    let cancelled = false;
    void readMyActiveDays().then((days) => {
      if (!cancelled && isCurrentAccountGeneration(generation)) setHistory({ owner, days: decodeActiveDays(days) });
    });
    return () => { cancelled = true; };
  }, [active, owner, focusTick, todayCounted]);

  const countedDays = history && history.owner === owner ? history.days : EMPTY_DAYS;
  const days = homeWeekDays(getLocalDayKey(), countedDays, todayCounted);
  const labels = streakWeekRowShort(lang);
  const count = days.filter((day) => day.counted).length;
  const statsLabel = triLang(lang, {
    ru: 'Статистика серии', uk: 'Статистика серії', en: 'Streak statistics', es: 'Estadísticas de la racha',
    'pt-BR': 'Estatísticas da sequência', vi: 'Thống kê chuỗi ngày', id: 'Statistik rentetan', tr: 'Seri istatistikleri', pl: 'Statystyki serii',
  });

  // зачем (владелец 11.11, макет aurora_rassvet.html утверждён «1 в 1»): на сцене «Рассвет» блок дней — стеклянная капсула шире текста, с цепочкой серии и зажиганием огонька; у остальных тем — прежние кружки
  const aurora = auroraMaterialForTheme(liquidGlassThemeId, liquidGlassAppearance);
  if (aurora) {
    return (
      <View style={styles.capsuleSlot}>
        <HomeWeekCapsule days={days} labels={labels} scene={aurora.scene} active={active} accessibilityLabel={statsLabel} onPress={onPress} />
      </View>
    );
  }
  return (
    <V2Pressable
      testID="home-week-dots"
      accessibilityRole="button"
      accessibilityLabel={statsLabel}
      accessibilityValue={{ min: 0, max: 7, now: count }}
      onPress={onPress}
      style={styles.row}
    >
      {days.map((day, index) => (
        <View key={day.date} style={styles.day}>
          <View style={[styles.dot, {
            borderColor: day.counted || day.isToday ? HOME_SCENE_INK.text : HOME_SCENE_INK.muted,
            backgroundColor: day.counted ? HOME_SCENE_INK.text : 'transparent',
          }]} />
          <Text style={[styles.label, { color: day.isToday ? HOME_SCENE_INK.text : HOME_SCENE_INK.muted }]}>{labels[index]}</Text>
        </View>
      ))}
    </V2Pressable>
  );
}

const styles = StyleSheet.create({
  capsuleSlot: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 8, paddingVertical: 4 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  label: { fontSize: 13, textAlign: 'center' },
});

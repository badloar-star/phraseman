// зачем: владелец — плашка «Сезон» на главной в полотне «Сегодня», под «Целью лиги»,
// в том же формате строки (иконка 64 + заголовок + прогресс), открывает экран сезона.
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import { FlowText } from './text-integrity/FlowText';
import {
  hydrateSeasonPassProgress,
  peekSeasonPassProgress,
  SEASON_PASS_LEVELS,
  type SeasonPassProgress,
} from '../app/season_pass_model';
import { hapticTap } from '../hooks/use-haptics';

// TODO(Кодекс): заменить на тематические иконки сезона (по одной на тему,
// как menuImages) — промпт передан владельцу, генерация вне этой сессии.
const SEASON_ICON = require('../assets/images/season/reward_chest.webp');

interface Props {
  lang: Lang;
  panelTextColor: string;
  panelMutedColor: string;
  accentColor: string;
  trackColor: string;
  hairlineColor: string;
}

export function SeasonPassTodayCard({ lang, panelTextColor, panelMutedColor, accentColor, trackColor, hairlineColor }: Props) {
  const router = useRouter();
  // Мгновенный первый кадр из синхронного кэша; гидрация и события догоняют фоном.
  const [progress, setProgress] = useState<SeasonPassProgress>(peekSeasonPassProgress);

  useEffect(() => {
    let alive = true;
    hydrateSeasonPassProgress().then((p) => { if (alive) setProgress(p); });
    const sub = onAppEvent('season_pass_xp_changed', () => {
      if (alive) setProgress(peekSeasonPassProgress());
    });
    return () => { alive = false; sub.remove(); };
  }, []);

  const pct = progress.levelCostXp > 0
    ? Math.min(100, Math.round((progress.intoLevelXp / progress.levelCostXp) * 100))
    : 100;

  return (
    <>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: hairlineColor }} />
      <TouchableOpacity
        testID="home-season-pass-open"
        activeOpacity={0.82}
        accessibilityRole="button"
        onPress={() => { hapticTap(); router.push('/season_pass'); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 72 }}
      >
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Image source={SEASON_ICON} style={{ width: 56, height: 56 }} resizeMode="contain" accessible={false} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FlowText testID="home-season-pass-title" provenance="authored" style={{ flex: 1, color: panelTextColor, fontSize: 15, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Сезон',
                uk: 'Сезон',
                es: 'Temporada',
                'pt-BR': 'Temporada',
                vi: 'Mùa giải',
                id: 'Musim',
                tr: 'Sezon',
                pl: 'Sezon',
              })}
            </FlowText>
            <Text /* guard-ok: индикатор уровня СПРАВА в строке заголовка (как 9/60 у «Вызовов дня»), не подпись под названием */ style={{ color: panelMutedColor, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {Math.min(progress.level, SEASON_PASS_LEVELS)}/{SEASON_PASS_LEVELS}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 5, overflow: 'hidden', backgroundColor: trackColor }}>
            <View style={{ height: '100%', width: `${pct}%`, borderRadius: 5, backgroundColor: accentColor }} />
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

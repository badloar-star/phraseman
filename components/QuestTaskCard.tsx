/**
 * QuestTaskCard — пульсирующая плашка «Задание» на Главной.
 *
 * зачем (владелец, 2026-08-31): задание, назначенное из админки, должно
 * бросаться в глаза, но не кричать — поэтому пульсирует не цвет, а мягкий
 * ореол за карточкой (дыхание, а не мигание).
 *
 * Стиль повторяет SurveyTaskCard: тон вместо обводок, скругление 20, PressableHybrid.
 * Геометрия первого кадра равна финальной (Performance Bible: никаких скачков).
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { themeUiAsset } from '../app/theme_ui_assets';
import { pearlIconForTheme } from '../app/coin_icons';
import type { QuestReward, QuestSnapshot } from '../app/quests_client';
import { triLang } from '../constants/i18n';
import { useLang } from './LangContext';
import PressableHybrid from './PressableHybrid';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';

const ICON_SIZE = 56;
const REWARD_ICON = 20;

export type QuestTaskCardProps = Readonly<{
  quest: QuestSnapshot;
  onOpen: (quest: QuestSnapshot) => void;
}>;

/** Иконка вида награды. Ассеты общие с шапкой и кошельками — один источник. */
export function questRewardIcon(kind: QuestReward['kind'], themeMode: Parameters<typeof themeUiAsset>[0]) {
  switch (kind) {
    case 'pearls': return pearlIconForTheme(themeMode);
    case 'runes': return themeUiAsset(themeMode, 'rune');
    case 'spins': return themeUiAsset(themeMode, 'spinTicket');
    case 'energy_full': return themeUiAsset(themeMode, 'energy');
    case 'freeze': return themeUiAsset(themeMode, 'streakIce');
    default: return null;
  }
}

function QuestTaskCard({ quest, onOpen }: QuestTaskCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;

  const ready = quest.phase === 'ready';

  // Дыхание ореола. Под Reduce Motion — статичный ореол без цикла: сигнал
  // «тут новое» остаётся, движение исчезает.
  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(ready ? 1 : 0.45);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: ready ? 900 : 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: ready ? 900 : 1600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion, ready]);

  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: ready ? [0.16, 0.42] : [0.08, 0.24] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  const readyLabel = triLang(lang, {
    ru: 'Награда ждёт', uk: 'Нагорода чекає', en: 'Reward is waiting',
    es: 'La recompensa te espera', 'pt-BR': 'A recompensa espera',
    vi: 'Phần thưởng đang chờ', id: 'Hadiah menunggu',
    tr: 'Ödül seni bekliyor', pl: 'Nagroda czeka',
  });
  const questLabel = triLang(lang, {
    ru: 'Задание', uk: 'Завдання', en: 'Quest', es: 'Misión',
    'pt-BR': 'Missão', vi: 'Nhiệm vụ', id: 'Misi', tr: 'Görev', pl: 'Zadanie',
  });

  const progressPct = quest.target > 0
    ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
    : 0;
  const showProgress = quest.target > 1 && !ready;

  // Узкий экран — прячем превью наград, чтобы заголовок не сжимался.
  const showRewards = width >= 340;

  const a11yLabel = `${questLabel}: ${quest.title}. ${ready ? readyLabel : `${quest.progress} ${triLang(lang, { ru: 'из', uk: 'з', en: 'of', es: 'de', 'pt-BR': 'de', vi: 'trên', id: 'dari', tr: '/', pl: 'z' })} ${quest.target}`}`;

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            backgroundColor: ready ? t.accent : t.bgCard,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <PressableHybrid
        testID="quest-task-card"
        variant="card"
        onPress={() => onOpen(quest)}
        accessibilityLabel={a11yLabel}
        contentStyle={[styles.card, { backgroundColor: t.bgCard }]}
      >
        <View style={[styles.iconWell, { backgroundColor: ready ? t.accent : t.bgSurface }]}>
          <Ionicons
            name={ready ? 'gift' : 'flag'}
            size={26}
            color={ready ? t.correctText : t.accent}
            accessible={false}
          />
        </View>

        <View style={styles.copy}>
          <Text
            testID="quest-task-title"
            style={[styles.title, { color: t.textOnCard, fontSize: Math.max(15, f.body) }]}
            numberOfLines={2}
          >
            {quest.title}
          </Text>
          {showProgress ? (
            <View style={[styles.track, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.fill, { width: `${progressPct}%`, backgroundColor: t.accent }]} />
            </View>
          ) : null}
          {ready ? (
            <Text style={[styles.ready, { color: t.accent, fontSize: f.label }]}>{readyLabel}</Text>
          ) : null}
        </View>

        {showRewards ? (
          <View style={styles.rewards}>
            {quest.rewards.slice(0, 2).map((reward, index) => {
              const icon = questRewardIcon(reward.kind, themeMode);
              return (
                <View key={`${reward.kind}-${index}`} style={styles.rewardChip}>
                  {icon ? (
                    <Image source={icon} style={styles.rewardIcon} contentFit="contain" accessible={false} />
                  ) : (
                    <Ionicons name="star" size={REWARD_ICON} color={t.accent} accessible={false} />
                  )}
                  <Text style={[styles.rewardValue, { color: t.textPrimary, fontSize: f.label }]}>
                    {reward.kind === 'plus_days' ? `${reward.amount}д` : `+${reward.amount}`}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </PressableHybrid>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 8, marginBottom: 12 },
  halo: {
    position: 'absolute',
    left: 6, right: 6, top: 4, bottom: 4,
    borderRadius: 24,
  },
  card: {
    minHeight: 72,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWell: {
    width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontWeight: '800', lineHeight: 21 },
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  ready: { fontWeight: '800' },
  rewards: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  rewardChip: { alignItems: 'center', gap: 2 },
  rewardIcon: { width: REWARD_ICON, height: REWARD_ICON },
  rewardValue: { fontWeight: '800', fontVariant: ['tabular-nums'] /* guard-ok: числовая награда */ },
});

export default memo(QuestTaskCard);

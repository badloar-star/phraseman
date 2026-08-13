import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useLang } from '../LangContext';
import { V2Card } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { arenaText } from '../../modules/arena/copy';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { ArenaHubModel } from '../../modules/arena/hub_view';

/**
 * Живая часть главного экрана Арены.
 *
 * Владелец (D-31): экран должен быть живым и информативным, а не списком
 * ссылок. Список ссылок не меняется — игрок видит одно и то же в понедельник и
 * в пятницу и перестаёт открывать.
 *
 * Здесь только отрисовка; модель собирает `modules/arena/hub_view.ts`.
 */

const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;
const ROMAN = ['', 'I', 'II', 'III'] as const;

function RankBar({ progress, reduceMotion }: { progress: number; reduceMotion: boolean }) {
  const P = useTournamentPalette();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = reduceMotion
      ? progress
      : withDelay(160, withSpring(progress, { damping: 18, stiffness: 120 }));
  }, [progress, reduceMotion, width]);
  const style = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, width.value)) * 100}%`,
  }));
  return (
    <View style={[styles.track, { backgroundColor: P.elev2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: P.accent }, style]} />
    </View>
  );
}

export function ArenaHubLive({ model }: { model: ArenaHubModel }) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();

  return (
    <>
      {/* Где я стою */}
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(280)}>
        <V2Card pad={16} style={styles.card}>
          <View style={styles.rankHead}>
            <Text style={[styles.rankName, { color: P.text }]}>
              {arenaText(lang, TIER_COPY[model.rank.tierIndex])} · {ROMAN[model.rank.division]}
            </Text>
            <Text style={[styles.rp, { color: P.muted }]}>{model.rank.rp}</Text>
          </View>
          {model.rank.top ? (
            <Text style={[styles.meta, { color: P.gold }]}>{arenaText(lang, 'rankTop')}</Text>
          ) : (
            <>
              <RankBar progress={model.rank.progress} reduceMotion={reduceMotion} />
              <Text style={[styles.meta, { color: P.muted }]}>
                {arenaText(lang, 'rankProgress')}: {model.rank.rpToNextRank}
              </Text>
            </>
          )}
        </V2Card>
      </Animated.View>

      {/* Чем кончился прошлый матч */}
      {model.lastMatch ? (
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(70).duration(280)}>
          <V2Card pad={14} style={styles.rowCard}>
            <View
              style={[styles.dot, {
                backgroundColor: model.lastMatch.outcome === 'win' ? P.accent
                  : model.lastMatch.outcome === 'loss' ? P.danger : P.elev2,
              }]}
            />
            <View style={styles.copy}>
              <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'hubLastMatch')}</Text>
              <Text style={[styles.value, { color: P.text }]}>
                {arenaText(lang, model.lastMatch.outcome === 'win' ? 'victory'
                  : model.lastMatch.outcome === 'loss' ? 'defeat' : 'draw')}
              </Text>
            </View>
            {/* Серия показывается только когда она есть: «серия 0» — не новость. */}
            {model.streak > 0 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={16} color={P.gold} />
                <Text style={[styles.value, { color: P.gold }]}>{model.streak}</Text>
              </View>
            ) : null}
          </V2Card>
        </Animated.View>
      ) : null}

      {/* Кто рядом. Окно вокруг своей строки, а не верхушка таблицы. */}
      {model.friends.length ? (
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(120).duration(280)}>
          <V2Card pad={14} style={styles.card}>
            <Text style={[styles.label, { color: P.muted }]}>{arenaText(lang, 'hubNearYou')}</Text>
            {model.friends.map((row) => (
              <View key={row.stableUid} style={styles.friendRow}>
                <Text style={[styles.place, { color: P.muted }]}>{row.place}</Text>
                <Text style={[styles.value, { color: row.you ? P.accent : P.text, flex: 1 }]}>
                  {row.you ? arenaText(lang, 'you') : arenaText(lang, TIER_COPY[Math.min(7, Math.floor(row.rating / 300))])}
                </Text>
                <Text style={[styles.value, { color: P.text }]}>{row.rating}</Text>
              </View>
            ))}
          </V2Card>
        </Animated.View>
      ) : null}

      {/* Сколько живых игроков ищет прямо сейчас. */}
      {model.searchingNow !== null && model.searchingNow > 0 ? (
        <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(160).duration(280)}>
          <V2Card pad={12} style={styles.rowCard}>
            <Ionicons name="search" size={18} color={P.accent} />
            <Text style={[styles.value, { color: P.text, flex: 1 }]}>
              {arenaText(lang, 'hubSearchingNow')}
            </Text>
            <Text style={[styles.value, { color: P.accent }]}>{model.searchingNow}</Text>
          </V2Card>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rankName: { fontSize: 22, fontWeight: '900' },
  rp: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  meta: { fontSize: 13, fontWeight: '700' },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  copy: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '800' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  place: { width: 22, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

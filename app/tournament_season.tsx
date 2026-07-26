// ═══════════════════════════════════════════════════════════════════════════
// tournament_season.tsx — недельный сезон (макеты 21-23).
//
// зачем: удержание между турнирами. Лидерборд недели, отсчёт до сброса
// (красный за 3 часа) и тиры наград. Своя строка подсвечена и всегда видна.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// зачем: голый router.back() крашит Android/Fabric при teardown — тот же контракт,
// что и в shards_shop.tsx/tournaments.tsx, используем везде, где есть кнопка «назад».
import { safeRouterBack } from './navigation_back';
import TapScale from '../components/TapScale';
import AvatarView from '../components/AvatarView';
import { Card } from '../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../components/tournament/TournamentCountdown';
import { T, placeColor, radius, type, useTournamentPalette, type TournamentPalette} from '../components/tournament/tournament_theme';

type SeasonRow = {
  id: number;
  name: string;
  avatarIndex: number;
  color: string;
  points: number;
  isYou?: boolean;
};

// зачем: раньше здесь были эмодзи-«аватары» лидеров (👑⚔️🐺…) с хардкод-хексами —
// правило владельца запрещает эмодзи-аватары; цвета берутся из общих T.leader*
// токенов режима (components/tournament/tournament_theme.ts), а аватар — из
// approved AvatarView (те же ассеты, что в лигах/друзьях).
/** TODO(server): придёт из недельного рейтинга (tournamentSeasons). */
const SEASON_ROWS: SeasonRow[] = [
  { id: 1, name: 'КубокБарон', avatarIndex: 7, color: T.leaderCrown, points: 412 },
  { id: 2, name: 'МолнияPRO', avatarIndex: 5, color: T.leaderSword, points: 388 },
  { id: 3, name: 'СловоЖора', avatarIndex: 3, color: T.leaderWolf, points: 341 },
  { id: 4, name: 'Полиглот_77', avatarIndex: 2, color: T.leaderGlobe, points: 305 },
  { id: 5, name: 'IdiomHunter', avatarIndex: 6, color: T.leaderBow, points: 289 },
  { id: 6, name: 'Вы', avatarIndex: 4, color: T.leaderFox, points: 265, isYou: true },
  { id: 7, name: 'Фразочкина', avatarIndex: 8, color: T.leaderOwl, points: 240 },
  { id: 8, name: 'VerbaVolt', avatarIndex: 1, color: T.leaderBolt, points: 228 },
];

export default function TournamentSeasonScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  // зачем: экран пушится из tournaments.tsx («Сезон» card), но своей кнопки
  // «назад» не было — трапит пользователя. Паттерн 1:1 как на tournaments.tsx.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/tournaments' as any), [router]);
  // Отсчёт до сброса недели.
  const secondsToReset = useCountdown(2 * 3600 + 41 * 60);
  const urgent = secondsToReset <= 3 * 3600;

  const myRow = SEASON_ROWS.find((row) => row.isYou);
  const myPlace = myRow ? SEASON_ROWS.indexOf(myRow) + 1 : 0;
  const toTop5 = myPlace > 5 && myRow
    ? (SEASON_ROWS[4]?.points ?? 0) - myRow.points + 1
    : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* зачем: экран открывался только пушем без выхода — добавлена кнопка
            «назад», паттерн 1:1 как в shards_shop.tsx/tournaments.tsx. */}
        <View style={styles.header}>
          <TapScale
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={P.text} />
          </TapScale>
          <Text style={styles.title}>Сезон</Text>
        </View>

        {/* Отсчёт до сброса */}
        <Card tone="elev" pad={22}>
          <Text style={[styles.resetKicker, urgent && { color: P.danger }]}>
            {urgent ? 'Сезон почти закончился' : 'До конца сезона'}
          </Text>
          <View style={styles.resetTimer}>
            <TimeLeft seconds={secondsToReset} size={44} color={urgent ? P.danger : P.text} />
          </View>
          {toTop5 > 0 ? (
            <Text style={styles.resetHint}>До топ-5 осталось {toTop5} очков</Text>
          ) : null}
        </Card>

        {/* Лидерборд */}
        <View style={styles.list}>
          {SEASON_ROWS.map((row, index) => (
            <Animated.View
              key={row.id}
              entering={FadeInDown.delay(index * 40).duration(240)}
            >
              <SeasonRowItem row={row} place={index + 1} />
            </Animated.View>
          ))}
        </View>

        {/* зачем: секция «Награды недели» убрана — перечисленные призы (рамка
            чемпиона, титулы, 💎) не подкреплены реальной серверной системой
            начисления наград. Убираем рендер, чтобы не обещать то, чего нет,
            до появления настоящего бэкенда наград. */}
      </ScrollView>
    </View>
  );
}

const SeasonRowItem = memo(function SeasonRowItem({
  row, place,
}: { row: SeasonRow; place: number }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  return (
    <View style={[styles.row, row.isYou && styles.rowYou]}>
      <Text style={[styles.place, { color: placeColor(place, P) }]} allowFontScaling={false}>
        {place}
      </Text>
      <View style={[styles.avatar, { backgroundColor: `${row.color}33` }]}>
        <AvatarView avatar={String(row.avatarIndex)} size={28} animateAura={false} />
      </View>
      <Text style={[styles.name, row.isYou && { color: P.accent }]} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={styles.points} allowFontScaling={false}>{row.points}</Text>
    </View>
  );
});

const makeStyles = (P: TournamentPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: P.text },

  resetKicker: {
    ...type.label,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: P.muted,
    textAlign: 'center',
  },
  resetTimer: { marginTop: 10 },
  resetHint: { ...type.body, color: P.muted, textAlign: 'center', marginTop: 10 },

  list: { gap: 8 },
  row: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: P.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  rowYou: { backgroundColor: P.accentSoft },
  place: { width: 22, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  avatar: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: P.text },
  points: {
    fontSize: 17,
    fontWeight: '900',
    color: P.text,
    fontVariant: ['tabular-nums'],
  },
});

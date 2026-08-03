// ═══════════════════════════════════════════════════════════════════════════
// tournament_season.tsx — недельный сезон (макеты 21-23).
//
// зачем: удержание между турнирами. Лидерборд недели, отсчёт до сброса
// (красный за 3 часа) и тиры наград. Своя строка подсвечена и всегда видна.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
// зачем: allowFontScaling={false} отключал системный размер шрифта — текст
// обрезался при крупном шрифте. FlowText переносит вместо обрезки.
import { FlowText } from '../components/text-integrity';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useRuntimeActive } from '../hooks/use_runtime_active';
// зачем: голый router.back() крашит Android/Fabric при teardown — тот же контракт,
// что и в shards_shop.tsx/tournaments.tsx, используем везде, где есть кнопка «назад».
import { safeRouterBack } from './navigation_back';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TapScale from '../components/TapScale';
import AvatarView from '../components/AvatarView';
import UnifiedPlayerModal, { type PlayerInfo } from '../components/PlayerProfileModal';
import { Card } from '../components/tournament/tournament_ui';
import { TimeLeft, useCountdown } from '../components/tournament/TournamentCountdown';
import {
  loadSeasonStandings,
  loadWeeklyBankInfo,
  peekSeasonStandings,
  tournamentNow,
  weeklyBankPayoutAtMs,
  type SeasonEntry,
  type SeasonStandings,
} from './tournament_client';
import { placeColor, radius, type, useTournamentPalette, type TournamentPalette} from '../components/tournament/tournament_theme';

/**
 * зачем 2026-07-27: экран показывал ВЫДУМАННЫЙ топ-8 (КубокБарон, МолнияPRO…)
 * с фальшивым «вы — 6 место», пока банк недели сервер раздаёт по РЕАЛЬНЫМ
 * очкам из tournamentSeasons. Игрок видел одно, а деньги уходили другим.
 * Теперь строки приходят с сервера; аватар берём из профиля, а если сервер его
 * не записал — из детерминированной подстановки по uid, чтобы список не был
 * безликим и не «прыгал» между заходами.
 */
const AVATAR_POOL = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

function avatarFor(entry: SeasonEntry): string {
  if (entry.avatar) return entry.avatar;
  let hash = 0;
  for (let i = 0; i < entry.uid.length; i += 1) hash = (hash * 31 + entry.uid.charCodeAt(i)) >>> 0;
  return AVATAR_POOL[hash % AVATAR_POOL.length];
}

export default function TournamentSeasonScreen() {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const tournamentSeasonRuntimeActive = useRuntimeActive();
  // зачем: экран пушится из tournaments.tsx («Сезон» card), но своей кнопки
  // «назад» не было — трапит пользователя. Паттерн 1:1 как на tournaments.tsx.
  const goBack = useCallback(() => safeRouterBack(router, '/(tabs)/tournaments' as any), [router]);

  // Первый кадр — из общего кэша рейтинга (его же читает хаб), без «пусто → прыжок».
  const [standings, setStandings] = useState<SeasonStandings | null>(() => peekSeasonStandings());
  const [loaded, setLoaded] = useState(() => peekSeasonStandings() !== null);

  useEffect(() => {
    let alive = true;
    void loadSeasonStandings().then((value) => {
      if (!alive) return;
      if (value) setStandings(value);
      setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    // зачем: этот же вызов синхронизирует часы сервера (serverNowMs). Экран
    // сезона можно открыть напрямую, минуя хаб, — без него таймер считал бы от
    // часов устройства. Из кэша (30 мин) чтения обычно не будет вовсе.
    void loadWeeklyBankInfo().catch(() => {});
    return () => { alive = false; };
  }, []);

  // Отсчёт до РЕАЛЬНОЙ раздачи банка (пн 00:10 UTC), а не до выдуманной константы.
  const secondsToReset = useCountdown(
    // От часов СЕРВЕРА: при сбитых часах устройства отсчёт врал бы так же.
    Math.max(0, Math.round((weeklyBankPayoutAtMs(tournamentNow()) - tournamentNow()) / 1000)),
    tournamentSeasonRuntimeActive,
  );
  const urgent = secondsToReset <= 3 * 3600;

  /**
   * Карточка игрока по тапу (владелец 2026-07-27).
   *
   * Данные берём из УЖЕ загруженной строки рейтинга — сервер кладёт туда
   * аватар, рамку, опыт и серию при финализации турнира. Поэтому карточка
   * открывается мгновенно и не стоит ни одного чтения на тап.
   */
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [myProfile, setMyProfile] = useState<{ name: string; avatar: string; frame: string; totalXP: number }>(
    () => ({ name: 'Я', avatar: '1', frame: '', totalXP: 0 }),
  );

  useEffect(() => {
    // Свой профиль — из локального снимка, без сети: он нужен карточке лишь
    // для сравнения «вы против него».
    let alive = true;
    void AsyncStorage.multiGet(['user_name', 'user_avatar', 'user_frame', 'user_total_xp'])
      .then((pairs: readonly (readonly [string, string | null])[]) => {
        if (!alive) return;
        const map = new Map(pairs.map(([key, value]) => [key, value ?? '']));
        setMyProfile({
          name: (map.get('user_name') ?? '').trim() || 'Я',
          avatar: (map.get('user_avatar') ?? '').trim() || '1',
          frame: (map.get('user_frame') ?? '').trim(),
          totalXP: Number(map.get('user_total_xp') ?? 0) || 0,
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const openPlayer = useCallback((entry: SeasonEntry) => {
    setSelectedPlayer({
      name: entry.name,
      // points у карточки — это опыт игрока, а не очки недели: она рисует
      // уровень. Очки недели там были бы бессмыслицей (25 XP = 1 уровень).
      points: entry.totalXp ?? 0,
      totalXp: entry.totalXp ?? 0,
      isMe: false,
      uid: entry.uid,
      avatar: avatarFor(entry),
      frame: entry.frame,
      streak: entry.hotStreak ?? null,
    });
  }, []);
  const closePlayer = useCallback(() => setSelectedPlayer(null), []);

  const rows = standings?.top ?? [];
  const me = standings?.me ?? null;
  const myPlace = standings?.myPlace ?? 0;
  // Моя строка закрепляется отдельно, только если я не попал в показанный верх.
  const pinnedMe = me && myPlace === 0 ? me : null;
  // Сколько очков до призовой тройки — единственная цифра, которая реально мотивирует.
  const thirdPoints = rows[2]?.points ?? 0;
  const toPrize = me && myPlace > 3 && thirdPoints > me.points
    ? thirdPoints - me.points + 1
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
          {toPrize > 0 ? (
            <Text style={styles.resetHint}>До призовой тройки — {toPrize} очков</Text>
          ) : null}
        </Card>

        {/* Лидерборд. Первые три места — призовые: банк недели делится 60/25/15. */}
        {rows.length > 0 ? (
          <View style={styles.list}>
            {rows.map((row, index) => (
              <Animated.View
                key={row.uid}
                entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(240)}
              >
                <SeasonRowItem
                  row={row}
                  place={index + 1}
                  isYou={row.uid === me?.uid}
                  // Свою строку открывать незачем — это профиль игрока, а не свой.
                  onPress={row.uid === me?.uid ? undefined : openPlayer}
                />
              </Animated.View>
            ))}
          </View>
        ) : loaded ? (
          // зачем: боты в недельный рейтинг не попадают (сервер отсекает их в
          // computePlacements), поэтому в начале недели таблица ЧЕСТНО пуста.
          // Пустое состояние обязано учить интерфейсу, а не говорить «пусто».
          <Card tone="elev" pad={22}>
            <FlowText testID="season-empty-title" provenance="authored" style={styles.emptyTitle}>Неделя только началась</FlowText>
            <Text style={styles.emptyText}>
              Таблица пока пустая — и это ваш шанс. Сыграйте турнир, и ваше имя
              окажется здесь первым.
            </Text>
            <TapScale
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="К турнирам"
              style={styles.emptyCta}
            >
              <FlowText testID="season-empty-cta" provenance="authored" style={styles.emptyCtaText}>К турнирам</FlowText>
            </TapScale>
          </Card>
        ) : (
          // Скелетон с зарезервированной геометрией: первый кадр = финальный.
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.rowSkeleton} />
            ))}
          </View>
        )}

        {/* Моя строка закреплена, если я ниже показанного верха: игрок всегда
            видит себя, не прокручивая таблицу до конца. */}
        {pinnedMe ? (
          <View style={styles.pinnedWrap}>
            <SeasonRowItem row={pinnedMe} place={0} isYou />
          </View>
        ) : null}
      </ScrollView>

      {/* Карточка игрока по тапу — тот же компонент, что в друзьях и лигах. */}
      <UnifiedPlayerModal
        player={selectedPlayer}
        myInfo={{
          name: myProfile.name,
          avatar: myProfile.avatar,
          frame: myProfile.frame,
          totalXP: myProfile.totalXP,
          streak: null,
        }}
        onClose={closePlayer}
      />
    </View>
  );
}

const SeasonRowItem = memo(function SeasonRowItem({
  row, place, isYou, onPress,
}: { row: SeasonEntry; place: number; isYou?: boolean; onPress?: (row: SeasonEntry) => void }) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const handlePress = useCallback(() => onPress?.(row), [onPress, row]);
  const accessibilityLabel =
    // Читалке нужна связная фраза: колонки по отдельности звучат как набор цифр.
    `${place > 0 ? `Место ${place}. ` : ''}${isYou ? 'Вы' : row.name}, ${row.points} очков${onPress ? '. Открыть карточку' : ''}`;

  // зачем 2026-07-27: строка РИСУЕТСЯ этим View, а не самим TapScale. TapScale
  // кладёт детей в свой внутренний Animated.View и вешает style только на
  // внешний Pressable — при `Row = TapScale` флекс-стили строки до колонок не
  // доходили, и место/аватар/имя/очки выстраивались в столбик, вылезая за
  // карточку высотой 56 (сломанный экран сезона у владельца).
  const body = (
    <View style={[styles.row, isYou && styles.rowYou]}>
      {/* Место вне показанного верха неизвестно точно — ставим тире, не выдумываем номер. */}
      <FlowText testID="season-row-place" provenance="authored" style={[styles.place, { color: placeColor(place, P) }]}>
        {place > 0 ? place : '—'}
      </FlowText>
      <View style={styles.avatar}>
        <AvatarView avatar={avatarFor(row)} size={28} animateAura={false} />
      </View>
      {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- ник в строке рейтинга: перенос сломал бы фиксированную высоту ряда (карточка 56) */}
      <Text style={[styles.name, isYou && { color: P.accent }]} numberOfLines={1}>
        {isYou ? 'Вы' : row.name}
      </Text>
      <FlowText testID="season-row-points" provenance="authored" style={styles.points}>{row.points}</FlowText>
    </View>
  );

  // зачем 2026-07-27 (владелец): «по игрокам можно нажимать и открывать их
  // карточку». Данные уже в row, поэтому карточка открывается мгновенно —
  // без запроса на каждый тап.
  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }

  return (
    <TapScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Широкая строка: 0.88 по умолчанию — рывок. 0.97 читается как нажатие,
      // тот же масштаб, что у крупных карточек режима.
      scaleTo={0.97}
    >
      {body}
    </TapScale>
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
  // Скелетон повторяет высоту строки — первый кадр равен финальному.
  rowSkeleton: { height: 56, borderRadius: radius.md, backgroundColor: P.card, opacity: 0.5 },
  emptyTitle: { ...type.section, color: P.text, textAlign: 'center' },
  emptyText: { ...type.body, color: P.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyCta: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    backgroundColor: P.accentSoft,
  },
  emptyCtaText: { ...type.body, fontWeight: '700', color: P.accent },
  // Отбивка закреплённой строки — тоном и отступом, без разделительной линии.
  pinnedWrap: { marginTop: 6 },
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

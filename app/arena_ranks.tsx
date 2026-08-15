import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaHubChrome } from '../components/arena/ArenaHubChrome';
import { V2Card } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaRankScreen, type ArenaTierRow } from '../modules/arena/rank_view';
import { arenaTierRewardLadder } from '../modules/arena/tier_rewards';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arenaKnowsValue, arenaLoadState } from '../modules/arena/load_state';
import { arenaLoadHomeWarm, arenaPeekHomeWarm, arenaRememberHomeWarm } from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { arenaV2FriendsBoard, arenaV2Home, type ArenaFriendsBoardRow } from './arena_client';

/**
 * Экран рангов.
 *
 * Владелец (D-04): вместо плоского списка на 48 строк — человеческий экран.
 * Плоский список плох не длиной, а тем, что не отвечает ни на один вопрос,
 * который игрок задаёт, глядя на ранг: сколько мне до следующего деления, цел
 * ли щит, иду ли я в серии и сколько в ней осталось, какой тир уже забран
 * насовсем.
 *
 * Считает всё `modules/arena/rank_view.ts` — экран только рисует.
 */

const ROMAN = ['', 'I', 'II', 'III'] as const;
const TIER_COPY = [
  'tierBronze', 'tierSilver', 'tierGold', 'tierPlatinum',
  'tierDiamond', 'tierMaster', 'tierGrandmaster', 'tierLegend',
] as const;

/** Полоса до следующего деления. Заполняется с задержкой — движение заметнее. */
function RankProgressBar({ progress, reduceMotion }: { progress: number; reduceMotion: boolean }) {
  const P = useTournamentPalette();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = reduceMotion
      ? progress
      : withDelay(180, withSpring(progress, { damping: 18, stiffness: 120 }));
  }, [progress, reduceMotion, width]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, width.value)) * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: P.elev2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: P.accent }, style]} />
    </View>
  );
}

/**
 * Пожизненный лучший тир — по нему открыта косметика (D-63). Сезонный сюда не
 * годится: награда выдаётся раз в жизнь, и по сезонному лестница показывала бы
 * незабранным то, что игрок уже забрал.
 */
function lifetimeBest(profile: { lifetimeBestTierIndex?: number } | null): number {
  return Math.max(0, Math.trunc(Number(profile?.lifetimeBestTierIndex ?? 0)));
}

function TierRow({ row, index, reduceMotion, rewardItemId, rewardClaimed }: {
  row: ArenaTierRow;
  index: number;
  reduceMotion: boolean;
  rewardItemId: string | null;
  rewardClaimed: boolean;
}) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const scale = useSharedValue(row.current ? 0.94 : 1);
  useEffect(() => {
    if (!row.current) return;
    scale.value = reduceMotion ? 1 : withSpring(1, { damping: 12, stiffness: 200 });
  }, [reduceMotion, row.current, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 45).duration(260)}
      style={style}
    >
      <V2Card
        pad={14}
        style={[
          styles.row,
          row.current ? { backgroundColor: P.accent } : null,
          // Запертый тир глушится, а не прячется: игрок должен видеть, что
          // впереди есть куда идти.
          row.locked ? { opacity: 0.45 } : null,
        ]}
      >
        <View style={[styles.badge, { backgroundColor: row.current ? P.okInk : P.elev2 }]}>
          <Ionicons
            name={row.current ? 'flame' : row.earned ? 'checkmark-circle' : row.locked ? 'lock-closed' : 'ellipse-outline'}
            size={20}
            color={row.current ? P.accent : row.earned ? P.accent : P.muted}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: row.current ? P.okInk : P.text }]}>
            {arenaText(lang, TIER_COPY[row.tierIndex])}
          </Text>
          <Text style={[styles.meta, { color: row.current ? P.okInk : P.muted }]}>
            {row.locked ? arenaText(lang, 'rankLocked') : `${row.minRp}–${row.maxRp}`}
          </Text>
        </View>
        {/* Награда за тир — косметика (D-63), не звёзды: общую экономику
            звёзд владелец трогать запретил. Видно, что ждёт и что уже забрано. */}
        {rewardItemId ? (
          <Ionicons
            name={rewardClaimed ? 'ribbon' : 'ribbon-outline'}
            size={20}
            color={rewardClaimed ? P.accent : row.current ? P.okInk : P.muted}
          />
        ) : null}
        {row.next ? <Ionicons name="arrow-up-circle" size={22} color={P.gold} /> : null}
      </V2Card>
    </Animated.View>
  );
}

const warmStore = AsyncStorage as unknown as ArenaKeyValueStore;

export default function ArenaRanksScreen() {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  /**
   * Тёплый снимок главного экрана: ранг и очки меняются только после матча,
   * поэтому показать прошлые честнее, чем писать «Загрузка». Своё значение,
   * когда придёт, молча заменит снимок.
   */
  const warmHome = useMemo(() => arenaPeekHomeWarm(Date.now())?.home ?? null, []);
  const [home, setHome] = useState<Awaited<ReturnType<typeof arenaV2Home>> | null>(
    warmHome as Awaited<ReturnType<typeof arenaV2Home>> | null,
  );
  const profile = home?.profile ?? null;
  const [friends, setFriends] = useState<readonly ArenaFriendsBoardRow[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendsFailed, setFriendsFailed] = useState(false);
  const [percentile, setPercentile] = useState<number | null>(null);
  /**
   * Пока ответа нет, экран НЕ рисует ранг. Раньше он показывал «Бронза III ·
   * 0 очков» — то есть чужой ранг как твой, и это худшая ложь из возможных
   * здесь: игрок верит ей ровно до следующего матча.
   */
  const [homeFailed, setHomeFailed] = useState(false);

  useEffect(() => {
    if (!active) return;
    void arenaV2Home().then((response) => {
      setHome(response);
      setHomeFailed(false);
      arenaRememberHomeWarm({ home: response, wallNowMs: Date.now(), store: warmStore });
    }).catch(() => setHomeFailed(true));
    void arenaLoadHomeWarm(warmStore, Date.now()).then((stored) => {
      if (stored?.home) {
        setHome((current) => current ?? (stored.home as Awaited<ReturnType<typeof arenaV2Home>>));
      }
    }).catch(() => {});
    // Отдельным вызовом и ровно один раз на открытие: список друзей меняется
    // днями, а не секундами, и опрашивать его по кругу незачем.
    void arenaV2FriendsBoard()
      .then((board) => { setFriends(board.rows); setPercentile(board.percentileAbove); setFriendsLoaded(true); })
      // Молчаливый отказ здесь означал исчезнувшую таблицу друзей: игрок видел
      // пустое место и решал, что друзей у него нет.
      .catch(() => { setFriendsFailed(true); setFriendsLoaded(true); });
  }, [active]);

  const screen = useMemo(() => arenaRankScreen({
    rp: profile?.rating ?? 0,
    seasonBestTierIndex: profile?.seasonBestTierIndex,
    percentileAbove: percentile,
  }), [profile, percentile]);

  const ladder = useMemo(() => arenaTierRewardLadder(lifetimeBest(profile)), [profile]);

  const known = arenaKnowsValue({ loaded: Boolean(home), failed: homeFailed });
  /**
   * Таблица друзей одна строка длиной — это ты сам: сравнивать не с кем, и это
   * не то же самое, что неудачная загрузка.
   */
  const friendsState = arenaLoadState({
    loaded: friendsLoaded,
    failed: friendsFailed,
    count: Math.max(0, friends.length - 1),
  });
  /**
   * Пока ранг неизвестен, заголовок ПУСТОЙ, а не «Загрузка»: слово загрузки
   * владелец видеть запретил, а выдумывать чужой ранг нельзя тем более.
   * Обычно сюда и не попадаем — ранг берётся из тёплого снимка.
   */
  const headline = known
    ? `${arenaText(lang, TIER_COPY[screen.tierIndex])} · ${ROMAN[screen.division]}`
    : homeFailed ? arenaText(lang, 'loadFailed') : '';

  return (
    <ArenaHubChrome
      availability={home?.availability}
      activeMatchId={home?.activeMatch?.matchId ?? null}
      activeQueue={home?.activeQueue}
    >
    <ArenaScreen title={arenaText(lang, 'ranks')} variant="table">
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(300)}>
        <V2Card pad={16} style={styles.head}>
          <Text style={[styles.headline, { color: known ? P.text : P.muted }]}>{headline}</Text>
          {/* Число очков — утверждение. Пока его нет, не утверждаем. */}
          {known ? <Text style={[styles.rp, { color: P.muted }]}>{screen.rp}</Text> : null}
          {homeFailed ? (
            <Text style={[styles.meta, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
          ) : null}

          {!known ? null : screen.top ? (
            <Text style={[styles.meta, { color: P.gold }]}>{arenaText(lang, 'rankTop')}</Text>
          ) : (
            <>
              <RankProgressBar progress={screen.progress} reduceMotion={reduceMotion} />
              <Text style={[styles.meta, { color: P.muted }]}>
                {arenaText(lang, 'rankProgress')}: {screen.rpToNextRank}
              </Text>
            </>
          )}

          {/* Щит. Игрок должен знать это ДО матча, а не после падения из тира. */}

          {screen.percentileAbove !== null ? (
            <Text style={[styles.meta, { color: P.muted }]}>
              {arenaText(lang, 'rankPercentile')} {screen.percentileAbove}%
            </Text>
          ) : null}
        </V2Card>
      </Animated.View>


      {known ? (
        <>
          <Text style={[styles.section, { color: P.muted }]}>
            {arenaText(lang, 'rankBest')}: {arenaText(lang, TIER_COPY[screen.seasonBestTierIndex])}
          </Text>

          {screen.tiers.map((row, index) => (
            <TierRow
              key={row.tierIndex}
              row={row}
              index={index}
              reduceMotion={reduceMotion}
              rewardItemId={ladder[row.tierIndex]?.itemId ?? null}
              rewardClaimed={ladder[row.tierIndex]?.claimed ?? false}
            />
          ))}
        </>
      ) : null}

      {/*
        Отказ и «не с кем сравнить» — разные вещи, и раньше блок при обоих
        просто исчезал. Теперь у каждого своя строка с объяснением.

        А вот загрузка не показывается вовсе: владелец запретил видимую
        загрузку где бы то ни было. Пока список едет, блока просто нет — он
        появляется готовым. Показывать «Загрузка» здесь было бы вдвойне
        плохо: строка живёт доли секунды и дёргает страницу прыжком высоты.
      */}
      {friendsState === 'failed' || friendsState === 'empty' ? (
        <>
          <Text style={[styles.section, { color: P.muted }]}>{arenaText(lang, 'friendsBoard')}</Text>
          <V2Card pad={12}>
            <Text style={[styles.name, { color: P.text }]}>
              {arenaText(lang, friendsState === 'failed' ? 'loadFailed' : 'friendsBoardEmpty')}
            </Text>
            <Text style={[styles.meta, { color: P.muted }]}>
              {arenaText(lang, friendsState === 'failed' ? 'loadFailedHint' : 'friendsBoardEmptyHint')}
            </Text>
          </V2Card>
        </>
      ) : null}

      {friendsState === 'ready' ? (
        <>
          <Text style={[styles.section, { color: P.muted }]}>{arenaText(lang, 'friendsBoard')}</Text>
          {friends.map((row, index) => (
            <Animated.View
              key={row.stableUid}
              entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.delay(index * 40).duration(240)}
            >
              <V2Card pad={12} style={[styles.row, row.you ? { borderColor: P.accent, borderWidth: 1 } : null]}>
                <View style={[styles.badge, { backgroundColor: P.elev2 }]}>
                  <Text style={[styles.name, { color: P.text }]}>{index + 1}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: row.you ? P.accent : P.text }]}>
                    {row.you ? arenaText(lang, 'you') : arenaText(lang, TIER_COPY[Math.min(7, Math.floor(row.rank / 3))])}
                  </Text>
                  <Text style={[styles.meta, { color: P.muted }]}>{row.wins}/{row.losses}</Text>
                </View>
                <Text style={[styles.rp, { color: P.text }]}>{row.rating}</Text>
              </V2Card>
            </Animated.View>
          ))}
        </>
      ) : null}
    </ArenaScreen>
    </ArenaHubChrome>
  );
}

const styles = StyleSheet.create({
  head: { gap: 10 },
  headline: { fontSize: 24, fontWeight: '900' },
  rp: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  promoTitle: { fontSize: 16, fontWeight: '900' },
  slots: { flexDirection: 'row', gap: 10 },
  slot: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 8, fontSize: 13, fontWeight: '800' },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 13, fontWeight: '700' },
  reward: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

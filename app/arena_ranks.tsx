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
} from 'react-native-reanimated';

import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaRankStars } from '../components/arena/ArenaRankStars';
import { V2Card } from '../components/ui/v2_ui';
import { useTournamentPalette } from '../components/ui/v2_theme';
import SkeletonBlock from '../components/SkeletonShimmer';
import { arenaText } from '../modules/arena/copy';
import { arenaRankScreen, type ArenaTierRow } from '../modules/arena/rank_view';
import { arenaTierRewardLadder } from '../modules/arena/tier_rewards';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { arenaKnowsValue } from '../modules/arena/load_state';
import { arenaLoadHomeWarm, arenaPeekHomeWarm, arenaRememberHomeWarm } from '../modules/arena/home_cache';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { arenaV2Home } from './arena_client';

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
            {row.locked ? arenaText(lang, 'rankLocked') : `${row.minStars}–${row.maxStars} ★`}
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
  }, [active]);

  const screen = useMemo(() => arenaRankScreen({
    stars: profile?.rating ?? 0,
    seasonBestTierIndex: profile?.seasonBestTierIndex,
    percentileAbove: null,
  }), [profile]);

  const ladder = useMemo(() => arenaTierRewardLadder(lifetimeBest(profile)), [profile]);

  const known = arenaKnowsValue({ loaded: Boolean(home), failed: homeFailed });
  /**
   * Пока ранг неизвестен, заголовок ПУСТОЙ, а не «Загрузка»: слово загрузки
   * владелец видеть запретил, а выдумывать чужой ранг нельзя тем более.
   * Обычно сюда и не попадаем — ранг берётся из тёплого снимка.
   */
  const headline = known
    ? `${arenaText(lang, TIER_COPY[screen.tierIndex])} · ${ROMAN[screen.division]}`
    : homeFailed ? arenaText(lang, 'loadFailed') : '';

  return (
    <ArenaScreen title={arenaText(lang, 'ranks')} variant="table">
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(300)}>
        <V2Card pad={16} style={styles.head}>
          <Text style={[styles.headline, { color: known ? P.text : P.muted }]}>{headline}</Text>
          {/* Звёзды ранга — утверждение. Пока их нет, не утверждаем. */}
          {known ? (
            <ArenaRankStars
              filled={screen.starsInRank}
              size={18}
              accessibilityLabel={`${arenaText(lang, 'rankStars')}: ${screen.starsInRank}/${screen.starsPerRank}`}
            />
          ) : null}
          {homeFailed ? (
            <Text style={[styles.meta, { color: P.muted }]}>{arenaText(lang, 'loadFailedHint')}</Text>
          ) : null}

          {!known ? null : screen.top ? (
            <Text style={[styles.meta, { color: P.gold }]}>{arenaText(lang, 'rankTop')}</Text>
          ) : (
            <>
              <RankProgressBar progress={screen.progress} reduceMotion={reduceMotion} />
              <Text style={[styles.meta, { color: P.muted }]}>
                {arenaText(lang, 'rankProgress')}: {`${screen.winsToNextRank} ★`}
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
      ) : !homeFailed ? (
        /*
         * зачем: без тёплого снимка (первый запуск, память ещё пуста) ранг
         * неизвестен ДО ответа сервера, и лестница тиров просто исчезала —
         * пустое место без объяснения. Заглушки той же геометрии, что и
         * TierRow (V2Card pad=14, minHeight 66): приход данных не двигает
         * вёрстку. Обычно сюда не попадаем — ранг берётся из warm-снимка.
         */
        <View testID="arena-ranks-tier-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {/* guard-ok: список заглушек фиксированной длины (8 тиров), не сортируется
              и в него ничего не вставляется — переиспользовать по индексу безопасно. */}
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={[styles.row, styles.tierSkeletonRow, { backgroundColor: P.card }]}>
              <SkeletonBlock width={44} height={44} borderRadius={15} baseColor={P.chipEdge} highlightColor={P.chipHi} />
              <View style={styles.copy}>
                <SkeletonBlock width="46%" height={14} borderRadius={7} baseColor={P.chipEdge} highlightColor={P.chipHi} />
                <SkeletonBlock width="30%" height={11} borderRadius={6} baseColor={P.chipEdge} highlightColor={P.chipHi} style={styles.tierSkeletonMeta} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

    </ArenaScreen>
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
  // зачем: скелетон списка тиров = финальная геометрия строки (Performance Bible)
  tierSkeletonRow: { alignItems: 'center' },
  tierSkeletonMeta: { marginTop: 6 },
});

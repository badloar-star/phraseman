import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Modal, Pressable,
  TouchableOpacity, Dimensions, Alert, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import LevelBadge from '../components/LevelBadge';
import { getXPProgress, CEFR_FOR_LEVEL } from '../constants/theme';
import { useLang, getLeague } from '../components/LangContext';
import { loadLeagueState, LEAGUES } from './league_engine';
import { loadLeaderboard, loadWeekLeaderboard, getMyWeekPoints, getWeekKey } from './hall_of_fame_utils';
import { loadWager, placeWager, wagerDaysLeft, WagerState, WAGER_TIERS } from './streak_wager';
import { STORE_URL } from './config';

const { width } = Dimensions.get('window');
const CHART_H = 110;
const DAYS_SHOW = 14;

interface DayData {
  date: string;
  shortLabel: string;
  dayNum: string;
  points: number;
  active: boolean;
  streak: number;
}

// Day-of-week labels indexed by d.getDay() (0=Sun, 1=Mon, ..., 6=Sat)
const WDAYS_RU = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const WDAYS_UK = ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'];
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const getLast14 = (): string[] => {
  const days: string[] = [];
  for (let i = DAYS_SHOW - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
};

// Reads day value from daily_stats — supports both formats:
// 1) plain number: { "2025-03-15": 48 }
// 2) object: { "2025-03-15": { points: 48, streak: 3 } }
const extractPoints = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && typeof val.points === 'number') return val.points;
  return 0;
};
const extractStreak = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && typeof val.streak === 'number') return val.streak;
  return 0;
};

// ── Пари на цепочку ───────────────────────────────────────────────────────────
const TIER_ICONS_WAGER: Array<any> = ['flag-outline', 'flame-outline', 'thunderstorm-outline', 'trophy-outline'];
const TIER_DAYS_LABEL_RU = ['7 дней', '8 дней', '9 дней', '10 дней'];
const TIER_DAYS_LABEL_UK = ['7 днів', '8 днів', '9 днів', '10 днів'];

function WagerCard({ isUK, t, f, totalStreak }: { isUK: boolean; t: any; f: any; totalStreak: number }) {
  const [wager, setWager]               = useState<WagerState | null>(null);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [placing, setPlacing]           = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [userXP, setUserXP]             = useState(0);

  const reload = async () => {
    const [w, xpRaw] = await Promise.all([
      loadWager(),
      AsyncStorage.getItem('user_total_xp'),
    ]);
    setWager(w);
    setUserXP(parseInt(xpRaw || '0') || 0);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handlePlace = () => {
    const tier = WAGER_TIERS[selectedTier];
    if (userXP < tier.betXP) {
      Alert.alert(
        isUK ? 'Недостатньо XP' : 'Недостаточно XP',
        `${isUK ? 'Потрібно' : 'Нужно'} ${tier.betXP} XP`
      );
      return;
    }
    Alert.alert(
      isUK ? 'Підтвердити пари' : 'Подтвердить пари',
      isUK
        ? `Ставка: ${tier.betXP} XP\n\n✅ Збережеш ланцюжок ${tier.daysRequired} днів — отримаєш +${tier.rewardXP} XP (×2)\n\n❌ Зірвеш ланцюжок — втратиш ${tier.betXP} XP`
        : `Ставка: ${tier.betXP} XP\n\n✅ Сохранишь цепочку ${tier.daysRequired} дней — получишь +${tier.rewardXP} XP (×2)\n\n❌ Собьёшь цепочку — потеряешь ${tier.betXP} XP`,
      [
        { text: isUK ? 'Скасувати' : 'Отмена', style: 'cancel' },
        { text: isUK ? 'Поставити' : 'Поставить', onPress: doPlace },
      ]
    );
  };

  const doPlace = async () => {
    setPlacing(true);
    const ok = await placeWager(totalStreak, selectedTier);
    if (ok) {
      await reload();
      setModalOpen(false);
    }
    setPlacing(false);
  };

  if (loading) return null;

  // ── Результат ──────────────────────────────────────────────────────────────
  if (wager && !wager.active && wager.result !== 'pending') {
    const won = wager.result === 'won';
    const resultColor = won ? '#34C759' : '#FF3B30';
    return (
      <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: resultColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={won ? 'trophy' : 'close-circle'} size={22} color={resultColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
            {won
              ? (isUK ? `Пари виграно! +${wager.rewardXP} XP` : `Пари выиграно! +${wager.rewardXP} XP`)
              : (isUK ? `Ланцюжок зірвано · −${wager.betXP} XP` : `Цепочка сорвана · −${wager.betXP} XP`)}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
            {isUK ? 'Прийняти нове пари?' : 'Принять новое пари?'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setWager(null)}
          style={{ backgroundColor: t.bgSurface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
            {isUK ? 'Так' : 'Да'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Активное пари ──────────────────────────────────────────────────────────
  if (wager?.active) {
    const daysLeft = wagerDaysLeft(wager);
    const daysKept = wager.daysRequired - daysLeft;
    const pct      = daysKept / wager.daysRequired;
    const tierIcon = TIER_ICONS_WAGER[wager.tierIdx] ?? 'flame-outline';

    return (
      <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.textSecond + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tierIcon} size={20} color={t.textSecond} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {isUK ? 'Пари активне' : 'Пари активно'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {isUK ? `${daysLeft} дн. залишилось · ставка ${wager.betXP} XP` : `${daysLeft} дн. осталось · ставка ${wager.betXP} XP`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800' }}>+{wager.rewardXP}</Text>
            <Text style={{ color: t.textMuted, fontSize: f.label }}>XP</Text>
          </View>
        </View>

        {/* Day dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: wager.daysRequired }, (_, i) => {
            const done = i < daysKept;
            const cur  = i === daysKept;
            return (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3,
                backgroundColor: done ? t.textSecond : cur ? t.textSecond + '55' : t.bgSurface2 }} />
            );
          })}
        </View>
        <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center' }}>
          {isUK ? `${daysKept} з ${wager.daysRequired} днів збережено` : `${daysKept} из ${wager.daysRequired} дней сохранено`}
        </Text>
      </View>
    );
  }

  // ── Кнопка → открывает модал ────────────────────────────────────────────────
  const sel       = WAGER_TIERS[selectedTier];
  const canAfford = userXP >= sel.betXP;

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
        style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.textSecond + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="dice-outline" size={22} color={t.textSecond} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
            {isUK ? 'Пари' : 'Пари'}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub }}>
            {isUK ? 'Утримай ланцюжок — отримай ×2 XP' : 'Удержи цепочку — получи ×2 XP'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
      </TouchableOpacity>

      {/* Модал выбора ставки */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }} onPress={() => setModalOpen(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ backgroundColor: t.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>

              {/* Handle */}
              <View style={{ width: 36, height: 4, backgroundColor: t.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }}>
                  {isUK ? 'Пари на ланцюжок' : 'Пари на цепочку'}
                </Text>
                <View style={{ backgroundColor: t.bgSurface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                    {userXP} XP
                  </Text>
                </View>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 18 }}>
                {isUK ? 'Обери умову — виграй подвійний досвід' : 'Выбери условие — выиграй двойной опыт'}
              </Text>

              {/* Tier grid 2×2 compact */}
              <View style={{ gap: 8, marginBottom: 18 }}>
                {[[0, 1], [2, 3]].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map(i => {
                      const tier     = WAGER_TIERS[i];
                      const icon     = TIER_ICONS_WAGER[i];
                      const label    = isUK ? TIER_DAYS_LABEL_UK[i] : TIER_DAYS_LABEL_RU[i];
                      const selected = selectedTier === i;
                      const afford   = userXP >= tier.betXP;
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setSelectedTier(i)}
                          activeOpacity={0.75}
                          style={{
                            flex: 1, borderRadius: 14,
                            backgroundColor: selected ? t.textSecond + '1A' : t.bgCard,
                            borderWidth: selected ? 1.5 : 1,
                            borderColor: selected ? t.textSecond : t.border,
                            opacity: afford ? 1 : 0.35,
                            paddingVertical: 10, paddingHorizontal: 10,
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            minHeight: 56,
                          }}
                        >
                          <Ionicons name={icon} size={18} color={selected ? t.textSecond : t.textMuted} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: selected ? t.textPrimary : t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                              {label}
                            </Text>
                            <Text style={{ color: selected ? t.textSecond : t.textGhost, fontSize: f.label, fontWeight: '700' }}>
                              +{tier.rewardXP} XP
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handlePlace}
                disabled={placing || !canAfford}
                activeOpacity={0.85}
                style={{ borderRadius: 14, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={canAfford ? [t.textSecond, t.textSecond + 'CC'] : [t.bgSurface2, t.bgSurface2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={canAfford ? '#000' : t.textGhost} />
                  <Text style={{ color: canAfford ? '#000' : t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                    {placing
                      ? (isUK ? 'Ставимо...' : 'Ставим...')
                      : canAfford
                        ? (isUK
                            ? `Поставити ${sel.betXP} XP · виграти +${sel.rewardXP} XP`
                            : `Поставить ${sel.betXP} XP · выиграть +${sel.rewardXP} XP`)
                        : (isUK ? 'Недостатньо XP' : 'Недостаточно XP')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function StreakStats() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{section?:string}>();
  const { theme: t , f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const wdays = isUK ? WDAYS_UK : WDAYS_RU;

  const [days, setDays]                  = useState<DayData[]>([]);
  const [allDays, setAllDays]            = useState<DayData[]>([]);
  const [totalStreak, setTotalStreak]    = useState(0);
  const [bestStreak, setBestStreak]      = useState(0);
  const [totalPoints, setTotalPoints]    = useState(0);
  const [activeDaysCount, setActiveDays] = useState(0);
  const [weekPoints, setWeekPoints]      = useState(0);
  const [topPlayers, setTopPlayers]      = useState<{ name: string; points: number }[]>([]);
  const [myRank, setMyRank]              = useState(0);
  const [myName, setMyName]              = useState('');
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const [totalXP, setTotalXP]            = useState(0);
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [lessonsProgressPct, setLessonsProgressPct] = useState(0);

  const scrollRef     = useRef<any>(null);
  const chartScrollRef = useRef<any>(null);
  const today = toDateStr(new Date());
  const [levelY, setLevelY] = React.useState(0);

  useEffect(() => { loadAll(); }, []);

  // Reload data when screen regains focus (e.g. after tester functions)
  useFocusEffect(React.useCallback(() => { loadAll(); }, []));

  // Scroll to level section if opened from level block on home screen
  useEffect(() => {
    if (section === 'level' && levelY > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: levelY, animated: true });
      }, 300);
    }
  }, [section, levelY]);

  const loadAll = async () => {
    try {
      const [streakVal, statsRaw, wp, name, board, weekBoard] = await Promise.all([
        AsyncStorage.getItem('streak_count'),
        AsyncStorage.getItem('daily_stats'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_name'),
        loadLeaderboard(),
        loadWeekLeaderboard(),
      ]);

      if (streakVal) setTotalStreak(parseInt(streakVal) || 0);
      setWeekPoints(wp);
      if (name) setMyName(name);

      const statsMap: Record<string, any> = statsRaw ? JSON.parse(statsRaw) : {};

      const dates = getLast14();
      const dayData: DayData[] = dates.map(dateStr => {
        const d = new Date(dateStr + 'T12:00:00'); // fix timezone
        const val = statsMap[dateStr];
        const pts = extractPoints(val);
        return {
          date: dateStr,
          shortLabel: wdays[d.getDay()],
          dayNum: String(d.getDate()),
          points: pts,
          active: pts > 0,
          streak: extractStreak(val),
        };
      });
      setDays(dayData);

      // All-history chart: always show last 60 days
      const todayStr = toDateStr(new Date());
      const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 59);
      const startDate = toDateStr(sixtyDaysAgo);

      const allHistoryDays: DayData[] = [];
      const cursor = new Date(startDate + 'T12:00:00');
      const endDate = new Date(todayStr + 'T12:00:00');
      while (cursor <= endDate) {
        const dateStr = toDateStr(cursor);
        const val = statsMap[dateStr];
        const pts = extractPoints(val);
        allHistoryDays.push({
          date: dateStr,
          shortLabel: wdays[cursor.getDay()],
          dayNum: String(cursor.getDate()),
          points: pts,
          active: pts > 0,
          streak: extractStreak(val),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      setAllDays(allHistoryDays);

      const allPts = Object.values(statsMap).reduce((sum: number, val: any) => {
        return sum + extractPoints(val);
      }, 0);
      const allActive = Object.values(statsMap).filter((val: any) => extractPoints(val) > 0).length;
      setTotalPoints(allPts);
      setActiveDays(allActive);

      const xpStored = await AsyncStorage.getItem('user_total_xp');
      setTotalXP(parseInt(xpStored || '0') || allPts * 5);


      let best = 0, cur = 0;
      for (const d of dayData) {
        if (d.active) { cur++; best = Math.max(best, cur); } else cur = 0;
      }
      setBestStreak(best);

      // Validate week board is current week before showing
      const currentWeekKey = getWeekKey(new Date());
      const wbMetaRaw = await AsyncStorage.getItem('week_board_meta');
      const weekMeta = wbMetaRaw ? JSON.parse(wbMetaRaw) : { weekKey: '' };
      const validWeekBoard = weekMeta.weekKey === currentWeekKey ? weekBoard : [];
      const topSource = validWeekBoard.length > 0 ? validWeekBoard : board;
      setTopPlayers(topSource.slice(0, 3).map(e => ({ name: e.name, points: e.points })));
      if (name) {
        const rank = topSource.findIndex(e => e.name === name);
        setMyRank(rank >= 0 ? rank + 1 : 0);
      }

      const ls = await loadLeagueState();
      if (ls) setEngineLeague(LEAGUES.find(l => l.id === ls.leagueId) || null);

      // Count completed lessons (≥45 correct+replay_correct out of 50)
      let completedCount = 0;
      let totalCorrectAll = 0;
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonResults = await AsyncStorage.multiGet(lessonKeys);
      for (const [, val] of lessonResults) {
        if (val) {
          const p: string[] = JSON.parse(val);
          const correctCount = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          totalCorrectAll += correctCount;
          if (correctCount >= 45) completedCount++; // 90% of TOTAL=50
        }
      }
      setLessonsCompleted(completedCount);
      setLessonsProgressPct(Math.min(100, Math.round(totalCorrectAll / (32 * 50) * 100)));
    } catch {}
  };


  const maxPts = Math.max(...days.map(d => d.points), 1);
  const league = getLeague(weekPoints, lang);
  const avgPerDay = activeDaysCount > 0 ? Math.round(totalPoints / activeDaysCount) : 0;

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>
          {isUK ? 'Статистика ланцюжка' : 'Статистика цепочки'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* LEVEL */}
        <View onLayout={(e) => setLevelY(e.nativeEvent.layout.y)}>
          {(() => {
            const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
            const cefr = CEFR_FOR_LEVEL(level);
            return (
              <View style={{ borderRadius: 16, padding: 14, borderWidth: 0.5, backgroundColor: t.bgCard, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <LevelBadge level={level} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                      {isUK ? `Рівень ${level} · ${cefr}` : `Уровень ${level} · ${cefr}`}
                    </Text>
                    <Text style={{ color: '#D4A017', fontSize: f.label, fontWeight: '600', marginTop: 2 }}>{totalXP} XP</Text>
                  </View>
                </View>
                <View style={{ height: 7, backgroundColor: t.bgSurface, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                  <View style={{ width: `${Math.min(100, Math.round(progress * 100))}%` as any, height: '100%', borderRadius: 4, backgroundColor: '#D4A017' }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label }}>{xpInLevel} / {xpNeeded} XP</Text>
                  <Text style={{ color: '#D4A017', fontSize: f.label }}>
                    {isUK ? `Рівень ${level}` : `Уровень ${level}`}
                  </Text>
                </View>
              </View>
            );
          })()}
        </View>

        {/* STREAK */}
        <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Ionicons name="flame" size={Math.round(f.numLg * 1.1)} color="#FF6B35" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg + 4, fontWeight: '700' }} numberOfLines={1}>{totalStreak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption }}>{isUK ? 'днів поспіль' : 'дней подряд'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ color: t.textSecond, fontSize: f.h1, fontWeight: '700' }}>{bestStreak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label }}>{isUK ? 'найкращий' : 'лучший'}</Text>
              {totalStreak >= 3 && (
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', gap:4 }}
                  onPress={async () => {
                    const msg = isUK
                      ? `Мій стрік ${totalStreak} днів у Phraseman! 🔥\n${STORE_URL}`
                      : `Мой стрик ${totalStreak} дней в Phraseman! 🔥\n${STORE_URL}`;
                    try { await Share.share({ message: msg }); } catch {}
                  }}
                >
                  <Ionicons name="share-outline" size={14} color={t.textGhost}/>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {isUK ? 'Поділитися' : 'Поделиться'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Current week days */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {(isUK
            ? ['Пн','Вт','Ср','Чт','Пт','Сб','Нд']
            : ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
          ).map((d, i) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - todayIdx);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + i);
              const dateStr = toDateStr(dayDate);
              const dayInfo = days.find(x => x.date === dateStr);
              const done = dayInfo?.active || false;
              const isToday = i === todayIdx;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={[
                    { width: 10, height: 10, borderRadius: 5, backgroundColor: t.bgSurface },
                    done && { backgroundColor: t.textSecond },
                    isToday && !done && { backgroundColor: t.textPrimary },
                  ]} />
                  <Text style={{ color: isToday ? t.textPrimary : t.textSecond, fontSize: f.label, fontWeight: isToday ? '700' : '400' }}>{d}</Text>
                </View>
              );
            })}
          </View>
        </View>


        {/* LEAGUE */}
        <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            {isUK ? 'Поточна ліга' : 'Текущая лига'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="medal-outline" size={28} color={t.textSecond} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>
                {engineLeague ? (isUK ? engineLeague.nameUK : engineLeague.nameRU) : league.name}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
                {weekPoints} {isUK ? 'досвіду' : 'опыта'} {isUK ? 'цього тижня' : 'на этой неделе'}
              </Text>
            </View>
          </View>
        </View>

        {/* CHART — horizontal scroll, full history */}
        {(() => {
          const chartDays = allDays.length > 0 ? allDays : days;
          const maxAllPts = Math.max(...chartDays.map(d => d.points), 1);
          return (
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, paddingBottom: 8, borderWidth: 0.5, borderColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                  {isUK ? 'Вся активність' : 'Вся активность'}
                </Text>
              </View>
              <ScrollView
                ref={chartScrollRef}
                horizontal
                showsHorizontalScrollIndicator
                indicatorStyle="white"
                onLayout={() => chartScrollRef.current?.scrollToEnd?.({ animated: false })}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 12 }}
              >
                {chartDays.map((d, i) => {
                  const barH = d.points > 0 ? Math.max((d.points / maxAllPts) * CHART_H, 8) : 5;
                  const isToday = d.date === today;
                  const barColor = d.active
                    ? (isToday ? t.textPrimary : t.accent)
                    : (isToday ? t.border : t.bgSurface2 ?? t.border);
                  return (
                    <View key={i} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                      {d.points > 0 && (
                        <Text style={{ color: t.textMuted, fontSize: 7, fontWeight: '600' }} numberOfLines={1}>{d.points}</Text>
                      )}
                      {d.points === 0 && <View style={{ height: 12 }} />}
                      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                        <View style={{
                          width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                          backgroundColor: barColor,
                          opacity: d.active ? 1 : 0.35,
                        }} />
                      </View>
                      <Text style={{
                        color: isToday ? t.textPrimary : t.textMuted,
                        fontSize: 8, fontWeight: isToday ? '800' : '400',
                        lineHeight: 11,
                      }} numberOfLines={1}>{d.shortLabel}</Text>
                      <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}



        {/* PATH A1 → B2 */}
        {(() => {
          const stages = ['A1','A2','B1','B2'];
          // Lesson brackets: A1=1-8, A2=9-18, B1=19-28, B2=29-32
          const lessonStages = [
            { label: 'A1', from: 1,  to: 8  },
            { label: 'A2', from: 9,  to: 18 },
            { label: 'B1', from: 19, to: 28 },
            { label: 'B2', from: 29, to: 32 },
          ];
          const overallPct = lessonsProgressPct;
          const currentStage = lessonsCompleted < 8 ? 0 : lessonsCompleted < 18 ? 1 : lessonsCompleted < 28 ? 2 : 3;
          const currentStageMeta = lessonStages[currentStage] || lessonStages[3];
          return (
            <View style={{ borderRadius: 16, padding: 14, borderWidth: 0.5, backgroundColor: t.bgCard, borderColor: t.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>
                  {isUK ? 'Шлях A1 → B2' : 'Путь A1 → B2'}
                </Text>
                <Text style={{ color: '#4CAF72', fontSize: f.label, fontWeight: '700' }}>
                  {overallPct}%
                </Text>
              </View>
              {/* Progress bar */}
              <View style={{ height: 6, backgroundColor: t.bgSurface, borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                <View style={{ width: `${overallPct}%` as any, height: '100%', borderRadius: 3, backgroundColor: '#4CAF72' }} />
              </View>
              {/* Stage labels */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                {stages.map((s, i) => (
                  <Text key={s} style={{ fontSize: f.label, fontWeight: '600', color: i <= currentStage ? '#4CAF72' : t.textMuted }}>{s}</Text>
                ))}
              </View>
              {/* Real progress info */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{lessonsCompleted}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{isUK ? 'уроків виконано' : 'уроков сдано'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#4CAF72', fontSize: f.numMd, fontWeight: '700' }}>{currentStageMeta.label}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{isUK ? 'поточний рівень' : 'текущий уровень'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{32 - lessonsCompleted}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{isUK ? 'залишилось' : 'осталось'}</Text>
                </View>
              </View>
              {lessonsCompleted < 32 && (
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 10, textAlign: 'center' }}>
                  {isUK
                    ? `Уроки ${currentStageMeta.from}–${currentStageMeta.to} — рівень ${currentStageMeta.label}`
                    : `Уроки ${currentStageMeta.from}–${currentStageMeta.to} — уровень ${currentStageMeta.label}`}
                </Text>
              )}
            </View>
          );
        })()}

        {/* ── ДОСТИЖЕНИЯ ────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push('/achievements_screen')}
          style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 26 }}>🏅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {isUK ? 'Досягнення' : 'Достижения'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
              {isUK ? 'Відкрий усі 35 нагород' : 'Открой все 35 наград'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </TouchableOpacity>

        {/* ── ПАРИ НА СТРИК ─────────────────────────────────────────────────── */}
        <WagerCard isUK={isUK} t={t} f={f} totalStreak={totalStreak} />

        <View style={{ height: 8 }} />
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

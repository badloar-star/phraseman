import React, { useEffect, useState, memo, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, Modal, Pressable, Image, ScrollView, useWindowDimensions,
  InteractionManager,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import TapScale from '../components/TapScale';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { glassFill } from '../components/GlassSurface';
import { useStudyTarget } from '../components/StudyTargetContext';
import { safeRouterBack } from './navigation_back';
import {
  ALL_ACHIEVEMENTS,
  loadAchievementStates,
  Achievement,
  AchievementState,
  claimAchievementShardReward,
  hasPendingShardReward,
  achievementNameForLang,
  achievementDescForLang,
  checkAchievements,
} from './achievements';
import { getNearestLockedAchievements } from './achievement_nearest';
import type { NearestAchievementItem } from './achievement_nearest';
import { triLang, type Lang } from '../constants/i18n';
import { getLevelFromXP, type ThemeMode } from '../constants/theme';
import { hapticSuccess } from '../hooks/use-haptics';
import { STORE_URL, ENABLE_DEV_TOOLS } from './config';
import { oskolokImageForPackShards } from './oskolok';
import { buildAchievementShareMessage } from './achievement_share';
import {
  achievementLessonPerfectPassesKey,
  activeRecallAchievementCorrectCountKey,
  comboAchievementCounterKey,
  dailyPhraseAchievementReadCountKey,
  dailyPhraseAchievementSaveCountKey,
  dailyTasksAchievementAllDoneStreakKey,
  dailyTasksAchievementNoRerollStreakKey,
  flashcardsAchievementFlipCountKey,
  flashcardsAchievementSavedCountKey,
  flashcardsAchievementViewStreakKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsOwnedPacksKey,
  lessonPassCountKey,
  lessonProgressKey,
  shareAchievementCounterKey,
  trainerAchievementCorrectCountKey,
  trainerAchievementPerfectSessionCountKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

const GRID_GAP = 10;
const GRID_SIDE_PADDING = 36;
const ACHIEVEMENT_PROGRESS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];
const sectionHighlightStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 12,
  right: 12,
  height: 1,
  borderRadius: 1,
};

function getAchievementGridMetrics(screenW: number) {
  const safeW = Math.max(1, screenW);
  const cols = safeW < 330 ? 2 : safeW < 430 ? 3 : 4;
  const sidePadding = safeW < 360 ? 24 : GRID_SIDE_PADDING;
  const gridWidth = Math.max(120, Math.min(safeW, 640) - sidePadding);
  const rawOuter = Math.floor((gridWidth - (cols - 1) * GRID_GAP) / cols);
  const shieldOuter = Math.max(62, rawOuter);
  const shieldW = Math.max(54, Math.min(safeW < 360 ? 90 : 112, shieldOuter - 4));
  return { cols, gap: GRID_GAP, shieldOuter, shieldW };
}

function isVisibleAchievement(_a: Achievement, _stateMap: Map<string, AchievementState>): boolean {
  return true;
}

type AchievementGridMetrics = ReturnType<typeof getAchievementGridMetrics>;

interface AchievementStats {
  streak: number;
  loginDays: number;
  lessons: number;
  perfectLessons: number;
  lessons2x: number;
  lessons3x: number;
  lessons5x: number;
  perfectLessons2x: number;
  b2PerfectLessons: number;
  xp: number;
  level: number;
  weeklyXP: number;
  recallCorrect: number;
  shards: number;
  shardsSpent: number;
  comboBest: number;
  dailyAllStreak: number;
  dailyNoRerollStreak: number;
  dailyPhraseReads: number;
  dailyPhraseSaves: number;
  flashcardsSaved: number;
  flashcardsFlips: number;
  flashcardsViewStreak: number;
  energyRefills: number;
  leagueTop3: number;
  leagueChampion: number;
  leagueDiamondWeeks: number;
  giftsSent: number;
  trainerPerfectSessions: number;
  packsOwned: number;
  shareCount: number;
}

const emptyAchievementStats = (): AchievementStats => ({
  streak: 0,
  loginDays: 0,
  lessons: 0,
  perfectLessons: 0,
  lessons2x: 0,
  lessons3x: 0,
  lessons5x: 0,
  perfectLessons2x: 0,
  b2PerfectLessons: 0,
  xp: 0,
  level: 1,
  weeklyXP: 0,
  recallCorrect: 0,
  shards: 0,
  shardsSpent: 0,
  comboBest: 0,
  dailyAllStreak: 0,
  dailyNoRerollStreak: 0,
  dailyPhraseReads: 0,
  dailyPhraseSaves: 0,
  flashcardsSaved: 0,
  flashcardsFlips: 0,
  flashcardsViewStreak: 0,
  energyRefills: 0,
  leagueTop3: 0,
  leagueChampion: 0,
  leagueDiamondWeeks: 0,
  giftsSent: 0,
  trainerPerfectSessions: 0,
  packsOwned: 0,
  shareCount: 0,
});

const readJsonStreak = (raw: string | null, key = 'streak'): number => {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    return Math.max(0, Math.floor(Number(parsed?.[key]) || 0));
  } catch { return 0; }
};

const readJsonStringListLength = (raw: string | null): number => {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string').length : 0;
  } catch { return 0; }
};

const readComboBestAcrossTargets = async (): Promise<string> => {
  const rows = await AsyncStorage.multiGet(
    ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => comboAchievementCounterKey(studyTarget)),
  );
  const best = rows.reduce((max, [, raw]) => Math.max(max, parseInt(raw || '0', 10) || 0), 0);
  return String(best);
};

const readFlashcardsCounterAcrossTargets = async (
  keyForTarget: (studyTarget: RuntimeStudyTarget) => string,
): Promise<string> => {
  const rows = await AsyncStorage.multiGet(ACHIEVEMENT_PROGRESS_TARGETS.map(keyForTarget));
  const total = rows.reduce((sum, [, raw]) => sum + (parseInt(raw || '0', 10) || 0), 0);
  return String(total);
};

const readFlashcardsViewStreakAcrossTargets = async (): Promise<string> => {
  const rows = await AsyncStorage.multiGet(
    ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => flashcardsAchievementViewStreakKey(studyTarget)),
  );
  const best = rows.reduce((max, [, raw]) => Math.max(max, readJsonStreak(raw)), 0);
  return String(best);
};

const readTrainerPracticeCorrectAcrossTargets = async (): Promise<string> => {
  const rows = await AsyncStorage.multiGet(
    ACHIEVEMENT_PROGRESS_TARGETS.flatMap((studyTarget) => [
      activeRecallAchievementCorrectCountKey(studyTarget),
      trainerAchievementCorrectCountKey(studyTarget),
    ]),
  );
  const byTarget = new Map<RuntimeStudyTarget, { recall: number; trainer: number }>();
  ACHIEVEMENT_PROGRESS_TARGETS.forEach((studyTarget) => byTarget.set(studyTarget, { recall: 0, trainer: 0 }));
  for (const [key, raw] of rows) {
    const value = parseInt(raw || '0', 10) || 0;
    const studyTarget = ACHIEVEMENT_PROGRESS_TARGETS.find((target) =>
      key === activeRecallAchievementCorrectCountKey(target) || key === trainerAchievementCorrectCountKey(target),
    );
    if (!studyTarget) continue;
    const bucket = byTarget.get(studyTarget) ?? { recall: 0, trainer: 0 };
    if (key === activeRecallAchievementCorrectCountKey(studyTarget)) bucket.recall = value;
    if (key === trainerAchievementCorrectCountKey(studyTarget)) bucket.trainer = value;
    byTarget.set(studyTarget, bucket);
  }
  const total = [...byTarget.values()].reduce((sum, bucket) => sum + Math.max(bucket.recall, bucket.trainer), 0);
  return String(total);
};

const readTrainerPerfectSessionsAcrossTargets = async (): Promise<string> => {
  const rows = await AsyncStorage.multiGet(
    ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => trainerAchievementPerfectSessionCountKey(studyTarget)),
  );
  const total = rows.reduce((sum, [, raw]) => sum + (parseInt(raw || '0', 10) || 0), 0);
  return String(total);
};

const readDailyPhraseCounterAcrossTargets = async (
  keyForTarget: (studyTarget: RuntimeStudyTarget) => string,
): Promise<string> => {
  const rows = await AsyncStorage.multiGet(ACHIEVEMENT_PROGRESS_TARGETS.map(keyForTarget));
  const total = rows.reduce((sum, [, raw]) => sum + (parseInt(raw || '0', 10) || 0), 0);
  return String(total);
};

const readDailyTaskStreakAcrossTargets = async (
  keyForTarget: (studyTarget: RuntimeStudyTarget) => string,
): Promise<string> => {
  const rows = await AsyncStorage.multiGet(ACHIEVEMENT_PROGRESS_TARGETS.map(keyForTarget));
  const best = rows.reduce((max, [, raw]) => Math.max(max, readJsonStreak(raw)), 0);
  return String(best);
};

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    const [
      streakRaw, loginRaw, xpRaw, recallRaw, trainerRaw, shardsRaw, shardsSpentRaw, comboBestRaw,
      dailyAllStreakRaw, dailyNoRerollRaw, dailyPhraseReadsRaw, dailyPhraseSavesRaw,
      flashcardsSavedRaw, flashcardsFlipsRaw, flashcardsViewRaw, energyRefillsRaw,
       leagueTop3Raw, leagueChampionRaw, leagueDiamondWeeksRaw, giftsRaw,
      trainerPerfectRaw, packStorageRows, shareRaw,
      weeklyRaw, weeklyPeakRaw,
    ] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('login_bonus_v1'),
      AsyncStorage.getItem('user_total_xp'),
      readTrainerPracticeCorrectAcrossTargets(),
      '0',
      AsyncStorage.getItem('shards_balance'),
      AsyncStorage.getItem('achievement_shards_spent_total'),
      readComboBestAcrossTargets(),
      readDailyTaskStreakAcrossTargets(dailyTasksAchievementAllDoneStreakKey),
      readDailyTaskStreakAcrossTargets(dailyTasksAchievementNoRerollStreakKey),
      readDailyPhraseCounterAcrossTargets(dailyPhraseAchievementReadCountKey),
      readDailyPhraseCounterAcrossTargets(dailyPhraseAchievementSaveCountKey),
      readFlashcardsCounterAcrossTargets(flashcardsAchievementSavedCountKey),
      readFlashcardsCounterAcrossTargets(flashcardsAchievementFlipCountKey),
      readFlashcardsViewStreakAcrossTargets(),
      AsyncStorage.getItem('achievement_energy_refill_count'),
      AsyncStorage.getItem('achievement_league_top3_count'),
      AsyncStorage.getItem('achievement_league_champion_count'),
      AsyncStorage.getItem('achievement_league_diamond_week_streak_v1'),
      AsyncStorage.getItem('achievement_gift_sent_count'),
      readTrainerPerfectSessionsAcrossTargets(),
      AsyncStorage.multiGet(
        ACHIEVEMENT_PROGRESS_TARGETS.flatMap((studyTarget) => [
          flashcardsOwnedPacksKey(studyTarget),
          flashcardsCommunityOwnedPacksKey(studyTarget),
          flashcardsMarketDevOwnedPacksKey(studyTarget),
        ]),
      ),
      readFlashcardsCounterAcrossTargets(shareAchievementCounterKey),
      AsyncStorage.getItem('week_points'),
      AsyncStorage.getItem('week_xp_peak_best_v1'),
    ]);
    const streak = parseInt(streakRaw || '0') || 0;
    const xp = parseInt(xpRaw || '0') || 0;
    const level = getLevelFromXP(xp);
    const weeklyXP = Math.max(parseInt(weeklyRaw || '0') || 0, parseInt(weeklyPeakRaw || '0') || 0);
    const recallCorrect = Math.max(parseInt(recallRaw || '0') || 0, parseInt(trainerRaw || '0') || 0);
    const shards = parseInt(shardsRaw || '0') || 0;
    const shardsSpent = parseInt(shardsSpentRaw || '0') || 0;
    let loginDays = 0;
    try { loginDays = loginRaw ? JSON.parse(loginRaw).consecutiveDays || 0 : 0; } catch {}
    let lessons = 0, perfectLessons = 0, b2PerfectLessons = 0;
    try {
      const lessonIds = Array.from({ length: 32 }, (_, i) => i + 1);
      const lessonKeys = lessonIds.flatMap((lessonId) =>
        ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => lessonProgressKey(lessonId, studyTarget)),
      );
      const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
      const lessonMap = Object.fromEntries(lessonEntries);
      for (const lessonId of lessonIds) {
        let completed = false;
        let perfect = false;
        for (const studyTarget of ACHIEVEMENT_PROGRESS_TARGETS) {
          const saved = lessonMap[lessonProgressKey(lessonId, studyTarget)];
          if (!saved) continue;
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct >= 45) {
            if (p.filter(x => x === 'wrong').length === 0) {
              perfect = true;
            }
            completed = true;
          }
        }
        if (completed) lessons++;
        if (perfect) {
          perfectLessons++;
          if (lessonId >= 29 && lessonId <= 32) b2PerfectLessons++;
        }
      }
    } catch {}
    let lessons2x = 0, lessons3x = 0, lessons5x = 0, perfectLessons2x = 0;
    try {
      const lessonIds = Array.from({ length: 32 }, (_, i) => i + 1);
      const passKeys = lessonIds.flatMap((lessonId) =>
        ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) => lessonPassCountKey(lessonId, studyTarget)),
      );
      const perfectPassKeys = lessonIds.flatMap((lessonId) =>
        ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) =>
          achievementLessonPerfectPassesKey(lessonId, studyTarget),
        ),
      );
      const [passEntries, perfectPassEntries] = await Promise.all([
        AsyncStorage.multiGet(passKeys),
        AsyncStorage.multiGet(perfectPassKeys),
      ]);
      const passMap = Object.fromEntries(passEntries);
      for (const lessonId of lessonIds) {
        const n = Math.max(
          ...ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) =>
            parseInt(passMap[lessonPassCountKey(lessonId, studyTarget)] || '0', 10) || 0,
          ),
        );
        if (n >= 2) lessons2x++;
        if (n >= 3) lessons3x++;
        if (n >= 5) lessons5x++;
      }
      const perfectPassMap = Object.fromEntries(perfectPassEntries);
      for (const lessonId of lessonIds) {
        const n = Math.max(
          ...ACHIEVEMENT_PROGRESS_TARGETS.map((studyTarget) =>
            readJsonStringListLength(perfectPassMap[achievementLessonPerfectPassesKey(lessonId, studyTarget)]),
          ),
        );
        if (n >= 2) perfectLessons2x++;
      }
    } catch {}
    const packSet = new Set<string>();
    packStorageRows.map(([, raw]) => raw).forEach(raw => {
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) parsed.forEach(x => { if (typeof x === 'string') packSet.add(x); });
      } catch {}
    });
    return {
      streak,
      loginDays,
      lessons,
      perfectLessons,
      lessons2x,
      lessons3x,
      lessons5x,
      perfectLessons2x,
      b2PerfectLessons,
      xp,
      level,
      weeklyXP,
      recallCorrect,
      shards,
      shardsSpent,
      comboBest: parseInt(comboBestRaw || '0') || 0,
      dailyAllStreak: readJsonStreak(dailyAllStreakRaw),
      dailyNoRerollStreak: readJsonStreak(dailyNoRerollRaw),
      dailyPhraseReads: parseInt(dailyPhraseReadsRaw || '0') || 0,
      dailyPhraseSaves: parseInt(dailyPhraseSavesRaw || '0') || 0,
      flashcardsSaved: parseInt(flashcardsSavedRaw || '0') || 0,
      flashcardsFlips: parseInt(flashcardsFlipsRaw || '0') || 0,
      flashcardsViewStreak: readJsonStreak(flashcardsViewRaw),
      energyRefills: parseInt(energyRefillsRaw || '0') || 0,
      leagueTop3: parseInt(leagueTop3Raw || '0') || 0,
      leagueChampion: parseInt(leagueChampionRaw || '0') || 0,
      leagueDiamondWeeks: readJsonStreak(leagueDiamondWeeksRaw),
      giftsSent: parseInt(giftsRaw || '0') || 0,
      trainerPerfectSessions: parseInt(trainerPerfectRaw || '0') || 0,
      packsOwned: packSet.size,
      shareCount: parseInt(shareRaw || '0') || 0,
    };
  } catch { return emptyAchievementStats(); }
}

function getAchievementProgress(id: string, stats: AchievementStats): [number, number] | null {
  if (id.startsWith('streak_') && !id.includes('repair')) {
    const n = parseInt(id.replace('streak_', ''));
    if (!isNaN(n)) return [Math.min(stats.streak, n), n];
  }
  if (id.startsWith('login_')) {
    const n = parseInt(id.replace('login_', ''));
    if (!isNaN(n)) return [Math.min(stats.loginDays, n), n];
  }
  if (id.startsWith('lesson_') && !id.includes('perfect') && id !== 'lesson_all') {
    const n = parseInt(id.replace('lesson_', ''));
    if (!isNaN(n)) return [Math.min(stats.lessons, n), n];
  }
  if (id === 'lesson_all') return [Math.min(stats.lessons, 32), 32];
  if (id === 'lesson_all_2x') return [Math.min(stats.lessons2x, 32), 32];
  if (id === 'lesson_all_3x') return [Math.min(stats.lessons3x, 32), 32];
  if (id === 'lesson_all_5x') return [Math.min(stats.lessons5x, 32), 32];
  if (id === 'lesson_perfect') return [Math.min(stats.perfectLessons, 1), 1];
  if (id === 'lesson_perfect3') return [Math.min(stats.perfectLessons, 3), 3];
  if (id === 'lesson_perfect10') return [Math.min(stats.perfectLessons, 10), 10];
  if (id === 'lesson_all_perfect') return [Math.min(stats.perfectLessons, 32), 32];
  if (id === 'lesson_all_perfect_2x') return [Math.min(stats.perfectLessons2x, 32), 32];
  if (id === 'lesson_b2_perfect') return [Math.min(stats.b2PerfectLessons, 4), 4];
  if (id.startsWith('xp_')) {
    const n = parseInt(id.replace('xp_', ''));
    if (!isNaN(n)) return [Math.min(stats.xp, n), n];
  }
  if (id === 'level_50') return [Math.min(stats.level, 50), 50];
  if (id === 'weekly_xp_5000') return [Math.min(stats.weeklyXP, 5000), 5000];
  if (id === 'weekly_xp_10000') return [Math.min(stats.weeklyXP, 10000), 10000];
  if (id === 'recall_first') return [Math.min(stats.recallCorrect, 1), 1];
  if (id === 'recall_50') return [Math.min(stats.recallCorrect, 50), 50];
  if (id === 'trainer_100_correct') return [Math.min(stats.recallCorrect, 100), 100];
  if (id === 'trainer_500_correct') return [Math.min(stats.recallCorrect, 500), 500];
  if (id === 'trainer_1000_correct') return [Math.min(stats.recallCorrect, 1000), 1000];
  if (id === 'trainer_2500_correct') return [Math.min(stats.recallCorrect, 2500), 2500];
  if (id === 'trainer_10000_correct') return [Math.min(stats.recallCorrect, 10000), 10000];
  if (id.startsWith('shards_spent_')) {
    const n = parseInt(id.replace('shards_spent_', ''));
    if (!isNaN(n)) return [Math.min(stats.shardsSpent, n), n];
  }
  if (id.startsWith('shards_')) {
    const n = parseInt(id.replace('shards_', ''));
    if (!isNaN(n)) return [Math.min(stats.shards, n), n];
  }
  if (id.startsWith('combo_')) {
    const n = parseInt(id.replace('combo_', ''));
    if (!isNaN(n)) return [Math.min(stats.comboBest, n), n];
  }
  if (id === 'daily_all_3') return [Math.min(stats.dailyAllStreak, 3), 3];
  if (id === 'daily_all_7') return [Math.min(stats.dailyAllStreak, 7), 7];
  if (id === 'daily_all_14') return [Math.min(stats.dailyAllStreak, 14), 14];
  if (id === 'daily_all_30') return [Math.min(stats.dailyAllStreak, 30), 30];
  if (id === 'daily_no_reroll_7') return [Math.min(stats.dailyNoRerollStreak, 7), 7];
  if (id === 'daily_no_reroll_30') return [Math.min(stats.dailyNoRerollStreak, 30), 30];
  if (id === 'daily_phrase_read_30') return [Math.min(stats.dailyPhraseReads, 30), 30];
  if (id === 'daily_phrase_save_30') return [Math.min(stats.dailyPhraseSaves, 30), 30];
  if (id === 'daily_phrase_save_100') return [Math.min(stats.dailyPhraseSaves, 100), 100];
  if (id === 'flashcards_save_25') return [Math.min(stats.flashcardsSaved, 25), 25];
  if (id === 'flashcards_save_50') return [Math.min(stats.flashcardsSaved, 50), 50];
  if (id === 'flashcards_save_100') return [Math.min(stats.flashcardsSaved, 100), 100];
  if (id === 'flashcards_save_250') return [Math.min(stats.flashcardsSaved, 250), 250];
  if (id === 'flashcards_flip_100') return [Math.min(stats.flashcardsFlips, 100), 100];
  if (id === 'flashcards_flip_500') return [Math.min(stats.flashcardsFlips, 500), 500];
  if (id === 'flashcards_flip_1000') return [Math.min(stats.flashcardsFlips, 1000), 1000];
  if (id === 'flashcards_view_7_days') return [Math.min(stats.flashcardsViewStreak, 7), 7];
  if (id === 'flashcards_view_14_days') return [Math.min(stats.flashcardsViewStreak, 14), 14];
  if (id === 'flashcards_view_30_days') return [Math.min(stats.flashcardsViewStreak, 30), 30];
  if (id === 'energy_refill_5') return [Math.min(stats.energyRefills, 5), 5];
  if (id === 'energy_refill_10') return [Math.min(stats.energyRefills, 10), 10];
  if (id === 'energy_refill_25') return [Math.min(stats.energyRefills, 25), 25];
  if (id === 'league_top3_5') return [Math.min(stats.leagueTop3, 5), 5];
  if (id === 'league_champion_5') return [Math.min(stats.leagueChampion, 5), 5];
  if (id === 'league_champion_10') return [Math.min(stats.leagueChampion, 10), 10];
  if (id === 'league_diamond_4_weeks') return [Math.min(stats.leagueDiamondWeeks, 4), 4];
  if (id === 'social_gift_5') return [Math.min(stats.giftsSent, 5), 5];
  if (id === 'social_gift_10') return [Math.min(stats.giftsSent, 10), 10];
  if (id === 'social_gift_25') return [Math.min(stats.giftsSent, 25), 25];
  if (id === 'social_gift_100') return [Math.min(stats.giftsSent, 100), 100];
  if (id === 'trainer_perfect_10_sessions') return [Math.min(stats.trainerPerfectSessions, 10), 10];
  if (id === 'trainer_perfect_50_sessions') return [Math.min(stats.trainerPerfectSessions, 50), 50];
  if (id === 'pack_5_purchased') return [Math.min(stats.packsOwned, 5), 5];
  if (id === 'pack_10_purchased') return [Math.min(stats.packsOwned, 10), 10];
  if (id === 'pack_25_purchased') return [Math.min(stats.packsOwned, 25), 25];
  if (id === 'share_achievement_10') return [Math.min(stats.shareCount, 10), 10];
  return null;
}

/** Квизовые достижения доступны всем; Premium-подсказка для них отключена. */
// Лейбл уровня для медалей (gem_*)
const GEM_LEVEL_LABEL: Record<string, string> = {
  gem_a1_ruby: 'A1', gem_a1_emerald: 'A1', gem_a1_diamond: 'A1', gem_a1_obsidian: 'A1', gem_a1_mythic: 'A1',
  gem_a2_ruby: 'A2', gem_a2_emerald: 'A2', gem_a2_diamond: 'A2', gem_a2_obsidian: 'A2', gem_a2_mythic: 'A2',
  gem_b1_ruby: 'B1', gem_b1_emerald: 'B1', gem_b1_diamond: 'B1', gem_b1_obsidian: 'B1', gem_b1_mythic: 'B1',
  gem_b2_ruby: 'B2', gem_b2_emerald: 'B2', gem_b2_diamond: 'B2', gem_b2_obsidian: 'B2', gem_b2_mythic: 'B2',
};

// ── PNG-изображения для каждого достижения ───────────────────────────────────
export const ACHIEVEMENT_IMAGE: Record<string, any> = {
  streak_3:                         require('../assets/images/achievements/streak_3.webp'),
  streak_7:                         require('../assets/images/achievements/streak_7.webp'),
  streak_14:                        require('../assets/images/achievements/streak_14.webp'),
  streak_30:                        require('../assets/images/achievements/streak_30.webp'),
  streak_60:                        require('../assets/images/achievements/streak_60.webp'),
  streak_100:                       require('../assets/images/achievements/streak_100.webp'),
  streak_200:                       require('../assets/images/achievements/streak_200.webp'),
  streak_365:                       require('../assets/images/achievements/streak_365.webp'),
  streak_500:                       require('../assets/images/achievements/streak_500.webp'),
  streak_repair:                    require('../assets/images/achievements/streak_repair.webp'),
  perfect_week:                     require('../assets/images/achievements/perfect_week.webp'),
  lesson_1:                         require('../assets/images/achievements/lesson_1.webp'),
  lesson_3:                         require('../assets/images/achievements/lesson_3.webp'),
  lesson_5:                         require('../assets/images/achievements/lesson_5.webp'),
  lesson_10:                        require('../assets/images/achievements/lesson_10.webp'),
  lesson_15:                        require('../assets/images/achievements/lesson_15.webp'),
  lesson_20:                        require('../assets/images/achievements/lesson_20.webp'),
  lesson_all:                       require('../assets/images/achievements/lesson_all.webp'),
  lesson_perfect:                   require('../assets/images/achievements/lesson_perfect.webp'),
  lesson_perfect3:                  require('../assets/images/achievements/lesson_perfect3.webp'),
  lesson_all_perfect:               require('../assets/images/achievements/lesson_all_perfect.webp'),
  xp_100:                           require('../assets/images/achievements/xp_100.webp'),
  xp_250:                           require('../assets/images/achievements/xp_250.webp'),
  xp_500:                           require('../assets/images/achievements/xp_500.webp'),
  xp_1000:                          require('../assets/images/achievements/xp_1000.webp'),
  xp_2500:                          require('../assets/images/achievements/xp_2500.webp'),
  xp_5000:                          require('../assets/images/achievements/xp_5000.webp'),
  xp_10000:                         require('../assets/images/achievements/xp_10000.webp'),
  xp_20000:                         require('../assets/images/achievements/xp_20000.webp'),
  xp_50000:                         require('../assets/images/achievements/xp_50000.webp'),
  xp_100000:                        require('../assets/images/achievements/xp_100000.webp'),
  wager_win:                        require('../assets/images/achievements/wager_win.webp'),
  personal_best:                    require('../assets/images/achievements/personal_best.webp'),
  combo_3:                          require('../assets/images/achievements/combo_3.webp'),
  combo_10:                         require('../assets/images/achievements/combo_10.webp'),
  combo_20:                         require('../assets/images/achievements/combo_20.webp'),
  combo_50:                         require('../assets/images/achievements/combo_50.webp'),
  combo_100:                        require('../assets/images/achievements/combo_100.webp'),
  daily_task_first:                 require('../assets/images/achievements/daily_task_first.webp'),
  all_daily:                        require('../assets/images/achievements/all_daily.webp'),
  daily_all_3:                      require('../assets/images/achievements/daily_all_3.webp'),
  daily_all_7:                      require('../assets/images/achievements/daily_all_7.webp'),
  daily_no_reroll:                  require('../assets/images/achievements/daily_no_reroll.webp'),
  daily_phrase_first:               require('../assets/images/achievements/daily_phrase_first.webp'),
  daily_phrase_save:                require('../assets/images/achievements/daily_phrase_save.webp'),
  login_7:                          require('../assets/images/achievements/login_7.webp'),
  login_14:                         require('../assets/images/achievements/login_14.webp'),
  login_30:                         require('../assets/images/achievements/login_30.webp'),
  login_60:                         require('../assets/images/achievements/login_60.webp'),
  login_365:                        require('../assets/images/achievements/login_365.webp'),
  comeback:                         require('../assets/images/achievements/comeback.webp'),
  diagnosis:                        require('../assets/images/achievements/diagnosis.webp'),
  night_owl:                        require('../assets/images/achievements/night_owl.webp'),
  early_bird:                       require('../assets/images/achievements/early_bird.webp'),
  exam_first:                       require('../assets/images/achievements/exam_first.webp'),
  exam_ace:                         require('../assets/images/achievements/exam_ace.webp'),
  flashcards_session:               require('../assets/images/achievements/flashcards_session.webp'),
  flashcards_save_25:               require('../assets/images/achievements/flashcards_save_25.webp'),
  flashcards_save_50:               require('../assets/images/achievements/flashcards_save_50.webp'),
  flashcards_flip_100:              require('../assets/images/achievements/flashcards_flip_100.webp'),
  flashcards_view_7_days:           require('../assets/images/achievements/flashcards_view_7_days.webp'),
  flashcards_sources_4:             require('../assets/images/achievements/flashcards_sources_4.webp'),
  recall_first:                     require('../assets/images/achievements/recall_first.webp'),
  recall_50:                        require('../assets/images/achievements/recall_50.webp'),
  shards_100:                       require('../assets/images/achievements/shards_100.webp'),
  shards_spent_100:                 require('../assets/images/achievements/shards_spent_100.webp'),
  energy_refill_first:              require('../assets/images/achievements/energy_refill_first.webp'),
  energy_refill_5:                  require('../assets/images/achievements/energy_refill_5.webp'),
  league_result_first:              require('../assets/images/achievements/league_result_first.webp'),
  league_top3:                      require('../assets/images/achievements/league_top3.webp'),
  league_champion:                  require('../assets/images/achievements/league_champion.webp'),
  league_promoted:                  require('../assets/images/achievements/league_promoted.webp'),
  league_diamond:                   require('../assets/images/achievements/league_diamond.webp'),
  league_boost_first:               require('../assets/images/achievements/league_boost_first.webp'),
  league_boost_5:                   require('../assets/images/achievements/league_boost_5.webp'),
  league_boost_x3:                  require('../assets/images/achievements/league_boost_x3.webp'),
  gem_a1_ruby:                      require('../assets/images/achievements/gem_a1_ruby.webp'),
  gem_a1_emerald:                   require('../assets/images/achievements/gem_a1_emerald.webp'),
  gem_a1_diamond:                   require('../assets/images/achievements/gem_a1_diamond.webp'),
  gem_a2_ruby:                      require('../assets/images/achievements/gem_a2_ruby.webp'),
  gem_a2_emerald:                   require('../assets/images/achievements/gem_a2_emerald.webp'),
  gem_a2_diamond:                   require('../assets/images/achievements/gem_a2_diamond.webp'),
  gem_b1_ruby:                      require('../assets/images/achievements/gem_b1_ruby.webp'),
  gem_b1_emerald:                   require('../assets/images/achievements/gem_b1_emerald.webp'),
  gem_b1_diamond:                   require('../assets/images/achievements/gem_b1_diamond.webp'),
  gem_b2_ruby:                      require('../assets/images/achievements/gem_b2_ruby.webp'),
  gem_b2_emerald:                   require('../assets/images/achievements/gem_b2_emerald.webp'),
  gem_b2_diamond:                   require('../assets/images/achievements/gem_b2_diamond.webp'),
  gem_a1_obsidian:                  require('../assets/images/achievements/gem_a1_obsidian.webp'),
  gem_a1_mythic:                    require('../assets/images/achievements/gem_a1_mythic.webp'),
  gem_a2_obsidian:                  require('../assets/images/achievements/gem_a2_obsidian.webp'),
  gem_a2_mythic:                    require('../assets/images/achievements/gem_a2_mythic.webp'),
  gem_b1_obsidian:                  require('../assets/images/achievements/gem_b1_obsidian.webp'),
  gem_b1_mythic:                    require('../assets/images/achievements/gem_b1_mythic.webp'),
  gem_b2_obsidian:                  require('../assets/images/achievements/gem_b2_obsidian.webp'),
  gem_b2_mythic:                    require('../assets/images/achievements/gem_b2_mythic.webp'),
  gem_all_complete:                 require('../assets/images/achievements/gem_all_complete.webp'),
  gem_all_obsidian:                 require('../assets/images/achievements/gem_all_obsidian.webp'),
  gem_all_mythic:                   require('../assets/images/achievements/gem_all_mythic.webp'),
  social_friend_first:              require('../assets/images/achievements/social_friend_first.webp'),
  social_friends_3:                 require('../assets/images/achievements/social_friends_3.webp'),
  social_friends_10:                require('../assets/images/achievements/social_friends_10.webp'),
  social_gift_send:                 require('../assets/images/achievements/social_gift_send.webp'),
  social_gift_5:                    require('../assets/images/achievements/social_gift_5.webp'),
  social_gift_10:                   require('../assets/images/achievements/social_gift_10.webp'),
  social_like_received:             require('../assets/images/achievements/social_like_received.webp'),
  social_likes_5:                   require('../assets/images/achievements/social_likes_5.webp'),
  trainer_session:                  require('../assets/images/achievements/trainer_session.webp'),
  trainer_100_correct:              require('../assets/images/achievements/trainer_100_correct.webp'),
  trainer_7_days:                   require('../assets/images/achievements/trainer_7_days.webp'),
  trainer_500_correct:              require('../assets/images/achievements/trainer_500_correct.webp'),
  trainer_perfect_session:          require('../assets/images/achievements/trainer_perfect_session.webp'),
  avatar_custom:                    require('../assets/images/achievements/avatar_custom.webp'),
  profile_themed:                   require('../assets/images/achievements/profile_themed.webp'),
  pack_purchased:                   require('../assets/images/achievements/pack_purchased.webp'),
  pack_5_purchased:                 require('../assets/images/achievements/pack_5_purchased.webp'),
  share_achievement:                require('../assets/images/achievements/share_achievement.webp'),
  level_50:                         require('../assets/images/achievements/level_50.webp'),
  xp_75000:                         require('../assets/images/achievements/xp_75000.webp'),
  wager_win_3:                      require('../assets/images/achievements/wager_win_3.webp'),
  streak_150:                       require('../assets/images/achievements/streak_150.webp'),
  streak_250:                       require('../assets/images/achievements/streak_250.webp'),
  streak_750:                       require('../assets/images/achievements/streak_750.webp'),
  streak_1000:                      require('../assets/images/achievements/streak_1000.webp'),
  streak_clean_365:                 require('../assets/images/achievements/streak_clean_365.webp'),
  perfect_month:                    require('../assets/images/achievements/perfect_month.webp'),
  night_week:                       require('../assets/images/achievements/night_week.webp'),
  early_week:                       require('../assets/images/achievements/early_week.webp'),
  lesson_all_2x:                    require('../assets/images/achievements/lesson_all_2x.webp'),
  lesson_all_3x:                    require('../assets/images/achievements/lesson_all_3x.webp'),
  lesson_all_5x:                    require('../assets/images/achievements/lesson_all_5x.webp'),
  lesson_perfect10:                 require('../assets/images/achievements/lesson_perfect10.webp'),
  lesson_b2_perfect:                require('../assets/images/achievements/lesson_b2_perfect.webp'),
  lesson_marathon_day:              require('../assets/images/achievements/lesson_marathon_day.webp'),
  lesson_all_perfect_2x:            require('../assets/images/achievements/lesson_all_perfect_2x.webp'),
  xp_150000:                        require('../assets/images/achievements/xp_150000.webp'),
  xp_250000:                        require('../assets/images/achievements/xp_250000.webp'),
  xp_500000:                        require('../assets/images/achievements/xp_500000.webp'),
  xp_750000:                        require('../assets/images/achievements/xp_750000.webp'),
  xp_1000000:                       require('../assets/images/achievements/xp_1000000.webp'),
  xp_2000000:                       require('../assets/images/achievements/xp_2000000.webp'),
  weekly_xp_5000:                   require('../assets/images/achievements/weekly_xp_5000.webp'),
  weekly_xp_10000:                  require('../assets/images/achievements/weekly_xp_10000.webp'),
  wager_win_10:                     require('../assets/images/achievements/wager_win_10.webp'),
  combo_150:                        require('../assets/images/achievements/combo_150.webp'),
  combo_250:                        require('../assets/images/achievements/combo_250.webp'),
  combo_500:                        require('../assets/images/achievements/combo_500.webp'),
  daily_all_14:                     require('../assets/images/achievements/daily_all_14.webp'),
  daily_all_30:                     require('../assets/images/achievements/daily_all_30.webp'),
  daily_no_reroll_7:                require('../assets/images/achievements/daily_no_reroll_7.webp'),
  daily_no_reroll_30:               require('../assets/images/achievements/daily_no_reroll_30.webp'),
  daily_phrase_read_30:             require('../assets/images/achievements/daily_phrase_read_30.webp'),
  daily_phrase_save_30:             require('../assets/images/achievements/daily_phrase_save_30.webp'),
  daily_phrase_save_100:            require('../assets/images/achievements/daily_phrase_save_100.webp'),
  login_100:                        require('../assets/images/achievements/login_100.webp'),
  login_200:                        require('../assets/images/achievements/login_200.webp'),
  exam_ace_5:                       require('../assets/images/achievements/exam_ace_5.webp'),
  exam_ace_10:                      require('../assets/images/achievements/exam_ace_10.webp'),
  flashcards_save_100:              require('../assets/images/achievements/flashcards_save_100.webp'),
  flashcards_save_250:              require('../assets/images/achievements/flashcards_save_250.webp'),
  flashcards_flip_500:              require('../assets/images/achievements/flashcards_flip_500.webp'),
  flashcards_flip_1000:             require('../assets/images/achievements/flashcards_flip_1000.webp'),
  flashcards_view_14_days:          require('../assets/images/achievements/flashcards_view_14_days.webp'),
  flashcards_view_30_days:          require('../assets/images/achievements/flashcards_view_30_days.webp'),
  shards_250:                       require('../assets/images/achievements/shards_250.webp'),
  shards_500:                       require('../assets/images/achievements/shards_500.webp'),
  shards_1000:                      require('../assets/images/achievements/shards_1000.webp'),
  shards_spent_500:                 require('../assets/images/achievements/shards_spent_500.webp'),
  shards_spent_1000:                require('../assets/images/achievements/shards_spent_1000.webp'),
  energy_refill_10:                 require('../assets/images/achievements/energy_refill_10.webp'),
  energy_refill_25:                 require('../assets/images/achievements/energy_refill_25.webp'),
  league_top3_5:                    require('../assets/images/achievements/league_top3_5.webp'),
  league_champion_5:                require('../assets/images/achievements/league_champion_5.webp'),
  league_champion_10:               require('../assets/images/achievements/league_champion_10.webp'),
  league_diamond_4_weeks:           require('../assets/images/achievements/league_diamond_4_weeks.webp'),
  social_friends_25:                require('../assets/images/achievements/social_friends_25.webp'),
  social_friends_50:                require('../assets/images/achievements/social_friends_50.webp'),
  social_gift_25:                   require('../assets/images/achievements/social_gift_25.webp'),
  social_gift_100:                  require('../assets/images/achievements/social_gift_100.webp'),
  social_likes_25:                  require('../assets/images/achievements/social_likes_25.webp'),
  social_likes_100:                 require('../assets/images/achievements/social_likes_100.webp'),
  trainer_1000_correct:             require('../assets/images/achievements/trainer_1000_correct.webp'),
  trainer_2500_correct:             require('../assets/images/achievements/trainer_2500_correct.webp'),
  trainer_10000_correct:            require('../assets/images/achievements/trainer_10000_correct.webp'),
  trainer_perfect_10_sessions:      require('../assets/images/achievements/trainer_perfect_10_sessions.webp'),
  trainer_perfect_50_sessions:      require('../assets/images/achievements/trainer_perfect_50_sessions.webp'),
  pack_10_purchased:                require('../assets/images/achievements/pack_10_purchased.webp'),
  pack_25_purchased:                require('../assets/images/achievements/pack_25_purchased.webp'),
  share_achievement_10:             require('../assets/images/achievements/share_achievement_10.webp'),
};

// ── Иконки по ачивке (Ionicons) ───────────────────────────────────────────────
export const ACHIEVEMENT_ICON: Record<string, any> = {
  streak_3:           'flame',
  streak_7:           'medal',
  streak_14:          'medal-outline',
  streak_30:          'ribbon',
  streak_60:          'ribbon-outline',
  streak_100:         'diamond',
  streak_200:         'diamond-outline',
  streak_365:         'star',
  streak_500:         'crown',
  streak_repair:      'refresh-circle',
  perfect_week:       'checkmark-circle',
  lesson_1:           'book',
  lesson_3:           'book-outline',
  lesson_5:           'book',
  lesson_10:          'school',
  lesson_15:          'library-outline',
  lesson_20:          'library',
  lesson_all:         'trophy',
  lesson_perfect:     'checkmark-done',
  lesson_perfect3:    'checkmark-done-circle',
  lesson_all_perfect: 'ribbon',
  xp_100:             'flash-outline',
  xp_250:             'flash',
  xp_500:             'flash',
  xp_1000:            'star',
  xp_2500:            'planet-outline',
  xp_5000:            'star-half',
  xp_10000:           'infinite',
  xp_20000:           'planet',
  xp_50000:           'nuclear',
  xp_100000:          'trophy',
  wager_win:          'dice',
  personal_best:      'trending-up',
  combo_3:            'git-merge',
  combo_10:           'radio-button-on',
  combo_20:           'shield',
  combo_50:           'flash',
  combo_100:          'nuclear',
  daily_task_first:   'checkmark-circle',
  all_daily:          'albums',
  daily_all_3:        'calendar',
  daily_all_7:        'calendar-number',
  daily_no_reroll:    'checkmark-done-circle',
  daily_phrase_first: 'chatbubble-ellipses',
  daily_phrase_save:  'file-tray-full',
  login_7:            'calendar',
  login_14:           'calendar-outline',
  login_30:           'calendar-number',
  login_60:           'calendar-number-outline',
  login_365:          'earth',
  comeback:           'rocket',
  diagnosis:          'flask',
  night_owl:          'moon',
  early_bird:         'sunny',
  exam_first:         'document-text',
  exam_ace:           'ribbon',
  flashcards_session: 'layers',
  flashcards_save_25: 'file-tray-full',
  flashcards_save_50: 'albums',
  flashcards_flip_100: 'sync-circle',
  flashcards_view_7_days: 'calendar',
  flashcards_sources_4: 'git-network',
  recall_first:       'bulb',
  recall_50:          'library',
  shards_100:         'diamond',
  shards_spent_100:   'diamond-outline',
  energy_refill_first: 'flash',
  energy_refill_5:    'battery-full',
  league_result_first: 'flag',
  league_top3:        'podium',
  league_champion:    'trophy',
  league_promoted:    'trending-up',
  league_diamond:     'diamond',
  league_boost_first: 'rocket',
  league_boost_5:     'speedometer',
  league_boost_x3:    'flash',
  social_gift_10:     'gift',
  social_likes_5:     'heart',
  trainer_7_days:     'calendar',
  trainer_500_correct: 'barbell',
  trainer_perfect_session: 'checkmark-done-circle',
  gem_all_complete:   'trophy',
};

// ── Цвет категории ────────────────────────────────────────────────────────────
export const CAT_COLOR: Record<string, string> = {
  streak:  '#FF6B35',
  lessons: '#3B82F6',
  xp:      '#F59E0B',
  combo:   '#EC4899',
  special: '#10B981',
  medal:   '#E11D48',
};
function achievementCategoryColor(cat: string, _themeMode?: string): string {
  return CAT_COLOR[cat] ?? '#888';
}
const CAT_ICON: Record<string, any> = {
  streak:  'flame',
  lessons: 'book',
  xp:      'star',
  combo:   'flash',
  special: 'rocket',
  medal:   'diamond',
};
const CAT_ICON_IMAGE: Record<string, any> = {
  streak:  require('../assets/images/achievement_categories/achievement-category-streak.webp'),
  lessons: require('../assets/images/achievement_categories/achievement-category-lessons.webp'),
  xp:      require('../assets/images/achievement_categories/achievement-category-xp.webp'),
  combo:   require('../assets/images/achievement_categories/achievement-category-combo.webp'),
  special: require('../assets/images/achievement_categories/achievement-category-special.webp'),
  medal:   require('../assets/images/achievements/gem_all_complete.webp'),
};
const CAT_LABEL_RU: Record<string, string> = {
  streak: 'Цепочка', lessons: 'Уроки', xp: 'Опыт',
  quiz: 'Вызовы', combo: 'Серии', special: 'Особые', medal: 'Медали',
};
const CAT_LABEL_UK: Record<string, string> = {
  streak: 'Ланцюжок', lessons: 'Уроки', xp: 'Досвід',
  quiz: 'Квізи', combo: 'Серії', special: 'Особливі', medal: 'Медалі',
};
const CAT_LABEL_ES: Record<string, string> = {
  streak: 'Racha', lessons: 'Lecciones', xp: 'Experiencia',
  quiz: 'Cuestionarios', combo: 'Series', special: 'Especiales', medal: 'Medallas',
};
const CAT_LABEL_PTBR: Record<string, string> = {
  streak: 'Sequência', lessons: 'Lições', xp: 'Experiência',
  quiz: 'Quizzes', combo: 'Séries', special: 'Especiais', medal: 'Medalhas',
};
const CAT_LABEL_VI: Record<string, string> = {
  streak: 'Chuỗi ngày', lessons: 'Bài học', xp: 'Kinh nghiệm',
  quiz: 'Bài quiz', combo: 'Chuỗi', special: 'Đặc biệt', medal: 'Huy chương',
};
const CAT_LABEL_ID: Record<string, string> = {
  streak: 'Rangkaian', lessons: 'Pelajaran', xp: 'Pengalaman',
  quiz: 'Kuis', combo: 'Seri', special: 'Spesial', medal: 'Medali',
};
const CAT_LABEL_TR: Record<string, string> = {
  streak: 'Seri', lessons: 'Dersler', xp: 'Deneyim',
  quiz: 'Quizler', combo: 'Seriler', special: 'Özel', medal: 'Madalyalar',
};
const CAT_LABEL_PL: Record<string, string> = {
  streak: 'Seria', lessons: 'Lekcje', xp: 'Doświadczenie',
  quiz: 'Quizy', combo: 'Serie', special: 'Specjalne', medal: 'Medale',
};

const CATEGORIES = ['streak', 'lessons', 'xp', 'combo', 'special', 'medal'] as const;
const ACHIEVEMENT_DATE_LOCALES: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

type AchievementGridRow = { rowKey: string; items: Achievement[] };

type AchievementListSection = {
  key: string;
  title: string;
  color: string;
  catIcon: string;
  catIconImage?: any;
  catUnlocked: number;
  catTotal: number;
  data: AchievementGridRow[];
};

function achievementCountLabel(count: number, lang: Lang): string {
  const n = Math.max(0, count);
  const pluralRu = () => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    const word = mod10 === 1 && mod100 !== 11
      ? 'награда'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'награды'
        : 'наград';
    return `${n} ${word}`;
  };
  const pluralUk = () => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    const word = mod10 === 1 && mod100 !== 11
      ? 'нагорода'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'нагороди'
        : 'нагород';
    return `${n} ${word}`;
  };
  const pluralPl = () => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    const word = n === 1
      ? 'nagroda'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'nagrody'
        : 'nagród';
    return `${n} ${word}`;
  };
  const labels: Record<Lang, string> = {
    ru: pluralRu(),
    uk: pluralUk(),
    es: `${n} recompensa${n === 1 ? '' : 's'}`,
    'pt-BR': `${n} recompensa${n === 1 ? '' : 's'}`,
    vi: `${n} phần thưởng`,
    id: `${n} hadiah`,
    tr: `${n} ödül`,
    pl: pluralPl(),
  };
  return labels[lang];
}

function achievementCountPairLabel(unlocked: number, total: number, lang: Lang): string {
  if (unlocked === total) return achievementCountLabel(unlocked, lang);
  const labels: Record<Lang, string> = {
    ru: `${unlocked}/${total} наград`,
    uk: `${unlocked}/${total} нагород`,
    es: `${unlocked}/${total} recompensas`,
    'pt-BR': `${unlocked}/${total} recompensas`,
    vi: `${unlocked}/${total} phần thưởng`,
    id: `${unlocked}/${total} hadiah`,
    tr: `${unlocked}/${total} ödül`,
    pl: `${unlocked}/${total} nagród`,
  };
  return labels[lang];
}

type GridCellProps = {
  a: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  color: string;
  categoryIconDefault: string;
  lang: Lang;
  t: any;
  f: any;
  isDark: boolean;
  gold: string;
  shieldW: number;
  shieldOuter: number;
  onSelect: (achievement: Achievement) => void;
  revealLockedDetails: boolean;
  themeMode: ThemeMode;
};

const AchievementGridCell = memo(function AchievementGridCell({
  a,
  state,
  stats,
  color,
  categoryIconDefault,
  lang,
  t,
  f,
  isDark,
  gold,
  shieldW,
  shieldOuter,
  onSelect,
  revealLockedDetails,
  themeMode,
}: GridCellProps) {
  const unlocked = !!state?.unlockedAt;
  const isLocked = !unlocked && !!a.secret && !revealLockedDetails;
  const inProgress = !unlocked && (!a.secret || revealLockedDetails);
  const iconName = ACHIEVEMENT_ICON[a.id] ?? categoryIconDefault;
  const prog = inProgress ? getAchievementProgress(a.id, stats) : null;
  const progPct = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

  return (
    <TouchableOpacity
      onPress={() => onSelect(a)}
      activeOpacity={0.8}
      style={{
        alignItems: 'center',
        width: shieldOuter,
        gap: 5,
      }}
    >
      <View style={{ position: 'relative' }}>
        {unlocked && hasPendingShardReward(state) && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -2,
              zIndex: 4,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: t.correct,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 0,
              borderColor: t.bgCard,
              paddingHorizontal: 3,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: t.correctText }}>+1</Text>
          </View>
        )}
        <BadgeShield
          unlocked={unlocked}
          inProgress={inProgress}
          color={color}
          iconName={iconName}
          size={shieldW}
          maskBg={t.bgPrimary}
          achievementId={a.id}
          isDark={isDark}
          gold={gold}
        />
      </View>

      {inProgress && prog && prog[1] > 0 && progPct > 0 && (
        <View style={{ width: shieldW * 0.8, height: 3, backgroundColor: t.bgSurface2, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 3, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 2 }} />
        </View>
      )}

      {(!isLocked || revealLockedDetails) && (
        <Text
          style={{
            color: unlocked ? t.textPrimary : t.textGhost,
            fontSize: f.label,
            lineHeight: Math.round(f.label * 1.16),
            textAlign: 'center',
            width: shieldOuter,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1}
        >
          {achievementNameForLang(a, lang)}
        </Text>
      )}
    </TouchableOpacity>
  );
});

// ── Щит-значок с PNG фоном ────────────────────────────────────────────────────
function AchievementImageWithFallback({
  source,
  fallbackIconName,
  size,
  bodyHeight,
  tintColor,
  iconColor,
  opacity,
}: {
  source: any;
  fallbackIconName: string;
  size: number;
  bodyHeight: number;
  tintColor: string;
  iconColor: string;
  opacity: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [source]);

  return (
    <View style={{ width: size, height: bodyHeight, alignItems: 'center', justifyContent: 'center' }}>
      {(!source || imageFailed) ? (
        <View pointerEvents="none" style={{ width: size, height: bodyHeight, alignItems: 'center', justifyContent: 'center', position: 'absolute' }}>
          <Image
            source={require('../assets/images/levels/achivement.webp')}
            style={{ width: size, height: bodyHeight, tintColor, opacity: 0.82 }}
            resizeMode="contain"
            fadeDuration={0}
          />
          <Ionicons
            name={fallbackIconName as any}
            size={Math.round(size * 0.42)}
            color={iconColor}
            style={{ position: 'absolute' }}
          />
        </View>
      ) : null}
      {source && !imageFailed ? (
        <ExpoImage
          source={source}
          style={{ width: size, height: bodyHeight, opacity }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </View>
  );
}

function CategoryIconImageWithFallback({
  source,
  fallbackIconName,
  color,
}: {
  source?: any;
  fallbackIconName: string;
  color: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [source]);

  return (
    <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
      {(!source || imageFailed) ? (
        <View pointerEvents="none" style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', position: 'absolute' }}>
          <Ionicons name={fallbackIconName as any} size={17} color={color} />
        </View>
      ) : null}
      {source && !imageFailed ? (
        <ExpoImage
          source={source}
          style={{ width: 46, height: 46 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessible={false}
          transition={0}
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </View>
  );
}

function BadgeShieldInner({
  unlocked, inProgress, color, iconName, size, achievementId,
  isDark,
  gold,
}: {
  unlocked: boolean; inProgress: boolean; color: string;
  iconName: string; size: number; maskBg?: string; achievementId?: string;
  isDark: boolean;
  gold: string;
}) {
  const W      = size;
  const BODY_H = Math.round(W * 0.88);
  const ICON   = Math.round(W * 0.42);

  const isLocked  = !unlocked && !inProgress;
  // В светлых темах заблокированный щит — светло-серый, иконка чуть темнее
  const lockedTint  = isDark ? '#383838' : '#B0B0C0';
  const lockedIcon  = isDark ? '#383838' : '#FFFFFF';
  const tintColor = isLocked ? lockedTint : inProgress ? color + (isDark ? '55' : '88') : color;
  const iconColor = isLocked ? lockedIcon : inProgress ? color + (isDark ? 'BB' : 'CC') : '#fff';
  const specificImage = achievementId ? ACHIEVEMENT_IMAGE[achievementId] : null;
  const levelLabel = achievementId ? GEM_LEVEL_LABEL[achievementId] : null;

  if (specificImage) {
    return (
      <View style={{ width: W, alignItems: 'center' }}>
        <AchievementImageWithFallback
          source={specificImage}
          fallbackIconName={iconName}
          size={W}
          bodyHeight={BODY_H}
          tintColor={tintColor}
          iconColor={iconColor}
          opacity={isLocked ? 0.20 : inProgress ? 0.50 : 1}
        />
        {levelLabel && (
          <View style={{
            position: 'absolute', bottom: 2,
            backgroundColor: isLocked ? '#33333388' : inProgress ? '#00000066' : '#000000AA',
            borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
          }}>
            <Text style={{
              color: isLocked ? '#666' : inProgress ? '#aaa' : gold,
              fontSize: Math.max(8, Math.round(W * 0.22)),
              fontWeight: '900',
              letterSpacing: 0.5,
            }}>{levelLabel}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ width: W, alignItems: 'center' }}>
      {/* Изображение - achievement.png (щит как фон, окрашен в цвет) */}
      <View style={{ width: W, height: BODY_H, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* PNG изображение щита, окрашенное в цвет достижения */}
        <Image
          source={require('../assets/images/levels/achivement.webp')}
          style={{ width: W, height: BODY_H, tintColor }}
          resizeMode="contain"
        />
        {/* Иконка поверх щита */}
        <Ionicons
          name={iconName as any}
          size={ICON}
          color={iconColor}
          style={{ position: 'absolute' }}
        />
      </View>
    </View>
  );
}
export const BadgeShield = memo(BadgeShieldInner);

type NearestAchievementsBlockProps = {
  items: NearestAchievementItem<Achievement>[];
  lang: Lang;
  t: any;
  f: any;
  isDark: boolean;
  gold: string;
  onSelect: (achievement: Achievement) => void;
};

const NearestAchievementsBlock = memo(function NearestAchievementsBlock({
  items,
  lang,
  t,
  f,
  isDark,
  gold,
  onSelect,
}: NearestAchievementsBlockProps) {
  if (items.length === 0) return null;

  return (
    <View style={{ paddingTop: 2, paddingBottom: 14 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginBottom: 8 }}>
        {triLang(lang, {
          ru: 'Ближайшие награды',
          uk: 'Найближчі нагороди',
          es: 'Próximas recompensas',
          'pt-BR': 'Próximas recompensas',
          vi: 'Phần thưởng gần nhất',
          id: 'Hadiah terdekat',
          tr: 'Yakındaki ödüller',
          pl: 'Najbliższe nagrody',
        })}
      </Text>
      <View style={{ gap: 8 }}>
        {items.map(({ achievement, current, target, remaining, progressPct }) => {
          const color = achievementCategoryColor(achievement.category);
          const iconName = ACHIEVEMENT_ICON[achievement.id] ?? CAT_ICON[achievement.category] ?? 'star';
          const name = achievementNameForLang(achievement, lang);
          return (
            <TouchableOpacity
              key={achievement.id}
              activeOpacity={0.82}
              onPress={() => onSelect(achievement)}
              accessibilityRole="button"
              accessibilityLabel={name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 74,
                gap: 10,
                backgroundColor: glassFill(t.bgSurface, 0.46),
                borderRadius: 8,
                borderWidth: 0,
                borderColor: color + '44',
                paddingHorizontal: 10,
                paddingVertical: 9,
              }}
            >
              <BadgeShield
                unlocked={false}
                inProgress
                color={color}
                iconName={iconName}
                size={46}
                maskBg={t.bgCard}
                achievementId={achievement.id}
                isDark={isDark}
                gold={gold}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', flex: 1 }}
                  >
                    {name}
                  </Text>
                  <Text style={{ color, fontSize: Math.max(11, Math.min(f.sub, 13)), fontWeight: '900' }}>
                    {progressPct}%
                  </Text>
                </View>
                <View style={{ height: 7, backgroundColor: t.bgSurface2, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 7, width: `${progressPct}%` as any, backgroundColor: color, borderRadius: 4 }} />
                </View>
                <Text numberOfLines={1} style={{ color: t.textGhost, fontSize: Math.max(11, Math.min(f.sub, 13)) }}>
                  {current} / {target}
                  {remaining > 0
                    ? `  ·  ${triLang(lang, { ru: 'ещё', uk: 'ще', es: 'faltan', 'pt-BR': 'faltam', vi: 'còn', id: 'lagi', tr: 'kaldı', pl: 'jeszcze' })} ${remaining}`
                    : ''}
                </Text>
              </View>
              <View style={{ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

// ── Модальное окно ────────────────────────────────────────────────────────────
function AchievementModal({
  achievement, state, stats, t, f, isDark, themeMode, onClose, onShardClaimed, revealLockedDetails, studyTarget,
}: {
  achievement: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  t: any; f: any;
  isDark: boolean;
  themeMode: ThemeMode;
  onClose: () => void;
  onShardClaimed: (achievementId: string) => void;
  revealLockedDetails: boolean;
  studyTarget: RuntimeStudyTarget;
}) {
  const shardClaimTapGuardRef = useRef(false);
  const { lang } = useLang();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const unlocked = !!state?.unlockedAt;
  const pendingShard = hasPendingShardReward(state);
  const color    = achievementCategoryColor(achievement.category);
  const iconName = ACHIEVEMENT_ICON[achievement.id] ?? 'star';
  const name     = achievementNameForLang(achievement, lang);
  const desc     = achievementDescForLang(achievement, lang);
  const showLockedDetails = !achievement.secret || revealLockedDetails;
  const prog     = !unlocked && showLockedDetails
    ? getAchievementProgress(achievement.id, stats)
    : null;
  const progPct  = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

  const modalWidth = Math.min(560, Math.max(220, screenW - 32));
  const modalMaxHeight = Math.max(240, screenH - 48);
  const modalPad = screenW < 360 ? 18 : 24;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dateLocale = ACHIEVEMENT_DATE_LOCALES[lang];
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={{ width: modalWidth, maxHeight: modalMaxHeight }}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, width: '100%', maxHeight: modalMaxHeight, overflow: 'hidden', position: 'relative' }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              decelerationRate="normal"
              showsVerticalScrollIndicator
              contentContainerStyle={{ padding: modalPad, alignItems: 'center', gap: 12 }}
            >
            {/* Shield */}
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && showLockedDetails}
              color={color}
              iconName={iconName}
              size={72}
              maskBg={t.bgCard}
              achievementId={achievement.id}
              isDark={isDark}
              gold={t.gold}
            />

            {/* Name */}
            <Text style={{ color: unlocked ? color : t.textMuted, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
              {unlocked || showLockedDetails ? name : triLang(lang, {
                ru: 'Секретное достижение',
                uk: 'Секретне досягнення',
                es: 'Logro secreto',
                'pt-BR': 'Conquista secreta',
                vi: 'Thành tựu bí mật',
                id: 'Pencapaian rahasia',
                tr: 'Gizli başarı',
                pl: 'Tajne osiągnięcie',
              })}
            </Text>

            {/* Description */}
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22 }}>
              {unlocked || showLockedDetails ? desc : triLang(lang, {
                ru: 'Разблокируй, чтобы узнать',
                uk: 'Розблокуй, щоб дізнатись',
                es: 'Desbloquéalo para descubrirlo',
                'pt-BR': 'Desbloqueie para descobrir',
                vi: 'Mở khóa để xem',
                id: 'Buka untuk mengetahui',
                tr: 'Öğrenmek için aç',
                pl: 'Odblokuj, aby zobaczyć',
              })}
            </Text>

            {/* Date unlocked */}
            {unlocked && state?.unlockedAt && (
              <View style={{ backgroundColor: color + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color, fontSize: f.sub, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Получено', uk: 'Отримано', es: 'Obtenido', 'pt-BR': 'Obtido', vi: 'Đã nhận', id: 'Diperoleh', tr: 'Alındı', pl: 'Zdobyto' })} {formatDate(state.unlockedAt)}
                </Text>
              </View>
            )}

            {/* +1 осколок — выдача вручную */}
            {unlocked && (
              <View style={{
                width: '100%',
                backgroundColor: pendingShard ? t.correct + '18' : t.bgSurface2,
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
                gap: 10,
                borderWidth: pendingShard ? 1 : 0,
                borderColor: pendingShard ? t.correct + '55' : 'transparent',
              }}>
                <Image source={oskolokImageForPackShards(1)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityLabel={triLang(lang, { ru: 'Осколок', uk: 'Уламок', es: 'Fragmento', 'pt-BR': 'Fragmento', vi: 'Mảnh', id: 'Fragmen', tr: 'Parça', pl: 'Fragment' })} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, { ru: '+1 осколок знаний', uk: '+1 уламок знань', es: '+1 fragmento de conocimiento', 'pt-BR': '+1 fragmento de conhecimento', vi: '+1 mảnh tri thức', id: '+1 fragmen pengetahuan', tr: '+1 bilgi parçası', pl: '+1 fragment wiedzy' })}
                </Text>
                {pendingShard ? (
                  <TapScale
                    onPress={() => {
                      if (shardClaimTapGuardRef.current) return;
                      shardClaimTapGuardRef.current = true;
                      onShardClaimed(achievement.id);
                      void hapticSuccess();
                      void claimAchievementShardReward(achievement.id).finally(() => {
                        shardClaimTapGuardRef.current = false;
                      });
                    }}
                    style={{
                      backgroundColor: t.correct,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 28,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, { ru: 'Получить', uk: 'Забрати', es: 'Reclamar', 'pt-BR': 'Receber', vi: 'Nhận', id: 'Klaim', tr: 'Al', pl: 'Odbierz' })}
                    </Text>
                  </TapScale>
                ) : (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'Осколок получен', uk: 'Уламок отримано', es: 'Fragmento reclamado', 'pt-BR': 'Fragmento recebido', vi: 'Đã nhận mảnh', id: 'Fragmen diklaim', tr: 'Parça alındı', pl: 'Fragment odebrany' })}
                  </Text>
                )}
              </View>
            )}

            {/* Progress bar */}
            {prog && prog[1] > 0 && (
              <View style={{ width: '100%', gap: 6 }}>
                <View style={{ height: 8, backgroundColor: t.bgSurface2, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 4 }} />
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center' }}>
                  {prog[0]} / {prog[1]}
                  {prog[1] - prog[0] > 0 && progPct > 0 && (
                    `  ·  ${triLang(lang, { ru: 'ещё', uk: 'ще', es: 'faltan', 'pt-BR': 'faltam', vi: 'còn', id: 'lagi', tr: 'kaldı', pl: 'jeszcze' })} ${prog[1] - prog[0]}`
                  )}
                </Text>
              </View>
            )}

            {/* Share (only for unlocked) */}
            {unlocked && (
              <>
              <TapScale
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                onPress={async () => {
                  const msg = buildAchievementShareMessage(lang, name, STORE_URL);
                  const result = await Share.share({ message: msg }).catch(() => null);
                  if (result?.action === 'sharedAction') {
                    void checkAchievements({ type: 'achievement_shared', studyTarget });
                  }
                }}
              >
                <Ionicons name="share-outline" size={16} color={t.textSecond}/>
                <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                  {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' })}
                </Text>
              </TapScale>
              </>
            )}

            {/* Close */}
            <TapScale
              onPress={onClose}
              style={{ backgroundColor: t.bgSurface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              </Text>
            </TapScale>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Секция-аккордеон ──────────────────────────────────────────────────────────
type AccordionSectionProps = {
  section: AchievementListSection;
  isOpen: boolean;
  onToggle: () => void;
  gridMetrics: AchievementGridMetrics;
  stateMap: Map<string, AchievementState>;
  stats: AchievementStats;
  lang: Lang;
  t: any;
  f: any;
  isDark: boolean;
  gold: string;
  onSelect: (a: Achievement) => void;
  revealLockedDetails: boolean;
  themeMode: ThemeMode;
};

const AccordionSection = memo(function AccordionSection({
  section,
  isOpen,
  onToggle,
  gridMetrics,
  stateMap,
  stats,
  lang,
  t,
  f,
  isDark,
  gold,
  onSelect,
  revealLockedDetails,
  themeMode,
}: AccordionSectionProps) {
  const sectionSurfaceColors: readonly [string, string, string] = isOpen
    ? [section.color + '24', t.bgCard, t.bgSurface]
    : [section.color + '14', glassFill(t.bgSurface, 0.72), t.bgSurface];
  return (
    <View style={{ marginBottom: 8 }}>
      {/* Заголовок-полоска */}
      <LinearGradient
        testID="achievements-section-surface"
        colors={sectionSurfaceColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 14, overflow: 'hidden' }}
      >
      <View pointerEvents="none" style={[sectionHighlightStyle, { backgroundColor: section.color + '70' }]} />
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: 'transparent',
          borderRadius: 14,
          borderWidth: 0,
        }}
      >
        <View style={{
          width: section.catIconImage ? 46 : 32,
          height: section.catIconImage ? 46 : 32,
          borderRadius: section.catIconImage ? 14 : 10,
          backgroundColor: section.catIconImage ? 'transparent' : section.color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {section.catIconImage ? (
            <CategoryIconImageWithFallback
              source={section.catIconImage}
              fallbackIconName={section.catIcon}
              color={section.color}
            />
          ) : (
            <Ionicons name={section.catIcon as any} size={17} color={section.color} />
          )}
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}>
          {section.title}
        </Text>
        <Text style={{ color: t.textGhost, fontSize: f.sub }}>
          {achievementCountPairLabel(section.catUnlocked, section.catTotal, lang)}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={t.textGhost}
        />
      </TouchableOpacity>
      </LinearGradient>

      {/* Сетка достижений — только когда раскрыто */}
      {isOpen && (
        <View style={{ paddingTop: 14, paddingHorizontal: 2, gap: 16 }}>
          {section.data.map(row => (
            <View key={row.rowKey} style={{ flexDirection: 'row', gap: gridMetrics.gap }}>
              {row.items.map(a => (
                <AchievementGridCell
                  key={a.id}
                  a={a}
                  state={stateMap.get(a.id)}
                  stats={stats}
                  color={section.color}
                  categoryIconDefault={section.catIcon}
                  lang={lang}
                  t={t}
                  f={f}
                  isDark={isDark}
                  gold={gold}
                  shieldW={gridMetrics.shieldW}
                  shieldOuter={gridMetrics.shieldOuter}
                  onSelect={onSelect}
                  revealLockedDetails={revealLockedDetails}
                  themeMode={themeMode}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const router          = useRouter();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const { lang }        = useLang();
  const { studyTarget } = useStudyTarget();
  const { width: screenW } = useWindowDimensions();
  const gold            = t.gold;
  const gridMetrics = useMemo(() => getAchievementGridMetrics(screenW), [screenW]);
  const isUK = lang === 'uk';

  const [states, setStates]   = useState<AchievementState[]>([]);
  const [stats, setStats]     = useState<AchievementStats>(emptyAchievementStats());
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [devShowAllAchievements, setDevShowAllAchievements] = useState(false);

  useEffect(() => {
    checkAchievements({ type: 'backfill', studyTarget })
      .then(() => loadAchievementStates())
      .then(setStates)
      .catch(() => {
        loadAchievementStates().then(setStates);
      });
    const interaction = InteractionManager.runAfterInteractions(() => {
      loadAchievementStats().then(setStats);
    });
    return () => interaction.cancel();
  }, [studyTarget]);

  const onSelectAchievement = useCallback((a: Achievement) => {
    setSelected(a);
  }, []);

  const onShardClaimedUpdate = useCallback((achievementId: string) => {
    setStates(prev => prev.map(s => (s.id === achievementId ? { ...s, shardClaimed: true } : s)));
  }, []);

  const stateMap = useMemo(() => new Map(states.map(s => [s.id, s])), [states]);
  const showAllAchievements = ENABLE_DEV_TOOLS && devShowAllAchievements;
  const visibleAchievementDefinitions = useMemo(() =>
    ALL_ACHIEVEMENTS.filter(a => isVisibleAchievement(a, stateMap)),
  [stateMap]);
  const nearestAchievements = useMemo(() =>
    getNearestLockedAchievements(
      visibleAchievementDefinitions,
      new Set(states.filter(s => s.unlockedAt !== null).map(s => s.id)),
      id => getAchievementProgress(id, stats),
    ),
  [states, stats, visibleAchievementDefinitions]);

  const achievementSections = useMemo((): AchievementListSection[] => {
    const sections = CATEGORIES.flatMap(cat => {
      const color = achievementCategoryColor(cat, themeMode);
      const catIcon = CAT_ICON[cat];
      const catIconImage = CAT_ICON_IMAGE[cat];
      const title = triLang(lang, { ru: CAT_LABEL_RU[cat], uk: CAT_LABEL_UK[cat], es: CAT_LABEL_ES[cat], 'pt-BR': CAT_LABEL_PTBR[cat], vi: CAT_LABEL_VI[cat], id: CAT_LABEL_ID[cat], tr: CAT_LABEL_TR[cat], pl: CAT_LABEL_PL[cat] });
      const allCatAchs = visibleAchievementDefinitions.filter(a => a.category === cat);
      const catAchs = allCatAchs.filter(a => showAllAchievements || !!stateMap.get(a.id)?.unlockedAt);
      if (catAchs.length === 0) return [];
      const catUnlocked = allCatAchs.filter(a => !!stateMap.get(a.id)?.unlockedAt).length;
      const rows: AchievementGridRow[] = [];
      for (let i = 0; i < catAchs.length; i += gridMetrics.cols) {
        const chunk = catAchs.slice(i, i + gridMetrics.cols);
        rows.push({ rowKey: `${cat}-${i}`, items: chunk });
      }
      return {
        key: cat,
        title,
        color,
        catIcon,
        catIconImage,
        catUnlocked,
        catTotal: showAllAchievements ? allCatAchs.length : catUnlocked,
        data: rows,
      };
    });
    return sections;
  }, [gridMetrics.cols, lang, showAllAchievements, stateMap, themeMode, visibleAchievementDefinitions]);

  const handleToggle = useCallback((cat: string) => {
    setOpenCategory(prev => (prev === cat ? null : cat));
  }, []);

  const unlockedCount = visibleAchievementDefinitions.filter(a => !!stateMap.get(a.id)?.unlockedAt).length;
  const totalCount = visibleAchievementDefinitions.length;
  const visibleCountLabel = showAllAchievements
    ? achievementCountPairLabel(unlockedCount, totalCount, lang)
    : achievementCountLabel(unlockedCount, lang);
  const headerCountLabel = showAllAchievements
    ? `${unlockedCount}/${totalCount}`
    : String(unlockedCount);

  return (
    <ScreenGradient artBackdrop="achievements">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>

        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TapScale onPress={() => safeRouterBack(router)} style={{ flexShrink: 0 }}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TapScale>
          <View style={{ flex: 1, marginLeft: 8, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', lineHeight: Math.round(f.h2 * 1.15) }}
            >
              {triLang(lang, { ru: 'Достижения', uk: 'Досягнення', es: 'Logros', 'pt-BR': 'Conquistas', vi: 'Thành tựu', id: 'Pencapaian', tr: 'Başarılar', pl: 'Osiągnięcia' })}
            </Text>
            <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: f.sub }}>
              {visibleCountLabel}
            </Text>
          </View>
          {ENABLE_DEV_TOOLS && (
            <TouchableOpacity
              testID="achievements-dev-show-all-toggle"
              onPress={() => setDevShowAllAchievements(prev => !prev)}
              activeOpacity={0.8}
              style={{
                backgroundColor: showAllAchievements ? t.gold + '22' : t.bgCard,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: showAllAchievements ? t.gold + '77' : t.bgSurface2,
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              <Text numberOfLines={1} style={{ color: showAllAchievements ? t.gold : t.textSecond, fontWeight: '900', fontSize: Math.max(11, Math.min(f.sub, 14)) }}>
                {showAllAchievements ? 'DEV: все' : 'DEV'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ backgroundColor: t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0 }}>
            <Text numberOfLines={1} style={{ color: t.textSecond, fontWeight: '800', fontSize: Math.max(12, Math.min(f.body, 15)) }}>
              {headerCountLabel}
            </Text>
          </View>
        </View>

        {/* Аккордеон-список категорий */}
        <SectionList<AchievementListSection, { key: string; data: AchievementListSection[] }>
          sections={[{ key: 'cats', data: achievementSections }]}
          keyExtractor={item => item.key}
          removeClippedSubviews={false}
          renderItem={({ item }) => (
            <AccordionSection
              section={item}
              isOpen={openCategory === item.key}
              onToggle={() => handleToggle(item.key)}
              gridMetrics={gridMetrics}
              stateMap={stateMap}
              stats={stats}
              lang={lang}
              t={t}
              f={f}
              isDark={isDark}
              gold={gold}
              onSelect={onSelectAchievement}
              revealLockedDetails={showAllAchievements}
              themeMode={themeMode}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 0 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={nearestAchievements.length > 0 ? (
            <NearestAchievementsBlock
              items={nearestAchievements}
              lang={lang}
              t={t}
              f={f}
              isDark={isDark}
              gold={gold}
              onSelect={onSelectAchievement}
            />
          ) : null}
          ListEmptyComponent={(
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
              <Ionicons name="trophy-outline" size={42} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Пока нет полученных наград', uk: 'Поки немає отриманих нагород', es: 'Aún no tienes recompensas', 'pt-BR': 'Ainda não há recompensas recebidas', vi: 'Chưa có phần thưởng nào', id: 'Belum ada hadiah yang diterima', tr: 'Henüz alınan ödül yok', pl: 'Nie masz jeszcze zdobytych nagród' })}
              </Text>
            </View>
          )}
          ListFooterComponent={(
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ReportErrorButton
                screen="achievements"
                dataId="achievements_grid"
                dataText={triLang(lang, {
                  ru: 'Достижения',
                  uk: 'Досягнення',
                  es: 'Logros',
                  'pt-BR': 'Conquistas',
                  vi: 'Thành tựu',
                  id: 'Pencapaian',
                  tr: 'Başarılar',
                  pl: 'Osiągnięcia',
                })}
              />
            </View>
          )}
        />

      </ContentWrap>

      {/* Модальное окно */}
      {selected && isVisibleAchievement(selected, stateMap) && (
        <AchievementModal
          achievement={selected}
          state={stateMap.get(selected.id)}
          stats={stats}
          t={t} f={f}
          isDark={isDark}
          themeMode={themeMode}
          onClose={() => setSelected(null)}
          onShardClaimed={onShardClaimedUpdate}
          revealLockedDetails={showAllAchievements}
          studyTarget={studyTarget}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}

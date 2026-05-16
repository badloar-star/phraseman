import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, Modal, Dimensions, Pressable, Image,
  InteractionManager,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
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
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess } from '../hooks/use-haptics';
import { STORE_URL, DEV_MODE } from './config';
import { usePremium } from '../components/PremiumContext';
import { oskolokImageForPackShards } from './oskolok';
import { buildAchievementShareMessage } from './achievement_share';

const { width: SW } = Dimensions.get('window');
const COLS = 4;
const SHIELD_OUTER = Math.floor((SW - 32 - (COLS - 1) * 10) / COLS);
const SHIELD_W = SHIELD_OUTER - 4;

interface AchievementStats {
  streak: number;
  loginDays: number;
  lessons: number;
  perfectLessons: number;
  xp: number;
  recallCorrect: number;
  arenaWins: number;
  shards: number;
}

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    const [streakRaw, loginRaw, xpRaw, recallRaw, arenaWinsRaw, shardsRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('login_bonus_v1'),
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('achievement_active_recall_correct_count'),
      AsyncStorage.getItem('achievement_arena_win_count'),
      AsyncStorage.getItem('shards_balance'),
    ]);
    const streak = parseInt(streakRaw || '0') || 0;
    const xp = parseInt(xpRaw || '0') || 0;
    const recallCorrect = parseInt(recallRaw || '0') || 0;
    const arenaWins = parseInt(arenaWinsRaw || '0') || 0;
    const shards = parseInt(shardsRaw || '0') || 0;
    let loginDays = 0;
    try { loginDays = loginRaw ? JSON.parse(loginRaw).consecutiveDays || 0 : 0; } catch {}
    let lessons = 0, perfectLessons = 0;
    try {
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
      for (const [, saved] of lessonEntries) {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct >= 45) {
            lessons++;
            if (p.filter(x => x === 'wrong').length === 0) perfectLessons++;
          }
        }
      }
    } catch {}
    return { streak, loginDays, lessons, perfectLessons, xp, recallCorrect, arenaWins, shards };
  } catch { return { streak: 0, loginDays: 0, lessons: 0, perfectLessons: 0, xp: 0, recallCorrect: 0, arenaWins: 0, shards: 0 }; }
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
  if (id === 'lesson_perfect') return [Math.min(stats.perfectLessons, 1), 1];
  if (id === 'lesson_perfect3') return [Math.min(stats.perfectLessons, 3), 3];
  if (id === 'lesson_all_perfect') return [Math.min(stats.perfectLessons, 32), 32];
  if (id.startsWith('xp_')) {
    const n = parseInt(id.replace('xp_', ''));
    if (!isNaN(n)) return [Math.min(stats.xp, n), n];
  }
  if (id === 'recall_first') return [Math.min(stats.recallCorrect, 1), 1];
  if (id === 'recall_50') return [Math.min(stats.recallCorrect, 50), 50];
  if (id === 'arena_first_win') return [Math.min(stats.arenaWins, 1), 1];
  if (id === 'arena_10_wins') return [Math.min(stats.arenaWins, 10), 10];
  if (id === 'shards_100') return [Math.min(stats.shards, 100), 100];
  return null;
}

/** Квизы Medium/Hard без Premium недоступны — эти ачивки открываются с подпиской. */
const PREMIUM_QUIZ_ACHIEVEMENT_IDS = new Set([
  'quiz_medium',
  'quiz_hard',
  'quiz_all_levels',
  'quiz_perfect_medium',
  'quiz_perfect',
  'quiz_triple_perfect',
  'quiz_speed_demon',
]);

export function achievementNeedsPremiumQuiz(id: string): boolean {
  return PREMIUM_QUIZ_ACHIEVEMENT_IDS.has(id);
}

// Лейбл уровня для медалей (gem_*)
const GEM_LEVEL_LABEL: Record<string, string> = {
  gem_a1_ruby: 'A1', gem_a1_emerald: 'A1', gem_a1_diamond: 'A1',
  gem_a2_ruby: 'A2', gem_a2_emerald: 'A2', gem_a2_diamond: 'A2',
  gem_b1_ruby: 'B1', gem_b1_emerald: 'B1', gem_b1_diamond: 'B1',
  gem_b2_ruby: 'B2', gem_b2_emerald: 'B2', gem_b2_diamond: 'B2',
};

// ── PNG-изображения для каждого достижения ───────────────────────────────────
export const ACHIEVEMENT_IMAGE: Record<string, any> = {
  streak_3:            require('../assets/images/levels/pervie tri.webp'),
  streak_7:            require('../assets/images/levels/odna nedelya.webp'),
  streak_14:           require('../assets/images/levels/dve nedeli.webp'),
  streak_30:           require('../assets/images/levels/mesyac v strou.webp'),
  streak_60:           require('../assets/images/levels/dva mesyaca.webp'),
  streak_100:          require('../assets/images/levels/sto dney.webp'),
  streak_200:          require('../assets/images/levels/200 dney.webp'),
  streak_365:          require('../assets/images/levels/tseliy god.webp'),
  streak_500:          require('../assets/images/levels/500 dney.webp'),
  streak_repair:       require('../assets/images/levels/fenix.webp'),
  perfect_week:        require('../assets/images/levels/idealnaya nedelya.webp'),
  lesson_1:            require('../assets/images/levels/perviy shag.webp'),
  lesson_3:            require('../assets/images/levels/tri uroka.webp'),
  lesson_5:            require('../assets/images/levels/5 urokov.webp'),
  lesson_10:           require('../assets/images/levels/10 urokov.webp'),
  lesson_15:           require('../assets/images/levels/15 urokov.webp'),
  lesson_20:           require('../assets/images/levels/dvadtsyaty 20 urokov.webp'),
  lesson_all:          require('../assets/images/levels/polniy kurs.webp'),
  lesson_perfect:      require('../assets/images/levels/ni odnoy oshibky.webp'),
  lesson_perfect3:     require('../assets/images/levels/3 idealnych uroka.webp'),
  lesson_all_perfect:  require('../assets/images/levels/absolut.webp'),
  xp_100:              require('../assets/images/levels/pervaya sotnya.webp'),
  xp_250:              require('../assets/images/levels/250 opita.webp'),
  xp_500:              require('../assets/images/levels/500 opita.webp'),
  xp_1000:             require('../assets/images/levels/tosyachnic.webp'),
  xp_2500:             require('../assets/images/levels/2500 opyta.webp'),
  xp_5000:             require('../assets/images/levels/5 tisyach opita.webp'),
  xp_10000:            require('../assets/images/levels/10 tisyach opita.webp'),
  xp_20000:            require('../assets/images/levels/20 tisyach opita.webp'),
  xp_50000:            require('../assets/images/levels/pol sotny tisyach opita.webp'),
  xp_100000:           require('../assets/images/levels/legenda.webp'),
  wager_win:           require('../assets/images/levels/risknul pobedil.webp'),
  personal_best:       require('../assets/images/levels/luchsaya nedelya.webp'),
  quiz_first:          require('../assets/images/levels/perviy kviz.webp'),
  quiz_medium:         require('../assets/images/levels/sredniy uroven.webp'),
  quiz_hard:           require('../assets/images/levels/prinyal vyzov.webp'),
  quiz_all_levels:     require('../assets/images/levels/polniy nabor.webp'),
  quiz_perfect_easy:   require('../assets/images/levels/legky odeal.webp'),
  quiz_perfect:        require('../assets/images/levels/zhelezny nervy.webp'),
  quiz_perfect_medium: require('../assets/images/levels/metky strelok.webp'),
  quiz_triple_perfect: require('../assets/images/levels/trizhdy ideal.webp'),
  quiz_speed_demon:    require('../assets/images/levels/skorostboy.webp'),
  combo_3:             require('../assets/images/levels/v potoke.webp'),
  combo_10:            require('../assets/images/levels/sniper.webp'),
  combo_20:            require('../assets/images/levels/nesokrushimiy.webp'),
  combo_50:            require('../assets/images/levels/mashina.webp'),
  combo_100:           require('../assets/images/levels/nepobedimiy.webp'),
  daily_task_first:    require('../assets/images/levels/pervoe zadanie.webp'),
  all_daily:           require('../assets/images/levels/vse za den.webp'),
  daily_phrase_first:  require('../assets/images/levels/dayly phrase coral.webp'),
  daily_phrase_save:   require('../assets/images/levels/dayly phrase ocean.webp'),
  login_7:             require('../assets/images/levels/verny uchenic.webp'),
  login_14:            require('../assets/images/levels/2 nedely (osobie).webp'),
  login_30:            require('../assets/images/levels/mesyac v prilozhenii.webp'),
  login_60:            require('../assets/images/levels/2 mesyaca v prilozhenii.webp'),
  login_365:           require('../assets/images/levels/tseliy god v prilozhenii.webp'),
  comeback:            require('../assets/images/levels/vozvrashenie korolya.webp'),
  diagnosis:           require('../assets/images/levels/diagnoz postavlen.webp'),
  night_owl:           require('../assets/images/levels/nochnoy filin.webp'),
  early_bird:          require('../assets/images/levels/nabbiy podiem.webp'),
  exam_first:          require('../assets/images/levels/ekzamenator.webp'),
  exam_ace:            require('../assets/images/levels/otlychink.webp'),
  flashcards_session:  require('../assets/images/levels/kartzhnik.webp'),
  recall_first:        require('../assets/images/levels/active recall coral.webp'),
  recall_50:           require('../assets/images/levels/active recall forest.webp'),
  arena_first_win:     require('../assets/images/levels/ARENA  ICON.webp'),
  arena_10_wins:       require('../assets/images/levels/ARENA GOLD 1.webp'),
  shards_100:          require('../assets/images/levels/OSKOLOK 80.webp'),
  gem_a1_ruby:         require('../assets/images/levels/rubin.webp'),
  gem_a1_emerald:      require('../assets/images/levels/izumrud.webp'),
  gem_a1_diamond:      require('../assets/images/levels/almaz.webp'),
  gem_a2_ruby:         require('../assets/images/levels/rubin.webp'),
  gem_a2_emerald:      require('../assets/images/levels/izumrud.webp'),
  gem_a2_diamond:      require('../assets/images/levels/almaz.webp'),
  gem_b1_ruby:         require('../assets/images/levels/rubin.webp'),
  gem_b1_emerald:      require('../assets/images/levels/izumrud.webp'),
  gem_b1_diamond:      require('../assets/images/levels/almaz.webp'),
  gem_b2_ruby:         require('../assets/images/levels/rubin.webp'),
  gem_b2_emerald:      require('../assets/images/levels/izumrud.webp'),
  gem_b2_diamond:      require('../assets/images/levels/almaz.webp'),
  gem_all_complete:    require('../assets/images/levels/polniy nabor.webp'),
  social_friend_first: require('../assets/images/levels/dialog coral.webp'),
  social_friends_3:    require('../assets/images/levels/dialog ocean.webp'),
  social_friends_10:   require('../assets/images/levels/dialog forest.webp'),
  social_gift_send:    require('../assets/images/levels/GIF COMMON.webp'),
  social_gift_5:       require('../assets/images/levels/GIFT PREMIUM.webp'),
  social_like_received: require('../assets/images/levels/achivement.webp'),
  arena_streak_5:      require('../assets/images/levels/ARENA GOLD 1.webp'),
  arena_streak_10:     require('../assets/images/levels/ARENA LEGEND 1.webp'),
  arena_duel_friend:   require('../assets/images/levels/ARENA  ICON.webp'),
  arena_wager_win:     require('../assets/images/levels/ARENA NEON.webp'),
  arena_wager_5:       require('../assets/images/levels/ARENA GRAND 1.webp'),
  trainer_session:     require('../assets/images/levels/active recall coral.webp'),
  trainer_100_correct: require('../assets/images/levels/active recall forest.webp'),
  avatar_custom:       require('../assets/images/levels/professor.webp'),
  profile_themed:      require('../assets/images/levels/achivement.webp'),
  pack_purchased:      require('../assets/images/levels/cards coral.webp'),
  pack_5_purchased:    require('../assets/images/levels/cards forest.webp'),
  share_achievement:   require('../assets/images/levels/dialog neon.webp'),
  level_50:            require('../assets/images/levels/legenda.webp'),
  xp_75000:            require('../assets/images/levels/pol sotny tisyach opita.webp'),
  quiz_10_completed:   require('../assets/images/levels/quizes coral.webp'),
  arena_streak_freeze: require('../assets/images/levels/fenix.webp'),
  wager_win_3:         require('../assets/images/levels/risknul pobedil.webp'),
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
  quiz_first:          'help-circle',
  quiz_medium:         'flame',
  quiz_hard:           'skull',
  quiz_all_levels:     'albums',
  quiz_perfect_easy:   'checkmark-circle',
  quiz_perfect:        'aperture',
  quiz_perfect_medium: 'radio-button-on',
  quiz_triple_perfect: 'star',
  quiz_speed_demon:    'flash',
  combo_3:            'git-merge',
  combo_10:           'radio-button-on',
  combo_20:           'shield',
  combo_50:           'flash',
  combo_100:          'nuclear',
  daily_task_first:   'checkmark-circle',
  all_daily:          'albums',
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
  recall_first:       'bulb',
  recall_50:          'library',
  arena_first_win:    'trophy',
  arena_10_wins:      'shield-checkmark',
  shards_100:         'diamond',
  gem_all_complete:   'trophy',
};

// ── Цвет категории ────────────────────────────────────────────────────────────
export const CAT_COLOR: Record<string, string> = {
  streak:  '#FF6B35',
  lessons: '#3B82F6',
  xp:      '#F59E0B',
  quiz:    '#8B5CF6',
  combo:   '#EC4899',
  special: '#10B981',
  medal:   '#E11D48',
};
const CAT_ICON: Record<string, any> = {
  streak:  'flame',
  lessons: 'book',
  xp:      'star',
  quiz:    'help-circle',
  combo:   'flash',
  special: 'rocket',
  medal:   'diamond',
};
const CAT_LABEL_RU: Record<string, string> = {
  streak: 'Цепочка', lessons: 'Уроки', xp: 'Опыт',
  quiz: 'Квизы', combo: 'Серии', special: 'Особые', medal: 'Медали',
};
const CAT_LABEL_UK: Record<string, string> = {
  streak: 'Ланцюжок', lessons: 'Уроки', xp: 'Досвід',
  quiz: 'Квізи', combo: 'Серії', special: 'Особливі', medal: 'Медалі',
};
const CAT_LABEL_ES: Record<string, string> = {
  streak: 'Racha', lessons: 'Lecciones', xp: 'Experiencia',
  quiz: 'Cuestionarios', combo: 'Series', special: 'Especiales', medal: 'Medallas',
};

const CATEGORIES = ['streak', 'lessons', 'xp', 'quiz', 'combo', 'special', 'medal'] as const;

type AchievementGridRow = { rowKey: string; items: Achievement[] };

type AchievementListSection = {
  key: string;
  title: string;
  color: string;
  catIcon: string;
  catUnlocked: number;
  catTotal: number;
  data: AchievementGridRow[];
};

function achievementCountLabel(count: number, lang: Lang): string {
  const n = Math.max(0, count);
  if (lang === 'uk') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    const word = mod10 === 1 && mod100 !== 11
      ? 'нагорода'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'нагороди'
        : 'нагород';
    return `${n} ${word}`;
  }
  if (lang === 'es') return `${n} recompensa${n === 1 ? '' : 's'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'награда'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'награды'
      : 'наград';
  return `${n} ${word}`;
}

type GridCellProps = {
  a: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  color: string;
  fallbackCatIcon: string;
  lang: Lang;
  t: any;
  f: any;
  isDark: boolean;
  gold: string;
  shieldW: number;
  shieldOuter: number;
  onSelect: (achievement: Achievement) => void;
  /** Показать метку Premium (квизы средний/сложный только по подписке). */
  showPremiumQuizGate: boolean;
};

const AchievementGridCell = memo(function AchievementGridCell({
  a,
  state,
  stats,
  color,
  fallbackCatIcon,
  lang,
  t,
  f,
  isDark,
  gold,
  shieldW,
  shieldOuter,
  onSelect,
  showPremiumQuizGate,
}: GridCellProps) {
  const unlocked = !!state?.unlockedAt;
  const isLocked = !unlocked && !!a.secret;
  const inProgress = !unlocked && !a.secret;
  const iconName = ACHIEVEMENT_ICON[a.id] ?? fallbackCatIcon;
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
        paddingBottom: showPremiumQuizGate ? 12 : 0,
      }}
    >
      <View style={{ position: 'relative' }}>
        {showPremiumQuizGate && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -2,
              left: 0,
              right: 0,
              alignItems: 'center',
              zIndex: 5,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: isDark ? '#6D28D9EE' : '#7C3AED',
                borderWidth: 1,
                borderColor: isDark ? '#A78BFA55' : '#FFFFFF66',
              }}
            >
              <Ionicons name="diamond" size={9} color="#FDE68A" />
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#FEF3C7' }} maxFontSizeMultiplier={1.1}>
                {triLang(lang, { ru: 'Премиум', uk: 'Преміум', es: 'Premium' })}
              </Text>
            </View>
          </View>
        )}
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
              borderWidth: 1.5,
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

      {!isLocked && (
        <Text
          style={{
            color: unlocked ? t.textPrimary : t.textGhost,
            fontSize: f.label,
            lineHeight: Math.round(f.label * 1.16),
            textAlign: 'center',
            width: shieldOuter,
          }}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          maxFontSizeMultiplier={1}
        >
          {achievementNameForLang(a, lang)}
        </Text>
      )}
    </TouchableOpacity>
  );
});

// ── Щит-значок с PNG фоном ────────────────────────────────────────────────────
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
        <Image
          source={specificImage}
          style={{ width: W, height: BODY_H, opacity: isLocked ? 0.20 : inProgress ? 0.50 : 1 }}
          resizeMode="contain"
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

// ── Модальное окно ────────────────────────────────────────────────────────────
function AchievementModal({
  achievement, state, stats, t, f, isDark, onClose, onShardClaimed, isPremium,
}: {
  achievement: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  t: any; f: any;
  isDark: boolean;
  onClose: () => void;
  onShardClaimed: (achievementId: string) => void;
  isPremium: boolean;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const { lang } = useLang();
  const unlocked = !!state?.unlockedAt;
  const pendingShard = hasPendingShardReward(state);
  const color    = CAT_COLOR[achievement.category] ?? '#888';
  const iconName = ACHIEVEMENT_ICON[achievement.id] ?? 'star';
  const name     = achievementNameForLang(achievement, lang);
  const desc     = achievementDescForLang(achievement, lang);
  const prog     = !unlocked && !achievement.secret
    ? getAchievementProgress(achievement.id, stats)
    : null;
  const progPct  = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

  const showPremiumQuizCta =
    !unlocked &&
    achievementNeedsPremiumQuiz(achievement.id) &&
    !isPremium &&
    !DEV_MODE;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 24, alignItems: 'center', width: SW - 48, gap: 12, position: 'relative' }}>
            {/* Shield */}
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && !achievement.secret}
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
              {unlocked || !achievement.secret ? name : triLang(lang, {
                ru: 'Секретное достижение',
                uk: 'Секретне досягнення',
                es: 'Logro secreto',
              })}
            </Text>

            {/* Description */}
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22 }}>
              {unlocked || !achievement.secret ? desc : triLang(lang, {
                ru: 'Разблокируй, чтобы узнать',
                uk: 'Розблокуй, щоб дізнатись',
                es: 'Desbloquéalo para descubrirlo',
              })}
            </Text>

            {showPremiumQuizCta && (
              <View style={{
                width: '100%',
                backgroundColor: (isDark ? '#6D28D9' : '#7C3AED') + '22',
                borderRadius: 14,
                padding: 14,
                gap: 10,
                borderWidth: 1,
                borderColor: (isDark ? '#A78BFA' : '#7C3AED') + '44',
              }}>
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Нужен Premium: уровни Medium и Hard в квизах открываются по подписке.',
                    uk: 'Потрібен Premium: рівні Medium і Hard у квізах відкриваються за підпискою.',
                    es: 'Requiere Premium: los niveles Medium y Hard del cuestionario están en la suscripción.',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/premium_modal', params: { context: 'quiz_level' } } as any);
                  }}
                  style={{
                    backgroundColor: isDark ? '#6D28D9' : '#7C3AED',
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FEF3C7', fontSize: f.body, fontWeight: '800' }}>
                    {triLang(lang, { ru: 'Оформить Premium', uk: 'Оформити Premium', es: 'Conseguir Premium' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Date unlocked */}
            {unlocked && state?.unlockedAt && (
              <View style={{ backgroundColor: color + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color, fontSize: f.sub, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Получено', uk: 'Отримано', es: 'Obtenido' })} {formatDate(state.unlockedAt)}
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
                <Image source={oskolokImageForPackShards(1)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityLabel={triLang(lang, { ru: 'Осколок', uk: 'Осколок', es: 'Fragmento' })} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, { ru: '+1 осколок знаний', uk: '+1 осколок знань', es: '+1 fragmento de conocimiento' })}
                </Text>
                {pendingShard ? (
                  <TouchableOpacity
                    disabled={claiming}
                    onPress={async () => {
                      if (claiming) return;
                      setClaiming(true);
                      try {
                        const ok = await claimAchievementShardReward(achievement.id);
                        if (ok) {
                          void hapticSuccess();
                          onShardClaimed(achievement.id);
                        }
                      } finally {
                        setClaiming(false);
                      }
                    }}
                    style={{
                      backgroundColor: t.correct,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 28,
                      opacity: claiming ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, { ru: 'Получить', uk: 'Забрати', es: 'Reclamar' })}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'Осколок получен', uk: 'Осколок отримано', es: 'Fragmento reclamado' })}
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
                    `  ·  ${triLang(lang, { ru: 'ещё', uk: 'ще', es: 'faltan' })} ${prog[1] - prog[0]}`
                  )}
                </Text>
              </View>
            )}

            {/* Share (only for unlocked) */}
            {unlocked && (
              <>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                onPress={async () => {
                  const msg = buildAchievementShareMessage(lang, name, STORE_URL);
                  const result = await Share.share({ message: msg }).catch(() => null);
                  if (result?.action === 'sharedAction') {
                    void checkAchievements({ type: 'achievement_shared' });
                  }
                }}
              >
                <Ionicons name="share-outline" size={16} color={t.textSecond}/>
                <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                  {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
                </Text>
              </TouchableOpacity>
              </>
            )}

            {/* Close */}
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: t.bgSurface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' })}
              </Text>
            </TouchableOpacity>
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
  stateMap: Map<string, AchievementState>;
  stats: AchievementStats;
  lang: Lang;
  t: any;
  f: any;
  isDark: boolean;
  gold: string;
  premiumQuizHintDisabled: boolean;
  onSelect: (a: Achievement) => void;
};

const AccordionSection = memo(function AccordionSection({
  section,
  isOpen,
  onToggle,
  stateMap,
  stats,
  lang,
  t,
  f,
  isDark,
  gold,
  premiumQuizHintDisabled,
  onSelect,
}: AccordionSectionProps) {
  return (
    <View style={{ marginBottom: 8 }}>
      {/* Заголовок-полоска */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.75}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: isOpen ? section.color + '18' : t.bgCard,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isOpen ? section.color + '44' : t.bgSurface2,
        }}
      >
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: section.color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Ionicons name={section.catIcon as any} size={17} color={section.color} />
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}>
          {section.title}
        </Text>
        <Text style={{ color: t.textGhost, fontSize: f.sub }}>
          {achievementCountLabel(section.catUnlocked, lang)}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={t.textGhost}
        />
      </TouchableOpacity>

      {/* Сетка достижений — только когда раскрыто */}
      {isOpen && (
        <View style={{ paddingTop: 14, paddingHorizontal: 2, gap: 16 }}>
          {section.data.map(row => (
            <View key={row.rowKey} style={{ flexDirection: 'row', gap: 10 }}>
              {row.items.map(a => (
                <AchievementGridCell
                  key={a.id}
                  a={a}
                  state={stateMap.get(a.id)}
                  stats={stats}
                  color={section.color}
                  fallbackCatIcon={section.catIcon}
                  lang={lang}
                  t={t}
                  f={f}
                  isDark={isDark}
                  gold={gold}
                  shieldW={SHIELD_W}
                  shieldOuter={SHIELD_OUTER}
                  onSelect={onSelect}
                  showPremiumQuizGate={
                    !premiumQuizHintDisabled &&
                    !stateMap.get(a.id)?.unlockedAt &&
                    achievementNeedsPremiumQuiz(a.id)
                  }
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
  const { theme: t, f, isDark } = useTheme();
  const { lang }        = useLang();
  const { isPremium }   = usePremium();
  const gold            = t.gold;
  const premiumQuizHintDisabled = isPremium || DEV_MODE;

  const [states, setStates]   = useState<AchievementState[]>([]);
  const [stats, setStats]     = useState<AchievementStats>({ streak:0, loginDays:0, lessons:0, perfectLessons:0, xp:0, recallCorrect:0, arenaWins:0, shards:0 });
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    loadAchievementStates().then(setStates);
    const interaction = InteractionManager.runAfterInteractions(() => {
      loadAchievementStats().then(setStats);
    });
    return () => interaction.cancel();
  }, []);

  const onSelectAchievement = useCallback((a: Achievement) => {
    setSelected(a);
  }, []);

  const onShardClaimedUpdate = useCallback((achievementId: string) => {
    setStates(prev => prev.map(s => (s.id === achievementId ? { ...s, shardClaimed: true } : s)));
  }, []);

  const stateMap = useMemo(() => new Map(states.map(s => [s.id, s])), [states]);

  const achievementSections = useMemo((): AchievementListSection[] => {
    return CATEGORIES.flatMap(cat => {
      const color = CAT_COLOR[cat];
      const catIcon = CAT_ICON[cat];
      const title = triLang(lang, { ru: CAT_LABEL_RU[cat], uk: CAT_LABEL_UK[cat], es: CAT_LABEL_ES[cat] });
      const catAchs = ALL_ACHIEVEMENTS.filter(a => a.category === cat && !!stateMap.get(a.id)?.unlockedAt);
      if (catAchs.length === 0) return [];
      const catUnlocked = catAchs.length;
      const rows: AchievementGridRow[] = [];
      for (let i = 0; i < catAchs.length; i += COLS) {
        const chunk = catAchs.slice(i, i + COLS);
        rows.push({ rowKey: `${cat}-${i}`, items: chunk });
      }
      return {
        key: cat,
        title,
        color,
        catIcon,
        catUnlocked,
        catTotal: catUnlocked,
        data: rows,
      };
    });
  }, [lang, stateMap]);

  const handleToggle = useCallback((cat: string) => {
    setOpenCategory(prev => (prev === cat ? null : cat));
  }, []);

  const unlockedCount = states.filter(s => s.unlockedAt !== null).length;

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>

        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Достижения', uk: 'Досягнення', es: 'Logros' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {achievementCountLabel(unlockedCount, lang)}
            </Text>
          </View>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: t.textSecond, fontWeight: '800', fontSize: f.body }}>
              {achievementCountLabel(unlockedCount, lang)}
            </Text>
          </View>
        </View>

        {/* Аккордеон-список категорий */}
        <SectionList<AchievementListSection, { key: string; data: AchievementListSection[] }>
          sections={[{ key: 'cats', data: achievementSections }]}
          keyExtractor={item => item.key}
          renderItem={({ item }) => (
            <AccordionSection
              section={item}
              isOpen={openCategory === item.key}
              onToggle={() => handleToggle(item.key)}
              stateMap={stateMap}
              stats={stats}
              lang={lang}
              t={t}
              f={f}
              isDark={isDark}
              gold={gold}
              premiumQuizHintDisabled={premiumQuizHintDisabled}
              onSelect={onSelectAchievement}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 0 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={(
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
              <Ionicons name="trophy-outline" size={42} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Пока нет полученных наград', uk: 'Поки немає отриманих нагород', es: 'Aún no tienes recompensas' })}
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
                })}
              />
            </View>
          )}
        />

      </ContentWrap>

      {/* Модальное окно */}
      {selected && (
        <AchievementModal
          achievement={selected}
          state={stateMap.get(selected.id)}
          stats={stats}
          t={t} f={f}
          isDark={isDark}
          onClose={() => setSelected(null)}
          onShardClaimed={onShardClaimedUpdate}
          isPremium={isPremium}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}

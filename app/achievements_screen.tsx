import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Dimensions, Pressable, Image,
  InteractionManager,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
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
} from './achievements';
import { triLang, type Lang } from '../constants/i18n';
import { hapticSuccess } from '../hooks/use-haptics';
import { STORE_URL } from './config';
import { oskolokImageForPackShards } from './oskolok';
import type { ShareCardLang } from '../components/share_cards/streakCardCopy';
import AchievementShareCardSvg from '../components/share_cards/AchievementShareCardSvg';
import { shareCardFromSvgRef } from '../components/share_cards/shareCardPng';
import { buildAchievementShareMessage } from './achievement_share';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';

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
}

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    const [streakRaw, loginRaw, xpRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('login_bonus_v1'),
      AsyncStorage.getItem('user_total_xp'),
    ]);
    const streak = parseInt(streakRaw || '0') || 0;
    const xp = parseInt(xpRaw || '0') || 0;
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
    return { streak, loginDays, lessons, perfectLessons, xp };
  } catch { return { streak: 0, loginDays: 0, lessons: 0, perfectLessons: 0, xp: 0 }; }
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
  return null;
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
  streak_3:            require('../assets/images/levels/pervie tri.png'),
  streak_7:            require('../assets/images/levels/odna nedelya.png'),
  streak_14:           require('../assets/images/levels/dve nedeli.png'),
  streak_30:           require('../assets/images/levels/mesyac v strou.png'),
  streak_60:           require('../assets/images/levels/dva mesyaca.png'),
  streak_100:          require('../assets/images/levels/sto dney.png'),
  streak_200:          require('../assets/images/levels/200 dney.png'),
  streak_365:          require('../assets/images/levels/tseliy god.png'),
  streak_500:          require('../assets/images/levels/500 dney.png'),
  streak_repair:       require('../assets/images/levels/fenix.png'),
  perfect_week:        require('../assets/images/levels/idealnaya nedelya.png'),
  lesson_1:            require('../assets/images/levels/perviy shag.png'),
  lesson_3:            require('../assets/images/levels/tri uroka.png'),
  lesson_5:            require('../assets/images/levels/5 urokov.png'),
  lesson_10:           require('../assets/images/levels/10 urokov.png'),
  lesson_15:           require('../assets/images/levels/15 urokov.png'),
  lesson_20:           require('../assets/images/levels/dvadtsyaty 20 urokov.png'),
  lesson_all:          require('../assets/images/levels/polniy kurs.png'),
  lesson_perfect:      require('../assets/images/levels/ni odnoy oshibky.png'),
  lesson_perfect3:     require('../assets/images/levels/3 idealnych uroka.png'),
  lesson_all_perfect:  require('../assets/images/levels/absolut.png'),
  xp_100:              require('../assets/images/levels/pervaya sotnya.png'),
  xp_250:              require('../assets/images/levels/250 opita.png'),
  xp_500:              require('../assets/images/levels/500 opita.png'),
  xp_1000:             require('../assets/images/levels/tosyachnic.png'),
  xp_2500:             require('../assets/images/levels/2500 opyta.png'),
  xp_5000:             require('../assets/images/levels/5 tisyach opita.png'),
  xp_10000:            require('../assets/images/levels/10 tisyach opita.png'),
  xp_20000:            require('../assets/images/levels/20 tisyach opita.png'),
  xp_50000:            require('../assets/images/levels/pol sotny tisyach opita.png'),
  xp_100000:           require('../assets/images/levels/legenda.png'),
  wager_win:           require('../assets/images/levels/risknul pobedil.png'),
  personal_best:       require('../assets/images/levels/luchsaya nedelya.png'),
  quiz_first:          require('../assets/images/levels/perviy kviz.png'),
  quiz_medium:         require('../assets/images/levels/sredniy uroven.png'),
  quiz_hard:           require('../assets/images/levels/prinyal vyzov.png'),
  quiz_all_levels:     require('../assets/images/levels/polniy nabor.png'),
  quiz_perfect_easy:   require('../assets/images/levels/legky odeal.png'),
  quiz_perfect:        require('../assets/images/levels/zhelezny nervy.png'),
  quiz_perfect_medium: require('../assets/images/levels/metky strelok.png'),
  quiz_triple_perfect: require('../assets/images/levels/trizhdy ideal.png'),
  quiz_speed_demon:    require('../assets/images/levels/skorostboy.png'),
  combo_3:             require('../assets/images/levels/v potoke.png'),
  combo_10:            require('../assets/images/levels/sniper.png'),
  combo_20:            require('../assets/images/levels/nesokrushimiy.png'),
  combo_50:            require('../assets/images/levels/mashina.png'),
  combo_100:           require('../assets/images/levels/nepobedimiy.png'),
  daily_task_first:    require('../assets/images/levels/pervoe zadanie.png'),
  all_daily:           require('../assets/images/levels/vse za den.png'),
  login_7:             require('../assets/images/levels/verny uchenic.png'),
  login_14:            require('../assets/images/levels/2 nedely (osobie).png'),
  login_30:            require('../assets/images/levels/mesyac v prilozhenii.png'),
  login_60:            require('../assets/images/levels/2 mesyaca v prilozhenii.png'),
  login_365:           require('../assets/images/levels/tseliy god v prilozhenii.png'),
  comeback:            require('../assets/images/levels/vozvrashenie korolya.png'),
  diagnosis:           require('../assets/images/levels/diagnoz postavlen.png'),
  night_owl:           require('../assets/images/levels/nochnoy filin.png'),
  early_bird:          require('../assets/images/levels/nabbiy podiem.png'),
  exam_first:          require('../assets/images/levels/ekzamenator.png'),
  exam_ace:            require('../assets/images/levels/otlychink.png'),
  dialog_first:        require('../assets/images/levels/sobesednik.png'),
  dialog_all:          require('../assets/images/levels/master dialogov.png'),
  flashcards_session:  require('../assets/images/levels/kartzhnik.png'),
  league_1:            require('../assets/images/levels/club icon base forest.png'),
  league_3:            require('../assets/images/levels/erudit.png'),
  league_5:            require('../assets/images/levels/professor.png'),
  gem_a1_ruby:         require('../assets/images/levels/rubin.png'),
  gem_a1_emerald:      require('../assets/images/levels/izumrud.png'),
  gem_a1_diamond:      require('../assets/images/levels/almaz.png'),
  gem_a2_ruby:         require('../assets/images/levels/rubin.png'),
  gem_a2_emerald:      require('../assets/images/levels/izumrud.png'),
  gem_a2_diamond:      require('../assets/images/levels/almaz.png'),
  gem_b1_ruby:         require('../assets/images/levels/rubin.png'),
  gem_b1_emerald:      require('../assets/images/levels/izumrud.png'),
  gem_b1_diamond:      require('../assets/images/levels/almaz.png'),
  gem_b2_ruby:         require('../assets/images/levels/rubin.png'),
  gem_b2_emerald:      require('../assets/images/levels/izumrud.png'),
  gem_b2_diamond:      require('../assets/images/levels/almaz.png'),
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
  dialog_first:       'chatbubble',
  dialog_all:         'chatbubbles',
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
  league_1:            'people',
  league_3:            'library',
  league_5:            'trophy',
  club_all:            'crown',
  combo_3:            'git-merge',
  combo_10:           'radio-button-on',
  combo_20:           'shield',
  combo_50:           'flash',
  combo_100:          'nuclear',
  daily_task_first:   'checkmark-circle',
  all_daily:          'albums',
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

type GridCellProps = {
  a: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  color: string;
  fallbackCatIcon: string;
  lang: Lang;
  t: any;
  f: any;
  shieldW: number;
  shieldOuter: number;
  onSelect: (achievement: Achievement) => void;
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
  shieldW,
  shieldOuter,
  onSelect,
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
      style={{ alignItems: 'center', width: shieldOuter, gap: 5 }}
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
        />
      </View>

      {inProgress && prog && prog[1] > 0 && progPct > 0 && (
        <View style={{ width: shieldW * 0.8, height: 3, backgroundColor: t.bgSurface2, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 3, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 2 }} />
        </View>
      )}

      {!isLocked && (
        <Text
          style={{ color: unlocked ? t.textPrimary : t.textGhost, fontSize: f.label, textAlign: 'center' }}
          numberOfLines={2}
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
}: {
  unlocked: boolean; inProgress: boolean; color: string;
  iconName: string; size: number; maskBg?: string; achievementId?: string;
}) {
  const { isDark, theme: t } = useTheme();
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
              color: isLocked ? '#666' : inProgress ? '#aaa' : t.gold,
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
          source={require('../assets/images/levels/achivement.png')}
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
  achievement, state, stats, t, f, onClose, onShardClaimed,
}: {
  achievement: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  t: any; f: any;
  onClose: () => void;
  onShardClaimed: (achievementId: string) => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [shareSvgMounted, setShareSvgMounted] = useState(false);
  const achShareRef = useRef<InstanceType<typeof Svg> | null>(null);
  const { lang } = useLang();
  const achCardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY
    ? 'ru'
    : lang === 'uk'
      ? 'uk'
      : lang === 'es'
        ? 'es'
        : 'ru';
  useEffect(() => {
    setShareSvgMounted(false);
  }, [achievement.id]);
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : lang === 'es' ? 'es-ES' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 24, alignItems: 'center', width: SW - 48, gap: 12, position: 'relative' }}>
            {unlocked && shareSvgMounted && (
              <View
                pointerEvents="none"
                collapsable={false}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
              >
                <AchievementShareCardSvg
                  ref={achShareRef}
                  title={name}
                  lang={achCardLang}
                  layoutSize={1080}
                />
              </View>
            )}
            {/* Shield */}
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && !achievement.secret}
              color={color}
              iconName={iconName}
              size={72}
              maskBg={t.bgCard}
              achievementId={achievement.id}
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
                  if (!shareSvgMounted) setShareSvgMounted(true);
                  await new Promise<void>((resolve) => {
                    InteractionManager.runAfterInteractions(() => resolve());
                  });
                  const msg = buildAchievementShareMessage(lang, name, STORE_URL);
                  await shareCardFromSvgRef(achShareRef, { fileNamePrefix: 'phraseman-achievement', textFallback: msg });
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

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const router          = useRouter();
  const { theme: t, f } = useTheme();
  const { lang }        = useLang();

  const [states, setStates]   = useState<AchievementState[]>([]);
  const [stats, setStats]     = useState<AchievementStats>({ streak:0, loginDays:0, lessons:0, perfectLessons:0, xp:0 });
  const [selected, setSelected] = useState<Achievement | null>(null);

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

  const stateMap      = new Map(states.map(s => [s.id, s]));
  const unlockedCount = states.filter(s => s.unlockedAt !== null).length;
  const total         = ALL_ACHIEVEMENTS.length;

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
              {unlockedCount} / {total} {triLang(lang, { ru: 'разблокировано', uk: 'розблоковано', es: 'desbloqueados' })}
            </Text>
          </View>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: t.textSecond, fontWeight: '800', fontSize: f.body }}>
              {Math.round(unlockedCount / total * 100)}%
            </Text>
          </View>
        </View>

        {/* Общий прогресс-бар */}
        <View style={{ height: 3, backgroundColor: t.bgSurface2, marginHorizontal: 16, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: `${unlockedCount / total * 100}%` as any, backgroundColor: t.textSecond, borderRadius: 2 }} />
        </View>

        {/*
          removeClippedSubviews на ScrollView — известный баг Fabric (New Arch):
          IllegalStateException "The specified child already has a parent" при
          откреплении/прикреплении дочерних view во время скролла. Оптимизация
          работает только для VirtualizedList семейства, на ScrollView она
          молча ломается. Не возвращать. Ref: Crashlytics 1.5.18.
        */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const color    = CAT_COLOR[cat];
            const catIcon  = CAT_ICON[cat];
            const label    = triLang(lang, { ru: CAT_LABEL_RU[cat], uk: CAT_LABEL_UK[cat], es: CAT_LABEL_ES[cat] });
            const catAchs  = ALL_ACHIEVEMENTS.filter(a => a.category === cat);
            const catUnlocked = catAchs.filter(a => stateMap.get(a.id)?.unlockedAt).length;

            return (
              <View key={cat}>
                {/* Заголовок категории */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={catIcon as any} size={15} color={color} />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {label}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                    {catUnlocked}/{catAchs.length}
                  </Text>
                </View>

                {/* Сетка щитов */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {catAchs.map(a => (
                    <AchievementGridCell
                      key={a.id}
                      a={a}
                      state={stateMap.get(a.id)}
                      stats={stats}
                      color={color}
                      fallbackCatIcon={catIcon}
                      lang={lang}
                      t={t}
                      f={f}
                      shieldW={SHIELD_W}
                      shieldOuter={SHIELD_OUTER}
                      onSelect={onSelectAchievement}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

      </ContentWrap>

      {/* Модальное окно */}
      {selected && (
        <AchievementModal
          achievement={selected}
          state={stateMap.get(selected.id)}
          stats={stats}
          t={t} f={f}
          onClose={() => setSelected(null)}
          onShardClaimed={onShardClaimedUpdate}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}

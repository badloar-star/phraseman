import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, Pressable, Image, ScrollView, useWindowDimensions,
  InteractionManager,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from './personal_progress_store';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import TapScale from '../components/TapScale';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import AchievementShelfCarousel from '../components/achievements/AchievementShelfCarousel';
import AchievementCategoryDock from '../components/achievements/AchievementCategoryDock';
import type { AchievementCategoryOption } from '../components/achievements/AchievementCategoryDock';
import HybridAlertShell from '../components/modal_fx/HybridAlertShell';
import { LinearGradient } from '../components/SafeLinearGradient';
import { glassFill } from '../components/GlassSurface';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { safeRouterBack } from './navigation_back';
import {
  ALL_ACHIEVEMENTS,
  loadAchievementStates,
  Achievement,
  AchievementState,
  achievementNameForLang,
  achievementDescForLang,
  achievementConditionForLang,
  checkAchievements,
} from './achievements';
// зачем: секция «Ближайшие награды» удалена с экрана — импорт больше не нужен здесь
// (achievement_nearest.ts остаётся, у него свой тест-файл achievement_nearest.test.ts)
import { triLang, type Lang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { STORE_URL, ENABLE_DEV_TOOLS } from './config';
import { buildAchievementShareMessage } from './achievement_share';
import { achievementShelfInitialId } from './achievement_shelf_model';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { loadConfirmedLeagueAchievementEvidence } from './league_engine';

const GRID_GAP = 10;
const GRID_SIDE_PADDING = 36;
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

function isVisibleAchievement(a: Achievement): boolean {
  return !a.retired;
}

type AchievementGridMetrics = ReturnType<typeof getAchievementGridMetrics>;

interface AchievementStats {
  streak: number;
  xp: number;
  shards: number;
  leagueChampion: number;
  leagueDiamondWeeks: number;
}

const emptyAchievementStats = (): AchievementStats => ({
  streak: 0,
  xp: 0,
  shards: 0,
  leagueChampion: 0,
  leagueDiamondWeeks: 0,
});

const readJsonStreak = (raw: string | null, key = 'streak'): number => {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    return Math.max(0, Math.floor(Number(parsed?.[key]) || 0));
  } catch { return 0; }
};

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    await hydratePersonalProgress();
    const personalProgress = getPersonalProgressSnapshot();
    const [
      shardsRaw, leagueChampionRaw, leagueDiamondWeeksRaw,
    ] = await Promise.all([
      AsyncStorage.getItem('shards_balance'),
      AsyncStorage.getItem('achievement_league_champion_count'),
      AsyncStorage.getItem('achievement_league_diamond_week_streak_v1'),
    ]);
    const streak = personalProgress.streakCount;
    const xp = personalProgress.totalXp;
    const shards = parseInt(shardsRaw || '0') || 0;
    return {
      streak,
      xp,
      shards,
      leagueChampion: parseInt(leagueChampionRaw || '0') || 0,
      leagueDiamondWeeks: readJsonStreak(leagueDiamondWeeksRaw),
    };
  } catch { return emptyAchievementStats(); }
}

function getAchievementProgress(id: string, stats: AchievementStats): [number, number] | null {
  if (id.startsWith('streak_')) {
    const n = parseInt(id.replace('streak_', ''));
    if (!isNaN(n)) return [Math.min(stats.streak, n), n];
  }
  if (id.startsWith('xp_')) {
    const n = parseInt(id.replace('xp_', ''));
    if (!isNaN(n)) return [Math.min(stats.xp, n), n];
  }
  if (id.startsWith('shards_')) {
    const n = parseInt(id.replace('shards_', ''));
    if (!isNaN(n)) return [Math.min(stats.shards, n), n];
  }
  if (id === 'league_champion_5') return [Math.min(stats.leagueChampion, 5), 5];
  if (id === 'league_champion_10') return [Math.min(stats.leagueChampion, 10), 10];
  if (id === 'league_diamond_4_weeks') return [Math.min(stats.leagueDiamondWeeks, 4), 4];
  return null;
}

// ── PNG-изображения для каждого достижения ───────────────────────────────────
// зачем: раньше здесь лежала ВТОРАЯ копия реестра арта (190 require) — тот же
// список, что и в constants/achievementImageAssets.ts. Теперь источник правды
// один: «ядро» бандлится, остальной арт стримится из Storage. Реэкспорт
// сохранён, чтобы не трогать импорты в AchievementToast и других местах.
export { ACHIEVEMENT_IMAGE } from '../constants/achievementImageAssets';
import { achievementImageSource } from '../constants/achievementImageAssets';
import { prefetchAllAchievementArt } from './achievement_art_prefetch';

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
  comeback:           'rocket',
  shards_100:         'diamond',
  league_champion:    'trophy',
  league_diamond:     'diamond',
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
};
const CAT_LABEL_RU: Record<string, string> = {
  streak: 'Цепочка', lessons: 'Уроки', xp: 'Опыт',
  combo: 'Серии', special: 'Особые', medal: 'Медали',
};
const CAT_LABEL_UK: Record<string, string> = {
  streak: 'Ланцюжок', lessons: 'Уроки', xp: 'Досвід',
  combo: 'Серії', special: 'Особливі', medal: 'Медалі',
};
const CAT_LABEL_ES: Record<string, string> = {
  streak: 'Racha', lessons: 'Lecciones', xp: 'Experiencia',
  combo: 'Series', special: 'Especiales', medal: 'Medallas',
};
const CAT_LABEL_PTBR: Record<string, string> = {
  streak: 'Sequência', lessons: 'Lições', xp: 'Experiência',
  combo: 'Séries', special: 'Especiais', medal: 'Medalhas',
};
const CAT_LABEL_VI: Record<string, string> = {
  streak: 'Chuỗi ngày', lessons: 'Bài học', xp: 'Kinh nghiệm',
  combo: 'Chuỗi', special: 'Đặc biệt', medal: 'Huy chương',
};
const CAT_LABEL_ID: Record<string, string> = {
  streak: 'Rangkaian', lessons: 'Pelajaran', xp: 'Pengalaman',
  combo: 'Seri', special: 'Spesial', medal: 'Medali',
};
const CAT_LABEL_TR: Record<string, string> = {
  streak: 'Seri', lessons: 'Dersler', xp: 'Deneyim',
  combo: 'Seriler', special: 'Özel', medal: 'Madalyalar',
};
const CAT_LABEL_PL: Record<string, string> = {
  streak: 'Seria', lessons: 'Lekcje', xp: 'Doświadczenie',
  combo: 'Serie', special: 'Specjalne', medal: 'Medale',
};

const CATEGORIES = ['streak', 'lessons', 'xp', 'combo', 'special', 'medal'] as const;
type ShelfCategory = 'all' | Achievement['category'];

function achievementShelfCategoryLabel(category: ShelfCategory, lang: Lang): string {
  if (category === 'all') {
    return triLang(lang, {
      ru: 'Все', uk: 'Усі', es: 'Todas', 'pt-BR': 'Todas',
      vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystkie',
    });
  }

  return triLang(lang, {
    ru: CAT_LABEL_RU[category],
    uk: CAT_LABEL_UK[category],
    es: CAT_LABEL_ES[category],
    'pt-BR': CAT_LABEL_PTBR[category],
    vi: CAT_LABEL_VI[category],
    id: CAT_LABEL_ID[category],
    tr: CAT_LABEL_TR[category],
    pl: CAT_LABEL_PL[category],
  });
}
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
        <BadgeShield
          unlocked={unlocked}
          inProgress={inProgress}
          color={color}
          iconName={iconName}
          size={shieldW}
          maskBg={t.bgPrimary}
          achievementId={a.id}
          isDark={isDark}
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
  // зачем: для сетевого арта заглушку нельзя снимать до onLoad — иначе между
  // «источник появился» и «картинка отрисовалась» мелькнёт пустое место.
  // Щит держится под картинкой до момента реальной загрузки.
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: bodyHeight, alignItems: 'center', justifyContent: 'center' }}>
      {(!source || imageFailed || !imageLoaded) ? (
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
          // Мягкое проявление поверх щита — подмена заглушки не «моргает».
          transition={150}
          onLoad={() => setImageLoaded(true)}
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
}: {
  unlocked: boolean; inProgress: boolean; color: string;
  iconName: string; size: number; maskBg?: string; achievementId?: string;
  isDark: boolean;
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
  // зачем: ACHIEVEMENT_IMAGE содержит только «ядро» (бандл). Остальной арт живёт
  // в Storage, поэтому источник берём через achievementImageSource — она вернёт
  // либо бандл-ресурс, либо {uri} из прогретого дискового кэша.
  const specificImage = achievementId ? achievementImageSource(achievementId) : null;

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

// зачем: секция «Ближайшие награды» (NearestAchievementsBlock) удалена по запросу
// владельца — карточки-достижения ниже по экрану используют ту же achievements-логику,
// её не трогаем.

// ── Модальное окно ────────────────────────────────────────────────────────────
function AchievementModal({
  achievement, state, stats, t, f, isDark, themeMode, onClose, revealLockedDetails, studyTarget,
}: {
  achievement: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  t: any; f: any;
  isDark: boolean;
  themeMode: ThemeMode;
  onClose: () => void;
  revealLockedDetails: boolean;
  studyTarget: RuntimeStudyTarget;
}) {
  const { lang } = useLang();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const unlocked = !!state?.unlockedAt;
  const color    = achievementCategoryColor(achievement.category);
  const iconName = ACHIEVEMENT_ICON[achievement.id] ?? 'star';
  const name     = achievementNameForLang(achievement, lang);
  const desc     = achievementDescForLang(achievement, lang);
  const condition = achievementConditionForLang(achievement, lang);
  const showLockedDetails = !achievement.secret || revealLockedDetails;
  const prog     = !unlocked && showLockedDetails
    ? getAchievementProgress(achievement.id, stats)
    : null;
  const progPct  = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

  const modalMaxHeight = Math.max(240, screenH - 48);
  const modalPad = screenW < 360 ? 18 : 24;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dateLocale = ACHIEVEMENT_DATE_LOCALES[lang];
    return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const obtainedLabel = triLang(lang, { ru: 'Получено', uk: 'Отримано', es: 'Obtenido', 'pt-BR': 'Obtido', vi: 'Đã nhận', id: 'Diperoleh', tr: 'Alındı', pl: 'Zdobyto' });
  const shareLabel = triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' });
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  return (
    <HybridAlertShell
      visible
      onRequestClose={onClose}
      shadowColor={t.shadowDark}
      backdropColor="rgba(0,0,0,0.72)"
      testID="achievement-dossier-backdrop"
    >
      <View
        testID="achievement-award-dossier"
        style={{
          backgroundColor: t.bgCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.borderHighlight,
          width: '100%',
          maxHeight: modalMaxHeight,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <TapScale
          testID="achievement-close-secondary"
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          scaleTo={0.94}
          onPress={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 3,
            width: 44, height: 44, borderRadius: 15, backgroundColor: t.bgCard,
            borderWidth: StyleSheet.hairlineWidth, borderColor: t.borderHighlight,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={21} color={t.textPrimary} />
        </TapScale>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          decelerationRate="normal"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: modalPad, alignItems: 'stretch', gap: 16 }}
        >
          <LinearGradient
            testID="achievement-dossier-hero"
            colors={[t.bgSurface2, t.bgCard]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{
              minHeight: 190,
              borderRadius: 20,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.borderHighlight,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', left: 26, right: 26, bottom: 22, height: 10,
                borderRadius: 5, backgroundColor: t.bgSurface,
                borderTopWidth: 1, borderTopColor: t.borderHighlight,
                shadowColor: t.shadowDark, shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.22, shadowRadius: 8, elevation: 3,
              }}
            />
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && showLockedDetails}
              color={color}
              iconName={iconName}
              size={132}
              maskBg={t.bgSurface2}
              achievementId={achievement.id}
              isDark={isDark}
            />
          </LinearGradient>

          <View style={{ gap: 8 }}>
            {unlocked && state?.unlockedAt && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Ionicons name="calendar-outline" size={15} color={t.textMuted} />
                <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800', flex: 1 }}>
                  {obtainedLabel} · {formatDate(state.unlockedAt)}
                </Text>
              </View>
            )}
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: Math.round(f.h2 * 1.08) }}>
              {unlocked || showLockedDetails ? name : triLang(lang, {
                ru: 'Секретное достижение', uk: 'Секретне досягнення', es: 'Logro secreto',
                'pt-BR': 'Conquista secreta', vi: 'Thành tựu bí mật', id: 'Pencapaian rahasia',
                tr: 'Gizli başarı', pl: 'Tajne osiągnięcie',
              })}
            </Text>
            <Text
              testID="achievement-dossier-description"
              style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: Math.round(f.body * 1.5) }}
            >
              {unlocked || showLockedDetails ? desc : triLang(lang, {
                ru: 'Разблокируй, чтобы узнать', uk: 'Розблокуй, щоб дізнатись',
                es: 'Desbloquéalo para descubrirlo', 'pt-BR': 'Desbloqueie para descobrir',
                vi: 'Mở khóa để xem', id: 'Buka untuk mengetahui', tr: 'Öğrenmek için aç',
                pl: 'Odblokuj, aby zobaczyć',
              })}
            </Text>
          </View>

          {condition && (unlocked || showLockedDetails) ? (
            <View
              testID="achievement-dossier-condition"
              style={{
                width: '100%', backgroundColor: t.bgSurface2, borderRadius: 15,
                paddingHorizontal: 14, paddingVertical: 13, gap: 6,
                borderWidth: StyleSheet.hairlineWidth, borderColor: t.border,
              }}
            >
              <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {triLang(lang, {
                  ru: 'Как получить', uk: 'Як отримати', es: 'Cómo conseguirlo',
                  'pt-BR': 'Como conseguir', vi: 'Cách nhận', id: 'Cara mendapatkan',
                  tr: 'Nasıl kazanılır', pl: 'Jak zdobyć',
                })}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', lineHeight: Math.round(f.body * 1.45) }}>
                {condition}
              </Text>
            </View>
          ) : null}

          {prog && prog[1] > 0 && (
            <View style={{ width: '100%', gap: 9, backgroundColor: t.bgSurface2, borderRadius: 15, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border }}>
              <View style={{ height: 8, backgroundColor: t.bgSurface, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 4 }} />
              </View>
              <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}>
                {prog[0]} / {prog[1]}
                {prog[1] - prog[0] > 0 && progPct > 0 && (
                  `  ·  ${triLang(lang, { ru: 'ещё', uk: 'ще', es: 'faltan', 'pt-BR': 'faltam', vi: 'còn', id: 'lagi', tr: 'kaldı', pl: 'jeszcze' })} ${prog[1] - prog[0]}`
                )}
              </Text>
            </View>
          )}

          {unlocked && (
            <TapScale
              testID="achievement-share-primary"
              accessibilityRole="button"
              accessibilityLabel={shareLabel}
              scaleTo={0.97}
              style={{
                width: '100%', minHeight: 56, backgroundColor: t.bgSurface2, borderRadius: 17,
                borderWidth: StyleSheet.hairlineWidth, borderColor: t.borderHighlight,
                paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11,
              }}
              onPress={async () => {
                const msg = buildAchievementShareMessage(lang, name, STORE_URL);
                const result = await Share.share({ message: msg }).catch(() => null);
                if (result?.action === 'sharedAction') {
                  void checkAchievements({ type: 'achievement_shared', studyTarget });
                }
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.accentBg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="share-outline" size={19} color={t.accent} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', flex: 1 }}>
                {shareLabel}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </TapScale>
          )}
        </ScrollView>
      </View>
    </HybridAlertShell>
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
  const gridMetrics = useMemo(() => getAchievementGridMetrics(screenW), [screenW]);
  const isUK = lang === 'uk';

  const [states, setStates]   = useState<AchievementState[]>([]);
  // зачем (аудит 2026-08-22): states стартует пустым массивом, и до прихода
  // loadAchievementStates() полка ложно показывала «Пока нет наград» даже
  // игроку с десятками наград. Паттерн — как в collectibles_screen: держим
  // «загружено хоть раз» отдельно от «пусто по-настоящему».
  const [achievementsLoaded, setAchievementsLoaded] = useState(false);
  const [stats, setStats]     = useState<AchievementStats>(emptyAchievementStats());
  const [selected, setSelected] = useState<Achievement | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [devShowAllAchievements, setDevShowAllAchievements] = useState(false);
  const [shelfCategory, setShelfCategory] = useState<ShelfCategory>('all');
  const [shelfSelectedId, setShelfSelectedId] = useState<string | null>(null);

  // зачем: статуэтки живут в Storage (Фаза 4 «Бандл-диеты», 2026-08-24) — здесь
  // видна вся полка сразу, поэтому прогреваем её арт по входу на экран, а не по
  // таймеру. Уже прогретое не перекачивается: URL помнятся в рамках сессии.
  useEffect(() => { prefetchAllAchievementArt(); }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const leagueHistory = await loadConfirmedLeagueAchievementEvidence().catch(() => []);
      if (leagueHistory.length > 0) {
        await checkAchievements({ type: 'league_history', results: leagueHistory });
      }
      await checkAchievements({ type: 'backfill', studyTarget });
      return loadAchievementStates();
    })()
      .then((nextStates) => {
        if (!cancelled) {
          setStates(nextStates);
          setAchievementsLoaded(true);
        }
      })
      .catch(async () => {
        const fallbackStates = await loadAchievementStates().catch(() => []);
        if (!cancelled) {
          setStates(fallbackStates);
          setAchievementsLoaded(true);
        }
      });
    const interaction = InteractionManager.runAfterInteractions(() => {
      loadAchievementStats().then(setStats);
    });
    return () => {
      cancelled = true;
      interaction.cancel();
    };
  }, [studyTarget]);

  const onSelectAchievement = useCallback((a: Achievement) => {
    setSelected(a);
  }, []);

  const stateMap = useMemo(() => new Map(states.map(s => [s.id, s])), [states]);
  const showAllAchievements = ENABLE_DEV_TOOLS && devShowAllAchievements;
  const visibleAchievementDefinitions = useMemo(() =>
    ALL_ACHIEVEMENTS.filter(isVisibleAchievement),
  []);
  const earnedAchievements = useMemo(
    () => visibleAchievementDefinitions.filter((achievement) =>
      showAllAchievements || !!stateMap.get(achievement.id)?.unlockedAt,
    ),
    [showAllAchievements, stateMap, visibleAchievementDefinitions],
  );
  const shelfCategories = useMemo(
    () => CATEGORIES.filter((category) =>
      earnedAchievements.some((achievement) => achievement.category === category),
    ),
    [earnedAchievements],
  );
  const shelfCategoryOptions = useMemo<AchievementCategoryOption<ShelfCategory>[]>(
    () => (['all', ...shelfCategories] as ShelfCategory[]).map((category) => ({
      id: category,
      label: achievementShelfCategoryLabel(category, lang),
      icon: category === 'all' ? 'layers-outline' : CAT_ICON[category],
    })),
    [lang, shelfCategories],
  );
  const shelfAchievements = useMemo(
    () => shelfCategory === 'all'
      ? earnedAchievements
      : earnedAchievements.filter((achievement) => achievement.category === shelfCategory),
    [earnedAchievements, shelfCategory],
  );

  useEffect(() => {
    if (shelfCategory === 'all' || shelfCategories.includes(shelfCategory)) return;
    setShelfCategory('all');
  }, [shelfCategories, shelfCategory]);

  useEffect(() => {
    if (shelfAchievements.some((achievement) => achievement.id === shelfSelectedId)) return;
    setShelfSelectedId(achievementShelfInitialId(shelfAchievements, stateMap));
  }, [shelfAchievements, shelfSelectedId, stateMap]);

  const renderShelfTrophy = useCallback((achievement: Achievement, size: number) => {
    const state = stateMap.get(achievement.id);
    const unlocked = !!state?.unlockedAt;
    const color = achievementCategoryColor(achievement.category, themeMode);
    const iconName = ACHIEVEMENT_ICON[achievement.id] ?? CAT_ICON[achievement.category];

    return (
      <View style={{ width: size, alignItems: 'center' }}>
        <BadgeShield
          unlocked={unlocked}
          inProgress={!unlocked}
          color={color}
          iconName={iconName}
          size={size}
          maskBg={t.bgPrimary}
          achievementId={achievement.id}
          isDark={isDark}
        />
      </View>
    );
  }, [isDark, stateMap, t.bgPrimary, themeMode]);

  const renderShelfDetail = useCallback((achievement: Achievement) => {
    const state = stateMap.get(achievement.id);
    const markerColor = achievementCategoryColor(achievement.category, themeMode);
    const plaqueIcon = ACHIEVEMENT_ICON[achievement.id] ?? CAT_ICON[achievement.category];
    const condition = achievementConditionForLang(achievement, lang);
    const unlockedAt = state?.unlockedAt
      ? new Date(state.unlockedAt).toLocaleDateString(ACHIEVEMENT_DATE_LOCALES[lang], {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      : null;

    return (
      <LinearGradient
        testID="achievement-gallery-plaque"
        colors={[t.bgCard, t.bgSurface2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: 148, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 17,
          borderWidth: StyleSheet.hairlineWidth, borderColor: t.borderHighlight, gap: 12,
          shadowColor: t.shadowDark, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12,
          shadowRadius: 14, elevation: 3, overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 18, right: 18, top: 0, height: 1,
            backgroundColor: t.borderHighlight,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
          <View
            testID="achievement-gallery-plaque-marker"
            style={{
              width: 42, height: 42, borderRadius: 14, backgroundColor: t.bgSurface,
              borderWidth: StyleSheet.hairlineWidth, borderColor: markerColor + '4D',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name={plaqueIcon as any} size={19} color={markerColor} />
          </View>
          <Text style={{ color: t.textPrimary, fontSize: f.h3, lineHeight: Math.round(f.h3 * 1.14), fontWeight: '900', flex: 1, paddingTop: 2 }}>
            {achievementNameForLang(achievement, lang)}
          </Text>
          <View
            testID="achievement-gallery-plaque-open"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              minWidth: 44, minHeight: 44, borderRadius: 14, backgroundColor: t.bgSurface,
              borderWidth: StyleSheet.hairlineWidth, borderColor: t.borderHighlight,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="open-outline" size={20} color={t.accent} />
          </View>
        </View>
        <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', lineHeight: Math.round(f.body * 1.5) }}>
          {achievementDescForLang(achievement, lang)}
        </Text>
        {condition ? (
          <View
            testID="achievement-gallery-condition"
            style={{
              backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 13,
              paddingVertical: 11, gap: 5, borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.border,
            }}
          >
            <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {triLang(lang, {
                ru: 'Как получить', uk: 'Як отримати', es: 'Cómo conseguirlo',
                'pt-BR': 'Como conseguir', vi: 'Cách nhận', id: 'Cara mendapatkan',
                tr: 'Nasıl kazanılır', pl: 'Jak zdobyć',
              })}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800', lineHeight: Math.round(f.sub * 1.42) }}>
              {condition}
            </Text>
          </View>
        ) : null}
        {unlockedAt && (
          <View style={{ alignSelf: 'flex-start', minHeight: 32, borderRadius: 11, backgroundColor: t.bgSurface, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border }}>
            <Ionicons name="calendar-outline" size={15} color={t.textMuted} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
              {unlockedAt}
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  }, [f.body, f.caption, f.h3, f.sub, lang, stateMap, t.accent, t.bgCard, t.bgSurface, t.bgSurface2, t.border, t.borderHighlight, t.shadowDark, t.textMuted, t.textPrimary, t.textSecond, themeMode]);
  // зачем: nearestAchievements (питал удалённую секцию «Ближайшие награды») больше не нужен
  const achievementSections = useMemo((): AchievementListSection[] => {
    const sections = CATEGORIES.flatMap(cat => {
      const color = achievementCategoryColor(cat, themeMode);
      const catIcon = CAT_ICON[cat];
      const catIconImage = CAT_ICON_IMAGE[cat];
      const title = triLang(lang, { ru: CAT_LABEL_RU[cat], uk: CAT_LABEL_UK[cat], es: CAT_LABEL_ES[cat], 'pt-BR': CAT_LABEL_PTBR[cat], vi: CAT_LABEL_VI[cat], id: CAT_LABEL_ID[cat], tr: CAT_LABEL_TR[cat], pl: CAT_LABEL_PL[cat] });
      const allCatAchs = visibleAchievementDefinitions.filter(a => a.category === cat);
      const catAchs = allCatAchs.filter(a =>
        showAllAchievements || !!stateMap.get(a.id)?.unlockedAt,
      );
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
  const visibleCountLabel = achievementCountPairLabel(unlockedCount, totalCount, lang);
  const headerCountLabel = `${unlockedCount}/${totalCount}`;

  return (
    <ScreenGradient artBackdrop="achievements">
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>

        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TapScale
            testID="achievements-back"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            onPress={() => safeRouterBack(router)}
            style={{ flexShrink: 0 }}
          >
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
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Показать весь каталог для проверки', uk: 'Показати весь каталог для перевірки',
                es: 'Mostrar todo el catálogo para revisión', 'pt-BR': 'Mostrar todo o catálogo para revisão',
                vi: 'Hiện toàn bộ danh mục để kiểm tra', id: 'Tampilkan seluruh katalog untuk pemeriksaan',
                tr: 'İnceleme için tüm kataloğu göster', pl: 'Pokaż cały katalog do kontroli',
              })}
              accessibilityState={{ selected: showAllAchievements }}
              onPress={() => setDevShowAllAchievements(prev => !prev)}
              activeOpacity={0.8}
              style={{
                backgroundColor: showAllAchievements ? t.gold + '22' : t.bgCard,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                minHeight: 44,
                justifyContent: 'center',
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128, gap: 16 }}
        >
          {!achievementsLoaded ? (
            // зачем (аудит 2026-08-22): пока states не загружены, полка молчит
            // скелетоном той же геометрии карусели — не «Пока нет наград» ложью.
            <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
              <SkeletonBlock width={96} height={116} borderRadius={16} />
              <SkeletonBlock width={96} height={116} borderRadius={16} />
              <SkeletonBlock width={96} height={116} borderRadius={16} />
            </View>
          ) : shelfAchievements.length > 0 ? (
            <AchievementShelfCarousel
              items={shelfAchievements}
              selectedId={shelfSelectedId}
              viewportWidth={Math.max(280, Math.min(screenW - 32, 608))}
              onSelected={(achievement) => setShelfSelectedId(achievement.id)}
              onOpen={onSelectAchievement}
              renderTrophy={renderShelfTrophy}
              renderDetail={renderShelfDetail}
            />
          ) : (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
              <Ionicons name="trophy-outline" size={42} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Пока нет полученных наград', uk: 'Поки немає отриманих нагород', es: 'Aún no tienes recompensas', 'pt-BR': 'Ainda não há recompensas recebidas', vi: 'Chưa có phần thưởng nào', id: 'Belum ada hadiah yang diterima', tr: 'Henüz alınan ödül yok', pl: 'Nie masz jeszcze zdobytych nagród' })}
              </Text>
            </View>
          )}

          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ReportErrorButton
              screen="achievements"
              dataId="achievements_shelf"
              dataText={triLang(lang, {
                ru: 'Достижения', uk: 'Досягнення', es: 'Logros', 'pt-BR': 'Conquistas',
                vi: 'Thành tựu', id: 'Pencapaian', tr: 'Başarılar', pl: 'Osiągnięcia',
              })}
            />
          </View>
        </ScrollView>

      </ContentWrap>

      {achievementsLoaded && shelfCategoryOptions.length > 2 && (
        <AchievementCategoryDock
          options={shelfCategoryOptions}
          selectedId={shelfCategory}
          onSelect={setShelfCategory}
          openLabel={triLang(lang, {
            ru: 'Выбрать категорию достижений', uk: 'Обрати категорію досягнень',
            es: 'Elegir categoría de logros', 'pt-BR': 'Escolher categoria de conquistas',
            vi: 'Chọn hạng mục thành tựu', id: 'Pilih kategori pencapaian',
            tr: 'Başarı kategorisini seç', pl: 'Wybierz kategorię osiągnięć',
          })}
          closeLabel={triLang(lang, {
            ru: 'Закрыть выбор категорий', uk: 'Закрити вибір категорій',
            es: 'Cerrar categorías', 'pt-BR': 'Fechar categorias',
            vi: 'Đóng danh mục', id: 'Tutup kategori',
            tr: 'Kategorileri kapat', pl: 'Zamknij kategorie',
          })}
        />
      )}

      {/* Модальное окно */}
      {selected && isVisibleAchievement(selected) && (
        <AchievementModal
          achievement={selected}
          state={stateMap.get(selected.id)}
          stats={stats}
          t={t} f={f}
          isDark={isDark}
          themeMode={themeMode}
          onClose={() => setSelected(null)}
          revealLockedDetails={showAllAchievements}
          studyTarget={studyTarget}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}

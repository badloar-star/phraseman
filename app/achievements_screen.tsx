import React, { useEffect, useState, memo, useCallback, useMemo, useRef } from 'react';
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
import { getRunesBalanceRead, peekRunes } from './runes_system';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from './personal_progress_store';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import TapScale from '../components/TapScale';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { soundDirector } from '../modules/audio/sound_director';
import AchievementShelfCarousel from '../components/achievements/AchievementShelfCarousel';
import AchievementCategoryDock from '../components/achievements/AchievementCategoryDock';
import type { AchievementCategoryOption } from '../components/achievements/AchievementCategoryDock';
import HybridAlertShell from '../components/modal_fx/HybridAlertShell';
import { LinearGradient } from '../components/SafeLinearGradient';
import { glassFill } from '../components/GlassSurface';
import { ResultsGlassBackButton, ResultsGlassCountPill, ResultsGlassEmptyState } from '../components/results/ResultsGlass';
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
import { pluralWord } from '../constants/plural';
import type { ThemeMode } from '../constants/theme';
import { STORE_URL, ENABLE_DEV_TOOLS } from './config';
import { buildAchievementShareMessage } from './achievement_share';
import { achievementShelfInitialId } from './achievement_shelf_model';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  // зачем: владелец назвал награды «милипиздрическими» — щиты упирались в
  // потолок 90/112 px и на обычном телефоне занимали половину своей ячейки.
  // Потолок поднят, а вычет уменьшен: значок заполняет колонку почти целиком,
  // подпись под ним не съезжает (ширина ячейки shieldOuter не менялась).
  const shieldW = Math.max(64, Math.min(safeW < 360 ? 112 : 148, shieldOuter - 2));
  return { cols, gap: GRID_GAP, shieldOuter, shieldW };
}

function isVisibleAchievement(a: Achievement): boolean {
  return !a.retired;
}

type AchievementGridMetrics = ReturnType<typeof getAchievementGridMetrics>;

interface AchievementStats {
  streak: number;
  /** Баланс монет — по нему считается «Монетная заначка» (id `shards_*` исторический). */
  coins: number;
}

// зачем: первый кадр берёт монеты из снимка синхронно — полоска не прыгает с нуля.
const emptyAchievementStats = (): AchievementStats => ({
  streak: 0,
  coins: peekRunes(),
});

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    await hydratePersonalProgress();
    const personalProgress = getPersonalProgressSnapshot();
    // зачем (Ядро 01.10, D70/D78): достижение считается по монетам (c0605907b), а полоска
    // читала удалённый жемчуг (shards_balance) — показывала чужое число. Берём кошелёк монет.
    const { wallet } = await getRunesBalanceRead();
    return {
      streak: personalProgress.streakCount,
      coins: wallet.balance,
    };
  } catch (error: unknown) {
    console.warn('[ACHIEVEMENTS] stats:load_failed', error instanceof Error ? error.message : String(error));
    return emptyAchievementStats();
  }
}

function getAchievementProgress(id: string, stats: AchievementStats): [number, number] | null {
  if (id.startsWith('streak_')) {
    const n = parseInt(id.replace('streak_', ''));
    if (!isNaN(n)) return [Math.min(stats.streak, n), n];
  }
  if (id.startsWith('shards_')) {
    const n = parseInt(id.replace('shards_', ''));
    if (!isNaN(n)) return [Math.min(stats.coins, n), n];
  }
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
import { peekStableId } from './stable_id';

// ── Иконки по ачивке (Ionicons) — constants/achievementIcons.ts ──
export { ACHIEVEMENT_ICON } from '../constants/achievementIcons';
import { ACHIEVEMENT_ICON } from '../constants/achievementIcons';
import { noAndroidOutline } from '../constants/androidGlow';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.5)'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
const EXEMPT_COLOR_2 = 'rgba(2,3,6,0.72)'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)

// ── Цвет категории ────────────────────────────────────────────────────────────
export const CAT_COLOR: Record<string, string> = {
  streak:  '#FF6B35', // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  lessons: '#3B82F6', // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  combo:   '#EC4899', // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  special: '#10B981', // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  medal:   '#E11D48', // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
};
function achievementCategoryColor(cat: string, _themeMode?: string): string {
  return CAT_COLOR[cat] ?? '#888'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
}
const CAT_ICON: Record<string, any> = {
  streak:  'flame',
  lessons: 'book',
  combo:   'flash',
  special: 'rocket',
  medal:   'diamond',
};
const CAT_ICON_IMAGE: Record<string, any> = {
  streak:  require('../assets/images/achievement_categories/achievement-category-streak.webp'),
  lessons: require('../assets/images/achievement_categories/achievement-category-lessons.webp'),
  combo:   require('../assets/images/achievement_categories/achievement-category-combo.webp'),
  special: require('../assets/images/achievement_categories/achievement-category-special.webp'),
};
// зачем (EN_READINESS_R1, 12.10): названия категорий — через triLang по одной строке на категорию (раньше девять словарей по языкам, русский и украинский стояли вне triLang и считались непереведёнными)
const CAT_LABELS: Record<string, Record<Lang, string>> = {
  streak: { ru: 'Цепочка', uk: 'Ланцюжок', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi ngày', id: 'Rangkaian', tr: 'Seri', pl: 'Seria' },
  lessons: { ru: 'Уроки', uk: 'Уроки', en: 'Lessons', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' },
  combo: { ru: 'Серии', uk: 'Серії', en: 'Combos', es: 'Combos', 'pt-BR': 'Combos', vi: 'Combo', id: 'Kombo', tr: 'Kombolar', pl: 'Kombo' },
  special: { ru: 'Особые', uk: 'Особливі', en: 'Special', es: 'Especiales', 'pt-BR': 'Especiais', vi: 'Đặc biệt', id: 'Spesial', tr: 'Özel', pl: 'Specjalne' },
  medal: { ru: 'Медали', uk: 'Медалі', en: 'Medals', es: 'Medallas', 'pt-BR': 'Medalhas', vi: 'Huy chương', id: 'Medali', tr: 'Madalyalar', pl: 'Medale' },
};

const CATEGORIES = ['streak', 'lessons', 'combo', 'special', 'medal'] as const;
type ShelfCategory = 'all' | Achievement['category'];

function achievementShelfCategoryLabel(category: ShelfCategory, lang: Lang): string {
  if (category === 'all') {
    return triLang(lang, {
      ru: 'Все', uk: 'Усі', en: 'All', es: 'Todas', 'pt-BR': 'Todas',
      vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystkie',
    });
  }

  return triLang(lang, CAT_LABELS[category]);
}
const ACHIEVEMENT_DATE_LOCALES: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
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
  // зачем (EN_READINESS_R1, 12.10): слово «награда» в нужной форме через общий помощник склонения (constants/plural.ts), каждая форма — одной строкой triLang
  const word = pluralWord(lang, n, {
    one: triLang(lang, { ru: 'награда', uk: 'нагорода', en: 'reward', es: 'recompensa', 'pt-BR': 'recompensa', vi: 'phần thưởng', id: 'hadiah', tr: 'ödül', pl: 'nagroda' }),
    few: triLang(lang, { ru: 'награды', uk: 'нагороди', en: 'rewards', es: 'recompensas', 'pt-BR': 'recompensas', vi: 'phần thưởng', id: 'hadiah', tr: 'ödül', pl: 'nagrody' }),
    many: triLang(lang, { ru: 'наград', uk: 'нагород', en: 'rewards', es: 'recompensas', 'pt-BR': 'recompensas', vi: 'phần thưởng', id: 'hadiah', tr: 'ödül', pl: 'nagród' }),
  });
  return `${n} ${word}`;
}

function achievementCountPairLabel(unlocked: number, total: number, lang: Lang): string {
  if (unlocked === total) return achievementCountLabel(unlocked, lang);
  const word = triLang(lang, { ru: 'наград', uk: 'нагород', en: 'rewards', es: 'recompensas', 'pt-BR': 'recompensas', vi: 'phần thưởng', id: 'hadiah', tr: 'ödül', pl: 'nagród' });
  return `${unlocked}/${total} ${word}`;
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
  const lockedTint  = isDark ? '#383838' : '#B0B0C0'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  const lockedIcon  = isDark ? '#383838' : '#FFFFFF'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
  const tintColor = isLocked ? lockedTint : inProgress ? color + (isDark ? '55' : '88') : color;
  const iconColor = isLocked ? lockedIcon : inProgress ? color + (isDark ? 'BB' : 'CC') : '#fff'; // theme-exempt: палитра категорий достижений и скрим окна (токены категорий — у «Тем»)
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
  achievement, state, stats, f, isDark, onClose, revealLockedDetails, studyTarget,
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
  // зачем (R56, аудит кнопок 15.10): двойной тап «Поделиться» открывал два системных окна
  const shareInFlightRef = useRef(false);
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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
  // `.om-modal`: поля 21 (на узком экране 18).
  const modalPad = screenW < 360 ? 18 : 21;

  // `.om-rarity` «Получено · 18.09.2026» — дата цифрами.
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const dateLocale = ACHIEVEMENT_DATE_LOCALES[lang];
    return d.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const obtainedLabel = triLang(lang, { ru: 'Получено', uk: 'Отримано', en: 'Received', es: 'Obtenido', 'pt-BR': 'Obtido', vi: 'Đã nhận', id: 'Diperoleh', tr: 'Alındı', pl: 'Zdobyto' });
  const shareLabel = triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', en: 'Share', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' });
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  // зачем: владелец 2026-09-29 — Liquid Glass «1 в 1 с макета» (overlays-more.html
  // OM-ACHIEVEMENT-EARNED / -PROGRESS): непрозрачное досье из токенов активной темы (13 тем), без
  // градиентов и обводок. 04.10 — сверка с кадром: окно r26/p21, герой 178/r20 сразу сверху (крестик
  // поверх), чип «Получено · дата» по центру, заголовок 25/31 и текст 16/22 слева, плашка «Как получить»
  // 13/19, нейтральная полоса прогресса 8, «Поделиться» — тёмная капсула 48/24 без значков.
  return (
    <HybridAlertShell scrollContent={false}
      visible
      onRequestClose={onClose}
      shadowColor={EXEMPT_COLOR_1}
      backdropColor={EXEMPT_COLOR_2}
      testID="achievement-dossier-backdrop"
    >
      <View
        testID="achievement-award-dossier"
        style={{
          backgroundColor: glass.opaqueSheet,
          borderRadius: 26,
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
            position: 'absolute', top: 14, right: 14, zIndex: 3,
            width: 44, height: 44, borderRadius: 22, backgroundColor: glass.selected,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={18} color={glass.text} />
        </TapScale>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: modalPad, alignItems: 'stretch' }}
        >
          <View
            testID="achievement-dossier-hero"
            style={{
              minHeight: 178,
              borderRadius: 20,
              backgroundColor: glass.opaqueControl,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && showLockedDetails}
              color={color}
              iconName={iconName}
              size={124}
              maskBg={glass.opaqueControl}
              achievementId={achievement.id}
              isDark={isDark}
            />
          </View>

          {unlocked && state?.unlockedAt ? (
            <View
              testID="achievement-dossier-obtained"
              style={{
                alignSelf: 'center', marginTop: 12, paddingVertical: 5, paddingHorizontal: 10,
                borderRadius: 999, backgroundColor: glass.selected,
              }}
            >
              <Text style={{ color: glass.text, fontSize: 13, lineHeight: 17, fontWeight: '800' }}>
                {obtainedLabel} · {formatDate(state.unlockedAt)}
              </Text>
            </View>
          ) : null}

          <Text accessibilityRole="header" style={{ marginTop: 7, color: glass.text, fontSize: 25, lineHeight: 31, fontWeight: '800' }}>
            {unlocked || showLockedDetails ? name : triLang(lang, {
              ru: 'Секретное достижение', uk: 'Секретне досягнення', en: 'Secret achievement', es: 'Logro secreto',
              'pt-BR': 'Conquista secreta', vi: 'Thành tựu bí mật', id: 'Pencapaian rahasia',
              tr: 'Gizli başarı', pl: 'Tajne osiągnięcie',
            })}
          </Text>
          <Text
            testID="achievement-dossier-description"
            style={{ marginTop: 9, color: glass.secondary, fontSize: 16, lineHeight: 22, fontWeight: '400' }}
          >
            {unlocked || showLockedDetails ? desc : triLang(lang, {
              ru: 'Разблокируй, чтобы узнать', uk: 'Розблокуй, щоб дізнатись',
              en: 'Unlock to find out',
              es: 'Desbloquéalo para descubrirlo', 'pt-BR': 'Desbloqueie para descobrir',
              vi: 'Mở khóa để xem', id: 'Buka untuk mengetahui', tr: 'Öğrenmek için aç',
              pl: 'Odblokuj, aby zobaczyć',
            })}
          </Text>

          {condition && (unlocked || showLockedDetails) ? (
            <View
              testID="achievement-dossier-condition"
              style={{
                width: '100%', marginTop: 13, backgroundColor: glass.opaqueControl, borderRadius: 16,
                paddingHorizontal: 14, paddingVertical: 13,
              }}
            >
              <Text style={{ color: glass.text, fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 4 }}>
                {triLang(lang, {
                  ru: 'Как получить', uk: 'Як отримати', en: 'How to get it', es: 'Cómo conseguirlo',
                  'pt-BR': 'Como conseguir', vi: 'Cách nhận', id: 'Cara mendapatkan',
                  tr: 'Nasıl kazanılır', pl: 'Jak zdobyć',
                })}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 19, fontWeight: '400' }}>
                {condition}
              </Text>
            </View>
          ) : null}

          {prog && prog[1] > 0 ? (
            <>
              {/* `.om-progress`: полоса 8, нейтральная заливка цветом текста */}
              <View testID="achievement-dossier-progress" style={{ height: 8, marginTop: 12, backgroundColor: glass.selected, borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${progPct}%` as any, backgroundColor: glass.text, borderRadius: 6 }} />
              </View>
              <Text style={{ marginTop: 9, color: glass.secondary, fontSize: 16, lineHeight: 22, fontWeight: '400', textAlign: 'center' }}>
                {prog[0]} / {prog[1]}
                {prog[1] - prog[0] > 0 && progPct > 0 && (
                  `  ·  ${triLang(lang, { ru: 'ещё', uk: 'ще', en: 'more', es: 'faltan', 'pt-BR': 'faltam', vi: 'còn', id: 'lagi', tr: 'kaldı', pl: 'jeszcze' })} ${prog[1] - prog[0]}`
                )}
              </Text>
            </>
          ) : null}

          {unlocked && (
            <TapScale
              testID="achievement-share-primary"
              accessibilityRole="button"
              accessibilityLabel={shareLabel}
              scaleTo={0.97}
              style={{
                width: '100%', minHeight: 48, marginTop: 13, backgroundColor: glass.opaqueControl, borderRadius: 24,
                paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
              }}
              onPress={async () => {
                if (shareInFlightRef.current) {
                  console.log('[ACH-SHARE] повторный тап — окно «Поделиться» уже открыто'); // guard-ok: ранний выход
                  return;
                }
                shareInFlightRef.current = true;
                try {
                  const msg = buildAchievementShareMessage(lang, name, STORE_URL);
                  const result = await Share.share({ message: msg }).catch(noteSwallowedAs('achievements_screen:AchievementModal.share', null));
                  // зачем (R56): событие achievement_shared проверка достижений не отслеживает (пустой вызов) — убран; итог в журнал
                  console.log(`[ACH-SHARE] итог action=${result?.action ?? 'none'} studyTarget=${studyTarget}`); // guard-ok: итог жеста
                } finally {
                  shareInFlightRef.current = false;
                }
              }}
            >
              <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700' }}>
                {shareLabel}
              </Text>
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
/** Последние показанные состояния достижений: память процесса, ключ — аккаунт (stable id), чтобы чужой аккаунт не показывался первым кадром. */
let lastAchievementStates: { owner: string; states: AchievementState[] } | null = null;
function peekLastAchievementStates(): AchievementState[] | null {
  const owner = peekStableId();
  return owner && lastAchievementStates?.owner === owner ? lastAchievementStates.states : null;
}
function rememberLastAchievementStates(next: AchievementState[]): void {
  const owner = peekStableId();
  if (owner) lastAchievementStates = { owner, states: next };
}

export default function AchievementsScreen() {
  const router          = useRouter();
  const { theme: t, f, isDark, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang }        = useLang();
  const { studyTarget } = useStudyTarget();
  const { width: screenW } = useWindowDimensions();
  const gridMetrics = useMemo(() => getAchievementGridMetrics(screenW), [screenW]);
  const isUK = lang === 'uk';

  // зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): раньше на КАЖДОМ открытии шёл скелетон-полка, пока читалось
  // хранилище. Последние показанные состояния держим в памяти по аккаунту — первый кадр рисуется из них, чтение хранилища и пересчёт идут фоном.
  const [states, setStates]   = useState<AchievementState[]>(() => peekLastAchievementStates() ?? []);
  // зачем (аудит 2026-08-22): states стартует пустым массивом, и до прихода
  // loadAchievementStates() полка ложно показывала «Пока нет наград» даже
  // игроку с десятками наград. Паттерн — как в collectibles_screen: держим
  // «загружено хоть раз» отдельно от «пусто по-настоящему».
  const [achievementsLoaded, setAchievementsLoaded] = useState(() => peekLastAchievementStates() !== null);
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
  // зачем: витрина достижений была полностью немой — открытие озвучиваем один
  // раз на mount, отдельным эффектом от прогрева арта, чтобы не зависеть от
  // его логики кеша.
  useEffect(() => {
    soundDirector.request('pm.achievements.open', { scope: 'achievements' });
  }, []);

  // зачем: при открытии экрана иконки на долю секунды показывали старое
  // (пустое) состояние — все награды рисовались «не полученными» и лишь потом
  // перекрашивались. Причина была в порядке: до чтения состояний стояли три
  // тяжёлых await (история лиги + два checkAchievements), хотя сами состояния
  // лежат в AsyncStorage и читаются мгновенно. Теперь сначала показываем
  // сохранённое состояние, а пересчёт догоняет фоном и лишь дописывает то,
  // что реально изменилось.
  useEffect(() => {
    let cancelled = false;

    const applyStates = (nextStates: AchievementState[], origin: string) => {
      if (cancelled) {
        console.log('[ACH-BOOT] apply skipped: unmounted', { origin });
        return;
      }
      rememberLastAchievementStates(nextStates);
      setStates(nextStates);
      setAchievementsLoaded(true);
      console.log('[ACH-BOOT] states applied', {
        origin,
        total: nextStates.length,
        unlocked: nextStates.filter((state) => !!state.unlockedAt).length,
      });
    };

    void (async () => {
      // Шаг 1 — мгновенный кадр из локального хранилища, без пересчётов.
      const cachedStates = await loadAchievementStates().catch((e) => {
        console.warn('[ACH-BOOT] cached load failed', e instanceof Error ? e.message : String(e));
        return [] as AchievementState[];
      });
      applyStates(cachedStates, 'cache');

      // Шаг 2 — тяжёлый пересчёт после первого кадра. Экран уже честный.
      if (cancelled) return;
      try {
        await checkAchievements({ type: 'backfill', studyTarget });
      } catch (e) {
        console.warn('[ACH-BOOT] recheck failed', e instanceof Error ? e.message : String(e));
      }

      if (cancelled) return;
      const freshStates = await loadAchievementStates().catch((e) => {
        console.warn('[ACH-BOOT] fresh load failed', e instanceof Error ? e.message : String(e));
        return null;
      });
      // Перерисовываем только если пересчёт реально что-то открыл — иначе
      // лишний setState дал бы ровно то мерцание, от которого уходим.
      if (!freshStates) return;
      const cachedUnlocked = cachedStates.filter((state) => !!state.unlockedAt).length;
      const freshUnlocked = freshStates.filter((state) => !!state.unlockedAt).length;
      if (freshUnlocked === cachedUnlocked && freshStates.length === cachedStates.length) {
        console.log('[ACH-BOOT] recheck changed nothing, keeping first frame', { unlocked: freshUnlocked });
        return;
      }
      applyStates(freshStates, 'recheck');
    })();

    const interaction = InteractionManager.runAfterInteractions(() => {
      loadAchievementStats().then(setStats).catch((e) => {
        console.warn('[ACH-BOOT] stats failed', e instanceof Error ? e.message : String(e));
      });
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
          minHeight: 148, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 17, gap: 12, // зачем (владелец 12.10, стиль «Тень»): плашка без рамки и без верхней светлой черты — отделяют тон и тень
          shadowColor: t.shadowDark, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12,
          shadowRadius: 14, ...noAndroidOutline, overflow: 'hidden', // зачем: Android рисует квадрат вокруг скруглённой плашки без непрозрачного фона (сторож android_no_square_outline)
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
          <View
            testID="achievement-gallery-plaque-marker"
            style={{
              width: 42, height: 42, borderRadius: 14, backgroundColor: t.bgSurface,
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
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="open-outline" size={20} color={t.accentText} />
          </View>
        </View>
        <Text style={{ color: t.accentText, fontSize: f.body, fontWeight: '700', lineHeight: Math.round(f.body * 1.5) }}>
          {achievementDescForLang(achievement, lang)}
        </Text>
        {condition ? (
          <View
            testID="achievement-gallery-condition"
            style={{
              backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 13,
              paddingVertical: 11, gap: 5,
            }}
          >
            <Text style={{ color: t.accentText, fontSize: f.caption, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {triLang(lang, {
                ru: 'Как получить', uk: 'Як отримати', en: 'How to get it', es: 'Cómo conseguirlo',
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
          <View style={{ alignSelf: 'flex-start', minHeight: 32, borderRadius: 11, backgroundColor: t.bgSurface, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons name="calendar-outline" size={15} color={t.textMuted} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}>
              {unlockedAt}
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  }, [f.body, f.caption, f.h3, f.sub, lang, stateMap, t.bgCard, t.bgSurface, t.bgSurface2, t.border, t.borderHighlight, t.shadowDark, t.textMuted, t.textPrimary, t.textSecond, themeMode]);
  // зачем: nearestAchievements (питал удалённую секцию «Ближайшие награды») больше не нужен
  const achievementSections = useMemo((): AchievementListSection[] => {
    const sections = CATEGORIES.flatMap(cat => {
      const color = achievementCategoryColor(cat, themeMode);
      const catIcon = CAT_ICON[cat];
      const catIconImage = CAT_ICON_IMAGE[cat];
      const title = triLang(lang, CAT_LABELS[cat]);
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
          {/* зачем (владелец 2026-09-30): круглая кнопка «назад» 44 dp по макету results.html RES-ACH. */}
          <ResultsGlassBackButton
            glass={glass}
            testID="achievements-back"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            onPress={() => safeRouterBack(router)}
          />
          <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', lineHeight: Math.round(f.h2 * 1.15) }}
            >
              {triLang(lang, { ru: 'Достижения', uk: 'Досягнення', en: 'Achievements', es: 'Logros', 'pt-BR': 'Conquistas', vi: 'Thành tựu', id: 'Pencapaian', tr: 'Başarılar', pl: 'Osiągnięcia' })}
            </Text>
            {/* Подпись-расшифровка под названием убрана (правило владельца); счёт — в пилюле справа, полная форма — в a11y. */}
          </View>
          {ENABLE_DEV_TOOLS && (
            <TouchableOpacity
              testID="achievements-dev-show-all-toggle"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Показать весь каталог для проверки', uk: 'Показати весь каталог для перевірки',
                en: 'Show the full catalog for review',
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
                borderWidth: 1, // shadow-ok: служебная DEV-кнопка (в магазинной сборке её нет), не контейнер экрана
                borderColor: showAllAchievements ? t.gold + '77' : t.bgSurface2,
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              <Text numberOfLines={1} style={{ color: showAllAchievements ? t.accentText : t.accentText, fontWeight: '900', fontSize: Math.max(11, Math.min(f.sub, 14)) }}>
                {showAllAchievements ? 'DEV: all' : 'DEV'}
              </Text>
            </TouchableOpacity>
          )}
          <ResultsGlassCountPill glass={glass} label={headerCountLabel} accessibilityLabel={visibleCountLabel} testID="achievements-count" />
        </View>

        <ScrollView decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 128, gap: 16 }}
        >
          {!achievementsLoaded ? (
            // зачем (аудит 2026-08-22): пока states не загружены, полка молчит
            // скелетоном — не «Пока нет наград» ложью.
            // зачем (2026-09-02): скелетон 96x116 был меньше витрины (306) — при появлении
            // полки экран прыгал, и это читалось как «моргнуло старое состояние».
            // Держим ту же геометрию, что и карусель: подмена происходит без сдвига.
            <View style={{ gap: 12 }}>
              <SkeletonBlock
                width={Math.max(280, Math.min(screenW - 32, 608))}
                height={306}
                borderRadius={24}
              />
              <View style={{ minHeight: 16 }} />
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
            <ResultsGlassEmptyState
              glass={glass}
              testID="achievements-empty"
              icon="trophy-outline"
              title={triLang(lang, { ru: 'Полка пока пуста', uk: 'Полиця поки порожня', en: 'The shelf is empty for now', es: 'La estantería está vacía por ahora', 'pt-BR': 'A prateleira ainda está vazia', vi: 'Kệ vẫn đang trống', id: 'Rak masih kosong', tr: 'Raf şimdilik boş', pl: 'Półka jest jeszcze pusta' })}
              body={triLang(lang, { ru: 'Здесь будут твои награды. Занимайся — и полка постепенно заполнится.', uk: 'Тут будуть твої нагороди. Займайся — і полиця поступово заповниться.', en: 'Your rewards will appear here. Keep practicing and the shelf will gradually fill up.', es: 'Aquí estarán tus recompensas. Sigue practicando y la estantería se irá llenando.', 'pt-BR': 'Suas recompensas aparecerão aqui. Continue praticando e a prateleira vai se encher.', vi: 'Phần thưởng của bạn sẽ xuất hiện ở đây. Cứ luyện tập, chiếc kệ sẽ dần đầy lên.', id: 'Hadiahmu akan muncul di sini. Terus berlatih, rak ini akan terisi sedikit demi sedikit.', tr: 'Ödüllerin burada görünecek. Çalışmaya devam et, rafın yavaş yavaş dolsun.', pl: 'Tutaj pojawią się twoje nagrody. Ćwicz, a półka stopniowo się zapełni.' })}
            />
          )}

          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ReportErrorButton
              screen="achievements"
              dataId="achievements_shelf"
              dataText={triLang(lang, {
                ru: 'Достижения', uk: 'Досягнення', en: 'Achievements', es: 'Logros', 'pt-BR': 'Conquistas',
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
            en: 'Choose achievement category',
            es: 'Elegir categoría de logros', 'pt-BR': 'Escolher categoria de conquistas',
            vi: 'Chọn hạng mục thành tựu', id: 'Pilih kategori pencapaian',
            tr: 'Başarı kategorisini seç', pl: 'Wybierz kategorię osiągnięć',
          })}
          closeLabel={triLang(lang, {
            ru: 'Закрыть выбор категорий', uk: 'Закрити вибір категорій',
            en: 'Close category picker',
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

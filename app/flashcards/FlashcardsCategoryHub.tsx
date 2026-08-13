/**
 * Cards 2.1 §1–§3 — КАТАЛОГ НАБОРОВ раздела «Карточки» (экран `/flashcards_packs`,
 * правая позиция таббара «Наборы»).
 *
 * Что здесь есть:
 *   • «Мои наборы» — уже добавленные наборы (открываются как набор карточек);
 *   • «Наборы сообщества» — сетка компактных плиток ПО 3 В РЯД: иконка, название,
 *     лайки и счётчик добавлений. Плитка открывается ДО добавления — в режиме
 *     просмотра (`preview=1`), где и живут «Добавить себе» и лайк;
 *   • фильтр каталога: поиск по названию + сортировка «Популярные / Новые /
 *     Больше карточек» (замечания владельца после теста на iPhone).
 *
 * Чего здесь БОЛЬШЕ НЕТ (по спеке):
 *   • чипа баланса осколков в шапке и любых цен/paywall (§1.2, §1.3);
 *   • hero-CTA и входа «Тренировка» из раздела (§4) — режимы живут в таббаре (§5.2);
 *   • секции «Режимы практики» и витрины официальных наборов (§1.1);
 *   • какой-либо звёздной механики раздела (§3).
 *
 * Анимации §8: каскад FadeInDown секций, spring-press на карточках; только
 * transform/opacity, деградация при reduceMotion / lowPower.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { triLang } from '../../constants/i18n';
import type { Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import { FC_SPRING, FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, type FlashcardMarketPack } from './marketplace';
import { isLowPowerEffective } from './low_power';

import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { sortPacksBySocial, topLikedPackIds } from '../community_packs/packSocial';
import { bundledPackTilePng, packTileImageForPack } from './packMarketplaceIcons';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import ReportErrorButton from '../../components/ReportErrorButton';
import ReportPackModal from '../../components/ReportPackModal';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { hapticTap } from '../../hooks/use-haptics';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

type Props = {
  lang: Lang;
  t: Theme;
  marketPacks: FlashcardMarketPack[];
  ownedPackIds: string[];
  /** Перечитать каталог/владение после «Добавить себе». */
  onMarketRefresh: () => void | Promise<void>;
  /** UGC-каталог доступен только с облаком (без Expo Go). */
  cloudCommunityEnabled?: boolean;
  communityPacks?: FlashcardMarketPack[];
  ownedCommunityPackIds?: string[];
  /** Stable id автора — кнопка «редактировать» на своих UGC. */
  hubAuthorStableId?: string | null;
  /** Для контраста подписей на `ScreenGradient` (Океан / Сакура). */
  themeMode: ThemeMode;
  /** Изоляция целей обучения: черновики/скрытые наборы/staging читаются по текущей цели. */
  studyTarget?: RuntimeStudyTarget;
};

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;

/**
 * Инвариант проекта (layout_stability_contract): разделы открываются СТАТИЧНО —
 * входной каскад держим за выключенным флагом. Код анимации оставлен, но не
 * применяется; чтобы вернуть каскад §8, достаточно переключить флаг.
 */
const FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED = false;
/** Каскад секций: FadeInDown.duration(300).delay(min(i,8)*60).springify().damping(14) */
const sectionEntering = (i: number) =>
  FadeInDown.duration(FC_TIMING.enter).delay(fcStaggerDelay(i)).springify().damping(14);

const SPRING_CFG = { ...FC_SPRING.press, mass: 0.35 } as const;

function shadowForTile(t: Theme, kind: 'base' | 'owned' | 'top'): ViewStyle {
  const os = getEffectivePlatformOS();
  if (os === 'web') return {};
  if (os === 'android') return { elevation: kind === 'base' ? 3 : 4 };
  if (kind === 'top') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    };
  }
  if (kind === 'owned') {
    return {
      shadowColor: t.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    };
  }
  return {
    shadowColor: t.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  };
}

type HubTileShellProps = {
  testID: string;
  a11y: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  reduceMotion: boolean;
  width: number;
  children: React.ReactNode;
};

/** Пружина на нажатии (scale ~0,96) — мягкая, без «мультяшности» (§8). */
function HubTileShell({ testID, a11y, onPress, onLongPress, disabled, reduceMotion, width, children }: HubTileShellProps) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <ReanimatedPressable
      testID={testID}
      accessibilityLabel={a11y}
      accessible
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 420 : undefined}
      disabled={disabled}
      onPressIn={() => {
        if (reduceMotion) {
          s.value = withTiming(0.99, { duration: 50 });
        } else {
          s.value = withSpring(0.96, SPRING_CFG);
        }
      }}
      onPressOut={() => {
        s.value = reduceMotion ? withTiming(1, { duration: 90 }) : withSpring(1, SPRING_CFG);
      }}
      style={[{ width, alignItems: 'center' }, aStyle]}
    >
      {children}
    </ReanimatedPressable>
  );
}

/** Сортировка каталога сообщества (§ фильтр, замечание владельца). */
export type CommunityPacksSort = 'popular' | 'new' | 'size';

const COMMUNITY_SORTS: CommunityPacksSort[] = ['popular', 'new', 'size'];

export function communitySortLabel(sort: CommunityPacksSort, lang: Lang): string {
  if (sort === 'new') {
    return triLang(lang, {
      ru: 'Новые', uk: 'Нові', es: 'Nuevos',
      'pt-BR': 'Novos', vi: 'Mới', id: 'Baru', tr: 'Yeni', pl: 'Nowe',
    });
  }
  if (sort === 'size') {
    return triLang(lang, {
      ru: 'Больше карточек', uk: 'Більше карток', es: 'Más tarjetas',
      'pt-BR': 'Mais cartões', vi: 'Nhiều thẻ hơn', id: 'Kartu terbanyak', tr: 'Daha çok kart', pl: 'Więcej kart',
    });
  }
  return triLang(lang, {
    ru: 'Популярные', uk: 'Популярні', es: 'Populares',
    'pt-BR': 'Populares', vi: 'Phổ biến', id: 'Populer', tr: 'Popüler', pl: 'Popularne',
  });
}

/** Совпадение по названию набора во всех локалях каталога. */
export function communityPackMatchesQuery(pack: FlashcardMarketPack, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    pack.titleRu, pack.titleUk, pack.titleEs, pack.titlePtBr,
    pack.titleVi, pack.titleId, pack.titleTr, pack.titlePl, pack.codeName,
  ];
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
}

/** Чистая функция каталога: поиск по названию + выбранная сортировка. */
export function applyCommunityPacksFilter(
  packs: FlashcardMarketPack[],
  query: string,
  sort: CommunityPacksSort,
): FlashcardMarketPack[] {
  const found = packs.filter((p) => communityPackMatchesQuery(p, query));
  if (sort === 'new') {
    return [...found].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.id.localeCompare(b.id),
    );
  }
  if (sort === 'size') {
    return [...found].sort((a, b) => b.cardCount - a.cardCount || a.id.localeCompare(b.id));
  }
  return sortPacksBySocial(found);
}

type CommunityPackTileProps = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  width: number;
  owned: boolean;
  isTop: boolean;
  reduceMotion: boolean;
  showEdit: boolean;
  labelSize: number;
  icon: React.ReactNode;
  onOpen: () => void;
  onLongPress?: () => void;
  onEdit: () => void;
};

/**
 * Компактная плитка набора сообщества (сетка 3-в-ряд): иконка, название,
 * ник автора, лайки и счётчик добавлений. Открывается и БЕЗ добавления —
 * в режиме просмотра.
 */
function CommunityPackTile({
  pack, lang, t, width, owned, isTop, reduceMotion, showEdit, labelSize, icon, onOpen, onLongPress, onEdit,
}: CommunityPackTileProps) {
  const authorName = useCommunityAuthorName(pack, lang);
  const title = packTitleForInterface(pack, lang) || packHubCodeName(pack);

  return (
    <View style={{ width, alignItems: 'center', paddingBottom: 4, position: 'relative' }}>
      <HubTileShell
        testID={`flashcards-pack-card-${pack.id}`}
        a11y={`qa-flashcards-pack-card-${pack.id}`}
        width={width}
        reduceMotion={reduceMotion}
        onPress={onOpen}
        onLongPress={onLongPress}
      >
        <View
          style={[
            {
              width,
              height: width,
              borderRadius: TILE_RADIUS,
              borderWidth: isTop ? 1.5 : 1,
              borderColor: isTop ? `${t.accent}88` : owned ? t.accent : t.border,
              backgroundColor: t.bgSurface,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            },
            shadowForTile(t, isTop ? 'top' : owned ? 'owned' : 'base'),
          ]}
        >
          {icon}
          {pack.cardCount > 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', right: 5, bottom: 5,
                borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1,
                backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: t.textSecond }}>{pack.cardCount}</Text>
            </View>
          ) : null}
          {isTop ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', left: 5, top: 5,
                borderRadius: 999, padding: 3,
                backgroundColor: `${t.accent}22`, borderWidth: 1, borderColor: `${t.accent}66`,
              }}
            >
              <Ionicons name="trending-up-outline" size={10} color={t.accent} />
            </View>
          ) : null}
          {owned ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute', right: 5, top: 5,
                borderRadius: 999, padding: 3,
                backgroundColor: `${t.accent}22`, borderWidth: 1, borderColor: `${t.accent}66`,
              }}
            >
              <Ionicons name="checkmark" size={10} color={t.accent} />
            </View>
          ) : null}
        </View>
      </HubTileShell>

      {showEdit ? (
        <TouchableOpacity
          testID={`flashcards-pack-card-edit-${pack.id}`}
          onPress={onEdit}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{
            position: 'absolute', top: 2, left: 2, zIndex: 8,
            padding: 6, borderRadius: 12, backgroundColor: `${t.bgPrimary}CC`,
          }}
        >
          <Ionicons name="create-outline" size={15} color={t.textPrimary} />
        </TouchableOpacity>
      ) : null}

      <Text
        style={{
          marginTop: 7, fontSize: labelSize + 1, fontWeight: '700',
          color: t.textPrimary, textAlign: 'center', lineHeight: labelSize + 4,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={{ marginTop: 2, fontSize: Math.max(8, labelSize - 1), fontWeight: '600', color: t.textMuted, textAlign: 'center' }}
        numberOfLines={1}
      >
        {authorName}
      </Text>
      <View style={{ marginTop: 5 }}>
        <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={owned} variant="tile" />
      </View>
    </View>
  );
}

export default function FlashcardsCategoryHub({
  lang,
  t,
  marketPacks,
  ownedPackIds,
  onMarketRefresh,
  cloudCommunityEnabled = false,
  communityPacks = [],
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  themeMode,
  studyTarget,
}: Props) {
  const router = useRouter();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasUnfinishedPackDraft, setHasUnfinishedPackDraft] = useState(false);
  const [hiddenCommunityPackIds, setHiddenCommunityPackIds] = useState<Set<string>>(() => new Set());
  const [ugcReportHintPackId, setUgcReportHintPackId] = useState<string | null>(null);
  const [reportModalPack, setReportModalPack] = useState<FlashcardMarketPack | null>(null);
  /**
   * §1.3: «Добавить себе» — оптимистично. Локально помеченные наборы сразу читаются
   * как свои (плитка становится открываемой), сервер/сторедж догоняют по `onMarketRefresh`.
   */
  const [locallyAddedPackIds, setLocallyAddedPackIds] = useState<Set<string>>(() => new Set());
  /** Фильтр каталога сообщества: поиск по названию + сортировка. */
  const [communityQuery, setCommunityQuery] = useState('');
  const [communitySort, setCommunitySort] = useState<CommunityPacksSort>('popular');

  const lowPower = isLowPowerEffective();
  /** Каскад входа выключаем при reduceMotion / lowPower (декоративная ветка §8). */
  const animateSections = FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED && !reduceMotion && !lowPower;
  const enterProps = (i: number) =>
    (animateSections ? { entering: FLASHCARD_HUB_ENTRANCE_MOTION_ENABLED ? sectionEntering(i) : undefined } : {});

  const refreshHiddenCommunityPacks = useCallback(async () => {
    const ids = await loadHiddenCommunityPackIds(studyTarget);
    setHiddenCommunityPackIds(new Set(ids));
  }, [studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft(studyTarget, lang);
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      void refreshHiddenCommunityPacks();
      return () => {
        cancelled = true;
      };
    }, [refreshHiddenCommunityPacks, studyTarget, lang]),
  );

  const { width: winW } = useWindowDimensions();
  const tileW = useMemo(() => {
    const inner = winW - H_PAD * 2 - GAP * (COLS - 1);
    return Math.max(96, Math.floor(inner / COLS));
  }, [winW]);

  /** Плитки наборов: PNG/линия — крупный центр. */
  const packTileIconSize = Math.max(72, Math.floor(tileW * 0.86));
  const labelSize = Math.max(9, Math.min(11, Math.floor(tileW * 0.11)));

  /**
   * В этом проекте градиентных тем (`ocean` / `sakura`) нет — подписи всегда
   * рендерятся на обычной поверхности, поэтому берём цвета прямо из темы.
   */
  const isGradientSurface = false;
  const hubLabelPrimary = t.textPrimary;
  const hubLabelMuted = t.textMuted;
  const hubLabelAccent = t.accent;

  /** Свой набор: добавлен, авторский, или id в общем `ownedPackIds` (легаси-ветка). */
  const isCommunityPackMine = useCallback(
    (p: FlashcardMarketPack) =>
      ownedCommunityPackIds.includes(p.id) ||
      locallyAddedPackIds.has(p.id) ||
      (!!hubAuthorStableId && !!p.authorStableId && p.authorStableId === hubAuthorStableId) ||
      (!!p.isCommunityUgc && ownedPackIds.includes(p.id)),
    [ownedCommunityPackIds, locallyAddedPackIds, hubAuthorStableId, ownedPackIds],
  );

  /** «Мои наборы»: добавленные официальные (легаси-владение) + свои/добавленные UGC. */
  const mineOwnedPacks = useMemo(() => {
    const catalogOwnedOrdered = marketPacks.filter((p) => ownedPackIds.includes(p.id));
    const catalogIds = new Set(marketPacks.map((p) => p.id));
    const extraOwnedCommunity = communityPacks.filter(
      (p) => isCommunityPackMine(p) && !catalogIds.has(p.id),
    );
    return [...catalogOwnedOrdered, ...extraOwnedCommunity];
  }, [marketPacks, communityPacks, ownedPackIds, isCommunityPackMine]);

  /**
   * §2.3: каталог сортируется по лайкам ↓ → добавлениям ↓ → свежести.
   * Свои наборы «только на устройстве» (`local_only`) в общий каталог не попадают —
   * они живут в «Мои наборы» до публикации.
   */
  const catalogCommunityPacks = useMemo(
    () => communityPacks.filter((p) => !hiddenCommunityPackIds.has(p.id) && p.listingStatus !== 'local_only'),
    [communityPacks, hiddenCommunityPackIds],
  );

  const visibleCommunityPacks = useMemo(
    () => applyCommunityPacksFilter(catalogCommunityPacks, communityQuery, communitySort),
    [catalogCommunityPacks, communityQuery, communitySort],
  );

  /** Топ по лайкам — визуальный акцент и бейдж «В топе» (без «премиальных» коннотаций). */
  const topPackIds = useMemo(
    () => new Set(topLikedPackIds(catalogCommunityPacks)),
    [catalogCommunityPacks],
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReduceMotion(false);
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const openOwnedPack = async (pack: FlashcardMarketPack) => {
    setUgcReportHintPackId(null);
    if (pack.isCommunityUgc) {
      /** Staging UGC синхронный: помечаем pack и уходим, карточки догружаются фоном. */
      stageCommunityPackCardsForNavigation(pack.id, studyTarget);
    } else {
      /** КРИТИЧНО: staging СИНХРОННО перед router.push — первый кадр коллекции уже с карточками. */
      stageOwnedPackCardsForNavigation(pack.id);
    }
    router.push({ pathname: '/flashcards_collection', params: { pack: pack.id } } as any);
  };

  /**
   * Просмотр набора ДО добавления себе: карточки видно, тренировать/редактировать
   * нельзя (`preview=1`). Карточки подгружаются тем же staging-путём, что и у своих.
   */
  const openPackPreview = useCallback(
    (pack: FlashcardMarketPack) => {
      setUgcReportHintPackId(null);
      stageCommunityPackCardsForNavigation(pack.id, studyTarget);
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, preview: '1' },
      } as any);
    },
    [router, studyTarget],
  );

  /** §2.1: набор добавлен — сразу помечаем локально, каталог перечитываем в фоне. */
  const onPackAdded = useCallback(
    (packId: string) => {
      setLocallyAddedPackIds((prev) => {
        if (prev.has(packId)) return prev;
        const next = new Set(prev);
        next.add(packId);
        return next;
      });
      void onMarketRefresh();
    },
    [onMarketRefresh],
  );

  // ── Общие стили секций ─────────────────────────────────────────────────────
  const hubBarW = winW - H_PAD * 2;
  const sectionHeaderStyle = {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: hubLabelMuted,
    marginBottom: 10,
  };
  const sectionGapStyle = { marginBottom: 22 } as const;

  const packCodeLabelStyle = {
    marginTop: 8,
    fontSize: labelSize,
    fontWeight: '600' as const,
    letterSpacing: 0.15,
    color: hubLabelAccent,
    textAlign: 'center' as const,
    lineHeight: labelSize + 2,
  };

  /** Пилюля счётчика карточек на плитке набора. */
  const countPill = (label: string) => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 6,
        bottom: 6,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        backgroundColor: t.bgCard,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: t.textSecond }}>{label}</Text>
    </View>
  );

  /**
   * Иконка/обложка набора. Раньше бралась только по `pack.id` — у наборов
   * сообщества такой картинки нет, и плитки выходили пустыми. Теперь сперва
   * пробуем обложку, выбранную автором в редакторе (`ugcCardBackKey`), затем
   * бандл по id, и только потом — осмысленный дефолт по категории набора.
   */
  const packIcon = (pack: FlashcardMarketPack, size: number) => {
    const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
    if (png) return <Image source={png} style={{ width: size, height: size }} contentFit="contain" />;
    return (
      <Ionicons
        name={(packCategoryIonIcon(pack.category) || 'albums-outline') as any}
        size={size}
        color={pack.isCommunityUgc ? t.accent : t.textPrimary}
      />
    );
  };

  /** Плитка «Мои наборы» — открывает набор карточек. */
  const renderOwnedPackTile = (pack: FlashcardMarketPack) => {
    const displayTitle = packTitleForInterface(pack, lang);
    const hubCode = packHubCodeName(pack);
    const packTileLabel =
      pack.isCommunityUgc && displayTitle.trim().length > 0 ? displayTitle.trim() : hubCode;
    const showAuthorEdit =
      !!hubAuthorStableId &&
      !!pack.isCommunityUgc &&
      !!pack.authorStableId &&
      pack.authorStableId === hubAuthorStableId;
    return (
      <View
        key={`mine_${pack.id}`}
        style={{ width: tileW, alignItems: 'center', paddingBottom: 6, position: 'relative' }}
      >
        <HubTileShell
          testID={`flashcards-hub-pack-${pack.id}`}
          a11y={pack.isCommunityUgc ? `${pack.titleRu}. ${pack.titleUk}` : `${hubCode}. ${displayTitle}`}
          width={tileW}
          reduceMotion={reduceMotion}
          onPress={() => void openOwnedPack(pack)}
        >
          <View
            style={[
              {
                width: tileW,
                height: tileW,
                borderRadius: TILE_RADIUS,
                borderWidth: 1.5,
                borderColor: t.accent,
                backgroundColor: t.bgSurface,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                position: 'relative',
              },
              shadowForTile(t, 'owned'),
            ]}
          >
            {packIcon(pack, packTileIconSize)}
            {pack.cardCount > 0 ? countPill(String(pack.cardCount)) : null}
          </View>
        </HubTileShell>
        {showAuthorEdit ? (
          <TouchableOpacity
            testID={`flashcards-hub-pack-edit-${pack.id}`}
            onPress={() =>
              router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as any)
            }
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              zIndex: 8,
              padding: 7,
              borderRadius: 12,
              backgroundColor: `${t.bgPrimary}CC`,
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="create-outline" size={17} color={t.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <Text style={packCodeLabelStyle} numberOfLines={2}>
          {packTileLabel}
        </Text>
        {pack.isPendingUpdateReview ? (
          <Text style={{ fontSize: 9, color: hubLabelAccent, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'На проверке', uk: 'На перевірці', es: 'En revisión',
              'pt-BR': 'Em revisão', vi: 'Đang duyệt', id: 'Sedang ditinjau', tr: 'İncelemede', pl: 'W trakcie sprawdzania',
            })}
          </Text>
        ) : null}
      </View>
    );
  };

  /**
   * Плитка каталога сообщества. Тап открывает набор ДО добавления — в режиме
   * просмотра (`preview=1`): карточки видно, тренировать/редактировать нельзя,
   * «Добавить себе» и лайк живут на самом экране набора.
   */
  const renderCommunityPackTile = (pack: FlashcardMarketPack) => {
    const owned = isCommunityPackMine(pack);
    const showReportShortcut = !!pack.isCommunityUgc && !owned;
    const showAuthorEdit =
      !!hubAuthorStableId &&
      !!pack.isCommunityUgc &&
      !!pack.authorStableId &&
      pack.authorStableId === hubAuthorStableId;

    return (
      <CommunityPackTile
        key={`ugc_${pack.id}`}
        pack={pack}
        lang={lang}
        t={t}
        width={tileW}
        owned={owned}
        isTop={topPackIds.has(pack.id)}
        reduceMotion={reduceMotion}
        showEdit={showAuthorEdit}
        labelSize={labelSize}
        icon={packIcon(pack, Math.floor(tileW * 0.68))}
        onOpen={() => {
          void hapticTap();
          if (owned) {
            void openOwnedPack(pack);
          } else {
            openPackPreview(pack);
          }
        }}
        onLongPress={
          showReportShortcut
            ? () => {
                void hapticTap();
                setUgcReportHintPackId((cur) => (cur === pack.id ? null : pack.id));
              }
            : undefined
        }
        onEdit={() =>
          router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as any)
        }
      />
    );
  };

  /** Действия по долгому тапу на чужой набор — отдельной строкой под сеткой. */
  const renderReportShortcutRow = () => {
    const pack = visibleCommunityPacks.find((p) => p.id === ugcReportHintPackId);
    if (!pack) return null;
    return (
      <View
        style={{
          width: hubBarW,
          marginTop: 12,
          flexDirection: 'row',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.bgSurface,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            void hapticTap();
            setReportModalPack(pack);
            setUgcReportHintPackId(null);
          }}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        >
          <Text style={{ color: t.wrong, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>
            {triLang(lang, {
              ru: 'Пожаловаться на набор',
              uk: 'Поскаржитися на набір',
              es: 'Reportar el pack',
              'pt-BR': 'Denunciar o pacote',
              vi: 'Báo cáo bộ thẻ',
              id: 'Laporkan paket',
              tr: 'Paketi bildir',
              pl: 'Zgłoś zestaw',
            })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            void hapticTap();
            setUgcReportHintPackId(null);
            try {
              await hideCommunityPackOnDevice(pack.id, studyTarget);
              await refreshHiddenCommunityPacks();
            } catch {
              // no-op: AsyncStorage unavailable
            }
          }}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        >
          <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>
            {triLang(lang, {
              ru: 'Не показывать мне',
              uk: 'Не показувати мені',
              es: 'No mostrarme',
              'pt-BR': 'Não mostrar para mim',
              vi: 'Không hiển thị nữa',
              id: 'Jangan tampilkan lagi',
              tr: 'Bana gösterme',
              pl: 'Nie pokazuj mi',
            })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /** Компактный фильтр каталога: поиск по названию + сортировка. */
  const renderCommunityFilter = () => (
    <View style={{ width: hubBarW, marginBottom: 12, gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          height: 42,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: communityQuery.trim().length > 0 ? `${t.accent}88` : t.border,
          backgroundColor: t.bgSurface,
        }}
      >
        <Ionicons name="search-outline" size={16} color={communityQuery.trim().length > 0 ? t.accent : t.textMuted} />
        <TextInput
          testID="flashcards-packs-search"
          accessibilityLabel="qa-flashcards-packs-search"
          value={communityQuery}
          onChangeText={setCommunityQuery}
          placeholder={triLang(lang, {
            ru: 'Поиск набора', uk: 'Пошук набору', es: 'Buscar pack',
            'pt-BR': 'Buscar pacote', vi: 'Tìm bộ thẻ', id: 'Cari paket', tr: 'Paket ara', pl: 'Szukaj zestawu',
          })}
          placeholderTextColor={t.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxFontSizeMultiplier={1.2}
          style={{
            flex: 1,
            height: 40,
            paddingVertical: 0,
            includeFontPadding: false,
            textAlignVertical: 'center',
            color: t.textPrimary,
            fontSize: 14,
          }}
        />
        {communityQuery.length > 0 ? (
          <TouchableOpacity
            testID="flashcards-packs-search-clear"
            onPress={() => setCommunityQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={t.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {COMMUNITY_SORTS.map((key) => {
          const active = communitySort === key;
          return (
            <TouchableOpacity
              key={key}
              testID={`flashcards-packs-sort-${key}`}
              accessibilityLabel={`qa-flashcards-packs-sort-${key}`}
              accessible
              onPress={() => {
                void hapticTap();
                setCommunitySort(key);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? t.accent : t.border,
                backgroundColor: active ? `${t.accent}18` : 'transparent',
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: '800', color: active ? t.accent : t.textSecond }}
                numberOfLines={1}
              >
                {communitySortLabel(key, lang)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* ── 1. Заголовок каталога (без чипа осколков — §1.3) ── */}
      <Reanimated.View {...enterProps(0)} style={sectionGapStyle}>
        {/* Рекламные подписи-слоганы с экрана убраны (владелец, после теста на iPhone). */}
        <Text style={{ color: hubLabelPrimary, fontSize: 26, fontWeight: '800', letterSpacing: 0.2 }}>
          {triLang(lang, {
            ru: 'Наборы', uk: 'Набори', es: 'Packs',
            'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy',
          })}
        </Text>
      </Reanimated.View>

      {/* ── 2. «Мои наборы» ── */}
      {mineOwnedPacks.length > 0 ? (
        <Reanimated.View {...enterProps(1)} style={sectionGapStyle}>
          <Text style={sectionHeaderStyle}>
            {triLang(lang, {
              ru: 'Мои наборы', uk: 'Мої набори', es: 'Mis packs',
              'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
            })}
          </Text>
          <View style={{ width: hubBarW, flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'flex-start' }}>
            {mineOwnedPacks.map(renderOwnedPackTile)}
          </View>
        </Reanimated.View>
      ) : null}

      {/* ── 3. Каталог сообщества ── */}
      {cloudCommunityEnabled ? (
        <Reanimated.View {...enterProps(2)} style={sectionGapStyle}>
          <Text style={sectionHeaderStyle}>
            {triLang(lang, {
              ru: 'Наборы сообщества', uk: 'Набори спільноти', es: 'Packs de la comunidad',
              'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng', id: 'Paket komunitas',
              tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
            })}
          </Text>
          {hasUnfinishedPackDraft ? (
            <TouchableOpacity
              testID="flashcards-packs-continue-draft"
              onPress={() => router.push('/community_pack_create' as any)}
              style={{
                width: hubBarW,
                marginBottom: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: t.accent,
                backgroundColor: isGradientSurface ? t.bgCard : `${t.accent}1A`,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="document-text-outline" size={20} color={t.accent} />
              <Text style={{ color: isGradientSurface ? t.textPrimary : t.accent, fontWeight: '800', fontSize: 14 }}>
                {triLang(lang, {
                  ru: 'Продолжить создание набора',
                  uk: 'Продовжити створення набору',
                  es: 'Seguir creando el pack',
                  'pt-BR': 'Continuar criando o pacote',
                  vi: 'Tiếp tục tạo bộ thẻ',
                  id: 'Lanjutkan membuat paket',
                  tr: 'Paketi oluşturmaya devam et',
                  pl: 'Kontynuuj tworzenie zestawu',
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {catalogCommunityPacks.length > 0 ? renderCommunityFilter() : null}
          {visibleCommunityPacks.length === 0 ? (
            <Text style={{ color: hubLabelMuted, fontSize: 13, marginBottom: 8 }}>
              {catalogCommunityPacks.length === 0
                ? triLang(lang, {
                    ru: 'Здесь появятся наборы после публикации.',
                    uk: 'Тут з\'являться набори після публікації.',
                    es: 'Aquí verás packs tras publicarlos.',
                    'pt-BR': 'Aqui você verá pacotes após publicá-los.',
                    vi: 'Bộ thẻ sẽ xuất hiện ở đây sau khi đăng.',
                    id: 'Paket akan muncul di sini setelah dipublikasikan.',
                    tr: 'Paketler yayınlandıktan sonra burada görünür.',
                    pl: 'Zestawy pojawią się tu po opublikowaniu.',
                  })
                : triLang(lang, {
                    ru: 'Ничего не найдено.',
                    uk: 'Нічого не знайдено.',
                    es: 'No se encontró nada.',
                    'pt-BR': 'Nada encontrado.',
                    vi: 'Không tìm thấy gì.',
                    id: 'Tidak ada yang ditemukan.',
                    tr: 'Bir şey bulunamadı.',
                    pl: 'Nic nie znaleziono.',
                  })}
            </Text>
          ) : (
            <>
              <View
                style={{
                  width: hubBarW,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: GAP,
                  justifyContent: 'flex-start',
                }}
              >
                {visibleCommunityPacks.map(renderCommunityPackTile)}
              </View>
              {renderReportShortcutRow()}
            </>
          )}
        </Reanimated.View>
      ) : null}

      {/* ── 4. Футер: «Сообщить о баге» ── */}
      <Reanimated.View {...enterProps(3)} style={{ alignItems: 'center', marginTop: 2, marginBottom: 8, width: '100%' }}>
        <ReportErrorButton
          screen="flashcards_packs"
          dataId="flashcards_packs_catalog"
          dataText={triLang(lang, {
            ru: 'Карточки: каталог наборов',
            uk: 'Картки: каталог наборів',
            es: 'Tarjetas: catálogo de packs',
            'pt-BR': 'Cartões: catálogo de pacotes',
            vi: 'Thẻ: danh mục bộ thẻ',
            id: 'Kartu: katalog paket',
            tr: 'Kartlar: paket kataloğu',
            pl: 'Karty: katalog zestawów',
          })}
        />
      </Reanimated.View>

      {reportModalPack ? (
        <ReportPackModal
          visible
          packId={reportModalPack.id}
          packTitle={packTitleForInterface(reportModalPack, lang)}
          authorStableId={reportModalPack.authorStableId ?? null}
          lang={lang}
          onClose={() => setReportModalPack(null)}
          onPackHiddenOnDevice={refreshHiddenCommunityPacks}
        />
      ) : null}
    </View>
  );
}

/**
 * Cards 2.1 §1–§3 — КАТАЛОГ НАБОРОВ раздела «Карточки» (экран `/flashcards_packs`,
 * правая позиция таббара «Наборы»).
 *
 * Что здесь есть:
 *   • «Мои наборы» — уже добавленные наборы (открываются как колода);
 *   • «Наборы сообщества» — бесплатные UGC-наборы с лайками активности,
 *     счётчиком добавлений и кнопкой «Добавить себе» (`CommunityPackSocialBar`).
 *     Сортировка §2.3: лайки ↓ → добавления ↓ → свежесть; топ-наборы выделяются
 *     аккуратным акцентом раздела (не «золото»: бейдж не должен читаться как платный).
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
import { cardsCountLabel } from './deck_selection';
import { isLowPowerEffective } from './low_power';

import { actionToastTri, emitAppEvent } from '../events';
import { stageOwnedPackCardsForNavigation } from '../flashcards_collection';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { sortPacksBySocial, topLikedPackIds } from '../community_packs/packSocial';
import { bundledPackTilePng } from './packMarketplaceIcons';
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
  const visibleCommunityPacks = useMemo(
    () =>
      sortPacksBySocial(
        communityPacks.filter((p) => !hiddenCommunityPackIds.has(p.id) && p.listingStatus !== 'local_only'),
      ),
    [communityPacks, hiddenCommunityPackIds],
  );

  /** Топ по лайкам — визуальный акцент и бейдж «В топе» (без «премиальных» коннотаций). */
  const topPackIds = useMemo(
    () => new Set(topLikedPackIds(visibleCommunityPacks)),
    [visibleCommunityPacks],
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

  const packIcon = (pack: FlashcardMarketPack, size: number) => {
    const png = bundledPackTilePng(pack.id);
    if (png) return <Image source={png} style={{ width: size, height: size }} contentFit="contain" />;
    return <Ionicons name={packCategoryIonIcon(pack.category) as any} size={size} color={t.textPrimary} />;
  };

  /** Плитка «Мои наборы» — открывает набор как колоду. */
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
            {triLang(lang, { ru: 'На модерации', uk: 'На модерації', es: 'En moderación' })}
          </Text>
        ) : null}
      </View>
    );
  };

  /**
   * Карточка каталога сообщества: иконка + название + автор/размер + соц-строка
   * (лайк, счётчик добавлений, «Добавить себе»). Топ по лайкам — акцентная рамка.
   */
  const renderCommunityPackCard = (pack: FlashcardMarketPack) => {
    const owned = isCommunityPackMine(pack);
    const isTop = topPackIds.has(pack.id);
    const title = packTitleForInterface(pack, lang) || packHubCodeName(pack);
    const showReportShortcut = !!pack.isCommunityUgc && !owned;
    const showAuthorEdit =
      !!hubAuthorStableId &&
      !!pack.isCommunityUgc &&
      !!pack.authorStableId &&
      pack.authorStableId === hubAuthorStableId;
    /** Форма слова по числу: «24 карточки», а не «24 карточек» (cards-2.1). */
    const cardsLabel = cardsCountLabel(lang, pack.cardCount);

    return (
      <View
        key={`ugc_${pack.id}`}
        style={[
          {
            width: hubBarW,
            borderRadius: 20,
            borderWidth: isTop ? 1.5 : 1,
            borderColor: isTop ? `${t.accent}88` : t.border,
            backgroundColor: t.bgSurface,
            padding: 14,
            gap: 12,
          },
          shadowForTile(t, isTop ? 'top' : 'base'),
        ]}
      >
        <Pressable
          testID={`flashcards-pack-card-${pack.id}`}
          accessibilityLabel={`qa-flashcards-pack-card-${pack.id}`}
          accessible
          disabled={!owned}
          onPress={() => {
            if (!owned) return;
            void hapticTap();
            void openOwnedPack(pack);
          }}
          onLongPress={
            showReportShortcut
              ? () => {
                  void hapticTap();
                  setUgcReportHintPackId((cur) => (cur === pack.id ? null : pack.id));
                }
              : undefined
          }
          delayLongPress={showReportShortcut ? 420 : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: owned ? t.accent : t.border,
              backgroundColor: t.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {packIcon(pack, 34)}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {pack.authorName ? `${pack.authorName} · ` : ''}
              {cardsLabel}
            </Text>
            {pack.isPendingUpdateReview ? (
              <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800', marginTop: 3 }}>
                {triLang(lang, { ru: 'На модерации', uk: 'На модерації', es: 'En moderación' })}
              </Text>
            ) : null}
          </View>
          {showAuthorEdit ? (
            <TouchableOpacity
              testID={`flashcards-pack-card-edit-${pack.id}`}
              onPress={() =>
                router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as any)
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 6, borderRadius: 12, backgroundColor: `${t.textMuted}1A` }}
            >
              <Ionicons name="create-outline" size={17} color={t.textPrimary} />
            </TouchableOpacity>
          ) : owned ? (
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          ) : null}
        </Pressable>

        {/* §2: лайк активности + счётчик добавлений + бесплатное «Добавить себе» */}
        <CommunityPackSocialBar
          pack={pack}
          lang={lang}
          t={t}
          owned={owned}
          isTop={isTop}
          onAdded={onPackAdded}
        />

        {showReportShortcut && ugcReportHintPackId === pack.id ? (
          <View style={{ flexDirection: 'row', gap: 16 }}>
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
                })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* ── 1. Заголовок каталога (без чипа осколков — §1.3) ── */}
      <Reanimated.View {...enterProps(0)} style={sectionGapStyle}>
        <Text style={{ color: hubLabelPrimary, fontSize: 26, fontWeight: '800', letterSpacing: 0.2 }}>
          {triLang(lang, { ru: 'Наборы', uk: 'Набори', es: 'Packs' })}
        </Text>
        <Text style={{ color: hubLabelMuted, fontSize: 13, fontWeight: '600', marginTop: 4 }}>
          {triLang(lang, {
            ru: 'Наборы сообщества — бесплатно',
            uk: 'Набори спільноти — безкоштовно',
            es: 'Packs de la comunidad — gratis',
          })}
        </Text>
      </Reanimated.View>

      {/* ── 2. «Мои наборы» ── */}
      {mineOwnedPacks.length > 0 ? (
        <Reanimated.View {...enterProps(1)} style={sectionGapStyle}>
          <Text style={sectionHeaderStyle}>
            {triLang(lang, { ru: 'Мои наборы', uk: 'Мої набори', es: 'Mis packs' })}
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
            {triLang(lang, { ru: 'Наборы сообщества', uk: 'Набори спільноти', es: 'Packs de la comunidad' })}
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
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {visibleCommunityPacks.length === 0 ? (
            communityPacks.length === 0 ? (
              <Text style={{ color: hubLabelMuted, fontSize: 13, marginBottom: 8 }}>
                {triLang(lang, {
                  ru: 'Здесь появятся наборы после публикации и модерации.',
                  uk: 'Тут з\'являться набори після публікації та модерації.',
                  es: 'Aquí verás packs tras publicarlos y moderarlos.',
                })}
              </Text>
            ) : null
          ) : (
            <View style={{ gap: 12 }}>
              {visibleCommunityPacks.map(renderCommunityPackCard)}
            </View>
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

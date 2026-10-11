/**
 * Cards 2.1 §1–§3 — КАТАЛОГ НАБОРОВ раздела «Карточки» (экран `/flashcards_packs`,
 * правая позиция таббара «Наборы»).
 *
 * Что здесь есть:
 *   • «Мои наборы» — уже добавленные наборы (открываются как набор карточек);
 *   • «Наборы сообщества» — список строк-карточек (packs-simple.html, замок 04.10): название
 *     и «Топ», автор, ♥ · 👥 · 💬, плашка числа карточек, стрелка. Строка открывается ДО
 *     добавления — в режиме просмотра (`preview=1`), где и живут «Добавить себе» и лайк.
 *
 * Чего здесь БОЛЬШЕ НЕТ (по спеке):
 *   • заголовка «Наборы» и подзаголовка секции «Наборы сообщества» — дубль убран,
 *     единственный заголовок живёт в ШАПКЕ экрана (`flashcards_packs.tsx`);
 *   • строки поиска и кнопок сортировки — они переехали в шапку экрана
 *     (лупа + две круглые кнопки фильтров); сюда приходят уже готовые
 *     `communityQuery` / `communitySort` (замечания владельца после iPhone);
 *   • чипа баланса осколков в шапке и любых цен/paywall (§1.2, §1.3);
 *   • hero-CTA и входа «Тренировка» из раздела (§4) — режимы живут в таббаре (§5.2);
 *   • секции «Режимы практики» и витрины официальных наборов (§1.1);
 *   • какой-либо звёздной механики раздела (§3).
 *
 * Анимации §8: каскад FadeInDown секций, spring-press на карточках; только
 * transform/opacity, деградация при reduceMotion / lowPower.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { FlowText } from '../../components/text-integrity/FlowText';
import type { Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import { FC_SPRING, FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, communityPackPriceRunes, type FlashcardMarketPack } from './marketplace';
import { isLowPowerEffective } from './low_power';

import { stageOwnedPackCardsForNavigation } from './useCollectionData';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { onAppEvent } from '../events';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry, startCommunityPackOpen } from '../community_packs/stage_with_retry';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { topLikedPackIds } from '../community_packs/packSocial';
import {
  applyCommunityPacksFilter,
  type CommunityPacksSort,
} from '../community_packs/communityCatalogFilter';
import { bundledPackTilePng, packTileImageForPack } from './packMarketplaceIcons';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import ReportErrorButton from '../../components/ReportErrorButton';
import ReportPackModal from '../../components/ReportPackModal';
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { hapticTap } from '../../hooks/use-haptics';
import { DebugLogger } from '../debug-logger';
import { isLocalAuthorPackId } from '../community_packs/localAuthorPacks';
import { NO_PACK_LANGUAGE, noPackLanguageLabel, PACK_LANGUAGE_META, normalizePackLanguage, type PackLanguage } from './pack_languages';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);
type CatalogGlassTokens = ReturnType<typeof liquidGlassTokens>;

function CatalogTileGlass({ g }: { g: CatalogGlassTokens }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {/* зачем (сверка packs-simple-001, 04.10, проверено на эмуляторе): на Android dimezisBlurView захватывает
        текст самой строки и кладёт под него размытую копию — вокруг «Продолжить создание набора», «Топ», имени
        автора был белый ореол, которого нет в макете. Без этого метода размытие на Android не рисуется (под строкой
        однотонный фон — размывать нечего), ореол исчезает; iOS не меняется. */}
    <BlurView intensity={Platform.OS === 'android' ? 6 : 12} blurReductionFactor={4}
      experimentalBlurMethod="none"
      tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
    {/* зачем (Темы 05.10, гейт «приложение = макет»): блик строки — 5-точечный --lg-sheen кита (150°: белый .10 → .035 → 0 → .02 → .055),
        а не «g.selected → прозрачный»: иначе низ строки темнее макета. Цвет блика — mediaInk темы, как в KitGlassLayer. */}
    <LinearGradient colors={[`${g.mediaInk}1A`, `${g.mediaInk}09`, `${g.mediaInk}00`, `${g.mediaInk}05`, `${g.mediaInk}0E`]} locations={[0, 0.26, 0.52, 0.78, 1]}
      start={{ x: 0.25, y: 0.067 }} end={{ x: 0.75, y: 0.933 }} style={StyleSheet.absoluteFill} />
    <View style={{ height: 1, backgroundColor: g.glassEdge }} />
  </View>;
}

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
  /**
   * зачем (Сверка packs-simple-001, 🔴 ~8 с «Здесь появятся наборы после публикации»): пустое состояние каталога показываем
   * только когда данные РЕАЛЬНО пришли пустыми. Пока снимка нет и сеть не ответила — скелетон строк, а не «пусто».
   */
  communityLoaded?: boolean;
  ownedCommunityPackIds?: string[];
  /** Stable id автора — кнопка «редактировать» на своих UGC. */
  hubAuthorStableId?: string | null;
  /** Для контраста подписей на `ScreenGradient` (Океан / Сакура). */
  themeMode: ThemeMode;
  /** Изоляция целей обучения: черновики/скрытые наборы/staging читаются по текущей цели. */
  studyTarget?: RuntimeStudyTarget;
  /** Поиск по названию — состояние живёт в шапке экрана (лупа). */
  communityQuery?: string;
  /** Сброс поиска каталога (cards-section catalogNone «Сбросить фильтры»): только клиентское состояние, без запросов. */
  onResetFilters?: () => void;
  /** Сортировка каталога — круглые кнопки фильтров в шапке экрана. */
  communitySort?: CommunityPacksSort;
  /** Independent language of community packs; legacy packs normalize to English. */
  packLanguage?: PackLanguage;
};

const COLS = 3;
const GAP = 10;
// зачем (packs-simple.html): поле страницы 20, как у шапки «Сообщества» (V2.screenPad).
const H_PAD = 20;
const TILE_RADIUS = 18;
/**
 * Пропорция PNG-«веера» наборов (329x268 плюс прозрачные поля внутри кадра).
 * зачем: чтобы `contain` вписывал картинку по ВЫСОТЕ бокса, а не по ширине —
 * иначе иконка теряла ~20% размера и выглядела мелкой.
 */
const PACK_FAN_ASPECT = 329 / 268;

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
      accessibilityRole="button"
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

type CommunityPackRowProps = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  g: CatalogGlassTokens;
  width: number;
  owned: boolean;
  isTop: boolean;
  reduceMotion: boolean;
  showEdit: boolean;
  onOpen: () => void;
  onLongPress?: () => void;
  onEdit: () => void;
  opening?: boolean;
  disabled?: boolean;
};

/** packs-simple.html кадр 2: шторка долгого нажатия — заголовок набора и строки `.card .row` с плиткой 41. */
const baseSheetStyles = StyleSheet.create({
  // зачем: макет 18/700; шкала D145 (решение владельца 04.10) — 16 жирным.
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700', paddingHorizontal: 4, paddingBottom: 8 },
  row: {
    minHeight: 63,
    borderRadius: 14,
    borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — 1px полупрозрачная обводка `.card`
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 9,
    paddingLeft: 18,
    paddingRight: 16,
  },
  tile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' }, // зачем: макет 17/600, D145 — 16
});

/** packs-simple.html (замок 04.10): размеры строки `.card .row`, плашки `.cntp`, метки `.tag2`. */
const baseRowStyles = StyleSheet.create({
  card: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — 1px полупрозрачная обводка `.card`
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 9,
    paddingLeft: 18,
    paddingRight: 16,
    overflow: 'hidden',
  },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  // зачем: макет 17/22 жирный; шкала D145 (решение владельца 04.10: при сверке главнее 16/13) — 16.
  title: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  topTag: { minHeight: 22, paddingHorizontal: 8, borderRadius: 7, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  topTagText: { fontSize: 13, lineHeight: 17, fontWeight: '700' }, // зачем: макет 12, D145 — 13
  author: { fontSize: 16, lineHeight: 21, marginTop: 1 }, // зачем: `.row .st` — строка 19 (сверка 04.10, карточка выше макета)
  pill: { minWidth: 33, minHeight: 24, paddingHorizontal: 9, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] }, // зачем: макет 14, D145 — 13
});

/**
 * Строка набора сообщества (packs-simple.html кадр 1): название и «Топ», автор, ♥ · 👥 · 💬,
 * плашка числа карточек и стрелка. Открывается и БЕЗ добавления — в режиме просмотра;
 * долгое нажатие на чужой набор — «Пожаловаться» / «Не показывать мне».
 */
function CommunityPackRowBase({
  pack, lang, t, g, width, owned, isTop, reduceMotion, showEdit, onOpen, onLongPress, onEdit, opening, disabled,
}: CommunityPackRowProps) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const rowStyles = useScaledTextStyles(baseRowStyles);
  const authorName = useCommunityAuthorName(pack, lang);
  // Единственный источник цены — тот же, из которого спишет шит покупки.
  const packPriceRunes = communityPackPriceRunes(pack);
  const title = packTitleForInterface(pack, lang) || packHubCodeName(pack);
  const topLabel = triLang(lang, { ru: 'Топ', uk: 'Топ', en: 'Top', es: 'Top', 'pt-BR': 'Top', vi: 'Top', id: 'Top', tr: 'Top', pl: 'Top' });

  return (
    <HubTileShell
      testID={`flashcards-pack-card-${pack.id}`}
      a11y={`${title}, ${authorName}, ${pack.cardCount} ${triLang(lang, { ru: 'карточек', uk: 'карток', en: 'cards', es: 'tarjetas' })}`}
      width={width}
      reduceMotion={reduceMotion}
      onPress={onOpen}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      <View style={[rowStyles.card, { width, borderColor: g.glassEdge, backgroundColor: g.card }]}>
        <CatalogTileGlass g={g} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={rowStyles.titleLine}>
            <FlowText testID={`flashcards-pack-title-${pack.id}`} provenance="user" style={[rowStyles.title, { color: g.text }]}>
              {title}
            </FlowText>
            {isTop ? (
              <View pointerEvents="none" style={[rowStyles.topTag, { backgroundColor: t.accent }]}>
                <Text style={[rowStyles.topTagText, { color: t.textOnGold }]}>{topLabel}</Text>
              </View>
            ) : null}
          </View>
          {/* зачем цена рядом с автором (владелец 2026-09-17): свойство набора, а не наклейка; «0» — шум. */}
          <FlowText testID={`flashcards-pack-author-${pack.id}`} provenance="user" style={[rowStyles.author, { color: g.secondary }]}>
            {packPriceRunes > 0 ? `${authorName} · ᚱ ${packPriceRunes.toLocaleString('ru-RU').replace(/ /g, ' ')}` : authorName}
          </FlowText>
          <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={owned} variant="list" />
        </View>
        {showEdit ? (
          <TouchableOpacity
            testID={`flashcards-pack-card-edit-${pack.id}`}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Редактировать набор', uk: 'Редагувати набір', en: 'Edit pack', es: 'Editar pack', 'pt-BR': 'Editar pacote', vi: 'Sửa bộ thẻ', id: 'Edit paket', tr: 'Paketi düzenle', pl: 'Edytuj zestaw' })}
            onPress={onEdit}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            style={[rowStyles.pill, { backgroundColor: g.opaqueControl }]}
          >
            <Ionicons name="create-outline" size={16} color={g.text} />
          </TouchableOpacity>
        ) : null}
        <View pointerEvents="none" style={[rowStyles.pill, { backgroundColor: g.opaqueControl }]}>
          <Text style={[rowStyles.pillText, { color: g.text }]}>{pack.cardCount}</Text>
        </View>
        {opening ? (
          <ActivityIndicator size="small" color={g.secondary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={g.secondary} accessibilityElementsHidden importantForAccessibility="no" />
        )}
      </View>
    </HubTileShell>
  );
}

/**
 * зачем (владелец, 2026-08-16, «прыжки страниц» / скорость): каталог рендерит до 50 строк
 * (серверный limit(50)). Без memo ЛЮБОЙ ре-рендер хаба — буква в поиске, смена сортировки,
 * долгое нажатие — перерисовывал все строки разом. Колбэки замкнуты на тот же pack,
 * поэтому сравнение по полям безопасно.
 */
const CommunityPackRow = React.memo(CommunityPackRowBase, (prev, next) => (
  prev.pack === next.pack
  && prev.lang === next.lang
  && prev.t === next.t
  && prev.g === next.g
  && prev.width === next.width
  && prev.owned === next.owned
  && prev.isTop === next.isTop
  && prev.reduceMotion === next.reduceMotion
  && prev.showEdit === next.showEdit
  && prev.opening === next.opening
  && prev.disabled === next.disabled
  // Наличие/отсутствие long-press меняет поведение, ссылка — нет.
  && (prev.onLongPress == null) === (next.onLongPress == null)
));

export default function FlashcardsCategoryHub({
  lang,
  t,
  marketPacks,
  ownedPackIds,
  onMarketRefresh,
  cloudCommunityEnabled = false,
  communityPacks = [],
  communityLoaded = true,
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  themeMode,
  studyTarget,
  communityQuery = '',
  onResetFilters,
  communitySort = 'popular',
  packLanguage = 'en',
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const sheetStyles = useScaledTextStyles(baseSheetStyles);
  const router = useRouter();
  const { liquidGlassThemeId } = useTheme();
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hasUnfinishedPackDraft, setHasUnfinishedPackDraft] = useState(false);
  const [hiddenCommunityPackIds, setHiddenCommunityPackIds] = useState<Set<string>>(() => new Set());
  const [ugcReportHintPackId, setUgcReportHintPackId] = useState<string | null>(null);
  const [reportModalPack, setReportModalPack] = useState<FlashcardMarketPack | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingPackRef = useRef<string | null>(null);
  const openingRequestGenerationRef = useRef(0);
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
      openingRequestGenerationRef.current += 1;
      openingPackRef.current = null;
      setOpeningPackId(null);
      void (async () => {
        const ok = await hasMeaningfulCommunityPackCreateDraft(studyTarget, lang);
        if (!cancelled) setHasUnfinishedPackDraft(ok);
      })();
      void refreshHiddenCommunityPacks();
      return () => {
        cancelled = true;
        openingRequestGenerationRef.current += 1;
        openingPackRef.current = null;
      };
    }, [refreshHiddenCommunityPacks, studyTarget, lang]),
  );

  const { width: winW } = useWindowDimensions();
  const tileW = useMemo(() => {
    const inner = winW - H_PAD * 2 - GAP * (COLS - 1);
    return Math.max(96, Math.floor(inner / COLS));
  }, [winW]);

  /**
   * Плитки наборов: PNG-«веер» — крупный центр.
   *
   * зачем: владелец жаловался, что иконки наборов выглядят крошечными. Теряли
   * размер дважды: (1) веер имеет пропорцию 329x268, а `contain` в квадрате
   * вписывал его по ШИРИНЕ — по высоте оставалось лишь ~0.81 от бокса;
   * (2) внутри самого webp прозрачные поля — графика занимает ~0.83 ширины.
   * Поэтому берём почти всю плитку и растим бокс по пропорции веера, компенсируя
   * внутренние поля. Контейнер плитки с `overflow:'hidden'`, за края не вылезет.
   */
  const packTileIconSize = Math.max(84, Math.floor(tileW * 0.98));
  const labelSize = Math.max(9, Math.min(11, Math.floor(tileW * 0.11)));

  /**
   * В этом проекте градиентных тем (`ocean` / `sakura`) нет — подписи всегда
   * рендерятся на обычной поверхности, поэтому берём цвета прямо из темы.
   */
  const isGradientSurface = false;
  const hubLabelAccent = t.accentText; // зачем (Сверка, светлая Максимум): подпись плитки — акцент как ТЕКСТ, а не бледная заливка

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- секция убрана намеренно
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
   * Свои наборы с `local_pack_*` в общий каталог не попадают даже во время модерации —
   * они живут в «Мои наборы» до публикации.
   */
  const catalogCommunityPacks = useMemo(
    () => communityPacks.filter((p) => !hiddenCommunityPackIds.has(p.id) && !isLocalAuthorPackId(p.id)),
    [communityPacks, hiddenCommunityPackIds],
  );

  const visibleCommunityPacks = useMemo(
    () => applyCommunityPacksFilter(catalogCommunityPacks, communityQuery, communitySort, packLanguage),
    [catalogCommunityPacks, communityQuery, communitySort, packLanguage],
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
    if (openingPackRef.current) return;
    const requestToken = ++openingRequestGenerationRef.current;
    openingPackRef.current = pack.id;
    setUgcReportHintPackId(null);
    setOpeningPackId(pack.id);
    if (pack.isCommunityUgc) {
      const cards = await stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack, { isStillWanted: () => openingPackRef.current === pack.id, tag: 'category-hub' });
      if (
        openingRequestGenerationRef.current !== requestToken
        || openingPackRef.current !== pack.id
      ) return;
      if (cards.length === 0) {
        openingPackRef.current = null;
        setOpeningPackId(null);
        emitPackNotDownloadedToast();
        return;
      }
    } else {
      /** КРИТИЧНО: staging СИНХРОННО перед router.push — первый кадр коллекции уже с карточками. */
      stageOwnedPackCardsForNavigation(pack.id, studyTarget);
    }
    // `from` нужен, чтобы «назад» из набора вернул РОВНО в каталог сообщества
    // одним POP_TO, без остановки на промежуточных экранах (см. fc_pack_open_back_contract).
    router.push({ pathname: '/flashcards_collection', params: { pack: pack.id, from: 'community' } } as never);
  };

  /**
   * Просмотр набора ДО добавления себе: карточки видно, тренировать/редактировать
   * нельзя (`preview=1`). Карточки подгружаются тем же staging-путём, что и у своих.
   */
  const openPackPreview = useCallback(
    (pack: FlashcardMarketPack) => {
      // зачем (packs-simple-004, решено по рекомендации): переход сразу по тапу, карточки догружаются на экране набора
      // (скелет). Повторный тап по строке не запускает вторую загрузку (реестр открытий) и не толкает второй экран.
      if (openingPackRef.current) return;
      openingPackRef.current = pack.id;
      setTimeout(() => { if (openingPackRef.current === pack.id) openingPackRef.current = null; }, 800);
      setUgcReportHintPackId(null);
      void startCommunityPackOpen(pack.id, studyTarget, pack, 'category-hub');
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, preview: '1' },
      } as never);
    },
    [router, studyTarget],
  );

  /**
   * §2.1: набор добавлен — сразу помечаем локально, каталог перечитываем в фоне.
   *
   * Кнопка «Добавить себе» теперь живёт на самом экране набора (его открывают
   * ДО добавления), поэтому хаб узнаёт о добавлении по событию приложения.
   */
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

  useEffect(() => {
    const sub = onAppEvent('community_pack_added', ({ packId }) => {
      if (packId) onPackAdded(packId);
    });
    return () => sub.remove();
  }, [onPackAdded]);

  // ── Общие стили секций ─────────────────────────────────────────────────────
  const hubBarW = winW - H_PAD * 2;
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
      <Text style={{ fontSize: 13, fontWeight: '700', color: t.accentText }}>{label}</Text>
    </View>
  );

  /**
   * Единый значок набора без старых изображений рубашек.
   */
  const packIcon = (pack: FlashcardMarketPack, size: number) => {
    const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
    if (png) {
      return (
        <Image
          source={png}
          style={{ width: size * PACK_FAN_ASPECT, height: size }}
          contentFit="contain"
        />
      );
    }
    return (
      <Ionicons
        name={(packCategoryIonIcon(pack.category) || 'albums-outline') as keyof typeof Ionicons.glyphMap}
        size={Math.round(size * 0.62)}
        color={pack.isCommunityUgc ? t.accentText : t.textPrimary}
      />
    );
  };

  /** Плитка «Мои наборы» — открывает набор карточек. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          disabled={openingPackId !== null}
          onPress={() => void openOwnedPack(pack)}
        >
          <View
            style={[
              {
                width: tileW,
                height: tileW,
                borderRadius: TILE_RADIUS,
                borderWidth: 1, // зачем (координатор 11.10): обводка плитки — hairline
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
            {openingPackId === pack.id ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.bgSurface}D9` }]}>
                <ActivityIndicator color={t.accentText} />
              </View>
            ) : null}
            {pack.cardCount > 0 ? countPill(String(pack.cardCount)) : null}
          </View>
        </HubTileShell>
        {showAuthorEdit ? (
          <TouchableOpacity
            testID={`flashcards-hub-pack-edit-${pack.id}`}
            onPress={() =>
              router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as never)
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
        <FlowText testID={`flashcards-owned-pack-title-${pack.id}`} provenance="user" style={packCodeLabelStyle}>
          {packTileLabel}
        </FlowText>
        {pack.isPendingUpdateReview ? (
          <Text style={{ fontSize: 13, color: hubLabelAccent, fontWeight: '700', marginTop: 3, textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'На проверке', uk: 'На перевірці', en: 'In review', es: 'En revisión',
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
  const renderCommunityPackRow = (pack: FlashcardMarketPack) => {
    const owned = isCommunityPackMine(pack);
    const showReportShortcut = !!pack.isCommunityUgc && !owned;
    const showAuthorEdit =
      !!hubAuthorStableId &&
      !!pack.isCommunityUgc &&
      !!pack.authorStableId &&
      pack.authorStableId === hubAuthorStableId;

    return (
      <CommunityPackRow
        key={`ugc_${pack.id}`}
        pack={pack}
        lang={lang}
        t={t}
        g={g}
        width={hubBarW}
        owned={owned}
        isTop={topPackIds.has(pack.id)}
        reduceMotion={reduceMotion}
        showEdit={showAuthorEdit}
        opening={openingPackId === pack.id}
        disabled={openingPackId !== null}
        onOpen={() => {
          // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
          if (owned) {
            void openOwnedPack(pack);
          } else {
            void openPackPreview(pack);
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
          router.push({ pathname: '/community_pack_create', params: { packId: pack.id } } as never)
        }
      />
    );
  };

  /**
   * зачем (packs-simple.html кадр 2): долгое нажатие на чужой набор — шторка снизу с названием набора и двумя
   * строками-карточками «Пожаловаться на набор» / «Не показывать мне» (раньше — строка ссылок под сеткой).
   * Жалоба открывается ПОСЛЕ ухода шторки (onDismissed): два нативных Modal подряд на iOS теряют второй.
   */
  const lastSheetPackRef = useRef<FlashcardMarketPack | null>(null);
  const pendingReportPackRef = useRef<FlashcardMarketPack | null>(null);
  const renderPackActionsSheet = () => {
    const livePack = visibleCommunityPacks.find((p) => p.id === ugcReportHintPackId) ?? null;
    if (livePack) lastSheetPackRef.current = livePack;
    const pack = livePack ?? lastSheetPackRef.current;
    if (!pack) return null;
    const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
    const actionRow = (testID: string, icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.8}
        onPress={onPress}
        style={[sheetStyles.row, { borderColor: g.glassEdge, backgroundColor: g.card }]}
      >
        <View style={[sheetStyles.tile, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name={icon} size={20} color={g.text} />
        </View>
        <Text style={[sheetStyles.rowText, { color: g.text }]}>{label}</Text>
      </TouchableOpacity>
    );
    return (
      <HybridSheetShell
        visible={livePack !== null}
        onClose={() => setUgcReportHintPackId(null)}
        onDismissed={() => {
          const report = pendingReportPackRef.current;
          pendingReportPackRef.current = null;
          lastSheetPackRef.current = null;
          if (report) setReportModalPack(report);
        }}
        closeLabel={closeLabel}
        testID="flashcards-pack-actions-sheet"
        material="liquid-glass"
      >
        {({ requestDismiss }) => (
          <View style={{ width: '100%' }}>
            <FlowText testID="flashcards-pack-actions-title" provenance="user" style={[sheetStyles.title, { color: g.text }]}>
              {packTitleForInterface(pack, lang) || packHubCodeName(pack)}
            </FlowText>
            {actionRow('flashcards-pack-report', 'flag-outline', triLang(lang, {
              ru: 'Пожаловаться на набор', uk: 'Поскаржитися на набір', en: 'Report the pack', es: 'Reportar el pack',
              'pt-BR': 'Denunciar o pacote', vi: 'Báo cáo bộ thẻ', id: 'Laporkan paket', tr: 'Paketi bildir', pl: 'Zgłoś zestaw',
            }), () => {
              void hapticTap();
              pendingReportPackRef.current = pack;
              requestDismiss();
            })}
            <View style={{ height: 9 }} />
            {actionRow('flashcards-pack-hide', 'close', triLang(lang, {
              ru: 'Не показывать мне', uk: 'Не показувати мені', en: "Don't show me", es: 'No mostrarme',
              'pt-BR': 'Não mostrar para mim', vi: 'Không hiển thị nữa', id: 'Jangan tampilkan lagi', tr: 'Bana gösterme', pl: 'Nie pokazuj mi',
            }), () => {
              void hapticTap();
              requestDismiss();
              void (async () => {
                try {
                  await hideCommunityPackOnDevice(pack.id, studyTarget);
                  await refreshHiddenCommunityPacks();
                } catch (e) {
                  // no-op: AsyncStorage unavailable
                  DebugLogger.error('FlashcardsCategoryHub:pack', e instanceof Error ? e : new Error(String(e)), 'warning');
                }
              })();
            })}
          </View>
        )}
      </HybridSheetShell>
    );
  };

  return (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* ── 1. Заголовок экрана переехал в ШАПКУ (`flashcards_packs.tsx`):
           раньше здесь был крупный «Наборы», а ниже — секция «Наборы сообщества»,
           то есть два заголовка об одном и том же (замечание владельца). ── */}

      {/* ── 2. «Мои наборы» живут на отдельном экране `/flashcards_my_packs`
           (таббар → «Наборы» → «Мои наборы»). Здесь только каталог сообщества —
           это два разных раздела, а не один смешанный список. ── */}

      {/* ── 3. Каталог сообщества ── */}
      {cloudCommunityEnabled ? (
        <Reanimated.View {...enterProps(2)} style={sectionGapStyle}>
          {/* Подзаголовок «Наборы сообщества» убран: он дублировал заголовок экрана
              и теперь стоит в шапке, справа от стрелки «назад». */}
          {/* зачем (packs-simple.html, замок 04.10): строки-описания под заголовком в утверждённом макете нет —
              макет новее PM-093/094; сразу «Продолжить создание набора» и строки наборов. */}
          {hasUnfinishedPackDraft ? (
            <TouchableOpacity
              testID="flashcards-packs-continue-draft"
              onPress={() => router.push({
                pathname: '/community_pack_create',
                params: { origin: 'community' },
              } as never)}
              style={{
                width: hubBarW,
                marginTop: 2,
                marginBottom: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                // зачем (PM-092, cards.html «Продолжить создание набора»): строка-карточка как в
                // макете — значок в плитке слева, текст 16/600 слева, стрелка справа; 1px обводка.
                borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — тонкая полупрозрачная обводка
                borderColor: g.glassEdge, // guard-ok: исключение 2.0
                backgroundColor: g.card,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                overflow: 'hidden',
              }}
            >
              <CatalogTileGlass g={g} />
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: g.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="create-outline" size={20} color={g.text} />
              </View>
              <Text style={{ flex: 1, color: g.text, fontWeight: '600', fontSize: 16, lineHeight: 21 }}>
                {triLang(lang, {
                  ru: 'Продолжить создание набора',
                  uk: 'Продовжити створення набору',
                  en: 'Continue creating the pack',
                  es: 'Seguir creando el pack',
                  'pt-BR': 'Continuar criando o pacote',
                  vi: 'Tiếp tục tạo bộ thẻ',
                  id: 'Lanjutkan membuat paket',
                  tr: 'Paketi oluşturmaya devam et',
                  pl: 'Kontynuuj tworzenie zestawu',
                })}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={g.secondary} accessibilityElementsHidden importantForAccessibility="no" />
            </TouchableOpacity>
          ) : null}
          {visibleCommunityPacks.length === 0 && catalogCommunityPacks.length === 0 && !communityLoaded ? (
            <View testID="flashcards-community-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: hubBarW, gap: 12, paddingTop: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={`pk-sk-${i}`} /* guard-ok: четыре статичные заглушки строк каталога */ style={{ height: 74, borderRadius: 22, backgroundColor: g.hairlineSoft }} />
              ))}
            </View>
          ) : visibleCommunityPacks.length === 0 ? (
            // зачем (packs-simple.html кадр 3): пустой каталог — плитка 61 со значком и фраза 20/700 по центру, без карточки.
            <View testID="flashcards-community-empty" style={{ width: hubBarW, alignItems: 'center', paddingTop: 96, paddingHorizontal: 24 }}>
              <View style={{ width: 61, height: 61, borderRadius: 16, backgroundColor: g.opaqueControl, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <CatalogTileGlass g={g} />
                <Ionicons name={catalogCommunityPacks.length === 0 ? 'people-outline' : 'search-outline'} size={26} color={g.text} />
              </View>
              <FlowText testID="flashcards-community-empty-label" provenance="authored" style={{ color: g.text, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: 20 }}>
                {catalogCommunityPacks.length === 0
                  ? triLang(lang, {
                      ru: 'Здесь появятся наборы после публикации.',
                      uk: 'Тут з\'являться набори після публікації.',
                      en: 'Packs will appear here once published.',
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
                      en: 'Nothing found.',
                      es: 'No se encontró nada.',
                      'pt-BR': 'Nada encontrado.',
                      vi: 'Không tìm thấy gì.',
                      id: 'Tidak ada yang ditemukan.',
                      tr: 'Bir şey bulunamadı.',
                      pl: 'Nic nie znaleziono.',
                    })}
              </FlowText>
              {/* зачем (Сверка cards-section-023 catalogNone, координатор 05.10): на пустой результат ПОИСКА — подсказка и
                  «Сбросить фильтры» (`.empty .l` 16/22 через 8, `.cta` 0/28 через 26). Сброс только строки поиска: язык набора —
                  сохранённый выбор человека, его кнопка не трогает. Без запросов в сеть — фильтр клиентский. */}
              {catalogCommunityPacks.length > 0 && communityQuery.trim().length > 0 ? (
                <>
                  <Text style={{ color: g.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 }}>
                    {triLang(lang, { ru: 'Попробуй другое слово', uk: 'Спробуй інше слово', en: 'Try another word', es: 'Prueba otra palabra', 'pt-BR': 'Tente outra palavra', vi: 'Thử từ khác', id: 'Coba kata lain', tr: 'Başka bir kelime dene', pl: 'Spróbuj innego słowa' })}
                  </Text>
                  {onResetFilters ? (
                    <TouchableOpacity
                      testID="flashcards-community-reset-filters"
                      accessibilityRole="button"
                      activeOpacity={0.86}
                      onPress={onResetFilters}
                      style={{ marginTop: 26, minHeight: 48, borderRadius: 24, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: g.accent }}
                    >
                      <Text style={{ color: g.accentInk, fontSize: 16, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Сбросить фильтры', uk: 'Скинути фільтри', en: 'Reset filters', es: 'Quitar filtros', 'pt-BR': 'Limpar filtros', vi: 'Xóa bộ lọc', id: 'Atur ulang filter', tr: 'Filtreleri sıfırla', pl: 'Wyczyść filtry' })}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
          {/* зачем (packs-simple.html `.stack`): строки столбиком через 9. */}
          <View style={{ width: hubBarW, gap: 9 }}>
            {visibleCommunityPacks.map(renderCommunityPackRow)}
          </View>
          {renderPackActionsSheet()}
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
            en: 'Cards: pack catalog',
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

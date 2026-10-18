/**
 * Cards 2.1 §1–§3 — КАТАЛОГ НАБОРОВ раздела «Карточки» (экран `/flashcards_packs`,
 * правая позиция таббара «Наборы»).
 *
 * Что здесь есть:
 *   • «Мои наборы» — уже добавленные наборы (открываются как набор карточек);
 *   • «Наборы сообщества» — список плашек «Плитка-счётчик» (решение владельца 11.10,
 *     community-redesign.html #c1; общий компонент components/packs/PackRow): слева плитка с числом
 *     карточек, название (до двух строк) и «Топ», автор с монетой и ♥ · 👥 · 💬, справа «+» —
 *     добавить себе. Тап открывает набор ДО добавления — в режиме просмотра (`preview=1`).
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
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logCardsOptimisticFrame, logCardsOptimisticStep, markCardsOptimisticTap } from './cards_optimistic_trace';
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
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { useTheme } from '../../components/ThemeContext';
import { FlowText } from '../../components/text-integrity/FlowText';
import type { Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import { FC_SPRING, FC_TIMING, fcStaggerDelay } from '../../constants/flashcards_motion';
import { packHubCodeName, packTitleForInterface, packCategoryIonIcon, communityPackPriceRunes, type FlashcardMarketPack } from './marketplace';
import { isLowPowerEffective } from './low_power';

import { stageOwnedPackCardsForNavigation } from './useCollectionData';
import { hasMeaningfulCommunityPackCreateDraft } from '../community_packs/communityPackDraftStorage';
import { emitAppEvent, onAppEvent } from '../events';
import { animateNextLayoutTransition } from '../smooth_layout';
import {
  bumpPackCounts,
  EMPTY_PACK_COUNTS_OVERLAY,
  livePackCounts,
  packBaseCounts,
  type PackCounts,
  type PackCountsOverlay,
} from '../community_packs/packLiveCounts';
import { packAddFailureToast, packHideFailureToast } from '../community_packs/packQuickAdd';
import { isDevCardsHeld } from '../dev_cards_state';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry, startCommunityPackOpen } from '../community_packs/stage_with_retry';
import { addCommunityPackToLibrary } from '../community_packs/communityPackActions';
import {
  applyCommunityPacksFilter,
  type CommunityPacksSort,
} from '../community_packs/communityCatalogFilter';
import { bundledPackTilePng, packTileImageForPack } from './packMarketplaceIcons';
import { useCommunityAuthor } from '../community_packs/packAuthorNames';
import ReportErrorButton from '../../components/ReportErrorButton';
import ReportPackModal from '../../components/ReportPackModal';
import { PackDeck, PackDeckLikes, packCardsWord, type PackRowEmphasis } from '../../components/packs/PackRow';
import { packDeckLevel, packDeckWords } from '../../components/packs/packDeckModel';
import { useLang } from '../../components/LangContext';
import { KitTouchable } from '../../components/KitTouchable';
import { hideCommunityPackOnDevice, loadHiddenCommunityPackIds } from '../community_packs/communityPackHiddenStorage';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { hapticTap } from '../../hooks/use-haptics';
import { DebugLogger } from '../debug-logger';
import { cardsPerfCount, cardsPerfFlush } from '../../components/cards-grid/cardsPerfLog';
import { isLocalAuthorPackId } from '../community_packs/localAuthorPacks';
import { NO_PACK_LANGUAGE, noPackLanguageLabel, PACK_LANGUAGE_META, normalizePackLanguage, type PackLanguage } from './pack_languages';
import { formatPackLangTrace } from './pack_lang_trace';

const ReanimatedPressable = Reanimated.createAnimatedComponent(Pressable);

// зачем (Тень 12.10): CatalogTileGlass (блюр + блик 150° + кромка-линия) удалён — плашки каталога заливает PlateFill

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
  /**
   * зачем (сверка Макетов e4e4149d0): каталог пуст ИЗ-ЗА ОТСУТСТВИЯ СЕТИ — отдельное состояние «Нет сети» + «Повторить»,
   * а не «Здесь появятся наборы после публикации». Решает экран-владелец (useCatalogOffline), здесь только показ.
   */
  communityOffline?: boolean;
  /** «Повторить» в состоянии «Нет сети»: перечитать каталог (один осознанный запрос по тапу). */
  onRetryCatalog?: () => void;
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
  /** Фильтр по уровню A1–C2 (чип каталога); null — все уровни. Работает, когда у наборов появится поле `level`. */
  communityLevel?: string | null;
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
  /** Язык подписей интерфейса (полный, 9 языков) — «карточек», «Добавить себе», «Топ». */
  uiLang: Lang;
  /** Язык названия набора (как раньше у каталога). */
  titleLang: Lang;
  g: ReturnType<typeof liquidGlassTokens>;
  owned: boolean;
  emphasis: PackRowEmphasis;
  highlight: string;
  /** Живые счётчики: значение каталога + сдвиг от лайков/откликов/добавлений этой сессии (packLiveCounts). */
  likes: number;
  onOpen: () => void;
  onLongPress?: () => void;
  onAdd: () => void;
  opening?: boolean;
  disabled?: boolean;
};

/** Зазор между плашками (`.pl { margin-top: 10px }`) и от плашки до меню (`.menu { margin-top: 8px }`). */
// зачем (cards-v2 `.stack.g14`): стопки столбиком через 14, тень «дышит»; меню долгого нажатия — через 8 от стопки.
const STACK_GAP = 14;
const MENU_GAP = 8;

/** community-redesign.html #c1, экран 3: меню долгого нажатия под плашкой (`.menu`): строки 52, значок 20, текст 16/600 (макет 17, D145). */
const baseMenuStyles = StyleSheet.create({
  // зачем (ревью 11.10, п.3): в макете #c1 экран 3 меню на 8 ниже плашки; стопка уже даёт зазор 10 — компенсируем −2.
  menu: { marginTop: MENU_GAP - STACK_GAP, padding: 6, borderRadius: 20, zIndex: 4 },
  row: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14 },
  rowText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  // зачем (экран «Поиск» #c1, `.lab`): «Найдено 3» 15/600 макета → 16 (D145); 18 сверху = 8 отступа списка + 10, снизу 10 — отступ стека.
  found: { fontSize: 16, lineHeight: 21, fontWeight: '600', marginTop: 10 },
});

const packDeckRowLogged = new Set<string>();
const PACK_DECK_ROW_LOG_CAP = 60;
/** [PACK-DECK] row: что пришло в строку набора (поле previewWords, его длина и слова) и сколько чипов будет нарисовано; один раз на набор и длину, потолок строк за запуск. */
function logPackDeckRowOnce(pack: FlashcardMarketPack, drawn: readonly string[]): void {
  const raw = (pack as { previewWords?: unknown }).previewWords;
  const rawLen = Array.isArray(raw) ? raw.length : -1;
  const key = `${pack.id}:${rawLen}:${drawn.length}`;
  if (packDeckRowLogged.has(key) || packDeckRowLogged.size >= PACK_DECK_ROW_LOG_CAP) return;
  packDeckRowLogged.add(key);
  console.log('[PACK-DECK] row', JSON.stringify({ id: pack.id, cardCount: pack.cardCount, hasPreviewField: Array.isArray(raw), previewLen: rawLen, drawn: drawn.length, words: drawn })); // guard-ok: диагностика cards-v2-025, один раз на набор и длину
}

/**
 * Плашка набора сообщества (community-redesign.html #c1, общий PackRow): плитка-счётчик, название и «Топ»,
 * автор и ♥ · 👥 · 💬, справа «+». Открывается и БЕЗ добавления — в режиме просмотра;
 * долгое нажатие на чужой набор — «Пожаловаться» / «Не показывать мне».
 */
function CommunityPackRowBase({
  pack, uiLang, titleLang, g, owned, emphasis, highlight, likes, onOpen, onLongPress, onAdd, opening, disabled,
}: CommunityPackRowProps) {
  cardsPerfCount('catalog-row-render'); // зачем: [CARDS-PERF] сколько строк каталога перерисовано (memo держит строки при наборе в поиске / долгом нажатии)
  // зачем (журнал 4–5): официальный набор ролика → «Professor Lingman» без чтения public_profiles; иначе ник и монета ранга.
  const author = useCommunityAuthor(pack, uiLang);
  const title = packTitleForInterface(pack, titleLang) || packHubCodeName(pack);
  // зачем (cards-v2-025, координатор 13.10: «в строке 1 слово, у демо-наборов по 3» — сначала лог, что приходит в строку): сколько слов превью пришло в строку и сколько чипов будет нарисовано. Один раз на набор и длину.
  const deckWords = packDeckWords(pack);
  logPackDeckRowOnce(pack, deckWords);
  const addLabel = triLang(uiLang, {
    ru: 'Добавить себе', uk: 'Додати собі', en: 'Add to mine', es: 'Añadir',
    'pt-BR': 'Adicionar', vi: 'Thêm vào của tôi', id: 'Tambahkan', tr: 'Bana ekle', pl: 'Dodaj do siebie',
  });

  // зачем (владелец 12.10, cards-v2 catalog()): набор сообщества — «стопка» (общий PackDeck): аватар автора, «Автор · 49 · B2», три чипа слов,
  // справа ♥. Быстрое «+ добавить себе» с плашки убрано (в макете его нет) — оно живёт в меню долгого нажатия и в действиях доступности,
  // а экран набора по тапу даёт «Добавить себе +». Уровень и первые слова читаются из полей набора, пока их нет — скрыты (ждём от Ядра).
  return (
    <PackDeck
      g={g}
      lang={uiLang}
      title={title}
      testID={`flashcards-pack-card-${pack.id}`}
      titleTestID={`flashcards-pack-title-${pack.id}`}
      authorTestID={`flashcards-pack-author-${pack.id}`}
      accessibilityLabel={`${title}, ${author.name}, ${pack.cardCount} ${packCardsWord(uiLang, pack.cardCount)}`}
      count={pack.cardCount}
      level={packDeckLevel(pack)}
      words={deckWords}
      author={{ name: author.name, coinRank: author.coinRank }}
      highlight={highlight}
      emphasis={emphasis}
      onPress={onOpen}
      onLongPress={onLongPress}
      disabled={disabled}
      a11yActions={owned || opening ? undefined : [{ name: 'add-pack', label: addLabel, run: onAdd }]}
      trailing={opening ? (
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={g.secondary} />
        </View>
      ) : <PackDeckLikes g={g} value={likes} />}
    />
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
  && prev.uiLang === next.uiLang
  && prev.titleLang === next.titleLang
  && prev.g === next.g
  && prev.owned === next.owned
  && prev.emphasis === next.emphasis
  && prev.highlight === next.highlight
  && prev.likes === next.likes
  && prev.opening === next.opening
  && prev.disabled === next.disabled
  // Наличие/отсутствие long-press меняет поведение, ссылка — нет. onOpen/onAdd/onLongPress зовут свежие обработчики
  // хаба через ref (openRowRef/addRowRef — ревью 11.10, п.10): устаревшее замыкание не унесёт старый studyTarget.
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
  communityOffline = false,
  onRetryCatalog,
  ownedCommunityPackIds = [],
  hubAuthorStableId = null,
  themeMode,
  studyTarget,
  communityQuery = '',
  onResetFilters,
  communitySort = 'popular',
  communityLevel = null,
  packLanguage = 'en',
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const menuStyles = useScaledTextStyles(baseMenuStyles);
  // зачем: подписи строки («карточек», «Добавить себе») — на языке интерфейса (9 языков), а не на суженном языке каталога.
  const { lang: uiLang } = useLang();
  // зачем: заглушка той же высоты, что стопка без чипов слов (12 стопка + 16 + название 26 + подпись 21 + 16) — без прыжка
  const skeletonRowH = 91;
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

  // зачем (решение владельца 13.10, «Скрыть набор» с «Отменить» на экране набора): скрытие/возврат из другого экрана доходит до плиток сразу, без нового чтения хранилища.
  useEffect(() => {
    const sub = onAppEvent('community_pack_hidden_changed', ({ packId, hidden }) => {
      setHiddenCommunityPackIds((prev) => {
        if (prev.has(packId) === hidden) return prev;
        const next = new Set(prev);
        if (hidden) next.add(packId); else next.delete(packId);
        return next;
      });
    });
    return () => sub.remove();
  }, []);

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

  const visibleCommunityPacks = useMemo(() => {
    const found = applyCommunityPacksFilter(catalogCommunityPacks, communityQuery, communitySort, packLanguage);
    // зачем (cards-v2 чипы A1…B2): фильтр по уровню — клиентский, поверх уже загруженного списка, без запросов.
    return communityLevel ? found.filter((pack) => packDeckLevel(pack) === communityLevel) : found;
  }, [catalogCommunityPacks, communityQuery, communitySort, communityLevel, packLanguage]);

  // зачем (владелец/координатор 15.10, «сперва логи»; [PACK-LANG]): при выбранном FR в списке был итальянский набор — журнал показывает выбранный язык, язык КАЖДОГО набора (поле и откуда), что оставлено и что убрано, плюс официальные наборы ленты.
  useEffect(() => {
    for (const line of formatPackLangTrace('catalog', packLanguage, catalogCommunityPacks)) console.log(line); // guard-ok: журнал [PACK-LANG] (расследование языка наборов)
    for (const line of formatPackLangTrace('official', packLanguage, marketPacks, 20)) console.log(line); // guard-ok: журнал [PACK-LANG]
    console.log(`[PACK-LANG] shown=${visibleCommunityPacks.length} query="${communityQuery}" sort=${communitySort} level=${communityLevel ?? 'none'}`); // guard-ok: итог списка, который увидел человек
  }, [catalogCommunityPacks, marketPacks, packLanguage, visibleCommunityPacks.length, communityQuery, communitySort, communityLevel]);

  // зачем (координатор 12.10, [CARDS-PERF]): строки каталога за первый кадр, за ввод в поиск и за подъём плашки (меню) — сколько реально перерисовалось
  const perfMountedAtRef = useRef(Date.now());
  useEffect(() => {
    const raf = requestAnimationFrame(() => cardsPerfFlush('catalog', 'first-frame', { rows: visibleCommunityPacks.length, sinceMountMs: Date.now() - perfMountedAtRef.current }));
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    cardsPerfFlush('catalog', 'rows-changed', { rows: visibleCommunityPacks.length, query: communityQuery, menuPackId: ugcReportHintPackId ?? null });
  }, [visibleCommunityPacks.length, communityQuery, ugcReportHintPackId]);

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
  // Наборы, которые прямо сейчас добавляются «+» на плашке (защита от двойного тапа и признак «добавлено из каталога»).
  const addingPackIdsRef = useRef<Set<string>>(new Set());
  const onPackAdded = useCallback(
    (packId: string) => {
      setLocallyAddedPackIds((prev) => {
        if (prev.has(packId)) return prev;
        const next = new Set(prev);
        next.add(packId);
        return next;
      });
      /**
       * зачем (ревью 11.10, 💸 Firebase): «+» в каталоге уже поставил всё локально (✓, +1 «добавили»), а событие
       * `community_pack_added` приходит ДО окончания его записи — перечитывать каталог незачем (раньше 5 «+» ≈ 250 чтений).
       * Добавление с экрана набора — обычное обновление (Firestore-часть под 30-секундным троттлом экрана).
       */
      if (addingPackIdsRef.current.has(packId)) {
        console.log(`[PACK-ROW] refresh skipped reason=quick_add pack=${packId}`); // guard-ok: ранний выход называет причину
        return;
      }
      void onMarketRefresh();
    },
    [onMarketRefresh],
  );

  /**
   * Живые счётчики плашек (ревью 11.10, п.2; жалоба владельца «плитка отстаёт до перезахода»): сдвиг от лайков,
   * откликов и добавлений этой сессии поверх значения каталога (app/community_packs/packLiveCounts.ts).
   * `addBumpedIdsRef` — наборы, которым «добавили» уже прибавлено (оптимистично «+»), чтобы событие
   * `community_pack_added` от той же записи не прибавило второй раз.
   */
  const [countsOverlay, setCountsOverlay] = useState<PackCountsOverlay>(EMPTY_PACK_COUNTS_OVERLAY);
  const packsByIdRef = useRef<Map<string, FlashcardMarketPack>>(new Map());
  packsByIdRef.current = useMemo(() => new Map(communityPacks.map((p) => [p.id, p] as const)), [communityPacks]);
  const addBumpedIdsRef = useRef<Set<string>>(new Set());
  const bumpCounts = useCallback((packId: string, delta: Partial<PackCounts>, reason: string) => {
    const pack = packsByIdRef.current.get(packId);
    if (!pack) {
      console.log(`[PACK-ROW] counts:skip not-in-catalog pack=${packId} reason=${reason}`); // guard-ok: ранний выход
      return;
    }
    console.log(`[PACK-ROW] counts:bump pack=${packId} reason=${reason} delta=${JSON.stringify(delta)}`); // guard-ok
    setCountsOverlay((prev) => bumpPackCounts(prev, packId, packBaseCounts(pack), delta));
  }, []);

  useEffect(() => {
    const added = onAppEvent('community_pack_added', ({ packId }) => {
      if (!packId) return;
      onPackAdded(packId);
      if (addBumpedIdsRef.current.has(packId)) return;
      addBumpedIdsRef.current.add(packId);
      bumpCounts(packId, { added: 1 }, 'added-event');
    });
    const liked = onAppEvent('community_pack_like_changed', ({ packId, liked: on }) => {
      bumpCounts(packId, { likes: on ? 1 : -1 }, on ? 'like' : 'unlike');
    });
    const commented = onAppEvent('community_pack_comments_changed', ({ packId, delta }) => {
      bumpCounts(packId, { comments: delta }, 'comments');
    });
    return () => {
      added.remove();
      liked.remove();
      commented.remove();
    };
  }, [onPackAdded, bumpCounts]);

  /**
   * «+» на плашке — добавить набор себе прямо из каталога (макет #c1: «+ справа добавляет набор себе»).
   * зачем (Optimistic UI, правило владельца): «+» сразу становится «✓» (локальная отметка), запись идёт фоном;
   * отказ — откат отметки и понятный тост. Двойной тап гасит `addingPackIdsRef`. Платный набор НЕ добавляем
   * бесплатно: открываем его экран, где живёт покупка (шит покупки — решение экрана набора).
   */
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;
  const quickAddPack = useCallback((pack: FlashcardMarketPack) => {
    const price = communityPackPriceRunes(pack);
    if (price > 0) {
      console.log(`[PACK-ROW] add:paid pack=${pack.id} price=${price} -> preview`); // guard-ok: ветка решения логируется и в релизе
      openPackPreview(pack);
      return;
    }
    if (isCommunityPackMine(pack)) {
      console.log(`[PACK-ROW] add:skip already-mine pack=${pack.id}`); // guard-ok: ранний выход
      return;
    }
    if (addingPackIdsRef.current.has(pack.id)) {
      console.log(`[PACK-ROW] add:skip in-flight pack=${pack.id}`); // guard-ok: защита от двойного тапа
      return;
    }
    addingPackIdsRef.current.add(pack.id);
    // зачем (координатор 18.10, Optimistic UI): замер «быстрое добавление из каталога → кадр “✓” → запись → откат».
    markCardsOptimisticTap('pack_add', pack.id, { source: 'catalog_quick_add' });
    void hapticTap();
    setLocallyAddedPackIds((prev) => {
      if (prev.has(pack.id)) return prev;
      const next = new Set(prev);
      next.add(pack.id);
      return next;
    });
    // Optimistic UI: «добавили» +1 сразу, событие той же записи второй раз не прибавит (addBumpedIdsRef).
    const bumpedNow = !addBumpedIdsRef.current.has(pack.id);
    if (bumpedNow) {
      addBumpedIdsRef.current.add(pack.id);
      bumpCounts(pack.id, { added: 1 }, 'quick-add');
    }
    logCardsOptimisticFrame('pack_add', 'ui_frame');
    // зачем (ревью 11.10, п.10): цель обучения читаем из ref в момент нажатия — строка мемоизирована, замыкание могло устареть.
    const target = studyTargetRef.current;
    const startedAt = Date.now();
    void (async () => {
      let result: string;
      try {
        result = await addCommunityPackToLibrary(pack, target);
      } catch (error: unknown) {
        result = `throw:${error instanceof Error ? error.name : typeof error}`;
      }
      addingPackIdsRef.current.delete(pack.id);
      console.log(`[PACK-ROW] add:result pack=${pack.id} result=${result} target=${target ?? 'default'} ms=${Date.now() - startedAt}`); // guard-ok
      logCardsOptimisticStep('pack_add', 'stored', { result });
      if (result === 'added' || result === 'already_added') return;
      // Откат: набора у человека нет — «✓» и «+1» не имеют права остаться.
      console.warn(`[PACK-ROW] add:rollback pack=${pack.id} reason=${result}`); // guard-ok: причина отказа в журнал
      setLocallyAddedPackIds((prev) => {
        if (!prev.has(pack.id)) return prev;
        const next = new Set(prev);
        next.delete(pack.id);
        return next;
      });
      if (bumpedNow) {
        addBumpedIdsRef.current.delete(pack.id);
        bumpCounts(pack.id, { added: -1 }, 'quick-add-rollback');
      }
      logCardsOptimisticFrame('pack_add', 'rollback_frame', { result });
      // зачем (баг владельца 11.10, 8e8fe95a8): добавление — локальная запись, сеть не нужна; текст про интернет здесь ложный.
      emitAppEvent('action_toast', packAddFailureToast(result));
    })();
  }, [isCommunityPackMine, openPackPreview, bumpCounts]);

  // зачем (ревью 11.10, п.10): строки каталога мемоизированы и не сравнивают onAdd/onOpen — те зовут СВЕЖИЕ обработчики
  // через ref, поэтому смена цели обучения или владения не оставляет в строке устаревшее замыкание.
  const quickAddRef = useRef(quickAddPack);
  quickAddRef.current = quickAddPack;

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
        boxShadow: nestedBoxShadow(g), // зачем (Тень 12.10): пилюля счётчика без рамки — малая тень
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

  /**
   * Плитка каталога сообщества. Тап открывает набор ДО добавления — в режиме
   * просмотра (`preview=1`): карточки видно, тренировать/редактировать нельзя,
   * «Добавить себе» и лайк живут на самом экране набора.
   */
  // зачем (макет #c1, экран 3): пока открыто меню долгого нажатия, нажатая плашка приподнята, остальные приглушены.
  const menuPackId = ugcReportHintPackId;
  const highlightQuery = communityQuery.trim();

  /**
   * Меню долгого нажатия вставляется в поток списка — по Performance Bible вставка/удаление в потоке только через
   * animateNextLayoutTransition (ревью 11.10, п.8), иначе соседние плашки «телепортируются».
   */
  const setMenuPack = useCallback((next: string | null | ((cur: string | null) => string | null)) => {
    animateNextLayoutTransition();
    setUgcReportHintPackId(next);
  }, []);

  // зачем (ревью 11.10, п.10): мемоизированная строка зовёт свежий обработчик через ref — без устаревших замыканий.
  const openRowRef = useRef<(pack: FlashcardMarketPack) => void>(() => undefined);
  openRowRef.current = (pack: FlashcardMarketPack) => {
    // Открытое меню: тап по любой плашке сначала закрывает его, а не уводит с экрана.
    if (menuPackId !== null) {
      setMenuPack(null);
      return;
    }
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    if (isCommunityPackMine(pack)) {
      void openOwnedPack(pack);
    } else {
      void openPackPreview(pack);
    }
  };
  const addRowRef = useRef<(pack: FlashcardMarketPack) => void>(() => undefined);
  addRowRef.current = (pack: FlashcardMarketPack) => {
    if (menuPackId !== null) {
      setMenuPack(null);
      return;
    }
    quickAddRef.current(pack);
  };

  const renderCommunityPackRow = (pack: FlashcardMarketPack) => {
    const owned = isCommunityPackMine(pack);
    // зачем: меню долгого нажатия есть у каждого чужого набора — в нём «Добавить себе» (быстрое добавление без экрана набора), у наборов
    // сообщества ещё «Пожаловаться» и «Не показывать мне».
    const showReportShortcut = !owned;
    const emphasis: PackRowEmphasis = menuPackId === null ? 'normal' : menuPackId === pack.id ? 'lifted' : 'dimmed';
    const counts = livePackCounts(countsOverlay, pack.id, packBaseCounts(pack));

    return (
      <React.Fragment key={`ugc_${pack.id}`}>
        <CommunityPackRow
          pack={pack}
          uiLang={uiLang}
          titleLang={lang}
          g={g}
          owned={owned}
          emphasis={emphasis}
          highlight={highlightQuery}
          likes={counts.likes}
          opening={openingPackId === pack.id}
          disabled={openingPackId !== null}
          onOpen={() => openRowRef.current(pack)}
          onLongPress={
            showReportShortcut
              ? () => {
                  void hapticTap();
                  setMenuPack((cur) => (cur === pack.id ? null : pack.id));
                }
              : undefined
          }
          onAdd={() => addRowRef.current(pack)}
        />
        {menuPackId === pack.id ? renderPackActionsMenu(pack) : null}
      </React.Fragment>
    );
  };

  /**
   * зачем (владелец 11.10, community-redesign.html #c1 экран 3): долгое нажатие на чужой набор — меню ПРЯМО под
   * приподнятой плашкой (`.menu`): «Пожаловаться на набор» / «Не показывать мне». Раньше — шторка снизу (packs-simple).
   * Жалоба открывает ReportPackModal сразу: шторки больше нет, двух нативных Modal подряд не возникает.
   */
  const renderPackActionsMenu = (pack: FlashcardMarketPack) => {
    const actionRow = (testID: string, icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
      <KitTouchable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={menuStyles.row}
      >
        <Ionicons name={icon} size={20} color={g.text} />
        <Text style={[menuStyles.rowText, { color: g.text }]}>{label}</Text>
      </KitTouchable>
    );
    return (
      <View
        testID="flashcards-pack-actions-menu"
        style={[menuStyles.menu, {
          backgroundColor: `${g.opaqueSheet}F7`,
          boxShadow: plateBoxShadow(g), // зачем (Тень 12.10): внутреннее кольцо убрано, тень плашки из темы
        }]}
      >
        {/* зачем (cards-v2 catalog()): круглой «+» на стопке больше нет — быстрое «Добавить себе» живёт здесь (оптимистично, как раньше). */}
        {actionRow('flashcards-pack-add', 'add-circle-outline', triLang(uiLang, {
          ru: 'Добавить себе', uk: 'Додати собі', en: 'Add to mine', es: 'Añadir',
          'pt-BR': 'Adicionar', vi: 'Thêm vào của tôi', id: 'Tambahkan', tr: 'Bana ekle', pl: 'Dodaj do siebie',
        }), () => {
          void hapticTap();
          setMenuPack(null);
          quickAddRef.current(pack);
        })}
        {pack.isCommunityUgc ? (<>
        {actionRow('flashcards-pack-report', 'flag-outline', triLang(uiLang, {
          ru: 'Пожаловаться на набор', uk: 'Поскаржитися на набір', en: 'Report the pack', es: 'Reportar el pack',
          'pt-BR': 'Denunciar o pacote', vi: 'Báo cáo bộ thẻ', id: 'Laporkan paket', tr: 'Paketi bildir', pl: 'Zgłoś zestaw',
        }), () => {
          void hapticTap();
          setMenuPack(null);
          setReportModalPack(pack);
        })}
        {actionRow('flashcards-pack-hide', 'eye-off-outline', triLang(uiLang, {
          ru: 'Не показывать мне', uk: 'Не показувати мені', en: "Don't show me", es: 'No mostrarme',
          'pt-BR': 'Não mostrar para mim', vi: 'Không hiển thị nữa', id: 'Jangan tampilkan lagi', tr: 'Bana gösterme', pl: 'Nie pokazuj mi',
        }), () => {
          void hapticTap();
          // Optimistic UI: меню закрывается и набор пропадает из списка сразу (одним анимированным переходом
          // в потоке — ревью п.8); запись на устройство — фоном.
          animateNextLayoutTransition();
          setUgcReportHintPackId(null);
          setHiddenCommunityPackIds((prev) => {
            if (prev.has(pack.id)) return prev;
            const next = new Set(prev);
            next.add(pack.id);
            return next;
          });
          void (async () => {
            try {
              await hideCommunityPackOnDevice(pack.id, studyTarget);
            } catch (e) {
              // Запись не удалась — набор возвращается в список, и человеку говорим об этом прямо (ревью п.9).
              console.warn(`[PACK-ROW] hide:failed pack=${pack.id} kind=${e instanceof Error ? e.name : typeof e}`); // guard-ok
              DebugLogger.error('FlashcardsCategoryHub:pack', e instanceof Error ? e : new Error(String(e)), 'warning');
              animateNextLayoutTransition();
              setHiddenCommunityPackIds((prev) => {
                if (!prev.has(pack.id)) return prev;
                const next = new Set(prev);
                next.delete(pack.id);
                return next;
              });
              emitAppEvent('action_toast', packHideFailureToast());
              return;
            }
            // зачем (ревью п.9): перечитывание — отдельно: его сбой НЕ возвращает набор, уже скрытый на устройстве.
            try {
              await refreshHiddenCommunityPacks();
            } catch (e) {
              console.warn(`[PACK-ROW] hide:refresh-failed pack=${pack.id} kind=${e instanceof Error ? e.name : typeof e} (набор остаётся скрытым)`); // guard-ok
            }
          })();
        })}
        </>) : null}
      </View>
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
                // макете — значок в плитке слева, текст 16/600 слева, стрелка справа; без обводки (Тень 12.10).
                boxShadow: plateBoxShadow(g),
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <PlateFill g={g} radius={16} />
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g), alignItems: 'center', justifyContent: 'center' }}>
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
          {visibleCommunityPacks.length === 0 && catalogCommunityPacks.length === 0 && (!communityLoaded || isDevCardsHeld('catalog_loading')) ? (
            <View testID="flashcards-community-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: hubBarW, gap: STACK_GAP, paddingTop: STACK_GAP }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={`pk-sk-${i}`} /* guard-ok: четыре статичные заглушки строк каталога */ style={{ height: skeletonRowH, borderRadius: 20, backgroundColor: g.hairlineSoft }} /* зачем: заглушка той же высоты, что плашка — без прыжка при появлении данных */ />
              ))}
            </View>
          ) : visibleCommunityPacks.length === 0 ? (
            // зачем (packs-simple.html кадр 3): пустой каталог — плитка 61 со значком и фраза 20/700 по центру, без карточки.
            <View testID="flashcards-community-empty" style={{ width: hubBarW, alignItems: 'center', paddingTop: 96, paddingHorizontal: 24 }}>
              <View style={{ width: 61, height: 61, borderRadius: 16, backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g), alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={catalogCommunityPacks.length === 0 ? (communityOffline ? 'cloud-offline-outline' : 'people-outline') : 'search-outline'} size={26} color={g.text} />
              </View>
              <FlowText testID="flashcards-community-empty-label" provenance="authored" style={{ color: g.text, fontSize: 22, lineHeight: 28, fontWeight: '700', textAlign: 'center', marginTop: 20 }}>
                {catalogCommunityPacks.length === 0 && communityOffline
                  ? triLang(lang, {
                      ru: 'Нет сети',
                      uk: 'Немає мережі',
                      en: 'No connection',
                      es: 'Sin conexión',
                      'pt-BR': 'Sem conexão',
                      vi: 'Không có mạng',
                      id: 'Tidak ada koneksi',
                      tr: 'Bağlantı yok',
                      pl: 'Brak sieci',
                    })
                  : catalogCommunityPacks.length === 0
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
                  : communityQuery.trim().length === 0
                  ? triLang(lang, {
                      // зачем (владелец 15.10): язык выбран, наборов на нём нет — честная фраза без технических слов
                      ru: 'На этом языке пока нет наборов',
                      uk: 'Цією мовою поки немає наборів',
                      en: 'No packs in this language yet',
                      es: 'Aún no hay packs en este idioma',
                      'pt-BR': 'Ainda não há pacotes neste idioma',
                      vi: 'Chưa có bộ thẻ nào bằng ngôn ngữ này',
                      id: 'Belum ada paket dalam bahasa ini',
                      tr: 'Bu dilde henüz paket yok',
                      pl: 'W tym języku nie ma jeszcze zestawów',
                    })
                  : triLang(lang, {
                      ru: 'Ничего не нашли',
                      uk: 'Нічого не знайшли',
                      en: 'Nothing found',
                      es: 'No encontramos nada',
                      'pt-BR': 'Não encontramos nada',
                      vi: 'Không tìm thấy gì',
                      id: 'Tidak ada yang ditemukan',
                      tr: 'Bir şey bulunamadı',
                      pl: 'Nic nie znaleziono',
                    })}
              </FlowText>
              {catalogCommunityPacks.length === 0 && communityOffline && onRetryCatalog ? (
                <TouchableOpacity
                  testID="flashcards-community-offline-retry"
                  accessibilityRole="button"
                  activeOpacity={0.86}
                  onPress={() => { console.log('[CATALOG-OFFLINE] retry tap'); onRetryCatalog(); }}
                  style={{ marginTop: 26, minHeight: 48, borderRadius: 24, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: g.ctaFill }}
                >
                  <Text style={{ color: g.ctaFillInk, fontSize: 16, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
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
                      style={{ marginTop: 26, minHeight: 48, borderRadius: 24, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: g.ctaFill }}
                    >
                      <Text style={{ color: g.ctaFillInk, fontSize: 16, fontWeight: '700' }}>
                        {triLang(lang, { ru: 'Сбросить поиск', uk: 'Скинути пошук', en: 'Reset search', es: 'Borrar la búsqueda', 'pt-BR': 'Limpar a busca', vi: 'Xóa tìm kiếm', id: 'Hapus pencarian', tr: 'Aramayı temizle', pl: 'Wyczyść wyszukiwanie' })}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
          {/* зачем (community-redesign.html #c1, экран «Поиск»): при поиске над плашками — «Найдено N» (`.lab`). */}
          {highlightQuery.length > 0 && visibleCommunityPacks.length > 0 ? (
            <Text testID="flashcards-community-found" accessibilityLiveRegion="polite" style={[menuStyles.found, { color: g.secondary }]}>
              {triLang(uiLang, {
                ru: `Найдено ${visibleCommunityPacks.length}`, uk: `Знайдено ${visibleCommunityPacks.length}`,
                en: `Found ${visibleCommunityPacks.length}`, es: `Encontrados ${visibleCommunityPacks.length}`,
                'pt-BR': `Encontrados ${visibleCommunityPacks.length}`, vi: `Tìm thấy ${visibleCommunityPacks.length}`,
                id: `Ditemukan ${visibleCommunityPacks.length}`, tr: `${visibleCommunityPacks.length} sonuç bulundu`,
                pl: `Znaleziono ${visibleCommunityPacks.length}`,
              })}
            </Text>
          ) : null}
          {/* зачем (community-redesign.html #c1, `.pl { margin-top: 10px }`): плашки столбиком через 10. */}
          <View style={{ width: hubBarW, gap: STACK_GAP, paddingTop: STACK_GAP }}>
            {visibleCommunityPacks.map(renderCommunityPackRow)}
          </View>
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

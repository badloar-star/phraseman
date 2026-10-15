import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import ContentWrap from '../components/ContentWrap';
import MonthlyTrainingSessionIndicator from '../components/MonthlyTrainingSessionIndicator';
import { LinearGradient } from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';
import { useLang } from '../components/LangContext';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import { triLang } from '../constants/i18n';
// зачем: рестайл 2.0 — экран остаётся полноэкранным (не шторкой), но шапка,
// DeckSelectionTile — общий компонент с DeckPickerSheet.
import { V2IconButton } from '../components/v2/V2Kit';
import V2Pressable from '../components/v2/V2Pressable';
import { V2 } from '../constants/v2Style';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { compactDeckCountLabel } from '../lib/flashcards/compact_deck_count_label';
import { canStartBlitz } from './flashcards/blitz_logic';
import { trainingSetupExplanation } from './flashcards/training_setup_explanation';
import { hideDecksWithoutVoice, loadFcDeckOptions, peekFcDeckOptions, sameDeckOptions } from './flashcards/deck_options';
import type { DeckSheetOption } from './flashcards/DeckPickerSheet';
import DeckSelectionTile from './flashcards/DeckSelectionTile';
import { TrainingSetupV2 } from './flashcards/TrainingSetupV2';
import {
  canSwitchLanguage,
  countByLanguage,
  formatLangFilterLog,
  isFlashcardsReadyLanguage,
  languageMenuEntries,
  reconcileSelectedDeckIds,
  trainingTargetRouteParam,
} from './flashcards/fc_lang_filter';
import { useOtherLanguageDecks } from './flashcards/use_other_language_decks';
import type { LearningLanguageTarget } from './learning_language_contour';
import type { PackLanguage } from './flashcards/pack_languages';
import { FC_PACKS_ROUTE } from './flashcards/tabbar_state';
import {
  deckSelectionLabel,
  summarizeDeckSelection,
  toggleDeckSelection,
  type FcDeckId,
} from './flashcards/deck_selection';
import { fcTrainOptionPresetMode } from './flashcards/tabbar_state';
import {
  FC_DEFAULT_SESSION_SIZE,
  getLastPreset,
  presetDeckIds,
  setLastPreset,
  type FcPresetMode,
} from './flashcards/mode_prefs';
import {
  buildCardsTrainingRoute,
  parseCardsTrainingMode,
  type CardsTrainingMode,
} from './flashcards/training_entry';
import { pickTopCommunityPacks } from './flashcards/SavedTopCommunityPacks';
import {
  loadPublishedCommunityMarketPacks,
  peekPublishedCommunityMarketPacks,
} from './community_packs/communityFirestore';
import { emitPackNotDownloadedToast, stageCommunityPackCardsWithSilentRetry } from './community_packs/stage_with_retry';
import { packTitleForInterface, type FlashcardMarketPack } from './flashcards/marketplace';
import { useStudyTarget } from '../components/StudyTargetContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { hapticTap } from '../hooks/use-haptics';
import { useFlashcardTrainingQuotaPreview } from '../hooks/useFlashcardTrainingQuotaPreview';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';
import { describeDevCardsState, isDevCardsFail, isDevCardsHeld } from './dev_cards_state';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const EMPTY_DECKS: readonly DeckSheetOption[] = [];

type LoadState = 'loading' | 'ready' | 'error';
type LoadErrorKind = 'invalid' | 'unavailable' | 'load' | null;

function presetModeFor(mode: CardsTrainingMode): FcPresetMode {
  if (mode === 'blitz') return fcTrainOptionPresetMode('blitz');
  if (mode === 'speaking') return fcTrainOptionPresetMode('speak');
  return fcTrainOptionPresetMode('train');
}

type SetupGlass = ReturnType<typeof liquidGlassTokens>;

function SetupSurface({
  children,
  glass,
  style,
  testID,
}: Readonly<{
  children: React.ReactNode;
  glass: SetupGlass;
  style?: StyleProp<ViewStyle>;
  testID: string;
}>) {
  return (
    <View
      testID={testID}
      style={[styles.stateSurface, style, { backgroundColor: glass.opaqueCard, boxShadow: plateBoxShadow(glass) }]}
    >
      <LinearGradient
        pointerEvents="none"
        testID={`${testID}-sheen`}
        colors={[glass.selected, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.surfaceSheen]}
      />
      {children}
    </View>
  );
}

function SetupAction({
  disabled,
  label,
  onPress,
  testID,
  glass,
  textScale,
}: Readonly<{
  disabled?: boolean;
  label: string;
  onPress: () => void;
  testID: string;
  glass: SetupGlass;
  textScale: number;
}>) {
  return (
    <V2Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      outerStyle={styles.actionOuter}
      style={[styles.action, { backgroundColor: glass.accent, opacity: disabled ? 0.45 : 1 }]}
    >
      <Text style={[
        styles.actionLabel,
        { color: glass.accentInk, fontSize: 16 * textScale, lineHeight: 22 * textScale },
      ]}>{label}</Text>
    </V2Pressable>
  );
}

/** «EN» / «RU» / «PT»: короткий код языка для подписей «EN → RU» (pt-BR → PT). */
const langChip = (code: string): string => code.split('-')[0].toUpperCase();

export default function FlashcardsTrainingSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = useMemo(() => parseCardsTrainingMode(params.mode), [params.mode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (владелец 12.10, п.83, cards-027): кнопка языка ФИЛЬТРУЕТ наборы. null — язык приложения (по умолчанию); выбор живёт, пока открыт экран, и нигде не сохраняется.
  // studyTarget приложения НЕ меняется (D129/D130) — на выбранном языке идёт только эта тренировка (маршрут несёт ?target).
  const [pickedLang, setPickedLang] = useState<LearningLanguageTarget | null>(null);
  const viewLang: LearningLanguageTarget = pickedLang ?? studyTarget;
  const viewLangRef = useRef<LearningLanguageTarget>(viewLang);
  viewLangRef.current = viewLang;
  useEffect(() => {
    // язык приложения сменили, пока экран открыт, — прежний выбор неактуален
    setPickedLang((prev) => {
      if (prev !== null) console.log(formatLangFilterLog('reset', { reason: 'app_target_changed', appTarget: studyTarget, was: prev }));
      return null;
    });
  }, [studyTarget]);
  const { theme: t, f, statusBarLight, liquidGlassThemeId, fontSize, uiScale } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const reducedMotion = useReducedMotion();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  /**
   * зачем (владелец: «открывая раздел тренировки, экран отметить наборы моргает»):
   * первый кадр берём из тёплого снимка, если он есть, — тогда список виден сразу
   * и не сменяется со спиннера. Снимка нет (первый заход) — честно грузим.
   */
  const warmDecks = useMemo(() => {
    if (!mode) return null;
    const warm = peekFcDeckOptions(presetModeFor(mode), lang, studyTarget);
    // зачем (D127): «Устно» не предлагает наборы «без языка» — ни в первом кадре, ни после загрузки.
    return warm ? hideDecksWithoutVoice(warm, presetModeFor(mode)) : null;
  }, [lang, mode, studyTarget]);
  const [loadState, setLoadState] = useState<LoadState>(
    () => (warmDecks && warmDecks.length > 0 ? 'ready' : 'loading'),
  );
  const [loadErrorKind, setLoadErrorKind] = useState<LoadErrorKind>(null);
  const [decks, setDecks] = useState<DeckSheetOption[]>(() => warmDecks ?? []);
  /** Зеркало списка для loadDecks — чтобы колбэк не пересоздавался на каждый setDecks. */
  const decksRef = useRef<DeckSheetOption[]>(decks);
  decksRef.current = decks;
  const [selectedDeckIds, setSelectedDeckIds] = useState<FcDeckId[]>([]);
  const selectedDeckIdsRef = useRef<FcDeckId[]>(selectedDeckIds);
  selectedDeckIdsRef.current = selectedDeckIds;
  /** Отметки по языкам на время жизни экрана: вернулся к языку — выбор на месте (п.83). */
  const selectionMemoryRef = useRef<Partial<Record<LearningLanguageTarget, FcDeckId[]>>>({});
  // зачем (п.83): списки наборов ДРУГИХ языков — только с устройства (0 чтений Firestore), лениво после первого кадра, по одному языку
  const otherDecks = useOtherLanguageDecks({
    enabled: loadState === 'ready',
    mode: mode ? presetModeFor(mode) : null,
    lang,
    appTarget: studyTarget,
  });
  const otherDecksRef = useRef(otherDecks);
  otherDecksRef.current = otherDecks;
  const [loadRevision, setLoadRevision] = useState(0);
  const [starting, setStarting] = useState(false);
  // зачем (макет cards-section «Устно / Вспомни и напиши»): «Карточек 10 / 20 / Все» — по умолчанию 20, как в макете
  const [sizeId, setSizeId] = useState('20');
  // зачем (ядро): блиц `sec` 30/60/90 (по умолчанию 60), вспомни и напиши `dir` to_target/to_source
  const [secId, setSecId] = useState('60');
  const [dirId, setDirId] = useState('to_target');
  const startInFlightRef = useRef(false);
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;

  /**
   * зачем (владелец): «когда наборов нет ни одного — показывать три лучших
   * пользовательских с предложением добавить». Витрина живёт ТОЛЬКО в этом
   * случае: у человека с наборами она не появляется и ничего не стоит.
   * Первый кадр берём из тёплого снимка каталога (кэш 6 ч), чтобы блок не
   * возникал рывком.
   */
  const [suggestedPacks, setSuggestedPacks] = useState<FlashcardMarketPack[]>(
    () => pickTopCommunityPacks(peekPublishedCommunityMarketPacks(studyTarget) ?? []),
  );
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingPackRef = useRef<string | null>(null);

  const copy = useMemo(() => {
    const invalid = triLang(lang, {
      ru: 'Режим недоступен', uk: 'Режим недоступний', en: 'Mode unavailable', es: 'Modo no disponible',
      'pt-BR': 'Modo indisponível', vi: 'Chế độ không khả dụng', id: 'Mode tidak tersedia',
      tr: 'Mod kullanılamıyor', pl: 'Tryb niedostępny',
    });
    /**
     * зачем (владелец 2026-09-13: «"Начать писать" замени на "Начать"»): одно
     * слово на всех режимах. Режим уже назван заголовком экрана («Вспомни и
     * напиши»), поэтому повторять его на кнопке — лишний шум.
     */
    const start = triLang(lang, {
      ru: 'Начать', uk: 'Почати', en: 'Start', es: 'Empezar',
      'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij',
    });
    if (!mode) return { title: invalid, start: invalid };
    if (mode === 'blitz') return {
      title: triLang(lang, {
        ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz',
        'pt-BR': 'Blitz', vi: 'Blitz', id: 'Blitz',
        tr: 'Blitz', pl: 'Blitz',
      }),
      start,
    };
    if (mode === 'speaking') return {
      title: triLang(lang, {
        ru: 'Устная тренировка', uk: 'Усне тренування',
        en: 'Speaking', es: 'Práctica oral', 'pt-BR': 'Fala',
        vi: 'Luyện nói', id: 'Latihan lisan', tr: 'Sözlü çalışma',
        pl: 'Ćwiczenia ustne',
      }),
      start,
    };
    if (mode === 'recall') return {
      title: triLang(lang, {
        ru: 'Вспомни и напиши', uk: 'Згадай і напиши', en: 'Recall and write', es: 'Recuerda y escribe',
        'pt-BR': 'Lembre e escreva', vi: 'Nhớ và viết', id: 'Ingat dan tulis',
        tr: 'Hatırla ve yaz', pl: 'Przypomnij i napisz',
      }),
      start,
    };
    return {
      title: triLang(lang, {
        ru: 'Правда / ложь', uk: 'Правда / неправда',
        en: 'True / false', es: 'Verdadero / falso',
        'pt-BR': 'Verdadeiro / falso', vi: 'Đúng / sai',
        id: 'Benar / salah', tr: 'Doğru / yanlış', pl: 'Prawda / fałsz',
      }),
      start,
    };
  }, [lang, mode]);

  const modeUnavailableLabel = triLang(lang, {
    ru: 'Этот режим сейчас недоступен. Вернись и выбери другой режим.',
    uk: 'Цей режим зараз недоступний. Повернись та вибери інший режим.',
    en: 'This mode is unavailable right now. Go back and choose another mode.',
    es: 'Este modo no está disponible ahora. Vuelve y elige otro modo.',
    'pt-BR': 'Este modo está indisponível agora. Volte e escolha outro modo.',
    vi: 'Chế độ này hiện không khả dụng. Hãy quay lại và chọn chế độ khác.',
    id: 'Mode ini sedang tidak tersedia. Kembali dan pilih mode lain.',
    tr: 'Bu mod şu anda kullanılamıyor. Geri dönüp başka bir mod seç.',
    pl: 'Ten tryb jest teraz niedostępny. Wróć i wybierz inny tryb.',
  });

  const loadDecks = useCallback(async () => {
    if (!mode) {
      setDecks([]);
      setSelectedDeckIds([]);
      setLoadErrorKind('invalid');
      setLoadState('error');
      return;
    }
    setLoadErrorKind(null);
    /**
     * зачем: спиннер уместен только когда показывать нечего. Если список уже на
     * экране (тёплый снимок или прошлый заход), перечитываем фоном — иначе
     * каждый вход давал кадр «загрузка» поверх готовых данных, то самое моргание.
     */
    if (decksRef.current.length === 0) setLoadState('loading');
    const presetMode = presetModeFor(mode);
    try {
      const [loaded, preset] = await Promise.all([
        loadFcDeckOptions(presetMode, lang, studyTarget),
        getLastPreset(presetMode).catch(noteSwallowedAs('flashcards_training_setup:useCallback.getLastPreset', null)),
      ]);
      const eligible = hideDecksWithoutVoice(loaded, presetMode).filter((deck) => deck.count > 0);
      const eligibleIds = new Set(eligible.map((deck) => deck.deckId));
      const restored = presetDeckIds(preset).filter((deckId) => eligibleIds.has(deckId));
      const fallback = eligible.find((deck) => deck.deckId === 'saved') ?? eligible[0];
      // Состав тот же — держим ПРЕЖНЮЮ ссылку, чтобы список не перерисовывался.
      setDecks((prev) => (sameDeckOptions(prev, eligible) ? prev : eligible));
      const nextSelection: FcDeckId[] = restored.length > 0 ? restored : fallback ? [fallback.deckId] : [];
      if (viewLangRef.current !== studyTarget) {
        // зачем (п.83): человек уже смотрит наборы другого языка — отметки языка приложения не затираем, а откладываем до возврата
        if (!selectionMemoryRef.current[studyTarget]) selectionMemoryRef.current[studyTarget] = nextSelection;
        console.log(formatLangFilterLog('app_list_loaded_while_filtered', { appTarget: studyTarget, viewing: viewLangRef.current, decks: eligible.length }));
      } else {
        setSelectedDeckIds((prev) => {
          const next = nextSelection;
          // Отметки человека, сделанные до ответа хранилища, важнее восстановленных.
          if (prev.length > 0 && prev.every((id) => eligibleIds.has(id))) return prev;
          return prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next;
        });
      }
      setLoadErrorKind(null);
      setLoadState('ready');
    } catch (e) {
      // Немой catch запрещён: причина отказа обязана быть видна в логах.
      console.warn('[FC-TRAIN-SETUP] loadDecks failed', String((e as Error)?.message ?? e));
      // зачем (владелец 01.10): уже показанный (тёплый) список не стираем из-за сбоя сети —
      // остаёмся на нём, а при пустом списке показываем скелетон и молча повторяем (см. эффект ниже).
      if (decksRef.current.length > 0) {
        console.warn('[FC-TRAIN-SETUP] loadDecks: сбой, оставляем показанные наборы', { shown: decksRef.current.length });
        setLoadState('ready');
        return;
      }
      setSelectedDeckIds([]);
      setLoadErrorKind('load');
      setLoadState('error');
    }
  }, [lang, mode, studyTarget]);

  // зачем (D158 / PM-214, 04.10): было 5 тихих повторов по 20 с, затем вечный скелетон наборов и
  // заблокированный старт всех четырёх тренировок. Теперь как во «Вспомни»: 3 повтора ~1/3/8 с
  // (app/load_gate_config.ts), затем «Сейчас недоступно» + тихая «Попробовать снова»; при возврате
  // в приложение повтор идёт сам.
  const silentRetryRef = useRef(0);
  const [loadExhausted, setLoadExhausted] = useState(false);
  useEffect(() => {
    if (loadState === 'ready') { silentRetryRef.current = 0; setLoadExhausted(false); return undefined; }
    if (loadState !== 'error' || loadErrorKind !== 'load') return undefined;
    const backoffMs = loadGateBackoffMs(silentRetryRef.current + 1);
    if (backoffMs === null) {
      console.warn('[FC-TRAIN-SETUP] тихие повторы наборов исчерпаны → «Сейчас недоступно»', { attempts: silentRetryRef.current });
      setLoadExhausted(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      silentRetryRef.current += 1;
      console.warn('[FC-TRAIN-SETUP] тихий повтор наборов', { attempt: silentRetryRef.current, backoffMs });
      setLoadRevision((value) => value + 1);
    }, backoffMs);
    return () => clearTimeout(timer);
  }, [loadErrorKind, loadRevision, loadState]);

  const retryDecksLoad = useCallback((source: 'tap' | 'foreground') => {
    console.warn('[FC-TRAIN-SETUP] повтор после «Сейчас недоступно»', { source });
    if (source === 'tap') hapticTap();
    silentRetryRef.current = 0;
    setLoadExhausted(false);
    setLoadRevision((value) => value + 1);
  }, []);

  // D158: автоповтор при возврате в приложение, если повторы исчерпаны.
  useEffect(() => {
    if (!loadExhausted) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryDecksLoad('foreground');
    });
    return () => sub.remove();
  }, [loadExhausted, retryDecksLoad]);

  // D158: загрузка, не ответившая ни успехом, ни ошибкой, не держит скелетон вечно.
  useEffect(() => {
    if (loadState !== 'loading') return undefined;
    const timer = setTimeout(() => {
      console.warn('[FC-TRAIN-SETUP] watchdog: наборы не ответили за потолок → цикл тихих повторов', { loadRevision, ceilingMs: LOAD_GATE_TOTAL_MS });
      setLoadErrorKind('load');
      setLoadState('error');
    }, LOAD_GATE_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [loadRevision, loadState]);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks, loadRevision]);

  /** Есть ли у человека хоть один набор с карточками. */
  const hasNoDecks = loadState === 'ready' && decks.length === 0 && viewLang === studyTarget;

  /**
   * Витрина подгружается ТОЛЬКО когда наборов нет ни одного — иначе ни одного
   * лишнего чтения Firestore. Каталог сообщества кэширован на 6 часов, поэтому
   * повторные заходы на пустой экран сети не касаются.
   */
  useEffect(() => {
    if (!hasNoDecks || !cloudCommunityEnabled) return;
    if (suggestedPacks.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const catalog = await loadPublishedCommunityMarketPacks(studyTarget);
        if (cancelled) return;
        setSuggestedPacks(pickTopCommunityPacks(catalog));
      } catch (e) {
        // Немой catch запрещён: пустая витрина обязана объясняться в логах.
        console.warn('[FC-TRAIN-SETUP] suggested packs failed', String((e as Error)?.message ?? e));
      }
    })();
    return () => { cancelled = true; };
  }, [cloudCommunityEnabled, hasNoDecks, studyTarget, suggestedPacks.length]);

  /**
   * Тап по предложенному набору открывает его (решение владельца), а не
   * добавляет молча. Карточки готовятся ДО навигации — иначе экран набора
   * открылся бы пустым и досоздавался на глазах.
   */
  const openSuggestedPack = useCallback((pack: FlashcardMarketPack) => {
    if (openingPackRef.current) return;
    void hapticTap();
    openingPackRef.current = pack.id;
    setOpeningPackId(pack.id);
    void (async () => {
      const cards = await stageCommunityPackCardsWithSilentRetry(pack.id, studyTarget, pack, { isStillWanted: () => openingPackRef.current === pack.id, tag: 'training-setup' });
      if (openingPackRef.current !== pack.id) return;
      openingPackRef.current = null;
      setOpeningPackId(null);
      if (cards.length === 0) {
        emitPackNotDownloadedToast();
        return;
      }
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, preview: '1', from: 'train_setup' },
      } as never);
    })();
  }, [router, studyTarget]);

  // зачем (п.83): видимый список — наборы выбранного языка; null — чужой язык ещё собирается (скелетон только на месте списка)
  const viewDecks: readonly DeckSheetOption[] | null = viewLang === studyTarget ? decks : (otherDecks[viewLang] ?? null);
  const viewDeckList: DeckSheetOption[] = (viewDecks ?? EMPTY_DECKS) as DeckSheetOption[];
  const listReady = viewLang === studyTarget ? loadState === 'ready' : viewDecks !== null;
  const languageEntries = useMemo(
    () => languageMenuEntries(countByLanguage({ ...otherDecks, [studyTarget]: loadState === 'ready' ? decks : undefined }), studyTarget),
    [decks, loadState, otherDecks, studyTarget],
  );
  const languageSwitchable = canSwitchLanguage(languageEntries, viewLang);
  const summary = useMemo(
    () => summarizeDeckSelection(viewDeckList, selectedDeckIds),
    [viewDeckList, selectedDeckIds],
  );

  // зачем (п.83): Optimistic UI — список и отметки меняются в тот же тап из памяти (peek/уже собранное), без ожидания сети
  const selectLanguage = useCallback((code: PackLanguage) => {
    const from = viewLangRef.current;
    if (!isFlashcardsReadyLanguage(code)) {
      console.warn(formatLangFilterLog('select_rejected', { code, reason: 'flashcards_not_ready', from }));
      return;
    }
    if (code === from) return;
    selectionMemoryRef.current[from] = selectedDeckIdsRef.current;
    const list: readonly DeckSheetOption[] | null = code === studyTarget ? decksRef.current : (otherDecksRef.current[code] ?? null);
    const visibleIds = (list ?? EMPTY_DECKS).map((deck) => deck.deckId);
    const remembered = reconcileSelectedDeckIds(selectionMemoryRef.current[code] ?? [], visibleIds);
    const fallback = (list ?? EMPTY_DECKS).find((deck) => deck.deckId === 'saved') ?? (list ?? EMPTY_DECKS)[0];
    const nextSelection: FcDeckId[] = remembered.length > 0 ? remembered : fallback ? [fallback.deckId] : [];
    console.log(formatLangFilterLog('select', {
      from,
      to: code,
      appTarget: studyTarget,
      decks: list ? list.length : null,
      source: code === studyTarget ? 'app_list' : list ? 'memory' : 'not_loaded',
      selected: nextSelection.length,
      restoredFromMemory: remembered.length > 0,
    }));
    setSelectedDeckIds(nextSelection);
    setPickedLang(code === studyTarget ? null : code);
    hapticTap();
  }, [studyTarget]);
  const blitzHasEnoughCards = mode !== 'blitz' || canStartBlitz(summary.cardCount);
  /**
   * зачем (владелец 2026-09-13: «почему она серая и нельзя запустить»): старт
   * требовал СТРОГО 'allowed', поэтому любая поломка на нашей стороне гасила
   * кнопку насмерть — база phone-state не открывалась, квота читалась как
   * 'unavailable', и человек с 30 выбранными карточками не мог начать.
   * Решение владельца: не наказывать за нашу аварию. Ждём только 'waiting' —
   * это обычная загрузка, которая вот-вот закончится сама. То же правило уже
   * действует в хабе карточек и в consume квоты (коммит 6823b8de2), этот экран
   * был последней точкой со старым строгим условием.
   */
  // зачем (владелец 2026-09-14): старт не ждёт чтения квоты — блокирует только доказанный exhausted.
  const quotaAllowsStart = quotaPreview.status !== 'exhausted';
  const canStart = listReady
    && quotaAllowsStart
    && summary.cardCount > 0
    && blitzHasEnoughCards
    && !starting;

  // зачем: серая кнопка молчала о причине. Печатаем КАЖДОЕ слагаемое, а не
  // итог, чтобы сразу видеть, какое из них её держит.
  if (!canStart) {
    console.log('[FC-TRAIN-ENTRY] setup:кнопка серая', JSON.stringify({
      mode,
      loadState,
      viewLang,
      listReady,
      quotaStatus: quotaPreview.status,
      quotaAllowsStart,
      cardCount: summary.cardCount,
      selectedDecks: selectedDeckIds.length,
      blitzHasEnoughCards,
      starting,
    }));
  }

  const resetStartLock = useCallback(() => {
    startInFlightRef.current = false;
    setStarting(false);
  }, []);

  // The setup route is retained under the training route. Release the lock only
  // when this screen is focused again, never in the same turn as router.push.
  // зачем (ядро, ревью 62853031e): отложенный тап не должен пережить уход с экрана — иначе после догрузки router.push уйдёт с невидимого экрана.
  const pendingStartRef = useRef(false);
  const [startQueued, setStartQueued] = useState(false);
  const cancelQueuedStart = useCallback((reason: string) => {
    if (!pendingStartRef.current) return;
    pendingStartRef.current = false;
    setStartQueued(false);
    console.log('[FC-TRAIN-ENTRY] setup:start-queued → cancel', JSON.stringify({ reason }));
  }, []);
  useFocusEffect(useCallback(() => {
    console.log('[BLITZ-AUTOOPEN] setup:focus', JSON.stringify({ queued: pendingStartRef.current }));
    resetStartLock();
    return () => cancelQueuedStart('blur');
  }, [cancelQueuedStart, resetStartLock]));

  const leave = useCallback(() => {
    safeRouterBack(router, '/flashcards' as never);
  }, [router]);

  // зачем (координатор 04.10, «первый тап «Начать» молчит, сработал только второй»; логов на тап не было): сперва трассировка каждого выхода;
  // Optimistic UI — тап, пока наборы ещё грузятся, запоминается и сам срабатывает, когда экран готов (а не пропадает).
  const startTraining = useCallback(async () => {
    const state = { canStart, starting, inFlight: startInFlightRef.current, mode: mode ?? null, loadState, cardCount: summary.cardCount, quotaStatus: quotaPreview.status, blitzHasEnoughCards };
    console.log('[FC-TRAIN-ENTRY] setup:start-tap', JSON.stringify(state));
    // зачем (координатор 12.10, «сперва логи», cards-v2-033): тот же префикс, что в старте сессии, — режим, наборы, размер и подмены dev с источником одним поиском
    console.log(`[FLASHCARDS-SESSION] setup:tap ${JSON.stringify({ ...state, selectedDecks: selectedDeckIds.length, sizeId, secId, dirId, devState: describeDevCardsState() })}`); // guard-ok: журнал цепочки старта
    if (startInFlightRef.current) { console.log('[FC-TRAIN-ENTRY] setup:start-exit in_flight_lock'); return; }
    if (!mode) { console.log('[FC-TRAIN-ENTRY] setup:start-exit no_mode'); return; }
    if (!canStart) {
      if (loadState === 'loading') {
        pendingStartRef.current = true;
        setStartQueued(true);
        console.log('[FC-TRAIN-ENTRY] setup:start-queued — наборы грузятся, запуск сам, когда будет готово');
      } else {
        console.log('[FC-TRAIN-ENTRY] setup:start-exit cannot_start', JSON.stringify(state));
      }
      return;
    }
    pendingStartRef.current = false;
    setStartQueued(false);
    // зачем (п.83): тренировка идёт на языке ВЫБРАННЫХ наборов; для языка приложения параметра нет и маршрут прежний
    const routeTarget = trainingTargetRouteParam(viewLang, studyTarget);
    console.log(formatLangFilterLog('start', { viewLang, appTarget: studyTarget, targetParam: routeTarget ?? null, decks: selectedDeckIds.length, cards: summary.cardCount }));
    const route = buildCardsTrainingRoute(mode, selectedDeckIds, mode === 'speaking' || mode === 'recall' || mode === 'truefalse' ? sizeId : undefined, { sec: secId, dir: dirId, target: routeTarget });
    if (!route) { console.log('[FC-TRAIN-ENTRY] setup:start-exit no_route', JSON.stringify({ mode, selectedDecks: selectedDeckIds.length })); return; }
    console.log('[BLITZ-AUTOOPEN] setup:push', JSON.stringify({ mode }));
    console.log('[FC-TRAIN-ENTRY] setup:push', JSON.stringify({ pathname: route.pathname, params: route.params }));
    console.log(`[FLASHCARDS-SESSION] setup:push ${JSON.stringify({ pathname: route.pathname, params: route.params, mode })}`); // guard-ok: журнал цепочки старта
    startInFlightRef.current = true;
    setStarting(true);
    if (viewLang === studyTarget) {
      void setLastPreset(presetModeFor(mode), {
        deckIds: selectedDeckIds,
        size: FC_DEFAULT_SESSION_SIZE,
      }).catch((e) => {
        // Немой catch запрещён: пресет не сохранился — человек потеряет выбор наборов.
        console.warn('[FC-TRAIN-SETUP] setLastPreset failed', String((e as Error)?.message ?? e));
      });
    } else {
      // зачем (п.83): пресет хранится по режиму без языка — набор чужого языка нельзя подсунуть под язык приложения при следующем входе
      console.log(formatLangFilterLog('preset_skipped', { viewLang, appTarget: studyTarget, reason: 'foreign_language_decks' }));
    }
    try {
      router.push({ pathname: route.pathname, params: route.params } as never);
    } catch (pushError) {
      console.warn('[FC-TRAIN-ENTRY] setup:push-failed', pushError instanceof Error ? pushError.message : String(pushError));
      resetStartLock();
    }
  }, [blitzHasEnoughCards, canStart, loadState, mode, quotaPreview.status, resetStartLock, router, selectedDeckIds, sizeId, secId, dirId, starting, studyTarget, summary.cardCount, viewLang]);

  useEffect(() => {
    if (!pendingStartRef.current) return;
    if (canStart) {
      console.log('[FC-TRAIN-ENTRY] setup:start-queued → fire');
      void startTraining();
      return;
    }
    // загрузка закончилась, а старт невозможен (нет карточек, мало для блица, лимит) — очередь не «залипает»
    if (loadState !== 'loading') cancelQueuedStart(`not_startable loadState=${loadState} cardCount=${summary.cardCount} quota=${quotaPreview.status}`);
  }, [canStart, cancelQueuedStart, loadState, quotaPreview.status, startTraining, summary.cardCount]);

  const emptyLabel = triLang(lang, {
    ru: 'Пока нет карточек для тренировки. Сохрани карточки или добавь набор из сообщества.', uk: 'Поки немає карток для тренування. Збережи картки або додай набір зі спільноти.',
    en: 'No cards to practice yet. Save cards or add a community pack.', es: 'Aún no hay tarjetas para practicar. Guarda tarjetas o añade un pack de la comunidad.',
    'pt-BR': 'Ainda não há cartões para praticar. Salve cartões ou adicione um pacote da comunidade.', vi: 'Chưa có thẻ để luyện tập. Hãy lưu thẻ hoặc thêm bộ thẻ cộng đồng.',
    id: 'Belum ada kartu untuk latihan. Simpan kartu atau tambahkan paket komunitas.', tr: 'Henüz çalışacak kart yok. Kart kaydet veya topluluktan bir paket ekle.',
    pl: 'Nie ma jeszcze kart do ćwiczeń. Zapisz karty lub dodaj zestaw społeczności.',
  });
  const selectionExplanation = trainingSetupExplanation(loadState, decks.length, deckSelectionLabel(lang, summary), {
    empty: emptyLabel,
    // зачем (владелец 01.10): без подписи о загрузке — пока грузится, подпись та же, что и в ошибке: «Выбор наборов».
    loading: triLang(lang, { ru: 'Выбор наборов', uk: 'Вибір наборів', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybór zestawów' }),
    error: triLang(lang, { ru: 'Выбор наборов', uk: 'Вибір наборів', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybór zestawów' }),
    unselected: triLang(lang, { ru: 'Отметь один или несколько наборов для тренировки.', uk: 'Вибери один або кілька наборів для тренування.', en: 'Select one or more packs to practice.', es: 'Selecciona uno o más packs para practicar.', 'pt-BR': 'Selecione um ou mais pacotes para praticar.', vi: 'Chọn một hoặc nhiều bộ thẻ để luyện tập.', id: 'Pilih satu atau beberapa paket untuk latihan.', tr: 'Çalışmak için bir veya daha fazla paket seç.', pl: 'Zaznacz jeden lub kilka zestawów do ćwiczeń.' }),
  });
  /** Витрина на пустом экране: приглашение добавить первый набор. */
  const suggestHeading = triLang(lang, {
    ru: 'Добавь первый набор', uk: 'Додай перший набір', en: 'Add your first pack',
    es: 'Añade tu primer pack', 'pt-BR': 'Adicione seu primeiro pacote',
    vi: 'Thêm bộ thẻ đầu tiên', id: 'Tambahkan paket pertama',
    tr: 'İlk paketini ekle', pl: 'Dodaj pierwszy zestaw',
  });
  /** Язык названий наборов — тот же контентный набор, что и в списке наборов. */
  const contentLangForTitle = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const loadErrorMessage = modeUnavailableLabel;
  const blitzMinimumLabel = triLang(lang, {
    ru: 'Для блица нужно минимум 4 карточки.', uk: 'Для бліцу потрібно щонайменше 4 картки.',
    en: 'Blitz needs at least 4 cards.', es: 'Blitz necesita al menos 4 tarjetas.',
    'pt-BR': 'O Blitz precisa de pelo menos 4 cartões.', vi: 'Blitz cần ít nhất 4 thẻ.',
    id: 'Blitz memerlukan setidaknya 4 kartu.', tr: 'Blitz için en az 4 kart gerekir.',
    pl: 'Blitz wymaga co najmniej 4 kart.',
  });

  // зачем (владелец: «в приложении запрещены любые различия с макетом», cards-section «Блиц / Устно / Правда-ложь / Вспомни и напиши»):
  // разметка вынесена в TrainingSetupV2; здесь — только логика (загрузка наборов, выбор, квота, запуск).
  // зачем (координатор 12.10): «Блиц» и подписи секунд были русскими на любом языке
  const secondsLabel = (n: number) => triLang(lang, { ru: `${n} с`, uk: `${n} с`, en: `${n} s`, es: `${n} s`, 'pt-BR': `${n} s`, vi: `${n} giây`, id: `${n} dtk`, tr: `${n} sn`, pl: `${n} s` });
  const modeTitle = mode === 'blitz'
    ? triLang(lang, { ru: 'Блиц', uk: 'Бліц', en: 'Blitz', es: 'Blitz', 'pt-BR': 'Blitz', vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz' })
    : triLang(lang, {
      // зачем (Карточки 2.0 12.10): режим «Напиши» называется так же, как плитка шторки режимов и заголовок сессии в макете
      ru: mode === 'speaking' ? 'Устно' : mode === 'recall' ? 'Напиши' : 'Правда / ложь',
      uk: mode === 'speaking' ? 'Усно' : mode === 'recall' ? 'Напиши' : 'Правда / неправда',
      en: mode === 'speaking' ? 'Speaking' : mode === 'recall' ? 'Write' : 'True / false',
      es: mode === 'speaking' ? 'Oral' : mode === 'recall' ? 'Escribe' : 'Verdadero / falso',
      'pt-BR': mode === 'speaking' ? 'Falando' : mode === 'recall' ? 'Escreva' : 'Verdadeiro / falso',
      vi: mode === 'speaking' ? 'Nói' : mode === 'recall' ? 'Viết' : 'Đúng / sai',
      id: mode === 'speaking' ? 'Lisan' : mode === 'recall' ? 'Tulis' : 'Benar / salah',
      tr: mode === 'speaking' ? 'Sözlü' : mode === 'recall' ? 'Yaz' : 'Doğru / yanlış',
      pl: mode === 'speaking' ? 'Ustnie' : mode === 'recall' ? 'Napisz' : 'Prawda / fałsz',
    });
  // зачем (Карточки 2.0 12.10, макет «Настройка»): значок режима в плитке 55 слева от названия (те же значки, что в шторке режимов)
  const modeIcon = mode === 'blitz' ? 'flash-outline' : mode === 'speaking' ? 'mic-outline' : mode === 'recall' ? 'create-outline' : 'checkmark';
  const sizeOptions = mode === 'speaking' || mode === 'recall' || mode === 'truefalse'
    ? [
      { id: '10', label: '10' },
      { id: '20', label: '20' },
      { id: 'all', label: triLang(lang, { ru: 'Все', uk: 'Усі', en: 'All', es: 'Todas', 'pt-BR': 'Todos', vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystkie' }) },
    ]
    : null;
  const extra = mode === 'blitz'
    ? {
      title: triLang(lang, { ru: 'Время', uk: 'Час', en: 'Time', es: 'Tiempo', 'pt-BR': 'Tempo', vi: 'Thời gian', id: 'Waktu', tr: 'Süre', pl: 'Czas' }),
      options: [{ id: '30', label: secondsLabel(30) }, { id: '60', label: secondsLabel(60) }, { id: '90', label: secondsLabel(90) }],
      value: secId,
      onChange: setSecId,
    }
    : mode === 'recall'
      ? {
        // зачем (Карточки 2.0 12.10, макет «Показывать»: «EN → RU / RU → EN»): подписи — коды языка изучения и языка интерфейса;
        // «EN → RU» = показываем фразу, пишем перевод (to_source), «RU → EN» = показываем перевод, пишем фразу (to_target)
        title: triLang(lang, { ru: 'Показывать', uk: 'Показувати', en: 'Show', es: 'Mostrar', 'pt-BR': 'Mostrar', vi: 'Hiển thị', id: 'Tampilkan', tr: 'Göster', pl: 'Pokazuj' }),
        options: [
          { id: 'to_source', label: `${langChip(viewLang)} → ${langChip(lang)}` },
          { id: 'to_target', label: `${langChip(lang)} → ${langChip(viewLang)}` },
        ],
        value: dirId,
        onChange: setDirId,
      }
      : null;
  // зачем (Карточки 2.0 12.10): кнопка по макету просто «Начать» — число карточек ушло из подписи (его озвучивает a11y-метка кнопки)
  const baseStartLabel = copy.start;
  // зачем (ядро): пока тап в очереди, кнопка показывает «Начать…» — видно, что тап принят, и не хочется тапать снова
  const startLabel = startQueued ? `${baseStartLabel}…` : baseStartLabel;
  const computedSetupStatus: 'ready' | 'loading' | 'unavailable' | 'empty' | 'invalid' = !mode
    ? 'invalid'
    : viewLang !== studyTarget
      // зачем (п.83): на чужом языке состояние экрана — состояние ЕГО списка, а не загрузки языка приложения
      ? (viewDecks === null ? 'loading' : viewDecks.length === 0 ? 'empty' : 'ready')
    : loadState === 'loading'
      ? 'loading'
      : loadState === 'error'
        ? (loadErrorKind === 'load' ? (loadExhausted ? 'unavailable' : 'loading') : 'invalid')
        : decks.length === 0
          ? 'empty'
          : 'ready';
  // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `hold=setup_loading` / `fail=setup_decks` — «Загрузка наборов» и «Сейчас недоступно»; в стор-сборке геттеры выключены.
  const setupStatus: typeof computedSetupStatus = isDevCardsHeld('setup_loading') ? 'loading' : isDevCardsFail('setup_decks') ? 'unavailable' : computedSetupStatus;
  // зачем (вердикт Макетов 12.10, cards-075: «внизу "Режим недоступен", в образце "Начать"»): сперва логи. Печатаем КАЖДОЕ слагаемое, которое
  // решает статус экрана и подпись кнопки: режим из маршрута (его отсутствие даёт «Режим недоступен» на кнопке), состояние загрузки, dev-держатели.
  const prepModeParam = Array.isArray(params.mode) ? params.mode.join(',') : (params.mode ?? null);
  useEffect(() => {
    console.log('[TRAIN-PREP] status', JSON.stringify({
      modeParam: prepModeParam,
      mode: mode ?? null,
      loadState,
      loadErrorKind: loadErrorKind ?? null,
      decks: decks.length,
      computedSetupStatus,
      devHoldSetupLoading: isDevCardsHeld('setup_loading'),
      devFailSetupDecks: isDevCardsFail('setup_decks'),
      setupStatus,
      startLabel,
      canStart,
      quotaStatus: quotaPreview.status,
    }));
    if (!mode) console.warn('[TRAIN-PREP] режим не задан в маршруте (?mode=blitz|speaking|truefalse|recall) — кнопка и заголовок покажут «Режим недоступен»', JSON.stringify({ modeParam: prepModeParam })); // guard-ok: причина подписи «недоступен»
  }, [prepModeParam, mode, loadState, loadErrorKind, decks.length, computedSetupStatus, setupStatus, startLabel, canStart, quotaPreview.status]);
  // зачем (решение координатора 12.10, макет «Лимит Free»): исчерпанный лимит — обычная настройка с пилюлей и «Безлимит с Plus», а не тупик
  const limitReached = quotaPreview.status === 'exhausted';
  // зачем (D174, cards-section-056): пилюля = «использовано/лимит» (30/30), как D166 «4/3» у энергии, а не «осталось/лимит» (0/30)
  // зачем (аудит #17, 15.10): у Plus лимита тренировок нет — пилюля «n/30» только у Free
  const limitLabel = quotaPreview.status === 'waiting' || hasPremiumAccess ? null : `${Math.min(quotaPreview.limit, Math.max(0, quotaPreview.used))}/${quotaPreview.limit}`;
  const openUpgrade = useCallback(() => {
    console.log('[FC-TRAIN-ENTRY] setup:upgrade-tap', JSON.stringify({ mode: mode ?? null, quotaStatus: quotaPreview.status, used: quotaPreview.used, limit: quotaPreview.limit }));
    router.push({ pathname: '/premium_modal', params: { context: 'flashcard_training', source: 'flashcards_training_setup' } } as never);
  }, [mode, quotaPreview.limit, quotaPreview.status, quotaPreview.used, router]);

  return (
    <ScreenGradient>
      <View
        testID="fc-training-setup-safe-frame"
        style={[
          styles.safe,
          { paddingTop: insets.top, paddingRight: insets.right, paddingLeft: insets.left },
        ]}
      >
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <TrainingSetupV2
            lang={lang}
            title={modeTitle}
            modeIcon={modeIcon}
            limitLabel={limitLabel}
            limitReached={limitReached}
            status={setupStatus}
            languageLabel={langChip(viewLang)} // зачем (cards-027, п.83): язык выбранных наборов; с наборами нескольких языков чип — кнопка фильтра
            languageSwitchable={languageSwitchable}
            languageEntries={languageEntries}
            languageCode={viewLang}
            onLanguageChange={selectLanguage}
            invalidText={loadErrorMessage}
            decks={viewDeckList}
            countLabelFor={(count) => compactDeckCountLabel(lang, count)}
            selectedIds={selectedDeckIds}
            onToggle={(deckId) => setSelectedDeckIds((current) => toggleDeckSelection(current, deckId))}
            selectedCardCount={summary.cardCount}
            sizeOptions={sizeOptions}
            extra={extra}
            size={sizeId}
            onSizeChange={setSizeId}
            startLabel={startLabel}
            canStart={canStart}
            hint={!blitzHasEnoughCards && summary.cardCount > 0 ? blitzMinimumLabel : null}
            onStart={() => void startTraining()}
            onUpgrade={openUpgrade}
            onBack={leave}
            onFindPacks={() => router.push(FC_PACKS_ROUTE as never)}
            onRetry={() => retryDecksLoad('tap')}
          />
        </ContentWrap>
      </View>
      {mode && mode !== 'truefalse' ? <FeatureIntroEntry
        key={mode}
        id={`training_${mode}_first_visit`}
        enabled={accessResolved && quotaPreview.status !== 'exhausted' && loadState === 'ready' && decks.length > 0 && !starting && !openingPackId}
      /> : null}
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  layout: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8 },
  headerTitle: { flex: 1, minWidth: 0, textAlign: 'left', fontWeight: '700' },
  summaryRow: { marginTop: 15, flexDirection: 'row', alignItems: 'center' },
  summary: { flex: 1, minWidth: 0, fontWeight: '700' },
  stateSurface: { position: 'relative', borderRadius: 16 }, // зачем (Тень 12.10): без кромки и без overflow (клип тени); блик скруглён сам (surfaceSheen)
  surfaceSheen: { borderRadius: 16 },
  loadingBox: { minHeight: 150, marginTop: 14, padding: 14 },
  loadingContent: { width: '100%', gap: 12 },
  loadingRows: { width: '100%', gap: 10 },
  loadingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13 },
  loadingIcon: { width: 44, height: 44, borderRadius: 12 },
  loadingCopy: { flex: 1, minWidth: 0, gap: 7 },
  loadingLineLong: { width: '72%', height: 10, borderRadius: 5 },
  loadingLineShort: { width: '44%', height: 8, borderRadius: 4 },
  messageBox: { minHeight: 150, marginTop: 14, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyBox: { minHeight: 150, marginTop: 14, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 16 },
  suggestHeading: { textAlign: 'center', fontWeight: '900' },
  suggestRow: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestTile: { flexGrow: 1, flexBasis: 94, minWidth: 0, minHeight: 118, borderRadius: V2.radius.card, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'flex-start', gap: 9 },
  suggestIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  suggestTitle: { minWidth: 0, textAlign: 'center', fontWeight: '800' },
  message: { textAlign: 'center', fontWeight: '600' },
  tryAgain: { minHeight: 44, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  tryAgainLabel: { textAlign: 'center', fontWeight: '700' },
  deckGrid: { marginTop: 14, gap: 10 },
  validation: { marginTop: 10, textAlign: 'center', fontWeight: '700' },
  dockScroll: { flexGrow: 0, flexShrink: 1, maxHeight: '46%' },
  dockContent: { paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  quota: { width: '100%' },
  actionOuter: { width: '100%' },
  action: { width: '100%', minHeight: 48, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { minWidth: 0, textAlign: 'center', fontWeight: '800' },
});

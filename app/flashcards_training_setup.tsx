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
import { compactDeckCountLabel } from '../lib/flashcards/compact_deck_count_label';
import { canStartBlitz } from './flashcards/blitz_logic';
import { trainingSetupExplanation } from './flashcards/training_setup_explanation';
import { hideDecksWithoutVoice, loadFcDeckOptions, peekFcDeckOptions, sameDeckOptions } from './flashcards/deck_options';
import type { DeckSheetOption } from './flashcards/DeckPickerSheet';
import DeckSelectionTile from './flashcards/DeckSelectionTile';
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
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
      style={[styles.stateSurface, style, { backgroundColor: glass.opaqueCard, borderColor: glass.glassEdge }]}
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

export default function FlashcardsTrainingSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = useMemo(() => parseCardsTrainingMode(params.mode), [params.mode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, statusBarLight, liquidGlassThemeId, fontSize, uiScale } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const reducedMotion = useReducedMotion();
  const { accessResolved } = usePremium();
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
  const [loadRevision, setLoadRevision] = useState(0);
  const [starting, setStarting] = useState(false);
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
    ru: 'Этот режим сейчас недоступен. Вернитесь и выберите другой режим.',
    uk: 'Цей режим зараз недоступний. Поверніться та виберіть інший режим.',
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
      setSelectedDeckIds((prev) => {
        const next = restored.length > 0 ? restored : fallback ? [fallback.deckId] : [];
        // Отметки человека, сделанные до ответа хранилища, важнее восстановленных.
        if (prev.length > 0 && prev.every((id) => eligibleIds.has(id))) return prev;
        return prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next;
      });
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
  const hasNoDecks = loadState === 'ready' && decks.length === 0;

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

  const summary = useMemo(
    () => summarizeDeckSelection(decks, selectedDeckIds),
    [decks, selectedDeckIds],
  );
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
  const canStart = loadState === 'ready'
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
  useFocusEffect(useCallback(() => {
    resetStartLock();
  }, [resetStartLock]));

  const leave = useCallback(() => {
    safeRouterBack(router, '/flashcards' as never);
  }, [router]);

  const startTraining = useCallback(async () => {
    if (startInFlightRef.current || !mode || !canStart) return;
    const route = buildCardsTrainingRoute(mode, selectedDeckIds);
    if (!route) return;
    startInFlightRef.current = true;
    setStarting(true);
    void setLastPreset(presetModeFor(mode), {
      deckIds: selectedDeckIds,
      size: FC_DEFAULT_SESSION_SIZE,
    }).catch((e) => {
      // Немой catch запрещён: пресет не сохранился — человек потеряет выбор наборов.
      console.warn('[FC-TRAIN-SETUP] setLastPreset failed', String((e as Error)?.message ?? e));
    });
    try {
      router.push({ pathname: route.pathname, params: route.params } as never);
    } catch {
      resetStartLock();
    }
  }, [canStart, mode, resetStartLock, router, selectedDeckIds]);

  const emptyLabel = triLang(lang, {
    ru: 'Пока нет карточек для тренировки. Сохрани карточки или добавь набор из сообщества.', uk: 'Поки немає карток для тренування. Збережи картки або додай набір зі спільноти.',
    en: 'No cards to practise yet. Save cards or add a community pack.', es: 'Aún no hay tarjetas para practicar. Guarda tarjetas o añade un pack de la comunidad.',
    'pt-BR': 'Ainda não há cartões para praticar. Salve cartões ou adicione um pacote da comunidade.', vi: 'Chưa có thẻ để luyện tập. Hãy lưu thẻ hoặc thêm bộ thẻ cộng đồng.',
    id: 'Belum ada kartu untuk latihan. Simpan kartu atau tambahkan paket komunitas.', tr: 'Henüz çalışacak kart yok. Kart kaydet veya topluluktan bir paket ekle.',
    pl: 'Nie ma jeszcze kart do ćwiczeń. Zapisz karty lub dodaj zestaw społeczności.',
  });
  const selectionExplanation = trainingSetupExplanation(loadState, decks.length, deckSelectionLabel(lang, summary), {
    empty: emptyLabel,
    // зачем (владелец 01.10): без подписи о загрузке — пока грузится, подпись та же, что и в ошибке: «Выбор наборов».
    loading: triLang(lang, { ru: 'Выбор наборов', uk: 'Вибір наборів', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybór zestawów' }),
    error: triLang(lang, { ru: 'Выбор наборов', uk: 'Вибір наборів', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybór zestawów' }),
    unselected: triLang(lang, { ru: 'Отметь один или несколько наборов для тренировки.', uk: 'Вибери один або кілька наборів для тренування.', en: 'Select one or more packs to practise.', es: 'Selecciona uno o más packs para practicar.', 'pt-BR': 'Selecione um ou mais pacotes para praticar.', vi: 'Chọn một hoặc nhiều bộ thẻ để luyện tập.', id: 'Pilih satu atau beberapa paket untuk latihan.', tr: 'Çalışmak için bir veya daha fazla paket seç.', pl: 'Zaznacz jeden lub kilka zestawów do ćwiczeń.' }),
  });
  /** Витрина на пустом экране: приглашение добавить первый набор. */
  const suggestHeading = triLang(lang, {
    ru: 'Добавьте первый набор', uk: 'Додайте перший набір', en: 'Add your first pack',
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
          <View style={styles.layout}>
          <ScrollView
            testID="fc-training-setup-body-scroll"
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View testID="fc-training-setup-header" style={styles.header}>
              <V2IconButton
                icon="chevron-back"
                onPress={leave}
                accessibilityLabel={triLang(lang, {
                  ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại',
                  id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
                })}
                testID="fc-training-setup-header-back"
              />
              <Text
                testID="fc-training-setup-header-title"
                accessibilityRole="header"
                style={[
                  styles.headerTitle,
                  { color: glass.text, fontSize: 20 * textScale, lineHeight: 24 * textScale },
                ]}
              >
                {copy.title}
              </Text>
            </View>

            {loadState === 'ready' && decks.length === 0 && suggestedPacks.length === 0 ? null : <View style={styles.summaryRow}>
              <Text
                testID="fc-training-setup-summary"
                accessibilityLiveRegion="polite"
                style={[styles.summary, { color: t.textPrimary, fontSize: 16 * textScale, lineHeight: 21 * textScale }]}
              >
                {selectionExplanation}
              </Text>
            </View>}

            {loadState === 'error' && loadErrorKind === 'load' && loadExhausted ? (
              <SetupSurface testID="fc-training-setup-unavailable" glass={glass} style={styles.messageBox}>
                <Text accessibilityLiveRegion="polite" style={[
                  styles.message,
                  { color: t.textPrimary, fontSize: 16 * textScale, lineHeight: 22 * textScale },
                ]}>{triLang(lang, {
                  ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now', es: 'No disponible ahora',
                  'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang',
                  tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne',
                })}</Text>
                <Pressable
                  testID="fc-training-setup-try-again"
                  accessibilityRole="button"
                  onPress={() => retryDecksLoad('tap')}
                  style={({ pressed }) => [styles.tryAgain, { backgroundColor: glass.opaqueControl }, pressed && { opacity: 0.82 }]}
                >
                  <Text style={[styles.tryAgainLabel, { color: t.textPrimary, fontSize: 16 * textScale }]}>{triLang(lang, {
                    ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo',
                    'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
                  })}</Text>
                </Pressable>
              </SetupSurface>
            ) : loadState === 'loading' || (loadState === 'error' && loadErrorKind === 'load') ? (
              <SetupSurface
                testID="fc-training-setup-loading"
                glass={glass}
                style={styles.loadingBox}
              >
                <View accessible accessibilityRole="progressbar" accessibilityLabel={triLang(lang, {
                  ru: 'Загрузка наборов', uk: 'Завантаження наборів', en: 'Loading packs', es: 'Cargando packs',
                  'pt-BR': 'Carregando pacotes', vi: 'Đang tải bộ thẻ', id: 'Memuat paket', tr: 'Paketler yükleniyor',
                  pl: 'Ładowanie zestawów',
                })} style={styles.loadingContent}>
                  {/* зачем (cards.html setupLoading, spec_learn F7): загрузка — только скелет строк, без спиннера. */}
                  <View style={styles.loadingRows}>
                    {[0, 1, 2].map((index) => (
                      <View
                        key={`loading-row-${index}`}
                        testID={`fc-training-setup-loading-row-${index}`}
                        accessible={false}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={[
                          styles.loadingRow,
                          { backgroundColor: glass.opaqueControl, borderColor: glass.glassEdge },
                        ]}
                      >
                        <View style={[styles.loadingIcon, { backgroundColor: glass.selected }]} />
                        <View style={styles.loadingCopy}>
                          <View style={[styles.loadingLineLong, { backgroundColor: glass.selected }]} />
                          <View style={[styles.loadingLineShort, { backgroundColor: glass.selected }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </SetupSurface>
            ) : loadState === 'error' ? (
              <SetupSurface testID="fc-training-setup-error" glass={glass} style={styles.messageBox}>
                <Text accessibilityLiveRegion="polite" style={[
                  styles.message,
                  { color: t.textSecond, fontSize: 16 * textScale, lineHeight: 22 * textScale },
                ]}>{loadErrorMessage}</Text>
              </SetupSurface>
            ) : decks.length === 0 ? (
              <SetupSurface testID="fc-training-setup-empty" glass={glass} style={styles.emptyBox}>
                {/*
                  зачем: с витриной сводка остаётся над карточкой и поясняет
                  состояние до списка рекомендаций. Без витрины тот же текст
                  показывается один раз внутри пустой карточки.
                */}
                {suggestedPacks.length > 0 ? (
                  <>
                    <Text style={[
                      styles.suggestHeading,
                      { color: t.textPrimary, fontSize: 16 * textScale, lineHeight: 22 * textScale },
                    ]}>{suggestHeading}</Text>
                    <View style={styles.suggestRow}>
                      {suggestedPacks.map((pack) => {
                        const opening = openingPackId === pack.id;
                        return (
                          <Pressable
                            key={`fc-setup-suggest-${pack.id}`}
                            testID={`fc-training-setup-suggest-${pack.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={packTitleForInterface(pack, contentLangForTitle) || pack.codeName || pack.id}
                            accessibilityState={{ busy: opening, disabled: openingPackId !== null }}
                            disabled={openingPackId !== null}
                            onPress={() => openSuggestedPack(pack)}
                            style={({ pressed }) => [
                              styles.suggestTile,
                              {
                                backgroundColor: glass.opaqueCard,
                                borderColor: glass.glassEdge,
                                opacity: pressed ? 0.82 : openingPackId !== null && !opening ? 0.5 : 1,
                              },
                            ]}
                          >
                            <View style={[styles.suggestIcon, { backgroundColor: glass.opaqueCard }]}>
                              {opening ? (
                                <ActivityIndicator color={glass.secondary} />
                              ) : (
                                <Ionicons name="albums-outline" size={21} color={glass.secondary} />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.suggestTitle,
                                { color: glass.text, fontSize: 13 * textScale, lineHeight: 18 * textScale },
                              ]}
                            >
                              {packTitleForInterface(pack, contentLangForTitle) || pack.codeName || pack.id}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text
                    testID="fc-training-setup-empty-message"
                    accessibilityLiveRegion="polite"
                    style={[styles.message, { color: t.textSecond, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}
                  >
                    {selectionExplanation}
                  </Text>
                )}
              </SetupSurface>
            ) : (
              <View style={styles.deckGrid}>
                {decks.map((deck, index) => {
                  const selected = selectedDeckIds.includes(deck.deckId);
                  return (
                    <DeckSelectionTile
                      key={deck.deckId}
                      deck={deck}
                      index={index}
                      selected={selected}
                      onToggle={(deckId) => setSelectedDeckIds((current) => toggleDeckSelection(current, deckId))}
                      simpleMotion={Boolean(reducedMotion)}
                      t={t}
                      f={f}
                      testIDPrefix="fc-training-setup-deck"
                      presentation="compact-liquid-glass"
                      liquidGlass={glass}
                      textScale={textScale}
                      countLabel={compactDeckCountLabel(lang, deck.count)}
                    />
                  );
                })}
              </View>
            )}

            {!blitzHasEnoughCards && summary.cardCount > 0 ? (
              <Text accessibilityLiveRegion="polite" style={[
                styles.validation,
                { color: t.wrong, fontSize: 13 * textScale, lineHeight: 18 * textScale },
              ]}>{blitzMinimumLabel}</Text>
            ) : null}
          </ScrollView>

          <ScrollView
            testID="fc-training-setup-dock-scroll"
            style={styles.dockScroll}
            contentContainerStyle={[styles.dockContent, { paddingBottom: insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <MonthlyTrainingSessionIndicator
              testID="fc-training-setup-monthly-limit"
              quota={quotaPreview}
              textColor={t.textSecond}
              mutedColor={t.wrong}
              textMetrics={{ fontSize: 13 * textScale, lineHeight: 17 * textScale }}
              style={styles.quota}
            />
            {/* зачем (PM-086): ценник энергии на кнопке убран — сам расход энергии не менялся.
                Кнопка — светлая главная кнопка стиля 2.0. */}
            <SetupAction
              testID="fc-training-setup-start"
              label={copy.start}
              disabled={!canStart}
              onPress={() => void startTraining()}
              glass={glass}
              textScale={textScale}
            />
          </ScrollView>
          </View>
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
  stateSurface: { position: 'relative', overflow: 'hidden', borderRadius: 16, borderWidth: 1 },
  surfaceSheen: { borderRadius: 16 },
  loadingBox: { minHeight: 150, marginTop: 14, padding: 14 },
  loadingContent: { width: '100%', gap: 12 },
  loadingRows: { width: '100%', gap: 10 },
  loadingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13, borderWidth: 1 },
  loadingIcon: { width: 44, height: 44, borderRadius: 12 },
  loadingCopy: { flex: 1, minWidth: 0, gap: 7 },
  loadingLineLong: { width: '72%', height: 10, borderRadius: 5 },
  loadingLineShort: { width: '44%', height: 8, borderRadius: 4 },
  messageBox: { minHeight: 150, marginTop: 14, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyBox: { minHeight: 150, marginTop: 14, paddingHorizontal: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 16 },
  suggestHeading: { textAlign: 'center', fontWeight: '900' },
  suggestRow: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestTile: { flexGrow: 1, flexBasis: 94, minWidth: 0, minHeight: 118, borderRadius: V2.radius.card, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'flex-start', gap: 9 },
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

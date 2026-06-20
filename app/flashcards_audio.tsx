import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { peekFlashcardsCache } from '../hooks/use-flashcards';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import BouncyScrollView from '../components/BouncyScrollView';
import { checkAchievements } from './achievements';
import { updateMultipleTaskProgress } from './daily_tasks';
import {
  audioTextForSide,
  buildFlashcardAudioDeck,
  estimateSpeechDurationMs,
  nextAudioPosition,
  speechLanguageForSide,
  type AudioFlashcardSide,
} from './flashcards/audioSession';
import { peekCustomCardsCache } from './flashcards/storage';
import { resolveFlashcardBackText, type CardItem } from './flashcards/types';
import {
  buildCachedTrainingSources,
  buildTrainingCardsFromSources,
  cardCountLabel,
  initialSelectionForSources,
  loadTrainingSources,
  optimisticSessionInfoForSources,
  parseRouteIdList,
  reconcileSelectedSourceIds,
  routeParamString,
  type TrainingCard,
  type TrainingSource,
} from './flashcards/trainingSources';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from './flashcards_target_gate';
import { flashcardContentLang } from './spanish_content_gate';
import { getUserSettingsSnapshot } from './user_settings_store';
import { safeRouterBack } from './navigation_back';

type Phase = 'select' | 'play' | 'done';
type PauseOption = 900 | 1500 | 2300;
type AudioCardSnapshot = { card: TrainingCard; side: AudioFlashcardSide };
type AudioCardTransition = { from: AudioCardSnapshot; to: AudioCardSnapshot; direction: 1 | -1 };
type CardRotateValue = string | Animated.AnimatedInterpolation<string | number>;

const FLIP_DURATION_MS = 300;
const SWIPE_DURATION_MS = 240;
const SWIPE_TRAVEL_MULTIPLIER = 1.16;
const DEFAULT_PAUSE_MS: PauseOption = 1500;

function cardWidthFor(windowWidth: number): number {
  return Math.min(windowWidth - 32, 520);
}

export default function FlashcardsAudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string | string[];
    filter?: string | string[];
    owned?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const topSafeInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const { width } = useWindowDimensions();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, statusBarLight, f } = useTheme();
  const { speak, stop } = useAudio();

  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  const requestedSourceId = useMemo(() => routeParamString(params.source).trim(), [params.source]);
  const requestedFilter = useMemo(() => routeParamString(params.filter).trim(), [params.filter]);
  const requestedOfficialOwnedIds = useMemo(() => parseRouteIdList(params.owned), [params.owned]);
  const visibleRequestedOfficialOwnedIds = useMemo(
    () => (officialPacksEnabled ? requestedOfficialOwnedIds : []),
    [officialPacksEnabled, requestedOfficialOwnedIds],
  );

  const initialSources = useMemo(
    () => buildCachedTrainingSources(
      lang,
      peekFlashcardsCache(studyTarget),
      peekCustomCardsCache(studyTarget),
      visibleRequestedOfficialOwnedIds,
      requestedSourceId,
      requestedFilter,
      studyTarget,
    ),
    [lang, requestedFilter, requestedSourceId, studyTarget, visibleRequestedOfficialOwnedIds],
  );
  const initialSelectedIds = useMemo(
    () => initialSelectionForSources(initialSources, requestedSourceId),
    [initialSources, requestedSourceId],
  );
  const initialInfo = useMemo(
    () => optimisticSessionInfoForSources(initialSources, initialSelectedIds),
    [initialSources, initialSelectedIds],
  );

  const [sources, setSources] = useState<TrainingSource[]>(() => initialSources);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => initialSelectedIds);
  const [loadingSources, setLoadingSources] = useState(() => initialSources.length === 0);
  const [loadError, setLoadError] = useState('');
  const [starting, setStarting] = useState(false);
  const [phase, setPhase] = useState<Phase>('select');
  const [deck, setDeck] = useState<TrainingCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [side, setSide] = useState<AudioFlashcardSide>('front');
  const [isPlaying, setIsPlaying] = useState(false);
  const [pauseMs, setPauseMs] = useState<PauseOption>(DEFAULT_PAUSE_MS);
  const [shuffle, setShuffle] = useState(false);
  const [playbackNonce, setPlaybackNonce] = useState(0);
  const [cardTransition, setCardTransition] = useState<AudioCardTransition | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const hasVisibleSourcesRef = useRef(initialSources.length > 0);
  const viewedRef = useRef<Set<string>>(new Set());
  const flippedRef = useRef<Set<string>>(new Set());
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTokenRef = useRef(0);

  const selectedSources = useMemo(
    () => sources.filter((source) => selectedIds.has(source.id)),
    [selectedIds, sources],
  );
  const selectedEstimate = useMemo(
    () => selectedSources.reduce((sum, source) => sum + Math.max(0, source.count), 0),
    [selectedSources],
  );
  const [sourceInfo, setSourceInfo] = useState(() => initialInfo);

  const text = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Автопрослушивание',
        uk: 'Автопрослуховування',
        es: 'Escucha automática',
        'pt-BR': 'Escuta automática',
        vi: 'Nghe tự động',
        id: 'Dengar otomatis',
        tr: 'Otomatik dinleme',
        pl: 'Automatyczne odsłuchiwanie',
      }),
      sets: triLang(lang, {
        ru: 'Наборы',
        uk: 'Набори',
        es: 'Packs',
        'pt-BR': 'Pacotes',
        vi: 'Bộ thẻ',
        id: 'Paket',
        tr: 'Setler',
        pl: 'Zestawy',
      }),
      pause: triLang(lang, {
        ru: 'Пауза',
        uk: 'Пауза',
        es: 'Pausa',
        'pt-BR': 'Pausa',
        vi: 'Tạm dừng',
        id: 'Jeda',
        tr: 'Duraklama',
        pl: 'Pauza',
      }),
      shuffle: triLang(lang, {
        ru: 'Перемешать',
        uk: 'Перемішати',
        es: 'Aleatorio',
        'pt-BR': 'Embaralhar',
        vi: 'Xáo trộn',
        id: 'Acak',
        tr: 'Karıştır',
        pl: 'Losowo',
      }),
      start: triLang(lang, {
        ru: 'Запустить',
        uk: 'Запустити',
        es: 'Iniciar',
        'pt-BR': 'Iniciar',
        vi: 'Bắt đầu',
        id: 'Mulai',
        tr: 'Başlat',
        pl: 'Start',
      }),
      empty: triLang(lang, {
        ru: 'Нет доступных наборов.',
        uk: 'Немає доступних наборів.',
        es: 'No hay packs disponibles.',
        'pt-BR': 'Não há pacotes disponíveis.',
        vi: 'Không có bộ thẻ nào.',
        id: 'Tidak ada paket tersedia.',
        tr: 'Kullanılabilir set yok.',
        pl: 'Brak dostępnych zestawów.',
      }),
      nothingSelected: triLang(lang, {
        ru: 'Выбери хотя бы один набор.',
        uk: 'Вибери хоча б один набір.',
        es: 'Elige al menos un pack.',
        'pt-BR': 'Escolha pelo menos um pacote.',
        vi: 'Chọn ít nhất một bộ thẻ.',
        id: 'Pilih minimal satu paket.',
        tr: 'En az bir set seç.',
        pl: 'Wybierz co najmniej jeden zestaw.',
      }),
      noCards: triLang(lang, {
        ru: 'В выбранных наборах нет карточек для озвучки.',
        uk: 'У вибраних наборах немає карток для озвучення.',
        es: 'No hay tarjetas reproducibles en los packs elegidos.',
        'pt-BR': 'Não há cartões reproduzíveis nos pacotes escolhidos.',
        vi: 'Không có thẻ phát được trong các bộ đã chọn.',
        id: 'Tidak ada kartu yang bisa diputar.',
        tr: 'Seçilen setlerde seslendirilecek kart yok.',
        pl: 'W wybranych zestawach nie ma fiszek do odsłuchania.',
      }),
      loading: triLang(lang, {
        ru: '...',
        uk: '...',
        es: '...',
        'pt-BR': '...',
        vi: '...',
        id: '...',
        tr: '...',
        pl: '...',
      }),
      reload: triLang(lang, {
        ru: 'Обновить',
        uk: 'Оновити',
        es: 'Actualizar',
        'pt-BR': 'Atualizar',
        vi: 'Cập nhật',
        id: 'Perbarui',
        tr: 'Yenile',
        pl: 'Odśwież',
      }),
      front: triLang(lang, {
        ru: 'Лицевая сторона',
        uk: 'Лицьова сторона',
        es: 'Frente',
        'pt-BR': 'Frente',
        vi: 'Mặt trước',
        id: 'Sisi depan',
        tr: 'Ön yüz',
        pl: 'Przód',
      }),
      back: triLang(lang, {
        ru: 'Оборот',
        uk: 'Зворот',
        es: 'Reverso',
        'pt-BR': 'Verso',
        vi: 'Mặt sau',
        id: 'Sisi belakang',
        tr: 'Arka yüz',
        pl: 'Tył',
      }),
      done: triLang(lang, {
        ru: 'Готово',
        uk: 'Готово',
        es: 'Listo',
        'pt-BR': 'Pronto',
        vi: 'Xong',
        id: 'Selesai',
        tr: 'Bitti',
        pl: 'Gotowe',
      }),
      again: triLang(lang, {
        ru: 'Ещё раз',
        uk: 'Ще раз',
        es: 'Otra vez',
        'pt-BR': 'De novo',
        vi: 'Nghe lại',
        id: 'Ulangi',
        tr: 'Tekrar',
        pl: 'Jeszcze raz',
      }),
      settings: triLang(lang, {
        ru: 'Настроить',
        uk: 'Налаштувати',
        es: 'Ajustar',
        'pt-BR': 'Ajustar',
        vi: 'Điều chỉnh',
        id: 'Atur',
        tr: 'Ayarla',
        pl: 'Ustaw',
      }),
      selected: triLang(lang, {
        ru: 'выбрано',
        uk: 'вибрано',
        es: 'seleccionadas',
        'pt-BR': 'selecionados',
        vi: 'đã chọn',
        id: 'dipilih',
        tr: 'seçili',
        pl: 'wybrano',
      }),
    }),
    [lang],
  );

  const clearPlaybackTimers = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    fallbackTimerRef.current = null;
    pauseTimerRef.current = null;
  }, []);

  const stopPlaybackNow = useCallback(() => {
    runTokenRef.current += 1;
    clearPlaybackTimers();
    stop();
  }, [clearPlaybackTimers, stop]);

  const loadSources = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingSources(true);
    setLoadError('');
    try {
      const next = await loadTrainingSources({
        lang,
        studyTarget,
        officialPacksEnabled,
        communityPacksEnabled,
        requestedSourceId,
        requestedFilter,
      });
      hasVisibleSourcesRef.current = next.length > 0;
      setSources(next);
      setSelectedIds((current) => reconcileSelectedSourceIds(current, next, requestedSourceId));
    } catch {
      setLoadError(text.empty);
    } finally {
      setLoadingSources(false);
    }
  }, [
    communityPacksEnabled,
    lang,
    officialPacksEnabled,
    requestedFilter,
    requestedSourceId,
    studyTarget,
    text.empty,
  ]);

  useEffect(() => {
    void loadSources(hasVisibleSourcesRef.current);
  }, [loadSources]);

  useEffect(() => {
    let cancelled = false;
    const answerFor = (card: CardItem) => resolveFlashcardBackText(card, cardContentLang);
    void buildTrainingCardsFromSources(selectedSources, answerFor).then((cards) => {
      if (cancelled) return;
      setSourceInfo({
        ...optimisticSessionInfoForSources(selectedSources, selectedIds),
        totalPool: Math.max(cards.length, selectedEstimate),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [cardContentLang, selectedEstimate, selectedIds, selectedSources]);

  useEffect(() => {
    return () => stopPlaybackNow();
  }, [stopPlaybackNow]);

  const currentCard = phase === 'play' || phase === 'done' ? deck[cardIndex] : undefined;
  const progress = deck.length > 0 ? (cardIndex + (side === 'back' ? 1 : 0.35)) / deck.length : 0;
  const swipeDistance = cardWidthFor(width) * SWIPE_TRAVEL_MULTIPLIER;
  const transitionDirection = cardTransition?.direction ?? 1;
  const outgoingCardTranslateX = swipeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -transitionDirection * swipeDistance],
  });
  const incomingCardTranslateX = swipeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [transitionDirection * swipeDistance, 0],
  });
  const outgoingCardOpacity = swipeAnim.interpolate({
    inputRange: [0, 0.88, 1],
    outputRange: [1, 0.94, 0],
  });
  const incomingCardOpacity = swipeAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.9, 1, 1],
  });

  const registerViewed = useCallback((card: TrainingCard) => {
    if (viewedRef.current.has(card.trainingKey)) return;
    viewedRef.current.add(card.trainingKey);
    updateMultipleTaskProgress([{ type: 'flashcard_view', increment: 1 }], { studyTarget }).catch(() => {});
    checkAchievements({ type: 'flashcard_viewed', count: 1, studyTarget }).catch(() => {});
  }, [studyTarget]);

  const registerFlipped = useCallback((card: TrainingCard) => {
    if (flippedRef.current.has(card.trainingKey)) return;
    flippedRef.current.add(card.trainingKey);
    updateMultipleTaskProgress([{ type: 'flashcard_flip', increment: 1 }], { studyTarget }).catch(() => {});
    checkAchievements({ type: 'flashcard_flipped', count: 1, studyTarget }).catch(() => {});
  }, [studyTarget]);

  useEffect(() => {
    if (phase === 'play' && currentCard) registerViewed(currentCard);
  }, [currentCard, phase, registerViewed]);

  const resetCardTransition = useCallback(() => {
    swipeAnim.stopAnimation(() => {
      swipeAnim.setValue(0);
    });
    setCardTransition(null);
  }, [swipeAnim]);

  const commitPosition = useCallback((index: number, nextSide: AudioFlashcardSide, play = true) => {
    setCardIndex(index);
    setSide(nextSide);
    flipAnim.setValue(nextSide === 'back' ? 1 : 0);
    swipeAnim.setValue(0);
    setCardTransition(null);
    setIsPlaying(play);
    setPlaybackNonce((value) => value + 1);
  }, [flipAnim, swipeAnim]);

  const animateCardReplacement = useCallback(
    (index: number, nextSide: AudioFlashcardSide, play = true, guardToken?: number) => {
      const targetCard = deck[index];
      if (!currentCard || !targetCard || index === cardIndex) {
        commitPosition(index, nextSide, play);
        return;
      }

      const direction: 1 | -1 = index > cardIndex ? 1 : -1;
      swipeAnim.stopAnimation(() => {
        swipeAnim.setValue(0);
        setCardTransition({
          from: { card: currentCard, side },
          to: { card: targetCard, side: nextSide },
          direction,
        });
        Animated.timing(swipeAnim, {
          toValue: 1,
          duration: SWIPE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          if (guardToken !== undefined && runTokenRef.current !== guardToken) return;
          commitPosition(index, nextSide, play);
        });
      });
    },
    [cardIndex, commitPosition, currentCard, deck, side, swipeAnim],
  );

  const finishSession = useCallback(() => {
    stopPlaybackNow();
    resetCardTransition();
    setIsPlaying(false);
    setPhase('done');
    void hapticSuccess();
  }, [resetCardTransition, stopPlaybackNow]);

  const goToPosition = useCallback((index: number, nextSide: AudioFlashcardSide, play = true) => {
    stopPlaybackNow();
    if (index !== cardIndex && currentCard && deck[index]) {
      setIsPlaying(false);
      animateCardReplacement(index, nextSide, play);
      return;
    }
    resetCardTransition();
    commitPosition(index, nextSide, play);
  }, [
    animateCardReplacement,
    cardIndex,
    commitPosition,
    currentCard,
    deck,
    resetCardTransition,
    stopPlaybackNow,
  ]);

  const goToNextCard = useCallback(() => {
    if (deck.length === 0) return;
    const nextIndex = cardIndex + 1;
    if (nextIndex >= deck.length) {
      finishSession();
      return;
    }
    void hapticTap();
    goToPosition(nextIndex, 'front', true);
  }, [cardIndex, deck.length, finishSession, goToPosition]);

  const goToPreviousCard = useCallback(() => {
    if (deck.length === 0) return;
    void hapticTap();
    goToPosition(Math.max(0, cardIndex - 1), 'front', true);
  }, [cardIndex, deck.length, goToPosition]);

  useEffect(() => {
    if (phase !== 'play' || !isPlaying || !currentCard) return;
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    clearPlaybackTimers();

    let settled = false;
    const textForSpeech = audioTextForSide(currentCard, side, cardContentLang);
    const language = speechLanguageForSide(currentCard, side, cardContentLang, studyTarget);
    const settings = getUserSettingsSnapshot();
    const settle = () => {
      if (settled || runTokenRef.current !== token) return;
      settled = true;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
      pauseTimerRef.current = setTimeout(() => {
        if (runTokenRef.current !== token) return;
        const next = nextAudioPosition({ index: cardIndex, side }, deck.length);
        if (!next) {
          finishSession();
          return;
        }
        if (next.side === 'back') {
          registerFlipped(currentCard);
          Animated.timing(flipAnim, {
            toValue: 1,
            duration: FLIP_DURATION_MS,
            useNativeDriver: true,
          }).start(() => {
            if (runTokenRef.current === token) setSide('back');
          });
        } else {
          animateCardReplacement(next.index, 'front', true, token);
        }
      }, pauseMs);
    };

    if (!textForSpeech) {
      settle();
      return () => {
        settled = true;
        clearPlaybackTimers();
      };
    }

    speak(textForSpeech, settings.speechRate, {
      language,
      onDone: settle,
      onError: settle,
    });
    fallbackTimerRef.current = setTimeout(
      settle,
      estimateSpeechDurationMs(textForSpeech, settings.speechRate) + 900,
    );

    return () => {
      settled = true;
      clearPlaybackTimers();
      stop();
    };
  }, [
    cardContentLang,
    cardIndex,
    animateCardReplacement,
    clearPlaybackTimers,
    currentCard,
    deck.length,
    finishSession,
    flipAnim,
    isPlaying,
    pauseMs,
    phase,
    playbackNonce,
    registerFlipped,
    side,
    speak,
    stop,
    studyTarget,
  ]);

  const toggleSource = useCallback((sourceId: string) => {
    void hapticTap();
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const startSession = useCallback(async () => {
    if (selectedSources.length === 0) {
      setLoadError(text.nothingSelected);
      void hapticError();
      return;
    }
    setStarting(true);
    setLoadError('');
    try {
      const answerFor = (card: CardItem) => resolveFlashcardBackText(card, cardContentLang);
      const cards = await buildTrainingCardsFromSources(selectedSources, answerFor);
      const nextDeck = buildFlashcardAudioDeck(cards, {
        contentLang: cardContentLang,
        shuffle,
      });
      if (nextDeck.length === 0) {
        setLoadError(text.noCards);
        void hapticError();
        return;
      }
      viewedRef.current = new Set();
      flippedRef.current = new Set();
      stopPlaybackNow();
      resetCardTransition();
      setDeck(nextDeck);
      setCardIndex(0);
      setSide('front');
      flipAnim.setValue(0);
      setPhase('play');
      setIsPlaying(true);
      setPlaybackNonce((value) => value + 1);
      void hapticSuccess();
    } catch {
      setLoadError(text.noCards);
      void hapticError();
    } finally {
      setStarting(false);
    }
  }, [
    cardContentLang,
    flipAnim,
    resetCardTransition,
    selectedSources,
    shuffle,
    stopPlaybackNow,
    text.noCards,
    text.nothingSelected,
  ]);

  const pausePlayback = useCallback(() => {
    void hapticTap();
    stopPlaybackNow();
    resetCardTransition();
    setIsPlaying(false);
  }, [resetCardTransition, stopPlaybackNow]);

  const resumePlayback = useCallback(() => {
    void hapticTap();
    setIsPlaying(true);
    setPlaybackNonce((value) => value + 1);
  }, []);

  const replayCurrentSide = useCallback(() => {
    void hapticTap();
    stopPlaybackNow();
    resetCardTransition();
    setIsPlaying(true);
    setPlaybackNonce((value) => value + 1);
  }, [resetCardTransition, stopPlaybackNow]);

  const backToSetup = useCallback(() => {
    void hapticTap();
    stopPlaybackNow();
    resetCardTransition();
    setIsPlaying(false);
    setPhase('select');
  }, [resetCardTransition, stopPlaybackNow]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const cardWidth = cardWidthFor(width);
  const cardHeight = Math.max(260, Math.min(360, cardWidth * 0.74));

  const renderHeader = (onBack: () => void) => (
    <View style={[styles.header, { borderBottomColor: t.border, paddingTop: topSafeInset + 8 }]}>
      <View style={styles.headerSide}>
        <TapScale
          testID="flashcards-audio-header-back"
          accessibilityLabel="qa-flashcards-audio-header-back"
          accessible
          onPress={onBack}
          style={styles.headerIcon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TapScale>
      </View>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
        {text.title}
      </Text>
      <View style={[styles.headerSide, styles.headerSideRight]}>
        <ReportErrorButton
          screen="flashcards_audio"
          dataId={`flashcards_audio_${phase}`}
          dataText={`Flashcards audio screen · phase=${phase}`}
          variant="icon-flag"
          accessibilityLabel="qa-flashcards-audio-report"
          testID="flashcards-audio-report"
          style={styles.headerReport}
        />
        <TouchableOpacity
          testID="flashcards-audio-refresh"
          accessibilityLabel="qa-flashcards-audio-refresh"
          accessible
          onPress={() => void loadSources(false)}
          style={styles.headerIcon}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="refresh" size={22} color={t.textSecond} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const pauseOptions: PauseOption[] = [900, 1500, 2300];

  const renderSelect = () => (
    <>
      {renderHeader(() => safeRouterBack(router, '/flashcards' as any))}
      <BouncyScrollView
        style={styles.scroll}
        decelerationRate="normal"
        contentContainerStyle={[styles.selectContent, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: t.accent }]}>
              <Ionicons name="headset-outline" size={24} color={t.correctText} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryTitle, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>
                {cardCountLabel(lang, sourceInfo.totalPool || selectedEstimate)}
              </Text>
              <Text style={[styles.summaryMeta, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
                {selectedIds.size} {text.selected}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                void hapticTap();
                setShuffle((value) => !value);
              }}
              activeOpacity={0.82}
              style={[
                styles.shuffleButton,
                {
                  borderColor: shuffle ? t.accent : t.border,
                  backgroundColor: shuffle ? `${t.accent}22` : t.bgSurface,
                },
              ]}
            >
              <Ionicons name="shuffle" size={16} color={shuffle ? t.accent : t.textSecond} />
              <Text style={{ color: shuffle ? t.accent : t.textSecond, fontSize: f.caption, fontWeight: '800' }} numberOfLines={1}>
                {text.shuffle}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pauseRow}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{text.pause}</Text>
            <View style={styles.pauseChips}>
              {pauseOptions.map((option) => {
                const active = pauseMs === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      void hapticTap();
                      setPauseMs(option);
                    }}
                    style={[
                      styles.pauseChip,
                      {
                        borderColor: active ? t.accent : t.border,
                        backgroundColor: active ? t.accent : t.bgSurface,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? t.correctText : t.textSecond, fontSize: f.caption, fontWeight: '900' }}>
                      {(option / 1000).toFixed(option === 1500 ? 1 : 0)}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: t.textPrimary, fontSize: f.h3 }]}>{text.sets}</Text>

        {loadingSources && sources.length === 0 ? (
          <View style={[styles.emptyPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>{text.loading}</Text>
          </View>
        ) : null}

        {!loadingSources && sources.length === 0 ? (
          <View style={[styles.emptyPanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>{loadError || text.empty}</Text>
            <TapScale onPress={() => void loadSources(false)} style={[styles.secondaryButton, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
              <Ionicons name="refresh" size={18} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800' }}>{text.reload}</Text>
            </TapScale>
          </View>
        ) : null}

        {sources.map((source) => {
          const selected = selectedIds.has(source.id);
          return (
            <TouchableOpacity
              key={source.id}
              onPress={() => toggleSource(source.id)}
              activeOpacity={0.86}
              style={[
                styles.sourceRow,
                {
                  backgroundColor: selected ? `${source.accent}18` : t.bgCard,
                  borderColor: selected ? source.accent : t.border,
                },
              ]}
            >
              <View style={[styles.sourceIcon, { backgroundColor: `${source.accent}24` }]}>
                <Ionicons name={source.icon} size={21} color={source.accent} />
              </View>
              <View style={styles.sourceCopy}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }} numberOfLines={1}>
                  {source.title}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }} numberOfLines={1}>
                  {source.subtitle} · {cardCountLabel(lang, source.count)}
                </Text>
              </View>
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? source.accent : t.textGhost} />
            </TouchableOpacity>
          );
        })}

        {loadError && sources.length > 0 ? (
          <Text style={[styles.errorText, { color: t.wrong, fontSize: f.caption }]}>{loadError}</Text>
        ) : null}
      </BouncyScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.bgPrimary, borderTopColor: t.border }]}>
        <TouchableOpacity
          testID="flashcards-audio-start"
          accessibilityLabel="qa-flashcards-audio-start"
          accessible
          onPress={() => void startSession()}
          disabled={starting || selectedSources.length === 0}
          activeOpacity={0.88}
          style={[
            styles.primaryButton,
            {
              backgroundColor: selectedSources.length === 0 ? t.bgSurface2 : t.accent,
              opacity: starting ? 0.72 : 1,
            },
          ]}
        >
          <Ionicons name="play" size={20} color={selectedSources.length === 0 ? t.textGhost : t.correctText} />
          <Text style={{ color: selectedSources.length === 0 ? t.textGhost : t.correctText, fontSize: f.bodyLg, fontWeight: '900' }}>
            {starting ? text.loading : text.start}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPlayer = () => {
    const renderCardLayer = (
      frame: AudioCardSnapshot,
      frontFaceRotate: CardRotateValue,
      backFaceRotate: CardRotateValue,
    ) => {
      const frontText = audioTextForSide(frame.card, 'front', cardContentLang);
      const backText = audioTextForSide(frame.card, 'back', cardContentLang);

      return (
        <>
          <Animated.View
            style={[
              styles.cardFace,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                transform: [{ perspective: 900 }, { rotateY: frontFaceRotate }],
              },
            ]}
          >
            <Text style={[styles.sideLabel, { color: t.textSecond, fontSize: f.caption }]}>{text.front}</Text>
            <Text
              style={[styles.cardText, { color: t.textPrimary, fontSize: Math.min(31, f.numLg + 1) }]}
              numberOfLines={5}
            >
              {frontText}
            </Text>
            <Text style={[styles.sourceLabel, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
              {frame.card.trainingSourceTitle ?? ''}
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardFaceBack,
              {
                backgroundColor: t.bgCard,
                borderColor: t.border,
                transform: [{ perspective: 900 }, { rotateY: backFaceRotate }],
              },
            ]}
          >
            <Text style={[styles.sideLabel, { color: t.textSecond, fontSize: f.caption }]}>{text.back}</Text>
            <Text
              style={[styles.cardText, { color: t.textPrimary, fontSize: Math.min(30, f.numLg) }]}
              numberOfLines={5}
            >
              {backText}
            </Text>
            <Text style={[styles.sourceLabel, { color: t.textMuted, fontSize: f.caption }]} numberOfLines={1}>
              {frame.card.trainingSourceTitle ?? ''}
            </Text>
          </Animated.View>
        </>
      );
    };

    return (
      <>
        {renderHeader(backToSetup)}
        <View style={[styles.player, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.progressFill, { backgroundColor: t.accent, width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
              {Math.min(cardIndex + 1, deck.length)} / {deck.length}
            </Text>
          </View>

          <View style={styles.cardSlot}>
            <View style={[styles.cardStage, { width: cardWidth, height: cardHeight }]}>
              {cardTransition ? (
                <>
                  <Animated.View
                    style={[
                      styles.cardLayer,
                      {
                        opacity: outgoingCardOpacity,
                        transform: [{ translateX: outgoingCardTranslateX }],
                      },
                    ]}
                  >
                    {renderCardLayer(
                      cardTransition.from,
                      cardTransition.from.side === 'back' ? '180deg' : '0deg',
                      cardTransition.from.side === 'back' ? '360deg' : '180deg',
                    )}
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.cardLayer,
                      {
                        opacity: incomingCardOpacity,
                        transform: [{ translateX: incomingCardTranslateX }],
                      },
                    ]}
                  >
                    {renderCardLayer(
                      cardTransition.to,
                      cardTransition.to.side === 'back' ? '180deg' : '0deg',
                      cardTransition.to.side === 'back' ? '360deg' : '180deg',
                    )}
                  </Animated.View>
                </>
              ) : currentCard ? (
                <Animated.View style={styles.cardLayer}>
                  {renderCardLayer({ card: currentCard, side }, frontRotate, backRotate)}
                </Animated.View>
              ) : null}
            </View>
          </View>

          <View style={styles.controlRow}>
            <TapScale onPress={goToPreviousCard} disabled={cardIndex === 0} style={[styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border, opacity: cardIndex === 0 ? 0.45 : 1 }]}>
              <Ionicons name="play-skip-back" size={20} color={t.textSecond} />
            </TapScale>
            <TapScale onPress={replayCurrentSide} style={[styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
              <Ionicons name="refresh" size={21} color={t.textSecond} />
            </TapScale>
            <TapScale
              testID="flashcards-audio-play-pause"
              accessibilityLabel="qa-flashcards-audio-play-pause"
              accessible
              onPress={isPlaying ? pausePlayback : resumePlayback}
              style={[styles.playButton, { backgroundColor: t.accent }]}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={t.correctText} />
            </TapScale>
            <TapScale onPress={goToNextCard} style={[styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
              <Ionicons name="play-skip-forward" size={20} color={t.textSecond} />
            </TapScale>
            <TapScale onPress={backToSetup} style={[styles.iconButton, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
              <Ionicons name="stop" size={21} color={t.textSecond} />
            </TapScale>
          </View>
        </View>
      </>
    );
  };

  const renderDone = () => (
    <>
      {renderHeader(backToSetup)}
      <View style={[styles.doneWrap, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={[styles.donePanel, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={[styles.doneIcon, { backgroundColor: t.correctBg }]}>
            <Ionicons name="checkmark-circle" size={46} color={t.correct} />
          </View>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>{text.done}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{cardCountLabel(lang, deck.length)}</Text>
          <View style={styles.doneButtons}>
            <TapScale onPress={() => void startSession()} style={[styles.doneButton, { backgroundColor: t.accent }]}>
              <Ionicons name="play" size={18} color={t.correctText} />
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{text.again}</Text>
            </TapScale>
            <TapScale onPress={backToSetup} style={[styles.doneButton, { backgroundColor: t.bgSurface, borderColor: t.border, borderWidth: 1 }]}>
              <Ionicons name="options-outline" size={18} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '900' }}>{text.settings}</Text>
            </TapScale>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={[styles.container, { backgroundColor: 'transparent' }]}>
            {phase === 'select' ? renderSelect() : phase === 'play' ? renderPlayer() : renderDone()}
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    minHeight: 56,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  headerSide: {
    width: 86,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSideRight: {
    justifyContent: 'flex-end',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerReport: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  selectContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  summaryPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    fontWeight: '900',
  },
  summaryMeta: {
    marginTop: 2,
    fontWeight: '700',
  },
  shuffleButton: {
    minHeight: 36,
    maxWidth: 132,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pauseChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseChip: {
    minWidth: 52,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 2,
    fontWeight: '900',
  },
  emptyPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceRow: {
    minHeight: 66,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  sourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
  },
  errorText: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 0.5,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  player: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  progressWrap: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  cardStage: {
    alignSelf: 'center',
  },
  cardLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  cardSlot: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  cardFaceBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sideLabel: {
    position: 'absolute',
    top: 18,
    left: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sourceLabel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    textAlign: 'center',
    fontWeight: '800',
  },
  cardText: {
    width: '100%',
    textAlign: 'center',
    fontWeight: '900',
    lineHeight: 38,
  },
  controlRow: {
    width: '100%',
    maxWidth: 420,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneWrap: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePanel: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  doneIcon: {
    width: 78,
    height: 78,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtons: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  doneButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});

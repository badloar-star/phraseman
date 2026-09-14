import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import EnergyCostBadge from '../components/EnergyCostBadge';
import ScreenGradient from '../components/ScreenGradient';
import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import { triLang } from '../constants/i18n';
import { canStartBlitz } from './flashcards/blitz_logic';
import { trainingSetupExplanation } from './flashcards/training_setup_explanation';
import { loadFcDeckOptions, peekFcDeckOptions, sameDeckOptions } from './flashcards/deck_options';
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
import { stageCommunityPackCardsForNavigation } from './community_packs/staging';
import { packTitleForInterface, type FlashcardMarketPack } from './flashcards/marketplace';
import { useStudyTarget } from '../components/StudyTargetContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { actionToastTri, emitAppEvent } from './events';
import { hapticTap } from '../hooks/use-haptics';
import { useFlashcardTrainingQuotaPreview } from '../hooks/useFlashcardTrainingQuotaPreview';
import { isSpeakingEnabled } from './remote_flags';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';

type LoadState = 'loading' | 'ready' | 'error';
type LoadErrorKind = 'invalid' | 'unavailable' | 'load' | null;

function presetModeFor(mode: CardsTrainingMode): FcPresetMode {
  if (mode === 'blitz') return fcTrainOptionPresetMode('blitz');
  if (mode === 'speaking') return fcTrainOptionPresetMode('speak');
  return fcTrainOptionPresetMode('train');
}

export default function FlashcardsTrainingSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = useMemo(() => parseCardsTrainingMode(params.mode), [params.mode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, statusBarLight } = useTheme();
  const reducedMotion = useReducedMotion();
  const { accessResolved } = usePremium();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  const paywallRedirectedRef = useRef(false);
  /**
   * зачем (владелец: «открывая раздел тренировки, экран отметить наборы моргает»):
   * первый кадр берём из тёплого снимка, если он есть, — тогда список виден сразу
   * и не сменяется со спиннера. Снимка нет (первый заход) — честно грузим.
   */
  const warmDecks = useMemo(
    () => (mode ? peekFcDeckOptions(presetModeFor(mode), lang, studyTarget) : null),
    [lang, mode, studyTarget],
  );
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

  useEffect(() => {
    if (quotaPreview.status !== 'exhausted' || paywallRedirectedRef.current) return;
    paywallRedirectedRef.current = true;
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/premium_modal',
      params: { context: 'flashcard_training', source: 'flashcards_training_setup_direct' },
    } as never);
  }, [quotaPreview.status, router]);
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

  const loadErrorLabel = triLang(lang, {
    ru: 'Не удалось загрузить наборы. Проверьте интернет и попробуйте ещё раз.',
    uk: 'Не вдалося завантажити набори. Перевірте інтернет і спробуйте ще раз.',
    en: 'Could not load the packs. Check your connection and try again.',
    es: 'No se pudieron cargar los packs. Comprueba tu conexión e inténtalo de nuevo.',
    'pt-BR': 'Não foi possível carregar os pacotes. Verifique a conexão e tente novamente.',
    vi: 'Không thể tải bộ thẻ. Hãy kiểm tra kết nối và thử lại.',
    id: 'Paket tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
    tr: 'Paketler yüklenemedi. Bağlantını kontrol edip yeniden dene.',
    pl: 'Nie udało się wczytać zestawów. Sprawdź połączenie i spróbuj ponownie.',
  });
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
    if (mode === 'speaking' && !isSpeakingEnabled()) {
      setDecks([]);
      setSelectedDeckIds([]);
      setLoadErrorKind('unavailable');
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
        getLastPreset(presetMode).catch(() => null),
      ]);
      const eligible = loaded.filter((deck) => deck.count > 0);
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
      setDecks([]);
      setSelectedDeckIds([]);
      setLoadErrorKind('load');
      setLoadState('error');
    }
  }, [lang, mode, studyTarget]);

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
      const cards = await stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack)
        .catch((e) => {
          console.warn('[FC-TRAIN-SETUP] stage pack failed', pack.id, String((e as Error)?.message ?? e));
          return [] as unknown[];
        });
      if (openingPackRef.current !== pack.id) return;
      openingPackRef.current = null;
      setOpeningPackId(null);
      if (cards.length === 0) {
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
          uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
          es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
        }));
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

  const retryLabel = triLang(lang, {
    ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar novamente',
    vi: 'Thử lại', id: 'Coba lagi', tr: 'Yeniden dene', pl: 'Spróbuj ponownie',
  });
  const emptyLabel = triLang(lang, {
    ru: 'Пока нет карточек для тренировки. Сохрани карточки или добавь набор из сообщества.', uk: 'Поки немає карток для тренування. Збережи картки або додай набір зі спільноти.',
    en: 'No cards to practise yet. Save cards or add a community pack.', es: 'Aún no hay tarjetas para practicar. Guarda tarjetas o añade un pack de la comunidad.',
    'pt-BR': 'Ainda não há cartões para praticar. Salve cartões ou adicione um pacote da comunidade.', vi: 'Chưa có thẻ để luyện tập. Hãy lưu thẻ hoặc thêm bộ thẻ cộng đồng.',
    id: 'Belum ada kartu untuk latihan. Simpan kartu atau tambahkan paket komunitas.', tr: 'Henüz çalışacak kart yok. Kart kaydet veya topluluktan bir paket ekle.',
    pl: 'Nie ma jeszcze kart do ćwiczeń. Zapisz karty lub dodaj zestaw społeczności.',
  });
  const selectionExplanation = trainingSetupExplanation(loadState, decks.length, deckSelectionLabel(lang, summary), {
    empty: emptyLabel,
    loading: triLang(lang, { ru: 'Загружаем наборы…', uk: 'Завантажуємо набори…', en: 'Loading packs…', es: 'Cargando packs…', 'pt-BR': 'Carregando pacotes…', vi: 'Đang tải bộ thẻ…', id: 'Memuat paket…', tr: 'Paketler yükleniyor…', pl: 'Ładowanie zestawów…' }),
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
  const loadErrorMessage = loadErrorKind === 'invalid' || loadErrorKind === 'unavailable'
    ? modeUnavailableLabel
    : loadErrorLabel;
  const blitzMinimumLabel = triLang(lang, {
    ru: 'Для блица нужно минимум 4 карточки.', uk: 'Для бліцу потрібно щонайменше 4 картки.',
    en: 'Blitz needs at least 4 cards.', es: 'Blitz necesita al menos 4 tarjetas.',
    'pt-BR': 'O Blitz precisa de pelo menos 4 cartões.', vi: 'Blitz cần ít nhất 4 thẻ.',
    id: 'Blitz memerlukan setidaknya 4 kartu.', tr: 'Blitz için en az 4 kart gerekir.',
    pl: 'Blitz wymaga co najmniej 4 kart.',
  });

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại',
              id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })} onPress={leave} style={[styles.backButton, { backgroundColor: t.bgSurface }]}>
              <Ionicons name="arrow-back" size={23} color={t.textPrimary} />
            </Pressable>
            <Text accessibilityRole="header" style={[
              styles.title,
              { color: t.textPrimary, fontSize: Math.max(24, Math.round(f.h1 * 1.1)) },
            ]}>{copy.title}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <Text accessibilityLiveRegion="polite" style={[
                styles.summary,
                { color: t.textPrimary, fontSize: f.sub },
              ]}>
                {selectionExplanation}
              </Text>
            </View>

            {loadState === 'loading' ? (
              <View accessible accessibilityRole="progressbar" accessibilityLabel={triLang(lang, {
                ru: 'Загрузка наборов', uk: 'Завантаження наборів', en: 'Loading packs', es: 'Cargando packs',
                'pt-BR': 'Carregando pacotes', vi: 'Đang tải bộ thẻ', id: 'Memuat paket', tr: 'Paketler yükleniyor',
                pl: 'Ładowanie zestawów',
              })} style={styles.loadingBox}>
                <ActivityIndicator color={t.accent} />
              </View>
            ) : loadState === 'error' ? (
              <View style={[styles.messageBox, { backgroundColor: t.bgSurface }]}>
                <Text accessibilityLiveRegion="polite" style={[
                  styles.message,
                  { color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.45) },
                ]}>{loadErrorMessage}</Text>
                {loadErrorKind === 'load' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={() => setLoadRevision((value) => value + 1)} style={[styles.retryButton, { backgroundColor: t.accent }]}>
                    <Text style={[styles.retryText, { color: t.correctText, fontSize: f.body }]}>{retryLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : decks.length === 0 ? (
              <View style={styles.emptyBox}>
                {/*
                  зачем: строка-сводка выше уже говорит это — второй раз тот
                  же текст был бы дублем. Витрина есть — показываем её, нет —
                  единственное сообщение остаётся в сводке.
                */}
                {suggestedPacks.length > 0 ? (
                  <>
                    <Text style={[
                      styles.suggestHeading,
                      { color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.25) },
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
                                backgroundColor: t.bgSurface,
                                opacity: pressed ? 0.82 : openingPackId !== null && !opening ? 0.5 : 1,
                              },
                            ]}
                          >
                            <View style={[styles.suggestIcon, { backgroundColor: `${t.accent}1F` }]}>
                              {opening ? (
                                <ActivityIndicator color={t.accent} />
                              ) : (
                                <Ionicons name="albums-outline" size={21} color={t.accent} />
                              )}
                            </View>
                            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- compact source tile has fixed geometry; the full pack title is exposed by the parent accessibilityLabel */}
                            <Text
                              numberOfLines={2}
                              style={[styles.suggestTitle, { color: t.textPrimary, fontSize: f.caption }]}
                            >
                              {packTitleForInterface(pack, contentLangForTitle) || pack.codeName || pack.id}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </View>
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
                    />
                  );
                })}
              </View>
            )}

            {!blitzHasEnoughCards && summary.cardCount > 0 ? (
              <Text accessibilityLiveRegion="polite" style={[
                styles.validation,
                { color: t.wrong, fontSize: f.sub },
              ]}>{blitzMinimumLabel}</Text>
            ) : null}
            <Pressable
              testID="fc-training-setup-start"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canStart }}
              disabled={!canStart}
              onPress={() => void startTraining()}
              style={[styles.startButton, { backgroundColor: t.accent, opacity: canStart ? 1 : 0.38 }]}
            >
              <Text style={[styles.startText, { color: t.correctText, fontSize: f.bodyLg }]}>{copy.start}</Text>
              {canStart ? <EnergyCostBadge activity="flashcards" testID="fc-training-setup-energy-cost" /> : null}
            </Pressable>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
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
  header: { minHeight: 62, paddingHorizontal: 16, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 11 },
  backButton: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '900' },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  summaryRow: { minHeight: 44, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  summary: { flex: 1, fontWeight: '800' },
  loadingBox: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  messageBox: { minHeight: 150, borderRadius: 18, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyBox: { minHeight: 150, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 16 },
  suggestHeading: { textAlign: 'center', fontWeight: '900' },
  suggestRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  suggestTile: { flex: 1, minHeight: 118, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'flex-start', gap: 9 },
  suggestIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  suggestTitle: { textAlign: 'center', fontWeight: '800' },
  message: { textAlign: 'center', fontWeight: '600' },
  retryButton: { minHeight: 48, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontWeight: '900' },
  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  validation: { marginTop: 10, textAlign: 'center', fontWeight: '700' },
  startButton: { minHeight: 52, marginTop: 14, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  startText: { textAlign: 'center', fontWeight: '900' },
});

import { customCardLocalizationForLang } from './flashcards/custom_card_localization';
// cards-2.0 (E7): отдельный экран create/edit кастомной карточки.
// Роуты: /flashcards_card_editor?create=1&cat=custom — создание;
//        /flashcards_card_editor?id=<cardId>        — редактирование (закрывает баг 8).
//
// ⚠ Языковой инвариант handleSave (перенесён из flashcards_collection 1:1):
// каждое поле хранит ТОЛЬКО свой язык. Редактируем в UK — обновляется только `uk`,
// `ru`/`es` берутся из существующей карточки; аналогично для RU и ES.
// Запись — только через очередь `flashcards/custom_cards_store.ts`.
import Ionicons from '@expo/vector-icons/Ionicons';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useFeatureAccess, usePremium } from '../components/PremiumContext';
import { trackEvent } from './analytics';
import { creatorPaywallContext, shouldGateCreator } from './creator_access';
import SkeletonBlock from '../components/SkeletonShimmer';
import { animateNextLayoutTransition } from './smooth_layout';
import {
  CardsGlassBottomBar,
  CardsGlassPrimaryButton,
  CardsGlassRoundButton,
  CardsGlassScreen,
  CardsGlassStateBlock,
  useCardsGlass,
} from './flashcards/CardsGlassKit';
import { triLang } from '../constants/i18n';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { actionToastTri, emitAppEvent } from './events';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { useAudio } from '../hooks/use-audio';
import { loadFlashcards } from '../hooks/use-flashcards';
import { soundDirector } from '../modules/audio/sound_director';
import { getTranscription, TRANSCRIPTION_ENGINE_VERSION } from './transcription';
import { STR } from './flashcards/constants';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import {
  FREE_CUSTOM_CARD_LIMIT,
  PLUS_CUSTOM_CARD_LIMIT,
  listCustomCards,
  peekCustomCardsSync,
  upsertCustomCard,
} from './flashcards/custom_cards_store';
import type { CardItem } from './flashcards/types';
import { DebugLogger } from './debug-logger';
import { FlipCard } from '../components/cards-grid/FlipCard';
import { KitCard, KitIconTile } from '../components/cards-grid/CardsKit';
import { SheetRow } from '../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../components/mistakes-panel/PanelSheet';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { EditorField } from './community_packs/PackEditorV2';
import { addCardToLocalPack, loadAddableLocalPacks } from './community_packs/localPackCardAdd';
import { getDevCardDraft } from './dev_cards_state';
import type { LocalAuthorPack } from './community_packs/localAuthorPacks';

function firstParam(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

// ── E13: ассистирование — словарь переводов уроков (фразы + word bank) ────────
// Лениво (динамический import ~2MB lesson data только при первом вводе EN),
// один раз на сессию приложения. Ключ — нормализованный EN.
type AssistEntry = { ru: string; uk: string; es?: string };
let assistMapCache: Map<string, AssistEntry> | null = null;
let assistMapInflight: Promise<Map<string, AssistEntry>> | null = null;

const assistKey = (en: string): string => en.trim().toLowerCase().replace(/\s+/g, ' ');

async function getAssistTranslationMap(): Promise<Map<string, AssistEntry>> {
  if (assistMapCache) return assistMapCache;
  if (assistMapInflight) return assistMapInflight;
  assistMapInflight = (async () => {
    const map = new Map<string, AssistEntry>();
    try {
      // Фразы уроков: english → russian/ukrainian(/spanish) — аналог getEnToUkMap (E11)
      const { getLessonData } = await import('./lesson_data_all');
      for (let lessonId = 1; lessonId <= 32; lessonId++) {
        for (const p of getLessonData(lessonId)) {
          if (!p.english || !p.russian) continue;
          const key = assistKey(p.english);
          if (!map.has(key)) {
            map.set(key, {
              ru: p.russian,
              uk: p.ukrainian || p.russian,
              ...(p.spanish ? { es: p.spanish } : {}),
            });
          }
        }
      }
    } catch (e) {
      DebugLogger.error('flashcards_card_editor:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    try {
      // Word bank уроков: en → ru/uk/es (give up, look forward to, …)
      const words = await import('./lesson_words');
      for (const lessonId of words.LESSONS_WITH_WORDS) {
        for (const w of words.lessonWordBank(lessonId)) {
          if (!w.en || !w.ru) continue;
          const key = assistKey(w.en);
          if (!map.has(key)) {
            map.set(key, { ru: w.ru, uk: w.uk || w.ru, ...(w.es ? { es: w.es } : {}) });
          }
        }
      }
    } catch (e) {
      DebugLogger.error('flashcards_card_editor:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    assistMapCache = map;
    assistMapInflight = null;
    return map;
  })();
  return assistMapInflight;
}

const ASSIST_DEBOUNCE_MS = 250;

export default function FlashcardsCardEditorScreen() {
  // зачем: Liquid Glass — токены активной темы (cards.html #21–22, #60–64).
  const { g } = useCardsGlass();
  const kg = useLv2Glass();
  const { lang } = useLang();
  // зачем: редактор обязан читать и писать библиотеку СВОЕГО языка обучения —
  // без этого карточка, созданная в режиме French, уходила в английский ключ.
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const params = useLocalSearchParams<{ id?: string; create?: string; cat?: string }>();
  const editId = useMemo(() => firstParam(params.id), [params.id]);
  const isEdit = editId != null;

  // зачем (владелец 2026-08-24): СОЗДАНИЕ своей карточки — функция подписки
  // (Plus/Pro/Max). Гейт стоит здесь, а не на кнопках: в редактор ведут
  // несколько входов (кнопка коллекции, легаси-диплинк ?create=1), и проверка
  // в одном месте не оставляет обходного пути.
  // РЕДАКТИРОВАНИЕ существующей карточки НЕ гейтится — уже созданное не
  // отбираем (прямое решение владельца), поэтому условие завязано на isEdit.
  // зачем accessResolved (аудит 2026-08-24): до резолва подписки hasPremiumAccess
  // равен false, и на холодном старте ПЛАТЯЩИЙ человек получал бы пейвол вместо
  // редактора. Канонический паттерн проекта — ждать резолва перед редиректом
  // (см. ai_companion_session.tsx). Пока не резолвнуто, экран показывает скелет.
  const { accessResolved } = usePremium();
  const hasPremiumAccess = useFeatureAccess('flashcards');
  const creatorGated = !isEdit && shouldGateCreator(hasPremiumAccess);
  const creatorLocked = creatorGated && accessResolved;
  const creatorRedirectedRef = useRef(false);
  // зачем (вердикт Макетов 12.10, cards-062: «пустой светлый экран без формы»): сперва логи. Редактор НОВОЙ карточки — функция подписки: у Free после
  // резолва доступа экран заменяется пейволом, а до резолва показывается скелет; пустой кадр бывает ровно на этом стыке. Печатаем каждое слагаемое.
  useEffect(() => {
    console.log('[CARD-EDITOR] mount-state', JSON.stringify({
      editId: editId ?? null,
      isEdit,
      create: params.create ?? null,
      accessResolved,
      hasPremiumAccess,
      creatorGated,
      creatorLocked,
    }));
  }, [accessResolved, creatorGated, creatorLocked, editId, hasPremiumAccess, isEdit, params.create]);
  // зачем (Карточки 2.0 12.10, cards-v2 `newCard({limit:'50/50'})`, координатор): у Free 50 своих карточек (FREE_CUSTOM_CARD_LIMIT). Число своих
  // карточек читаем из того же локального списка, что и подсказки дубликатов (0 чтений Firestore) и сразу на входе показываем пилюлю «50/50»
  // и «Безлимит с Plus» — человек не вводит слово и перевод ради сырого отказа при сохранении.
  const [customCount, setCustomCount] = useState<number | null>(() => peekCustomCardsSync(studyTarget)?.length ?? null);
  const cardLimitReached = !isEdit && accessResolved && !hasPremiumAccess && customCount !== null && customCount >= FREE_CUSTOM_CARD_LIMIT;
  const openCardLimitPaywall = useCallback(() => {
    void trackEvent('paywall_shown', { context: creatorPaywallContext('card'), source: 'card_editor_limit' });
    router.push({ pathname: '/premium_modal', params: { context: creatorPaywallContext('card'), source: 'card_editor_limit' } } as never);
  }, [router]);
  useEffect(() => {
    if (!creatorLocked || creatorRedirectedRef.current) return;
    creatorRedirectedRef.current = true;
    void trackEvent('paywall_shown', { context: creatorPaywallContext('card'), source: 'card_editor_create' });
    // replace, а не push: закрыв пейвол, человек возвращается в коллекцию, а не
    // в пустой редактор, который он всё равно не может использовать.
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/premium_modal',
      params: { context: creatorPaywallContext('card'), source: 'card_editor_create' },
    } as never);
  }, [creatorLocked, router]);

  // зачем (EN-проход Сверки 12.10, cards-021 «Новая карточка» по-русски при uiLang=en): словарь STR есть на всех 9 языках интерфейса, а выбор был сужен до ru/uk/es — en, pt-BR, vi, id, tr, pl падали в русский.
  const s = STR[lang] ?? STR.ru;

  const [existing, setExisting] = useState<CardItem | null>(null);
  /** edit: пока карточка не найдена — форма не показывается (иначе save создаст дубликат). */
  const [loadingCard, setLoadingCard] = useState(isEdit);
  // зачем (макет cards.html «Карточка не найдена»): вместо тоста и молчаливого
  // ухода назад — экран с понятной причиной и кнопкой «Назад».
  const [notFound, setNotFound] = useState(false);
  const handleSaveRef = useRef<() => void>(() => {});
  // зачем (Макеты cards-061): dev_state?cardsdraft=filled открывает новую карточку с заполненными полями без клавиатуры; в режиме правки и вне dev — как раньше
  const devDraft = isEdit ? null : getDevCardDraft();
  const [draftEN, setDraftEN] = useState(devDraft?.en ?? '');
  const [draftTR, setDraftTR] = useState(devDraft?.tr ?? '');
  const [draftDescription, setDraftDescription] = useState('');
  /** Перевод текущей локали на момент загрузки — чтобы отличать «не было» от «стёр». */
  const prefillTrRef = useRef('');
  const [focusedField, setFocusedField] = useState<'front' | 'back' | 'description'>('front');
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  // зачем (Карточки 2.0, макет «Новая карточка — превью живое»): превью-разворот сверху показывает лицо, пока вводят слово, и оборот, пока вводят перевод или пример
  const [previewBack, setPreviewBack] = useState(false);
  useEffect(() => { setPreviewBack(focusedField !== 'front'); }, [focusedField]);
  // зачем (координатор 13.10, cards-062: метка «RU» у английского слова «Test» на превью новой карточки — кандидат в дефект; СПЕРВА ЛОГИ): одна строка на смену фокуса/стороны превью — какая сторона показана,
  // какие метки и откуда (front-метка в FlipCard зашита как «EN», back-метка = язык интерфейса), что набрано. Решение по фактам из журнала; префикс [CARD-PREVIEW].
  const previewLogDraftsRef = useRef({ en: '', tr: '', desc: '' });
  previewLogDraftsRef.current = { en: draftEN.trim(), tr: draftTR.trim(), desc: draftDescription.trim() };
  useEffect(() => {
    const d = previewLogDraftsRef.current;
    DebugLogger.info('[CARD-PREVIEW]', `фокус=${focusedField} превью=${previewBack ? 'оборот' : 'лицо'} метки: лицо=EN(зашито в FlipCard) оборот=${lang.slice(0, 2).toUpperCase()}(язык интерфейса ${lang}) studyTarget=${studyTarget} слово=«${d.en.slice(0, 24)}» перевод=«${d.tr.slice(0, 24)}» пример=${d.desc.length} зн`);
  }, [focusedField, previewBack, lang, studyTarget]);
  // зачем (макет: строка выбора набора): новая карточка всегда попадает в «Мои карточки» и, если выбран свой неопубликованный набор, ещё и в него
  const [packPickerOpen, setPackPickerOpen] = useState(false);
  const [addablePacks, setAddablePacks] = useState<readonly LocalAuthorPack[]>([]);
  const [targetPackId, setTargetPackId] = useState<string | null>(null);
  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    void loadAddableLocalPacks().then((packs) => {
      if (!cancelled) setAddablePacks(packs);
    }).catch((e: unknown) => {
      console.warn('[CARD-EDITOR] не удалось прочитать свои наборы', e instanceof Error ? e.message : String(e));
    });
    return () => { cancelled = true; };
  }, [isEdit]);

  const backInputRef = useRef<TextInput | null>(null);
  // зачем (Макеты, en-проход cards-021: «Translation» наполовину под кнопкой «Add» при открытой клавиатуре; сперва логи):
  // сколько места у прокрутки, где поле и где сейчас прокрутка — по строке [CARD-EDITOR-KB] видно, почему поле оказалось под панелью.
  const editorScrollRef = useRef<ScrollView | null>(null);
  const editorScrollYRef = useRef(0);
  const editorViewportHRef = useRef(0);
  const editorContentHRef = useRef(0);
  const fieldTopRef = useRef<Record<string, number>>({});
  const focusedFieldRef = useRef<'front' | 'back' | 'description'>('front');
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealField = useCallback((name: 'front' | 'back' | 'description', reason: string) => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    // пауза: клавиатура ещё меняет высоту прокрутки — позиция считается после перестроения
    revealTimerRef.current = setTimeout(() => {
      revealTimerRef.current = null;
      const top = fieldTopRef.current[name];
      const target = typeof top === 'number' ? Math.max(0, top - 16) : null;
      DebugLogger.info('[CARD-EDITOR-KB]', `reveal поле=${name} причина=${reason}: top=${String(top)} scrollY=${Math.round(editorScrollYRef.current)} viewportH=${Math.round(editorViewportHRef.current)} contentH=${Math.round(editorContentHRef.current)} → ${target === null ? 'нет координаты, прокрутки нет' : `scrollTo y=${Math.round(target)}`}`);
      if (target !== null) editorScrollRef.current?.scrollTo({ y: target, animated: true });
    }, 120);
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      DebugLogger.info('[CARD-EDITOR-KB]', `клавиатура показана высота=${Math.round(e.endCoordinates?.height ?? 0)} фокус=${focusedFieldRef.current}`);
      revealField(focusedFieldRef.current, 'клавиатура');
    });
    return () => {
      show.remove();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [revealField]);
  const descriptionInputRef = useRef<TextInput | null>(null);

  // ── E13: ассистирование — автотранскрипция, подсказка перевода, дубликат ───
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => stopAudio(), [stopAudio]);
  const [assistTranscription, setAssistTranscription] = useState('');
  const [assistSuggestion, setAssistSuggestion] = useState<string | null>(null);
  const [duplicateOfEn, setDuplicateOfEn] = useState<string | null>(null);
  /** Существующие EN (custom + saved): дубликат-предупреждение + фолбэк подсказки. */
  type ExistingRow = { id: string; en: string; ru?: string; uk?: string; es?: string };
  const existingEnRef = useRef<Map<string, ExistingRow[]> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      listCustomCards(studyTarget).catch((e: unknown): CardItem[] => {
        DebugLogger.error('flashcards_card_editor:existing_custom', e instanceof Error ? e : new Error(String(e)), 'warning');
        return [];
      }),
      loadFlashcards(studyTarget).catch((e: unknown) => {
        DebugLogger.error('flashcards_card_editor:existing_saved', e instanceof Error ? e : new Error(String(e)), 'warning');
        return [];
      }),
    ]).then(([custom, saved]) => {
      if (cancelled) return;
      setCustomCount(custom.length);
      const map = new Map<string, ExistingRow[]>();
      for (const c of [...custom, ...saved]) {
        if (!c.en) continue;
        const key = assistKey(c.en);
        const list = map.get(key) ?? [];
        list.push({ id: c.id, en: c.en, ru: c.ru, uk: c.uk, es: (c as CardItem).es });
        map.set(key, list);
      }
      existingEnRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, [studyTarget]);

  useEffect(() => {
    const en = draftEN.trim();
    if (!en) {
      // Уход подсказок из потока — так же плавно, как их появление.
      animateNextLayoutTransition();
      setAssistTranscription('');
      setAssistSuggestion(null);
      setDuplicateOfEn(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      /**
       * зачем (владелец, 2026-08-16, «прыжки страниц»): транскрипция, плашка
       * дубликата и подсказка перевода ВСТАВЛЯЮТСЯ В ПОТОК между полями —
       * без этого поле перевода и кнопка сохранения телепортировались вниз
       * прямо во время набора текста. Правило Layout stability: вставки в
       * поток идут через animateNextLayoutTransition.
       */
      animateNextLayoutTransition();
      // Автотранскрипция (app/transcription.ts) — мгновенно, без сети
      setAssistTranscription(getTranscription(en));
      // Дубликат: существующая карточка с таким EN (кроме редактируемой)
      const matches = (existingEnRef.current?.get(assistKey(en)) ?? []).filter(
        (m) => m.id !== editId,
      );
      setDuplicateOfEn(matches.length > 0 ? matches[0]!.en : null);
      // Подсказка перевода: словарь уроков (фразы + word bank) для текущей локали;
      // фолбэк — перевод существующей карточки с тем же EN («уже переводили так»).
      const fromExisting =
        matches
          .map((m) => (lang === 'uk' ? m.uk || m.ru : lang === 'es' ? m.es : m.ru))
          .find((v) => v && v.trim())
          ?.trim() ?? null;
      // Фолбэк показываем сразу (ленивый import словаря ~2MB может занять время),
      // словарь уроков — апгрейдом, когда доедет; в null не даунгрейдим.
      setAssistSuggestion(fromExisting);
      void getAssistTranslationMap().then((map) => {
        if (cancelled) return;
        const entry = map.get(assistKey(en));
        const fromDict = entry
          ? lang === 'uk'
            ? entry.uk
            : lang === 'es'
              ? (entry.es ?? null)
              : entry.ru
          : null;
        const suggestion = (fromDict && fromDict.trim()) || fromExisting;
        if (suggestion) setAssistSuggestion(suggestion);
      });
    }, ASSIST_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draftEN, editId, lang]);

  /** TTS-превью EN (E13) — играет выбранным голосом из fc_voice_prefs_v1. */
  const previewEn = useCallback(() => {
    const en = draftEN.trim();
    if (!en) return;
    fcHaptic('tap');
    stopAudio();
    speakAudio(en, undefined, { language: 'en-US' });
  }, [draftEN, speakAudio, stopAudio]);

  const applySuggestion = useCallback(() => {
    if (!assistSuggestion) return;
    fcHaptic('tap');
    setDraftTR(assistSuggestion);
  }, [assistSuggestion]);

  // ── Загрузка карточки для редактирования ───────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    const applyCard = (card: CardItem) => {
      if (cancelled) return;
      setExisting(card);
      setDraftEN(card.en ?? '');
      // Строго поле СВОЕЙ локали, без ru-фолбэка resolveFlashcardBackText:
      // иначе сохранение записало бы русский текст в uk/es (слом инварианта).
      const own = lang === 'uk' ? (card.uk ?? '') : lang === 'es' ? (card.es ?? '') : (card.ru ?? '');
      prefillTrRef.current = own;
      setDraftTR(own);
      setDraftDescription(card.description ?? '');
      setLoadingCard(false);
    };
    const cachedList = peekCustomCardsSync(studyTarget);
    const cached = cachedList?.find((c) => c.id === editId);
    if (cached) {
      applyCard(cached);
      return () => { cancelled = true; };
    }
    void listCustomCards(studyTarget)
      .then((cards) => {
        const card = cards.find((c) => c.id === editId);
        if (cancelled) return;
        if (card) {
          applyCard(card);
        } else {
          console.warn('[CARD-EDITOR] card not found', { editId, studyTarget });
          setNotFound(true);
          setLoadingCard(false);
        }
      })
      .catch((e: unknown) => {
        DebugLogger.error('flashcards_card_editor:load_card', e instanceof Error ? e : new Error(String(e)), 'warning');
        if (cancelled) return;
        // зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): раньше сбой загрузки оставлял ПУСТУЮ форму, и «Сохранить» создавал новую карточку вместо правки старой (дубль и потерянная правка). Теперь форма не показывается, человек видит причину.
        console.warn('[CARD-EDITOR] load failed -> form blocked', { editId, studyTarget, reason: e instanceof Error ? e.message : String(e) }); // guard-ok: catch называет причину
        setNotFound(true);
        setLoadingCard(false);
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось открыть карточку.', uk: 'Не вдалося відкрити картку.', en: 'Couldn’t open the card.', es: 'No se pudo abrir la tarjeta.',
          'pt-BR': 'Não foi possível abrir o cartão.', vi: 'Không thể mở thẻ.', id: 'Kartu tidak dapat dibuka.', tr: 'Kart açılamadı.', pl: 'Nie udało się otworzyć karty.',
        }));
      });
    return () => { cancelled = true; };
  }, [isEdit, editId, lang, studyTarget]);

  const leaveEditor = useCallback(() => {
    Keyboard.dismiss();
    const fallback = isEdit
      ? { pathname: '/flashcards_collection', params: { cat: 'custom' } }
      : '/flashcards';
    safeRouterBack(router, fallback as any);
  }, [isEdit, router]);

  const leaveEditorAfterSave = useCallback(() => {
    Keyboard.dismiss();
    if (isEdit) {
      leaveEditor();
      return;
    }
    // После первой карточки коллекция уже не пустая: показываем результат, но
    // заменяем редактор, чтобы Back не возвращал пользователя в сохранённую форму.
    markNextNavigationAsReplace();
    router.replace({ pathname: '/flashcards_collection', params: { cat: 'custom' } } as any);
  }, [isEdit, leaveEditor, router]);

  // ── Валидация ──────────────────────────────────────────────────────────────
  const enOk = draftEN.trim().length > 0;
  const trVal = draftTR.trim();
  /**
   * Перевод обязателен при создании. При редактировании допускаем пустое поле,
   * только если у карточки в ЭТОЙ локали перевода и не было (чужие языки
   * не перезаписываем — карточка остаётся валидной за счёт другого языка).
   */
  const hasOtherLangTranslation = !!(
    existing &&
    ((existing.ru ?? '').trim() || (existing.uk ?? '').trim() || (existing.es ?? '').trim())
  );
  const trOk =
    trVal.length > 0 ||
    (isEdit && prefillTrRef.current.trim().length === 0 && hasOtherLangTranslation);
  // creatorLocked в условии — вторая линия защиты: даже если редирект на пейвол
  // почему-то не сработал, создать карточку без подписки нельзя.
  const canSave = enOk && trOk && !saving && !loadingCard && !(isEdit && !existing) && !creatorGated;

  // ── Сохранение (языковой инвариант — В ТОЧНОСТИ как handleSave) ────────────
  const handleSave = useCallback(async () => {
    // Пустой/пробельный EN не сохраняется (баг 9: onSubmitEditing обходил disabled-кнопку)
    // creatorLocked здесь по той же причине: onSubmitEditing с клавиатуры уже
    // однажды обходил disabled — создание без подписки должно быть закрыто и тут.
    // зачем (координатор 12.10, аудит Optimistic UI R1): состояние `saving` ставится после рендера — второй тап в том же кадре создавал дубль карточки; замок — ref.
    if (saveLockRef.current) {
      console.log('[OPT-UI] card_editor save ignored: запись ещё идёт'); // guard-ok: ранний выход называет причину
      return;
    }
    // зачем (аудит Optimistic UI, координатор 15.10, потеря данных пользователя, дыры 1-3): вторая линия защиты: правка без загруженной карточки сохранялась бы как НОВАЯ
    if (isEdit && !existing) {
      console.warn('[CARD-EDITOR] save blocked: isEdit && !existing', { editId }); // guard-ok: ранний выход называет причину
      return;
    }
    if (!draftEN.trim() || saving || loadingCard || creatorGated) return;
    if (!(trVal.length > 0 || (isEdit && prefillTrRef.current.trim().length === 0 && hasOtherLangTranslation))) return;
    Keyboard.dismiss();
    saveLockRef.current = true;
    setSaving(true);
    // ARCHITECTURE RULE: each field stores only its own language.
    // When editing in UK mode, only `uk` is updated; `ru` is preserved from existing card.
    // When editing in RU mode, only `ru` is updated; `uk` is preserved from existing card.
    // When editing in ES mode, only `es` is updated; `ru` / `uk` are preserved.
    const localized = customCardLocalizationForLang(lang, trVal, existing ?? undefined);
    const descTrim = draftDescription.trim();
    const newCard: CardItem = {
      // Спред существующей карточки — не теряем прочие поля (transcription и т.п.)
      ...(existing ?? {}),
      id: existing?.id ?? `custom_${Date.now()}`,
      en: draftEN.trim(),
      // E13: автотранскрипция — считаем от актуального EN (правка EN обновляет IPA).
      // зачем: без `|| existing` — пустой результат означает «правильной
      // транскрипции нет», и подставлять вместо неё прежнюю (возможно
      // выдуманную старым движком) нельзя (репорт 21.09.2026 про guests).
      transcription: getTranscription(draftEN.trim()),
      transcriptionEngineVersion: TRANSCRIPTION_ENGINE_VERSION,
      // Плановые локали: ru/uk/es — базовые поля, остальные 5 языков уходят в
      // sourceLocales (иначе перевод терялся у pt-BR/vi/id/tr/pl).
      ru: localized.baseRu,
      uk: localized.baseUk,
      es: localized.baseEs,
      sourceLocales: localized.plannedSourceLocales,
      description: descTrim.length > 0 ? descTrim : undefined,
      categoryId: 'custom',
      isSystem: false,
    };
    try {
      const existingCards = existing ? null : await listCustomCards(studyTarget);
      const cardLimit = hasPremiumAccess ? PLUS_CUSTOM_CARD_LIMIT : FREE_CUSTOM_CARD_LIMIT;
      if (existingCards && existingCards.length >= cardLimit) {
        throw new Error(hasPremiumAccess ? 'plus_custom_card_limit_reached' : 'free_custom_card_limit_reached');
      }
      await upsertCustomCard(newCard, studyTarget);
      if (!isEdit && targetPackId) {
        const added = await addCardToLocalPack(targetPackId, newCard);
        console.log(`[CARD-EDITOR] карточка ${newCard.id} в набор ${targetPackId}: ${added}`);
        if (added !== 'added' && added !== 'duplicate') {
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Карточка сохранена, но в набор не добавилась.', uk: 'Картку збережено, але до набору не додано.', es: 'La tarjeta se guardó, pero no se añadió al set.',
            en: 'The card was saved but not added to the pack.',
            'pt-BR': 'O cartão foi salvo, mas não foi adicionado ao pacote.', vi: 'Thẻ đã được lưu nhưng chưa được thêm vào bộ thẻ.', id: 'Kartu tersimpan, tetapi tidak ditambahkan ke paket.', tr: 'Kart kaydedildi ama pakete eklenmedi.', pl: 'Fiszka została zapisana, ale nie trafiła do zestawu.',
          }));
        }
      }
      playSfx('correct');
      fcHaptic('correct');
      // зачем: карточка своей коллекции сохранена (create/edit) — отдельное
      // событие pm.cards.editor_save поверх нейтрального 'correct' из cards-2.0.
      soundDirector.request('pm.cards.editor_save', { scope: 'cards' });
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: isEdit ? 'Карточка обновлена.' : 'Карточка сохранена.',
          uk: isEdit ? 'Картку оновлено.' : 'Картку збережено.',
          es: isEdit ? 'Tarjeta actualizada.' : 'Tarjeta guardada.', en: isEdit ? 'Card updated.' : 'Card saved.',
          'pt-BR': isEdit ? 'Cartão atualizado.' : 'Cartão salvo.', vi: isEdit ? 'Đã cập nhật thẻ.' : 'Đã lưu thẻ.', id: isEdit ? 'Kartu diperbarui.' : 'Kartu tersimpan.', tr: isEdit ? 'Kart güncellendi.' : 'Kart kaydedildi.', pl: isEdit ? 'Fiszka zaktualizowana.' : 'Fiszka zapisana.',
        }),
      );
      leaveEditorAfterSave();
    } catch (e: unknown) {
      DebugLogger.error('flashcards_card_editor:save', e instanceof Error ? e : new Error(String(e)), 'warning');
      saveLockRef.current = false;
      setSaving(false);
      if (e instanceof Error && e.message === 'free_custom_card_limit_reached') {
        // зачем: сырой отказ «не удалось сохранить» при исчерпанном лимите — потеря работы без объяснения; ведём в покупку, форма остаётся
        console.log('[CARD-EDITOR] save refused by free card limit -> paywall'); // guard-ok: ранний выход пишет причину
        openCardLimitPaywall();
        return;
      }
      // зачем (координатор 12.10, аудит Optimistic UI R1): лимит Plus раньше выглядел как «Не удалось сохранить» с бессмысленным «Повторить» — теперь называем причину.
      if (e instanceof Error && e.message === 'plus_custom_card_limit_reached') {
        console.log('[OPT-UI] card_editor save refused by plus card limit'); // guard-ok: ранний выход пишет причину
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Достигнут лимит своих карточек. Удали ненужные, чтобы добавить новые.', uk: 'Досягнуто ліміт власних карток. Видали непотрібні, щоб додати нові.', en: 'You have reached the limit of your own cards. Delete some to add new ones.', es: 'Has alcanzado el límite de tarjetas propias. Elimina algunas para añadir nuevas.',
          'pt-BR': 'Você atingiu o limite de cartões próprios. Exclua alguns para adicionar novos.', vi: 'Bạn đã đạt giới hạn thẻ của riêng mình. Hãy xóa bớt để thêm thẻ mới.', id: 'Kamu sudah mencapai batas kartu sendiri. Hapus beberapa untuk menambah yang baru.', tr: 'Kendi kartlarının sınırına ulaştın. Yenilerini eklemek için bazılarını sil.', pl: 'Osiągnięto limit własnych fiszek. Usuń niepotrzebne, aby dodać nowe.',
        }));
        return;
      }
      emitAppEvent(
        'action_toast',
        {
          ...actionToastTri('error', {
            ru: 'Не удалось сохранить карточку.',
            uk: 'Не вдалося зберегти картку.',
            es: 'No se pudo guardar la tarjeta.', en: 'Could not save the card.',
            'pt-BR': 'Não foi possível salvar o cartão.', vi: 'Không lưu được thẻ.', id: 'Kartu tidak bisa disimpan.', tr: 'Kart kaydedilemedi.', pl: 'Nie udało się zapisać fiszki.',
          }),
          // зачем (макет cards.html «Не удалось сохранить»): повтор в один тап,
          // черновик не теряется — форма остаётся на месте.
          action: {
            labelRu: 'Повторить', labelUk: 'Повторити', labelEn: 'Retry', labelEs: 'Reintentar',
            labelPtBr: 'Tentar de novo', labelVi: 'Thử lại', labelId: 'Coba lagi', labelTr: 'Tekrar dene', labelPl: 'Ponów',
            onPress: () => handleSaveRef.current(),
          },
        },
      );
    }
  }, [
    draftEN,
    trVal,
    draftDescription,
    existing,
    isEdit,
    hasOtherLangTranslation,
    lang,
    openCardLimitPaywall,
    leaveEditorAfterSave,
    loadingCard,
    creatorGated,
    saving,
    targetPackId,
  ]);
  handleSaveRef.current = () => { void handleSave(); };

  // зачем (Liquid Glass, cards.html #21–22, #60–64): поле — одна непрозрачная
  // плашка с подписью ВНУТРИ и полем ввода без своей рамки; фокус — светлее
  // кромка, а не цветная толстая рамка. Логика ввода/сохранения не менялась.
  const inputStyle = { color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '500' as const, paddingHorizontal: 0, paddingVertical: 0 };
  const unlimitedPlusLabel = triLang(lang, {
    ru: 'Безлимит с Plus', uk: 'Безліміт з Plus', en: 'Unlimited with Plus', es: 'Sin límite con Plus', 'pt-BR': 'Sem limite com Plus',
    vi: 'Không giới hạn với Plus', id: 'Tanpa batas dengan Plus', tr: 'Plus ile sınırsız', pl: 'Bez limitu z Plus',
  });
  const fieldCopy = triLang(lang, {
    ru: { word: 'Слово или фраза', translation: 'Перевод', example: 'Пример', pack: 'Набор', myCards: 'Мои карточки', add: 'Добавить' },
    uk: { word: 'Слово або фраза', translation: 'Переклад', example: 'Приклад', pack: 'Набір', myCards: 'Мої картки', add: 'Додати' },
    en: { word: 'Word or phrase', translation: 'Translation', example: 'Example', pack: 'Pack', myCards: 'My cards', add: 'Add' },
    es: { word: 'Palabra o frase', translation: 'Traducción', example: 'Ejemplo', pack: 'Set', myCards: 'Mis tarjetas', add: 'Añadir' },
    'pt-BR': { word: 'Palavra ou frase', translation: 'Tradução', example: 'Exemplo', pack: 'Conjunto', myCards: 'Meus cartões', add: 'Adicionar' },
    vi: { word: 'Từ hoặc cụm từ', translation: 'Bản dịch', example: 'Ví dụ', pack: 'Bộ thẻ', myCards: 'Thẻ của tôi', add: 'Thêm' },
    id: { word: 'Kata atau frasa', translation: 'Terjemahan', example: 'Contoh', pack: 'Set', myCards: 'Kartu saya', add: 'Tambah' },
    tr: { word: 'Kelime veya ifade', translation: 'Çeviri', example: 'Örnek', pack: 'Set', myCards: 'Kartlarım', add: 'Ekle' },
    pl: { word: 'Słowo lub fraza', translation: 'Tłumaczenie', example: 'Przykład', pack: 'Zestaw', myCards: 'Moje karty', add: 'Dodaj' },
  });
  const previewCopy = triLang(lang, {
    ru: { word: 'Слово', translation: 'Перевод', example: 'Пример появится тут', flip: 'Перевернуть карточку' },
    uk: { word: 'Слово', translation: 'Переклад', example: 'Приклад з’явиться тут', flip: 'Перевернути картку' },
    en: { word: 'Word', translation: 'Translation', example: 'The example will appear here', flip: 'Flip the card' },
    es: { word: 'Palabra', translation: 'Traducción', example: 'El ejemplo aparecerá aquí', flip: 'Girar la tarjeta' },
    'pt-BR': { word: 'Palavra', translation: 'Tradução', example: 'O exemplo aparecerá aqui', flip: 'Virar o cartão' },
    vi: { word: 'Từ', translation: 'Bản dịch', example: 'Ví dụ sẽ hiện ở đây', flip: 'Lật thẻ' },
    id: { word: 'Kata', translation: 'Terjemahan', example: 'Contoh akan muncul di sini', flip: 'Balik kartu' },
    tr: { word: 'Kelime', translation: 'Çeviri', example: 'Örnek burada görünecek', flip: 'Kartı çevir' },
    pl: { word: 'Słowo', translation: 'Tłumaczenie', example: 'Przykład pojawi się tutaj', flip: 'Obróć kartę' },
  });
  const targetPackTitle = (targetPackId ? addablePacks.find((pack) => pack.id === targetPackId)?.title : null) ?? fieldCopy.myCards;
  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar',
    'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  return (
    <CardsGlassScreen g={g}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle={g.isLight ? 'dark-content' : 'light-content'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>
          <ContentWrap>
            {/* Header */}
            <View style={st.header}>
              <CardsGlassRoundButton
                g={g}
                testID="fc-editor-close"
                label={closeLabel}
                icon="close"
                onPress={leaveEditor}
              />
              <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
                <Text style={{ color: g.text, fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' }}>
                  {isEdit ? s.editCard : s.newCard}
                </Text>
              </View>
              {cardLimitReached ? (
                // макет `limPill('layers', '50/50')`: пилюля лимита — реальный лимит места (свои карточки)
                <View testID="fc-editor-limit-pill" accessible accessibilityLabel={`${customCount} / ${FREE_CUSTOM_CARD_LIMIT}`} style={{ height: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }}>
                  <Ionicons name="layers-outline" size={16} color={g.text} />
                  <Text style={{ color: g.text, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{`${customCount}/${FREE_CUSTOM_CARD_LIMIT}`}</Text>
                </View>
              ) : <View style={{ width: 44 }} />}
            </View>

            {/*
              * зачем (владелец, 2026-08-16, «прыжки страниц»): раньше на время
              * чтения карточки вся форма подменялась спиннером по центру, и
              * поля появлялись скачком. Держим ту же раскладку — три плашки
              * (макет: высота 74, радиус 14) вместо формы.
              */}
            {/* зачем: при закрытом создании показываем ТОТ ЖЕ скелет, что при
                загрузке — форма не мелькает за кадр до ухода на пейвол, и
                геометрия первого кадра совпадает с обычной (layout stability). */}
            {notFound ? (
              <CardsGlassStateBlock
                g={g}
                testID="fc-editor-not-found"
                icon="search"
                title={triLang(lang, {
                  ru: 'Карточка не найдена', uk: 'Картку не знайдено', en: 'Card not found', es: 'No se encontró la tarjeta',
                  'pt-BR': 'Cartão não encontrado', vi: 'Không tìm thấy thẻ', id: 'Kartu tidak ditemukan', tr: 'Kart bulunamadı', pl: 'Nie znaleziono karty',
                })}
                actionLabel={triLang(lang, {
                  ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás',
                  'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
                })}
                onAction={leaveEditor}
              />
            ) : loadingCard || creatorGated ? (
              <View testID="fc-editor-skeleton" style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ marginTop: 14 }}>
                    <SkeletonBlock
                      width="100%"
                      height={74}
                      borderRadius={14}
                      baseColor={g.opaqueControl}
                      highlightColor={g.selected}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <>
              <ScrollView decelerationRate="fast"
                ref={editorScrollRef}
                onLayout={(e) => { editorViewportHRef.current = e.nativeEvent.layout.height; }}
                onContentSizeChange={(_w, h) => { editorContentHRef.current = h; }}
                onScroll={(e) => { editorScrollYRef.current = e.nativeEvent.contentOffset.y; }}
                scrollEventThrottle={100}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* зачем (макет cards-v2 «Новая карточка — превью живое»): сверху разворотная карточка 196 — слово на лице, перевод и пример на обороте;
                    пока вводишь слово, видно лицо, перевод или пример — оборот. Тап по превью переворачивает вручную. */}
                <View testID="fc-editor-preview">
                  <FlipCard
                    g={g}
                    front={draftEN.trim() || previewCopy.word}
                    back={draftTR.trim() || previewCopy.translation}
                    example={draftDescription.trim() || previewCopy.example}
                    backTag={lang.slice(0, 2).toUpperCase()}
                    flipped={previewBack}
                    onFlip={() => setPreviewBack((prev) => !prev)}
                    flipLabel={previewCopy.flip}
                    showSpeak={false}
                  />
                </View>

                {/* EN field */}
                <View style={{ marginTop: 22 }} onLayout={(e) => { fieldTopRef.current.front = e.nativeEvent.layout.y; }}>
                  <EditorField g={g} label={fieldCopy.word}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TextInput
                        testID="fc-editor-en"
                        accessibilityLabel={fieldCopy.word}
                        style={[inputStyle, { flex: 1 }]}
                        value={draftEN}
                        onChangeText={setDraftEN}
                        autoFocus
                        returnKeyType="next"
                        onSubmitEditing={() => backInputRef.current?.focus()}
                        blurOnSubmit={false}
                        maxLength={80}
                        onFocus={() => { focusedFieldRef.current = 'front'; setFocusedField('front'); revealField('front', 'фокус'); }}
                        placeholderTextColor={g.mutedText}
                      />
                      {/* E13: TTS-превью введённого EN */}
                      {draftEN.trim() ? (
                        <TouchableOpacity
                          testID="fc-editor-tts"
                          accessibilityLabel={triLang(lang, { ru: 'Озвучить', uk: 'Озвучити', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' })}
                          accessible
                          onPress={previewEn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="volume-medium" size={20} color={g.text} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </EditorField>
                  {/* E13: автотранскрипция — пойдёт в карточку при сохранении */}
                  {assistTranscription ? (
                    <Text
                      testID="fc-editor-transcription"
                      style={{
                        color: g.secondary,
                        fontSize: 13,
                        lineHeight: 18,
                        fontStyle: 'italic',
                        letterSpacing: 0.25,
                        marginTop: 8,
                        marginLeft: 4,
                      }}
                    >
                      {assistTranscription}
                    </Text>
                  ) : null}
                </View>
                {/* E13: предупреждение о дубликате (плашка тоном, без жёлтой рамки) */}
                {duplicateOfEn ? (
                  <View
                    testID="fc-editor-duplicate"
                    accessible
                    style={{
                      marginTop: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 16,
                      backgroundColor: g.opaqueControl,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={18} color={g.text} />
                    <Text style={{ color: g.text, fontSize: 13, lineHeight: 18, flex: 1 }}>
                      {triLang(lang, {
                        ru: `Карточка «${duplicateOfEn}» уже есть в коллекции.`,
                        uk: `Картка «${duplicateOfEn}» вже є в колекції.`,
                        en: `The card "${duplicateOfEn}" is already in the collection.`,
                        es: `La tarjeta «${duplicateOfEn}» ya existe en la colección.`,
                        'pt-BR': `O cartão «${duplicateOfEn}» já está na coleção.`,
                        vi: `Thẻ «${duplicateOfEn}» đã có trong bộ sưu tập.`,
                        id: `Kartu «${duplicateOfEn}» sudah ada di koleksi.`,
                        tr: `«${duplicateOfEn}» kartı zaten koleksiyonda.`,
                        pl: `Karta «${duplicateOfEn}» już jest w kolekcji.`,
                      })}
                    </Text>
                  </View>
                ) : null}

                {/* Translation field (текущая локаль — инвариант) */}
                <View style={{ marginTop: 14 }} onLayout={(e) => { fieldTopRef.current.back = e.nativeEvent.layout.y; }}>
                  <EditorField g={g} label={fieldCopy.translation}>
                    <TextInput
                      ref={backInputRef}
                      testID="fc-editor-tr"
                      accessibilityLabel={fieldCopy.translation}
                      style={inputStyle}
                      value={draftTR}
                      onChangeText={setDraftTR}
                      returnKeyType="next"
                      onSubmitEditing={() => descriptionInputRef.current?.focus()}
                      blurOnSubmit={false}
                      maxLength={80}
                      onFocus={() => { focusedFieldRef.current = 'back'; setFocusedField('back'); revealField('back', 'фокус'); }}
                      placeholderTextColor={g.mutedText}
                    />
                  </EditorField>
                </View>
                {/* E13: подсказка перевода из словаря уроков — тап подставляет */}
                {assistSuggestion && assistSuggestion !== trVal ? (
                  <TouchableOpacity
                    testID="fc-editor-suggest"
                    accessible
                    activeOpacity={0.8}
                    onPress={applySuggestion}
                    style={{
                      marginTop: 12,
                      alignSelf: 'flex-start',
                      minHeight: 44,
                      justifyContent: 'center',
                      borderRadius: 22,
                      backgroundColor: g.buttonFill,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ color: g.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>
                      {triLang(lang, {
                        ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Sugerencia',
                        'pt-BR': 'Sugestão', vi: 'Gợi ý', id: 'Saran', tr: 'İpucu', pl: 'Podpowiedź',
                      })}: {assistSuggestion}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Пример (необязательно) — теперь всегда виден, как в макете; хранится как заметка карточки */}
                <View style={{ marginTop: 14 }} onLayout={(e) => { fieldTopRef.current.description = e.nativeEvent.layout.y; }}>
                  <EditorField g={g} label={fieldCopy.example}>
                    <TextInput
                      ref={descriptionInputRef}
                      testID="fc-editor-description"
                      accessibilityLabel={fieldCopy.example}
                      style={inputStyle}
                      value={draftDescription}
                      onChangeText={setDraftDescription}
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                      blurOnSubmit
                      maxLength={220}
                      onFocus={() => { focusedFieldRef.current = 'description'; setFocusedField('description'); revealField('description', 'фокус'); }}
                      placeholderTextColor={g.mutedText}
                    />
                  </EditorField>
                </View>

                {/* Выбор набора (макет: строка «плитка + название + шеврон»): карточка кладётся в «Мои карточки» и, если выбран набор, ещё и в него */}
                {!isEdit ? (
                  <View style={{ marginTop: 18 }}>
                    <KitCard g={g} testID="fc-editor-pack-row" accessibilityLabel={`${fieldCopy.pack}: ${targetPackTitle}`} onPress={() => { Keyboard.dismiss(); setPackPickerOpen(true); }} style={{ minHeight: 56 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 11, paddingRight: 16 }}>
                        <KitIconTile g={g} icon="albums-outline" />
                        <Text style={{ flex: 1, color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{targetPackTitle}</Text>
                        <Ionicons name="chevron-forward" size={20} color={g.secondary} />
                      </View>
                    </KitCard>
                  </View>
                ) : null}
              </ScrollView>

              {/* Сохранить: закреплена внизу с затуханием (макет #21, #22; cards-v2 — «Добавить») */}
              <CardsGlassBottomBar g={g} bottomInset={0}>
                <CardsGlassPrimaryButton
                  g={g}
                  testID="fc-editor-save"
                  label={cardLimitReached ? unlimitedPlusLabel : isEdit ? s.save : fieldCopy.add}
                  disabled={cardLimitReached ? false : !canSave}
                  onPress={cardLimitReached ? openCardLimitPaywall : handleSave}
                />
              </CardsGlassBottomBar>
              </>
            )}
          </ContentWrap>
        </KeyboardAvoidingView>
        <PanelSheet visible={packPickerOpen} onClose={() => setPackPickerOpen(false)} testID="fc-editor-pack-picker">
          <Text accessibilityRole="header" style={{ color: g.text, fontSize: 22, lineHeight: 28, fontWeight: '700', paddingHorizontal: 6, paddingBottom: 6 }}>{fieldCopy.pack}</Text>
          <SheetRow g={kg} testID="fc-editor-pack-none" icon={targetPackId === null ? 'checkmark-circle' : 'bookmark-outline'} title={fieldCopy.myCards} onPress={() => { setTargetPackId(null); setPackPickerOpen(false); }} />
          {addablePacks.map((pack) => (
            <SheetRow key={pack.id} g={kg} testID={`fc-editor-pack-${pack.id}`} icon={targetPackId === pack.id ? 'checkmark-circle' : 'albums-outline'} title={pack.title} onPress={() => { setTargetPackId(pack.id); setPackPickerOpen(false); }} />
          ))}
        </PanelSheet>
      </SafeAreaView>
    </CardsGlassScreen>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
});

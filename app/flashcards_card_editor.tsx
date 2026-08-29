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
import { useFeatureAccess, usePremium } from '../components/PremiumContext';
import { trackEvent } from './analytics';
import { creatorPaywallContext, shouldGateCreator } from './creator_access';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { animateNextLayoutTransition } from './smooth_layout';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { actionToastTri, emitAppEvent } from './events';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { useAudio } from '../hooks/use-audio';
import { loadFlashcards } from '../hooks/use-flashcards';
import { soundDirector } from '../modules/audio/sound_director';
import { getTranscription } from './transcription';
import { STR } from './flashcards/constants';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import {
  listCustomCards,
  peekCustomCardsSync,
  upsertCustomCard,
} from './flashcards/custom_cards_store';
import type { CardItem } from './flashcards/types';
import { DebugLogger } from './debug-logger';

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
  const { theme: t, f, statusBarLight } = useTheme();
  const { lang } = useLang();
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

  const strLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const s = STR[strLang];

  const [existing, setExisting] = useState<CardItem | null>(null);
  /** edit: пока карточка не найдена — форма не показывается (иначе save создаст дубликат). */
  const [loadingCard, setLoadingCard] = useState(isEdit);
  const [draftEN, setDraftEN] = useState('');
  const [draftTR, setDraftTR] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  /** Перевод текущей локали на момент загрузки — чтобы отличать «не было» от «стёр». */
  const prefillTrRef = useRef('');
  const [focusedField, setFocusedField] = useState<'front' | 'back' | 'description'>('front');
  /** Необязательная подсказка спрятана до явного запроса — на первом экране только две стороны. */
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const backInputRef = useRef<TextInput | null>(null);
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
      listCustomCards().catch((): CardItem[] => []),
      loadFlashcards().catch(() => []),
    ]).then(([custom, saved]) => {
      if (cancelled) return;
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
  }, []);

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
      setDescriptionOpen((card.description ?? '').trim().length > 0);
      setLoadingCard(false);
    };
    const cachedList = peekCustomCardsSync();
    const cached = cachedList?.find((c) => c.id === editId);
    if (cached) {
      applyCard(cached);
      return () => { cancelled = true; };
    }
    void listCustomCards()
      .then((cards) => {
        const card = cards.find((c) => c.id === editId);
        if (cancelled) return;
        if (card) {
          applyCard(card);
        } else {
          emitAppEvent(
            'action_toast',
            actionToastTri('error', {
              ru: 'Карточка не найдена.',
              uk: 'Картку не знайдено.',
              es: 'No se encontró la tarjeta.',
            }),
          );
          safeRouterBack(router, '/flashcards' as any);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingCard(false);
      });
    return () => { cancelled = true; };
  }, [isEdit, editId, lang, router]);

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
  const canSave = enOk && trOk && !saving && !loadingCard && !creatorGated;

  // ── Сохранение (языковой инвариант — В ТОЧНОСТИ как handleSave) ────────────
  const handleSave = useCallback(async () => {
    // Пустой/пробельный EN не сохраняется (баг 9: onSubmitEditing обходил disabled-кнопку)
    // creatorLocked здесь по той же причине: onSubmitEditing с клавиатуры уже
    // однажды обходил disabled — создание без подписки должно быть закрыто и тут.
    if (!draftEN.trim() || saving || loadingCard || creatorGated) return;
    if (!(trVal.length > 0 || (isEdit && prefillTrRef.current.trim().length === 0 && hasOtherLangTranslation))) return;
    Keyboard.dismiss();
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
      // E13: автотранскрипция — считаем от актуального EN (правка EN обновляет IPA)
      transcription: getTranscription(draftEN.trim()) || existing?.transcription,
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
      await upsertCustomCard(newCard);
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
          es: isEdit ? 'Tarjeta actualizada.' : 'Tarjeta guardada.',
        }),
      );
      leaveEditorAfterSave();
    } catch {
      setSaving(false);
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сохранить карточку.',
          uk: 'Не вдалося зберегти картку.',
          es: 'No se pudo guardar la tarjeta.',
        }),
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
    leaveEditorAfterSave,
    loadingCard,
    creatorGated,
    saving,
  ]);

  const fieldLabelStyle = {
    color: t.textSecond,
    fontSize: f.sub,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  };
  const inputBaseStyle = (focused: boolean) => ({
    backgroundColor: t.bgSurface,
    borderWidth: 1.5,
    borderColor: focused ? t.accent : t.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: t.textPrimary,
  });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>
          <ContentWrap>
            {/* Header */}
            <View style={[st.header, { borderBottomColor: t.border }]}>
              <TouchableOpacity
                testID="fc-editor-close"
                accessibilityLabel="qa-fc-editor-close"
                accessible
                onPress={leaveEditor}
                style={{ width: 40 }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color={t.textMuted} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
                <Text
                  style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', letterSpacing: 0.2 }}
                  numberOfLines={1}
                >
                  {isEdit ? s.editCard : s.newCard}
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/*
              * зачем (владелец, 2026-08-16, «прыжки страниц»): раньше на время
              * чтения карточки вся форма подменялась спиннером по центру, и
              * поля появлялись скачком. Держим ту же раскладку — два подписанных
              * поля (высота = paddingV 16*2 + строка) и кнопку сохранения.
              */}
            {/* зачем: при закрытом создании показываем ТОТ ЖЕ скелет, что при
                загрузке — форма не мелькает за кадр до ухода на пейвол, и
                геометрия первого кадра совпадает с обычной (layout stability). */}
            {loadingCard || creatorGated ? (
              <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24, gap: 20 }}>
                <View style={{ gap: 8 }}>
                  <Text style={fieldLabelStyle}>{s.editFront}</Text>
                  <SkeletonBlock width="100%" height={f.body + 2 + 32} borderRadius={16} />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={fieldLabelStyle}>{s.editBack}</Text>
                  <SkeletonBlock width="100%" height={f.body + 2 + 32} borderRadius={16} />
                </View>
              </View>
            ) : (
              <ScrollView decelerationRate="fast"
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, gap: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* EN field */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="language-outline" size={13} color={t.textMuted} />
                    <Text style={[fieldLabelStyle, { flex: 1 }]}>{s.editFront}</Text>
                    {/* E13: TTS-превью введённого EN */}
                    {draftEN.trim() ? (
                      <TouchableOpacity
                        testID="fc-editor-tts"
                        accessibilityLabel="qa-fc-editor-tts"
                        accessible
                        onPress={previewEn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: t.border,
                          backgroundColor: t.bgSurface,
                        }}
                      >
                        <Ionicons name="volume-medium" size={15} color={t.accent} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TextInput
                    testID="fc-editor-en"
                    accessibilityLabel="qa-fc-editor-en"
                    style={[inputBaseStyle(focusedField === 'front'), { fontSize: f.body + 2, fontWeight: '600' }]}
                    value={draftEN}
                    onChangeText={setDraftEN}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => backInputRef.current?.focus()}
                    blurOnSubmit={false}
                    maxLength={80}
                    onFocus={() => setFocusedField('front')}
                  />
                  {/* E13: автотранскрипция — пойдёт в карточку при сохранении */}
                  {assistTranscription ? (
                    <Text
                      testID="fc-editor-transcription"
                      style={{
                        color: t.textMuted,
                        fontSize: f.sub,
                        fontStyle: 'italic',
                        letterSpacing: 0.25,
                        paddingHorizontal: 4,
                      }}
                      numberOfLines={2}
                    >
                      {assistTranscription}
                    </Text>
                  ) : null}
                  {/* E13: предупреждение о дубликате (жёлтая плашка) */}
                  {duplicateOfEn ? (
                    <View
                      testID="fc-editor-duplicate"
                      accessibilityLabel="qa-fc-editor-duplicate"
                      accessible
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: `${t.gold}88`,
                        backgroundColor: t.goldBg,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Ionicons name="warning-outline" size={16} color={t.gold} />
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, flex: 1, lineHeight: 16 }}>
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
                </View>

                {/* Translation field (текущая локаль — инвариант) */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="swap-horizontal-outline" size={13} color={t.textMuted} />
                    <Text style={fieldLabelStyle}>{s.editBack}</Text>
                  </View>
                  <TextInput
                    ref={backInputRef}
                    testID="fc-editor-tr"
                    accessibilityLabel="qa-fc-editor-tr"
                    style={[inputBaseStyle(focusedField === 'back'), { fontSize: f.body + 2, fontWeight: '600' }]}
                    value={draftTR}
                    onChangeText={setDraftTR}
                    returnKeyType={descriptionOpen ? 'next' : 'done'}
                    onSubmitEditing={() => {
                      if (descriptionOpen) descriptionInputRef.current?.focus();
                      else void handleSave();
                    }}
                    blurOnSubmit={!descriptionOpen}
                    maxLength={80}
                    onFocus={() => setFocusedField('back')}
                  />
                  {/* E13: подсказка перевода из словаря уроков — тап подставляет */}
                  {assistSuggestion && assistSuggestion !== trVal ? (
                    <TouchableOpacity
                      testID="fc-editor-suggest"
                      accessibilityLabel="qa-fc-editor-suggest"
                      accessible
                      activeOpacity={0.8}
                      onPress={applySuggestion}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: `${t.accent}66`,
                        backgroundColor: `${t.accent}14`,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Ionicons name="bulb-outline" size={14} color={t.accent} />
                      <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '700' }} numberOfLines={1}>
                        {triLang(lang, {
                          ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Sugerencia',
                          'pt-BR': 'Sugestão', vi: 'Gợi ý', id: 'Saran', tr: 'İpucu', pl: 'Podpowiedź',
                        })}: {assistSuggestion}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Optional description — раскрывается по запросу (упрощение 2026-08-13) */}
                {descriptionOpen ? (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="document-text-outline" size={13} color={t.textMuted} />
                    <Text style={fieldLabelStyle}>{s.editDescription}</Text>
                  </View>
                  <TextInput
                    ref={descriptionInputRef}
                    testID="fc-editor-description"
                    accessibilityLabel="qa-fc-editor-description"
                    style={[
                      inputBaseStyle(focusedField === 'description'),
                      { fontSize: f.body, fontWeight: '500', minHeight: 88, textAlignVertical: 'top' },
                    ]}
                    value={draftDescription}
                    onChangeText={setDraftDescription}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    blurOnSubmit
                    maxLength={220}
                    multiline
                    onFocus={() => setFocusedField('description')}
                  />
                  <Text style={{ color: t.textGhost, fontSize: f.caption, alignSelf: 'flex-end' }}>
                    {draftDescription.length}/220
                  </Text>
                </View>
                ) : (
                  <TouchableOpacity
                    testID="fc-editor-description-open"
                    accessibilityLabel="qa-fc-editor-description-open"
                    accessible
                    activeOpacity={0.8}
                    onPress={() => {
                      // Поле заметки (minHeight 88) вставляется в поток и толкает
                      // кнопку сохранения — сдвигаем плавно, а не рывком.
                      animateNextLayoutTransition();
                      setDescriptionOpen(true);
                      requestAnimationFrame(() => descriptionInputRef.current?.focus());
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      alignSelf: 'flex-start',
                      paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={t.textSecond} />
                    <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '600' }}>
                      {triLang(lang, {
                        ru: 'Добавить заметку',
                        uk: 'Додати нотатку',
                        en: 'Add a note',
                        es: 'Añadir una nota',
                        'pt-BR': 'Adicionar uma nota',
                        vi: 'Thêm ghi chú',
                        id: 'Tambah catatan',
                        tr: 'Not ekle',
                        pl: 'Dodaj notatkę',
                      })}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Save button */}
                <TouchableOpacity
                  testID="fc-editor-save"
                  accessibilityLabel="qa-fc-editor-save"
                  accessible
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: canSave ? t.accent : t.bgSurface,
                    borderWidth: canSave ? 0 : 1,
                    borderColor: t.border,
                    borderRadius: 16,
                    paddingVertical: 16,
                    marginTop: 4,
                    gap: 8,
                  }}
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={canSave ? t.correctText : t.textGhost}
                  />
                  <Text style={{ color: canSave ? t.correctText : t.textGhost, fontSize: f.body, fontWeight: '700' }}>
                    {s.save}
                  </Text>
                </TouchableOpacity>

                <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center', lineHeight: 16 }}>
                  {triLang(lang, {
                    ru: 'Карточка появится во вкладке «Свои» и будет доступна в тренировках.',
                    uk: 'Картка з’явиться у вкладці «Свої» і буде доступна в тренуваннях.',
                    en: 'The card will appear in the "My cards" tab and be available in training.',
                    es: 'La tarjeta aparecerá en «Mis tarjetas» y estará disponible en los entrenamientos.',
                    'pt-BR': 'O cartão aparecerá em «Meus cartões» e ficará disponível nos treinos.',
                    vi: 'Thẻ sẽ xuất hiện trong tab «Của tôi» và có thể dùng để luyện tập.',
                    id: 'Kartu akan muncul di tab «Milikku» dan tersedia untuk latihan.',
                    tr: '«Benimkiler» sekmesinde görünecek ve alıştırmalarda kullanılabilecek.',
                    pl: 'Karta pojawi się w zakładce «Moje» i będzie dostępna w treningach.',
                  })}
                </Text>
              </ScrollView>
            )}
          </ContentWrap>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
});

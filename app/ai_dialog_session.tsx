import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import AiTypingBubble from '../components/AiTypingBubble';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import {
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  getScenarioById,
  scenarioObjectives,
  scenarioTemperament,
  type DialogObjective,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { moodToFace, DEFAULT_MOOD } from './dialog_mood_face';
import {
  parseTurnState,
  isTerminalOutcome,
  outcomeTitle,
  type DialogOutcome,
} from './dialog_outcome';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { buildScenarioGreeting } from './ai_dialog_greeting';
import { triLang, type Lang } from '../constants/i18n';
import { getLessonData } from './lesson_data_all';
import { getLessonDialogScenarioId } from './lesson_dialog_scenarios';
import {
  callPremiumDialogSend,
  callPremiumDialogTranslate,
  type DialogChatTurn,
} from './ai_dialog_client';
import SkeletonBlock from '../components/SkeletonShimmer';
import {
  TRANSLATE_LIMIT_PER_DIALOG,
  decideTranslateAction,
  shouldShowTranslateButton,
  translateRemaining as computeTranslateRemaining,
} from './dialog_translate_limit';
import {
  hasFreeDialogLeft,
  markFreeDialogUsed,
} from './dialogs_limit_session';
import { markDialogCompleted } from './dialogs_progress';
import { trackEvent } from './analytics';
import { safeRouterBack } from './navigation_back';

/**
 * Достаёт имя персонажа из persona-строки для подписи в шапке-мессенджере:
 * «Your name is Mia. …» → «Mia», «Your name is Mr. Patel. …» → «Mr. Patel».
 * Имя — это всё после «your name is» до конца предложения (точка/запятая +
 * пробел + заглавная буква), поэтому точка в титуле (Mr./Dr.) не обрывает имя.
 * Возвращает пустую строку, если имя не задано.
 */
function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  // Опциональный титул (Mr./Dr./…) + само имя до точки/запятой. Титул со своей
  // точкой не обрывает имя: «Mr. Patel» извлекается целиком, «Mia» — как есть.
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

function buildLessonDialogScenario(lessonId: number): DialogScenario | null {
  const scenarioId = getLessonDialogScenarioId(lessonId);
  if (!scenarioId) return null;
  const lessonPhrases = getLessonData(lessonId)
    .map((phrase) => String(phrase.english ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
  if (lessonPhrases.length === 0) return null;
  const usefulPhrases = lessonPhrases.join('; ');
  return {
    id: scenarioId,
    category: 'everyday',
    titleRu: `Диалог урока ${lessonId}`,
    titleEs: `Diálogo de la lección ${lessonId}`,
    goalRu: `Используй фразы и конструкции урока ${lessonId} в короткой живой сцене`,
    goalEs: `Usa las frases y construcciones de la lección ${lessonId} en una escena breve y realista`,
    role: 'a patient English practice partner',
    setting: `a simple real-life scene based on lesson ${lessonId}`,
    persona:
      'Your name is Leo. You are a warm, encouraging language buddy who is genuinely happy to practise with the learner. ' +
      'You celebrate small wins, keep the mood light, and gently nudge them to reuse the lesson phrases.',
    goalEn:
      `Practice a realistic short conversation using phrases and grammar from lesson ${lessonId}. ` +
      `Useful lesson phrases: ${usefulPhrases}. ` +
      'Steer the learner to reuse these phrases naturally. Keep replies short and beginner-friendly.',
    cefr: lessonId <= 8 ? 'A1' : lessonId <= 20 ? 'A2' : 'B1',
    icon: 'compass-outline',
    active: true,
    sourceLessonId: lessonId,
    requiredPhraseIds: [],
    nextStepHintRu: 'Ответь одной короткой фразой из урока или похожей конструкцией.',
    nextStepHintEs: 'Responde con una frase corta de la lección o una construcción parecida.',
  };
}

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

// Полностью локализованный (8 языков) текст системной плашки ошибки диалога.
function dialogErrorText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Не удалось получить ответ. Проверь интернет.',
    uk: 'Не вдалося отримати відповідь. Перевір інтернет.',
    es: 'No se pudo obtener la respuesta. Revisa tu conexión.',
    'pt-BR': 'Não foi possível obter a resposta. Verifique sua internet.',
    vi: 'Không nhận được phản hồi. Hãy kiểm tra kết nối mạng.',
    id: 'Gagal mendapatkan balasan. Periksa koneksi internetmu.',
    tr: 'Yanıt alınamadı. İnternet bağlantını kontrol et.',
    pl: 'Nie udało się uzyskać odpowiedzi. Sprawdź internet.',
  });
}

// Полностью локализованная (8 языков) подпись кнопки «Повторить».
function dialogRetryLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Повторить',
    uk: 'Повторити',
    es: 'Reintentar',
    'pt-BR': 'Tentar de novo',
    vi: 'Thử lại',
    id: 'Coba lagi',
    tr: 'Tekrar dene',
    pl: 'Spróbuj ponownie',
  });
}

export default function AiDialogSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  // Доступ к фиче «ИИ-диалоги» с учётом «Пульта»: true → пейвол не показываем
  // (фича переведена в «Фри»). Серверный isPremium ниже остаётся СЫРЫМ premium —
  // «Фри» снимает замок, но НЕ выдаёт премиум-квоту реплик.
  const dialogAccess = useFeatureAccess('ai_dialog');
  const router = useRouter();
  const { speak } = useAudio();
  const params = useLocalSearchParams<{ scenarioId?: string; lessonId?: string }>();

  const scenario = useMemo(
    () => {
      const lessonId = parseInt(String(params.lessonId ?? ''), 10);
      const lessonScenario = buildLessonDialogScenario(lessonId);
      if (lessonScenario && String(params.scenarioId ?? '') === lessonScenario.id) return lessonScenario;
      return getScenarioById(String(params.scenarioId ?? 'coffee')) ?? getScenarioById('coffee')!;
    },
    [params.scenarioId, params.lessonId],
  );

  // Имя собеседника для шапки-мессенджера: достаём из persona, иначе пусто.
  const personaName = useMemo(() => extractPersonaName(scenario.persona), [scenario.persona]);

  // Первая реплика собеседника (приветствие) присутствует СРАЗУ, с первого кадра —
  // через ленивый инициализатор, а не через эффект (раньше эффект мог не сработать
  // при гонке/двойном маунте → «первой реплики нет»). Приветствие УНИКАЛЬНОЕ для
  // каждого сценария (имя персонажа + место + роль), а не одинаковое для всех.
  const [messages, setMessages] = useState<UiMessage[]>(() => [
    { role: 'assistant', text: buildScenarioGreeting(scenario) },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  // Ошибка ИИ (сеть/таймаут) показывается НЕ как реплика персонажа, а отдельной
  // системной плашкой с кнопкой «Повторить». Храним текст последней отправки,
  // чтобы повтор переслал именно её.
  const [lastError, setLastError] = useState(false);
  const lastSentTextRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);

  // ── Перевод реплик собеседника ────────────────────────────────────────────
  // translations: кэш «индекс реплики → перевод» (повторный флип бесплатен).
  // flipped: какие реплики сейчас показаны в переводе (а не в оригинале).
  // translatingIdx: индекс реплики, перевод которой грузится прямо сейчас.
  // translateUsed: сколько из TRANSLATE_LIMIT_PER_DIALOG уже потрачено.
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [translateUsed, setTranslateUsed] = useState(0);
  // Индекс реплики, перевод которой только что упал (сеть/функция/лимит). Показываем
  // под ней плашку «не удалось · повторить» — чтобы сбой не выглядел как «ничего».
  const [translateErrorIdx, setTranslateErrorIdx] = useState<number | null>(null);
  const translateRemaining = computeTranslateRemaining(translateUsed, TRANSLATE_LIMIT_PER_DIALOG);

  // ── «Диалог как игра»: цель · настроение · исход ──────────────────────────
  // Под-цели и темперамент выводим из каталога (или явные поля сценария) —
  // шлём на сервер, он включает игровой режим и возвращает turnState каждый ход.
  const objectives = useMemo<DialogObjective[]>(() => scenarioObjectives(scenario), [scenario]);
  const temperament = useMemo(() => scenarioTemperament(scenario), [scenario]);
  const gameEnabled = objectives.length > 0;

  // mood — настроение собеседника 0..100 (смайл в шапке). objectivesMet — id
  // выполненных под-целей (галочки). outcome — исход (модал при терминальном).
  const [mood, setMood] = useState(DEFAULT_MOOD);
  const [objectivesMet, setObjectivesMet] = useState<Set<string>>(() => new Set());
  const [outcome, setOutcome] = useState<DialogOutcome>('ongoing');
  const [characterReaction, setCharacterReaction] = useState('');
  const [coachTips, setCoachTips] = useState<string[]>([]);

  // Открыть/скрыть перевод реплики i. Первый показ новой реплики тратит лимит и
  // зовёт сервер; дальше флип идёт из кэша мгновенно и лимит не трогает. Само
  // решение делегировано чистой decideTranslateAction (покрыта unit-тестами).
  const toggleTranslation = useCallback(
    async (i: number, rawText: string) => {
      hapticTap();
      const action = decideTranslateAction({
        hasTranslation: translations[i] != null,
        isFlipped: flipped[i] === true,
        used: translateUsed,
        isBusy: translatingIdx != null,
        limit: TRANSLATE_LIMIT_PER_DIALOG,
      });
      if (action === 'hide') {
        setFlipped((prev) => ({ ...prev, [i]: false }));
        return;
      }
      if (action === 'show_cached') {
        setFlipped((prev) => ({ ...prev, [i]: true }));
        return;
      }
      if (action === 'noop') return;
      // action === 'fetch': новая реплика, нужен серверный вызов.

      const clean = stripMarkers(rawText);
      if (!clean) return;

      setTranslatingIdx(i);
      setTranslateErrorIdx(null);
      void trackEvent('ai_dialog_translate_requested', {
        scenarioId: scenario.id,
        usedBefore: translateUsed,
      });
      try {
        const res = await callPremiumDialogTranslate({
          text: clean,
          targetLang: lang,
          scenarioId: scenario.id,
        });
        const translation = String(res.translation ?? '').trim();
        if (!translation) throw new Error('empty_translation');
        setTranslations((prev) => ({ ...prev, [i]: translation }));
        setFlipped((prev) => ({ ...prev, [i]: true }));
        // Лимит тратим ТОЛЬКО при успешном переводе (сбой не сжигает попытку).
        setTranslateUsed((prev) => prev + 1);
        void trackEvent('ai_dialog_translate_shown', {
          scenarioId: scenario.id,
          cached: res.cached === true,
        });
      } catch (error) {
        // Видимая обратная связь вместо «загрузка → ничего»: помечаем реплику
        // как «перевод не удался», под ней покажется плашка с кнопкой «Повторить».
        setTranslateErrorIdx(i);
        void trackEvent('ai_dialog_translate_error', { scenarioId: scenario.id });
      } finally {
        setTranslatingIdx(null);
      }
    },
    [flipped, translations, translatingIdx, translateUsed, lang, scenario.id],
  );

  const userExchanges = messages.filter((m) => m.role === 'user').length;

  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [messages.length, enterAnim]);

  const buildHistory = useCallback((): DialogChatTurn[] => {
    return messages.map((m) => ({ role: m.role, content: m.text }));
  }, [messages]);

  // Применяет turnState из ответа сервера: настроение, выполненные цели, исход.
  // При терминальном исходе сохраняем реакцию персонажа + советы и завершаем
  // диалог (модал-вердикт). Битый/пустой turnState → нейтральный, диалог идёт.
  const applyTurnState = useCallback(
    (raw: unknown) => {
      if (!gameEnabled) return;
      const ts = parseTurnState(raw);
      setMood(ts.mood);
      if (ts.objectivesMet.length > 0) {
        setObjectivesMet((prev) => {
          const next = new Set(prev);
          ts.objectivesMet.forEach((id) => next.add(id));
          return next;
        });
      }
      if (isTerminalOutcome(ts.outcome)) {
        setOutcome(ts.outcome);
        setCharacterReaction(ts.characterReaction);
        setCoachTips(ts.coachTips);
        setEnded(true);
        void trackEvent('ai_dialog_outcome', { scenarioId: scenario.id, outcome: ts.outcome });
        void markDialogCompleted(scenario.id);
      }
    },
    [gameEnabled, scenario.id],
  );

  // Игровые поля для запроса (под-цели в формате сервера + темперамент).
  const gameRequestFields = useMemo(
    () =>
      gameEnabled
        ? {
            objectives: objectives.map((o) => ({ id: o.id, en: o.en || o.id })),
            temperament,
          }
        : {},
    [gameEnabled, objectives, temperament],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || ended) return;
      hapticTap();

      // Является ли этот ход тем самым первым ходом, что тратит единственный
      // пожизненный бесплатный диалог. Списание — ТОЛЬКО после успешного ответа
      // (см. ниже), чтобы сбой сети не сжигал бесплатную попытку.
      let consumesFreeDialog = false;

      // Первый ход не-premium: тратит ЕДИНСТВЕННЫЙ пожизненный бесплатный диалог.
      // Если он уже потрачен — полный замок (никаких «реплик в день»).
      if (userExchanges === 0 && !dialogAccess) {
        if (!(await hasFreeDialogLeft())) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
        consumesFreeDialog = true;
      }

      const exchangeIndex = userExchanges + 1;
      void trackEvent('ai_dialog_message_sent', { scenarioId: scenario.id, exchangeIndex });

      const history = buildHistory();
      lastSentTextRef.current = trimmed;
      setLastError(false);
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);
      try {
        const res = await callPremiumDialogSend({
          mode: 'scenario',
          userText: trimmed,
          cefr: scenario.cefr,
          history,
          role: scenario.role,
          setting: scenario.setting,
          goalEn: scenario.goalEn,
          persona: scenario.persona,
          scenarioId: scenario.id,
          interfaceLang: lang,
          isPremium: hasPremiumAccess,
          ...gameRequestFields,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        // Игровое состояние хода (настроение/цели/исход). Безопасно при отсутствии.
        applyTurnState(res.turnState);
        // Бесплатный диалог списываем ТОЛЬКО здесь — после успешного ответа ИИ.
        // Сервер ставит тот же пожизненный флаг; это мгновенный локальный UX-замок.
        if (consumesFreeDialog) void markFreeDialogUsed();
      } catch (error) {
        // Ошибка сети/таймаута: НЕ пишем её как реплику персонажа и НЕ списываем
        // бесплатную попытку — показываем системную плашку с кнопкой «Повторить».
        void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, exchangeIndex });
        setLastError(true);
      } finally {
        setSending(false);
      }
    },
    [sending, ended, hasPremiumAccess, dialogAccess, userExchanges, buildHistory, scenario, router, lang, gameRequestFields, applyTurnState],
  );

  // Повтор последней отправки после ошибки сети. Реплика пользователя уже в чате,
  // поэтому НЕ пушим её заново — только заново зовём ИИ с той же историей.
  const retryLastSend = useCallback(async () => {
    if (sending || ended) return;
    const trimmed = lastSentTextRef.current.trim();
    if (!trimmed) return;
    hapticTap();
    void trackEvent('ai_dialog_retry', { scenarioId: scenario.id });

    // История БЕЗ последней реплики пользователя (она уже в messages, передаём как userText).
    const priorMessages = messages.slice(0, -1);
    const history: DialogChatTurn[] = priorMessages.map((m) => ({ role: m.role, content: m.text }));

    // Списываем бесплатный диалог только при успехе первого хода (как в send).
    const consumesFreeDialog =
      !dialogAccess && messages.filter((m) => m.role === 'user').length === 1;

    setLastError(false);
    setSending(true);
    try {
      const res = await callPremiumDialogSend({
        mode: 'scenario',
        userText: trimmed,
        cefr: scenario.cefr,
        history,
        role: scenario.role,
        setting: scenario.setting,
        goalEn: scenario.goalEn,
        persona: scenario.persona,
        scenarioId: scenario.id,
        interfaceLang: lang,
        isPremium: hasPremiumAccess,
        ...gameRequestFields,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
      applyTurnState(res.turnState);
      if (consumesFreeDialog) void markFreeDialogUsed();
    } catch (error) {
      void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, retry: true });
      setLastError(true);
    } finally {
      setSending(false);
    }
  }, [sending, ended, hasPremiumAccess, dialogAccess, messages, scenario, lang, gameRequestFields, applyTurnState]);

  // Приветствие уже стоит в начальном состоянии. Здесь — только телеметрия старта
  // (один раз на маунт). OpenAI зовём только после первой реплики пользователя.
  useEffect(() => {
    void trackEvent('ai_dialog_started', { scenarioId: scenario.id, cefr: scenario.cefr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Параметры маршрута могут «доехать» после первого кадра (expo-router) — тогда
  // ленивый сид взял дефолтный сценарий. Пока пользователь НИЧЕГО не написал (в чате
  // только приветствие), обновляем приветствие под реально открытый сценарий.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev;
      const fresh = buildScenarioGreeting(scenario);
      if (prev[0].text === fresh) return prev;
      return [{ role: 'assistant', text: fresh }];
    });
  }, [scenario]);

  const finishDialog = useCallback(() => {
    if (ended || userExchanges <= 0) return;
    hapticTap();
    setEnded(true);
    void trackEvent('ai_dialog_completed', { scenarioId: scenario.id, exchanges: userExchanges });
    // Локально помечаем сценарий пройденным — список диалогов покажет «Пройдено»
    // и сдвинет блок «Продолжить» на следующий сценарий. Идемпотентно + best-effort.
    void markDialogCompleted(scenario.id);
    // Бесплатный диалог уже отмечен использованным на первой реплике — здесь не дублируем.
  }, [ended, scenario.id, userExchanges]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    if (!ended && userExchanges > 0) {
      void trackEvent('ai_dialog_abandoned', { scenarioId: scenario.id, atExchange: userExchanges });
    }
    safeRouterBack(router, '/ai_dialog_home' as any);
  }, [router, ended, userExchanges, scenario.id]);

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — мессенджер-стиль: аватар собеседника + имя + статус «онлайн» */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 4,
            borderBottomWidth: 0.5,
            borderBottomColor: t.border,
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад',
              uk: 'Назад',
              es: 'Atrás',
              'pt-BR': 'Voltar',
              vi: 'Quay lại',
              id: 'Kembali',
              tr: 'Geri',
              pl: 'Wstecz',
            })}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>

          {/* Аватар: иконка сценария на акцентном круге */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              borderWidth: 1,
              borderColor: t.accent + '40',
            }}
          >
            <Ionicons name={scenario.icon as any} size={20} color={t.accent} />
            {/* «онлайн»-точка */}
            <View
              style={{
                position: 'absolute',
                right: -1,
                bottom: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: t.correct,
                borderWidth: 2,
                borderColor: t.bgPrimary,
              }}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Смайл настроения собеседника (игровой режим): 😊→😐→😠 без цифр. */}
              {gameEnabled && !ended && (
                <Text
                  accessibilityLabel={triLang(lang, {
                    ru: 'Настроение собеседника',
                    uk: 'Настрій співрозмовника',
                    es: 'Ánimo del interlocutor',
                    'pt-BR': 'Humor do interlocutor',
                    vi: 'Tâm trạng người kia',
                    id: 'Suasana hati lawan bicara',
                    tr: 'Karşıdakinin ruh hâli',
                    pl: 'Nastrój rozmówcy',
                  })}
                  style={{ fontSize: f.body }}
                >
                  {moodToFace(mood)}
                </Text>
              )}
              <Text
                style={{ fontWeight: '800', color: t.textPrimary, fontSize: f.body, flexShrink: 1 }}
                numberOfLines={1}
              >
                {personaName || dialogScenarioTitle(scenario, lang)}
              </Text>
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }} numberOfLines={1}>
              {personaName
                ? dialogScenarioTitle(scenario, lang)
                : triLang(lang, {
                  ru: 'на связи',
                  uk: 'на зв’язку',
                  es: 'en línea',
                  'pt-BR': 'online',
                  vi: 'đang trực tuyến',
                  id: 'online',
                  tr: 'çevrim içi',
                  pl: 'online',
                })}
            </Text>
          </View>

          {/* Счётчик переводов: 3 точки, что гаснут по мере использования.
              Видим, пока диалог идёт — показывает, сколько переводов осталось. */}
          {!ended && (
            <View
              accessibilityRole="text"
              accessibilityLabel={triLang(lang, {
                ru: `Переводов осталось: ${translateRemaining} из ${TRANSLATE_LIMIT_PER_DIALOG}`,
                uk: `Перекладів залишилось: ${translateRemaining} з ${TRANSLATE_LIMIT_PER_DIALOG}`,
                es: `Traducciones restantes: ${translateRemaining} de ${TRANSLATE_LIMIT_PER_DIALOG}`,
                'pt-BR': `Traduções restantes: ${translateRemaining} de ${TRANSLATE_LIMIT_PER_DIALOG}`,
                vi: `Còn lại ${translateRemaining}/${TRANSLATE_LIMIT_PER_DIALOG} bản dịch`,
                id: `Sisa terjemahan: ${translateRemaining} dari ${TRANSLATE_LIMIT_PER_DIALOG}`,
                tr: `Kalan çeviri: ${translateRemaining}/${TRANSLATE_LIMIT_PER_DIALOG}`,
                pl: `Pozostałe tłumaczenia: ${translateRemaining} z ${TRANSLATE_LIMIT_PER_DIALOG}`,
              })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginRight: 8,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
              }}
            >
              <Ionicons name="language-outline" size={13} color={t.textSecond} />
              {Array.from({ length: TRANSLATE_LIMIT_PER_DIALOG }).map((_, di) => {
                const spent = di >= translateRemaining;
                return (
                  <View
                    key={di}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: spent ? t.border : t.accent,
                      opacity: spent ? 0.5 : 1,
                    }}
                  />
                );
              })}
            </View>
          )}

          {!ended && userExchanges > 0 ? (
            <TouchableOpacity
              onPress={finishDialog}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Завершить диалог',
                uk: 'Завершити діалог',
                es: 'Terminar diálogo',
                'pt-BR': 'Encerrar diálogo',
                vi: 'Kết thúc cuộc đối thoại',
                id: 'Akhiri dialog',
                tr: 'Diyaloğu bitir',
                pl: 'Zakończ dialog',
              })}
              style={{
                minHeight: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 14,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Завершить',
                  uk: 'Завершити',
                  es: 'Terminar',
                  'pt-BR': 'Encerrar',
                  vi: 'Kết thúc',
                  id: 'Akhiri',
                  tr: 'Bitir',
                  pl: 'Zakończ',
                })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 8 }} />
          )}
        </View>

        {/* Пробный бесплатный диалог — короткая плашка-«подарок». */}
        {!hasPremiumAccess && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginHorizontal: 16,
              marginTop: 8,
              alignSelf: 'flex-start',
              backgroundColor: t.bgCard,
              borderWidth: 0.5,
              borderColor: t.border,
              borderRadius: 11,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Ionicons name="gift-outline" size={13} color={t.accent} />
            <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Пробный диалог — бесплатно',
                uk: 'Пробний діалог — безкоштовно',
                es: 'Diálogo de prueba — gratis',
                'pt-BR': 'Diálogo de teste — grátis',
                vi: 'Đối thoại dùng thử — miễn phí',
                id: 'Dialog uji coba — gratis',
                tr: 'Deneme diyaloğu — ücretsiz',
                pl: 'Dialog próbny — gratis',
              })}
            </Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              // Анимируем появление ТОЛЬКО для приходящих позже реплик. Самое первое
              // приветствие (i === 0) всегда видно сразу — никакого fade из opacity:0,
              // чтобы «первая реплика» гарантированно отображалась.
              const isLast = i === messages.length - 1 && i > 0;
              return (
                <Animated.View
                  key={i}
                  style={{
                    opacity: isLast ? enterAnim : 1,
                    transform: [
                      {
                        translateY: isLast
                          ? enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                          : 0,
                      },
                    ],
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  {/* Мини-аватар собеседника слева от его пузыря */}
                  {!isUser && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: t.accentBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name={scenario.icon as any} size={15} color={t.accent} />
                    </View>
                  )}

                  {isUser ? (
                    // Пузырь пользователя — цветной, справа, с тенью и «хвостиком».
                    <View
                      style={{
                        backgroundColor: t.accent,
                        borderRadius: 20,
                        borderBottomRightRadius: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 11,
                        maxWidth: '82%',
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: t.correctText,
                          fontSize: f.bodyLg,
                          fontWeight: '600',
                          lineHeight: Math.round(f.bodyLg * 1.4),
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {m.text}
                      </Text>
                    </View>
                  ) : (
                    // Пузырь собеседника — слева, светлая карточка, «хвостик» снизу-слева.
                    <View
                      style={{
                        backgroundColor: t.bgCard,
                        borderRadius: 20,
                        borderBottomLeftRadius: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderWidth: 0.5,
                        borderColor: t.border,
                        maxWidth: '82%',
                        flexShrink: 1,
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 1 }}>
                        {flipped[i] && translations[i] != null ? (
                          // Перевод на язык интерфейса: обычный текст, без подсветки
                          // ключевых фраз (это другой язык) и без озвучки (TTS — для EN).
                          <Text
                            style={{
                              color: t.textPrimary,
                              fontSize: f.bodyLg,
                              fontWeight: '600',
                              flexShrink: 1,
                              fontStyle: 'italic',
                              lineHeight: Math.round(f.bodyLg * 1.4),
                            }}
                            maxFontSizeMultiplier={1.2}
                          >
                            {translations[i]}
                          </Text>
                        ) : (
                          <>
                            <Text
                              style={{
                                color: t.textPrimary,
                                fontSize: f.bodyLg,
                                fontWeight: '600',
                                // flexShrink (не flex:1): на Android `flex:1` внутри row-обёртки,
                                // вложенной в пузырь с maxWidth без базовой ширины, схлопывал
                                // текст в нулевую ширину — реплика была невидимой, но звук/тап
                                // работали. flexShrink даёт тексту ширину по контенту с переносом.
                                flexShrink: 1,
                                lineHeight: Math.round(f.bodyLg * 1.4),
                              }}
                              maxFontSizeMultiplier={1.2}
                            >
                              {parseKeyPhrases(m.text).map((seg, si) =>
                                seg.isKey ? (
                                  // Ключевая фраза: подсвечена акцентом + тап озвучивает ИМЕННО ЕЁ.
                                  <Text
                                    key={si}
                                    onPress={() => {
                                      hapticTap();
                                      void trackEvent('ai_dialog_phrase_tapped', {
                                        scenarioId: scenario.id,
                                        phrase: seg.text.slice(0, 60),
                                      });
                                      speak(seg.text, undefined, { language: 'en-US', voice: '' });
                                    }}
                                    style={{
                                      color: t.accent,
                                      fontWeight: '800',
                                      textDecorationLine: 'underline',
                                    }}
                                  >
                                    {seg.text}
                                  </Text>
                                ) : (
                                  // Обычный текст: тап озвучивает всю реплику (как раньше).
                                  <Text
                                    key={si}
                                    onPress={() => {
                                      hapticTap();
                                      void trackEvent('ai_dialog_tts_used', { scenarioId: scenario.id });
                                      speak(stripMarkers(m.text), undefined, { language: 'en-US', voice: '' });
                                    }}
                                  >
                                    {seg.text}
                                  </Text>
                                ),
                              )}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                hapticTap();
                                void trackEvent('ai_dialog_tts_used', { scenarioId: scenario.id });
                                speak(stripMarkers(m.text), undefined, { language: 'en-US', voice: '' });
                              }}
                              activeOpacity={0.6}
                              accessibilityRole="button"
                              accessibilityLabel={triLang(lang, {
                                ru: 'Озвучить реплику',
                                uk: 'Озвучити репліку',
                                es: 'Reproducir frase',
                                'pt-BR': 'Reproduzir fala',
                                vi: 'Phát câu trả lời',
                                id: 'Putar ucapan',
                                tr: 'Repliği seslendir',
                                pl: 'Odtwórz kwestię',
                              })}
                              style={{
                                width: 44,
                                minHeight: 44,
                                flexShrink: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: -8,
                                marginRight: -10,
                              }}
                            >
                              <Ionicons name="volume-medium-outline" size={20} color={t.textSecond} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Кнопка «Показать/Скрыть перевод» под репликой собеседника.
                          Грузится — skeleton-shimmer (правило: загрузка = скелетон, не спиннер).
                          Прячется, когда лимит исчерпан И эту реплику ещё не открывали. */}
                      {(() => {
                        const isTranslating = translatingIdx === i;
                        const hasTranslation = translations[i] != null;
                        const isFlipped = flipped[i] === true;
                        // Скрываем кнопку только у НЕ открытых реплик при исчерпанном лимите.
                        if (!shouldShowTranslateButton(hasTranslation, translateUsed, TRANSLATE_LIMIT_PER_DIALOG)) {
                          return null;
                        }
                        if (isTranslating) {
                          return (
                            <View style={{ marginTop: 8 }}>
                              <SkeletonBlock width={120} height={13} borderRadius={6} />
                            </View>
                          );
                        }
                        // Перевод этой реплики только что упал — показываем причину и
                        // кнопку «Повторить» (а не пустоту). Лимит не был потрачен.
                        if (translateErrorIdx === i && !hasTranslation) {
                          return (
                            <TouchableOpacity
                              onPress={() => void toggleTranslation(i, m.text)}
                              disabled={translatingIdx != null}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={triLang(lang, {
                                ru: 'Не удалось перевести. Повторить',
                                uk: 'Не вдалося перекласти. Повторити',
                                es: 'No se pudo traducir. Reintentar',
                                'pt-BR': 'Não foi possível traduzir. Tentar de novo',
                                vi: 'Không dịch được. Thử lại',
                                id: 'Gagal menerjemahkan. Coba lagi',
                                tr: 'Çevrilemedi. Tekrar dene',
                                pl: 'Nie udało się przetłumaczyć. Spróbuj ponownie',
                              })}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                marginTop: 8,
                                alignSelf: 'flex-start',
                              }}
                            >
                              <Ionicons name="refresh" size={14} color={t.textMuted} />
                              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}>
                                {triLang(lang, {
                                  ru: 'Не удалось · Повторить',
                                  uk: 'Не вдалося · Повторити',
                                  es: 'Error · Reintentar',
                                  'pt-BR': 'Falhou · Tentar de novo',
                                  vi: 'Lỗi · Thử lại',
                                  id: 'Gagal · Coba lagi',
                                  tr: 'Hata · Tekrar dene',
                                  pl: 'Błąd · Ponów',
                                })}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                        const label = isFlipped
                          ? triLang(lang, {
                              ru: 'Скрыть перевод',
                              uk: 'Сховати переклад',
                              es: 'Ocultar traducción',
                              'pt-BR': 'Ocultar tradução',
                              vi: 'Ẩn bản dịch',
                              id: 'Sembunyikan terjemahan',
                              tr: 'Çeviriyi gizle',
                              pl: 'Ukryj tłumaczenie',
                            })
                          : triLang(lang, {
                              ru: 'Показать перевод',
                              uk: 'Показати переклад',
                              es: 'Mostrar traducción',
                              'pt-BR': 'Mostrar tradução',
                              vi: 'Hiện bản dịch',
                              id: 'Tampilkan terjemahan',
                              tr: 'Çeviriyi göster',
                              pl: 'Pokaż tłumaczenie',
                            });
                        return (
                          <TouchableOpacity
                            onPress={() => void toggleTranslation(i, m.text)}
                            disabled={translatingIdx != null}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: 8,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Ionicons
                              name={isFlipped ? 'swap-horizontal' : 'language-outline'}
                              size={14}
                              color={t.accent}
                            />
                            <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '800' }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  )}
                </Animated.View>
              );
            })}

            {sending && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: t.accentBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons name={scenario.icon as any} size={15} color={t.accent} />
                </View>
                <AiTypingBubble
                  bubbleColor={t.bgCard}
                  borderColor={t.border}
                  dotColor={t.accent}
                  glowColor={t.accent + '18'}
                />
              </View>
            )}

            {/* Системная плашка ошибки ИИ — НЕ реплика персонажа (без аватара/озвучки),
                по центру, с кнопкой «Повторить» (повторяет последнюю отправку). */}
            {lastError && !sending && (
              <View
                style={{
                  alignSelf: 'center',
                  maxWidth: '90%',
                  alignItems: 'center',
                  backgroundColor: t.bgSurface,
                  borderRadius: 14,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Ionicons name="cloud-offline-outline" size={16} color={t.textMuted} />
                  <Text
                    style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {dialogErrorText(lang)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void retryLastSend()}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={dialogRetryLabel(lang)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: t.accent,
                  }}
                >
                  <Ionicons name="refresh" size={16} color={t.correctText} />
                  <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.label }}>
                    {dialogRetryLabel(lang)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Модал-вердикт «диалога как игры»: исход + реакция персонажа +
                чек-лист целей + разбор. Показывается, когда диалог завершился
                терминальным исходом (success/lost_patience/stalled). */}
            {ended && gameEnabled && isTerminalOutcome(outcome) && (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 18,
                  padding: 18,
                  borderWidth: 2,
                  borderColor:
                    outcome === 'success'
                      ? t.correct
                      : outcome === 'lost_patience'
                        ? t.wrong
                        : t.border,
                  marginTop: 6,
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: f.h2 }}>
                    {outcome === 'success' ? '🎉' : outcome === 'lost_patience' ? '😠' : '💤'}
                  </Text>
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', flex: 1 }}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {outcomeTitle(outcome, lang)}
                  </Text>
                </View>

                {/* Реакция персонажа от 1-го лица (если пришла). */}
                {characterReaction.length > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      backgroundColor: t.bgSurface,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: t.accentBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={scenario.icon as any} size={17} color={t.accent} />
                    </View>
                    <Text
                      style={{
                        color: t.textSecond,
                        fontSize: f.sub,
                        fontStyle: 'italic',
                        flex: 1,
                        lineHeight: Math.round(f.sub * 1.4),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {personaName ? `${personaName}: ` : ''}
                      {characterReaction}
                    </Text>
                  </View>
                )}

                {/* Чек-лист под-целей: выполнено / упущено. */}
                {objectives.length > 0 && (
                  <View style={{ marginBottom: coachTips.length > 0 ? 12 : 0 }}>
                    {objectives.map((o) => {
                      const done = objectivesMet.has(o.id);
                      return (
                        <View
                          key={o.id}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}
                        >
                          <Ionicons
                            name={done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={done ? t.correct : t.textMuted}
                          />
                          <Text
                            style={{
                              color: done ? t.textPrimary : t.textMuted,
                              fontSize: f.sub,
                              flex: 1,
                              textDecorationLine: done ? 'none' : 'none',
                            }}
                            numberOfLines={2}
                          >
                            {o.labelRu}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Разбор «что сказать в следующий раз». */}
                {coachTips.length > 0 && (
                  <View
                    style={{
                      backgroundColor: t.accentBg,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Ionicons name="bulb-outline" size={15} color={t.accent} />
                      <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900' }}>
                        {triLang(lang, {
                          ru: 'На будущее',
                          uk: 'На майбутнє',
                          es: 'Para la próxima',
                          'pt-BR': 'Para a próxima',
                          vi: 'Lần sau',
                          id: 'Untuk lain kali',
                          tr: 'Bir dahaki sefere',
                          pl: 'Na przyszłość',
                        })}
                      </Text>
                    </View>
                    {coachTips.map((tip, ti) => (
                      <Text
                        key={ti}
                        style={{
                          color: t.textSecond,
                          fontSize: f.sub,
                          lineHeight: Math.round(f.sub * 1.4),
                          marginTop: ti === 0 ? 0 : 4,
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Действия: ещё раз / к диалогам. */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      void trackEvent('ai_dialog_retry_scenario', { scenarioId: scenario.id, outcome });
                      router.replace({
                        pathname: '/ai_dialog_session',
                        params: { scenarioId: scenario.id },
                      } as never);
                    }}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.accent,
                    }}
                  >
                    <Text style={{ color: t.correctText, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'Ещё раз',
                        uk: 'Ще раз',
                        es: 'Otra vez',
                        'pt-BR': 'De novo',
                        vi: 'Lần nữa',
                        id: 'Sekali lagi',
                        tr: 'Tekrar',
                        pl: 'Jeszcze raz',
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.84}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      paddingVertical: 13,
                      alignItems: 'center',
                      backgroundColor: t.bgSurface,
                      borderWidth: 0.5,
                      borderColor: t.border,
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '900', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'К диалогам',
                        uk: 'До діалогів',
                        es: 'A los diálogos',
                        'pt-BR': 'Aos diálogos',
                        vi: 'Về danh sách',
                        id: 'Ke daftar dialog',
                        tr: 'Diyaloglara',
                        pl: 'Do dialogów',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Старый «нейтральный» финал — когда игра не активна ИЛИ юзер вышел
                кнопкой «Завершить» без терминального исхода. */}
            {ended && !(gameEnabled && isTerminalOutcome(outcome)) && (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}
                  maxFontSizeMultiplier={1.2}
                >
                  {triLang(lang, {
                    ru: 'Разговор завершён',
                    uk: 'Розмову завершено',
                    es: 'Conversación terminada',
                    'pt-BR': 'Conversa encerrada',
                    vi: 'Cuộc trò chuyện đã kết thúc',
                    id: 'Percakapan selesai',
                    tr: 'Sohbet tamamlandı',
                    pl: 'Rozmowa zakończona',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
                  {triLang(lang, {
                    ru: `Твоих реплик: ${userExchanges}. Хороший шаг: ты не просто читаешь, а пробуешь говорить.`,
                    uk: `Твоїх реплік: ${userExchanges}. Хороший крок: ти не просто читаєш, а пробуєш говорити.`,
                    es: `Tus respuestas: ${userExchanges}. Buen paso: no solo lees, también intentas hablar.`,
                    'pt-BR': `Suas respostas: ${userExchanges}. Bom passo: você não só lê, também tenta falar.`,
                    vi: `Lượt trả lời của bạn: ${userExchanges}. Bước tiến tốt: bạn không chỉ đọc mà còn thử nói.`,
                    id: `Jawabanmu: ${userExchanges}. Langkah bagus: kamu tidak hanya membaca, tapi juga mencoba berbicara.`,
                    tr: `${userExchanges} yanıt verdin. Güzel adım: sadece okumuyor, konuşmayı da deniyorsun.`,
                    pl: `Twoje odpowiedzi: ${userExchanges}. Dobry krok: nie tylko czytasz, ale też próbujesz mówić.`,
                  })}
                </Text>
                {!hasPremiumAccess && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticTap();
                      router.push({
                        pathname: '/premium_modal',
                        params: { context: 'dialog_limit' },
                      } as never);
                    }}
                    activeOpacity={0.82}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                      marginTop: 14,
                      backgroundColor: '#4A9EFF',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.body }}>
                      {triLang(lang, {
                        ru: 'Продолжить без лимита',
                        uk: 'Продовжити без ліміту',
                        es: 'Continuar sin límite',
                        'pt-BR': 'Continuar sem limite',
                        vi: 'Tiếp tục không giới hạn',
                        id: 'Lanjut tanpa batas',
                        tr: 'Sınırsız devam et',
                        pl: 'Kontynuuj bez limitu',
                      })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Подсказка «Что сделать дальше» — ТОЛЬКО до первой реплики пользователя
              (userExchanges === 0): помогает начать разговор. После первого ответа
              собеседник уже реагирует на сказанное, и общая подсказка не нужна —
              дальше отталкиваемся от его реплик. */}
          {!ended && lastIsAssistant && !sending && userExchanges === 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.bgCard,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Ionicons name="bulb-outline" size={18} color={t.textSecond} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>
                    {triLang(lang, {
                      ru: 'Что сделать дальше',
                      uk: 'Що зробити далі',
                      es: 'Qué hacer ahora',
                      'pt-BR': 'O que fazer agora',
                      vi: 'Làm gì tiếp theo',
                      id: 'Apa langkah berikutnya',
                      tr: 'Şimdi ne yapmalı',
                      pl: 'Co zrobić dalej',
                    })}
                  </Text>
                  <Text
                    style={{
                      color: t.textMuted,
                      fontSize: f.sub,
                      lineHeight: Math.round(f.sub * 1.35),
                      marginTop: 4,
                    }}
                    maxFontSizeMultiplier={1.15}
                  >
                    {dialogScenarioNextStepHint(scenario, lang)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Поле ввода — пилюля + круглая кнопка отправки */}
          {!ended && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 8,
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 12,
              }}
            >
              <TextInput
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  if (lastError) setLastError(false);
                }}
                placeholder={triLang(lang, {
                  ru: 'Напиши ответ…',
                  uk: 'Напиши відповідь…',
                  es: 'Escribe tu respuesta…',
                  'pt-BR': 'Escreva uma resposta…',
                  vi: 'Viết câu trả lời…',
                  id: 'Tulis jawaban…',
                  tr: 'Yanıt yaz…',
                  pl: 'Napisz odpowiedź…',
                })}
                placeholderTextColor={t.textMuted}
                editable={!sending}
                multiline
                // iOS: Enter = «Отправить» (returnKeyType), blurOnSubmit=false держит
                // клавиатуру открытой после отправки. Android multiline трактует Enter
                // как перенос строки (поведение мессенджера) — там отправка кнопкой-стрелкой.
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => send(input)}
                style={{
                  flex: 1,
                  backgroundColor: t.bgCard,
                  borderRadius: 22,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: t.textPrimary,
                  fontSize: f.body,
                  maxHeight: 120,
                }}
                maxFontSizeMultiplier={1.2}
              />
              <TouchableOpacity
                onPress={() => send(input)}
                disabled={!input.trim() || sending}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, {
                  ru: 'Отправить',
                  uk: 'Надіслати',
                  es: 'Enviar',
                  'pt-BR': 'Enviar',
                  vi: 'Gửi',
                  id: 'Kirim',
                  tr: 'Gönder',
                  pl: 'Wyślij',
                })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: input.trim() && !sending ? t.accent : t.bgSurface,
                  opacity: input.trim() && !sending ? 1 : 0.5,
                  shadowColor: t.shadowDark,
                  shadowOpacity: input.trim() && !sending ? 0.3 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: input.trim() && !sending ? 3 : 0,
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={input.trim() && !sending ? t.correctText : t.textMuted}
                />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

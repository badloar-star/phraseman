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
  type DialogScenario,
} from './ai_dialog_scenarios';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { buildScenarioGreeting } from './ai_dialog_greeting';
import { triLang, type Lang } from '../constants/i18n';
import { getLessonData } from './lesson_data_all';
import { getLessonDialogScenarioId } from './lesson_dialog_scenarios';
import {
  callPremiumDialogSend,
  type DialogChatTurn,
} from './ai_dialog_client';
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
    goalRu: `Используй фразы и конструкции урока ${lessonId} в короткой живой сцене`,
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
          isPremium: hasPremiumAccess,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
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
    [sending, ended, hasPremiumAccess, dialogAccess, userExchanges, buildHistory, scenario, router],
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
        isPremium: hasPremiumAccess,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
      if (consumesFreeDialog) void markFreeDialogUsed();
    } catch (error) {
      void trackEvent('ai_dialog_send_error', { scenarioId: scenario.id, retry: true });
      setLastError(true);
    } finally {
      setSending(false);
    }
  }, [sending, ended, hasPremiumAccess, dialogAccess, messages, scenario]);

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
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás' })}
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
            <Text style={{ fontWeight: '800', color: t.textPrimary, fontSize: f.body }} numberOfLines={1}>
              {personaName || dialogScenarioTitle(scenario, lang)}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }} numberOfLines={1}>
              {personaName
                ? dialogScenarioTitle(scenario, lang)
                : triLang(lang, { ru: 'на связи', uk: 'на зв’язку', es: 'en línea' })}
            </Text>
          </View>

          {!ended && userExchanges > 0 ? (
            <TouchableOpacity
              onPress={finishDialog}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Завершить диалог', uk: 'Завершити діалог', es: 'Terminar diálogo' })}
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
                {triLang(lang, { ru: 'Завершить', uk: 'Завершити', es: 'Terminar' })}
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
                          accessibilityLabel={triLang(lang, { ru: 'Озвучить реплику', uk: 'Озвучити репліку', es: 'Reproducir frase' })}
                          style={{
                            width: 30,
                            minHeight: 30,
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: -4,
                            marginRight: -6,
                          }}
                        >
                          <Ionicons name="volume-medium-outline" size={18} color={t.textSecond} />
                        </TouchableOpacity>
                      </View>
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

            {ended && (
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
                  {triLang(lang, { ru: 'Разговор завершён', uk: 'Розмову завершено', es: 'Conversación terminada' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
                  {triLang(lang, {
                    ru: `Твоих реплик: ${userExchanges}. Хороший шаг: ты не просто читаешь, а пробуешь говорить.`,
                    uk: `Твоїх реплік: ${userExchanges}. Хороший крок: ти не просто читаєш, а пробуєш говорити.`,
                    es: `Tus respuestas: ${userExchanges}. Buen paso: no solo lees, también intentas hablar.`,
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
                      {triLang(lang, { ru: 'Продолжить без лимита', uk: 'Продовжити без ліміту', es: 'Continuar sin límite' })}
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
                    {triLang(lang, { ru: 'Что сделать дальше', uk: 'Що зробити далі', es: 'Qué hacer ahora' })}
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
                placeholder={triLang(lang, { ru: 'Напиши ответ…', uk: 'Напиши відповідь…', es: 'Escribe tu respuesta…' })}
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
                accessibilityLabel={triLang(lang, { ru: 'Отправить', uk: 'Надіслати', es: 'Enviar' })}
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

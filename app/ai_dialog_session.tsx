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
import { triLang } from '../constants/i18n';
import { getLessonData } from './lesson_data_all';
import { getLessonDialogScenarioId } from './lesson_dialog_scenarios';
import {
  callPremiumDialogSend,
  getPremiumDialogErrorMessage,
  type DialogChatTurn,
} from './ai_dialog_client';
import {
  hasFreeDialogLeft,
  markFreeDialogUsed,
} from './dialogs_limit_session';
import { trackEvent } from './analytics';
import { safeRouterBack } from './navigation_back';

const LOCAL_SCENARIO_GREETING = 'Hi! Let\'s practice. Start with one short English sentence, and I will keep the conversation going.';

/**
 * Достаёт имя персонажа из persona-строки («Your name is Mia. …» → «Mia»).
 * Используется как подпись и инициал аватара собеседника в шапке-мессенджере.
 * Возвращает пустую строку, если имя не задано.
 */
function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+([^.,]+)/i);
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
  const avatarInitial = (personaName || dialogScenarioTitle(scenario, lang) || '?').trim().charAt(0).toUpperCase();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
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

      // Первый ход не-premium: тратит ЕДИНСТВЕННЫЙ пожизненный бесплатный диалог.
      // Если он уже потрачен — полный замок (никаких «реплик в день»).
      if (userExchanges === 0 && !dialogAccess) {
        if (!(await hasFreeDialogLeft())) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
        // Потрачен на ПЕРВОЙ реплике (не при открытии экрана). Сервер ставит тот
        // же пожизненный флаг — это лишь мгновенный локальный UX-замок.
        void markFreeDialogUsed();
      }

      const exchangeIndex = userExchanges + 1;
      void trackEvent('ai_dialog_message_sent', { scenarioId: scenario.id, exchangeIndex });

      const history = buildHistory();
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
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: getPremiumDialogErrorMessage(error, { hasPremiumAccess, lang }) },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, ended, hasPremiumAccess, dialogAccess, userExchanges, buildHistory, scenario, router, lang],
  );

  // Локальное приветствие: OpenAI зовём только после первой реплики пользователя.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (messages.length > 0) return;
      void trackEvent('ai_dialog_started', { scenarioId: scenario.id, cefr: scenario.cefr });
      if (!cancelled) setMessages([{ role: 'assistant', text: LOCAL_SCENARIO_GREETING }]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishDialog = useCallback(() => {
    if (ended || userExchanges <= 0) return;
    hapticTap();
    setEnded(true);
    void trackEvent('ai_dialog_completed', { scenarioId: scenario.id, exchanges: userExchanges });
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

        {/* Пробный бесплатный диалог — честно говорим, что он один и без лимита реплик. */}
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
                ru: 'Пробный диалог — бесплатно, без лимита реплик',
                uk: 'Пробний діалог — безкоштовно, без ліміту реплік',
                es: 'Diálogo de prueba — gratis, sin límite de respuestas',
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
              const isLast = i === messages.length - 1;
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
                        shadowColor: t.shadowDark,
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text
                          style={{
                            color: t.textPrimary,
                            fontSize: f.bodyLg,
                            fontWeight: '600',
                            flex: 1,
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

          {/* Подсказка направления: не готовый ответ, а помощь сформулировать свою реплику. */}
          {!ended && lastIsAssistant && !sending && (
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
                onChangeText={setInput}
                placeholder={triLang(lang, { ru: 'Напиши ответ…', uk: 'Напиши відповідь…', es: 'Escribe tu respuesta…' })}
                placeholderTextColor={t.textMuted}
                editable={!sending}
                onSubmitEditing={() => send(input)}
                multiline
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

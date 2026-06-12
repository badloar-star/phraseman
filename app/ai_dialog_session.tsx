import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { getScenarioById } from './ai_dialog_scenarios';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import {
  callPremiumDialogSend,
  type DialogChatTurn,
} from './ai_dialog_client';
import {
  getFreeDialogsLeftToday,
  markFreeDialogUsed,
} from './dialogs_limit_session';
import { trackEvent } from './analytics';

const RECOMMENDED_EXCHANGES = 8;
const LOCAL_SCENARIO_GREETING = 'Hi! Let\'s practice. Start with one short English sentence, and I will keep the conversation going.';

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiDialogSession() {
  const { theme: t, f } = useTheme();
  const { hasPremiumAccess } = usePremium();
  const router = useRouter();
  const { speak } = useAudio();
  const params = useLocalSearchParams<{ scenarioId?: string }>();

  const scenario = useMemo(
    () => getScenarioById(String(params.scenarioId ?? 'coffee')) ?? getScenarioById('coffee')!,
    [params.scenarioId],
  );

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showTranslationFor, setShowTranslationFor] = useState<Record<number, boolean>>({});
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

      // первый пользовательский ход — проверяем лимит free
      if (userExchanges === 0 && !hasPremiumAccess) {
        const left = await getFreeDialogsLeftToday();
        if (left <= 0) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: scenario.id });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
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
          scenarioId: scenario.id,
          isPremium: hasPremiumAccess,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Связь прервалась. Попробуй ещё раз.' },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, ended, messages.length, hasPremiumAccess, userExchanges, buildHistory, scenario, router],
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
    if (!hasPremiumAccess) void markFreeDialogUsed();
  }, [ended, hasPremiumAccess, scenario.id, userExchanges]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    if (!ended && userExchanges > 0) {
      void trackEvent('ai_dialog_abandoned', { scenarioId: scenario.id, atExchange: userExchanges });
    }
    router.back();
  }, [router, ended, userExchanges, scenario.id]);

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — trainer-стиль */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{ fontWeight: '700', color: t.textPrimary, fontSize: f.body, flex: 1, textAlign: 'center' }}
            numberOfLines={1}
          >
            {scenario.titleRu}
          </Text>
          {!ended && userExchanges > 0 ? (
            <TouchableOpacity
              onPress={finishDialog}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Завершить диалог"
              style={{
                minHeight: 44,
                minWidth: 96,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 10,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>
                Завершить
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 96 }} />
          )}
        </View>

        {/* Цель сценария */}
        <Text
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            fontSize: f.caption,
            color: t.textMuted,
          }}
          maxFontSizeMultiplier={1.2}
        >
          Цель: {scenario.goalRu}
        </Text>
        {!ended && (
          <Text
            style={{
              paddingHorizontal: 16,
              paddingTop: 4,
              fontSize: f.caption,
              color: t.textMuted,
            }}
            maxFontSizeMultiplier={1.2}
          >
            Ориентир: около {RECOMMENDED_EXCHANGES} реплик, но можно продолжать.
          </Text>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              const showTr = !!showTranslationFor[i];
              return (
                <Animated.View
                  key={i}
                  style={{
                    opacity: i === messages.length - 1 ? enterAnim : 1,
                    transform: [
                      {
                        translateY:
                          i === messages.length - 1
                            ? enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                            : 0,
                      },
                    ],
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isUser ? t.bgSurface : t.bgCard,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 0.5,
                      borderColor: t.border,
                      marginBottom: 10,
                      alignSelf: isUser ? 'flex-end' : 'stretch',
                      maxWidth: isUser ? '88%' : '100%',
                    }}
                  >
                    {isUser ? (
                      <Text
                        style={{
                          color: t.textPrimary,
                          fontSize: f.bodyLg,
                          lineHeight: Math.round(f.bodyLg * 1.45),
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {m.text}
                      </Text>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                          <Text
                            style={{
                              color: t.textPrimary,
                              fontSize: f.bodyLg,
                              fontWeight: '700',
                              flex: 1,
                              lineHeight: Math.round(f.bodyLg * 1.45),
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
                            accessibilityLabel="Озвучить реплику"
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
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            if (!showTr) void trackEvent('ai_dialog_translation_used', { scenarioId: scenario.id });
                            setShowTranslationFor((prev) => ({ ...prev, [i]: !prev[i] }));
                          }}
                          activeOpacity={0.6}
                          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons name="language-outline" size={16} color={t.textMuted} />
                          <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                            {showTr ? 'Скрыть перевод' : 'Перевод'}
                          </Text>
                        </TouchableOpacity>
                        {showTr && (
                          <Text
                            style={{
                              color: t.textMuted,
                              fontSize: f.sub,
                              marginTop: 6,
                              lineHeight: Math.round(f.sub * 1.45),
                            }}
                            maxFontSizeMultiplier={1.2}
                          >
                            Перевод появится здесь.
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </Animated.View>
              );
            })}

            {sending && (
              <View style={{ paddingVertical: 10, alignItems: 'flex-start' }}>
                <ActivityIndicator color={t.textSecond} />
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
                  Разговор завершён
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
                  Твоих реплик: {userExchanges}. Хороший шаг: ты не просто читаешь, а пробуешь говорить.
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
                      Продолжить без лимита
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
                    Что сделать дальше
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
                    {scenario.nextStepHintRu}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Поле ввода + Отправить */}
          {!ended && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 12,
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="…или напиши свой ответ"
                placeholderTextColor={t.textMuted}
                editable={!sending}
                onSubmitEditing={() => send(input)}
                style={{
                  flex: 1,
                  backgroundColor: t.bgCard,
                  borderRadius: 16,
                  borderWidth: 0.5,
                  borderColor: t.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: t.textPrimary,
                  fontSize: f.body,
                }}
                maxFontSizeMultiplier={1.2}
              />
              <TouchableOpacity
                onPress={() => send(input)}
                disabled={!input.trim() || sending}
                activeOpacity={0.82}
                style={{
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  alignItems: 'center',
                  backgroundColor: input.trim() && !sending ? '#4A9EFF' : t.bgSurface,
                  opacity: input.trim() && !sending ? 1 : 0.5,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.body }}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

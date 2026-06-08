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
import {
  callPremiumDialogSend,
  type DialogChatTurn,
} from './ai_dialog_client';
import {
  getFreeDialogsLeftToday,
  markFreeDialogUsed,
} from './dialogs_limit_session';

const MAX_EXCHANGES = 8; // teaser-обрыв на интересном месте (free); см. план Фазы 0

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiDialogSession() {
  const { theme: t, f, themeMode } = useTheme();
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
  const progress = Math.min(1, userExchanges / MAX_EXCHANGES);

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

      // первый ход — проверяем лимит free
      if (messages.length === 0 && !hasPremiumAccess) {
        const left = await getFreeDialogsLeftToday();
        if (left <= 0) {
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
      }

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
    [sending, ended, messages.length, hasPremiumAccess, buildHistory, scenario, router],
  );

  // авто-старт: первая реплика ИИ (greeting) — отправляем скрытый системный ход
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (messages.length > 0) return;
      if (!hasPremiumAccess) {
        const left = await getFreeDialogsLeftToday();
        if (left <= 0) {
          router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
      }
      setSending(true);
      try {
        const res = await callPremiumDialogSend({
          mode: 'scenario',
          userText: '(start the conversation with your greeting)',
          cefr: scenario.cefr,
          history: [],
          role: scenario.role,
          setting: scenario.setting,
          goalEn: scenario.goalEn,
          scenarioId: scenario.id,
          isPremium: hasPremiumAccess,
        });
        if (!cancelled) setMessages([{ role: 'assistant', text: res.assistantMessage }]);
      } catch {
        if (!cancelled) {
          setMessages([{ role: 'assistant', text: 'Hi! Welcome. How can I help you today?' }]);
        }
      } finally {
        if (!cancelled) setSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // завершение по достижении лимита обменов
  useEffect(() => {
    if (userExchanges >= MAX_EXCHANGES && !ended) {
      setEnded(true);
      if (!hasPremiumAccess) void markFreeDialogUsed();
    }
  }, [userExchanges, ended, hasPremiumAccess]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    router.back();
  }, [router]);

  const progressFill = themeMode === 'compass' ? '#F2C48D' : '#40C080';
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
          <Text style={{ fontWeight: '700', color: t.textPrimary, fontSize: f.body }} numberOfLines={1}>
            {scenario.titleRu}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption }}>
            {Math.min(userExchanges, MAX_EXCHANGES)} / {MAX_EXCHANGES}
          </Text>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            marginHorizontal: 16,
            overflow: 'hidden',
            backgroundColor: t.bgSurface,
          }}
        >
          <View
            style={{
              height: '100%',
              borderRadius: 2,
              backgroundColor: progressFill,
              width: `${progress * 100}%`,
            }}
          />
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
          🎯 {scenario.goalRu}
        </Text>

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
                        <TouchableOpacity
                          onPress={() => {
                            hapticTap();
                            speak(m.text, undefined, { language: 'en-US' });
                          }}
                          activeOpacity={0.6}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        >
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
                            {m.text}
                          </Text>
                          <Ionicons name="volume-medium-outline" size={20} color={t.textSecond} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            setShowTranslationFor((prev) => ({ ...prev, [i]: !prev[i] }))
                          }
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
                  Отличный разговор! 🎉
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6 }}>
                  Ты говорил по-английски {userExchanges} раз.
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

          {/* Кнопки-подсказки (только когда ждём ответа юзера и есть реплика ИИ) */}
          {!ended && lastIsAssistant && !sending && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 8 }}>
                💡 Можно тапнуть готовый ответ:
              </Text>
              {SUGGESTED_REPLIES.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => send(sug)}
                  activeOpacity={0.82}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1.5,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    backgroundColor: t.bgCard,
                    borderColor: t.border,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {sug}
                  </Text>
                </TouchableOpacity>
              ))}
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

// Фаза 0: hardcode-подсказки под сценарий «кофе». Фаза 1 — генерация по контексту.
const SUGGESTED_REPLIES = ['A large cup, please.', 'How much is it?'];

/**
 * Голосовой ИИ-компаньон — открытый разговор с Филом (MVP-1, Wave 2).
 * План: docs/reports/ai_companion_mvp1_plan_2026-06-10.md
 *
 * Отличия от сценарного ai_dialog_session.tsx:
 * - режим 'companion' (открытый разговор, без роли/цели сценария);
 * - Фил «знает» ученика — память (профиль + слабые слова из SRS) собирается
 *   на первом ходу через buildCompanionMemory и уходит в premium_dialog;
 * - НЕТ teaser-обрыва на N ходов (это друг, а не задание) — лимит держит
 *   free-счётчик диалогов/день, как и раньше;
 * - подсветка ключевых фраз [[...]] + тап-озвучка (переиспользуем ai_dialog_markup).
 *
 * Голос (hold-to-talk + TTS) — добавляется поверх по итогам Спайка 0; здесь
 * текст-нить как фундамент. Маршрут expo-router: /ai_companion_session.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { callPremiumDialogSend, type DialogChatTurn, type DialogMemory } from './ai_dialog_client';
import { buildCompanionMemory } from './ai_companion_memory';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { getFreeDialogsLeftToday, markFreeDialogUsed } from './dialogs_limit_session';
import { trackEvent } from './analytics';

const DEFAULT_CEFR = 'A2';

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiCompanionSession() {
  const { theme: t, f } = useTheme();
  const { hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const { speak } = useAudio();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const memoryRef = useRef<DialogMemory | null>(null);

  const userTurns = messages.filter((m) => m.role === 'user').length;

  const buildHistory = useCallback(
    (): DialogChatTurn[] => messages.map((m) => ({ role: m.role, content: m.text })),
    [messages],
  );

  // Память собираем один раз (на первом обращении), потом переиспользуем.
  const ensureMemory = useCallback(async (): Promise<DialogMemory> => {
    if (memoryRef.current) return memoryRef.current;
    const mem = await buildCompanionMemory(DEFAULT_CEFR, studyTarget);
    memoryRef.current = mem;
    return mem;
  }, [studyTarget]);

  const sendToPhil = useCallback(
    async (userText: string | null, history: DialogChatTurn[]) => {
      const memory = await ensureMemory();
      return callPremiumDialogSend({
        mode: 'companion',
        userText: userText ?? '(start the conversation: greet me warmly by giving one friendly opening line and one easy question)',
        cefr: DEFAULT_CEFR,
        history,
        memory,
        isPremium: hasPremiumAccess,
      });
    },
    [ensureMemory, hasPremiumAccess],
  );

  const send = useCallback(
    async (text: string, fromSuggested = false) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      hapticTap();

      // Лимит free — на первом ходу.
      if (messages.length <= 1 && !hasPremiumAccess) {
        const left = await getFreeDialogsLeftToday();
        if (left <= 0) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: 'companion' });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
      }

      const exchangeIndex = userTurns + 1;
      void trackEvent('ai_dialog_message_sent', { scenarioId: 'companion', exchangeIndex });
      if (fromSuggested) void trackEvent('ai_dialog_suggested_tapped', { scenarioId: 'companion', exchangeIndex });

      const history = buildHistory();
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);
      try {
        const res = await sendToPhil(trimmed, history);
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        if (!hasPremiumAccess && exchangeIndex === 1) void markFreeDialogUsed();
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Связь прервалась. Попробуй ещё раз.' }]);
      } finally {
        setSending(false);
      }
    },
    [sending, messages.length, hasPremiumAccess, userTurns, buildHistory, sendToPhil, router],
  );

  // Авто-старт: Фил здоровается первым.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (messages.length > 0) return;
      if (!hasPremiumAccess) {
        const left = await getFreeDialogsLeftToday();
        if (left <= 0) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: 'companion' });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
      }
      void trackEvent('ai_dialog_started', { scenarioId: 'companion', cefr: DEFAULT_CEFR });
      setSending(true);
      try {
        const res = await sendToPhil(null, []);
        if (!cancelled) setMessages([{ role: 'assistant', text: res.assistantMessage }]);
      } catch {
        if (!cancelled) setMessages([{ role: 'assistant', text: 'Hi! Good to see you. How are you today?' }]);
      } finally {
        if (!cancelled) setSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    if (userTurns > 0) void trackEvent('ai_dialog_abandoned', { scenarioId: 'companion', atExchange: userTurns });
    router.back();
  }, [router, userTurns]);

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  const suggested = useMemo(() => ['Tell me more.', 'I’m not sure — help me.'], []);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
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
            Фил
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={i}
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
                      style={{ color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.45) }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {m.text}
                    </Text>
                  ) : (
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
                            <Text
                              key={si}
                              onPress={() => {
                                hapticTap();
                                void trackEvent('ai_dialog_phrase_tapped', {
                                  scenarioId: 'companion',
                                  phrase: seg.text.slice(0, 60),
                                });
                                speak(seg.text, undefined, { language: 'en-US' });
                              }}
                              style={{ color: t.accent, fontWeight: '800', textDecorationLine: 'underline' }}
                            >
                              {seg.text}
                            </Text>
                          ) : (
                            <Text
                              key={si}
                              onPress={() => {
                                hapticTap();
                                void trackEvent('ai_dialog_tts_used', { scenarioId: 'companion' });
                                speak(stripMarkers(m.text), undefined, { language: 'en-US' });
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
                          void trackEvent('ai_dialog_tts_used', { scenarioId: 'companion' });
                          speak(stripMarkers(m.text), undefined, { language: 'en-US' });
                        }}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ paddingTop: 2 }}
                      >
                        <Ionicons name="volume-medium-outline" size={20} color={t.textSecond} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {sending && (
              <View style={{ paddingVertical: 10, alignItems: 'flex-start' }}>
                <ActivityIndicator color={t.textSecond} />
              </View>
            )}
          </ScrollView>

          {/* Подсказки-ответы (анти-«пустой ввод») */}
          {lastIsAssistant && !sending && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
              {suggested.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => send(sug, true)}
                  activeOpacity={0.82}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1.5,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    backgroundColor: t.bgCard,
                    borderColor: t.border,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Поле ввода */}
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
              placeholder="Напиши Филу…"
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
                backgroundColor: input.trim() && !sending ? t.accent : t.bgSurface,
                opacity: input.trim() && !sending ? 1 : 0.5,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.body }}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

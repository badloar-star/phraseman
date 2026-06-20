/**
 * Голосовой ИИ-компаньон — открытый разговор с Компасом (MVP-1, Wave 2).
 * План: docs/reports/ai_companion_mvp1_plan_2026-06-10.md
 *
 * Отличия от сценарного ai_dialog_session.tsx:
 * - режим 'companion' (открытый разговор, без роли/цели сценария);
 * - Компас «знает» ученика — память (профиль + слабые слова из SRS) собирается
 *   на первом ходу через buildCompanionMemory и уходит в premium_dialog;
 * - НЕТ teaser-обрыва на N ходов (это друг, а не задание) — лимит держит
 *   free-счётчик диалогов/день, как и раньше;
 * - подсветка ключевых фраз [[...]] + тап-озвучка (переиспользуем ai_dialog_markup).
 *
 * Голос (hold-to-talk + TTS) — добавляется поверх по итогам Спайка 0; здесь
 * текст-нить как фундамент. Маршрут expo-router: /ai_companion_session.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import AiTypingBubble from '../components/AiTypingBubble';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import {
  callPremiumDialogSend,
  getPremiumDialogErrorMessage,
  type DialogChatTurn,
  type DialogMemory,
} from './ai_dialog_client';
import { buildCompanionMemory } from './ai_companion_memory';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import { hasFreeDialogLeft, markFreeDialogUsed } from './dialogs_limit_session';
import { safeRouterBack } from './navigation_back';
import { trackEvent } from './analytics';
import { triLang } from '../constants/i18n';

const DEFAULT_CEFR = 'A2';
const LOCAL_COMPANION_GREETING = 'Let\'s practice in English! What did you do today?';

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiCompanionSession() {
  const { theme: t, f } = useTheme();
  const { hasPremiumAccess } = usePremium();
  // Доступ к «ИИ-диалогам» с учётом «Пульта» (см. ai_dialog_session.tsx).
  const dialogAccess = useFeatureAccess('ai_dialog');
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const router = useRouter();
  const { speak } = useAudio();

  // Приветствие собеседника присутствует с первого кадра (ленивый инициализатор),
  // а не ставится эффектом — иначе при гонке/двойном маунте первой реплики нет.
  const [messages, setMessages] = useState<UiMessage[]>(() => [
    { role: 'assistant', text: LOCAL_COMPANION_GREETING },
  ]);
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

  const sendToTheo = useCallback(
    async (userText: string, history: DialogChatTurn[]) => {
      const memory = await ensureMemory();
      return callPremiumDialogSend({
        mode: 'companion',
        userText,
        cefr: DEFAULT_CEFR,
        history,
        memory,
        isPremium: hasPremiumAccess,
      });
    },
    [ensureMemory, hasPremiumAccess],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      hapticTap();

      // Первый ход не-premium: тратит ЕДИНСТВЕННЫЙ пожизненный бесплатный диалог
      // (общий со сценариями и ситуациями). Потрачен — полный замок.
      if (messages.length <= 1 && !dialogAccess) {
        if (!(await hasFreeDialogLeft())) {
          void trackEvent('ai_dialog_limit_hit', { scenarioId: 'companion' });
          void trackEvent('paywall_shown', { context: 'dialog_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
          return;
        }
        // Списываем на первой реплике (не при открытии). Сервер ставит тот же флаг.
        void markFreeDialogUsed();
      }

      const exchangeIndex = userTurns + 1;
      void trackEvent('ai_dialog_message_sent', { scenarioId: 'companion', exchangeIndex });

      const history = buildHistory();
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);
      try {
        const res = await sendToTheo(trimmed, history);
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
    [sending, messages.length, hasPremiumAccess, dialogAccess, userTurns, buildHistory, sendToTheo, router, lang],
  );

  // Приветствие уже в начальном состоянии. Здесь — только телеметрия старта (раз).
  useEffect(() => {
    void trackEvent('ai_dialog_started', { scenarioId: 'companion', cefr: DEFAULT_CEFR });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    if (userTurns > 0) void trackEvent('ai_dialog_abandoned', { scenarioId: 'companion', atExchange: userTurns });
    safeRouterBack(router, '/ai_dialog_home' as any);
  }, [router, userTurns]);

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';


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
          <Text style={{ fontWeight: '700', color: t.textPrimary, fontSize: f.body, flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {triLang(lang, { ru: 'Свободный разговор', uk: 'Вільна розмова', es: 'Conversación libre' })}
          </Text>
          {/* Пробный бесплатный диалог — без счётчика реплик, он один. */}
          {!hasPremiumAccess ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                minHeight: 28,
                backgroundColor: t.bgCard,
                borderWidth: 0.5,
                borderColor: t.border,
                borderRadius: 11,
                paddingHorizontal: 9,
              }}
              accessibilityLabel={triLang(lang, {
                ru: 'Пробный бесплатный диалог',
                uk: 'Пробний безкоштовний діалог',
                es: 'Diálogo de prueba gratis',
              })}
            >
              <Ionicons name="gift-outline" size={13} color={t.accent} />
              <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800' }}>
                {triLang(lang, { ru: 'проба', uk: 'проба', es: 'prueba' })}
              </Text>
            </View>
          ) : (
            <View style={{ width: 32 }} />
          )}
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
                                speak(seg.text, undefined, { language: 'en-US', voice: '' });
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
                          void trackEvent('ai_dialog_tts_used', { scenarioId: 'companion' });
                          speak(stripMarkers(m.text), undefined, { language: 'en-US', voice: '' });
                        }}
                        activeOpacity={0.6}
                        accessibilityRole="button"
                        accessibilityLabel={triLang(lang, { ru: 'Озвучить реплику', uk: 'Озвучити репліку', es: 'Reproducir frase' })}
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
                  )}
                </View>
              );
            })}

            {sending && (
              <AiTypingBubble
                bubbleColor={t.bgCard}
                borderColor={t.border}
                dotColor={t.accent}
                glowColor={t.accent + '18'}
              />
            )}
          </ScrollView>

          {/* Подсказка направления: не готовый ответ, а помощь сформулировать свою реплику. */}
          {lastIsAssistant && !sending && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: t.bgCard,
                  borderColor: t.border,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Ionicons name="bulb-outline" size={20} color={t.accent} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: t.textPrimary,
                      fontSize: f.caption,
                      fontWeight: '800',
                      marginBottom: 4,
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {triLang(lang, { ru: 'Что можно спросить', uk: 'Що можна запитати', es: 'Qué puedes preguntar' })}
                  </Text>
                  <Text
                    style={{
                      color: t.textSecond,
                      fontSize: f.body,
                      lineHeight: Math.round(f.body * 1.35),
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {triLang(lang, {
                      ru: 'Спроси про фразу, прогресс или свой следующий шаг. Можно ответить Компасу по-английски одной короткой фразой.',
                      uk: 'Запитай про фразу, прогрес або свій наступний крок. Можна відповісти Компасу англійською однією короткою фразою.',
                      es: 'Pregunta por una frase, tu progreso o el siguiente paso. También puedes responder a Compass en inglés con una frase corta.',
                    })}
                  </Text>
                </View>
              </View>
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
              placeholder={triLang(lang, {
                ru: 'Спроси о фразе или прогрессе',
                uk: 'Запитай про фразу або прогрес',
                es: 'Pregunta por una frase o tu progreso',
              })}
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

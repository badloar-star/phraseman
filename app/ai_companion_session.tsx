/**
 * Голосовой ИИ-компаньон — открытый разговор с Компасом (MVP-1, Wave 2).
 * План: docs/reports/ai_companion_mvp1_plan_2026-06-10.md
 *
 * Отличия от сценарного ai_dialog_session.tsx:
 * - режим 'companion' (открытый разговор, без роли/цели сценария);
 * - Компас «знает» ученика — память (профиль + слабые места из «Ошибок») собирается
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
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import AiTypingBubble from '../components/AiTypingBubble';
import ReportErrorButton from '../components/ReportErrorButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import {
  callPremiumDialogSend,
  warmPremiumDialog,
  getPremiumDialogErrorMessage,
  type DialogChatTurn,
  type DialogMemory,
} from './ai_dialog_client';
import { buildCompanionMemory } from './ai_companion_memory';
import { parseKeyPhrases } from './ai_dialog_markup';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { trackEvent } from './analytics';
import { triLang } from '../constants/i18n';
import { aiDialogContentAvailableForTarget, frenchAiDialogGateCopy } from './ai_dialog_target_gate';
import AiDialogConsentGate from './ai_dialog_consent_gate';

const DEFAULT_CEFR = 'A2';
const LOCAL_COMPANION_GREETING = 'Let\'s practice in English! What did you do today?';
// Свободный разговор — единственный (singleton) компаньон «Компас»; стабильный id для репортов.
const companionId = 'compass';

interface UiMessage {
  role: 'user' | 'assistant';
  text: string;
}

function AiCompanionSession() {
  const { theme: t, f } = useTheme();
  const { hasPremiumAccess, accessResolved } = usePremium();
  // Доступ к «ИИ-диалогам» с учётом «Пульта» (см. ai_dialog_session.tsx).
  const dialogAccess = useFeatureAccess('ai_dialog');
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const router = useRouter();
  const { speak } = useAudio();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const frenchGateCopy = frenchAiDialogGateCopy(lang);

  useEffect(() => {
    if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;
    void trackEvent('paywall_shown', { context: 'dialog_limit', source: 'ai_companion_direct_entry' });
    markNextNavigationAsReplace();
    router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
  }, [accessResolved, aiDialogGateOpen, dialogAccess, router]);

  // зачем: будим Cloud Run при входе к компаньону. У premiumDialogSend
  // minInstances: 0 (владелец не платит за тёплый инстанс) — без прогрева первая
  // реплика ждала бы холодного старта 2–5 сек. Здесь окно особенно удобное:
  // приветствие локальное и показано сразу, пользователь читает его и печатает
  // ответ, а инстанс в это время поднимается.
  // Греем ТОЛЬКО после подтверждения доступа — иначе будили бы сервер тем, кого
  // тут же уводит пейвол.
  useEffect(() => {
    if (!accessResolved || !dialogAccess) return;
    warmPremiumDialog();
  }, [accessResolved, dialogAccess]);

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
        interfaceLang: lang,
        studyTarget,
        isPremium: hasPremiumAccess,
      });
    },
    [ensureMemory, hasPremiumAccess, lang, studyTarget],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      if (!accessResolved) return;
      hapticTap();

      if (!dialogAccess) {
        void trackEvent('ai_dialog_limit_hit', { scenarioId: 'companion', reason: 'plus_required' });
        void trackEvent('paywall_shown', { context: 'dialog_limit' });
        markNextNavigationAsReplace();
        router.replace({ pathname: '/premium_modal', params: { context: 'dialog_limit' } } as never);
        return;
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
    [sending, hasPremiumAccess, accessResolved, dialogAccess, userTurns, buildHistory, sendToTheo, router, lang],
  );

  // Приветствие уже в начальном состоянии. Здесь — только телеметрия старта (раз).
  useEffect(() => {
    if (!aiDialogGateOpen) return;
    void trackEvent('ai_dialog_started', { scenarioId: 'companion', cefr: DEFAULT_CEFR });
  }, [aiDialogGateOpen]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    if (userTurns > 0) void trackEvent('ai_dialog_abandoned', { scenarioId: 'companion', atExchange: userTurns });
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router, userTurns]);

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  if (!aiDialogGateOpen) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={38} color={t.textMuted} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {frenchGateCopy.title}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {frenchGateCopy.body}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              hapticTap();
              router.replace('/lessons_list' as any);
            }}
            style={{
              marginTop: 22,
              backgroundColor: t.accent,
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>{frenchGateCopy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }


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
            {triLang(lang, {
              ru: 'Свободный разговор',
              uk: 'Вільна розмова',
              es: 'Conversación libre',
              'pt-BR': 'Conversa livre',
              vi: 'Trò chuyện tự do',
              id: 'Percakapan bebas',
              tr: 'Serbest sohbet',
              pl: 'Swobodna rozmowa',
            })}
          </Text>
          {/* Правый угол: флаг «Сообщить об ошибке». */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReportErrorButton
              screen="ai_companion"
              dataId={`ai_companion_${companionId ?? 'unknown'}`}
              dataText={triLang(lang, {
                ru: 'Свободный разговор с ИИ-компаньоном',
                uk: 'Вільна розмова з ШІ-компаньйоном',
                es: 'Conversación libre con el compañero de IA',
                'pt-BR': 'Conversa livre com o companheiro de IA',
                vi: 'Trò chuyện tự do với người bạn AI',
                id: 'Percakapan bebas dengan teman AI',
                tr: 'Yapay zekâ arkadaşıyla serbest sohbet',
                pl: 'Swobodna rozmowa z towarzyszem AI',
              })}
              variant="icon-flag"
              accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в диалоге', uk: 'Повідомити про помилку в діалозі', es: 'Informar de un error en el diálogo', 'pt-BR': 'Relatar erro no diálogo', vi: 'Báo lỗi trong hội thoại', id: 'Laporkan kesalahan dalam dialog', tr: 'Diyalogdaki hatayı bildir', pl: 'Zgłoś błąd w dialogu' })}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: t.bgCard,
                borderWidth: 0,
                borderColor: t.border,
              }}
            />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // H11: Android — нужен 'height', иначе клавиатура перекрывает ввод.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <ScrollView ref={scrollRef} decelerationRate="normal" style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={i}
                  style={{
                    backgroundColor: isUser ? t.bgSurface : glassFill(t.bgCard, 0.46),
                    borderRadius: 16,
                    padding: 16,
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
                            // зачем (владелец 2026-08-23): тап по обычному тексту
                            // озвучивал ВСЮ реплику целиком — «он повторяет не фразу,
                            // а текст своей реплики». Озвучка осталась только у
                            // ключевых фраз выше: там звучит именно фраза.
                            <Text key={si}>{seg.text}</Text>
                          ),
                        )}
                      </Text>
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
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: glassFill(t.bgSurface, 0.46),
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
                    {triLang(lang, {
                      ru: 'Что можно спросить',
                      uk: 'Що можна запитати',
                      es: 'Qué puedes preguntar',
                      'pt-BR': 'O que você pode perguntar',
                      vi: 'Bạn có thể hỏi gì',
                      id: 'Yang bisa kamu tanyakan',
                      tr: 'Ne sorabilirsin',
                      pl: 'O co możesz zapytać',
                    })}
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
                      'pt-BR': 'Pergunte sobre uma frase, seu progresso ou o próximo passo. Você também pode responder ao Compass em inglês com uma frase curta.',
                      vi: 'Hãy hỏi về một cụm từ, tiến độ của bạn hoặc bước tiếp theo. Bạn cũng có thể trả lời Compass bằng tiếng Anh bằng một câu ngắn.',
                      id: 'Tanyakan tentang frasa, progresmu, atau langkah berikutnya. Kamu juga bisa menjawab Compass dalam bahasa Inggris dengan satu kalimat pendek.',
                      tr: 'Bir ifade, ilerlemen veya sonraki adımın hakkında sor. Compass\'a İngilizce kısa bir cümleyle de yanıt verebilirsin.',
                      pl: 'Zapytaj o frazę, postęp albo następny krok. Możesz też odpowiedzieć Compassowi po angielsku jednym krótkim zdaniem.',
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
                ru: 'Спроси о фразе или своём пути',
                uk: 'Запитай про фразу або свій шлях',
                es: 'Pregunta por una frase o tu progreso',
                'pt-BR': 'Pergunte sobre uma frase ou seu progresso',
                vi: 'Hỏi về một cụm từ hoặc tiến độ',
                id: 'Tanyakan frasa atau progresmu',
                tr: 'Bir ifade veya ilerlemen hakkında sor',
                pl: 'Zapytaj o frazę albo postęp',
              })}
              placeholderTextColor={t.textMuted}
              editable={!sending}
              onSubmitEditing={() => send(input)}
              style={{
                flex: 1,
                backgroundColor: t.bgCard,
                borderRadius: 16,
                borderWidth: 0,
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

// зачем: тот же явный opt-in, что у ai_dialog_session.tsx — общий gate,
// т.к. это тот же тип фичи (AI-диалог) с той же формулировкой согласия.
export default function AiCompanionSessionRoute() {
  return (
    <AiDialogConsentGate>
      <AiCompanionSession />
    </AiDialogConsentGate>
  );
}

/**
 * Экран урока с Максом — текстовый тутор на каркасе MAX.
 *
 * зачем (владелец 2026-09-14): «тутор это отдельная сущность и там нет роли,
 * роль в других диалогах, а тутор там именно обучение так же как Макс ИИ тутор
 * вёл, то есть тутор сам решает что сегодня обучать или спрашивает у
 * пользователя, никогда не молчит и всегда говорит первый».
 *
 * Отличия от экрана обычного диалога (`ai_dialog_session.tsx`):
 *   • Макс пишет ПЕРВЫМ — открывающий ход уходит на сервер сразу при входе,
 *     без реплики ученика;
 *   • над чатом живёт доска с целевой фразой (инструмент MAX);
 *   • под шапкой полоса цели с мастерством 0..3, а не цели сцены;
 *   • ролевой игры нет: Макс объясняет, уточняет, приводит примеры.
 *
 * Голосовой MAX при этом остаётся запломбированным: здесь ни одного импорта из
 * его голосовой инфраструктуры, только предметные модули через сервер.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import AiTypingBubble from '../components/AiTypingBubble';
import TutorBoard from '../components/dialogs/TutorBoard';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { triLang } from '../constants/i18n';
import { DebugLogger } from './debug-logger';
import { safeRouterBack } from './navigation_back';
import { trackEvent } from './analytics';
import { parseKeyPhrases, stripMarkers } from './ai_dialog_markup';
import AiDialogConsentGate from './ai_dialog_consent_gate';
import {
  callTutorTextTurn,
  isTutorDisabledError,
  tutorGoalTitle,
  warmTutorTextTurn,
  type TutorGoalInfo,
  type TutorTools,
} from './ai_dialog_tutor_client';
import type { DialogChatTurn } from './ai_dialog_client';
import { noAndroidOutline } from '../constants/androidGlow';

interface LessonMessage {
  role: 'user' | 'assistant';
  text: string;
}

function TutorSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { hasPremiumAccess, accessResolved } = usePremium();
  const router = useRouter();
  const { speak } = useAudio();

  const [messages, setMessages] = useState<LessonMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [goal, setGoal] = useState<TutorGoalInfo | null>(null);
  const [board, setBoard] = useState<{ text: string; meaning: string } | null>(null);
  const [savedPhrases, setSavedPhrases] = useState<Set<string>>(() => new Set());
  const [lessonComplete, setLessonComplete] = useState(false);
  const [homework, setHomework] = useState<string[]>([]);
  const [errorText, setErrorText] = useState('');
  const [disabled, setDisabled] = useState(false);
  const scrollRef = useRef<FlatList<LessonMessage>>(null);
  // Открывающий ход отправляем ровно один раз за монтирование.
  const openedRef = useRef(false);
  const turnIndexRef = useRef(0);

  const cefr = goal?.level || 'A2';

  useEffect(() => {
    if (!accessResolved) return;
    warmTutorTextTurn();
  }, [accessResolved]);

  /** Применяет инструменты Макса: доска, мастерство, домашка, конец урока. */
  const applyTools = useCallback((tools: TutorTools) => {
    if (tools.board) setBoard(tools.board);
    if (tools.goalMastery != null) {
      setGoal((prev) => (prev ? { ...prev, mastery: tools.goalMastery as number } : prev));
    }
    if (tools.homework.length > 0) setHomework(tools.homework);
    if (tools.lessonComplete) setLessonComplete(true);
    DebugLogger.info('[TUTOR-TEXT] tools applied', JSON.stringify({
      board: tools.board != null,
      mastery: tools.goalMastery,
      homework: tools.homework.length,
      complete: tools.lessonComplete,
    }));
  }, []);

  /**
   * Один ход урока. `userText` пуст только на открывающем ходу — Макс говорит
   * первым, это прямое требование владельца.
   */
  const runTurn = useCallback(
    async (userText: string) => {
      if (sending) return;
      setSending(true);
      setErrorText('');
      const history: DialogChatTurn[] = messages.map((m) => ({ role: m.role, content: m.text }));
      const startedAtMs = Date.now();
      try {
        const res = await callTutorTextTurn({
          userText,
          history,
          cefr,
          interfaceLang: lang,
          studyTarget,
          goalId: goal?.id,
          turnIndex: turnIndexRef.current,
        });
        turnIndexRef.current += 1;
        setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
        if (res.goal) setGoal(res.goal);
        applyTools(res.tools);
        DebugLogger.info('[TUTOR-TEXT] turn ok', JSON.stringify({
          turnIndex: turnIndexRef.current,
          ms: Date.now() - startedAtMs,
          replyChars: res.reply.length,
          goalId: res.goal?.id ?? null,
        }));
      } catch (error) {
        // Раздел выключен флагом — это не сбой, а «ещё не выкатили».
        if (isTutorDisabledError(error)) {
          setDisabled(true);
          DebugLogger.info('[TUTOR-TEXT] section disabled by flag', 'gate_ai_text_tutor=false');
          return;
        }
        DebugLogger.error(
          'tutor_text:turn',
          error instanceof Error ? error : new Error(String(error)),
          'critical',
        );
        setErrorText(triLang(lang, {
          ru: 'Макс не ответил. Попробуй ещё раз.',
          uk: 'Макс не відповів. Спробуй ще раз.',
          en: "Max didn't answer. Try again.",
          es: 'Max no respondió. Inténtalo de nuevo.',
          'pt-BR': 'Max não respondeu. Tente de novo.',
          vi: 'Max chưa trả lời. Hãy thử lại.',
          id: 'Max belum menjawab. Coba lagi.',
          tr: 'Max yanıt vermedi. Tekrar dene.',
          pl: 'Max nie odpowiedział. Spróbuj ponownie.',
        }));
      } finally {
        setSending(false);
      }
    },
    [sending, messages, cefr, lang, studyTarget, goal?.id, applyTools],
  );

  // Макс говорит первым: открывающий ход уходит сразу при входе на экран.
  useEffect(() => {
    if (!accessResolved || openedRef.current) return;
    openedRef.current = true;
    void trackEvent('tutor_text_started', {});
    void runTurn('');
    // runTurn намеренно не в зависимостях: открывающий ход должен уйти ровно
    // один раз за монтирование, а не при каждом пересоздании коллбэка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessResolved]);

  const send = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || sending || lessonComplete) return;
    hapticTap();
    setInput('');
    // Optimistic UI: своя реплика в ленте мгновенно, сеть догоняет.
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    void runTurn(trimmed);
  }, [input, sending, lessonComplete, runTurn]);

  const saveBoardPhrase = useCallback(() => {
    if (!board) return;
    // Optimistic UI: галочка «в карточках» сразу, запись идёт фоном.
    setSavedPhrases((prev) => new Set(prev).add(board.text));
    void trackEvent('tutor_text_phrase_saved', { phrase: board.text.slice(0, 60) });
    DebugLogger.info('[TUTOR-TEXT] phrase saved to cards', board.text.slice(0, 60));
  }, [board]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, sending]);

  const onBack = useCallback(() => {
    hapticTap();
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  const goalTitle = useMemo(() => tutorGoalTitle(goal, lang), [goal, lang]);

  if (disabled) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="school-outline" size={40} color={t.textMuted} />
          <Text
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginTop: 14 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Макс скоро появится',
              uk: 'Макс скоро з’явиться',
              en: 'Max is coming soon',
              es: 'Max llegará pronto',
              'pt-BR': 'Max chega em breve',
              vi: 'Max sắp có mặt',
              id: 'Max segera hadir',
              tr: 'Max yakında burada',
              pl: 'Max wkrótce się pojawi',
            })}
          </Text>
          <TouchableOpacity
            onPress={onBack}
            accessibilityRole="button"
            style={{ marginTop: 22, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć',
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Шапка: Макс и его текущая цель. Роли нет — он учитель, не персонаж. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 15,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="school" size={21} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: 'Макс', uk: 'Макс', en: 'Max', es: 'Max', 'pt-BR': 'Max',
                vi: 'Max', id: 'Max', tr: 'Max', pl: 'Max',
              })}
            </Text>
            {goalTitle ? (
              <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {goalTitle}
              </Text>
            ) : null}
          </View>
          {/* Мастерство цели: три деления, как в каркасе MAX. */}
          {goal ? (
            <View
              style={{ flexDirection: 'row', gap: 4 }}
              accessibilityRole="text"
              accessibilityLabel={`${triLang(lang, {
                ru: 'Мастерство', uk: 'Майстерність', en: 'Mastery', es: 'Dominio', 'pt-BR': 'Domínio',
                vi: 'Thành thạo', id: 'Penguasaan', tr: 'Ustalık', pl: 'Biegłość',
              })} ${goal.mastery} / 3`}
            >
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={{
                    width: 18,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index < goal.mastery ? t.accent : glassFill(t.bgSurface2, 0.6),
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Доска: целевая фраза урока. */}
        {board ? (
          <TutorBoard
            lang={lang}
            text={board.text}
            meaning={board.meaning}
            onSpeak={() => speak(board.text, undefined, { language: 'en-US', voice: '' })}
            onSaveToCards={saveBoardPhrase}
            saved={savedPhrases.has(board.text)}
            testID="tutor-board"
          />
        ) : null}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <FlatList
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 16 }}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      maxWidth: '86%',
                      borderRadius: 22,
                      borderBottomRightRadius: isUser ? 7 : 22,
                      borderBottomLeftRadius: isUser ? 22 : 7,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: isUser ? t.accent : glassFill(t.bgCard, 0.46),
                      ...noAndroidOutline,
                    }}
                  >
                    <Text
                      style={{
                        color: isUser ? t.correctText : t.textPrimary,
                        fontSize: f.bodyLg,
                        lineHeight: Math.round(f.bodyLg * 1.4),
                      }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {isUser
                        ? item.text
                        : parseKeyPhrases(item.text).map((segment, index) =>
                            segment.isKey ? (
                              <Text
                                key={index}
                                onPress={() => {
                                  hapticTap();
                                  speak(segment.text, undefined, { language: 'en-US', voice: '' });
                                }}
                                style={{ color: t.accent, fontWeight: '700', textDecorationLine: 'underline' }}
                              >
                                {segment.text}
                              </Text>
                            ) : (
                              <Text key={index}>{segment.text}</Text>
                            ),
                          )}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              sending ? (
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <AiTypingBubble
                    bubbleColor={t.bgCard}
                    borderColor="transparent"
                    dotColor={t.accent}
                    glowColor={t.accentBg}
                  />
                </View>
              ) : errorText ? (
                <TouchableOpacity
                  onPress={() => void runTurn('')}
                  accessibilityRole="button"
                  accessibilityLabel={errorText}
                  style={{
                    alignSelf: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: glassFill(t.bgSurface, 0.46),
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Ionicons name="refresh" size={17} color={t.textMuted} />
                  <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                    {errorText}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />

          {/* Итог урока: домашка уже в карточках. */}
          {lessonComplete ? (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              <View style={{ backgroundColor: t.bgCard, borderRadius: 20, padding: 16, gap: 8 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Урок пройден', uk: 'Урок пройдено', en: 'Lesson complete', es: 'Lección completada',
                    'pt-BR': 'Lição concluída', vi: 'Hoàn thành bài học', id: 'Pelajaran selesai',
                    tr: 'Ders tamamlandı', pl: 'Lekcja ukończona',
                  })}
                </Text>
                {homework.length > 0 ? (
                  <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: Math.round(f.body * 1.4) }} maxFontSizeMultiplier={1.2}>
                    {triLang(lang, {
                      ru: 'На повтор: ', uk: 'На повтор: ', en: 'To practice: ', es: 'Para practicar: ',
                      'pt-BR': 'Para praticar: ', vi: 'Cần luyện: ', id: 'Untuk dilatih: ',
                      tr: 'Tekrar için: ', pl: 'Do powtórki: ',
                    })}
                    {homework.join(' · ')}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={onBack}
                  accessibilityRole="button"
                  style={{
                    marginTop: 4,
                    minHeight: 50,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.accent,
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Готово', uk: 'Готово', en: 'Done', es: 'Listo', 'pt-BR': 'Pronto',
                      vi: 'Xong', id: 'Selesai', tr: 'Tamam', pl: 'Gotowe',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={triLang(lang, {
                  ru: 'Ответь Максу…', uk: 'Відповідай Максу…', en: 'Reply to Max…', es: 'Responde a Max…',
                  'pt-BR': 'Responda ao Max…', vi: 'Trả lời Max…', id: 'Balas Max…',
                  tr: 'Max’a yanıt ver…', pl: 'Odpowiedz Maxowi…',
                })}
                placeholderTextColor={t.textMuted}
                editable={!sending}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={send}
                accessibilityLabel={triLang(lang, {
                  ru: 'Ответ Максу', uk: 'Відповідь Максу', en: 'Reply to Max', es: 'Respuesta a Max',
                  'pt-BR': 'Resposta ao Max', vi: 'Trả lời Max', id: 'Balasan untuk Max',
                  tr: 'Max’a yanıt', pl: 'Odpowiedź dla Maxa',
                })}
                style={{
                  flex: 1,
                  backgroundColor: t.bgCard,
                  borderRadius: 22,
                  paddingHorizontal: 18,
                  paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                  color: t.textPrimary,
                  fontSize: f.body,
                  maxHeight: 120,
                }}
                maxFontSizeMultiplier={1.2}
              />
              <TouchableOpacity
                onPress={send}
                disabled={!input.trim() || sending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !input.trim() || sending }}
                accessibilityLabel={triLang(lang, {
                  ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar',
                  vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij',
                })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: input.trim() && !sending ? t.accent : t.bgSurface,
                  opacity: input.trim() && !sending ? 1 : 0.5,
                }}
              >
                <Ionicons name="arrow-up" size={22} color={input.trim() && !sending ? t.correctText : t.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

/**
 * Согласие на ИИ — снаружи компонента: внутри несколько точек отправки, одна
 * внешняя проверка надёжнее (тот же приём, что у экрана диалога).
 */
export default function TutorSessionRoute() {
  return (
    <AiDialogConsentGate>
      <TutorSession />
    </AiDialogConsentGate>
  );
}

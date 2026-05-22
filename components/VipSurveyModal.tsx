import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { triLang } from '../constants/i18n';
import { submitVipSurveyFromApp, type SubmitVipSurveyResponse } from '../app/vip_survey';
import {
  isVipSurveyComplete,
  pickVipSurveyText,
  VIP_SURVEY_QUESTIONS,
  type VipSurveyAnswers,
} from '../app/vip_survey_content';

type Props = {
  visible: boolean;
  messageId: string;
  onClose: () => void;
  onCompleted: (result: SubmitVipSurveyResponse) => void;
};

export default function VipSurveyModal({ visible, messageId, onClose, onCompleted }: Props) {
  const { lang } = useLang();
  const { f, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const commentFocusedRef = useRef(false);
  const suppressNextPrimaryPressRef = useRef(false);
  const suppressNextPrimaryPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<VipSurveyAnswers>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [commentFocused, setCommentFocused] = useState(false);
  const keyboardVisible = keyboardHeight > 0;
  const inputControlVisible = keyboardVisible || commentFocused;
  const panelKeyboardMaxHeight = keyboardVisible
    ? Math.max(320, windowHeight - keyboardHeight - insets.top - insets.bottom - 22)
    : undefined;

  const clearCommentScrollTimers = () => {
    scrollTimersRef.current.forEach((timer) => clearTimeout(timer));
    scrollTimersRef.current = [];
  };

  const clearPrimarySuppressTimer = () => {
    if (!suppressNextPrimaryPressTimerRef.current) return;
    clearTimeout(suppressNextPrimaryPressTimerRef.current);
    suppressNextPrimaryPressTimerRef.current = null;
  };

  const queueCommentScroll = () => {
    clearCommentScrollTimers();
    [80, 260].forEach((delay) => {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, delay);
      scrollTimersRef.current.push(timer);
    });
  };

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setAnswers({});
    setBusy(false);
    setError('');
    setKeyboardHeight(0);
    setCommentFocused(false);
    suppressNextPrimaryPressRef.current = false;
    clearPrimarySuppressTimer();
    commentFocusedRef.current = false;
    clearCommentScrollTimers();
  }, [messageId, visible]);

  useEffect(() => {
    if (!visible) return;
    setCommentFocused(false);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [step, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates?.height || 0));
      if (commentFocusedRef.current) queueCommentScroll();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      clearCommentScrollTimers();
      clearPrimarySuppressTimer();
    };
  }, []);

  const copy = useMemo(() => ({
    close: triLang(lang, { ru: 'Закрыть опрос', uk: 'Закрити опитування', es: 'Close survey', 'pt-BR': 'Close survey', vi: 'Close survey', id: 'Close survey', tr: 'Close survey', pl: 'Close survey' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Back', 'pt-BR': 'Back', vi: 'Back', id: 'Back', tr: 'Back', pl: 'Back' }),
    next: triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Next', 'pt-BR': 'Next', vi: 'Next', id: 'Next', tr: 'Next', pl: 'Next' }),
    optional: triLang(lang, { ru: 'Необязательно', uk: 'Необовʼязково', es: 'Optional', 'pt-BR': 'Optional', vi: 'Optional', id: 'Optional', tr: 'Optional', pl: 'Optional' }),
    commentPlaceholder: triLang(lang, { ru: 'Можно добавить комментарий', uk: 'Можна додати коментар', es: 'You can add a comment', 'pt-BR': 'You can add a comment', vi: 'You can add a comment', id: 'You can add a comment', tr: 'You can add a comment', pl: 'You can add a comment' }),
    textPlaceholder: triLang(lang, { ru: 'Напишите ответ', uk: 'Напишіть відповідь', es: 'Write your answer', 'pt-BR': 'Write your answer', vi: 'Write your answer', id: 'Write your answer', tr: 'Write your answer', pl: 'Write your answer' }),
    introTitle: triLang(lang, { ru: 'Что такое VIP?', uk: 'Що таке VIP?', es: 'What is VIP?', 'pt-BR': 'What is VIP?', vi: 'What is VIP?', id: 'What is VIP?', tr: 'What is VIP?', pl: 'What is VIP?' }),
    introBody: triLang(lang, {
      ru: 'VIP — это как Premium: полный доступ ко всем функциям. После опроса вы получите зелёную ауру и зелёный ник.',
      uk: 'VIP — це як Premium: повний доступ до всіх функцій. Після опитування ви отримаєте зелену ауру й зелений нік.',
      es: 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
      'pt-BR': 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
      vi: 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
      id: 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
      tr: 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
      pl: 'VIP is like Premium: full access to every feature. After the survey, you get a green aura and green name.',
    }),
    completedTitle: triLang(lang, { ru: 'Спасибо за помощь!', uk: 'Дякуємо за допомогу!', es: 'Thank you for helping!', 'pt-BR': 'Thank you for helping!', vi: 'Thank you for helping!', id: 'Thank you for helping!', tr: 'Thank you for helping!', pl: 'Thank you for helping!' }),
    completedBody: triLang(lang, {
      ru: 'Ваши ответы помогут сделать Phraseman понятнее и полезнее. Нажмите «Завершить опрос», чтобы отправить ответы и активировать VIP.',
      uk: 'Ваші відповіді допоможуть зробити Phraseman зрозумілішим і кориснішим. Натисніть «Завершити опитування», щоб надіслати відповіді й активувати VIP.',
      es: 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
      'pt-BR': 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
      vi: 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
      id: 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
      tr: 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
      pl: 'Your answers will help make Phraseman clearer and more useful. Tap Finish survey to send your answers and activate VIP.',
    }),
    finish: triLang(lang, { ru: 'Завершить опрос', uk: 'Завершити опитування', es: 'Finish survey', 'pt-BR': 'Finish survey', vi: 'Finish survey', id: 'Finish survey', tr: 'Finish survey', pl: 'Finish survey' }),
    saving: triLang(lang, { ru: 'Активируем...', uk: 'Активуємо...', es: 'Activating...', 'pt-BR': 'Activating...', vi: 'Activating...', id: 'Activating...', tr: 'Activating...', pl: 'Activating...' }),
    error: triLang(lang, { ru: 'Не удалось завершить опрос. Проверьте интернет и попробуйте ещё раз.', uk: 'Не вдалося завершити опитування. Перевірте інтернет і спробуйте ще раз.', es: 'Could not finish the survey. Check your connection and try again.', 'pt-BR': 'Could not finish the survey. Check your connection and try again.', vi: 'Could not finish the survey. Check your connection and try again.', id: 'Could not finish the survey. Check your connection and try again.', tr: 'Could not finish the survey. Check your connection and try again.', pl: 'Could not finish the survey. Check your connection and try again.' }),
  }), [lang]);

  const isCompleteStep = step >= VIP_SURVEY_QUESTIONS.length;
  const question = isCompleteStep ? null : VIP_SURVEY_QUESTIONS[step];
  const canGoNext = question
    ? question.textOnly
      ? !!answers[question.id]?.comment?.trim()
      : !!answers[question.id]?.optionId
    : isVipSurveyComplete(answers);
  const chrome = isDark
    ? { panel: '#131A24', card: '#1D2633', border: 'rgba(148,163,184,0.24)', text: '#F8FAFC', muted: '#B7C0CC', soft: '#8A97A8' }
    : { panel: '#F8FAFC', card: '#FFFFFF', border: 'rgba(71,85,105,0.18)', text: '#1E293B', muted: '#64748B', soft: '#94A3B8' };
  const accent = isDark
    ? { main: '#94A3B8', strong: '#CBD5E1', tint: 'rgba(148,163,184,0.16)', text: '#E2E8F0' }
    : { main: '#64748B', strong: '#475569', tint: 'rgba(100,116,139,0.12)', text: '#334155' };

  const setAnswer = (questionId: string, optionId: string) => {
    hapticTap();
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], optionId } }));
  };

  const setComment = (questionId: string, comment: string) => {
    const target = VIP_SURVEY_QUESTIONS.find((row) => row.id === questionId);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...(target?.textOnly ? { optionId: 'comment' } : {}),
        comment,
      },
    }));
  };

  const finish = async () => {
    if (busy || !isVipSurveyComplete(answers)) return;
    setBusy(true);
    setError('');
    try {
      const result = await submitVipSurveyFromApp({ messageId, answers, reviewIntent: 'not_now', storeOpened: false });
      hapticSuccess();
      onCompleted(result);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e || '');
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[VipSurveyModal] submit failed', detail, e);
      }
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    if (!canGoNext) return;
    hapticTap();
    setStep((value) => Math.min(VIP_SURVEY_QUESTIONS.length, value + 1));
  };

  const goBack = () => {
    if (step <= 0) return;
    hapticTap();
    setStep((value) => Math.max(0, value - 1));
  };

  const handlePrimaryPress = () => {
    if (busy || !canGoNext) return;
    Keyboard.dismiss();
    if (isCompleteStep) {
      void finish();
    } else {
      goNext();
    }
  };

  const handlePrimaryTouchStart = () => {
    if (!inputControlVisible || busy || !canGoNext) return;
    suppressNextPrimaryPressRef.current = true;
    clearPrimarySuppressTimer();
    suppressNextPrimaryPressTimerRef.current = setTimeout(() => {
      suppressNextPrimaryPressRef.current = false;
      suppressNextPrimaryPressTimerRef.current = null;
    }, 1800);
    handlePrimaryPress();
  };

  const handlePrimaryPressRelease = () => {
    if (suppressNextPrimaryPressRef.current) {
      suppressNextPrimaryPressRef.current = false;
      clearPrimarySuppressTimer();
      return;
    }
    handlePrimaryPress();
  };

  const renderPrimaryButton = (insideScroll = false) => (
    <Pressable
      testID="vip-survey-primary"
      disabled={busy || !canGoNext}
      accessibilityRole="button"
      onPress={handlePrimaryPressRelease}
      onTouchStart={inputControlVisible ? handlePrimaryTouchStart : undefined}
      style={[
        styles.primaryButton,
        insideScroll && styles.primaryButtonInScroll,
        { opacity: busy || !canGoNext ? 0.55 : 1, backgroundColor: accent.strong },
      ]}
    >
      <Text style={styles.primaryButtonText}>
        {busy ? copy.saving : isCompleteStep ? copy.finish : copy.next}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={undefined}
        keyboardVerticalOffset={0}
        style={[
          styles.root,
          {
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
            paddingTop: insets.top + (keyboardVisible ? 8 : 18),
            paddingBottom: insets.bottom + (keyboardVisible ? keyboardHeight + 8 : 18),
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={isDark ? ['#182131', '#0F172A'] : ['#FFFFFF', '#F1F5F9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          testID="vip-survey-modal"
          style={[
            styles.panel,
            keyboardVisible && styles.panelKeyboard,
            panelKeyboardMaxHeight ? { maxHeight: panelKeyboardMaxHeight } : null,
            { borderColor: chrome.border },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              disabled={step <= 0 || busy}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={copy.back}
              onPress={goBack}
              style={[styles.roundButton, { opacity: step <= 0 ? 0.35 : 1, backgroundColor: chrome.card, borderColor: chrome.border }]}
            >
              <Ionicons name="chevron-back" size={21} color={chrome.text} />
            </TouchableOpacity>
            <View style={styles.progressWrap}>
              <Text style={[styles.progressText, { color: chrome.muted }]}>
                {Math.min(step + 1, VIP_SURVEY_QUESTIONS.length + 1)} / {VIP_SURVEY_QUESTIONS.length + 1}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#253244' : '#E2E8F0' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${((Math.min(step + 1, VIP_SURVEY_QUESTIONS.length + 1)) / (VIP_SURVEY_QUESTIONS.length + 1)) * 100}%`,
                      backgroundColor: accent.main,
                    },
                  ]}
                />
              </View>
            </View>
            <TouchableOpacity
              disabled={busy}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={onClose}
              style={[styles.roundButton, { backgroundColor: chrome.card, borderColor: chrome.border }]}
            >
              <Ionicons name="close" size={20} color={chrome.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={[styles.content, keyboardVisible && styles.contentKeyboard]}
          >
            {question ? (
              <>
                {step === 0 ? (
                  <View style={[styles.introCard, { backgroundColor: chrome.card, borderColor: chrome.border }]}>
                    <Text style={[styles.introTitle, { color: chrome.text }]}>{copy.introTitle}</Text>
                    <Text style={[styles.introBody, { color: chrome.muted, fontSize: Math.min(f.body, 15) }]}>{copy.introBody}</Text>
                  </View>
                ) : null}
                <View style={styles.surveyIcon}>
                  <Ionicons name="chatbubbles" size={22} color={accent.main} />
                </View>
                <Text style={[styles.title, { color: chrome.text, fontSize: Math.min(Math.max(22, f.h2), 28) }]}>
                  {pickVipSurveyText(question.title, lang)}
                </Text>
                {question.textOnly ? null : (
                  <View style={styles.options}>
                    {question.options.map((option) => {
                      const selected = answers[question.id]?.optionId === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          testID={`vip-survey-option-${question.id}-${option.id}`}
                          activeOpacity={0.84}
                          onPress={() => setAnswer(question.id, option.id)}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: selected ? accent.tint : chrome.card,
                              borderColor: selected ? accent.main : chrome.border,
                            },
                          ]}
                        >
                          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? accent.main : chrome.soft} />
                          <Text style={[styles.optionText, { color: selected ? accent.text : chrome.text }]}>
                            {pickVipSurveyText(option.text, lang)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <View style={[styles.commentBox, { backgroundColor: chrome.card, borderColor: chrome.border }]}>
                  <TextInput
                    testID={`vip-survey-comment-${question.id}`}
                    value={answers[question.id]?.comment ?? ''}
                    onChangeText={(text) => setComment(question.id, text)}
                    onFocus={() => {
                      commentFocusedRef.current = true;
                      setCommentFocused(true);
                      queueCommentScroll();
                    }}
                    onBlur={() => {
                      commentFocusedRef.current = false;
                    }}
                    placeholder={question.textOnly ? copy.textPlaceholder : copy.commentPlaceholder}
                    placeholderTextColor={chrome.soft}
                    multiline
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={500}
                    style={[styles.commentInput, question.textOnly && styles.textOnlyInput, { color: chrome.text, fontSize: f.body }]}
                  />
                  {question.textOnly ? null : <Text style={[styles.optionalText, { color: chrome.soft }]}>{copy.optional}</Text>}
                </View>
              </>
            ) : (
              <>
                <View style={styles.surveyIcon}>
                  <Ionicons name="sparkles" size={22} color={accent.main} />
                </View>
                <Text style={[styles.title, { color: chrome.text, fontSize: Math.min(Math.max(23, f.h2), 28) }]}>{copy.completedTitle}</Text>
                <Text style={[styles.reviewBody, { color: chrome.muted, fontSize: f.body }]}>{copy.completedBody}</Text>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {inputControlVisible ? renderPrimaryButton(true) : null}
          </ScrollView>

          {inputControlVisible ? null : renderPrimaryButton(false)}
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  panelKeyboard: {
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flex: 1,
    gap: 6,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#64748B',
  },
  content: {
    paddingTop: 20,
    paddingBottom: 18,
  },
  contentKeyboard: {
    paddingBottom: 96,
  },
  introCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  introBody: {
    lineHeight: 20,
    fontWeight: '600',
  },
  surveyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100,116,139,0.14)',
    marginBottom: 12,
  },
  title: {
    fontWeight: '900',
    lineHeight: 29,
    marginBottom: 16,
  },
  options: {
    gap: 10,
  },
  optionButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  commentBox: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  commentInput: {
    minHeight: 62,
    textAlignVertical: 'top',
    fontWeight: '600',
  },
  textOnlyInput: {
    minHeight: 118,
  },
  optionalText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewBody: {
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#475569',
  },
  primaryButtonInScroll: {
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});

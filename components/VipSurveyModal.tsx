import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
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

function VipSurveyModal({ visible, messageId, onClose, onCompleted }: Props) {
  const { lang } = useLang();
  const { f, isDark } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
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
    ? Math.max(320, windowHeight - keyboardHeight - insets.top - bottomInset - 22)
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
    close: triLang(lang, { ru: 'Закрыть опрос', uk: 'Закрити опитування', es: 'Cerrar encuesta', 'pt-BR': 'Fechar pesquisa', vi: 'Đóng khảo sát', id: 'Tutup survei', tr: 'Anketi kapat', pl: 'Zamknij ankietę' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    next: triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp tục', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    optional: triLang(lang, { ru: 'Необязательно', uk: 'Необовʼязково', es: 'Opcional', 'pt-BR': 'Opcional', vi: 'Không bắt buộc', id: 'Opsional', tr: 'İsteğe bağlı', pl: 'Opcjonalnie' }),
    commentPlaceholder: triLang(lang, { ru: 'Можно добавить комментарий', uk: 'Можна додати коментар', es: 'Puedes añadir un comentario', 'pt-BR': 'Você pode adicionar um comentário', vi: 'Bạn có thể thêm nhận xét', id: 'Kamu bisa menambahkan komentar', tr: 'Bir yorum ekleyebilirsin', pl: 'Możesz dodać komentarz' }),
    textPlaceholder: triLang(lang, { ru: 'Напишите ответ', uk: 'Напишіть відповідь', es: 'Escribe tu respuesta', 'pt-BR': 'Escreva sua resposta', vi: 'Viết câu trả lời của bạn', id: 'Tulis jawabanmu', tr: 'Cevabını yaz', pl: 'Napisz odpowiedź' }),
    introTitle: triLang(lang, { ru: 'Что такое Plus?', uk: 'Що таке Plus?', es: '¿Qué es Plus?', 'pt-BR': 'O que é Plus?', vi: 'Plus là gì?', id: 'Apa itu Plus?', tr: 'Plus nedir?', pl: 'Czym jest Plus?' }),
    introBody: triLang(lang, {
      ru: 'Plus — это полный доступ ко всем функциям. После опроса ты получишь зелёную ауру и зелёный ник.',
      uk: 'Plus — це повний доступ до всіх функцій. Після опитування ви отримаєте зелену ауру й зелений нік.',
      es: 'Plus es acceso completo a todas las funciones. Tras la encuesta recibirás un aura verde y un nombre verde.',
      'pt-BR': 'Plus é acesso completo a todos os recursos. Após a pesquisa, você ganha uma aura verde e um nome verde.',
      vi: 'Plus là toàn quyền truy cập mọi tính năng. Sau khi khảo sát, bạn nhận được hào quang xanh và tên màu xanh.',
      id: 'Plus adalah akses penuh ke semua fitur. Setelah survei, kamu mendapat aura hijau dan nama hijau.',
      tr: 'Plus, tüm özelliklere tam erişimdir. Anketten sonra yeşil bir aura ve yeşil bir ad kazanırsın.',
      pl: 'Plus to pełny dostęp do wszystkich funkcji. Po ankiecie otrzymasz zieloną aurę i zielony nick.',
    }),
    completedTitle: triLang(lang, { ru: 'Спасибо за помощь!', uk: 'Дякуємо за допомогу!', es: '¡Gracias por tu ayuda!', 'pt-BR': 'Obrigado pela ajuda!', vi: 'Cảm ơn bạn đã giúp đỡ!', id: 'Terima kasih atas bantuanmu!', tr: 'Yardımın için teşekkürler!', pl: 'Dziękujemy za pomoc!' }),
    completedBody: triLang(lang, {
      ru: 'Твои ответы помогут сделать Phraseman лучше. Нажми «Завершить опрос» — и Plus активируется.',
      uk: 'Твої відповіді допоможуть зробити Phraseman кращим. Натисни «Завершити опитування» — і Plus активується.',
      es: 'Tus respuestas ayudarán a mejorar Phraseman. Toca «Finalizar encuesta» y se activará tu Plus.',
      'pt-BR': 'Suas respostas vão ajudar a melhorar o Phraseman. Toque em «Concluir pesquisa» e o Plus será ativado.',
      vi: 'Câu trả lời của bạn sẽ giúp Phraseman tốt hơn. Nhấn «Hoàn tất khảo sát» và Plus sẽ được kích hoạt.',
      id: 'Jawabanmu akan membantu menyempurnakan Phraseman. Ketuk «Selesaikan survei» dan Plus akan aktif.',
      tr: 'Cevapların Phraseman’i daha iyi hale getirir. «Anketi bitir»e dokun, Plus etkinleşsin.',
      pl: 'Twoje odpowiedzi pomogą ulepszyć Phraseman. Naciśnij «Zakończ ankietę», a Plus się aktywuje.',
    }),
    finish: triLang(lang, { ru: 'Завершить опрос', uk: 'Завершити опитування', es: 'Finalizar encuesta', 'pt-BR': 'Concluir pesquisa', vi: 'Hoàn tất khảo sát', id: 'Selesaikan survei', tr: 'Anketi bitir', pl: 'Zakończ ankietę' }),
    saving: triLang(lang, { ru: 'Активируем...', uk: 'Активуємо...', es: 'Activando...', 'pt-BR': 'Ativando...', vi: 'Đang kích hoạt...', id: 'Mengaktifkan...', tr: 'Etkinleştiriliyor...', pl: 'Aktywujemy...' }),
    error: triLang(lang, { ru: 'Не удалось завершить опрос. Проверь интернет и попробуй ещё раз.', uk: 'Не вдалося завершити опитування. Перевірте інтернет і спробуйте ще раз.', es: 'No se pudo finalizar la encuesta. Revisa tu conexión e inténtalo de nuevo.', 'pt-BR': 'Não foi possível concluir a pesquisa. Verifique sua conexão e tente novamente.', vi: 'Không thể hoàn tất khảo sát. Kiểm tra kết nối và thử lại.', id: 'Tidak bisa menyelesaikan survei. Periksa koneksimu dan coba lagi.', tr: 'Anket tamamlanamadı. Bağlantını kontrol edip tekrar dene.', pl: 'Nie udało się zakończyć ankiety. Sprawdź połączenie i spróbuj ponownie.' }),
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
            paddingBottom: bottomInset + (keyboardVisible ? keyboardHeight + 8 : 18),
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

export default memo(VipSurveyModal);

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

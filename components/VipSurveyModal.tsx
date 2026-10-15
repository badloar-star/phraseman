import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  useWindowDimensions,
  View,
} from 'react-native';
import KitTouchable from './KitTouchable';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: опрос VIP на токенах стекла (макет overlays-specialist OS-VIP-SURVEY-*)
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { LUM } from '../constants/motionHybrid';
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
  /**
   * зачем: гибрид «Световод + Чекан» (владелец, 2026-08-16). Форма с
   * клавиатурой — каскад содержимого НЕ делаем (риск для фокуса/раскладки).
   * 'hybrid' добавляет ТОЛЬКО мягкое появление панели из света (opacity
   * LUM.resolveMs + scale 1.03→1 LUM.settle, без отскока). KeyboardAvoidingView,
   * фокус инпутов и вся логика опроса не меняются. Default 'classic'.
   */
  motionVariant?: 'classic' | 'hybrid';
};

function VipSurveyModal({ visible, messageId, onClose, onCompleted, motionVariant = 'hybrid' }: Props) {
  const { lang } = useLang();
  const { f, liquidGlassThemeId } = useTheme();
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
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
  const [confirmExit, setConfirmExit] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [commentFocused, setCommentFocused] = useState(false);
  const keyboardVisible = keyboardHeight > 0;
  const inputControlVisible = keyboardVisible || commentFocused;
  const panelKeyboardMaxHeight = keyboardVisible
    ? Math.max(320, windowHeight - keyboardHeight - insets.top - bottomInset - 22)
    : undefined;
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReducedMotion();

  // зачем: гибрид «Световод» — панель появляется из света (opacity + scale
  // 1.03→1, settle без отскока). ТОЛЬКО вход панели целиком: каскад
  // содержимого, KeyboardAvoidingView и фокус инпутов не трогаются.
  const hybridOpacity = useSharedValue(0);
  const hybridScale = useSharedValue(1.03);
  useEffect(() => {
    if (!isHybrid || !visible) return;
    if (reduceMotion) {
      hybridOpacity.value = 1;
      hybridScale.value = 1;
      return;
    }
    hybridOpacity.value = 0;
    hybridScale.value = 1.03;
    hybridOpacity.value = withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.cubic) });
    hybridScale.value = withSpring(1, LUM.settle);
    return () => {
      cancelAnimation(hybridOpacity);
      cancelAnimation(hybridScale);
    };
  }, [isHybrid, visible, reduceMotion, hybridOpacity, hybridScale]);
  const hybridPanelStyle = useAnimatedStyle(() => ({
    opacity: hybridOpacity.value,
    transform: [{ scale: hybridScale.value }],
  }));

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
    setConfirmExit(false);
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
    close: triLang(lang, { ru: 'Закрыть опрос', uk: 'Закрити опитування', en: 'Close survey', es: 'Cerrar encuesta', 'pt-BR': 'Fechar pesquisa', vi: 'Đóng khảo sát', id: 'Tutup survei', tr: 'Anketi kapat', pl: 'Zamknij ankietę' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    next: triLang(lang, { ru: 'Продолжить', uk: 'Продовжити', en: 'Next', es: 'Siguiente', 'pt-BR': 'Avançar', vi: 'Tiếp tục', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' }),
    optional: triLang(lang, { ru: 'Необязательно', uk: 'Необовʼязково', en: 'Optional', es: 'Opcional', 'pt-BR': 'Opcional', vi: 'Không bắt buộc', id: 'Opsional', tr: 'İsteğe bağlı', pl: 'Opcjonalnie' }),
    commentPlaceholder: triLang(lang, { ru: 'Можно добавить комментарий', uk: 'Можна додати коментар', en: 'You can add a comment', es: 'Puedes añadir un comentario', 'pt-BR': 'Você pode adicionar um comentário', vi: 'Bạn có thể thêm nhận xét', id: 'Kamu bisa menambahkan komentar', tr: 'Bir yorum ekleyebilirsin', pl: 'Możesz dodać komentarz' }),
    textPlaceholder: triLang(lang, { ru: 'Напиши ответ', uk: 'Напиши відповідь', en: 'Write an answer', es: 'Escribe tu respuesta', 'pt-BR': 'Escreva sua resposta', vi: 'Viết câu trả lời của bạn', id: 'Tulis jawabanmu', tr: 'Cevabını yaz', pl: 'Napisz odpowiedź' }),
    introTitle: triLang(lang, { ru: 'Что такое Plus?', uk: 'Що таке Plus?', en: 'What is Plus?', es: '¿Qué es Plus?', 'pt-BR': 'O que é Plus?', vi: 'Plus là gì?', id: 'Apa itu Plus?', tr: 'Plus nedir?', pl: 'Czym jest Plus?' }),
    introBody: triLang(lang, {
      ru: 'Plus — это полный доступ ко всем функциям. После опроса ты получишь зелёную ауру и зелёный ник.',
      uk: 'Plus — це повний доступ до всіх функцій. Після опитування ти отримаєш зелену ауру й зелений нік.',
      en: 'Plus gives full access to all features. After the survey you’ll get a green aura and green nickname.',
      es: 'Plus es acceso completo a todas las funciones. Tras la encuesta recibirás un aura verde y un nombre verde.',
      'pt-BR': 'Plus é acesso completo a todos os recursos. Após a pesquisa, você ganha uma aura verde e um nome verde.',
      vi: 'Plus là toàn quyền truy cập mọi tính năng. Sau khi khảo sát, bạn nhận được hào quang xanh và tên màu xanh.',
      id: 'Plus adalah akses penuh ke semua fitur. Setelah survei, kamu mendapat aura hijau dan nama hijau.',
      tr: 'Plus, tüm özelliklere tam erişimdir. Anketten sonra yeşil bir aura ve yeşil bir ad kazanırsın.',
      pl: 'Plus to pełny dostęp do wszystkich funkcji. Po ankiecie otrzymasz zieloną aurę i zielony nick.',
    }),
    completedTitle: triLang(lang, { ru: 'Спасибо за помощь!', uk: 'Дякуємо за допомогу!', en: 'Thanks for the help!', es: '¡Gracias por tu ayuda!', 'pt-BR': 'Obrigado pela ajuda!', vi: 'Cảm ơn bạn đã giúp đỡ!', id: 'Terima kasih atas bantuanmu!', tr: 'Yardımın için teşekkürler!', pl: 'Dziękujemy za pomoc!' }),
    completedBody: triLang(lang, {
      ru: 'Твои ответы помогут сделать Phraseman лучше. Нажми «Завершить опрос» — и Plus активируется.',
      uk: 'Твої відповіді допоможуть зробити Phraseman кращим. Натисни «Завершити опитування» — і Plus активується.',
      en: 'Your answers will help make Phraseman better. Tap "Finish survey" and Plus will activate.',
      es: 'Tus respuestas ayudarán a mejorar Phraseman. Toca «Finalizar encuesta» y se activará tu Plus.',
      'pt-BR': 'Suas respostas vão ajudar a melhorar o Phraseman. Toque em «Concluir pesquisa» e o Plus será ativado.',
      vi: 'Câu trả lời của bạn sẽ giúp Phraseman tốt hơn. Nhấn «Hoàn tất khảo sát» và Plus sẽ được kích hoạt.',
      id: 'Jawabanmu akan membantu menyempurnakan Phraseman. Ketuk «Selesaikan survei» dan Plus akan aktif.',
      tr: 'Cevapların Phraseman’i daha iyi hale getirir. «Anketi bitir»e dokun, Plus etkinleşsin.',
      pl: 'Twoje odpowiedzi pomogą ulepszyć Phraseman. Naciśnij «Zakończ ankietę», a Plus się aktywuje.',
    }),
    finish: triLang(lang, { ru: 'Завершить опрос', uk: 'Завершити опитування', en: 'Finish survey', es: 'Finalizar encuesta', 'pt-BR': 'Concluir pesquisa', vi: 'Hoàn tất khảo sát', id: 'Selesaikan survei', tr: 'Anketi bitir', pl: 'Zakończ ankietę' }),
    saving: triLang(lang, { ru: 'Активируем...', uk: 'Активуємо...', en: 'Activating...', es: 'Activando...', 'pt-BR': 'Ativando...', vi: 'Đang kích hoạt...', id: 'Mengaktifkan...', tr: 'Etkinleştiriliyor...', pl: 'Aktywujemy...' }),
    exitTitle: triLang(lang, { ru: 'Ответы пропадут. Выйти?', uk: 'Відповіді зникнуть. Вийти?', en: 'Your answers will be lost. Leave?', es: 'Las respuestas se perderán. ¿Salir?', 'pt-BR': 'As respostas serão perdidas. Sair?', vi: 'Câu trả lời sẽ mất. Thoát?', id: 'Jawaban akan hilang. Keluar?', tr: 'Cevaplar silinecek. Çıkılsın mı?', pl: 'Odpowiedzi znikną. Wyjść?' }),
    exitLeave: triLang(lang, { ru: 'Выйти', uk: 'Вийти', en: 'Leave', es: 'Salir', 'pt-BR': 'Sair', vi: 'Thoát', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź' }),
    exitStay: triLang(lang, { ru: 'Остаться', uk: 'Залишитися', en: 'Stay', es: 'Quedarme', 'pt-BR': 'Ficar', vi: 'Ở lại', id: 'Tetap di sini', tr: 'Kal', pl: 'Zostań' }),
    error: triLang(lang, { ru: 'Сейчас не удалось завершить опрос. Попробуй ещё раз.', uk: 'Зараз не вдалося завершити опитування. Спробуй ще раз.', en: "Couldn't finish the survey right now. Try again.", es: 'Ahora no se pudo terminar la encuesta. Inténtalo de nuevo.', 'pt-BR': 'Não deu para concluir a pesquisa agora. Tente de novo.', vi: 'Lúc này chưa hoàn tất được khảo sát. Hãy thử lại.', id: 'Survei belum bisa diselesaikan sekarang. Coba lagi.', tr: 'Anket şu an tamamlanamadı. Tekrar dene.', pl: 'Teraz nie udało się zakończyć ankiety. Spróbuj ponownie.' }),
    errorAuth: triLang(lang, { ru: 'Не получилось отправить. Ответы сохранены — попробуй ещё раз позже.', uk: 'Не вийшло надіслати. Відповіді збережено — спробуй ще раз пізніше.', en: 'Couldn’t send. Your answers are saved — try again later.', es: 'No se pudo enviar. Tus respuestas están guardadas: inténtalo más tarde.', 'pt-BR': 'Não foi possível enviar. Suas respostas estão salvas — tente mais tarde.', vi: 'Chưa gửi được. Câu trả lời vẫn được lưu — hãy thử lại sau.', id: 'Belum terkirim. Jawabanmu tersimpan — coba lagi nanti.', tr: 'Gönderilemedi. Cevapların kayıtlı — daha sonra tekrar dene.', pl: 'Nie udało się wysłać. Odpowiedzi są zapisane — spróbuj później.' }),
    errorNotEligible: triLang(lang, { ru: 'Опрос доступен, пока подписка не активна. Если Plus или Premium уже действует — награда начисляется один раз.', uk: 'Опитування доступне, поки підписка не активна. Якщо Plus або Premium вже діє — нагорода нараховується один раз.', en: 'The survey is available only without an active subscription. If Plus or Premium is already active, the reward is granted only once.', es: 'La encuesta está disponible solo sin suscripción activa. Si Plus o Premium ya está activo, la recompensa se concede una sola vez.', 'pt-BR': 'A pesquisa está disponível apenas sem assinatura ativa. Se Plus ou Premium já estiver ativo, a recompensa é concedida uma única vez.', vi: 'Khảo sát chỉ khả dụng khi chưa có gói đang hoạt động. Nếu Plus hoặc Premium đã kích hoạt, phần thưởng chỉ được trao một lần.', id: 'Survei hanya tersedia saat tidak ada langganan aktif. Jika Plus atau Premium sudah aktif, hadiah diberikan satu kali saja.', tr: 'Anket yalnızca etkin abonelik yokken geçerlidir. Plus veya Premium zaten aktifse ödül yalnızca bir kez verilir.', pl: 'Ankieta jest dostępna tylko bez aktywnej subskrypcji. Jeśli Plus lub Premium już działa, nagroda przysługuje tylko raz.' }),
    errorGeneric: triLang(lang, { ru: 'Сейчас не отправилось. Ответы сохранены — попробуй позже.', uk: 'Зараз не надіслалося. Відповіді збережено — спробуй пізніше.', en: "Didn't send right now. Your answers are saved — try later.", es: 'Ahora no se envió. Tus respuestas están guardadas; inténtalo más tarde.', 'pt-BR': 'Não foi enviado agora. Suas respostas estão salvas — tente mais tarde.', vi: 'Lúc này chưa gửi được. Câu trả lời đã được lưu — hãy thử lại sau.', id: 'Belum terkirim. Jawaban tersimpan — coba lagi nanti.', tr: 'Şu an gönderilemedi. Cevapların kaydedildi — sonra tekrar dene.', pl: 'Teraz się nie wysłało. Odpowiedzi zapisane — spróbuj później.' }),
  }), [lang]);

  const isCompleteStep = step >= VIP_SURVEY_QUESTIONS.length;
  const question = isCompleteStep ? null : VIP_SURVEY_QUESTIONS[step];
  const canGoNext = question
    ? question.textOnly
      ? !!answers[question.id]?.comment?.trim()
      : !!answers[question.id]?.optionId
    : isVipSurveyComplete(answers);
  // Хотя бы один осмысленный ответ (выбранная опция или непустой комментарий).
  const hasAnyAnswer = useMemo(
    () =>
      VIP_SURVEY_QUESTIONS.some((row) => {
        const answer = answers[row.id];
        if (!answer) return false;
        if (row.textOnly) return !!answer.comment?.trim();
        return !!answer.optionId || !!answer.comment?.trim();
      }),
    [answers],
  );
  // зачем: вся палитра окна берётся из токенов стекла выбранной темы (13 тем), а не из захардкоженного
  // серо-синего slate; смысл полей chrome/accent прежний — меняется только источник цвета.
  const chrome = { panel: g.opaqueSheet, card: g.opaqueControl, border: g.glassEdge, text: g.text, muted: g.secondary, soft: g.mutedText };
  const accent = { main: g.text, strong: g.cta, tint: g.selected, text: g.text };

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

  // Честная классификация ошибок отправки: «проверь интернет» показываем
  // только при реальных сетевых сбоях; отказ сервера/авторизации — как есть.
  const classifySubmitError = (detail: string): string => {
    const d = detail.toLowerCase();
    if (d.includes('free_tier_required') || d.includes('failed-precondition')) return copy.errorNotEligible;
    if (d.includes('unauthenticated') || d.includes('auth')) return copy.errorAuth;
    if (d.includes('unavailable') || d.includes('deadline') || d.includes('network') || d.includes('fetch') || d.includes('timeout')) return copy.error;
    return copy.errorGeneric;
  };

  // зачем (координатор 10.10, Optimistic UI): state busy обновляется после рендера — второй тап по «Готово» в том же кадре отправил бы опрос
  // дважды; ref-замок синхронный, снимается в finally.
  const finishLockRef = useRef(false);
  const finish = async () => {
    if (busy || finishLockRef.current || !isVipSurveyComplete(answers)) return;
    finishLockRef.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await submitVipSurveyFromApp({ messageId, answers, reviewIntent: 'not_now', storeOpened: false });
      hapticSuccess();
      onCompleted(result);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e || '');
      // зачем: причина отказа пишется всегда (раньше только в dev) — иначе в релизе непонятно, какая из четырёх подписей и почему
      console.warn('[VipSurveyModal] submit failed', detail);
      setError(classifySubmitError(detail));
    } finally {
      finishLockRef.current = false;
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

  /**
   * Закрытие (крестик / системная «назад»): во время отправки — игнор;
   * с хотя бы одним ответом — подтверждение «Ответы пропадут. Выйти?»;
   * без ответов — закрываем сразу.
   */
  const handleRequestClose = () => {
    if (busy) return;
    if (confirmExit) {
      hapticTap();
      setConfirmExit(false);
      return;
    }
    if (hasAnyAnswer) {
      Keyboard.dismiss();
      hapticTap();
      setConfirmExit(true);
      return;
    }
    onClose();
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
    // зачем: главный CTA — настоящая клавиша с кромкой (стандарт отклика
    // владельца); onTouchStart-хак для инпута сохранён через wrapStyle-обёртку
    <View onTouchStart={inputControlVisible ? handlePrimaryTouchStart : undefined}>
      <DuoPressable
        testID="vip-survey-primary"
        disabled={busy || !canGoNext}
        onPress={handlePrimaryPressRelease}
        edgeColor={accent.tint}
        edgeHeight={6}
        style={[
          styles.primaryButton,
          insideScroll && styles.primaryButtonInScroll,
          { opacity: busy || !canGoNext ? 0.55 : 1, backgroundColor: accent.strong },
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: g.accentInk }]}>
          {busy ? copy.saving : isCompleteStep ? copy.finish : copy.next}
        </Text>
      </DuoPressable>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleRequestClose}>
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
        {/* зачем: LinearGradient — не Reanimated-компонент, animated style на
            неё напрямую не подействует; оборачиваем ТОЛЬКО в hybrid-режиме,
            classic-путь остаётся тем же деревом без обёртки. */}
        <Reanimated.View style={isHybrid ? hybridPanelStyle : undefined}>
        <LinearGradient
          colors={[g.opaqueSheet, g.opaqueCard]}
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
          {confirmExit ? (
            <View style={styles.confirmExitWrap}>
              <View style={[styles.surveyIcon, { backgroundColor: g.opaqueControl }]}>
                <Ionicons name="alert-circle" size={22} color={accent.main} />
              </View>
              <Text style={[styles.title, { color: chrome.text, fontSize: Math.min(Math.max(22, f.h2), 28) }]}>
                {copy.exitTitle}
              </Text>
              <Pressable
                testID="vip-survey-exit-confirm"
                accessibilityRole="button"
                onPress={() => {
                  hapticTap();
                  setConfirmExit(false);
                  onClose();
                }}
                style={[styles.primaryButton, { marginTop: 0, backgroundColor: accent.strong }]}
              >
                <Text style={[styles.primaryButtonText, { color: g.accentInk }]}>{copy.exitLeave}</Text>
              </Pressable>
              <Pressable
                testID="vip-survey-exit-stay"
                accessibilityRole="button"
                onPress={() => {
                  hapticTap();
                  setConfirmExit(false);
                }}
                style={styles.confirmExitStay}
              >
                <Text style={{ color: chrome.muted, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  {copy.exitStay}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
          <View style={styles.header}>
            <PressableHybrid
              variant="icon"
              disabled={step <= 0 || busy}
              accessibilityLabel={copy.back}
              onPress={goBack}
              style={[styles.roundButton, { opacity: step <= 0 ? 0.35 : 1, backgroundColor: chrome.card, borderColor: chrome.border }]}
            >
              <Ionicons name="chevron-back" size={21} color={chrome.text} />
            </PressableHybrid>
            <View style={styles.progressWrap}>
              <Text style={[styles.progressText, { color: chrome.muted }]}>
                {Math.min(step + 1, VIP_SURVEY_QUESTIONS.length + 1)} / {VIP_SURVEY_QUESTIONS.length + 1}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: g.opaqueControl }]}>
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
            <KitTouchable
              disabled={busy}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
              onPress={handleRequestClose}
              style={[styles.roundButton, { backgroundColor: chrome.card, borderColor: chrome.border }]}
            >
              <Ionicons name="close" size={20} color={chrome.text} />
            </KitTouchable>
          </View>

          <ScrollView
            ref={scrollRef}
            decelerationRate="fast"
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
                <View style={[styles.surveyIcon, { backgroundColor: g.opaqueControl }]}>
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
                        <KitTouchable
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
                        </KitTouchable>
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
                <View style={[styles.surveyIcon, { backgroundColor: g.opaqueControl }]}>
                  <Ionicons name="sparkles" size={22} color={accent.main} />
                </View>
                <Text style={[styles.title, { color: chrome.text, fontSize: Math.min(Math.max(23, f.h2), 28) }]}>{copy.completedTitle}</Text>
                <Text style={[styles.reviewBody, { color: chrome.muted, fontSize: f.body }]}>{copy.completedBody}</Text>
              </>
            )}

            {error ? <View accessibilityRole="alert" style={[styles.errorPlate, { backgroundColor: g.opaqueControl, borderColor: g.glassEdge }]}>
              <Ionicons name="alert-circle-outline" size={20} color={g.text} />
              <Text style={[styles.errorText, { color: g.text }]}>{error}</Text>
            </View> : null}
            {inputControlVisible ? renderPrimaryButton(true) : null}
          </ScrollView>

          {inputControlVisible ? null : renderPrimaryButton(false)}
            </>
          )}
        </LinearGradient>
        </Reanimated.View>
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
    backgroundColor: 'rgba(0,0,0,0.58)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    flex: 1,
    gap: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
  },
  reviewBody: {
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 14,
  },
  errorPlate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonInScroll: {
    marginTop: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmExitWrap: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  confirmExitStay: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
});

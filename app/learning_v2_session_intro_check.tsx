import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from '../components/SafeLinearGradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { projectRequiredTaskStars } from '../modules/learning-v2/contracts/course_economy';
import type { LearningV2IntroQuestionTaskBinding } from '../modules/learning-v2/content/generator_session_contract';
import type { RequiredSessionTaskCompletionInputV3 } from '../modules/learning-v2/progress/required_session_completion_envelope';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { isShortScreen } from '../constants/layout-scale';
import type { BoxShadowValue } from 'react-native';

type IntroCheckResult = 'idle' | 'wrong' | 'correct';

export type LearningV2SessionIntroCheckProps = Readonly<{
  bindings: readonly [
    LearningV2IntroQuestionTaskBinding,
    LearningV2IntroQuestionTaskBinding,
    LearningV2IntroQuestionTaskBinding,
  ];
  displayedStars: number;
  onAward: (taskCardId: string, award: 1 | 2 | 3) => void;
  onComplete: (results: readonly RequiredSessionTaskCompletionInputV3[]) => void;
  onBack: () => void;
}>;

// зачем (координатор 13.10, владелец «перевести всё»): проверка интро была только по-русски — подписи и тексты для
// экранного диктора теперь на 9 языках интерфейса; «звезда» склоняется по правилам языка.
const slavic = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100; const b = a % 10;
  if (b === 1 && a !== 11) return one;
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return few;
  return many;
};
const starsText = (n: number, lang: Lang): string => {
  const word = lang === 'ru' ? slavic(n, 'звезда', 'звезды', 'звёзд') // i18n-ok: формы «звезда» для ru, остальные языки ниже
    : lang === 'uk' ? slavic(n, 'зірка', 'зірки', 'зірок') // i18n-ok: формы «зірка» для uk, остальные языки ниже
    : lang === 'pl' ? slavic(n, 'gwiazdka', 'gwiazdki', 'gwiazdek')
    : triLang(lang, { ru: 'звёзд', uk: 'зірок', en: n === 1 ? 'star' : 'stars', es: n === 1 ? 'estrella' : 'estrellas', 'pt-BR': n === 1 ? 'estrela' : 'estrelas', vi: 'sao', id: 'bintang', tr: 'yıldız', pl: 'gwiazdek' });
  return `${n} ${word}`;
};
const introCopy = (lang: Lang) => ({
  close: triLang(lang, { ru: 'Закрыть проверку интро', uk: 'Закрити перевірку інтро', en: 'Close intro check', es: 'Cerrar la prueba inicial', 'pt-BR': 'Fechar a verificação inicial', vi: 'Đóng phần kiểm tra mở đầu', id: 'Tutup cek pembuka', tr: 'Giriş kontrolünü kapat', pl: 'Zamknij sprawdzian wstępny' }),
  counter: (n: number) => triLang(lang, { ru: `Вопрос ${n} из 3`, uk: `Питання ${n} з 3`, en: `Question ${n} of 3`, es: `Pregunta ${n} de 3`, 'pt-BR': `Pergunta ${n} de 3`, vi: `Câu ${n}/3`, id: `Pertanyaan ${n} dari 3`, tr: `Soru ${n}/3`, pl: `Pytanie ${n} z 3` }),
  collected: (n: number) => { const st = starsText(n, lang); return triLang(lang, { ru: `Собрано ${st} в этой сессии`, uk: `Зібрано ${st} у цій сесії`, en: `${st} collected this session`, es: `${st} en esta sesión`, 'pt-BR': `${st} nesta sessão`, vi: `Đã nhận ${st} trong phiên này`, id: `${st} terkumpul di sesi ini`, tr: `Bu oturumda ${st} toplandı`, pl: `Zebrano ${st} w tej sesji` }); },
  eyebrow: triLang(lang, { ru: 'ПРОВЕРКА ИНТРО', uk: 'ПЕРЕВІРКА ІНТРО', en: 'INTRO CHECK', es: 'PRUEBA INICIAL', 'pt-BR': 'VERIFICAÇÃO INICIAL', vi: 'KIỂM TRA MỞ ĐẦU', id: 'CEK PEMBUKA', tr: 'GİRİŞ KONTROLÜ', pl: 'SPRAWDZIAN WSTĘPNY' }),
  eyebrowDetail: triLang(lang, { ru: '3 вопроса · до 9 звёзд', uk: '3 питання · до 9 зірок', en: '3 questions · up to 9 stars', es: '3 preguntas · hasta 9 estrellas', 'pt-BR': '3 perguntas · até 9 estrelas', vi: '3 câu hỏi · tối đa 9 sao', id: '3 pertanyaan · hingga 9 bintang', tr: '3 soru · en fazla 9 yıldız', pl: '3 pytania · do 9 gwiazdek' }),
  questionNumber: (n: number) => triLang(lang, { ru: `ВОПРОС ${n}`, uk: `ПИТАННЯ ${n}`, en: `QUESTION ${n}`, es: `PREGUNTA ${n}`, 'pt-BR': `PERGUNTA ${n}`, vi: `CÂU ${n}`, id: `PERTANYAAN ${n}`, tr: `SORU ${n}`, pl: `PYTANIE ${n}` }),
  answer: (letter: string, choice: string) => triLang(lang, { ru: `Ответ ${letter}: ${choice}`, uk: `Відповідь ${letter}: ${choice}`, en: `Answer ${letter}: ${choice}`, es: `Respuesta ${letter}: ${choice}`, 'pt-BR': `Resposta ${letter}: ${choice}`, vi: `Đáp án ${letter}: ${choice}`, id: `Jawaban ${letter}: ${choice}`, tr: `Cevap ${letter}: ${choice}`, pl: `Odpowiedź ${letter}: ${choice}` }),
  wrong: triLang(lang, { ru: 'Почти. Перечитай формулу и попробуй ещё раз.', uk: 'Майже. Перечитай формулу й спробуй ще раз.', en: 'Almost. Reread the pattern and try again.', es: 'Casi. Vuelve a leer la fórmula e inténtalo otra vez.', 'pt-BR': 'Quase. Releia a fórmula e tente de novo.', vi: 'Gần đúng rồi. Đọc lại công thức và thử lần nữa.', id: 'Hampir. Baca lagi polanya dan coba sekali lagi.', tr: 'Neredeyse. Kalıbı yeniden oku ve tekrar dene.', pl: 'Prawie. Przeczytaj wzór jeszcze raz i spróbuj ponownie.' }),
  correctA11y: (n: number, explanation: string) => { const st = starsText(n, lang); return triLang(lang, { ru: `Верно. Плюс ${st}. ${explanation}`, uk: `Правильно. Плюс ${st}. ${explanation}`, en: `Correct. Plus ${st}. ${explanation}`, es: `Correcto. Más ${st}. ${explanation}`, 'pt-BR': `Correto. Mais ${st}. ${explanation}`, vi: `Đúng. Cộng ${st}. ${explanation}`, id: `Benar. Tambah ${st}. ${explanation}`, tr: `Doğru. Artı ${st}. ${explanation}`, pl: `Dobrze. Plus ${st}. ${explanation}` }); },
  correct: (n: number) => { const st = starsText(n, lang); return triLang(lang, { ru: `Верно! +${st}`, uk: `Правильно! +${st}`, en: `Correct! +${st}`, es: `¡Correcto! +${st}`, 'pt-BR': `Correto! +${st}`, vi: `Đúng rồi! +${st}`, id: `Benar! +${st}`, tr: `Doğru! +${st}`, pl: `Dobrze! +${st}` }); },
  attempt: (n: number) => triLang(lang, { ru: `Попытка ${n}`, uk: `Спроба ${n}`, en: `Attempt ${n}`, es: `Intento ${n}`, 'pt-BR': `Tentativa ${n}`, vi: `Lần thử ${n}`, id: `Percobaan ${n}`, tr: `Deneme ${n}`, pl: `Próba ${n}` }),
  skipA11y: triLang(lang, { ru: 'Пропустить вопрос интро', uk: 'Пропустити питання інтро', en: 'Skip intro question', es: 'Saltar la pregunta', 'pt-BR': 'Pular a pergunta', vi: 'Bỏ qua câu hỏi', id: 'Lewati pertanyaan', tr: 'Soruyu atla', pl: 'Pomiń pytanie' }),
  skipHint: triLang(lang, { ru: 'Вопрос получит ноль звёзд, проверка продолжится', uk: 'Питання отримає нуль зірок, перевірка продовжиться', en: 'This question gets zero stars; the check continues', es: 'La pregunta suma cero estrellas y la prueba sigue', 'pt-BR': 'A pergunta fica sem estrelas e a verificação continua', vi: 'Câu này được 0 sao, bài kiểm tra vẫn tiếp tục', id: 'Pertanyaan ini dapat nol bintang, cek berlanjut', tr: 'Bu soru sıfır yıldız alır, kontrol devam eder', pl: 'Pytanie dostanie zero gwiazdek, sprawdzian trwa dalej' }),
  skip: triLang(lang, { ru: 'Пропустить', uk: 'Пропустити', en: 'Skip', es: 'Saltar', 'pt-BR': 'Pular', vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń' }),
  start: triLang(lang, { ru: 'Начать сессию', uk: 'Почати сесію', en: 'Start session', es: 'Empezar la sesión', 'pt-BR': 'Começar a sessão', vi: 'Bắt đầu phiên', id: 'Mulai sesi', tr: 'Oturumu başlat', pl: 'Zacznij sesję' }),
  next: triLang(lang, { ru: 'Следующий вопрос', uk: 'Наступне питання', en: 'Next question', es: 'Siguiente pregunta', 'pt-BR': 'Próxima pergunta', vi: 'Câu tiếp theo', id: 'Pertanyaan berikutnya', tr: 'Sonraki soru', pl: 'Następne pytanie' }),
});

/**
 * Three generator-owned comprehension checks. They intentionally consume the
 * first three canonical task IDs, so the final completion envelope remains an
 * exact 12-task record and still contains no answer text.
 */
export default function LearningV2SessionIntroCheck({
  bindings,
  displayedStars,
  onAward,
  onComplete,
  onBack,
}: LearningV2SessionIntroCheckProps) {
  const { lang } = useLang();
  const t = useMemo(() => introCopy(lang), [lang]);
  const insets = useStableSafeAreaInsets();
  // зачем (владелец, 2026-08-23): на 667pt (iPhone SE/8) экран не помещался
  // даже при одной строке текста — дефицит 31pt, а с вопросом в две строки и
  // блоком награды доходило до 67pt. Кнопка «Дальше» и последний вариант
  // ответа уезжали под нижний край. Лечим двумя слоями: прокрутка (страховка
  // на любой длине текста и крупном системном шрифте) + ужатый вертикальный
  // ритм, чтобы в типичном случае прокручивать вообще не пришлось.
  const { height: windowHeight } = useWindowDimensions();
  const shortScreen = isShortScreen(windowHeight);
  const reducedMotion = useReducedMotion();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<IntroCheckResult>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [latestAward, setLatestAward] = useState<1 | 2 | 3>(3);
  const completionsRef = useRef(new Map<string, RequiredSessionTaskCompletionInputV3>());
  const transitionLatchRef = useRef(false);
  const rewardScale = useSharedValue(1);
  const answerShake = useSharedValue(0);
  const binding = bindings[questionIndex];
  const question = binding.question;
  const prompt = question.promptByLocale[lang];
  const choices = question.choicesByLocale[lang];
  const explanation = question.explanationByLocale[lang];
  const progress = (questionIndex + 1) / 3;
  const progressStyle = useMemo(() => ({ width: `${Math.round(progress * 100)}%` as `${number}%` }), [progress]);
  const rewardStyle = useAnimatedStyle(() => ({ transform: [{ scale: rewardScale.value }] }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: answerShake.value }] }));

  const runRewardMotion = useCallback(() => {
    if (reducedMotion) return;
    rewardScale.value = withSequence(
      withSpring(1.18, { damping: 8, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
  }, [reducedMotion, rewardScale]);

  const runWrongMotion = useCallback(() => {
    if (reducedMotion) return;
    answerShake.value = withSequence(
      withTiming(-8, { duration: 45, reduceMotion: ReduceMotion.System }),
      withTiming(7, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(-5, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 60, reduceMotion: ReduceMotion.System }),
    );
  }, [answerShake, reducedMotion]);

  const completeOrAdvance = useCallback(() => {
    if (transitionLatchRef.current) return;
    transitionLatchRef.current = true;
    if (questionIndex === 2) {
      const results = bindings.map(({ taskCardId }) => completionsRef.current.get(taskCardId));
      if (results.some((entry) => !entry)) throw new Error('learning_v2_intro_check_incomplete');
      onComplete(results as RequiredSessionTaskCompletionInputV3[]);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setResult('idle');
    setSelectedIndex(null);
    setAttempts(1);
    transitionLatchRef.current = false;
  }, [bindings, onComplete, questionIndex]);

  const choose = (choiceIndex: number) => {
    if (result === 'correct') return;
    void hapticTap();
    setSelectedIndex(choiceIndex);
    if (choiceIndex === question.correctChoiceIndex) {
      const completion = Object.freeze({
        taskId: binding.taskCardId,
        disposition: 'completed' as const,
        learnerAttempts: attempts,
        hintUsed: false,
      });
      completionsRef.current.set(binding.taskCardId, completion);
      const award = projectRequiredTaskStars(completion).stars as 1 | 2 | 3;
      setLatestAward(award);
      setResult('correct');
      onAward(binding.taskCardId, award);
      runRewardMotion();
      void hapticSuccess();
      return;
    }
    setAttempts((value) => value + 1);
    setResult('wrong');
    runWrongMotion();
    void hapticError();
  };

  const skip = () => {
    if (transitionLatchRef.current || result === 'correct') return;
    completionsRef.current.set(binding.taskCardId, Object.freeze({
      taskId: binding.taskCardId,
      disposition: 'skipped' as const,
      learnerAttempts: Math.max(0, attempts - 1),
      hintUsed: false,
    }));
    void hapticTap();
    completeOrAdvance();
  };

  return (
    <LinearGradient colors={['#10151D', '#151B26', '#0E1219']} style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.close}
          hitSlop={10}
          onPressIn={() => void hapticTap()}
          onPress={onBack}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={24} color="#EAF0F6" />
        </Pressable>
        <View style={styles.progressTrack}><View style={[styles.progressFill, progressStyle]} /></View>
        <View accessible accessibilityLabel={t.counter(questionIndex + 1)} style={styles.counter}>
          <Text style={styles.counterText}>{questionIndex + 1}/3</Text>
        </View>
        <Animated.View
          accessible
          accessibilityLabel={t.collected(displayedStars)}
          style={[styles.starCounter, rewardStyle]}
        >
          <Ionicons name="star" size={17} color="#FFD75A" />
          <Text style={styles.starCounterText}>{displayedStars}</Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[styles.content, shortScreen && styles.contentShort]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <Animated.View
          key={`intro-check-heading-${questionIndex}`}
          entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
          style={[styles.eyebrowRow, shortScreen && styles.eyebrowRowShort]}
        >
          <View style={styles.eyebrowIcon}><Ionicons name="sparkles" size={18} color="#F8C84E" /></View>
          <View style={styles.eyebrowCopy}>
            <Text style={styles.eyebrow}>{t.eyebrow}</Text>
            <Text style={styles.eyebrowDetail}>{t.eyebrowDetail}</Text>
          </View>
        </Animated.View>

        <Animated.View
          key={`intro-check-card-${questionIndex}`}
          entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(280).reduceMotion(ReduceMotion.System)}
          style={[styles.questionCard, shortScreen && styles.questionCardShort]}
        >
          <Text style={styles.questionNumber}>{t.questionNumber(questionIndex + 1)}</Text>
          <Text style={styles.prompt}>{prompt}</Text>
        </Animated.View>

        <Animated.View style={[styles.choices, shortScreen && styles.choicesShort, shakeStyle]}>
          {choices.map((choice, index) => {
            const isCorrect = result === 'correct' && index === question.correctChoiceIndex;
            const isWrong = result === 'wrong' && index === selectedIndex;
            return (
              <Pressable
                key={`${question.questionId}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={t.answer(String.fromCharCode(65 + index), choice)}
                accessibilityState={{ selected: selectedIndex === index, disabled: result === 'correct' }}
                disabled={result === 'correct'}
                onPress={() => choose(index)}
                style={({ pressed }) => [
                  styles.choice,
                  isCorrect && styles.choiceCorrect,
                  isWrong && styles.choiceWrong,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.choiceIndex, isCorrect && styles.choiceIndexCorrect, isWrong && styles.choiceIndexWrong]}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={styles.choiceText}>{choice}</Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={22} color="#8EE65A" />}
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {result === 'wrong' && (
          <Text accessibilityLiveRegion="polite" style={styles.feedbackWrong}>
            {t.wrong}
          </Text>
        )}
        {result === 'correct' && (
          <Animated.View
            key={`${binding.taskCardId}-${latestAward}`}
            entering={reducedMotion ? FadeIn.duration(1) : FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={t.correctA11y(latestAward, explanation)}
            style={styles.rewardMoment}
          >
            <View importantForAccessibility="no-hide-descendants" style={styles.rewardStars}>
              {[1, 2, 3].map((position) => (
                <Ionicons key={position} name={position <= latestAward ? 'star' : 'star-outline'} size={25} color={position <= latestAward ? '#FFD75A' : '#596273'} />
              ))}
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.feedbackCorrect}>{t.correct(latestAward)}</Text>
              <Text style={styles.explanation}>{explanation}</Text>
            </View>
          </Animated.View>
        )}
        {result !== 'correct' && (
          <View style={styles.assistRow}>
            <Text style={styles.attemptText}>{t.attempt(attempts)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.skipA11y}
              accessibilityHint={t.skipHint}
              onPress={skip}
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            >
              <Text style={styles.skipText}>{t.skip}</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: result !== 'correct' }}
          disabled={result !== 'correct'}
          onPressIn={() => void hapticTap()}
          onPress={completeOrAdvance}
          style={({ pressed }) => [styles.cta, result !== 'correct' && styles.ctaDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{questionIndex === 2 ? t.start : t.next}</Text>
          <Ionicons name="arrow-forward" size={20} color="#07110A" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// зачем («Тень» 12.10): экран проверки на фиксированной тёмной палитре без токенов темы — обводки сняты, плашки отделяет тень тех же чисел спеки
const PLATE_SHADOW: BoxShadowValue[] = [{ offsetX: 0, offsetY: 16, blurRadius: 28, spreadDistance: -14, color: 'rgba(0,0,0,0.75)' }]; // theme-exempt: фиксированная тёмная палитра экрана, тень плашки спеки
const NESTED_SHADOW: BoxShadowValue[] = [{ offsetX: 0, offsetY: 6, blurRadius: 12, spreadDistance: -6, color: 'rgba(0,0,0,0.6)' }]; // theme-exempt: фиксированная тёмная палитра экрана, тень вложенного спеки

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10151D' },
  top: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: '#202936', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1, height: 8, borderRadius: 8, backgroundColor: '#27313F', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#F8C84E' },
  counter: { minWidth: 46, height: 34, borderRadius: 14, backgroundColor: '#202936', alignItems: 'center', justifyContent: 'center' },
  counterText: { color: '#E9EEF4', fontWeight: '700', fontSize: 13 },
  starCounter: { minWidth: 58, height: 38, borderRadius: 16, backgroundColor: '#2D2819', boxShadow: NESTED_SHADOW, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  starCounterText: { color: '#FFF1B8', fontWeight: '700', fontSize: 16 },
  // Скролл-оболочка держит flex:1, а сам контент растёт по содержимому:
  // flexGrow:1 сохраняет прежнее «занимает всё место», когда текста мало.
  contentScroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 26, paddingBottom: 8 },
  // Низкий экран: ужимаем только отступы, кегли не трогаем — вопрос обязан
  // читаться так же, а места отыгрывается ~24pt.
  contentShort: { paddingTop: 14 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  eyebrowRowShort: { marginBottom: 10 },
  eyebrowIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#F8C84E1F', boxShadow: NESTED_SHADOW, alignItems: 'center', justifyContent: 'center' },
  eyebrowCopy: { flex: 1 },
  eyebrow: { color: '#F8C84E', fontSize: 13, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700' },
  eyebrowDetail: { color: '#7F8B99', fontSize: 13, lineHeight: 18, marginTop: 2, fontWeight: '700' },
  questionCard: { minHeight: 180, borderRadius: 28, backgroundColor: '#1B2430', padding: 24, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  // Карточка вопроса: на низком экране минимум ниже, текст всё равно ведёт.
  questionCardShort: { minHeight: 132, padding: 18 },
  questionNumber: { color: '#758395', fontSize: 13, lineHeight: 19, letterSpacing: 1.5, fontWeight: '700', textAlign: 'center' },
  prompt: { color: '#F8FAFC', fontSize: 25, lineHeight: 34, textAlign: 'center', fontWeight: '900', letterSpacing: -0.4, marginTop: 12 },
  choices: { gap: 11, marginTop: 18 },
  // Карточки ответов остаются 62pt высотой (палец), сокращаем только зазоры.
  choicesShort: { gap: 8, marginTop: 12 },
  choice: { minHeight: 62, borderRadius: 20, backgroundColor: '#1A222D', boxShadow: PLATE_SHADOW, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceCorrect: { backgroundColor: '#203A25', borderColor: '#8EE65A', borderWidth: 1 }, // shadow-ok: кольцо исхода «верно»
  choiceWrong: { backgroundColor: '#3A2327', borderColor: '#FB7185', borderWidth: 1 }, // shadow-ok: кольцо исхода «неверно»
  choiceIndex: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#2A3543', color: '#BFC9D4', textAlign: 'center', textAlignVertical: 'center', lineHeight: 32, fontWeight: '900' },
  choiceIndexCorrect: { backgroundColor: '#8EE65A', color: '#07110A' },
  choiceIndexWrong: { backgroundColor: '#FB7185', color: '#07110A' },
  choiceText: { flex: 1, color: '#EDF2F7', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  bottom: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: '#121821F2' },
  feedbackWrong: { color: '#FF9B9B', fontWeight: '700', lineHeight: 20, marginBottom: 8 },
  rewardMoment: { minHeight: 72, borderRadius: 18, boxShadow: NESTED_SHADOW, backgroundColor: '#2B2619', paddingHorizontal: 13, paddingVertical: 9, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardStars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rewardCopy: { flex: 1 },
  feedbackCorrect: { color: '#FFF2B5', fontWeight: '700', fontSize: 16 },
  explanation: { color: '#C7B777', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  assistRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attemptText: { color: '#7F8B99', fontSize: 13, fontWeight: '700' },
  skipButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { color: '#AEB9C5', fontWeight: '800' },
  cta: { height: 58, borderRadius: 20, backgroundColor: '#8EE65A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ctaDisabled: { opacity: 0.35 },
  ctaText: { color: '#07110A', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});

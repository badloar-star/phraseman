/**
 * «Проверь себя» — три вопроса по фразам только что просмотренного ролика.
 *
 * зачем (владелец 11.11: «чтобы юзерам нравился раздел и им было чем заняться кроме смотреть видео»; макет
 * docs/work/mockups/video-hub-2026-11-11/index.html, экран 3): после ролика — короткая проверка. Вопросы собирает
 * app/video_quiz_core.ts на телефоне из уже загруженных фраз ролика (неверные варианты — фразы того же ролика),
 * сервер не участвует: новых чтений Firestore нет. Ошибка отправляет фразу в карточки — тем же путём, что закладка
 * в списке фраз (addFlashcard, source 'video_phrase').
 *
 * Первый кадр — из кэша фраз в памяти процесса (экран открывают с экрана ролика, где фразы уже загружены), без экрана
 * загрузки; сети экран не ждёт. Имя маршрута начинается с `/lingman_video`, поэтому раздел и язык раздела — «Видео»
 * (app/section_language.ts), отдельной регистрации не нужно.
 *
 * Видов вопроса два: «как это сказать» и «что это значит». Вопроса «на слух» нет — владелец 11.11: «что сказал профессор — не надо».
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { V2AnswerOption, V2Button, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { V2, V2_TYPE } from '../constants/v2Style';
import { addFlashcard } from '../hooks/use-flashcards';
import type { VideoPhrase } from '../shared/video_phrases_contract';
import { normalizePackLanguage } from './flashcards/pack_languages';
import { LINGMAN_BACK_FALLBACK, safeRouterBack } from './navigation_back';
import { useEffectiveStudyTarget } from './section_language';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { loadVideoPhrasesCached, peekCachedVideoPhrases } from './video_phrases_client';
import { buildVideoQuiz, canBuildVideoQuiz, type VideoQuizQuestion } from './video_quiz_core';

const LOG = '[VIDEO-QUIZ]';

type Params = { videoId?: string; title?: string; packLanguage?: string; sourceTitle?: string };
/** Что случилось с фразой после ошибки: добавлена в карточки, уже была там, или добавить не вышло (тогда ничего не обещаем). */
type MissNote = 'added' | 'duplicate' | 'none';

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export default function LingmanVideoQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const videoId = typeof params.videoId === 'string' ? params.videoId : '';
  const sourceTitle = typeof params.sourceTitle === 'string' && params.sourceTitle ? params.sourceTitle : undefined;
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const p = useV2Palette();
  const insets = useStableSafeAreaInsets();
  const { studyTarget: globalStudyTarget } = useStudyTarget();
  const sectionTarget = useEffectiveStudyTarget(globalStudyTarget);
  // зачем: карточка из ошибки должна лечь в тот же язык, что и закладки этого ролика — язык приходит с экрана ролика, иначе берём язык раздела.
  const packLanguage = normalizePackLanguage(typeof params.packLanguage === 'string' && params.packLanguage ? params.packLanguage : sectionTarget);

  const [phrases, setPhrases] = useState<readonly VideoPhrase[] | null>(() => peekCachedVideoPhrases(videoId) ?? null);
  const [seed, setSeed] = useState<number>(newSeed);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [rightCount, setRightCount] = useState(0);
  const [missNote, setMissNote] = useState<MissNote | null>(null);
  const [finished, setFinished] = useState(false);
  /** Защита от двойного касания: состояние обновится только в следующем кадре, а второй тап может прийти раньше. */
  const answerLockRef = useRef(false);

  const close = useCallback((reason: string) => {
    console.log(LOG, 'close', JSON.stringify({ videoId, reason })); // guard-ok: выход с экрана называет причину
    safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
  }, [router, videoId]);

  // Фраз нет в памяти (экран открыли не с ролика) — берём кэш с диска/сеть фоном; экран при этом уже стоит с шапкой.
  useEffect(() => {
    if (!videoId) {
      console.warn(LOG, 'open:no_video_id → назад'); // guard-ok: ранний выход логируется
      safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
      return undefined;
    }
    if (phrases) {
      console.log(LOG, 'open', JSON.stringify({ videoId, phrasesFrom: 'memory', phrases: phrases.length, canBuild: canBuildVideoQuiz(phrases), packLanguage })); // guard-ok: вход на экран
      return undefined;
    }
    let alive = true;
    const startedAt = Date.now();
    loadVideoPhrasesCached(videoId).then((loaded) => {
      console.log(LOG, 'open', JSON.stringify({ videoId, phrasesFrom: loaded.from, phrases: loaded.phrases.length, canBuild: canBuildVideoQuiz(loaded.phrases), ms: Date.now() - startedAt, alive, packLanguage })); // guard-ok: вход на экран
      if (alive) setPhrases(loaded.phrases);
    }).catch((error: unknown) => {
      console.warn(LOG, 'open:phrases_failed → назад', JSON.stringify({ videoId, ms: Date.now() - startedAt, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch логируется
      if (alive) safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
    });
    return () => { alive = false; };
    // зачем: эффект — про вход на экран; phrases намеренно не в зависимостях, иначе загрузка запускалась бы повторно после своего же результата.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, videoId]);

  const quiz = useMemo<readonly VideoQuizQuestion[]>(() => (phrases ? buildVideoQuiz(phrases, { seed }) : []), [phrases, seed]);

  // Фразы есть, но на тест их не хватает (меньше трёх разных) — экран открыт зря: уходим назад, а не показываем пустоту.
  useEffect(() => {
    if (!phrases || quiz.length > 0) return;
    console.warn(LOG, 'open:not_enough_phrases → назад', JSON.stringify({ videoId, phrases: phrases.length })); // guard-ok: ранний выход логируется
    safeRouterBack(router, LINGMAN_BACK_FALLBACK as never);
  }, [phrases, quiz.length, router, videoId]);

  const question = quiz[index];

  const answer = useCallback((optionIndex: number) => {
    if (!question || answerLockRef.current) {
      console.log(LOG, 'answer:skipped', JSON.stringify({ videoId, index, hasQuestion: !!question, locked: answerLockRef.current })); // guard-ok: ранний выход логируется
      return;
    }
    answerLockRef.current = true;
    const good = optionIndex === question.correctIndex;
    console.log(LOG, 'answer', JSON.stringify({ videoId, index, kind: question.kind, phraseId: question.phraseId, picked: optionIndex, correct: question.correctIndex, good })); // guard-ok: ответ и что его решило
    setPicked(optionIndex);
    if (good) { setRightCount((value) => value + 1); return; }
    // зачем (макет, экран 3): ошибка сама кладёт фразу в карточки. Обещаем «добавлена» только по факту записи — не раньше.
    const missed = phrases?.find((item) => item.id === question.phraseId);
    if (!missed) {
      console.warn(LOG, 'miss:phrase_not_found', JSON.stringify({ videoId, phraseId: question.phraseId })); // guard-ok: ранний выход логируется
      setMissNote('none');
      return;
    }
    addFlashcard({ en: missed.phrase, ru: missed.translation, uk: missed.translation, source: 'video_phrase', sourceId: missed.id, sourceTitle, explanationRu: missed.explanation, packLanguage }, packLanguage)
      .then((result) => {
        const note: MissNote = result === 'added' ? 'added' : result === 'duplicate' ? 'duplicate' : 'none';
        console.log(LOG, 'miss:card', JSON.stringify({ videoId, phraseId: missed.id, result: String(result), note })); // guard-ok: исход записи карточки (лимит Free даёт note=none — без окна оплаты посреди теста)
        setMissNote(note);
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'miss:card_failed', JSON.stringify({ videoId, phraseId: missed.id, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch логируется
        setMissNote('none');
      });
  }, [index, packLanguage, phrases, question, sourceTitle, videoId]);

  const next = useCallback(() => {
    const last = index + 1 >= quiz.length;
    console.log(LOG, last ? 'finish' : 'next', JSON.stringify({ videoId, index, total: quiz.length, right: rightCount })); // guard-ok: переход между вопросами / итог, который увидит человек
    answerLockRef.current = false;
    setPicked(null);
    setMissNote(null);
    if (last) setFinished(true); else setIndex(index + 1);
  }, [index, quiz.length, rightCount, videoId]);

  const again = useCallback(() => {
    console.log(LOG, 'again', JSON.stringify({ videoId })); // guard-ok: повтор теста с новым порядком
    answerLockRef.current = false;
    setSeed(newSeed());
    setIndex(0);
    setPicked(null);
    setMissNote(null);
    setRightCount(0);
    setFinished(false);
  }, [videoId]);

  const copy = useMemo(() => triLang(lang, {
    ru: { close: 'Закрыть', toTarget: 'Как это сказать?', toNative: 'Что это значит?', next: 'Дальше', finish: 'Готово', right: 'Верно', added: 'Фраза добавлена в карточки на повтор', duplicate: 'Эта фраза уже в карточках', plain: 'Правильный ответ отмечен', again: 'Пройти ещё раз', all: 'Всё верно', some: 'Хорошо', none: 'Стоит пересмотреть', of: 'из' },
    uk: { close: 'Закрити', toTarget: 'Як це сказати?', toNative: 'Що це означає?', next: 'Далі', finish: 'Готово', right: 'Правильно', added: 'Вислів додано до карток на повторення', duplicate: 'Цей вислів уже в картках', plain: 'Правильну відповідь позначено', again: 'Пройти ще раз', all: 'Усе правильно', some: 'Добре', none: 'Варто переглянути ще раз', of: 'із' },
    en: { close: 'Close', toTarget: 'How do you say this?', toNative: 'What does this mean?', next: 'Next', finish: 'Done', right: 'Correct', added: 'Phrase added to your cards for review', duplicate: 'This phrase is already in your cards', plain: 'The correct answer is marked', again: 'Try again', all: 'All correct', some: 'Nice', none: 'Worth another watch', of: 'of' },
    es: { close: 'Cerrar', toTarget: '¿Cómo se dice esto?', toNative: '¿Qué significa esto?', next: 'Siguiente', finish: 'Listo', right: 'Correcto', added: 'Frase añadida a tus tarjetas para repasar', duplicate: 'Esta frase ya está en tus tarjetas', plain: 'La respuesta correcta está marcada', again: 'Repetir', all: 'Todo correcto', some: 'Bien', none: 'Vale la pena verlo otra vez', of: 'de' },
    'pt-BR': { close: 'Fechar', toTarget: 'Como se diz isso?', toNative: 'O que isso significa?', next: 'Próxima', finish: 'Pronto', right: 'Correto', added: 'Frase adicionada aos seus cartões para revisão', duplicate: 'Essa frase já está nos seus cartões', plain: 'A resposta correta está marcada', again: 'Tentar de novo', all: 'Tudo certo', some: 'Boa', none: 'Vale a pena rever', of: 'de' },
    vi: { close: 'Đóng', toTarget: 'Câu này nói thế nào?', toNative: 'Câu này nghĩa là gì?', next: 'Tiếp', finish: 'Xong', right: 'Đúng', added: 'Đã thêm cụm từ vào thẻ để ôn lại', duplicate: 'Cụm từ này đã có trong thẻ', plain: 'Đáp án đúng đã được đánh dấu', again: 'Làm lại', all: 'Đúng hết', some: 'Tốt', none: 'Nên xem lại video', of: 'trên' },
    id: { close: 'Tutup', toTarget: 'Bagaimana mengatakannya?', toNative: 'Apa artinya ini?', next: 'Lanjut', finish: 'Selesai', right: 'Benar', added: 'Frasa ditambahkan ke kartu untuk diulang', duplicate: 'Frasa ini sudah ada di kartu', plain: 'Jawaban yang benar sudah ditandai', again: 'Ulangi', all: 'Semua benar', some: 'Bagus', none: 'Sebaiknya tonton lagi', of: 'dari' },
    tr: { close: 'Kapat', toTarget: 'Bu nasıl söylenir?', toNative: 'Bu ne demek?', next: 'İleri', finish: 'Tamam', right: 'Doğru', added: 'İfade tekrar için kartlarına eklendi', duplicate: 'Bu ifade zaten kartlarında', plain: 'Doğru cevap işaretlendi', again: 'Tekrar dene', all: 'Hepsi doğru', some: 'İyi', none: 'Tekrar izlemeye değer', of: '/' },
    pl: { close: 'Zamknij', toTarget: 'Jak to powiedzieć?', toNative: 'Co to znaczy?', next: 'Dalej', finish: 'Gotowe', right: 'Dobrze', added: 'Zwrot dodany do kart do powtórki', duplicate: 'Ten zwrot jest już w kartach', plain: 'Poprawna odpowiedź jest zaznaczona', again: 'Spróbuj jeszcze raz', all: 'Wszystko dobrze', some: 'Nieźle', none: 'Warto obejrzeć jeszcze raz', of: 'z' },
  }), [lang]);

  const total = quiz.length;
  const answered = picked !== null;
  const goodAnswer = answered && question ? picked === question.correctIndex : false;
  const feedback = !answered ? '' : goodAnswer ? copy.right : missNote === 'added' ? copy.added : missNote === 'duplicate' ? copy.duplicate : missNote === 'none' ? copy.plain : '';
  const kicker = !question ? '' : question.kind === 'to_target' ? copy.toTarget : copy.toNative;
  const resultTitle = rightCount === total ? copy.all : rightCount === 0 ? copy.none : copy.some;

  return (
    <ScreenGradient artBackdrop="home">
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      <SafeAreaView testID="lingman-video-quiz" style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.topbar}>
          <V2IconButton testID="lingman-video-quiz-close" icon="close" accessibilityLabel={copy.close} onPress={() => close('close_button')} />
          {/* Полоса из трёх отрезков: закрашен каждый вопрос, на который уже ответили. */}
          <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: finished ? total : index + (answered ? 1 : 0) }}>
            {quiz.map((item, i) => (
              <View key={item.phraseId} style={[styles.segment, { backgroundColor: finished || i < index || (i === index && answered) ? p.text : p.track }]} />
            ))}
          </View>
        </View>
        {finished ? (
          <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.result}>
              <Text testID="lingman-video-quiz-score" style={[styles.score, { color: p.text }]} maxFontSizeMultiplier={1.2}>
                {rightCount}<Text style={[styles.scoreOf, { color: p.textMuted }]}>{` ${copy.of} ${total}`}</Text>
              </Text>
              <Text accessibilityRole="header" style={[styles.resultTitle, { color: p.text }]}>{resultTitle}</Text>
            </View>
            <View style={styles.actions}>
              <V2Button testID="lingman-video-quiz-done" label={copy.finish} onPress={() => close('result_done')} />
              <V2Button testID="lingman-video-quiz-again" label={copy.again} variant="ghost" onPress={again} />
            </View>
          </View>
        ) : question ? (
          <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={[styles.kicker, { color: p.textSecondary }]}>{kicker}</Text>
            <Text accessibilityRole="header" style={[styles.prompt, { color: p.text }]}>{question.prompt}</Text>
            <View style={styles.options}>
              {question.options.map((label, i) => (
                <V2AnswerOption
                  key={`${index}:${label}`}
                  testID={`lingman-video-quiz-option-${i}`}
                  label={label}
                  disabled={answered}
                  state={!answered ? 'idle' : i === question.correctIndex ? 'correct' : i === picked ? 'wrong' : 'dimmed'}
                  onPress={() => answer(i)}
                />
              ))}
            </View>
            {/* зачем (устойчивость вёрстки): место под строку исхода и кнопку занято всегда — после ответа ничего не сдвигается, кнопка только становится активной. */}
            <View style={styles.footer}>
              <Text testID="lingman-video-quiz-feedback" accessibilityLiveRegion="polite" style={[styles.feedback, { color: goodAnswer ? p.correct : p.text }]}>{feedback}</Text>
              <V2Button testID="lingman-video-quiz-next" label={index + 1 < total ? copy.next : copy.finish} disabled={!answered} onPress={next} />
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topbar: { height: 44, marginTop: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  segments: { flex: 1, flexDirection: 'row', gap: 6, marginRight: 8 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  body: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 24 },
  kicker: { ...V2_TYPE.body },
  prompt: { ...V2_TYPE.title, marginTop: 6 },
  options: { marginTop: 22, gap: 10 },
  footer: { marginTop: 'auto', gap: 14 },
  feedback: { ...V2_TYPE.headline, minHeight: 42, paddingHorizontal: 4 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 72, lineHeight: 80, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  scoreOf: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  resultTitle: { ...V2_TYPE.title, marginTop: 8, textAlign: 'center' },
  actions: { gap: 4 },
});

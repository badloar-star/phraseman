// ChapterExamV2Run.tsx — экзамен главы v2 целиком: шапка, 10 вопросов, итог, разбор, повтор тем (прототип chapter-exam-v2-prototype.html).
// зачем (владелец утвердил прототип 25.10, координатор): глава с банком v2 сдаётся здесь; данные и запись — app/learning_v2_chapter_exam_v2.ts
// (без сети). Энергия — как у прежнего экзамена: 1 при показе первого вопроса, Plus бесплатно, повторный вход ту же попытку не списывает.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import V2Pressable from '../../v2/V2Pressable';
import NoEnergyModal from '../../NoEnergyModal';
import { useLang } from '../../LangContext';
import { useEnergy } from '../../EnergyContext';
import { useStudyTarget } from '../../StudyTargetContext';
import { useLv2Glass } from '../LearningV2Glass';
import { lv2TaskTokens } from '../learning_v2_task_theme_tokens';
import { learningV2ChapterExamCopy } from '../learning_v2_chapter_exam_copy';
import { learningV2ChapterExamResultCopy } from '../learning_v2_chapter_exam_result_copy';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { safeRouterBack } from '../../../app/navigation_back';
import { getStableId } from '../../../app/stable_id';
import { createEnergySessionIntent } from '../../../app/energy_session_operation_ledger';
import { grantChapterExamCoinsV1 } from '../../../app/learning_v2_chapter_exam_reward_v1';
import { launchLearningV2SessionByOrdinalsV1 } from '../../../app/learning_v2_home_continue_route';
import { deriveLocalOfflineProgressAccountScopeHash } from '../../../modules/learning-v2/progress/progress_account_scope';
import {
  chapterExamV2ReviewStateFor,
  finishChapterExamV2,
  prepareChapterExamV2,
  type ChapterExamV2ReviewState,
} from '../../../app/learning_v2_chapter_exam_v2';
import type { ChapterExamV2Bank, ChapterExamV2Item, ChapterExamV2Result } from '../../../modules/learning-v2/exam/chapter_exam_v2';
import ChapterExamV2Question, { type ChapterExamV2AnswerRecord } from './ChapterExamV2Question';
import { ChapterExamV2MistakesView, ChapterExamV2ResultView, ChapterExamV2ReviewView } from './ChapterExamV2Result';
import { chapterExamV2Copy } from './chapter_exam_v2_copy';
import { useChapterExamV2Colors } from './chapter_exam_v2_colors';

const LOG = '[CHAPTER-EXAM-V2]';

type Attempt = Readonly<{ examKey: string; attempt: number; bank: ChapterExamV2Bank; items: readonly ChapterExamV2Item[] }>;
type Outcome = Readonly<{ result: ChapterExamV2Result; startEpisode: number | null; retryMinutes: number | null }>;
type Phase = 'question' | 'result' | 'mistakes' | 'review';

const episodeOf = (sessionId: string | null): number | null => {
  const n = Number(/session[:-]0*(\d+)/u.exec(sessionId ?? '')?.[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function ChapterExamV2Run({ lessonOrdinal, chapterOrdinal, source }: Readonly<{ lessonOrdinal: number; chapterOrdinal: number; source: string | null }>) {
  const router = useRouter();
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  const c = useChapterExamV2Colors();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { isUnlimited, confirmActivityStart } = useEnergy();
  const [scope, setScope] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<readonly ChapterExamV2AnswerRecord[]>([]);
  const [writeMode, setWriteMode] = useState(false);
  const [phase, setPhase] = useState<Phase>('question');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reward, setReward] = useState<number | null>(null);
  const [review, setReview] = useState<ChapterExamV2ReviewState | null>(null);
  const [cooldownBank, setCooldownBank] = useState<ChapterExamV2Bank | null>(null);
  const [noEnergy, setNoEnergy] = useState(false);
  const chargedKeyRef = useRef<string | null>(null);
  const finishingRef = useRef(false);

  const close = useCallback((reason: string) => {
    console.log(`${LOG} screen:close`, JSON.stringify({ reason, index, answered: answers.length, phase })); // guard-ok: выход и причина
    safeRouterBack(router, '/learning-v2/course' as never);
  }, [answers.length, index, phase, router]);

  const start = useCallback(async (reason: string) => {
    const id = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
    setScope(id);
    const prepared = await prepareChapterExamV2({ scope: id, lessonOrdinal, chapterOrdinal });
    console.log(`${LOG} screen:start`, JSON.stringify({ reason, lessonOrdinal, chapterOrdinal, source, kind: prepared?.kind ?? 'none' })); // guard-ok: вход и что вышло
    if (!prepared) { close('no_bank'); return; }
    if (prepared.kind === 'cooldown') {
      // зачем: не сдал и вернулся раньше часа — сразу «Повтори эти темы»: повторил эпизоды — пересдать можно сразу
      setCooldownBank(prepared.bank);
      setReview(prepared.review);
      setOutcome({ result: { correct: 0, total: 0, passed: false, weakPoints: prepared.review?.weak ?? [] }, startEpisode: null, retryMinutes: prepared.minutesLeft });
      setPhase('review');
      return;
    }
    finishingRef.current = false;
    setCooldownBank(null);
    setAttempt({ examKey: prepared.examKey, attempt: prepared.attempt, bank: prepared.bank, items: prepared.items });
    setIndex(0);
    setAnswers([]);
    setWriteMode(false);
    setOutcome(null);
    setReward(null);
    setPhase('question');
  }, [chapterOrdinal, close, lessonOrdinal, source]);

  useEffect(() => {
    void start('open');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: экзамен готовится один раз на вход
  }, []);

  // Энергия — при показе первого вопроса попытки, один раз (номер операции = ключ экзамена + попытка).
  useEffect(() => {
    if (!attempt || phase !== 'question') return;
    const key = `${attempt.examKey}:attempt-${attempt.attempt}`;
    if (chargedKeyRef.current === key) return;
    chargedKeyRef.current = key;
    if (isUnlimited) { console.log(`${LOG} energy:skip`, JSON.stringify({ reason: 'unlimited' })); return; } // guard-ok: ветка
    void confirmActivityStart('level_exam', createEnergySessionIntent('level_exam', attempt.examKey, key)).then((result) => {
      console.log(`${LOG} energy:charge`, JSON.stringify({ key, result })); // guard-ok: ответ списания
      if (result === 'insufficient' || result === 'cancelled') setNoEnergy(true);
    });
  }, [attempt, confirmActivityStart, isUnlimited, phase]);

  // Вернулся из эпизода повтора — отметки плеера уже на диске: обновить список (пересдать, когда пройдены все).
  useFocusEffect(useCallback(() => {
    if (phase !== 'review' || !scope) return;
    const examKey = attempt?.examKey ?? null;
    void (async () => {
      const key = examKey ?? (await prepareChapterExamV2({ scope, lessonOrdinal, chapterOrdinal }))?.examKey ?? null;
      if (!key) return;
      const state = await chapterExamV2ReviewStateFor(scope, key);
      console.log(`${LOG} review:refresh`, JSON.stringify({ examKey: key, done: state?.done ?? [], episodes: state?.episodes ?? [] })); // guard-ok: что прочитали с диска
      if (state) setReview(state);
    })();
  }, [attempt?.examKey, chapterOrdinal, lessonOrdinal, phase, scope]));

  const onAnswered = useCallback((answer: ChapterExamV2AnswerRecord) => {
    setAnswers((current) => [...current.filter((a) => a.itemId !== answer.itemId), answer]);
  }, []);

  const onNext = useCallback(() => {
    if (!attempt || !scope) return;
    if (index + 1 < attempt.items.length) { setIndex(index + 1); return; }
    if (finishingRef.current) return;
    finishingRef.current = true;
    const finishedAtMs = Date.now();
    void finishChapterExamV2({ scope, examKey: attempt.examKey, bank: attempt.bank, items: attempt.items, answers, finishedAtMs }).then(({ result, finish }) => {
      const retryMinutes = finish.record.retryAtMs ? Math.max(1, Math.ceil((finish.record.retryAtMs - Date.now()) / 60_000)) : null;
      setOutcome({ result, startEpisode: result.passed ? episodeOf(finish.startSessionId) : null, retryMinutes });
      setReview(result.passed ? null : { weak: result.weakPoints, episodes: [...new Set(result.weakPoints.flatMap((w) => w.episodeOrdinals))].sort((a, b) => a - b), done: [] });
      setPhase('result');
      // 40 монет за ПЕРВУЮ сдачу — плашка сразу; локальная запись не удалась — плашку убираем (причина в журнале)
      if (finish.firstPass) {
        setReward(40);
        void grantChapterExamCoinsV1({ lessonOrdinal, chapterOrdinal }).then((granted) => {
          console.log(`${LOG} reward`, JSON.stringify({ examKey: attempt.examKey, granted, shown: granted === 'credited' })); // guard-ok: оставили плашку или откатили
          if (granted !== 'credited') setReward(null);
        });
      }
    }, (error: unknown) => {
      console.warn(`${LOG} screen:finish_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
      finishingRef.current = false;
    });
  }, [answers, attempt, chapterOrdinal, index, lessonOrdinal, scope]);

  const openEpisode = useCallback((episode: number) => {
    console.log(`${LOG} review:open_episode`, JSON.stringify({ lessonOrdinal, episode })); // guard-ok: куда ведёт нажатие
    void launchLearningV2SessionByOrdinalsV1({ lessonOrdinal, sessionOrdinal: episode, from: 'chapter_exam_review', repeat: true }, { lang, studyTarget, push: (href) => router.push(href as never) });
  }, [lang, lessonOrdinal, router, studyTarget]);

  const bank = attempt?.bank ?? cooldownBank;
  const showProgress = phase === 'question' && attempt !== null;
  const progress = attempt ? (index + (answers.length > index ? 1 : 0)) / attempt.items.length : 0;
  const item = attempt?.items[index] ?? null;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <V2Pressable testID="chapter-exam-v2-close" accessibilityLabel={chapterExamV2Copy(lang, 'close')} onPress={() => close(`close_${phase}`)} style={[styles.x, { backgroundColor: c.card, boxShadow: t.taskPlateShadow as never }]}>
          <Ionicons name="close" size={18} color={c.text} />
        </V2Pressable>
        {showProgress && attempt ? (
          <>
            <View style={[styles.track, { backgroundColor: c.track }]}>
              <View style={[styles.fill, { backgroundColor: c.trackFill, width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={[styles.cnt, { color: c.counter }]}>{chapterExamV2Copy(lang, 'progress', { i: index + 1, n: attempt.items.length })}</Text>
          </>
        ) : null}
      </View>
      {phase === 'question' && item ? (
        <ChapterExamV2Question key={`${attempt?.attempt}:${item.id}`} lang={lang} item={item} ordinal={index + 1} writeMode={writeMode} bottomInset={insets.bottom}
          onWriteMode={() => setWriteMode(true)} onAnswered={onAnswered} onNext={onNext} />
      ) : null}
      {phase === 'result' && outcome && bank ? (
        <ChapterExamV2ResultView lang={lang} bank={bank} result={outcome.result} answers={answers} startEpisode={outcome.startEpisode} reward={reward} retryMinutes={outcome.retryMinutes}
          bottomInset={insets.bottom} onToChapter={(n) => close(`to_chapter_${n}`)} onMistakes={() => setPhase('mistakes')} onReview={() => setPhase('review')} />
      ) : null}
      {phase === 'mistakes' && attempt ? (
        <ChapterExamV2MistakesView lang={lang} items={attempt.items} answers={answers} bottomInset={insets.bottom} onBack={() => setPhase('result')} />
      ) : null}
      {phase === 'review' && bank ? (
        <ChapterExamV2ReviewView lang={lang} bank={bank} weakPoints={review?.weak ?? outcome?.result.weakPoints ?? []} done={review?.done ?? []} bottomInset={insets.bottom}
          onEpisode={openEpisode} onRetake={() => { void start('retake'); }} onBack={() => (attempt && outcome ? setPhase('result') : close('review_back'))} />
      ) : null}
      {phase === 'question' && !item ? <View style={styles.flex} /> : null}
      <NoEnergyModal variant="course" activity="level_exam" visible={noEnergy} onClose={() => { setNoEnergy(false); close('no_energy'); }} />
      {/* доступность: заголовок экзамена для скринридера, на экране его нет (как в прототипе) */}
      <Text style={styles.srOnly} accessibilityRole="header">{learningV2ChapterExamCopy(lang, 'title', { n: chapterOrdinal })}</Text>
      {phase === 'review' && outcome?.retryMinutes && !attempt ? <Text style={styles.srOnly}>{learningV2ChapterExamResultCopy(lang, 'retryIn', { m: outcome.retryMinutes })}</Text> : null}
    </View>
  );
}

// Размеры — 1:1 по CSS прототипа (.top, .x, .track, .cnt): шапка 44 dp на 12 dp ниже статус-бара.
const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: { height: 44, marginTop: 12, marginBottom: 14 },
  x: { position: 'absolute', left: 20, top: 0, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', left: 77, right: 19, top: 13, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  cnt: { position: 'absolute', left: 77, top: 21, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});

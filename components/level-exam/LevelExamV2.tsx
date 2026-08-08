import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { checkAchievements } from '../../app/achievements';
import { trackFeatureError, trackFeatureStart, trackFeatureSuccess } from '../../app/app_activity';
import { buildLevelExamBlueprint } from '../../app/level_exam_blueprint';
import {
  applyLevelExamAnswer,
  beginLevelExamQuiz,
  completeLevelExamAttempt,
  createLevelExamAttempt,
  markLevelExamFinishing,
  remainingLevelExamMs,
  restoreLevelExamAttempt,
  type LevelExamAttemptSnapshot,
  type LevelExamFinishReason,
  type PersistedLevelExamAnswer,
} from '../../app/level_exam_attempt_state';
import {
  clearActiveLevelExamAttempt,
  loadActiveLevelExamAttempt,
  persistActiveLevelExamAttempt,
  recordCompletedLevelExamAttemptOnce,
} from '../../app/level_exam_attempts';
import { scoreLevelExam, type LevelExamScoreResult } from '../../app/level_exam_scoring';
import type { LevelExamBlueprint, LevelExamLevel, LevelExamTask } from '../../app/level_exam_types';
import { levelExamKey } from '../../app/target_storage_keys';
import { getCanonicalUserId } from '../../app/user_id_policy';
import { saveExamProgress } from '../../app/medal_utils';
import { getFirstLessonForLevel, getNextCourseLevel } from '../../app/course_levels';
import { markPremiumCourseLevelReached, unlockLesson } from '../../app/lesson_lock_system';
import { addShards, awardOneTime } from '../../app/shards_system';
import { registerXP } from '../../app/xp_manager';
import { safeRouterBack } from '../../app/navigation_back';
import { useEnergy } from '../EnergyContext';
import NoEnergyModal from '../NoEnergyModal';
import ScreenGradient from '../ScreenGradient';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import ThemedConfirmModal from '../ThemedConfirmModal';
import TonalSurface from '../TonalSurface';
import ContextChoiceQuestion from './ContextChoiceQuestion';
import LevelExamCountdown from './LevelExamCountdown';
import LevelExamIntro from './LevelExamIntro';
import LevelExamQuestionFrame from './LevelExamQuestionFrame';
import LevelExamResult, { type LevelExamRewardState } from './LevelExamResult';
import MeaningChoiceQuestion from './MeaningChoiceQuestion';
import PhraseBuilderQuestion from './PhraseBuilderQuestion';
import SpeedMatchQuestion from './SpeedMatchQuestion';
import SpotErrorQuestion from './SpotErrorQuestion';

const ENERGY_COST = 5;

type Props = {
  level: LevelExamLevel;
  lang: Lang;
  accessState: 'checking' | 'allowed' | 'blocked';
  blockedText: string;
};

type Phase = 'loading' | 'intro' | 'countdown' | 'quiz' | 'result';

function isSpeedMatchTask(task: LevelExamTask): task is Extract<LevelExamTask, { format: 'speed_match' }> {
  return task.format === 'speed_match';
}

function scoreRange(blueprint: LevelExamBlueprint, taskIndex: number): { start: number; end: number } {
  let before = 0;
  for (let index = 0; index < taskIndex; index += 1) {
    const previousTask = blueprint.tasks[index];
    before += isSpeedMatchTask(previousTask) ? previousTask.pairs.length : 1;
  }
  const current = blueprint.tasks[taskIndex];
  const count = current && isSpeedMatchTask(current) ? current.pairs.length : 1;
  return { start: before + 1, end: before + count };
}

function taskFormatLabel(task: LevelExamTask, lang: Lang): string {
  const labels = {
    context_choice: { ru: 'Контекст', uk: 'Контекст', es: 'Contexto', 'pt-BR': 'Contexto', vi: 'Ngữ cảnh', id: 'Konteks', tr: 'Bağlam', pl: 'Kontekst' },
    phrase_builder: { ru: 'Собери фразу', uk: 'Склади фразу', es: 'Construye la frase', 'pt-BR': 'Monte a frase', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümleyi kur', pl: 'Ułóż zdanie' },
    meaning_choice: { ru: 'Выбери смысл', uk: 'Обери значення', es: 'Elige el significado', 'pt-BR': 'Escolha o significado', vi: 'Chọn ý nghĩa', id: 'Pilih makna', tr: 'Anlamı seç', pl: 'Wybierz znaczenie' },
    spot_error: { ru: 'Найди ошибку', uk: 'Знайди помилку', es: 'Encuentra el error', 'pt-BR': 'Encontre o erro', vi: 'Tìm lỗi', id: 'Temukan kesalahan', tr: 'Hatayı bul', pl: 'Znajdź błąd' },
    speed_match: { ru: 'Быстрые пары', uk: 'Швидкі пари', es: 'Pares rápidos', 'pt-BR': 'Pares rápidos', vi: 'Ghép cặp nhanh', id: 'Pasangan cepat', tr: 'Hızlı eşleştirme', pl: 'Szybkie pary' },
  } as const;
  return triLang(lang, labels[task.format]);
}

function taskPrompt(task: LevelExamTask, lang: Lang): string {
  if (task.format !== 'spot_error' && task.format !== 'speed_match') return task.prompt;
  return task.format === 'spot_error'
    ? triLang(lang, {
      ru: 'Нажми на слово с ошибкой', uk: 'Натисни на слово з помилкою', es: 'Pulsa la palabra incorrecta',
      'pt-BR': 'Toque na palavra incorreta', vi: 'Chạm vào từ sai', id: 'Ketuk kata yang salah',
      tr: 'Hatalı kelimeye dokun', pl: 'Dotknij błędnego słowa',
    })
    : triLang(lang, {
      ru: 'Соедини выражения с переводом', uk: 'З’єднай вирази з перекладом', es: 'Une cada expresión con su traducción',
      'pt-BR': 'Ligue cada expressão à tradução', vi: 'Ghép cụm từ với bản dịch', id: 'Cocokkan frasa dengan terjemahan',
      tr: 'İfadeleri çevirileriyle eşleştir', pl: 'Połącz wyrażenia z tłumaczeniem',
    });
}

export default function LevelExamV2({ level, lang, accessState, blockedText }: Props) {
  const router = useRouter();
  const { theme: t, f, ds } = useTheme();
  const { isUnlimited, spendAmount, energy, bonusEnergy } = useEnergy();
  const [phase, setPhase] = useState<Phase>('loading');
  const [ownerStableUid, setOwnerStableUid] = useState<string | null>(null);
  const [identityUnavailable, setIdentityUnavailable] = useState(false);
  const [blueprint, setBlueprint] = useState<LevelExamBlueprint | null>(null);
  const [attempt, setAttempt] = useState<LevelExamAttemptSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [result, setResult] = useState<LevelExamScoreResult | null>(null);
  const [rewardState, setRewardState] = useState<LevelExamRewardState>('none');
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [noEnergy, setNoEnergy] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const attemptRef = useRef<LevelExamAttemptSnapshot | null>(null);
  const blueprintRef = useRef<LevelExamBlueprint | null>(null);
  const finishingRef = useRef(false);

  const storeAttempt = useCallback((next: LevelExamAttemptSnapshot) => {
    attemptRef.current = next;
    setAttempt(next);
    void persistActiveLevelExamAttempt(next).catch((error) => {
      void trackFeatureError('level_exam', 'persist', error, { level }, 'level_exam_v2');
    });
  }, [level]);

  const finishExam = useCallback(async (
    reason: LevelExamFinishReason,
    sourceAttempt = attemptRef.current,
    sourceBlueprint = blueprintRef.current,
  ) => {
    if (finishingRef.current || !sourceAttempt || !sourceBlueprint || !ownerStableUid) return;
    if (sourceBlueprint.scoredUnitIds.length !== 30) throw new Error('level_exam_v2_score_units_invalid');
    finishingRef.current = true;
    const finishing = markLevelExamFinishing(sourceAttempt, reason);
    attemptRef.current = finishing;
    setAttempt(finishing);
    await persistActiveLevelExamAttempt(finishing).catch(() => {});
    const scored = scoreLevelExam(sourceBlueprint, finishing.answers, reason);
    setResult(scored);
    setPhase('result');

    try {
      const previousPassed = await AsyncStorage.getItem(levelExamKey(level, 'passed', 'en'));
      const previousPct = Number(await AsyncStorage.getItem(levelExamKey(level, 'pct', 'en')) ?? 0);
      const attemptNumber = await recordCompletedLevelExamAttemptOnce(
        ownerStableUid,
        level,
        finishing.finishToken,
        'en',
      );
      await AsyncStorage.multiSet([
        [levelExamKey(level, 'pct', 'en'), String(Math.max(previousPct, scored.pct))],
        [levelExamKey(level, 'passed', 'en'), previousPassed === '1' || scored.passed ? '1' : '0'],
      ]);
      if (scored.passed) {
        const nextLevel = getNextCourseLevel(level);
        if (nextLevel) {
          await markPremiumCourseLevelReached(nextLevel, 'en');
          await unlockLesson(getFirstLessonForLevel(nextLevel), 'en');
        }
        const shardKey = `level_exam_quiz_shard_en_${level}`;
        if (await AsyncStorage.getItem(shardKey) !== '1') {
          const added = await addShards('lesson_quiz_passed').catch(() => 0);
          if (added > 0) await AsyncStorage.setItem(shardKey, '1');
        }
      }
      if (scored.pct >= 90) void awardOneTime('exam_excellent');
      const progress = await saveExamProgress(level, scored.pct, 'en');
      const gemMap: Record<number, 'ruby' | 'emerald' | 'diamond'> = { 2: 'ruby', 3: 'emerald', 4: 'diamond' };
      const gem = gemMap[progress.newPassCount];
      if (gem) void checkAchievements({ type: 'gem', level, gem, studyTarget: 'en' });
      void checkAchievements({ type: 'exam', pct: scored.pct, studyTarget: 'en' });
      const storedName = ((await AsyncStorage.getItem('user_name')) || '').trim();
      void registerXP(scored.baseXp, 'exam_complete', storedName, lang, undefined, {
        eventId: finishing.finishToken,
        payload: {
          level,
          studyTarget: 'en',
          blueprintVersion: 2,
          pct: scored.pct,
          percent: scored.pct,
          passed: scored.passed,
          score: scored.score,
          total: scored.total,
          attemptNumber,
          finishReason: reason,
        },
      });
      setRewardState(scored.passed ? (previousPassed === '1' ? 'already_claimed' : 'pending') : 'none');
      void trackFeatureSuccess('level_exam', 'complete', {
        level,
        score: scored.score,
        total: scored.total,
        pct: scored.pct,
        passed: scored.passed,
        finishReason: reason,
      }, 'level_exam_v2');
    } catch (error) {
      setRewardState(scored.passed ? 'pending' : 'none');
      void trackFeatureError('level_exam', 'complete', error, { level, finishReason: reason }, 'level_exam_v2');
    } finally {
      const completed = completeLevelExamAttempt(finishing, Date.now());
      await persistActiveLevelExamAttempt(completed).catch(() => {});
      await clearActiveLevelExamAttempt(ownerStableUid, level, 'en').catch(() => {});
    }
  }, [lang, level, ownerStableUid]);

  useEffect(() => {
    if (accessState !== 'allowed') {
      setPhase('loading');
      return;
    }
    let cancelled = false;
    void (async () => {
      const owner = await getCanonicalUserId().catch(() => null);
      if (cancelled) return;
      setOwnerStableUid(owner);
      setIdentityUnavailable(!owner);
      const storedBest = Number(await AsyncStorage.getItem(levelExamKey(level, 'pct', 'en')) ?? Number.NaN);
      if (!cancelled) setBestScore(Number.isFinite(storedBest) ? storedBest : null);
      if (!owner) {
        return;
      }
      const stored = await loadActiveLevelExamAttempt(owner, level, 'en');
      if (cancelled || !stored) {
        if (!cancelled) setPhase('intro');
        return;
      }
      const decision = restoreLevelExamAttempt(stored, {
        ownerStableUid: owner,
        level,
        studyTarget: 'en',
        sourceLocale: lang,
        blueprintVersion: 2,
        nowMs: Date.now(),
      });
      if (decision.kind === 'quarantine') {
        await clearActiveLevelExamAttempt(owner, level, 'en');
        if (!cancelled) setPhase('intro');
        return;
      }
      const restoredBlueprint = buildLevelExamBlueprint({ level, studyTarget: 'en', sourceLocale: lang, seed: decision.attempt.seed });
      blueprintRef.current = restoredBlueprint;
      attemptRef.current = decision.attempt;
      setBlueprint(restoredBlueprint);
      setAttempt(decision.attempt);
      if (decision.kind === 'resume') {
        setRemainingMs(remainingLevelExamMs(decision.attempt, Date.now()));
        setPhase('quiz');
      } else if (decision.kind === 'finish_timeout') {
        void finishExam('timeout', decision.attempt, restoredBlueprint);
      } else if (decision.kind === 'finish_pending') {
        void finishExam(decision.attempt.finishReason ?? 'submitted', decision.attempt, restoredBlueprint);
      } else {
        await clearActiveLevelExamAttempt(owner, level, 'en');
        setPhase('intro');
      }
    })();
    return () => { cancelled = true; };
  }, [accessState, finishExam, lang, level]);

  useEffect(() => {
    if (phase !== 'quiz' || !attempt || attempt.status !== 'active') return undefined;
    const update = () => {
      const nextRemaining = remainingLevelExamMs(attempt, Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0) void finishExam('timeout');
    };
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [attempt, finishExam, phase]);

  const startExam = useCallback(async () => {
    if (starting) return;
    if (!ownerStableUid) return;
    setStarting(true);
    try {
      if (!isUnlimited && energy + bonusEnergy < ENERGY_COST) {
        setNoEnergy(true);
        return;
      }
      if (!isUnlimited && !await spendAmount(ENERGY_COST)) {
        setNoEnergy(true);
        return;
      }
      const startedAtMs = Date.now();
      const startToken = `${startedAtMs.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const nextBlueprint = buildLevelExamBlueprint({
        level,
        studyTarget: 'en',
        sourceLocale: lang,
        seed: `${ownerStableUid}:${level}:${startToken}`,
      });
      if (nextBlueprint.scoredUnitIds.length !== 30) throw new Error('level_exam_v2_score_units_invalid');
      const nextAttempt = createLevelExamAttempt({
        energySpent: true,
        ownerStableUid,
        startToken,
        level,
        studyTarget: 'en',
        sourceLocale: lang,
        blueprintVersion: 2,
        seed: nextBlueprint.seed,
        orderedTaskIds: nextBlueprint.tasks.map((task) => task.id),
        scoredUnitIds: [...nextBlueprint.scoredUnitIds],
        startedAtMs,
        durationMs: nextBlueprint.durationMs,
      });
      await persistActiveLevelExamAttempt(nextAttempt);
      finishingRef.current = false;
      blueprintRef.current = nextBlueprint;
      attemptRef.current = nextAttempt;
      setBlueprint(nextBlueprint);
      setAttempt(nextAttempt);
      setRemainingMs(nextBlueprint.durationMs);
      setResult(null);
      setRewardState('none');
      setPhase('countdown');
      void trackFeatureStart('level_exam', 'start', { level, total: 30, formatCount: 5 }, 'level_exam_v2');
    } catch (error) {
      void trackFeatureError('level_exam', 'start', error, { level }, 'level_exam_v2');
    } finally {
      setStarting(false);
    }
  }, [bonusEnergy, energy, isUnlimited, lang, level, ownerStableUid, spendAmount, starting]);

  const updateAnswer = useCallback((scoreUnitId: string, answerValue: PersistedLevelExamAnswer) => {
    const current = attemptRef.current;
    if (!current || current.status !== 'active') return;
    storeAttempt(applyLevelExamAnswer(current, scoreUnitId, answerValue, current.currentTaskIndex));
  }, [storeAttempt]);

  const updateSpeedMatches = useCallback((task: Extract<LevelExamTask, { format: 'speed_match' }>, matches: Record<string, string>) => {
    const current = attemptRef.current;
    if (!current || current.status !== 'active') return;
    const answers = { ...current.answers };
    for (const pair of task.pairs) delete answers[pair.scoreUnitId];
    for (const [sourceId, targetScoreUnitId] of Object.entries(matches)) {
      answers[sourceId] = { kind: 'speed_match', targetScoreUnitId };
    }
    storeAttempt({ ...current, answers });
  }, [storeAttempt]);

  const continueExam = useCallback(() => {
    const currentAttempt = attemptRef.current;
    const currentBlueprint = blueprintRef.current;
    if (!currentAttempt || !currentBlueprint || currentAttempt.status !== 'active') return;
    if (currentAttempt.currentTaskIndex + 1 >= currentBlueprint.tasks.length) {
      void finishExam('submitted');
      return;
    }
    storeAttempt({ ...currentAttempt, currentTaskIndex: currentAttempt.currentTaskIndex + 1 });
  }, [finishExam, storeAttempt]);

  const beginQuiz = useCallback(() => {
    const current = attemptRef.current;
    if (!current || current.status !== 'active') return;
    const started = beginLevelExamQuiz(current, Date.now());
    storeAttempt(started);
    setRemainingMs(started.deadlineAtMs - started.startedAtMs);
    setPhase('quiz');
  }, [storeAttempt]);

  if (accessState !== 'allowed' || phase === 'loading' || identityUnavailable) {
    const checking = accessState === 'checking'
      || (accessState === 'allowed' && phase === 'loading' && !identityUnavailable);
    return (
      <ScreenGradient artBackdrop="exam">
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.stateWrap, { padding: ds.spacing.xl }]}> 
            <TonalSurface tone="raised" radius={ds.radius.xl} style={[styles.stateCard, { padding: ds.spacing.xl, gap: ds.spacing.md }]}> 
              <Ionicons name={checking ? 'hourglass-outline' : 'lock-closed-outline'} size={34} color={t.accent} />
              <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '900', textAlign: 'center' }}>
                {checking
                  ? triLang(lang, { ru: 'Готовим экзамен', uk: 'Готуємо іспит', es: 'Preparando el examen', 'pt-BR': 'Preparando o exame', vi: 'Đang chuẩn bị bài thi', id: 'Menyiapkan ujian', tr: 'Sınav hazırlanıyor', pl: 'Przygotowujemy egzamin' })
                  : identityUnavailable
                    ? triLang(lang, { ru: 'Не удалось подготовить сохранение попытки. Вернись и открой экзамен снова.', uk: 'Не вдалося підготувати збереження спроби. Повернися й відкрий іспит знову.', es: 'No se pudo preparar el guardado. Vuelve a abrir el examen.', 'pt-BR': 'Não foi possível preparar o salvamento. Abra o exame novamente.', vi: 'Không thể chuẩn bị lưu bài thi. Hãy mở lại bài thi.', id: 'Penyimpanan ujian belum siap. Buka kembali ujian.', tr: 'Sınav kaydı hazırlanamadı. Sınavı yeniden aç.', pl: 'Nie udało się przygotować zapisu. Otwórz egzamin ponownie.' })
                    : blockedText}
              </Text>
              {!checking ? (
                <TapScale onPress={() => safeRouterBack(router, '/lessons_list' as never)} accessibilityLabel="Back" style={[styles.stateButton, { backgroundColor: t.accent, minHeight: ds.buttonHeight }]}> 
                  <Text style={{ color: t.correctText, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '900' }}>
                    {triLang(lang, { ru: 'К урокам', uk: 'До уроків', es: 'Ir a lecciones', 'pt-BR': 'Ir para as aulas', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derslere git', pl: 'Do lekcji' })}
                  </Text>
                </TapScale>
              ) : null}
            </TonalSurface>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (phase === 'intro') {
    return (
      <>
        <LevelExamIntro
          lang={lang}
          level={level}
          firstLesson={level === 'A1' ? 1 : level === 'A2' ? 13 : level === 'B1' ? 25 : 37}
          lastLesson={level === 'A1' ? 12 : level === 'A2' ? 24 : level === 'B1' ? 36 : 48}
          durationMinutes={level === 'A1' ? 12 : level === 'A2' ? 13 : level === 'B1' ? 14 : 15}
          energyCost={ENERGY_COST}
          availableEnergy={isUnlimited ? ENERGY_COST : energy + bonusEnergy}
          bestScore={bestScore === null ? null : Math.round(bestScore * 0.3)}
          starting={starting}
          onBack={() => safeRouterBack(router, '/lessons_list' as never)}
          onStart={startExam}
        />
        <NoEnergyModal visible={noEnergy} onClose={() => setNoEnergy(false)} minRequired={ENERGY_COST} />
      </>
    );
  }

  if (phase === 'countdown' && attempt) {
    return <LevelExamCountdown attemptId={attempt.attemptId} level={level} onComplete={beginQuiz} />;
  }

  if (phase === 'result' && result && attempt) {
    return (
      <LevelExamResult
        lang={lang}
        attemptId={attempt.attemptId}
        result={result}
        rewardState={rewardState}
        energyCost={ENERGY_COST}
        onPrimary={() => result.passed ? router.replace('/lessons_list' as never) : setPhase('intro')}
        onReview={() => router.push('/review' as never)}
      />
    );
  }

  if (!blueprint || !attempt) return null;
  const task = blueprint.tasks[attempt.currentTaskIndex];
  if (!task) return null;
  const range = scoreRange(blueprint, attempt.currentTaskIndex);
  const continueLabel = attempt.currentTaskIndex + 1 === blueprint.tasks.length
    ? triLang(lang, { ru: 'Завершить', uk: 'Завершити', es: 'Finalizar', 'pt-BR': 'Finalizar', vi: 'Hoàn thành', id: 'Selesaikan', tr: 'Bitir', pl: 'Zakończ' })
    : triLang(lang, { ru: 'Дальше', uk: 'Далі', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjut', tr: 'Devam', pl: 'Dalej' });
  const exitLabel = triLang(lang, { ru: 'Выйти из экзамена', uk: 'Вийти з іспиту', es: 'Salir del examen', 'pt-BR': 'Sair do exame', vi: 'Thoát bài thi', id: 'Keluar dari ujian', tr: 'Sınavdan çık', pl: 'Wyjdź z egzaminu' });
  let content: React.ReactNode;
  let canContinue = false;

  if (task.format === 'context_choice' || task.format === 'meaning_choice') {
    const answer = attempt.answers[task.scoreUnitId];
    const selectedOptionId = answer?.kind === 'choice' ? answer.optionId : null;
    canContinue = selectedOptionId !== null;
    const choiceProps = { task, selectedOptionId, onSelect: (optionId: string) => updateAnswer(task.scoreUnitId, { kind: 'choice', optionId }) };
    content = task.format === 'context_choice'
      ? <ContextChoiceQuestion {...choiceProps} />
      : <MeaningChoiceQuestion {...choiceProps} />;
  } else if (task.format === 'phrase_builder') {
    const answer = attempt.answers[task.scoreUnitId];
    const tokenIds = answer?.kind === 'phrase_builder' ? answer.tokenIds : [];
    canContinue = tokenIds.length > 0;
    content = <PhraseBuilderQuestion task={task} selectedTokenIds={tokenIds} onChange={(next) => updateAnswer(task.scoreUnitId, { kind: 'phrase_builder', tokenIds: next })} />;
  } else if (task.format === 'spot_error') {
    const answer = attempt.answers[task.scoreUnitId];
    const selectedTokenId = answer?.kind === 'spot_error' ? answer.tokenId : null;
    canContinue = selectedTokenId !== null;
    content = <SpotErrorQuestion task={task} selectedTokenId={selectedTokenId} onSelect={(tokenId) => updateAnswer(task.scoreUnitId, { kind: 'spot_error', tokenId })} />;
  } else if (isSpeedMatchTask(task)) {
    const matches = Object.fromEntries(task.pairs.flatMap((pair) => {
      const answer = attempt.answers[pair.scoreUnitId];
      return answer?.kind === 'speed_match' ? [[pair.scoreUnitId, answer.targetScoreUnitId]] : [];
    }));
    canContinue = Object.keys(matches).length === task.pairs.length;
    content = <SpeedMatchQuestion task={task} matches={matches} onChange={(next) => updateSpeedMatches(task, next)} />;
  } else {
    content = null;
  }

  return (
    <>
      <LevelExamQuestionFrame
        formatLabel={taskFormatLabel(task, lang)}
        prompt={taskPrompt(task, lang)}
        progressStart={range.start}
        progressEnd={range.end}
        total={30}
        remainingMs={remainingMs}
        totalMs={blueprint.durationMs}
        canContinue={canContinue}
        continueLabel={continueLabel}
        exitLabel={exitLabel}
        onContinue={continueExam}
        onExit={() => setExitConfirm(true)}
      >
        {content}
      </LevelExamQuestionFrame>
      <ThemedConfirmModal
        visible={exitConfirm}
        title={exitLabel}
        message={triLang(lang, {
          ru: 'Ответы сохранятся, но таймер продолжит идти.', uk: 'Відповіді збережуться, але таймер продовжить іти.',
          es: 'Tus respuestas se guardarán, pero el tiempo seguirá corriendo.', 'pt-BR': 'Suas respostas serão salvas, mas o tempo continuará correndo.',
          vi: 'Câu trả lời sẽ được lưu nhưng thời gian vẫn tiếp tục.', id: 'Jawaban tersimpan, tetapi waktu tetap berjalan.',
          tr: 'Cevapların kaydedilir ancak süre işlemeye devam eder.', pl: 'Odpowiedzi zostaną zapisane, ale czas będzie nadal płynął.',
        })}
        cancelLabel={triLang(lang, { ru: 'Остаться', uk: 'Залишитися', es: 'Quedarme', 'pt-BR': 'Ficar', vi: 'Ở lại', id: 'Tetap', tr: 'Kal', pl: 'Zostań' })}
        confirmLabel={triLang(lang, { ru: 'Выйти', uk: 'Вийти', es: 'Salir', 'pt-BR': 'Sair', vi: 'Thoát', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź' })}
        onCancel={() => setExitConfirm(false)}
        onConfirm={() => safeRouterBack(router, '/lessons_list' as never)}
        confirmVariant="accent"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateCard: { width: '100%', maxWidth: 440, alignItems: 'center' },
  stateButton: { width: '100%', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// ═══════════════════════════════════════════════════════════════════════════
// SpireStepScreen.tsx — ступень Шпиля: шапка, кольцо, задание, «k / 10» (макет §4–6).
//
// зачем: ступень — полноэкранный слой поверх башни (Modal), чтобы нижняя панель
// вкладок не мешала и «назад» (жест / кнопка Android) вёл в шторку выхода, а не
// молча ронял ступень (T18). Вся логика — в useSpireStepRunner; здесь вёрстка.
// Первый кадр = итоговая геометрия: кольцо и подпись паузы стоят сразу, задание
// появляется после списания энергии (D72 — энергия на первом задании).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo, useRef, type MutableRefObject } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import type { SpirePendingStep, SpireStepSession } from '../../app/spire/use_spire_game';
import { useSpireStepRunner, type SpireClock, type SpireFeedback, type SpireStepFinish } from '../../app/spire/use_spire_step_runner';
import { SPIRE_STEP_MAX_HEARTS, SPIRE_STEP_TASK_COUNT } from '../../modules/spire/step_machine';
import { spireRevealItemIndexes } from '../../modules/spire/answer_reveal';
import SpireTaskReportButton from '../../modules/spire/SpireTaskReportButton';
import { spireTierName } from '../../modules/spire/tier_names';
import EnergyBar from '../EnergyBar';
import V2Pressable from '../v2/V2Pressable';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import SpireExitSheet from './SpireExitSheet';
import SpireTaskView from './SpireTaskView';
import SpireTimerRing from './SpireTimerRing';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import SpireEnergyPill from './SpireEnergyPill';
import { spireText } from './spire_strings';
import { spireGameText } from './spire_game_strings';

type Props = Readonly<{
  lang: Lang;
  session: SpireStepSession;
  uid: string;
  stableId: string;
  studyTarget: string;
  showEnergy: boolean;
  onFinish: (finish: SpireStepFinish) => void;
  onAbort: (reason: 'no_energy' | 'cancelled') => void;
}>;

function Hearts({ lang, hearts }: Readonly<{ lang: Lang; hearts: number }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  return (
    <View style={[s.hearts, { backgroundColor: p.control }, sh.nested]} accessible accessibilityLabel={spireGameText(lang, 'hearts', { n: hearts })}>
      {Array.from({ length: SPIRE_STEP_MAX_HEARTS }, (_, i) => (
        // guard-ok: ровно 3 неподвижных сердца, порядок не меняется
        <Ionicons key={`heart-${i}`} name="heart" size={18} color={i < hearts ? p.text : p.textMuted} style={i < hearts ? null : s.heartOff} />
      ))}
    </View>
  );
}

/** Всё, что нужно вёрстке ступени; раннер собирает это из своего состояния, DEV-превью — из моков. */
export type SpireStepLayoutProps = Readonly<{
  lang: Lang;
  ctx: SpireStepSession['ctx'];
  budgetMs: number;
  hearts: number;
  clock: SpireClock;
  paused: boolean;
  preparing: boolean;
  task: SpireStepSession['pick']['tasks'][number] | undefined;
  taskIndex: number;
  feedback: SpireFeedback | null;
  answering: boolean;
  exitOpen: boolean;
  studyTarget: string;
  showEnergy: boolean;
  onBack: () => void;
  onChoice: (index: number) => void;
  onTokens: (tokens: readonly string[]) => void;
  onItems: (selections: readonly number[]) => void;
  /** «Пары»: верный вариант по каждому пункту — поле пар гасит пару сразу, не дожидаясь раннера. */
  pairAnswers?: readonly (number | null)[];
  onContinue: () => void;
  /** Кнопка «пожаловаться на задание» (нужны ids раннера) — собирает контейнер; в превью её нет. */
  reportSlot: React.ReactNode;
  /** Шторка выхода (в превью — не показывается). */
  exitSlot: React.ReactNode;
}>;

/** Чистая вёрстка ступени: шапка, кольцо, задание, подсказка после ошибки, «k / 10». Без раннера и сети. */
export function SpireStepLayout(props: SpireStepLayoutProps) {
  const { lang, ctx, budgetMs, hearts, clock, paused, preparing, task, taskIndex, feedback, answering, exitOpen, studyTarget, showEnergy } = props;
  const p = useSpirePalette(); const sh = useSpireShadow();
  const insets = useStableSafeAreaInsets();
  const counter = Math.min(taskIndex + 1, SPIRE_STEP_TASK_COUNT);
  const fb = feedback && !feedback.ok ? feedback : null;
  return (
    <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top + 6 }]} testID="spire-step">
      <View style={s.head}>
        <V2Pressable
          onPress={props.onBack}
          accessibilityRole="button"
          accessibilityLabel={spireText(lang, 'back')}
          style={[s.back, { backgroundColor: p.control }, sh.nested]}
          testID="spire-step-back"
        >
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </V2Pressable>
        <View style={s.headText}>
          <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{`${spireGameText(lang, 'step')} ${ctx.stepInFloor + 1}`}</Text>
          <Text style={[s.sub, { color: p.textSecondary }]}>{`${spireText(lang, 'floor')} ${ctx.floor} · ${spireTierName(ctx.tier, lang)}`}</Text>
        </View>
        <Hearts lang={lang} hearts={hearts} />
        {showEnergy ? <SpireEnergyPill ownerActive={false} /> : null}
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
        <View style={s.ringWrap}>
          <SpireTimerRing lang={lang} clock={clock} budgetMs={budgetMs} paused={paused} />
        </View>
        {preparing || !task ? (
          <Text style={[s.preparing, { color: p.textSecondary }]}>{spireGameText(lang, 'preparing')}</Text>
        ) : (
          <SpireTaskView
            key={`${task.taskId}:${taskIndex}`}
            lang={lang}
            task={task}
            feedback={feedback && feedback.taskIndex === taskIndex ? feedback : null}
            disabled={!answering}
            onChoice={props.onChoice}
            onTokens={props.onTokens}
            onItems={props.onItems}
            pairAnswers={props.pairAnswers}
            studyTarget={studyTarget}
          />
        )}
        {props.reportSlot}
        {fb ? (
          <View style={[s.hint, { backgroundColor: lv2Alpha(p.wrong, 0.14) }, sh.plate]} accessibilityLiveRegion="polite" testID="spire-step-hint">
            {fb.correctText ? (
              <Text style={[s.hintText, { color: p.text }]}>
                {`${spireGameText(lang, 'correctIs')} `}<Text style={s.hintBold}>{fb.correctText}</Text>
              </Text>
            ) : null}
            {fb.mistakeSaved ? <Text style={[s.hintSub, { color: p.textSecondary }]}>{spireGameText(lang, 'mistakeSaved')}</Text> : null}
            {/* зачем (обзор R1 п.4): запись в «Мои ошибки» упала — тихо, тем же тоном, без красного и значков (D158) */}
            {fb.mistakeSaved === false ? <Text style={[s.hintSub, { color: p.textSecondary }]} testID="spire-step-mistake-not-saved">{spireGameText(lang, 'mistakeNotSaved')}</Text> : null}
            {/* зачем (владелец 30.09): ответ висит до «Дальше», таймер в это время стоит. */}
            <V2Pressable
              onPress={props.onContinue}
              disabled={exitOpen}
              accessibilityRole="button"
              accessibilityLabel={spireGameText(lang, 'onward')}
              style={[s.onward, { backgroundColor: p.cta }, sh.action(p.cta)]}
              testID="spire-step-continue"
            >
              <Text style={[s.onwardText, { color: p.ctaText }]}>{spireGameText(lang, 'onward')}</Text>
              <Ionicons name="arrow-forward" size={18} color={p.ctaText} />
            </V2Pressable>
          </View>
        ) : null}
        <Text style={[s.footer, { color: p.textSecondary }]}>{`${counter} / ${SPIRE_STEP_TASK_COUNT}`}</Text>
      </ScrollView>
      {props.exitSlot}
    </View>
  );
}

function StepBody({ lang, session, uid, stableId, studyTarget, showEnergy, onFinish, onAbort, exitRef }: Props & Readonly<{ exitRef: MutableRefObject<(() => void) | null> }>) {
  const runner = useSpireStepRunner({
    pick: session.pick, ctx: session.ctx, uid, studyTarget, attempt: session.attempt, runId: session.runId, onFinish, onAbort,
  });
  // зачем: кнопка «назад» Android внутри Modal приходит в onRequestClose — ведём её в шторку выхода.
  exitRef.current = runner.requestExit;
  const { ctx, pick } = session;
  const task = pick.tasks[runner.displayTaskIndex];
  // зачем (владелец 17.10: «пары все на экране»): верные пары считаем локально по тем же отпечаткам, что и раннер
  // (spireRevealItemIndexes) — пара гаснет мгновенно, без сети; вердикт по-прежнему выносит раннер в submitItems.
  const planTask = pick.plan.tasks[runner.displayTaskIndex];
  const pairAnswers = useMemo(() => {
    if (!task || task.kind !== 'match' || !planTask) return undefined;
    const items = Array.isArray(task.payload.items) ? task.payload.items as Record<string, unknown>[] : [];
    const counts = items.map((it) => (Array.isArray(it.options) ? it.options.length : 0));
    return spireRevealItemIndexes(pick.plan.saltId, task.taskId, counts, planTask.answerFingerprints);
  }, [pick.plan.saltId, planTask, task]);
  const paused = runner.state.phase !== 'active' || runner.exitOpen || runner.phase !== 'playing';
  const answering = runner.phase === 'playing' && runner.state.phase === 'active' && runner.feedback === null && !runner.exitOpen;
  const reportableTarget = studyTarget === 'en' || studyTarget === 'es' || studyTarget === 'fr' || studyTarget === 'de' || studyTarget === 'it'
    ? studyTarget
    : null;
  const reportText = task && (typeof task.payload.phrase === 'string' || typeof task.payload.prompt === 'string')
    ? String(task.payload.phrase ?? task.payload.prompt)
    : task?.taskId;
  const reportSlot = answering && task && reportableTarget ? (
    <View style={s.reportRow}>
      <SpireTaskReportButton
        claim={{
          stableUid: stableId,
          taskId: task.taskId,
          studyTarget: reportableTarget,
          weekId: ctx.weekKey,
          tier: ctx.tier,
          packHash: pick.plan.packHash,
          floor: pick.packFloor,
          step: ctx.stepInFloor + 1,
          setIndex: pick.setIndex,
          taskIndex: runner.displayTaskIndex,
        }}
        taskText={reportText}
        removeFromRemainingRun={runner.reportCurrentTask}
        testID={`spire-task-report-${runner.displayTaskIndex}`}
      />
    </View>
  ) : null;
  return (
    <SpireStepLayout
      lang={lang}
      ctx={ctx}
      budgetMs={pick.plan.budgetMs}
      hearts={runner.state.hearts}
      clock={runner.clock}
      paused={paused}
      preparing={runner.phase === 'charging'}
      task={task}
      taskIndex={runner.displayTaskIndex}
      feedback={runner.feedback}
      answering={answering}
      exitOpen={runner.exitOpen}
      studyTarget={studyTarget}
      showEnergy={showEnergy}
      onBack={runner.requestExit}
      onChoice={runner.submitChoice}
      onTokens={runner.submitTokens}
      onItems={runner.submitItems}
      pairAnswers={pairAnswers}
      onContinue={runner.continueAfterReveal}
      reportSlot={reportSlot}
      exitSlot={<SpireExitSheet lang={lang} visible={runner.exitOpen} floor={ctx.floor} onContinue={runner.cancelExit} onExit={runner.confirmExit} />}
    />
  );
}

// Часы, которые стоят: до пакета задания нет и время не идёт (кольцо на паузе, как в фазе списания).
const STOPPED_CLOCK: SpireClock = { get: () => 0, subscribe: () => () => undefined };

/**
 * «Готовим ступень…» ДО пакета недели (обзор R1 п.1): тот же кадр, что фаза списания энергии в макете
 * spire-gaps-states, — шапка, кольцо на паузе, «Готовим ступень…», «1 / 10». «Назад» — отмена без энергии.
 */
function PendingStepBody({ lang, pending, studyTarget, showEnergy, onCancel, exitRef }: Readonly<{
  lang: Lang;
  pending: SpirePendingStep;
  studyTarget: string;
  showEnergy: boolean;
  onCancel: () => void;
  exitRef: MutableRefObject<(() => void) | null>;
}>) {
  exitRef.current = onCancel;
  return (
    <SpireStepLayout
      lang={lang}
      ctx={pending.ctx}
      budgetMs={pending.budgetMs}
      hearts={SPIRE_STEP_MAX_HEARTS}
      clock={STOPPED_CLOCK}
      paused
      preparing
      task={undefined}
      taskIndex={0}
      feedback={null}
      answering={false}
      exitOpen={false}
      studyTarget={studyTarget}
      showEnergy={showEnergy}
      onBack={onCancel}
      onChoice={noopAnswer}
      onTokens={noopAnswer}
      onItems={noopAnswer}
      onContinue={noopAnswer}
      reportSlot={null}
      exitSlot={null}
    />
  );
}

function noopAnswer(): void {
  // зачем: до пакета задания нет, отвечать нечем — вёрстка просто не рисует задание.
}

function SpireStepScreen(props: Readonly<Omit<Props, 'session'> & {
  session: SpireStepSession | null;
  pending: SpirePendingStep | null;
  onCancelPending: () => void;
}>) {
  const { session, pending, onCancelPending, ...rest } = props;
  const exitRef = useRef<(() => void) | null>(null);
  // зачем (обзор R1 п.1): модалка открывается в тот же тап — сначала подготовка, затем та же модалка показывает ступень.
  return (
    <Modal visible={session !== null || pending !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => exitRef.current?.()} statusBarTranslucent>
      {session ? <StepBody key={session.runId} {...rest} session={session} exitRef={exitRef} />
        : pending ? <PendingStepBody key={pending.prepId} lang={rest.lang} pending={pending} studyTarget={rest.studyTarget} showEnergy={rest.showEnergy} onCancel={onCancelPending} exitRef={exitRef} />
          : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: V2.screenPad },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  sub: { fontSize: 16, lineHeight: 20, marginTop: 2 },
  hearts: { height: 37, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartOff: { opacity: 0.5 },
  content: { paddingHorizontal: V2.screenPad },
  ringWrap: { marginTop: 34 },
  preparing: { marginTop: 40, fontSize: 16, textAlign: 'center' },
  hint: { marginTop: 18, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  hintText: { fontSize: 16, lineHeight: 22 },
  hintBold: { fontWeight: '700' },
  hintSub: { fontSize: 13, lineHeight: 18 },
  onward: { marginTop: 10, minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  onwardText: { fontSize: 16, fontWeight: '700' },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  reportRow: { minHeight: 44, marginTop: 10, alignItems: 'flex-end', justifyContent: 'center' },
});

export default memo(SpireStepScreen);

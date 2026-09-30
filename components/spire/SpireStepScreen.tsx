// ═══════════════════════════════════════════════════════════════════════════
// SpireStepScreen.tsx — ступень Шпиля: шапка, кольцо, задание, «k / 10» (макет §4–6).
//
// зачем: ступень — полноэкранный слой поверх башни (Modal), чтобы нижняя панель
// вкладок не мешала и «назад» (жест / кнопка Android) вёл в шторку выхода, а не
// молча ронял ступень (T18). Вся логика — в useSpireStepRunner; здесь вёрстка.
// Первый кадр = итоговая геометрия: кольцо и подпись паузы стоят сразу, задание
// появляется после списания энергии (D72 — энергия на первом задании).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useRef, type MutableRefObject } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import type { SpireStepSession } from '../../app/spire/use_spire_game';
import { useSpireStepRunner, type SpireStepFinish } from '../../app/spire/use_spire_step_runner';
import { SPIRE_STEP_MAX_HEARTS, SPIRE_STEP_TASK_COUNT } from '../../modules/spire/step_machine';
import { spireTierName } from '../../modules/spire/tier_names';
import EnergyBar from '../EnergyBar';
import V2Pressable from '../v2/V2Pressable';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import SpireExitSheet from './SpireExitSheet';
import SpireTaskView from './SpireTaskView';
import SpireTimerRing from './SpireTimerRing';
import { useSpirePalette } from './useSpirePalette';
import { spireText } from './spire_strings';
import { spireGameText } from './spire_game_strings';

type Props = Readonly<{
  lang: Lang;
  session: SpireStepSession;
  uid: string;
  studyTarget: string;
  showEnergy: boolean;
  onFinish: (finish: SpireStepFinish) => void;
  onAbort: (reason: 'no_energy' | 'cancelled') => void;
}>;

function Hearts({ lang, hearts }: Readonly<{ lang: Lang; hearts: number }>) {
  const p = useSpirePalette();
  return (
    <View style={[s.hearts, { backgroundColor: p.control }]} accessible accessibilityLabel={spireGameText(lang, 'hearts', { n: hearts })}>
      {Array.from({ length: SPIRE_STEP_MAX_HEARTS }, (_, i) => (
        // guard-ok: ровно 3 неподвижных сердца, порядок не меняется
        <Ionicons key={`heart-${i}`} name="heart" size={18} color={i < hearts ? p.text : p.textMuted} style={i < hearts ? null : s.heartOff} />
      ))}
    </View>
  );
}

function StepBody({ lang, session, uid, studyTarget, showEnergy, onFinish, onAbort, exitRef }: Props & Readonly<{ exitRef: MutableRefObject<(() => void) | null> }>) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const runner = useSpireStepRunner({
    pick: session.pick, ctx: session.ctx, uid, studyTarget, attempt: session.attempt, runId: session.runId, onFinish, onAbort,
  });
  // зачем: кнопка «назад» Android внутри Modal приходит в onRequestClose — ведём её в шторку выхода.
  exitRef.current = runner.requestExit;
  const { ctx, pick } = session;
  const task = pick.tasks[runner.displayTaskIndex];
  const paused = runner.state.phase !== 'active' || runner.exitOpen || runner.phase !== 'playing';
  const answering = runner.phase === 'playing' && runner.state.phase === 'active' && runner.feedback === null && !runner.exitOpen;
  const counter = Math.min(runner.displayTaskIndex + 1, SPIRE_STEP_TASK_COUNT);
  const fb = runner.feedback && !runner.feedback.ok ? runner.feedback : null;
  return (
    <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top + 6 }]} testID="spire-step">
      <View style={s.head}>
        <V2Pressable
          onPress={runner.requestExit}
          accessibilityRole="button"
          accessibilityLabel={spireText(lang, 'back')}
          style={[s.back, { backgroundColor: p.control }]}
          testID="spire-step-back"
        >
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </V2Pressable>
        <View style={s.headText}>
          <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{`${spireGameText(lang, 'step')} ${ctx.stepInFloor + 1}`}</Text>
          <Text style={[s.sub, { color: p.textSecondary }]}>{`${spireText(lang, 'floor')} ${ctx.floor} · ${spireTierName(ctx.tier, lang)}`}</Text>
        </View>
        <Hearts lang={lang} hearts={runner.state.hearts} />
        {showEnergy ? <EnergyBar glass ownerActive={false} /> : null}
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={s.ringWrap}>
          <SpireTimerRing lang={lang} clock={runner.clock} budgetMs={pick.plan.budgetMs} paused={paused} />
        </View>
        {runner.phase === 'charging' || !task ? (
          <Text style={[s.preparing, { color: p.textSecondary }]}>{spireGameText(lang, 'preparing')}</Text>
        ) : (
          <SpireTaskView
            key={`${task.taskId}:${runner.displayTaskIndex}`}
            lang={lang}
            task={task}
            feedback={runner.feedback && runner.feedback.taskIndex === runner.displayTaskIndex ? runner.feedback : null}
            disabled={!answering}
            onChoice={runner.submitChoice}
            onTokens={runner.submitTokens}
            onItems={runner.submitItems}
          />
        )}
        {fb ? (
          <View style={[s.hint, { backgroundColor: lv2Alpha(p.wrong, 0.14) }]} accessibilityLiveRegion="polite" testID="spire-step-hint">
            {fb.correctText ? (
              <Text style={[s.hintText, { color: p.text }]}>
                {`${spireGameText(lang, 'correctIs')} `}<Text style={s.hintBold}>{fb.correctText}</Text>
              </Text>
            ) : null}
            {fb.mistakeSaved ? <Text style={[s.hintSub, { color: p.textSecondary }]}>{spireGameText(lang, 'mistakeSaved')}</Text> : null}
          </View>
        ) : null}
        <Text style={[s.footer, { color: p.textSecondary }]}>{`${counter} / ${SPIRE_STEP_TASK_COUNT}`}</Text>
      </ScrollView>
      <SpireExitSheet lang={lang} visible={runner.exitOpen} floor={ctx.floor} onContinue={runner.cancelExit} onExit={runner.confirmExit} />
    </View>
  );
}

function SpireStepScreen(props: Readonly<Omit<Props, 'session'> & { session: SpireStepSession | null }>) {
  const { session } = props;
  const exitRef = useRef<(() => void) | null>(null);
  return (
    <Modal visible={session !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => exitRef.current?.()} statusBarTranslucent>
      {session ? <StepBody key={session.runId} {...props} session={session} exitRef={exitRef} /> : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: V2.screenPad },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  sub: { fontSize: 15, lineHeight: 19, marginTop: 2 },
  hearts: { height: 37, borderRadius: 19, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heartOff: { opacity: 0.5 },
  content: { paddingHorizontal: V2.screenPad },
  ringWrap: { marginTop: 28 },
  preparing: { marginTop: 40, fontSize: 16, textAlign: 'center' },
  hint: { marginTop: 18, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  hintText: { fontSize: 16, lineHeight: 22 },
  hintBold: { fontWeight: '700' },
  hintSub: { fontSize: 14, lineHeight: 19 },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 15, fontWeight: '600' },
});

export default memo(SpireStepScreen);

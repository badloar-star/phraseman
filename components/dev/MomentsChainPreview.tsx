// ═══════════════════════════════════════════════════════════════════════════
// MomentsChainPreview.tsx — dev-превью моментов v3 m08 / m10 / m18 на моках образца для кадров Сверки и Макетов (только dev_moments_preview).
//
// зачем (Макеты по поручению координатора 15.10): прямые ссылки вместо ручного прохождения урока/диалога. Используются те же боевые компоненты:
//   state=combo     — m08 «Молния»: шапка с кольцом серии + слой поверх экрана; серия по тайм-листу эталона 3 (0 с) → 5 (1,2 с) → 10 (2,6 с) → ошибка (5,3 с);
//   state=donechain — m10 «Семь ударов»: V2DoneScreen с цепочкой; моки образца: 17 верно / 3 ошибки, 3 звезды, +150 монет, серия 5 → 6, «Пройти урок» 0/1 → 1/1;
//   state=dlgchain  — m18 «думает… → каскад»: «Эмма думает…», ответ сети через &wait=мс (600), 5 целей сценария «Закажи кофе», +30 монет.
// В Firestore ничего не пишет, сторы серии/задач не трогает (m10 получает готовое «после» через previewAfter).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import { getLocalDayKey } from '../../app/local_date';
import V2DoneScreen, { CoinAward } from '../completion/V2DoneScreen';
import { DialogueChainBeat, DialogueChainHeader, DialogueChainMountAt, DialogueChainScope, DIALOGUE_CHAIN_OFFSETS } from '../completion/DialogueDoneChain';
import { dialogueChainText } from '../completion/dialogue_chain_strings';
import ComboHeatSlot from '../feedback/ComboHeatSlot';
import ComboMomentLayer from '../feedback/ComboMomentLayer';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';

const noop = (): void => undefined;

/** m08: серия по тайм-листу эталона `comboInit` — 3 → 5 → 10 → ошибка (0). */
const COMBO_SCRIPT: readonly (readonly [number, number])[] = [[0, 3], [1200, 5], [2600, 10], [5300, 0]];

export function ComboPreview({ lang, replayKey }: Readonly<{ lang: Lang; replayKey: string }>) {
  const g = useLv2Glass();
  const [combo, setCombo] = useState(0);
  useEffect(() => {
    setCombo(0);
    const ids = COMBO_SCRIPT.map(([at, n]) => setTimeout(() => setCombo(n), at + 300));
    return () => ids.forEach(clearTimeout);
  }, [replayKey]);
  return (
    <View style={s.fill}>
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: g.text }]}>Lesson 1</Text>
        <View style={s.grow} />
        <ComboHeatSlot comboCount={combo} lang={lang} size={34} />
      </View>
      <View style={s.center}>
        <Text style={[s.question, { color: g.text }]}>Где находится вокзал?</Text>{/* dev-превью: текст образца, не боевая строка */}
      </View>
      <ComboMomentLayer comboCount={combo} />
    </View>
  );
}

/** m10: итог урока с цепочкой на моках образца. */
export function DoneChainPreview({ lang }: Readonly<{ lang: Lang }>) {
  const day = getLocalDayKey();
  const lessonTask = (units: number) => ({ kind: 'lesson' as const, units, unitKeys: [], done: units >= 1, doneAtMs: null, rewardCoins: 50, rewardStatus: 'none' as const });
  const today = (units: number) => ({ schemaVersion: 1 as const, ownerKey: 'dev', dayKey: day, tasks: [lessonTask(units)] });
  return (
    <V2DoneScreen
      testID="dev-donechain"
      title={lang === 'ru' ? 'Урок пройден' : 'Lesson complete'}
      subtitle="Present Simple: Утверждение"
      stars={3}
      correct={17}
      wrong={3}
      coinsGained={150}
      primaryLabel={lang === 'ru' ? 'Следующий урок' : 'Next lesson'}
      onPrimary={noop}
      secondaryLabel={lang === 'ru' ? 'Разобрать 3 ошибки' : 'Review 3 mistakes'}
      onSecondary={noop}
      onClose={noop}
      chain={{
        before: { streak: { dayKey: day, counted: false, days: 5 }, lessonProgress: 0, dayKey: day },
        previewAfter: { streak: { dayKey: day, counted: true, days: 6 }, today: today(1) },
      }}
    />
  );
}

const COFFEE_GOALS = ['Заказать капучино', 'Выбрать размер', 'Сказать, какое молоко', 'Уточнить: с собой или здесь', 'Спросить цену'];

/** m18: итог диалога «думает… → реакция → каскад» на моках образца; ответ сети приходит через waitMs. */
export function DialogueChainPreview({ lang, waitMs }: Readonly<{ lang: Lang; waitMs: number }>) {
  const g = useLv2Glass();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const id = setTimeout(() => setReady(true), waitMs);
    return () => clearTimeout(id);
  }, [waitMs]);
  const n = COFFEE_GOALS.length;
  return (
    <DialogueChainScope ready={ready} failed={false} reaction="pleased" reactionReason="dev-превью" goals={n} hasCoins>
      <View style={s.dialog}>
        <DialogueChainHeader
          lang={lang}
          partnerName="Эмма"
          reaction="pleased"
          fallbackTitle="Диалог пройден"
          sub={`Закажи кофе · ${dialogueChainText(lang, 'goalsOf', { met: n, total: n })}`}
          colors={{ text: g.text, secondary: g.secondary, control: g.opaqueControl }}
        />
        {ready ? (
          <View style={[s.goals, { backgroundColor: g.plateFillFrom }]}>
            {COFFEE_GOALS.map((goal, i) => (
              <DialogueChainBeat key={goal} offset={DIALOGUE_CHAIN_OFFSETS.goal(i)}>
                <View style={s.goalRow}>
                  <View style={[s.badge, { backgroundColor: g.cta }]}><Text style={{ color: g.ctaInk, fontWeight: '800' }}>✓</Text></View>{/* dev-превью */}
                  <Text style={[s.goalText, { color: g.secondary }]}>{goal}</Text>
                </View>
              </DialogueChainBeat>
            ))}
          </View>
        ) : null}
        <DialogueChainBeat offset={DIALOGUE_CHAIN_OFFSETS.coins(n)}>
          <DialogueChainMountAt offset={DIALOGUE_CHAIN_OFFSETS.coins(n)}>
            <CoinAward amount={30} lang={lang} g={g} animate />
          </DialogueChainMountAt>
        </DialogueChainBeat>
      </View>
    </DialogueChainScope>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 52, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  question: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  dialog: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  goals: { marginTop: 16, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, fontSize: 16, lineHeight: 21 },
});

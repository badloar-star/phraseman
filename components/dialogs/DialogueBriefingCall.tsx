// ═══════════════════════════════════════════════════════════════════════════
// DialogueBriefingCall.tsx — m16 «звонок» внутри брифинга (эталон engagement-moments-v3-all.html `callStep`).
//
// зачем (владелец 11.11: «экран "звонит" лишний — объедини его с экраном брифинга»): отдельного экрана «Входящий звонок» больше нет.
// Его узнаваемая часть — два расходящихся кольца вокруг плитки собеседника — живёт в шапке брифинга; человек сразу видит,
// кто звонит, и все задания, и одним тапом «Ответить» начинает диалог (раньше: «Ответить» → брифинг → «Начать диалог»).
// Ничего не пишет и не тратит: энергия по-прежнему списывается стартом диалога. reduced-motion — без колец. Журнал [MOMENT-m16].
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { hapticLightImpact } from '../../hooks/use-haptics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import type { DialogueGlass } from './glass/DialogueGlassKit';

const LOG = '[MOMENT-m16]';
const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease
/** Тайминги образца, мс. */
export const BRIEFING_CALL_TIMELINE = { ring: 1600, ring2Delay: 550 } as const;

function playCue(event: 'sheet_open'): void {
  hapticLightImpact().catch((error: unknown) => console.warn(`${LOG} хаптик не сработал (${error instanceof Error ? error.message : String(error)})`)); // guard-ok: причина отказа хаптика
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (!isSoundV2Enabled()) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
    const result = playEvent(event);
    if (!result.played) console.log(`${LOG} звук ${event} не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
  } catch (error) {
    console.warn(`${LOG} звук ${event} не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}

const Ring = memo(function Ring({ delay, color, run }: { delay: number; color: string; run: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    // зачем (perf_freeze_contract, владелец «телефон не должен греться»): цикл крутится только пока экран в фокусе и приложение активно
    if (!run) { cancelAnimation(t); t.value = 0; return undefined; }
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: BRIEFING_CALL_TIMELINE.ring, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [delay, run, t]);
  // emRing: scale .6 → 2,2, opacity .9 → 0
  const st = useAnimatedStyle(() => ({ opacity: run ? 0.9 * (1 - t.value) : 0, transform: [{ scale: 0.6 + 1.6 * t.value }] }));
  return <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, { shadowColor: color, backgroundColor: 'transparent', borderColor: color }, st]} />; // guard-ok: расходящееся кольцо звонка эталона, не контейнер
});

/**
 * Кольца входящего вызова вокруг плитки собеседника в шапке брифинга. Кладётся первым ребёнком в обёртку плитки
 * (absoluteFill), сама плитка рисуется поверх. При показе — один лёгкий отклик (хаптик и звук открытия), как у прежнего экрана звонка.
 */
export const BriefingCallRings = memo(function BriefingCallRings({ glass }: { glass: DialogueGlass }) {
  const reduced = useReducedMotion();
  // зачем (perf_freeze_contract): кольца — бесконечный цикл; живут только при фокусе экрана и активном приложении (useRuntimeActive)
  const runtimeActive = useRuntimeActive();
  const loopsOn = runtimeActive && !reduced;
  const accent = (glass as DialogueGlass & { accentGraphic?: string }).accentGraphic ?? glass.cta;

  useEffect(() => {
    console.log(`${LOG} звонок в шапке брифинга показан: reducedMotion=${String(reduced)}`); // guard-ok: единичный журнал показа
    playCue('sheet_open');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: отклик показа играет один раз
  }, []);
  useEffect(() => {
    if (!loopsOn) console.log(`${LOG} кольца остановлены: runtimeActive=${String(runtimeActive)} reducedMotion=${String(reduced)}`); // guard-ok: журнал стопа цикла
  }, [loopsOn, reduced, runtimeActive]);

  if (reduced) return null;
  return (
    <>
      {/* accent-text-ok: кольца входящего вызова — графика accentGraphic (≥3:1 к фону), не текст и не значок */}
      <Ring delay={0} color={accent} run={loopsOn} />
      <Ring delay={BRIEFING_CALL_TIMELINE.ring2Delay} color={accent} run={loopsOn} />
    </>
  );
});

const s = StyleSheet.create({
  // `.ring`: круг, светящаяся кромка цветом акцента
  ring: { borderRadius: 44, borderWidth: 1 }, // guard-ok, shadow-ok: расходящееся кольцо звонка (эффект эталона .ring), не контейнер; D145 — 1 pt
});

/**
 * m16: строка задания брифинга всплывает по очереди (эталон `.goalline.brow`: с 120 мс через 100 мс, прозрачность 260 мс,
 * сдвиг 10 → 0 и scale .98 → 1 пружиной cubic-bezier(.34,1.56,.64,1) 420 мс). active=false — строка сразу на месте.
 * зачем (находка инвентаря dialogs-inventory «спорное» №1): раньше active включался уже после монтирования, стартовое значение было 1 и
 * всплытия не было видно; теперь брифинг со звонком монтирует строки сразу с active=true.
 */
export const BriefingRevealRow = memo(function BriefingRevealRow({ index, active, children }: { index: number; active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(active && !reduced ? 0 : 1);
  const o = useSharedValue(active && !reduced ? 0 : 1);
  useEffect(() => {
    if (!active || reduced) return;
    const delay = 120 + index * 100;
    o.value = withDelay(delay, withTiming(1, { duration: 260, easing: EASE }));
    v.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }));
  }, [active, index, o, reduced, v]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - v.value) * 10 }, { scale: 0.98 + 0.02 * v.value }] }));
  return <Reanimated.View style={st}>{children}</Reanimated.View>;
});

// ═══════════════════════════════════════════════════════════════════════════
// DialogueDoneChain.tsx — m18 «Итог диалога — думает… → реакция → каскад целей», эталон engagement-moments-v3-all.html `done3` (одобрен владельцем).
//
// зачем (координатор 15.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m18): саспенс перед реакцией собеседника делает оценку эмоциональной. Пока итог идёт из сети — аватар и
// «{Имя} думает…» (с 0,2 с); реакция — не раньше 1,0 с и не раньше ответа; цели всплывают по 300 мс с +0,6 с; «+N монет» за ними; остальное (цифры, ошибки, отзыв) — следом.
// Грузится ТОЛЬКО require'ом из app/dialogue_v2_completion.tsx при защёлкнутом moments_v3 — при выключенном флаге этого кода нет даже в памяти.
// Анимации — Reanimated на UI-треде; reduced-motion — без задержек и звуков; итог недоступен — обычный заголовок, всё сразу. Ничего не пишет и не начисляет. Журнал [MOMENT-m18].
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { createContext, memo, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import type { Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import {
  DIALOGUE_CHAIN_LOG,
  DIALOGUE_CHAIN_TIMELINE as T,
  dialogueCoinsAfterReact,
  dialogueGoalAfterReact,
  dialogueReactAt,
  type DialogueReaction,
} from './dialogue_chain_gate';
import { playDialogueChainCue } from './dialogue_chain_sound';
import { dialogueChainText } from './dialogue_chain_strings';

const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease

type Phase = 'thinking' | 'reacted' | 'failed';

type ChainState = Readonly<{
  phase: Phase;
  /** Аватар и «думает…» уже всплыли. */
  thinkOn: boolean;
  /** Абсолютное время реакции (Date.now), null — ответа ещё нет. */
  reactAt: number | null;
  instant: boolean;
}>;

const Ctx = createContext<ChainState>({ phase: 'failed', thinkOn: true, reactAt: null, instant: true });

export type DialogueChainScopeProps = Readonly<{
  /** Итог пришёл (state ready). */
  ready: boolean;
  /** Итог недоступен — цепочка сдаётся: обычный заголовок, всё сразу. */
  failed: boolean;
  reaction: DialogueReaction;
  reactionReason: string;
  goals: number;
  /** Монеты за диалог будут показаны (решено начисление). */
  hasCoins: boolean;
  /** Цепочка доиграла (или итог недоступен) — экран может открывать следующие окна (m17). */
  onFinished?: () => void;
  children: ReactNode;
}>;

/** Часы цепочки: «думает…» на 0,2 с, реакция — max(1,0 с, ответ сети), звуки по тайм-листу. */
export const DialogueChainScope = memo(function DialogueChainScope({ ready, failed, reaction, reactionReason, goals, hasCoins, onFinished, children }: DialogueChainScopeProps) {
  const reduced = useReducedMotion();
  const mountAt = useRef(Date.now()).current;
  const [thinkOn, setThinkOn] = useState(reduced);
  const [phase, setPhase] = useState<Phase>('thinking');
  const [reactAt, setReactAt] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // зачем: звук монет решается в момент их удара — начисление могло решиться позже реакции
  const hasCoinsRef = useRef(hasCoins);
  hasCoinsRef.current = hasCoins;

  useEffect(() => {
    console.log(`${DIALOGUE_CHAIN_LOG} вход: reducedMotion=${String(reduced)} готов=${String(ready)} недоступен=${String(failed)}`); // guard-ok: единичный журнал входа
    if (reduced) return undefined;
    const id = setTimeout(() => { setThinkOn(true); playDialogueChainCue('think'); }, T.thinkAt);
    const list = timers.current;
    return () => { clearTimeout(id); list.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий входа играет один раз
  }, []);

  useEffect(() => {
    if (reactAt != null || phase !== 'thinking') return;
    if (failed) {
      console.log(`${DIALOGUE_CHAIN_LOG} итог недоступен через ${Date.now() - mountAt} мс — обычный заголовок, без реакции`); // guard-ok: ветка недоступен
      setThinkOn(true);
      setPhase('failed');
      onFinished?.();
      return;
    }
    if (!ready) return;
    const readyAt = Date.now() - mountAt;
    const at = reduced ? readyAt : dialogueReactAt(readyAt);
    const abs = mountAt + at;
    console.log(`${DIALOGUE_CHAIN_LOG} ответ через ${readyAt} мс → реакция «${reaction}» на ${at} мс (${reactionReason}); целей=${goals} монеты=${String(hasCoins)}`); // guard-ok: единичный журнал решения
    setReactAt(abs);
    if (reduced) { setThinkOn(true); setPhase('reacted'); onFinished?.(); return; }
    const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, Math.max(0, abs + ms - Date.now()))); };
    later(0, () => { setPhase('reacted'); playDialogueChainCue(reaction); });
    if (goals > 0) later(dialogueGoalAfterReact(0), () => playDialogueChainCue('goal'));
    later(dialogueCoinsAfterReact(goals), () => {
      if (hasCoinsRef.current) playDialogueChainCue('coins');
      else console.log(`${DIALOGUE_CHAIN_LOG} удар монет без звука: монет за диалог нет`); // guard-ok: ветка без монет
    });
    later(dialogueCoinsAfterReact(goals) + T.goalStep + T.enter, () => {
      console.log(`${DIALOGUE_CHAIN_LOG} конец цепочки через ${Date.now() - mountAt} мс`); // guard-ok: единичный журнал конца
      onFinished?.();
    });
  }, [failed, goals, hasCoins, mountAt, onFinished, phase, reactAt, reaction, reactionReason, ready, reduced]);

  const value = useMemo<ChainState>(() => ({ phase, thinkOn, reactAt, instant: reduced }), [phase, reactAt, reduced, thinkOn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
});

/** Сколько мс до момента «реакция + offset»; null — время ещё не известно. */
function useDelayUntil(offset: number): Readonly<{ known: boolean; delay: number; instant: boolean }> {
  const { phase, reactAt, instant } = useContext(Ctx);
  if (phase === 'failed') return { known: true, delay: 0, instant: true };
  if (reactAt == null) return { known: false, delay: 0, instant };
  return { known: true, delay: instant ? 0 : Math.max(0, reactAt + offset - Date.now()), instant };
}

/** Блок, всплывающий на «реакция + offset» (emUp 500 мс, сдвиг 18). До ответа сети — скрыт. */
export const DialogueChainBeat = memo(function DialogueChainBeat({ offset, style, children }: { offset: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { known, delay, instant } = useDelayUntil(offset);
  const p = useSharedValue(0);
  useEffect(() => {
    if (!known) return;
    p.value = instant ? 1 : withDelay(delay, withTiming(1, { duration: T.enter, easing: EASE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: задержка считается один раз, когда время реакции стало известно
  }, [known, instant]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * T.rise }] }));
  return <Reanimated.View pointerEvents={known ? 'auto' : 'none'} style={[style, st]}>{children}</Reanimated.View>;
});

export const DIALOGUE_CHAIN_OFFSETS = { goal: dialogueGoalAfterReact, coins: dialogueCoinsAfterReact, rest: (goals: number) => dialogueCoinsAfterReact(goals) + T.goalStep } as const;

/** Монтирует детей только на «реакция + offset» — счёт «+N» начинается, когда строку видно. */
export const DialogueChainMountAt = memo(function DialogueChainMountAt({ offset, children }: { offset: number; children: ReactNode }) {
  const { known, delay } = useDelayUntil(offset);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!known || on) return undefined;
    if (delay <= 0) { setOn(true); return undefined; }
    const id = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: момент считается один раз
  }, [known]);
  return on ? <>{children}</> : null;
});

export type DialogueChainHeaderProps = Readonly<{
  lang: Lang;
  partnerName: string | null;
  reaction: DialogueReaction;
  /** Заголовок экрана без цепочки («Диалог пройден» / «Разговор завершён») — для ветки «итог недоступен». */
  fallbackTitle: string;
  /** «Закажи кофе · 3 из 3 целей» — всплывает с реакцией. */
  sub: string | null;
  colors: Readonly<{ text: string; secondary: string; control: string }>;
}>;

/** Аватар собеседника, «{Имя} думает…» → реакция, подпись сцены. */
export const DialogueChainHeader = memo(function DialogueChainHeader({ lang, partnerName, reaction, fallbackTitle, sub, colors }: DialogueChainHeaderProps) {
  const { phase, thinkOn, instant } = useContext(Ctx);
  const name = partnerName ?? dialogueChainText(lang, 'partner');
  const think = useSharedValue(thinkOn ? 1 : 0);
  useEffect(() => {
    if (!thinkOn) return;
    think.value = instant ? 1 : withTiming(1, { duration: T.enter, easing: EASE });
  }, [instant, think, thinkOn]);
  const thinkStyle = useAnimatedStyle(() => ({ opacity: think.value, transform: [{ translateY: (1 - think.value) * T.rise }] }));
  const heading = phase === 'failed' ? fallbackTitle : dialogueChainText(lang, reaction, { name });
  return (
    <View style={s.block} testID="dialogue-v2-completion-chain-header">
      <Reanimated.View style={[s.center, thinkStyle]}>
        <View style={[s.avatar, { backgroundColor: colors.control }]}>
          <Ionicons name="chatbubbles-outline" size={30} color={colors.text} />
        </View>
        {phase === 'thinking' ? (
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" testID="dialogue-v2-completion-chain-thinking" style={[s.heading, { color: colors.secondary }]}>{dialogueChainText(lang, 'thinking', { name })}</Text>
        ) : null}
      </Reanimated.View>
      {phase !== 'thinking' ? (
        <DialogueChainBeat offset={0} style={s.center}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" testID="dialogue-v2-completion-chain-reaction" style={[s.heading, { color: colors.text }]}>{heading}</Text>
          {sub ? <Text style={[s.sub, { color: colors.secondary }]}>{sub}</Text> : null}
        </DialogueChainBeat>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  block: { alignItems: 'center', marginTop: 8 },
  center: { alignItems: 'center', alignSelf: 'stretch' },
  // `.who .av`: 64 × 64, радиус 20, значок 30
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // `.h-lg` (V2_TYPE.title) и `.p`
  heading: { ...V2_TYPE.title, textAlign: 'center', marginTop: 10 },
  sub: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 4 },
});

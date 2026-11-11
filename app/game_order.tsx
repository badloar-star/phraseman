/**
 * Игра «Собери диалог» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `order()`).
 * Реплики нажимаются по порядку и встают в ленту диалога; не та реплика — короткая дрожь.
 * Движение — из макета в точности: реплика перелетает из своей кнопки на место в ленте за 480 мс
 * cubic-bezier(.2,1,.3,1), из прозрачности .6; кнопка гаснет за 300 мс; промах — дрожь 380 мс и красный тон на 500 мс;
 * счётчик подскакивает (650 мс). Числа — в constants/gameMotion.ts.
 * зачем так: правила и задания — в modules/games/dialogue_core; места под все реплики заняты сразу,
 * поэтому лента не прыгает, когда реплика встаёт на место.
 * Собранный диалог даёт «Грамматику» +2 (строка таблицы добавлена владельцем 11.11).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import GameAnswerTile from '../components/games/GameAnswerTile';
import GameBumpText from '../components/games/GameBumpText';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_EASE, GAME_MOTION } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { INITIAL_ORDER_STATE, shuffledOrder, tapOrderLine } from '../modules/games/dialogue_core';
import { orderTasksFor } from '../modules/games/task_source';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { safeRouterBack } from './navigation_back';

const COPY = {
  pill: { ru: 'Собери диалог', uk: 'Збери діалог', es: 'Arma el diálogo', en: 'Build the dialogue' },
  ask: { ru: 'Нажимай реплики по порядку', uk: 'Натискай репліки по порядку', es: 'Toca las réplicas en orden', en: 'Tap the lines in order' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type Point = Readonly<{ x: number; y: number }>;
type FlyProps = Readonly<{ from: Point | null; children: React.ReactNode }>;

/**
 * Реплика в ленте. `from` — левый верхний угол нажатой кнопки на экране: реплика появляется там и летит на своё место
 * (макет: `b.animate([{ transform: translate(a − c), opacity: .6 }, { transform: none, opacity: 1 }], 480, --out)`).
 */
const FlyBubble = memo(function FlyBubble({ from, children }: FlyProps) {
  const reduceMotion = useReduceMotion();
  const ref = useRef<View>(null);
  const started = useRef(false);
  const fly = !!from && !reduceMotion;
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const t = useSharedValue(fly ? 0 : 1);
  const shown = useSharedValue(fly ? 0 : 1);

  useEffect(() => () => cancelAnimation(t), [t]);

  const onLayout = useCallback(() => {
    if (!fly || !from || started.current) return;
    started.current = true;
    const node = ref.current;
    const start = (x: number, y: number) => {
      dx.value = from.x - x;
      dy.value = from.y - y;
      shown.value = 1;
      const c = GAME_EASE.out;
      t.value = withTiming(1, { duration: GAME_MOTION.orderFlyMs, easing: Easing.bezier(c[0], c[1], c[2], c[3]) });
    };
    if (!node) {
      // зачем: без узла место не измерить — реплика просто встаёт на место, игра не замирает
      console.warn('[GAME_ORDER] bubble node missing, flight skipped'); // guard-ok: ранний выход, остаётся навсегда
      shown.value = 1;
      t.value = 1;
      return;
    }
    node.measureInWindow((x, y) => start(x, y));
  }, [dx, dy, fly, from, shown, t]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value * (GAME_MOTION.orderFlyFromOpacity + (1 - GAME_MOTION.orderFlyFromOpacity) * t.value),
    transform: [{ translateX: dx.value * (1 - t.value) }, { translateY: dy.value * (1 - t.value) }],
  }));
  return <Reanimated.View ref={ref} collapsable={false} onLayout={onLayout} style={[s.bubbleWrap, style]}>{children}</Reanimated.View>;
});

export default function GameOrderScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const task = useMemo(() => orderTasksFor(studyTarget)[0] ?? null, [studyTarget]);
  // порядок кнопок фиксируется на вход: повторный рендер не перетасовывает их под пальцем
  const buttons = useMemo(() => (task ? shuffledOrder(task.lines.length) : []), [task]);
  const [game, setGame] = useState(INITIAL_ORDER_STATE);
  const [miss, setMiss] = useState<{ line: number; key: number }>({ line: -1, key: 0 });
  const lastTapAt = useRef(0);
  const tileRefs = useRef<Record<number, View | null>>({});
  // откуда летит каждая поставленная реплика — угол её кнопки на экране в момент нажатия
  const [origins, setOrigins] = useState<Readonly<Record<number, Point>>>({});
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (missTimer.current) clearTimeout(missTimer.current); }, []);

  const onTap = useCallback((lineIndex: number) => {
    if (!task) return;
    const now = Date.now();
    if (now - lastTapAt.current < 120) return; // защита от двойного тапа
    lastTapAt.current = now;
    const result = tapOrderLine(game, task, lineIndex);
    if (!result.correct) {
      setGame(result.state);
      setMiss((prev) => ({ line: lineIndex, key: prev.key + 1 }));
      // макет: красный тон снимается через 500 мс после промаха
      if (missTimer.current) clearTimeout(missTimer.current);
      missTimer.current = setTimeout(() => setMiss((prev) => ({ line: -1, key: prev.key })), GAME_MOTION.orderMissHoldMs);
      return;
    }
    // зачем: место кнопки снимается ДО смены состояния — реплика рождается уже со своей точкой старта
    const node = tileRefs.current[lineIndex];
    const commit = (from: Point | null) => {
      if (from) setOrigins((prev) => ({ ...prev, [lineIndex]: from }));
      setGame(result.state);
    };
    if (!node) {
      console.warn('[GAME_ORDER] tile node missing, flight skipped', lineIndex); // guard-ok: ранний выход, остаётся навсегда
      commit(null);
      return;
    }
    node.measureInWindow((x, y) => commit({ x, y }));
  }, [game, task]);

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const total = task ? task.lines.length : 0;
  const finished = total > 0 && game.placed >= total;

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (!finished || !task) return;
    markWarmupGamePlayed('order', `${total}/${total}`);
    // зачем (D207, владелец 11.11: «слух тут при чём?»): собранный диалог — «Грамматика» +2
    noteSkillAction({ action: 'order_correct', itemKey: `order:${task.id}` });
  }, [finished, task, total]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-order-close" />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{triLang(lang, COPY.pill)}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <GameBumpText value={`${game.placed} / ${total}`} style={[s.pillText, { color: p.text }]} />
            </View>
          </View>

          <Text style={[s.ask, { color: p.textSecondary }]}>{finished ? '' : triLang(lang, COPY.ask)}</Text>

          <View style={s.chat}>
            {task ? task.lines.map((line, i) => (
              <View key={`slot-${i}`} style={[s.slotRow, i % 2 === 1 && s.slotRowRight]}>
                {i < game.placed ? (
                  <FlyBubble from={origins[i] ?? null}>
                    <V2Card seed={i} style={s.bubble}>
                      <Text style={[s.bubbleText, { color: p.text }]}>{line}</Text>
                    </V2Card>
                  </FlyBubble>
                ) : (
                  <View style={[s.slot, { backgroundColor: p.track }]} />
                )}
              </View>
            )) : null}
          </View>

          <View style={s.flex} />
          {finished ? (
            <V2Button testID="game-order-done" label={triLang(lang, COPY.done)} onPress={onClose} />
          ) : (
            <View style={s.options}>
              {task ? buttons.map((lineIndex, pos) => (
                <View key={`opt-${lineIndex}`} ref={(node) => { tileRefs.current[lineIndex] = node; }} collapsable={false}>
                  <GameAnswerTile
                    testID={`game-order-option-${lineIndex}`}
                    label={task.lines[lineIndex]}
                    index={pos}
                    rise={false}
                    compact
                    state={lineIndex < game.placed ? 'hidden' : miss.line === lineIndex ? 'wrong' : 'idle'}
                    pulse={miss.line === lineIndex ? miss.key : 0}
                    disabled={lineIndex < game.placed}
                    onPress={() => onTap(lineIndex)}
                  />
                </View>
              )) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ask: { minHeight: 20, marginTop: 22, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  chat: { marginTop: 20, gap: 10, minHeight: 262, zIndex: 1 },
  slotRow: { flexDirection: 'row', justifyContent: 'flex-start', minHeight: 50 },
  slotRowRight: { justifyContent: 'flex-end' },
  slot: { flex: 1, minHeight: 50, borderRadius: 20, opacity: 0.6 },
  bubbleWrap: { maxWidth: '82%' },
  bubble: { paddingVertical: 12, paddingHorizontal: 16, minHeight: 50, justifyContent: 'center' },
  bubbleText: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  options: { gap: 10 },
});

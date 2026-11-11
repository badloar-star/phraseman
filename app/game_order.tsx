/**
 * Игра «Собери диалог» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `order()`).
 * Реплики нажимаются по порядку и встают в ленту диалога; не та реплика — короткая дрожь.
 * зачем так: правила и задания — в modules/games/dialogue_core; места под все реплики заняты сразу,
 * поэтому лента не прыгает, когда реплика встаёт на место.
 * Очков навыков игра пока не даёт: её строки нет в утверждённой таблице (вопрос владельцу в итоге сессии).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { INITIAL_ORDER_STATE, ORDER_SEED_TASKS, isValidOrderTask, shuffledOrder, tapOrderLine } from '../modules/games/dialogue_core';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { safeRouterBack } from './navigation_back';

const COPY = {
  pill: { ru: 'Собери диалог', uk: 'Збери діалог', es: 'Arma el diálogo', en: 'Build the dialogue' },
  ask: { ru: 'Нажимай реплики по порядку', uk: 'Натискай репліки по порядку', es: 'Toca las réplicas en orden', en: 'Tap the lines in order' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type OptionProps = Readonly<{ text: string; used: boolean; shakeKey: number; onPress: () => void; ink: string; fill: string }>;

const OrderOption = memo(function OrderOption({ text, used, shakeKey, onPress, ink, fill }: OptionProps) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shakeKey === 0) return undefined;
    x.value = withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 80 }), withTiming(0, { duration: 80 }));
    return () => cancelAnimation(x);
  }, [shakeKey, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // зачем: использованная реплика остаётся на месте невидимой — кнопки ниже не подпрыгивают
  return (
    <Reanimated.View style={[style, used && s.used]}>
      <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: used }} disabled={used} onPressIn={() => { void hapticTap(); }} onPress={onPress} style={({ pressed }) => [s.option, { backgroundColor: fill }, pressed && s.pressed]}>
        <Text style={[s.optionText, { color: ink }]}>{text}</Text>
      </Pressable>
    </Reanimated.View>
  );
});

export default function GameOrderScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const task = useMemo(() => ORDER_SEED_TASKS.filter(isValidOrderTask)[0] ?? null, []);
  // порядок кнопок фиксируется на вход: повторный рендер не перетасовывает их под пальцем
  const buttons = useMemo(() => (task ? shuffledOrder(task.lines.length) : []), [task]);
  const [game, setGame] = useState(INITIAL_ORDER_STATE);
  const [shake, setShake] = useState<{ line: number; key: number }>({ line: -1, key: 0 });
  const lastTapAt = useRef(0);

  const onTap = useCallback((lineIndex: number) => {
    if (!task) return;
    const now = Date.now();
    if (now - lastTapAt.current < 120) return; // защита от двойного тапа
    lastTapAt.current = now;
    const result = tapOrderLine(game, task, lineIndex);
    setGame(result.state);
    if (!result.correct) setShake((prev) => ({ line: lineIndex, key: prev.key + 1 }));
  }, [game, task]);

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const total = task ? task.lines.length : 0;
  const finished = total > 0 && game.placed >= total;

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (finished) markWarmupGamePlayed('order', `${total}/${total}`);
  }, [finished, total]);

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
              <Text style={[s.pillText, { color: p.text }]}>{`${game.placed} / ${total}`}</Text>
            </View>
          </View>

          <Text style={[s.ask, { color: p.textSecondary }]}>{finished ? '' : triLang(lang, COPY.ask)}</Text>

          <View style={s.chat}>
            {task ? task.lines.map((line, i) => (
              <View key={`slot-${i}`} style={[s.slotRow, i % 2 === 1 && s.slotRowRight]}>
                {i < game.placed ? (
                  <Reanimated.View entering={FadeIn.duration(320)} style={s.bubbleWrap}>
                    <V2Card seed={i} style={s.bubble}>
                      <Text style={[s.bubbleText, { color: p.text }]}>{line}</Text>
                    </V2Card>
                  </Reanimated.View>
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
              {task ? buttons.map((lineIndex) => (
                <OrderOption
                  key={`opt-${lineIndex}`}
                  text={task.lines[lineIndex]}
                  used={lineIndex < game.placed}
                  shakeKey={shake.line === lineIndex ? shake.key : 0}
                  ink={p.text}
                  fill={p.glass}
                  onPress={() => onTap(lineIndex)}
                />
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
  chat: { marginTop: 20, gap: 10, minHeight: 262 },
  slotRow: { flexDirection: 'row', justifyContent: 'flex-start', minHeight: 56 },
  slotRowRight: { justifyContent: 'flex-end' },
  slot: { width: '62%', height: 56, borderRadius: 18, opacity: 0.6 },
  bubbleWrap: { maxWidth: '86%' },
  bubble: { paddingVertical: 14, paddingHorizontal: 16, minHeight: 56, justifyContent: 'center' },
  bubbleText: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  options: { gap: 10 },
  option: { minHeight: 54, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  optionText: { textAlign: 'center', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  pressed: { opacity: 0.86 },
  used: { opacity: 0 },
});

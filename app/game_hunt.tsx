/**
 * Игра «Охота на ошибку» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `hunt()`).
 * В диалоге одно слово неверное: нажатие на него заменяет слово верным и показывает объяснение;
 * нажатие на другое слово — короткая дрожь.
 * зачем так: правила и задания — в modules/games/dialogue_core; экран только рисует и исполняет нажатия.
 * Очков навыков игра пока не даёт: её строки нет в утверждённой таблице (вопрос владельцу в итоге сессии).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { FadeInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { HUNT_SEED_TASKS, isHuntHit, isValidHuntTask } from '../modules/games/dialogue_core';
import { safeRouterBack } from './navigation_back';

const COPY = {
  pill: { ru: 'Охота на ошибку', uk: 'Полювання на помилку', es: 'Caza del error', en: 'Error hunt' },
  ask: { ru: 'В диалоге одно слово неверное. Найди его', uk: 'У діалозі одне слово неправильне. Знайди його', es: 'En el diálogo hay una palabra incorrecta. Encuéntrala', en: 'One word in the dialogue is wrong. Find it' },
  next: { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', en: 'Next' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type WordProps = Readonly<{ text: string; tappable: boolean; fixed: boolean; shakeKey: number; onPress: () => void; ink: string; chip: string; good: string; disabled: boolean }>;

const HuntWord = memo(function HuntWord({ text, tappable, fixed, shakeKey, onPress, ink, chip, good, disabled }: WordProps) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shakeKey === 0) return undefined;
    x.value = withSequence(withTiming(-5, { duration: 60 }), withTiming(5, { duration: 80 }), withTiming(0, { duration: 80 }));
    return () => cancelAnimation(x);
  }, [shakeKey, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (!tappable) return <Text style={[s.word, { color: ink }]}>{text}</Text>;
  return (
    <Reanimated.View style={style}>
      <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled }} disabled={disabled} onPressIn={() => { void hapticTap(); }} onPress={onPress} style={[s.tap, { backgroundColor: chip }]}>
        <Text style={[s.word, { color: fixed ? good : ink }]}>{text}</Text>
      </Pressable>
    </Reanimated.View>
  );
});

export default function GameHuntScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const tasks = useMemo(() => HUNT_SEED_TASKS.filter(isValidHuntTask), []);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(false);
  const [shake, setShake] = useState<{ id: string; key: number }>({ id: '', key: 0 });
  const lock = useRef(false);
  const task = tasks[Math.min(index, Math.max(0, tasks.length - 1))];
  const isLast = index >= tasks.length - 1;

  const onTap = useCallback((line: number, word: number) => {
    if (lock.current || !task) return;
    if (!isHuntHit(task, line, word)) {
      setShake((prev) => ({ id: `${line}:${word}`, key: prev.key + 1 }));
      return;
    }
    lock.current = true;
    setFound(true);
  }, [task]);

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const onNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    lock.current = false;
    setFound(false);
    setIndex((i) => i + 1);
  }, [isLast, onClose]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-hunt-close" />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{triLang(lang, COPY.pill)}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{`${tasks.length === 0 ? 0 : index + 1} / ${tasks.length}`}</Text>
            </View>
          </View>

          <Text style={[s.ask, { color: p.textSecondary }]}>{triLang(lang, COPY.ask)}</Text>

          {task ? (
            <View style={s.chat}>
              {task.lines.map((line, li) => (
                <Reanimated.View key={`${task.id}-${li}`} entering={FadeInDown.duration(320).delay(li * 140)} style={[s.bubbleRow, line.right && s.bubbleRowRight]}>
                  <V2Card seed={li} style={s.bubble}>
                    {line.words.map((word, wi) => {
                      const isWrong = isHuntHit(task, li, wi);
                      return (
                        <HuntWord
                          key={`${task.id}-${li}-${wi}`}
                          text={found && isWrong ? task.fix : word}
                          tappable={line.tappable.includes(wi)}
                          fixed={found && isWrong}
                          shakeKey={shake.id === `${li}:${wi}` ? shake.key : 0}
                          disabled={found}
                          ink={p.text}
                          chip={p.glassRaised}
                          good={p.correct}
                          onPress={() => onTap(li, wi)}
                        />
                      );
                    })}
                  </V2Card>
                </Reanimated.View>
              ))}
            </View>
          ) : null}

          {task ? (
            <V2Card seed={2} style={[s.why, { opacity: found ? 1 : 0 }]}>
              <Ionicons name="checkmark-circle" size={20} color={p.correct} />
              <View style={s.whyCopy}>
                <Text style={[s.whyTitle, { color: p.text }]}>{`${task.lines[task.wrong.line].words[task.wrong.word]} → ${task.fix}`}</Text>
                <Text style={[s.whyBody, { color: p.textSecondary }]}>{task.why}</Text>
              </View>
            </V2Card>
          ) : null}

          <View style={s.flex} />
          <V2Button testID="game-hunt-next" label={triLang(lang, isLast ? COPY.done : COPY.next)} disabled={Boolean(task) && !found} onPress={onNext} />
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
  ask: { marginTop: 22, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  chat: { marginTop: 22, gap: 10 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4, paddingVertical: 12, paddingHorizontal: 14 },
  word: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  tap: { paddingHorizontal: 8, borderRadius: 10, minHeight: 32, justifyContent: 'center' },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, marginTop: 20 },
  whyCopy: { flex: 1, gap: 2 },
  whyTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  whyBody: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
});

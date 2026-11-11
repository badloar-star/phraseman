/**
 * Игра «Сортировка» — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `sort()`).
 * Владелец 11.11.2026: «самое главное — механики».
 *
 * Ход: верхняя карта колоды смахивается в левую или правую корзину (или корзина нажимается). Верно — карта
 * улетает в корзину, счётчик растёт; мимо — карта возвращается, показывает подсказку, корзина вздрагивает.
 * зачем так: правила — в modules/games/sort_core; экран получает готовую колоду и исполняет жесты.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import {
  INITIAL_SORT_STATE, SORT_HOT_THRESHOLD, SORT_SEED_DECK, dropSortCard, sortSideFromSwipe, type SortBin, type SortSide,
} from '../modules/games/sort_core';
import { noteSkillAction } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const FLY_MS = 420;
const COPY = {
  ask: { ru: 'Смахни фразу в свою сторону', uk: 'Змахни фразу у свій бік', es: 'Desliza la frase a su lado', en: 'Swipe the phrase to its side' },
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  clean: { ru: 'Без единой подсказки', uk: 'Без жодної підказки', es: 'Sin una sola pista', en: 'Without a single hint' },
  hinted: { ru: 'С подсказкой:', uk: 'З підказкою:', es: 'Con pista:', en: 'With a hint:' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type BinProps = Readonly<{ bin: SortBin; count: number; side: SortSide; dragX: SharedValue<number>; nudge: SharedValue<number>; onPress: () => void; disabled: boolean }>;

const BinTile = memo(function BinTile({ bin, count, side, dragX, nudge, onPress, disabled }: BinProps) {
  const p = useV2Palette();
  // корзина «теплеет», когда карту тянут в её сторону дальше порога
  const style = useAnimatedStyle(() => {
    const hot = side === 'left' ? dragX.value < -SORT_HOT_THRESHOLD : dragX.value > SORT_HOT_THRESHOLD;
    return { transform: [{ translateX: nudge.value }, { scale: withTiming(hot ? 1.04 : 1, { duration: 160 }) }] };
  });
  return (
    <Reanimated.View style={[s.binWrap, style]}>
      <Pressable testID={`game-sort-bin-${side}`} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={`${bin.title}, ${count}`} disabled={disabled} onPressIn={() => { void hapticTap(); }} onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}>
        <V2Card seed={side === 'left' ? 1 : 2} style={[s.bin, side === 'right' && s.binRight]}>
          <View style={s.binCopy}>
            <Text style={[s.binTitle, { color: p.text }, side === 'right' && s.right]}>{bin.title}</Text>
            <Text style={[s.binExample, { color: p.textSecondary }, side === 'right' && s.right]}>{bin.example}</Text>
          </View>
          <Text style={[s.binCount, { color: p.text }]}>{count}</Text>
        </V2Card>
      </Pressable>
    </Reanimated.View>
  );
});

export default function GameSortScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const deck = SORT_SEED_DECK;

  const [game, setGame] = useState(INITIAL_SORT_STATE);
  const [showHint, setShowHint] = useState(false);
  const busy = useRef(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const fade = useSharedValue(1);
  const nudgeLeft = useSharedValue(0);
  const nudgeRight = useSharedValue(0);

  useEffect(() => () => {
    cancelAnimation(dragX);
    cancelAnimation(dragY);
    cancelAnimation(fade);
  }, [dragX, dragY, fade]);

  const finished = game.index >= deck.tasks.length;
  const task = deck.tasks[game.index];

  const afterFly = useCallback((next: typeof game) => {
    setGame(next);
    setShowHint(false);
    dragX.value = 0;
    dragY.value = 0;
    fade.value = 1;
    busy.current = false;
  }, [dragX, dragY, fade]);

  const drop = useCallback((side: SortSide) => {
    if (busy.current || finished || !task) return;
    const result = dropSortCard(game, deck, side);
    if (!result.correct) {
      // мимо: карта возвращается и показывает подсказку, корзина вздрагивает
      setGame(result.state);
      setShowHint(true);
      dragX.value = withTiming(0, { duration: 240 });
      dragY.value = withTiming(0, { duration: 240 });
      const nudge = side === 'left' ? nudgeLeft : nudgeRight;
      nudge.value = withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 80 }), withTiming(0, { duration: 80 }));
      return;
    }
    busy.current = true;
    // зачем (D207): очки «Грамматики» — только за карту, решённую с первого раза
    if (result.firstTry) noteSkillAction({ action: 'odd_word_sorting_correct', itemKey: `sort:${deck.id}:${task.id}` });
    dragX.value = withTiming(side === 'left' ? -150 : 150, { duration: FLY_MS });
    dragY.value = withTiming(330, { duration: FLY_MS });
    fade.value = withTiming(0, { duration: FLY_MS }, (done) => {
      if (done) runOnJS(afterFly)(result.state);
    });
  }, [afterFly, deck, dragX, dragY, fade, finished, game, nudgeLeft, nudgeRight, task]);

  const settle = useCallback((dx: number) => {
    const side = sortSideFromSwipe(dx);
    if (side) {
      drop(side);
      return;
    }
    dragX.value = withTiming(0, { duration: 240 });
    dragY.value = withTiming(0, { duration: 240 });
  }, [drop, dragX, dragY]);

  const pan = Gesture.Pan()
    .enabled(!finished)
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      runOnJS(settle)(e.translationX);
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { rotate: `${dragX.value / 14}deg` }, { scale: 0.3 + 0.7 * fade.value }],
  }));

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-sort-close" />
            <View style={s.segs}>
              {deck.tasks.map((t, i) => <View key={t.id} style={[s.seg, { backgroundColor: i < game.index ? p.text : p.track }]} />)}
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{`${Math.min(game.index, deck.tasks.length)} / ${deck.tasks.length}`}</Text>
            </View>
          </View>

          <Text style={[s.ask, { color: p.textSecondary }]}>{finished ? '' : triLang(lang, COPY.ask)}</Text>

          <View style={s.pile}>
            {finished ? (
              <View style={s.finish}>
                <Text style={[s.big, { color: p.text }]}>{`${deck.tasks.length} ${triLang(lang, COPY.of)} ${deck.tasks.length}`}</Text>
                <Text style={[s.sub, { color: p.textSecondary }]}>{game.misses > 0 ? `${triLang(lang, COPY.hinted)} ${game.misses}` : triLang(lang, COPY.clean)}</Text>
                <SkillsSessionGrowth style={s.growth} />
              </View>
            ) : (
              <>
                {/* следующая карта лежит под верхней — колода видна, но не отвлекает */}
                {deck.tasks[game.index + 1] ? (
                  <V2Card seed={3} style={[s.card, s.under]}>
                    <Text style={[s.cardText, { color: p.textMuted }]}>{deck.tasks[game.index + 1].text}</Text>
                  </V2Card>
                ) : null}
                <GestureDetector gesture={pan}>
                  <Reanimated.View style={[s.cardSlot, cardStyle]}>
                    <V2Card seed={0} raised style={s.card} testID="game-sort-card">
                      <Text style={[s.cardText, { color: p.text }]}>{task.text}</Text>
                      <Text style={[s.hint, { color: p.textSecondary, opacity: showHint ? 1 : 0 }]}>{task.hint}</Text>
                    </V2Card>
                  </Reanimated.View>
                </GestureDetector>
              </>
            )}
          </View>

          {finished ? (
            <V2Button testID="game-sort-done" label={triLang(lang, COPY.done)} onPress={onClose} />
          ) : (
            <View style={s.bins}>
              <BinTile bin={deck.left} count={game.left} side="left" dragX={dragX} nudge={nudgeLeft} disabled={finished} onPress={() => drop('left')} />
              <BinTile bin={deck.right} count={game.right} side="right" dragX={dragX} nudge={nudgeRight} disabled={finished} onPress={() => drop('right')} />
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, height: V2.iconButton },
  segs: { flex: 1, flexDirection: 'row', gap: 6, marginHorizontal: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ask: { minHeight: 20, marginTop: 26, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  pile: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardSlot: { width: '100%' },
  card: { minHeight: 190, padding: 24, alignItems: 'center', justifyContent: 'center' },
  under: { position: 'absolute', left: 0, right: 0, transform: [{ translateY: 14 }, { scale: 0.94 }], opacity: 0.6 },
  cardText: { textAlign: 'center', fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  hint: { minHeight: 20, marginTop: 12, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  bins: { flexDirection: 'row', gap: 12 },
  binWrap: { flex: 1 },
  bin: { minHeight: 112, padding: 16, justifyContent: 'space-between' },
  binRight: { alignItems: 'flex-end' },
  binCopy: { gap: 2 },
  binTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  binExample: { fontSize: 13, lineHeight: 17, fontWeight: '400' },
  right: { textAlign: 'right' },
  binCount: { fontSize: 28, lineHeight: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.86 },
  finish: { alignSelf: 'stretch' },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sub: { textAlign: 'center', marginTop: 6, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  growth: { marginTop: 22 },
});

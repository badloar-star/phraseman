/**
 * «Уровни игры» на примере «Блица» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `levels()`).
 * Лестница из пяти ступеней снизу вверх; текущая крупнее, светлее и несёт монету; три деления — серия хороших заходов;
 * надпись «Уровень N» подскакивает при подъёме. Уровень человек не выбирает — строки не нажимаются.
 * Движение — из макета в точности: прозрачность строки 400 мс, подложка 400 мс, увеличение 500 мс cubic-bezier(.2,1,.3,1),
 * монета 300 мс, деление 300 мс. Числа и цвета — в modules/games/levels_motion.ts.
 * зачем так: правило «три хороших подряд — вверх, два слабых — вниз» — в modules/games/levels_core; экран показывает
 * состояние из адреса (`level`, `good`, `from`) и ничего не хранит. Уровень хранит modules/games/blitz_level_store;
 * открывает экран «Блиц» после итога, когда уровень сдвинулся.
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import GameBumpText from '../components/games/GameBumpText';
import { MyRankCoin } from '../components/rank/MyRankCoin';
import { V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { isLightSurface } from '../constants/color_contrast';
import { GAME_EASE } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LEVELS_COUNT, LEVELS_GOOD_TO_RISE, levelRowState, normalizeLevelsState, type LevelRowState } from '../modules/games/levels_core';
import { LEVELS_MOTION, LEVELS_TINT } from '../modules/games/levels_motion';
import { safeRouterBack } from './navigation_back';

type Tri = Readonly<{ ru: string; uk: string; es: string; en: string }>;

const COPY = {
  title: { ru: 'Блиц · уровни', uk: 'Бліц · рівні', es: 'Blitz · niveles', en: 'Blitz · levels' },
  over: { ru: 'Сложность меняется сама', uk: 'Складність змінюється сама', es: 'La dificultad cambia sola', en: 'Difficulty adjusts itself' },
  level: { ru: 'Уровень', uk: 'Рівень', es: 'Nivel', en: 'Level' },
  sub: {
    ru: 'Три хороших захода подряд — уровень вверх. Два слабых — вниз.',
    uk: 'Три вдалі заходи поспіль — рівень вгору. Два слабкі — вниз.',
    es: 'Tres buenas rondas seguidas: subes de nivel. Dos flojas: bajas.',
    en: 'Three good runs in a row — level up. Two weak ones — down.',
  },
  back: { ru: 'Назад', uk: 'Назад', es: 'Atrás', en: 'Back' },
} as const;

/** Ступени «Блица» снизу вверх — тексты макета (elevate-games.js:92). */
const LADDER: readonly (readonly [Tri, Tri])[] = [
  [{ ru: '4 варианта · 60 секунд', uk: '4 варіанти · 60 секунд', es: '4 opciones · 60 segundos', en: '4 options · 60 seconds' }, { ru: 'Старт', uk: 'Старт', es: 'Inicio', en: 'Start' }],
  [{ ru: '5 вариантов', uk: '5 варіантів', es: '5 opciones', en: '5 options' }, { ru: 'Больше похожих ответов', uk: 'Більше схожих відповідей', es: 'Más respuestas parecidas', en: 'More look-alike answers' }],
  [{ ru: 'Без перевода на карточке', uk: 'Без перекладу на картці', es: 'Sin traducción en la tarjeta', en: 'No translation on the card' }, { ru: 'Только на слух', uk: 'Тільки на слух', es: 'Solo de oído', en: 'By ear only' }],
  [{ ru: '45 секунд', uk: '45 секунд', es: '45 segundos', en: '45 seconds' }, { ru: 'То же, но быстрее', uk: 'Те саме, але швидше', es: 'Lo mismo, pero más rápido', en: 'Same, but faster' }],
  [{ ru: 'Свои наборы вперемешку', uk: 'Свої набори впереміш', es: 'Tus mazos mezclados', en: 'Your sets mixed' }, { ru: 'Всё сразу', uk: 'Усе одразу', es: 'Todo a la vez', en: 'Everything at once' }],
];

// зачем: кривые создаются на уровне модуля — внутри кода потока интерфейса обычные функции вызывать нельзя
const EASE = Easing.bezier(GAME_EASE.ease[0], GAME_EASE.ease[1], GAME_EASE.ease[2], GAME_EASE.ease[3]);
const OUT = Easing.bezier(GAME_EASE.out[0], GAME_EASE.out[1], GAME_EASE.out[2], GAME_EASE.out[3]);

type Tint = (typeof LEVELS_TINT)[keyof typeof LEVELS_TINT];

type RowProps = Readonly<{ index: number; label: string; note: string; state: LevelRowState; tint: Tint; ink: string; ink2: string }>;

const LevelRow = memo(function LevelRow({ index, label, note, state, tint, ink, ink2 }: RowProps) {
  const reduceMotion = useReduceMotion();
  const cur = state === 'cur';
  const targetOpacity = cur ? 1 : state === 'done' ? LEVELS_MOTION.rowOpacityDone : LEVELS_MOTION.rowOpacity;
  const opacity = useSharedValue(targetOpacity);
  const scale = useSharedValue(cur ? LEVELS_MOTION.rowScaleCur : 1);
  const lit = useSharedValue(cur ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(targetOpacity, { duration: reduceMotion ? 0 : LEVELS_MOTION.rowFadeMs, easing: EASE });
    scale.value = withTiming(cur ? LEVELS_MOTION.rowScaleCur : 1, { duration: reduceMotion ? 0 : LEVELS_MOTION.rowScaleMs, easing: OUT });
    lit.value = withTiming(cur ? 1 : 0, { duration: reduceMotion ? 0 : LEVELS_MOTION.rowTintMs, easing: EASE });
  }, [cur, lit, opacity, reduceMotion, scale, targetOpacity]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const litStyle = useAnimatedStyle(() => ({ opacity: lit.value }));

  return (
    <Reanimated.View style={rowStyle} accessible accessibilityLabel={`${index + 1}. ${label}, ${note}`} accessibilityState={{ selected: cur }}>
      {/* светлый вид: у текущей ступени кольцо 2 px и тень (elevate-light.css:34) — под карточкой, чтобы его не срезало */}
      {tint.curRing ? <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, { boxShadow: tint.curRing }, litStyle]} /> : null}
      <V2Card seed={index} radius={LEVELS_MOTION.rowRadius} style={s.row}>
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, { backgroundColor: tint.cur }, litStyle]} />
        <View style={[s.num, { backgroundColor: tint.num }]}>
          <Text style={[s.numText, { color: ink }]}>{index + 1}</Text>
        </View>
        <View style={s.copy}>
          <Text style={[s.label, { color: ink }]}>{label}</Text>
          <Text style={[s.note, { color: ink2 }]}>{note}</Text>
        </View>
        <LevelCoin shown={cur} />
      </V2Card>
    </Reanimated.View>
  );
});

/** Монета у текущей ступени: проявляется за 300 мс (elevate-extra.css:187). Место под неё занято всегда. */
const LevelCoin = memo(function LevelCoin({ shown }: Readonly<{ shown: boolean }>) {
  const reduceMotion = useReduceMotion();
  const value = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    value.value = withTiming(shown ? 1 : 0, { duration: reduceMotion ? 0 : LEVELS_MOTION.coinFadeMs, easing: EASE });
  }, [reduceMotion, shown, value]);
  const style = useAnimatedStyle(() => ({ opacity: value.value }));
  return (
    <Reanimated.View style={[s.coin, style]}>
      <MyRankCoin size={LEVELS_MOTION.coinSize} style={s.coin} contentFit="contain" accessible={false} />
    </Reanimated.View>
  );
});

/** Деление серии: заливка проявляется за 300 мс (elevate-extra.css:189). */
const Pip = memo(function Pip({ on, tint }: Readonly<{ on: boolean; tint: Tint }>) {
  const reduceMotion = useReduceMotion();
  const value = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    value.value = withTiming(on ? 1 : 0, { duration: reduceMotion ? 0 : LEVELS_MOTION.pipMs, easing: EASE });
  }, [on, reduceMotion, value]);
  const style = useAnimatedStyle(() => ({ opacity: value.value }));
  return (
    <View style={[s.pip, { backgroundColor: tint.pip }]}>
      <Reanimated.View style={[StyleSheet.absoluteFill, s.pip, { backgroundColor: tint.pipOn }, style]} />
    </View>
  );
});

export default function GameLevelsScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ level?: string; good?: string; from?: string }>();
  // зачем: адрес — внешние данные; номер ступени и серия обрезаются до допустимых значений
  const target = useMemo(() => normalizeLevelsState({ level: params.level, good: params.good }), [params.good, params.level]);
  // `from` — уровень до захода (его передаёт «Блиц», когда уровень сдвинулся): лестница сначала стоит на нём,
  // а потом переходит на новый — так, как сдвиг показан в макете (подскок надписи, смена ступени)
  const start = useMemo(() => {
    if (params.from === undefined) return target;
    const from = normalizeLevelsState({ level: params.from }).level;
    if (from === target.level) return target;
    return { level: from, good: from < target.level ? LEVELS_GOOD_TO_RISE - 1 : 0, weak: 0 };
  }, [params.from, target]);
  const [state, setState] = useState(start);
  useEffect(() => {
    setState(start);
    if (start === target) return undefined;
    const id = setTimeout(() => setState(target), LEVELS_MOTION.moveDelayMs);
    return () => clearTimeout(id);
  }, [start, target]);
  const tint = isLightSurface(p.bg) ? LEVELS_TINT.light : LEVELS_TINT.dark;
  // зачем: лестница открывается после итога «Блица» — без истории «назад» ведёт в раздел карточек
  const onBack = () => safeRouterBack(router, '/flashcards' as never);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={triLang(lang, COPY.back)} testID="game-levels-back" />
            <Text style={[s.title, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
          </View>

          <View style={s.hero}>
            <Text style={[s.over, { color: p.textSecondary }]}>{triLang(lang, COPY.over)}</Text>
            <GameBumpText value={`${triLang(lang, COPY.level)} ${state.level + 1}`} trigger={state.level} style={[s.big, { color: p.text }]} />
            <Text style={[s.sub, { color: p.textSecondary }]}>{triLang(lang, COPY.sub)}</Text>
            <View style={s.pips} accessible accessibilityLabel={`${state.good} / ${LEVELS_GOOD_TO_RISE}`}>
              {Array.from({ length: LEVELS_GOOD_TO_RISE }, (_, i) => <Pip key={`pip-${i}`} on={i < state.good} tint={tint} />)}
            </View>
          </View>

          <View style={s.flex} />
          {/* `.lad { flex-direction: column-reverse }` — первая ступень внизу */}
          <View style={s.ladder}>
            {LADDER.slice(0, LEVELS_COUNT).map(([label, note], i) => (
              <LevelRow
                key={`level-${i}`}
                index={i}
                label={triLang(lang, label)}
                note={triLang(lang, note)}
                state={levelRowState(state, i)}
                tint={tint}
                ink={p.text}
                ink2={p.textSecondary}
              />
            ))}
          </View>
          <View style={s.ladderBottom} />
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  // elevate-mechanics.css:57–58 `.top`, `.top .ttl`
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, height: V2.iconButton },
  title: { flex: 1, fontSize: LEVELS_MOTION.titleSize, lineHeight: 26, fontWeight: '700' },
  hero: { marginTop: LEVELS_MOTION.heroTop },
  over: { fontSize: LEVELS_MOTION.overSize, lineHeight: LEVELS_MOTION.overLine, fontWeight: '500' },
  big: { marginTop: LEVELS_MOTION.bigTop, alignSelf: 'flex-start', fontSize: LEVELS_MOTION.bigSize, lineHeight: LEVELS_MOTION.bigLine, fontWeight: '800', letterSpacing: LEVELS_MOTION.bigSpacing },
  sub: { marginTop: LEVELS_MOTION.subTop, fontSize: LEVELS_MOTION.subSize, lineHeight: LEVELS_MOTION.subLine },
  pips: { marginTop: LEVELS_MOTION.pipsTop, flexDirection: 'row', gap: LEVELS_MOTION.pipGap },
  pip: { width: LEVELS_MOTION.pipWidth, height: LEVELS_MOTION.pipHeight, borderRadius: LEVELS_MOTION.pipRadius },
  ladder: { flexDirection: 'column-reverse', gap: LEVELS_MOTION.ladderGap },
  ladderBottom: { height: LEVELS_MOTION.ladderBottom },
  row: { flexDirection: 'row', alignItems: 'center', gap: LEVELS_MOTION.rowGap, height: LEVELS_MOTION.rowHeight, paddingHorizontal: LEVELS_MOTION.rowPadH },
  ring: { borderRadius: LEVELS_MOTION.rowRadius },
  num: { width: LEVELS_MOTION.numSize, height: LEVELS_MOTION.numSize, borderRadius: LEVELS_MOTION.numSize / 2, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  copy: { flex: 1 },
  label: { fontSize: LEVELS_MOTION.textSize, lineHeight: 21, fontWeight: '700' },
  note: { fontSize: LEVELS_MOTION.noteSize, lineHeight: 17, fontWeight: '500' },
  coin: { width: LEVELS_MOTION.coinSize, height: LEVELS_MOTION.coinSize, borderRadius: LEVELS_MOTION.coinSize / 2 },
});

/**
 * «Минута знаний» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `minute()`).
 * Одно правило в двух строках: фраза с выделенным словом, объяснение, до двух примеров с переводом.
 * Движение — из макета в точности: карточка поднимается (520 мс), примеры — лесенкой с 500 мс по 250 мс,
 * полоса времени заполняется 20 секунд линейно, после чего экран уходит сам. Числа — в modules/games/minute_motion.ts.
 * зачем так: правила и сборка карточки — в modules/games/minute_core; экран только рисует. Материал — объяснения
 * банка заданий языка обучения по текущему уроку; чужой язык не подставляется — без материала открывается итог.
 * Экран пока никуда не подключён: в разминку и переходы его ставит ведущая сессия игр.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import GameRise from '../components/games/GameRise';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { minuteCards, pickMinuteCard } from '../modules/games/minute_core';
import { MINUTE_MOTION } from '../modules/games/minute_motion';
import { currentGameLesson, huntTasksFor, oddWordTasksFor, quizDeckFor } from '../modules/games/task_source';
import { safeRouterBack } from './navigation_back';
import { studySpeechLocale } from './study_speech_locale';

const LOG = '[GAME_MINUTE]';
const COPY = {
  pill: { ru: 'Минута знаний', uk: 'Хвилина знань', es: 'Minuto de saber', en: 'Minute of knowledge' },
  ask: { ru: 'Ты ошибся здесь. Вот правило в двух строках', uk: 'Ти помилився тут. Ось правило у двох рядках', es: 'Aquí te equivocaste. La regla en dos líneas', en: 'You slipped here. The rule in two lines' },
  ok: { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', en: 'Got it' },
  empty: { ru: 'Для этого урока правил пока нет', uk: 'Для цього уроку правил поки немає', es: 'Aún no hay reglas para esta lección', en: 'No rules for this lesson yet' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
  listen: { ru: 'Послушать', uk: 'Послухати', es: 'Escuchar', en: 'Listen' },
} as const;

// зачем: кривая создаётся на уровне модуля — внутри кода потока интерфейса обычные функции вызывать нельзя
const LINEAR = Easing.linear;

export default function GameMinuteScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const params = useLocalSearchParams<{ item?: string }>();
  const audio = useAudio();

  // зачем: правило — только для языка, который человек учит, и из урока, на котором он сейчас;
  // `item` — id задания, на котором он ошибся в другой игре; без него показывается правило дня
  const card = useMemo(() => {
    const lesson = currentGameLesson(studyTarget);
    const cards = minuteCards({
      exact: quizDeckFor('exact', studyTarget, lesson)?.rounds,
      hunt: huntTasksFor(studyTarget, lesson),
      oddWord: oddWordTasksFor(studyTarget, lesson),
      listen: quizDeckFor('listen', studyTarget, lesson)?.rounds,
    });
    const picked = pickMinuteCard(cards, typeof params.item === 'string' ? params.item : null, Math.floor(Date.now() / 86400000));
    if (!picked) console.warn(`${LOG} card:none ${JSON.stringify({ studyTarget, lesson, cards: cards.length })}`); // guard-ok: ранний выход с причиной
    return picked;
  }, [params.item, studyTarget]);

  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return; // защита от двойного ухода: кнопка и конец времени могут совпасть
    left.current = true;
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  // полоса времени: 20 секунд линейно (elevate-games.js:87), затем экран уходит сам
  const time = useSharedValue(0);
  useEffect(() => {
    if (!card) return undefined;
    time.value = 0;
    time.value = withTiming(1, { duration: MINUTE_MOTION.timerMs, easing: LINEAR });
    const id = setTimeout(leave, MINUTE_MOTION.timerMs);
    return () => {
      clearTimeout(id);
      cancelAnimation(time);
    };
  }, [card, leave, time]);
  useEffect(() => () => audio.stop(), [audio]);

  const barStyle = useAnimatedStyle(() => ({ width: `${time.value * 100}%` }));

  const speak = useCallback((text: string) => {
    // зачем: язык речи — язык обучения, а не догадка по буквам фразы
    audio.speak(text, 1, { language: studySpeechLocale(studyTarget, 'game_minute') });
  }, [audio, studyTarget]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={leave} accessibilityLabel={triLang(lang, COPY.close)} testID="game-minute-close" />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{triLang(lang, COPY.pill)}</Text>
            </View>
            <View style={s.topSide} />
          </View>

          {card ? (
            <>
              <Text style={[s.ask, { color: p.textSecondary }]}>{triLang(lang, COPY.ask)}</Text>
              <GameRise style={s.cardWrap}>
                <V2Card seed={1} style={s.card}>
                  <View style={s.formula} accessible accessibilityLabel={card.parts.map((part) => part.text).join(' ')}>
                    {card.parts.map((part, i) => (
                      <View key={`${card.id}-p${i}`} style={part.mark ? [s.mark, { backgroundColor: p.track }] : null}>
                        <Text style={[s.formulaText, { color: p.text }]}>{part.text}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.rule, { color: p.textSecondary }]}>{card.rule}</Text>
                  {card.examples.map((example, i) => (
                    <GameRise key={`${card.id}-e${i}`} delayMs={MINUTE_MOTION.exampleFirstDelayMs + i * MINUTE_MOTION.exampleStepMs}>
                      <Pressable
                        testID={`game-minute-example-${i}`}
                        accessibilityRole="button"
                        accessibilityLabel={`${triLang(lang, COPY.listen)}: ${example.text}`}
                        onPressIn={() => { void hapticTap(); }}
                        onPress={() => speak(example.text)}
                        style={[s.example, { backgroundColor: p.control }]}
                      >
                        <Ionicons name="volume-medium" size={MINUTE_MOTION.exampleIcon} color={p.text} />
                        <View style={s.exampleCopy}>
                          <Text style={[s.exampleText, { color: p.text }]}>{example.text}</Text>
                          <Text style={[s.exampleNote, { color: p.textSecondary }]}>{example.translation}</Text>
                        </View>
                      </Pressable>
                    </GameRise>
                  ))}
                </V2Card>
              </GameRise>
              <View style={s.flex} />
              <View style={[s.bar, { backgroundColor: p.track }]}>
                <Reanimated.View style={[s.barFill, { backgroundColor: p.text }, barStyle]} />
              </View>
            </>
          ) : (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: p.text }]}>{triLang(lang, COPY.empty)}</Text>
            </View>
          )}
          <V2Button testID="game-minute-ok" label={triLang(lang, COPY.ok)} onPress={leave} />
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  // зачем: пустой блок шириной с кнопку закрытия держит название по центру (в макете справа — монеты, их здесь нет)
  topSide: { width: V2.iconButton },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  // elevate-mechanics.css:108 `.ask`
  ask: { marginTop: MINUTE_MOTION.askTop, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  cardWrap: { marginTop: MINUTE_MOTION.cardTop },
  card: { paddingVertical: MINUTE_MOTION.cardPadV, paddingHorizontal: MINUTE_MOTION.cardPadH },
  // зачем: фраза набрана словами в ряд с переносом — подложка под выделенным словом со скруглением у вложенного
  // текста на телефоне не рисуется, а у отдельного блока рисуется
  formula: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  formulaText: { fontSize: MINUTE_MOTION.formulaSize, lineHeight: MINUTE_MOTION.formulaLine, fontWeight: '800', letterSpacing: MINUTE_MOTION.formulaSpacing },
  mark: { borderRadius: MINUTE_MOTION.markRadius, paddingHorizontal: MINUTE_MOTION.markPadH },
  rule: { marginTop: MINUTE_MOTION.ruleTop, fontSize: MINUTE_MOTION.ruleSize, lineHeight: MINUTE_MOTION.ruleLine },
  example: {
    flexDirection: 'row', alignItems: 'center', gap: MINUTE_MOTION.exampleGap, marginTop: MINUTE_MOTION.exampleTop,
    paddingVertical: MINUTE_MOTION.examplePadV, paddingHorizontal: MINUTE_MOTION.examplePadH, borderRadius: MINUTE_MOTION.exampleRadius,
  },
  exampleCopy: { flex: 1 },
  exampleText: { fontSize: MINUTE_MOTION.exampleSize, lineHeight: 21, fontWeight: '600' },
  exampleNote: { fontSize: MINUTE_MOTION.exampleNoteSize, lineHeight: 19, fontWeight: '500' },
  bar: { height: MINUTE_MOTION.barHeight, borderRadius: MINUTE_MOTION.barRadius, overflow: 'hidden', marginBottom: MINUTE_MOTION.barBottom },
  barFill: { height: '100%', borderRadius: MINUTE_MOTION.barRadius },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
});

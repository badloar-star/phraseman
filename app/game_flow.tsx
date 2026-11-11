/**
 * Игра «Поток» — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `flow()`).
 * Владелец 11.11.2026: «всё с макетов вноси в приложение», «самое главное — механики».
 *
 * Ход: правило и «Начать» → отсчёт 3-2-1 → фраза по одному слову → три варианта → вердикт и новый темп →
 * сигнал «Следующая фраза» → … → итог с блоком «Навыки растут».
 * зачем так: правила и расписание — в modules/games/flow_core (проверяются отдельно), экран только исполняет;
 * фразы — из уже загруженного урока, сети нет, первый кадр сразу конечной геометрии.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { useStudyTarget } from '../components/StudyTargetContext';
import { V2AnswerOption, V2Button, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang, type Lang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  FLOW_DEFAULT_ROUNDS, FLOW_TEMPO, buildFlowRounds, flowRoundTimings, isFlowHighTempo, nextFlowTempoLevel,
  type FlowItem, type FlowRound,
} from '../modules/games/flow_core';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { noteSkillAction } from '../modules/skills/skill_store';
import { getClassicLessonPhrases, isClassicCourseLang } from './classic_course_phrases';
import { safeRouterBack } from './navigation_back';

const LOG = '[GAME-FLOW]';
const COUNTDOWN_STEP_MS = 800;
const NEXT_CUE_MS = 1100;
const AFTER_OK_MS = 1500;
const AFTER_MISS_MS = 2300;

type Phase = 'intro' | 'countdown' | 'reading' | 'answer' | 'verdict' | 'cue' | 'done' | 'empty';

const COPY = {
  name: { ru: 'Поток', uk: 'Потік', es: 'Flujo', en: 'Flow' },
  rule: {
    ru: 'Фраза появится по одному слову и исчезнет. Потом выбери, что было сказано. За верный ответ темп растёт.',
    uk: 'Фраза з’явиться по одному слову і зникне. Потім обери, що було сказано. За правильну відповідь темп зростає.',
    es: 'La frase aparecerá palabra por palabra y desaparecerá. Luego elige qué se dijo. Cada acierto sube el ritmo.',
    en: 'The phrase appears one word at a time and disappears. Then choose what was said. Each correct answer raises the tempo.',
  },
  start: { ru: 'Начать', uk: 'Почати', es: 'Empezar', en: 'Start' },
  tempo: { ru: 'Темп', uk: 'Темп', es: 'Ritmo', en: 'Tempo' },
  watch: { ru: 'Смотри сюда — фраза появится здесь', uk: 'Дивись сюди — фраза з’явиться тут', es: 'Mira aquí: la frase aparecerá aquí', en: 'Watch here — the phrase appears here' },
  next: { ru: 'Следующая фраза', uk: 'Наступна фраза', es: 'Siguiente frase', en: 'Next phrase' },
  ask: { ru: 'Что было сказано?', uk: 'Що було сказано?', es: '¿Qué se dijo?', en: 'What was said?' },
  ok: { ru: 'Верно — темп растёт', uk: 'Правильно — темп зростає', es: 'Correcto: el ritmo sube', en: 'Correct — tempo goes up' },
  miss: { ru: 'Мимо — темп ниже', uk: 'Повз — темп нижчий', es: 'Fallo: el ritmo baja', en: 'Missed — tempo goes down' },
  doneTitle: { ru: 'Поток пройден', uk: 'Потік пройдено', es: 'Flujo completado', en: 'Flow complete' },
  score: { ru: 'верных из', uk: 'правильних із', es: 'aciertos de', en: 'correct of' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  empty: { ru: 'Для игры пока мало фраз', uk: 'Для гри поки замало фраз', es: 'Aún hay pocas frases para jugar', en: 'Not enough phrases to play yet' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type WordProps = Readonly<{ text: string; inAt: number; holdMs: number; fadeMs: number; still: boolean; color: string }>;

/** Слово фразы: проявляется по расписанию, уходит вверх; после ответа вся фраза возвращается и стоит. */
const FlowWord = memo(function FlowWord({ text, inAt, holdMs, fadeMs, still, color }: WordProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const shift = useSharedValue(8);

  useEffect(() => {
    if (still) {
      opacity.value = withTiming(1, { duration: 300 });
      shift.value = withTiming(0, { duration: 300 });
      return undefined;
    }
    const ease = Easing.out(Easing.cubic);
    const fade = reduceMotion ? 1 : fadeMs;
    opacity.value = 0;
    shift.value = reduceMotion ? 0 : 8;
    opacity.value = withSequence(withDelay(inAt, withTiming(1, { duration: fade, easing: ease })), withDelay(Math.max(0, holdMs - fade), withTiming(0, { duration: fade, easing: ease })));
    if (!reduceMotion) {
      shift.value = withSequence(withDelay(inAt, withTiming(0, { duration: fade, easing: ease })), withDelay(Math.max(0, holdMs - fade), withTiming(-8, { duration: fade, easing: ease })));
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(shift);
    };
  }, [fadeMs, holdMs, inAt, opacity, reduceMotion, shift, still]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: shift.value }] }));
  return <Reanimated.Text style={[s.word, { color }, style]}>{text}</Reanimated.Text>;
});

function translationOf(phrase: { russian: string; ukrainian: string; sourceLocales?: Record<string, string | undefined> }, lang: Lang): string {
  if (lang === 'ru') return phrase.russian;
  if (lang === 'uk') return phrase.ukrainian || phrase.russian;
  return phrase.sourceLocales?.[lang] || phrase.russian;
}

export default function GameFlowScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const params = useLocalSearchParams<{ lesson?: string }>();
  const lessonId = Math.max(1, Math.floor(Number(params.lesson) || 1));

  // зачем: раунды собираются один раз на вход — повторный рендер не должен перетасовать варианты под пальцем
  const rounds = useMemo<FlowRound[]>(() => {
    const course = isClassicCourseLang(studyTarget) ? studyTarget : 'en';
    const pool: FlowItem[] = getClassicLessonPhrases(lessonId, course).map((phrase) => ({ id: `${course}:${lessonId}:${String(phrase.id)}`, en: phrase.english, translation: translationOf(phrase, lang) }));
    const built = buildFlowRounds(pool, FLOW_DEFAULT_ROUNDS);
    if (built.length === 0) console.warn(`${LOG} rounds:empty ${JSON.stringify({ course, lessonId, pool: pool.length })}`); // guard-ok: ранний выход с причиной
    return built;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, studyTarget]);

  const [phase, setPhase] = useState<Phase>(rounds.length > 0 ? 'intro' : 'empty');
  const [roundIndex, setRoundIndex] = useState(0);
  const [tempoLevel, setTempoLevel] = useState(0);
  const [count, setCount] = useState(3);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const answersShownAt = useRef(0);
  const pickLock = useRef(false);
  const beam = useSharedValue(0);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => () => {
    clearTimers();
    cancelAnimation(beam);
  }, [beam, clearTimers]);

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (phase === 'done') markWarmupGamePlayed('flow', `${correctCount}/${rounds.length}`);
  }, [correctCount, phase, rounds.length]);

  const round = rounds[Math.min(roundIndex, Math.max(0, rounds.length - 1))];
  const tempo = FLOW_TEMPO[tempoLevel];
  const timings = useMemo(() => flowRoundTimings(round ? round.words.length : 1, tempo.msPerWord), [round, tempo.msPerWord]);

  const startReading = useCallback((index: number, level: number) => {
    const next = rounds[index];
    if (!next) return;
    const t = flowRoundTimings(next.words.length, FLOW_TEMPO[level].msPerWord);
    pickLock.current = false;
    setPicked(null);
    setRoundIndex(index);
    setPhase('reading');
    beam.value = 0;
    beam.value = withDelay(t.startDelayMs, withTiming(1, { duration: t.beamMs, easing: Easing.linear }));
    after(t.answersAt, () => {
      answersShownAt.current = Date.now();
      setPhase('answer');
    });
  }, [after, beam, rounds]);

  const onStart = useCallback(() => {
    if (phase !== 'intro') return; // защита от двойного тапа
    setPhase('countdown');
    setCount(3);
    after(COUNTDOWN_STEP_MS, () => setCount(2));
    after(COUNTDOWN_STEP_MS * 2, () => setCount(1));
    after(COUNTDOWN_STEP_MS * 3, () => startReading(0, 0));
  }, [after, phase, startReading]);

  const onPick = useCallback((index: number) => {
    if (phase !== 'answer' || pickLock.current || !round) return;
    pickLock.current = true;
    const correct = index === round.correctIndex;
    const answerMs = Date.now() - answersShownAt.current;
    const nextLevel = nextFlowTempoLevel(tempoLevel, correct);
    setPicked(index);
    setPhase('verdict');
    setTempoLevel(nextLevel);
    if (correct) {
      setCorrectCount((n) => n + 1);
      // зачем (D207): «Скорость» — только верный ответ быстрее трёх секунд; порог проверяет таблица навыков
      noteSkillAction({ action: isFlowHighTempo(tempoLevel) ? 'flow_correct_high_tempo' : 'flow_correct', itemKey: round.item.id, answerMs });
    }
    const isLast = roundIndex >= rounds.length - 1;
    after(correct ? AFTER_OK_MS : AFTER_MISS_MS, () => {
      if (isLast) {
        setPhase('done');
        return;
      }
      setPhase('cue');
      after(NEXT_CUE_MS, () => startReading(roundIndex + 1, nextLevel));
    });
  }, [after, phase, round, roundIndex, rounds.length, startReading, tempoLevel]);

  const onClose = useCallback(() => {
    clearTimers();
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [clearTimers, router]);

  const beamStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: beam.value }] }));
  const verdictOk = picked !== null && round ? picked === round.correctIndex : false;
  const showPhrase = phase === 'reading' || phase === 'answer' || phase === 'verdict';

  let ask = '';
  if (phase === 'countdown' || phase === 'cue') ask = triLang(lang, COPY.watch);
  else if (phase === 'answer') ask = triLang(lang, COPY.ask);
  else if (phase === 'verdict') ask = triLang(lang, verdictOk ? COPY.ok : COPY.miss);

  let caption = '';
  if (phase === 'intro') caption = triLang(lang, COPY.rule);
  else if (phase === 'verdict' && round) caption = round.item.translation;
  else if (phase === 'empty') caption = triLang(lang, COPY.empty);
  else if (phase === 'done') caption = `${correctCount} ${triLang(lang, COPY.score)} ${rounds.length}`;

  let headline: string | null = null;
  if (phase === 'intro' || phase === 'empty') headline = triLang(lang, COPY.name);
  else if (phase === 'countdown') headline = String(count);
  else if (phase === 'cue') headline = triLang(lang, COPY.next);
  else if (phase === 'done') headline = triLang(lang, COPY.doneTitle);

  const doneRounds = phase === 'done' ? rounds.length : phase === 'verdict' || phase === 'cue' ? roundIndex + (phase === 'verdict' ? 1 : 1) : roundIndex;

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-flow-close" />
            <View style={s.tempoWrap}>
              <View style={s.tempoBars}>
                {Array.from({ length: 10 }, (_, i) => (
                  <View key={`bar-${i}`} style={[s.tempoBar, { height: 8 + i * 1.5, backgroundColor: i < tempo.bars ? p.text : p.track }]} />
                ))}
              </View>
              <View style={[s.pill, { backgroundColor: p.glass }]}>
                <Text style={[s.pillText, { color: p.text }]}>{`${triLang(lang, COPY.tempo)} ×${tempo.label}`}</Text>
              </View>
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{`${rounds.length === 0 ? 0 : Math.min(rounds.length, phase === 'intro' || phase === 'countdown' ? 0 : roundIndex + 1)} / ${rounds.length}`}</Text>
            </View>
          </View>

          <View style={s.segs}>
            {rounds.map((r, i) => (
              <View key={r.item.id} style={[s.seg, { backgroundColor: i < doneRounds ? p.text : p.track }]} />
            ))}
          </View>

          <View style={s.stageTop} />
          <View style={s.reader}>
            {showPhrase && round ? (
              <View style={s.line}>
                {round.words.map((word, i) => (
                  <FlowWord
                    key={`${round.item.id}-${i}`}
                    text={word}
                    inAt={timings.wordInAt[i] ?? 0}
                    holdMs={tempo.msPerWord * 1.5}
                    fadeMs={timings.wordFadeMs}
                    still={phase === 'verdict'}
                    color={p.text}
                  />
                ))}
              </View>
            ) : (
              <Text style={[phase === 'cue' ? s.cue : s.word, { color: p.text }]}>{headline}</Text>
            )}
            <View style={[s.beam, { backgroundColor: p.track, opacity: phase === 'reading' ? 1 : 0 }]}>
              <Reanimated.View style={[s.beamFill, { backgroundColor: p.text }, beamStyle]} />
            </View>
            <Text style={[s.caption, { color: p.textSecondary }]}>{caption}</Text>
          </View>

          <View style={s.stageBottom} />
          <Text style={[s.ask, { color: p.textSecondary }]}>{ask}</Text>

          <View style={s.answers}>
            {(phase === 'answer' || phase === 'verdict') && round ? round.options.map((option, i) => (
              <V2AnswerOption
                key={`${round.item.id}-o${i}`}
                testID={`game-flow-option-${i}`}
                label={option}
                disabled={phase !== 'answer'}
                state={phase === 'answer' ? 'idle' : i === round.correctIndex ? 'correct' : i === picked ? 'wrong' : 'dimmed'}
                onPress={() => { void hapticTap(); onPick(i); }}
              />
            )) : null}
            {phase === 'intro' ? <V2Button testID="game-flow-start" label={triLang(lang, COPY.start)} icon="play" iconPosition="leading" onPress={onStart} /> : null}
            {phase === 'done' ? <SkillsSessionGrowth /> : null}
            {phase === 'done' || phase === 'empty' ? <V2Button testID="game-flow-done" label={triLang(lang, COPY.done)} onPress={onClose} /> : null}
          </View>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  tempoWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempoBars: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26 },
  tempoBar: { width: 5, borderRadius: 3 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  segs: { flexDirection: 'row', gap: 6, marginTop: 14, height: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  stageTop: { flex: 0.8 },
  stageBottom: { flex: 1 },
  reader: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, rowGap: 4, paddingHorizontal: 6 },
  word: { fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  cue: { fontSize: 24, lineHeight: 30, fontWeight: '800', opacity: 0.7, textAlign: 'center' },
  beam: { width: 240, height: 3, borderRadius: 2, marginTop: 26, overflow: 'hidden' },
  beamFill: { width: 240, height: 3, borderRadius: 2, transformOrigin: 'left' },
  caption: { minHeight: 44, marginTop: 16, textAlign: 'center', fontSize: 16, lineHeight: 22, fontWeight: '500', paddingHorizontal: 8 },
  ask: { minHeight: 20, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  answers: { marginTop: 16, gap: 12, minHeight: 204, justifyContent: 'flex-end' },
});

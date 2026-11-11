/**
 * Игры «На слух», «Память», «Точное слово», «Три формы» — перенос утверждённого макета
 * (docs/design/v2-app/elevate-games.js: `listen`, `memory`, `exact`, `forms` на общем движке `quiz`).
 * Владелец 11.11.2026: «самое главное — механики».
 *
 * Ход раунда: задание показывается → появляются варианты → ответ фиксируется → пояснение → следующий раунд → итог.
 * В «Памяти» пары показываются и скрываются, затем спрашивается одна из них.
 * зачем так: один экран на три игры — они различаются только видом задания; правила и задания — в quiz_core.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { V2AnswerOption, V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { inferExpoSpeechLanguage, useAudio } from '../hooks/use-audio';
import { hapticTap } from '../hooks/use-haptics';
import {
  INITIAL_QUIZ_STATE, QUIZ_SEED_DECKS, answerQuiz, isQuizKind, isValidQuizRound, nextQuizRound, type QuizRound,
} from '../modules/games/quiz_core';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { noteSkillAction } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const AFTER_OK_MS = 1500;
const AFTER_MISS_MS = 2300;

const COPY = {
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
  empty: { ru: 'Для игры пока нет заданий', uk: 'Для гри поки немає завдань', es: 'Aún no hay tareas para este juego', en: 'No tasks for this game yet' },
} as const;

type Phase = 'show' | 'answer' | 'verdict' | 'done';

function Prompt({ round, phase, picked, onReplay }: Readonly<{ round: QuizRound; phase: Phase; picked: number | null; onReplay: () => void }>) {
  const p = useV2Palette();
  const prompt = round.prompt;
  const answered = phase === 'verdict';
  const ok = picked === round.correctIndex;

  if (prompt.kind === 'audio') {
    // зачем: фразу можно переслушать нажатием — проверяется слух, а не память на один показ
    return (
      <Pressable testID="game-quiz-replay" accessibilityRole="button" accessibilityLabel={round.ask} onPressIn={() => { void hapticTap(); }} onPress={onReplay} style={({ pressed }) => [s.audio, { backgroundColor: p.glass }, pressed && s.pressed]}>
        <Ionicons name="volume-high" size={36} color={p.text} />
        <View style={s.wave}>
          {Array.from({ length: 22 }, (_, k) => (
            <View key={`wave-${k}`} style={[s.waveBar, { height: 12 + ((k * 37) % 44), backgroundColor: p.text, opacity: answered ? 0.3 : 0.8 }]} />
          ))}
        </View>
      </Pressable>
    );
  }

  if (prompt.kind === 'pairs') {
    // пары видны, пока идёт показ и после ответа; во время вопроса открыта только левая часть спрашиваемой пары
    const hidden = phase === 'answer';
    return (
      <View style={s.pairs}>
        {prompt.pairs.map(([left, right], i) => (
          <Reanimated.View key={left} entering={FadeInDown.duration(320).delay(i * 70)} style={s.pairSlot}>
            <V2Card seed={i} style={[s.pair, hidden && i !== prompt.askIndex && s.pairHidden]}>
              <Text style={[s.pairLeft, { color: p.text }]}>{left}</Text>
              <Text style={[s.pairRight, { color: p.textSecondary, opacity: hidden ? 0 : 1 }]}>{right}</Text>
            </V2Card>
          </Reanimated.View>
        ))}
      </View>
    );
  }

  if (prompt.kind === 'gap') {
    return (
      <View style={s.gapRow}>
        {prompt.before ? <Text style={[s.gapText, { color: p.text }]}>{prompt.before}</Text> : null}
        <View style={[s.hole, { backgroundColor: p.track }]}>
          {/* зачем: в пропуск всегда встаёт верное слово — его и красим по исходу ответа */}
          <Text style={[s.gapText, { color: answered ? (ok ? p.correct : p.wrong) : 'transparent' }]}>{round.options[round.correctIndex]}</Text>
        </View>
        {prompt.after ? <Text style={[s.gapText, { color: p.text }]}>{prompt.after}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.cells}>
      {prompt.known.map((form, i) => (
        <Reanimated.View key={form} entering={FadeInDown.duration(320).delay(i * 120)} style={[s.cell, { backgroundColor: p.glass }]}>
          <Text style={[s.cellText, { color: p.text }]}>{form}</Text>
        </Reanimated.View>
      ))}
      <Reanimated.View entering={FadeInDown.duration(320).delay(240)} style={[s.cell, s.cellHole, { backgroundColor: p.track }]}>
        <Text style={[s.cellText, { color: answered ? p.correct : 'transparent' }]}>{round.options[round.correctIndex]}</Text>
      </Reanimated.View>
    </View>
  );
}

export default function GameQuizScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = isQuizKind(params.kind) ? params.kind : 'memory';
  const deck = QUIZ_SEED_DECKS[kind];
  const rounds = useMemo(() => deck.rounds.filter(isValidQuizRound), [deck]);

  const [game, setGame] = useState(INITIAL_QUIZ_STATE);
  const [phase, setPhase] = useState<Phase>(rounds.length > 0 ? 'show' : 'done');
  const [picked, setPicked] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock = useRef(false);

  const round = rounds[Math.min(game.index, Math.max(0, rounds.length - 1))];
  const audio = useAudio();
  const speakRound = useCallback(() => {
    if (!round || round.prompt.kind !== 'audio') return;
    audio.speak(round.prompt.text, round.prompt.rate, { language: inferExpoSpeechLanguage(round.prompt.text) });
  }, [audio, round]);

  // «На слух»: фраза произносится в начале раунда; уход с экрана останавливает речь
  useEffect(() => {
    if (phase === 'show') speakRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.index, phase]);
  useEffect(() => () => audio.stop(), [audio]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // показ задания → варианты
  useEffect(() => {
    if (phase !== 'show') return undefined;
    lock.current = false;
    const id = setTimeout(() => setPhase('answer'), deck.showMs);
    timers.current.push(id);
    return () => clearTimeout(id);
  }, [deck.showMs, game.index, phase]);

  const onPick = useCallback((index: number) => {
    if (phase !== 'answer' || lock.current || !round) return; // защита от двойного тапа
    lock.current = true;
    const result = answerQuiz(game, round, index);
    setPicked(index);
    setGame(result.state);
    setPhase('verdict');
    if (result.correct) noteSkillAction({ action: deck.skillAction, itemKey: `quiz:${kind}:${round.id}` });
    timers.current.push(setTimeout(() => {
      setPicked(null);
      if (result.state.index >= rounds.length - 1) {
        setPhase('done');
        return;
      }
      setGame((prev) => nextQuizRound(prev));
      setPhase('show');
    }, result.correct ? AFTER_OK_MS : AFTER_MISS_MS));
  }, [deck.skillAction, game, kind, phase, round, rounds.length]);

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (phase === 'done' && rounds.length > 0) markWarmupGamePlayed(kind, `${game.correct}/${rounds.length}`);
  }, [game.correct, kind, phase, rounds.length]);

  const onClose = useCallback(() => {
    timers.current.forEach(clearTimeout);
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  const finished = phase === 'done';
  const doneCount = finished ? rounds.length : game.index + (phase === 'verdict' ? 1 : 0);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-quiz-close" />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{deck.pill}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{`${Math.min(doneCount, rounds.length)} / ${rounds.length}`}</Text>
            </View>
          </View>

          <View style={s.segs}>
            {rounds.map((r, i) => <View key={r.id} style={[s.seg, { backgroundColor: i < doneCount ? p.text : p.track }]} />)}
          </View>

          {finished ? (
            <View style={s.finish}>
              <Text style={[s.big, { color: p.text }]}>{rounds.length > 0 ? `${game.correct} ${triLang(lang, COPY.of)} ${rounds.length}` : triLang(lang, COPY.empty)}</Text>
              <SkillsSessionGrowth style={s.growth} />
              <View style={s.flex} />
              <V2Button testID="game-quiz-done" label={triLang(lang, COPY.done)} onPress={onClose} />
            </View>
          ) : (
            <>
              <View style={s.stageTop} />
              <View style={s.promptBox}>
                <Prompt key={round.id} round={round} phase={phase} picked={picked} onReplay={speakRound} />
              </View>
              <Text style={[s.note, { color: p.textSecondary, opacity: phase === 'verdict' && round.note ? 1 : 0 }]}>{round.note ?? ''}</Text>
              <View style={s.stageBottom} />
              <Text style={[s.ask, { color: p.textSecondary }]}>{phase === 'show' ? '' : round.ask}</Text>
              <View style={s.answers}>
                {phase === 'show' ? null : round.options.map((option, i) => (
                  <V2AnswerOption
                    key={`${round.id}-${i}`}
                    testID={`game-quiz-option-${i}`}
                    label={option}
                    disabled={phase !== 'answer'}
                    state={phase === 'answer' ? 'idle' : i === round.correctIndex ? 'correct' : i === picked ? 'wrong' : 'dimmed'}
                    onPress={() => { void hapticTap(); onPick(i); }}
                  />
                ))}
              </View>
            </>
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
  segs: { flexDirection: 'row', gap: 6, marginTop: 14, height: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  stageTop: { flex: 0.6 },
  stageBottom: { flex: 1 },
  promptBox: { minHeight: 200, justifyContent: 'center' },
  audio: { alignSelf: 'center', alignItems: 'center', gap: 16, paddingVertical: 24, paddingHorizontal: 28, borderRadius: 28 },
  pressed: { opacity: 0.86 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 60 },
  waveBar: { width: 4, borderRadius: 2 },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pairSlot: { width: '48%', flexGrow: 1 },
  pair: { minHeight: 92, padding: 14, justifyContent: 'center', gap: 4 },
  pairHidden: { opacity: 0.34 },
  pairLeft: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  pairRight: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  gapRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 10, rowGap: 8 },
  gapText: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
  hole: { minWidth: 96, height: 48, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cells: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  cell: { height: 60, minWidth: 84, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cellHole: { minWidth: 96 },
  cellText: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  note: { minHeight: 44, marginTop: 16, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500', paddingHorizontal: 8 },
  ask: { minHeight: 20, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  answers: { marginTop: 16, gap: 12, minHeight: 204, justifyContent: 'flex-end' },
  finish: { flex: 1, paddingTop: 48 },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  growth: { marginTop: 22 },
});

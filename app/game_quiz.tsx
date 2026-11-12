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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { newGameAttemptKey, noteGameMistake } from '../modules/games/game_mistake_capture';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import GameAnswerTile from '../components/games/GameAnswerTile';
import GameListenWave from '../components/games/GameListenWave';
import GameMemoryPairs from '../components/games/GameMemoryPairs';
import GameRise from '../components/games/GameRise';
import GameSegments from '../components/games/GameSegments';
import { V2Button, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_MOTION_EXTRA } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { inferExpoSpeechLanguage, useAudio } from '../hooks/use-audio';
import { hapticTap } from '../hooks/use-haptics';
import {
  INITIAL_QUIZ_STATE, QUIZ_SEED_DECKS, answerQuiz, isQuizKind, isValidQuizRound, nextQuizRound, shuffledQuizRound, type QuizRound,
} from '../modules/games/quiz_core';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { currentGameLesson, dailyPortion, quizDeckFor } from '../modules/games/task_source';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { safeRouterBack } from './navigation_back';

const AFTER_OK_MS = 1500;
/** Язык речи телефона для каждого курса. */
const SPEECH_LANGUAGE: Readonly<Record<string, string>> = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' };
const AFTER_MISS_MS = 2300;
const ROUNDS = 6;

const COPY = {
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
  empty: { ru: 'Для игры пока нет заданий', uk: 'Для гри поки немає завдань', es: 'Aún no hay tareas para este juego', en: 'No tasks for this game yet' },
} as const;

type Phase = 'show' | 'answer' | 'verdict' | 'done';

type PromptProps = Readonly<{ round: QuizRound; roundIndex: number; replayKey: number; phase: Phase; picked: number | null; onReplay: () => void }>;

function Prompt({ round, roundIndex, replayKey, phase, picked, onReplay }: PromptProps) {
  const p = useV2Palette();
  const prompt = round.prompt;
  const answered = phase === 'verdict';
  const ok = picked === round.correctIndex;

  if (prompt.kind === 'audio') {
    // зачем: фразу можно переслушать нажатием — проверяется слух, а не память на один показ
    return (
      <Pressable testID="game-quiz-replay" accessibilityRole="button" accessibilityLabel={round.ask} onPressIn={() => { void hapticTap(); }} onPress={onReplay} style={({ pressed }) => [s.audio, { backgroundColor: p.glass }, pressed && s.pressed]}>
        <Ionicons name="volume-high" size={36} color={p.text} />
        {/* зачем (сверка движения 11.11, п. 4): волна живая, как в макете, а не нарисованная — см. GameListenWave */}
        <GameListenWave roundIndex={roundIndex} color={p.text} replayKey={replayKey} />
      </Pressable>
    );
  }

  if (prompt.kind === 'pairs') {
    // зачем (сверка с макетом 12.11): пары не гаснут — у переводов размытие и прозрачность .5, спрошенная подсвечена
    return <GameMemoryPairs pairs={prompt.pairs} askIndex={prompt.askIndex} answering={phase === 'answer'} answered={answered} />;
  }

  if (prompt.kind === 'gap') {
    return (
      <GameRise style={s.gapRow}>
        {prompt.before ? <Text style={[s.gapText, { color: p.text }]}>{prompt.before}</Text> : null}
        <View style={[s.hole, { backgroundColor: p.track }]}>
          {/* зачем: в пропуск всегда встаёт верное слово — его и красим по исходу ответа */}
          {/* зачем (найдено на эмуляторе 11.11): «прозрачный цвет» на телефоне оставался читаемым и выдавал ответ — до ответа слово скрыто прозрачностью слоя, место под него сохраняется */}
          <Text accessible={answered} importantForAccessibility={answered ? 'auto' : 'no-hide-descendants'} style={[s.gapText, { color: ok ? p.correct : p.wrong, opacity: answered ? 1 : 0 }]}>{round.options[round.correctIndex]}</Text>
        </View>
        {prompt.after ? <Text style={[s.gapText, { color: p.text }]}>{prompt.after}</Text> : null}
      </GameRise>
    );
  }

  return (
    <View style={s.cells}>
      {prompt.known.map((form, i) => (
        <GameRise key={form} delayMs={i * 120} style={[s.cell, { backgroundColor: p.glass }]}>
          <Text style={[s.cellText, { color: p.text }]}>{form}</Text>
        </GameRise>
      ))}
      <GameRise delayMs={240} style={[s.cell, s.cellHole, { backgroundColor: p.track }]}>
        <Text accessible={answered} importantForAccessibility={answered ? 'auto' : 'no-hide-descendants'} style={[s.cellText, { color: p.correct, opacity: answered ? 1 : 0 }]}>{round.options[round.correctIndex]}</Text>
      </GameRise>
    </View>
  );
}

export default function GameQuizScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = isQuizKind(params.kind) ? params.kind : 'memory';
  const { studyTarget } = useStudyTarget();
  const attemptKey = useRef(newGameAttemptKey());
  // зачем (владелец 11.11: «фразы должны корректно подбираться»): задания — из банка по уроку, на котором сейчас человек,
  // и только для языка, который он учит; порция меняется от дня к дню и не тасуется при повторном рендере
  const deck = useMemo(() => quizDeckFor(kind, studyTarget, currentGameLesson(studyTarget)) ?? { ...QUIZ_SEED_DECKS[kind], rounds: [] }, [kind, studyTarget]);
  // зачем (прогон на телефоне 11.11): верный вариант в банке стоит по кругу — перемешиваем порядок один раз на вход
  const rounds = useMemo(() => dailyPortion(deck.rounds.filter(isValidQuizRound), ROUNDS, Math.floor(Date.now() / 86400000)).map((round) => shuffledQuizRound(round)), [deck]);

  const [game, setGame] = useState(INITIAL_QUIZ_STATE);
  const [phase, setPhase] = useState<Phase>(rounds.length > 0 ? 'show' : 'done');
  const [picked, setPicked] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock = useRef(false);

  const round = rounds[Math.min(game.index, Math.max(0, rounds.length - 1))];
  const audio = useAudio();
  const [replayKey, setReplayKey] = useState(0);
  const speakRound = useCallback(() => {
    if (!round || round.prompt.kind !== 'audio') return;
    // зачем: язык речи берётся из языка обучения, а не угадывается по тексту — немецкую фразу без умлаутов телефон
    // прочитал бы с английским произношением
    audio.speak(round.prompt.text, round.prompt.rate, { language: SPEECH_LANGUAGE[studyTarget] ?? inferExpoSpeechLanguage(round.prompt.text) });
  }, [audio, round, studyTarget]);

  // повтор фразы нажатием оживляет волну заново, как при первом звучании
  const onReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
    speakRound();
  }, [speakRound]);

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
    // зачем (D207, связь игр и ошибок): промах уходит в «Мои ошибки» там, где из него собирается упражнение
    else if (round.prompt.kind === 'audio' && round.note) noteGameMistake({ game: 'listen', studyTarget, itemId: round.id, target: round.prompt.text, meaning: round.note, given: round.options[index] ?? '', attemptKey: attemptKey.current });
    else if (round.prompt.kind === 'gap') noteGameMistake({ game: 'exact', kind: 'gap', studyTarget, itemId: round.id, gapped: `${round.prompt.before} ___ ${round.prompt.after}`, word: round.options[round.correctIndex] ?? '', distractors: round.options.filter((_, i) => i !== round.correctIndex), given: round.options[index] ?? '', attemptKey: attemptKey.current });
    timers.current.push(setTimeout(() => {
      setPicked(null);
      if (result.state.index >= rounds.length - 1) {
        setPhase('done');
        return;
      }
      setGame((prev) => nextQuizRound(prev));
      setPhase('show');
    }, result.correct ? AFTER_OK_MS : AFTER_MISS_MS));
  }, [deck.skillAction, game, kind, phase, round, rounds.length, studyTarget]);

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
  const segmentIds = useMemo(() => rounds.map((r) => r.id), [rounds]);

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

          <GameSegments ids={segmentIds} done={doneCount} track={p.track} fill={p.text} style={s.segs} />

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
                <Prompt key={round.id} round={round} roundIndex={game.index} replayKey={replayKey} phase={phase} picked={picked} onReplay={onReplay} />
              </View>
              <Text style={[s.note, { color: p.textSecondary, opacity: phase === 'verdict' && round.note ? 1 : 0 }]}>{round.note ?? ''}</Text>
              <View style={s.stageBottom} />
              <Text style={[s.ask, { color: p.textSecondary }]}>{phase === 'show' ? '' : round.ask}</Text>
              {/* зачем (сверка с макетом 12.11): два варианта стоят рядом, как `.ans.two`; три — столбиком */}
              <View style={[s.answers, round.options.length === 2 && s.answersPair]}>
                {phase === 'show' ? null : round.options.map((option, i) => (
                  <GameAnswerTile
                    key={`${round.id}-${i}`}
                    testID={`game-quiz-option-${i}`}
                    label={option}
                    index={i}
                    pair={round.options.length === 2}
                    disabled={phase !== 'answer'}
                    state={phase === 'answer' ? 'idle' : i === round.correctIndex ? 'correct' : i === picked ? 'wrong' : 'off'}
                    onPress={() => onPick(i)}
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
  segs: { marginTop: 14 },
  stageTop: { flex: 0.6 },
  stageBottom: { flex: 1 },
  promptBox: { minHeight: 200, justifyContent: 'center' },
  audio: { alignSelf: 'center', alignItems: 'center', gap: 16, paddingVertical: 24, paddingHorizontal: 28, borderRadius: 28 },
  pressed: { opacity: 0.86 },
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
  answersPair: { flexDirection: 'row', alignItems: 'flex-end', gap: GAME_MOTION_EXTRA.pairTileGap },
  finish: { flex: 1, paddingTop: 48 },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  growth: { marginTop: 22 },
});

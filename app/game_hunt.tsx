/**
 * Игра «Охота на ошибку» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `hunt()`).
 * В диалоге одно слово неверное: нажатие на него заменяет слово верным и показывает объяснение;
 * нажатие на другое слово — красный тон на 700 мс (дрожи в макете здесь нет).
 * Движение — из макета в точности: реплики поднимаются лесенкой по 140 мс; по диалогу сверху вниз идёт «сканер»
 * (2600 мс, линейно, по кругу) и останавливается, когда ошибка найдена; тон слова меняется за 260 мс; исправленное
 * слово поднимается (520 мс); объяснение проявляется за 360 мс и встаёт со сдвига 14 за 520 мс. Числа — в constants/gameMotion.ts.
 * зачем так: правила и задания — в modules/games/dialogue_core; экран только рисует и исполняет нажатия.
 * Найденная ошибка даёт «Грамматику» +2 (строка таблицы добавлена владельцем 11.11).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { Easing, cancelAnimation, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { newGameAttemptKey, noteGameMistake } from '../modules/games/game_mistake_capture';
import GameReveal from '../components/games/GameReveal';
import GameRise from '../components/games/GameRise';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_EASE, GAME_MOTION } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { isHuntHit } from '../modules/games/dialogue_core';
import { currentGameLesson, huntTasksFor } from '../modules/games/task_source';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { exitGameWithMinute } from '../components/games/gameExit';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { safeRouterBack } from './navigation_back';

const COPY = {
  pill: { ru: 'Охота на ошибку', uk: 'Полювання на помилку', es: 'Caza del error', en: 'Error hunt' },
  ask: { ru: 'В диалоге одно слово неверное. Найди его', uk: 'У діалозі одне слово неправильне. Знайди його', es: 'En el diálogo hay una palabra incorrecta. Encuéntrala', en: 'One word in the dialogue is wrong. Find it' },
  next: { ru: 'Дальше', uk: 'Далі', es: 'Siguiente', en: 'Next' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);

type WordProps = Readonly<{ text: string; tappable: boolean; fixed: boolean; missed: boolean; onPress: () => void; ink: string; good: string; bad: string; disabled: boolean }>;

const HuntWord = memo(function HuntWord({ text, tappable, fixed, missed, onPress, ink, good, bad, disabled }: WordProps) {
  const reduceMotion = useReduceMotion();
  // 0 — обычное слово, 1 — исход (промах или исправлено); цвет исхода запоминается, чтобы гаснуть своим же тоном
  const outcome = useSharedValue(0);
  const rise = useSharedValue(1);
  const tone = useRef(bad);
  if (fixed) tone.current = good;
  else if (missed) tone.current = bad;
  const tint = tone.current;

  useEffect(() => {
    outcome.value = withTiming(fixed || missed ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.tileColorMs, easing: bezier(GAME_EASE.ease) });
  }, [fixed, missed, outcome, reduceMotion]);

  useEffect(() => {
    if (!fixed || reduceMotion) return undefined;
    // макет: `again(el, 'rise')` — исправленное слово поднимается заново
    rise.value = 0;
    rise.value = withTiming(1, { duration: GAME_MOTION.riseMs, easing: bezier(GAME_EASE.out) });
    return () => cancelAnimation(rise);
  }, [fixed, reduceMotion, rise]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * GAME_MOTION.riseShift }] }));
  // `--ok-bg` / `--no-bg` макета: тон исхода на 20 % — отдельным слоем, чтобы не зависеть от записи цвета темы
  const chipStyle = useAnimatedStyle(() => ({ opacity: outcome.value * GAME_MOTION.tileTintOpacity }));
  const textStyle = useAnimatedStyle(() => ({ color: interpolateColor(outcome.value, [0, 1], [ink, tint]) }));

  if (!tappable) return <Text style={[s.word, { color: ink }]}>{text}</Text>;
  return (
    <Reanimated.View style={wrapStyle}>
      <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPressIn={() => { void hapticTap(); }} onPress={onPress}>
        <Reanimated.View style={s.tap}>
          <Reanimated.View pointerEvents="none" style={[s.tapTint, { backgroundColor: tint }, chipStyle]} />
          <Reanimated.Text style={[s.word, textStyle]}>{text}</Reanimated.Text>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
});

/**
 * Цвета «сканера» по теме — как в макете: на тёмном фоне перелив к белому (elevate-extra.css:174), на светлом —
 * к тёмно-синему (elevate-light.css:59). зачем (обход экранов 12.11, w2_game_hunt.png): белая полоса на светлом фоне
 * выглядела как резкая граница фона — «верх светлее, низ обычный»; в светлом макете полоса тёмная и почти незаметная.
 */
const SCAN_ON_DARK = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.5)'] as const;
const SCAN_ON_LIGHT = ['rgba(47,74,107,0)', 'rgba(47,74,107,0.12)', 'rgba(47,74,107,0.45)'] as const;

/** Тёмный ли цвет текста (значит, тема светлая). Неизвестный формат цвета — считаем тему светлой, как по умолчанию. */
function isDarkInk(color: string): boolean {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  if (!hex) return true;
  const [r, g, b] = [hex[1], hex[2], hex[3]].map((v) => parseInt(v, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** «Сканер» над диалогом — `.scan` макета: полоса 70 с переливом, идёт от −70 до нижнего края ленты. */
const HuntScan = memo(function HuntScan({ height, running, ink }: Readonly<{ height: number; running: boolean; ink: string }>) {
  const reduceMotion = useReduceMotion();
  const active = useRuntimeActive(running) && !reduceMotion && height > 0;
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.value = 0;
      return undefined;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: GAME_MOTION.huntScanMs, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [active, t]);
  const style = useAnimatedStyle(() => ({
    opacity: active ? interpolate(t.value, [0, GAME_MOTION.huntScanFadeIn, GAME_MOTION.huntScanFadeOut, 1], [0, 1, 1, 0]) : 0,
    transform: [{ translateY: interpolate(t.value, [0, 1], [-GAME_MOTION.huntScanHeight, height]) }],
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[s.scan, style]}>
      <LinearGradient colors={isDarkInk(ink) ? SCAN_ON_LIGHT : SCAN_ON_DARK} locations={[0, 0.8, 1]} style={StyleSheet.absoluteFill} />
    </Reanimated.View>
  );
});

export default function GameHuntScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const attemptKey = useRef(newGameAttemptKey());
  // зачем (чтение кода перед выпуском 11.11): без номера урока брался урок 32 — человек на уроке 1 получал слова,
  // которых ещё не видел; как остальные игры, «Охота» берёт задания урока, на котором человек сейчас
  const tasks = useMemo(() => huntTasksFor(studyTarget, currentGameLesson(studyTarget)), [studyTarget]);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(false);
  const [missId, setMissId] = useState('');
  // id задания, на котором была ошибка: по нему «Минута знаний» находит своё правило
  const missedTaskId = useRef<string | null>(null);
  const [chatHeight, setChatHeight] = useState(0);
  const lock = useRef(false);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (missTimer.current) clearTimeout(missTimer.current); }, []);
  const task = tasks[Math.min(index, Math.max(0, tasks.length - 1))];
  const isLast = index >= tasks.length - 1;

  const onTap = useCallback((line: number, word: number) => {
    if (lock.current || !task) return;
    if (!isHuntHit(task, line, word)) {
      // зачем (D207, связь игр и ошибок): первый промах в диалоге уходит в «Мои ошибки» — реплика с пропуском и верное слово
      if (missedTaskId.current === null) {
        const wrongLine = task.lines[task.wrong.line];
        if (wrongLine) noteGameMistake({ game: 'hunt', kind: 'gap', studyTarget, itemId: task.id, gapped: wrongLine.words.map((w, i) => (i === task.wrong.word ? '___' : w)).join(' '), word: task.fix, given: task.lines[line]?.words[word] ?? '', attemptKey: attemptKey.current });
      }
      missedTaskId.current = missedTaskId.current ?? task.id;
      setMissId(`${line}:${word}`);
      // макет: красный тон снимается через 700 мс
      if (missTimer.current) clearTimeout(missTimer.current);
      missTimer.current = setTimeout(() => setMissId(''), GAME_MOTION.huntMissHoldMs);
      return;
    }
    lock.current = true;
    if (missTimer.current) clearTimeout(missTimer.current);
    setMissId('');
    setFound(true);
    // зачем (D207, владелец 11.11): найденная ошибка — «Грамматика» +2
    noteSkillAction({ action: 'hunt_correct', itemKey: `hunt:${task.id}` });
  }, [task, studyTarget]);

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (found && isLast && tasks.length > 0) markWarmupGamePlayed('hunt', `${tasks.length}/${tasks.length}`);
  }, [found, isLast, tasks.length]);

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const onNext = useCallback(() => {
    if (isLast) {
      // «Готово» на последнем диалоге: была ошибка — сначала «Минута знаний» по тому заданию, где ошиблись
      exitGameWithMinute(router, { misses: missedTaskId.current ? 1 : 0, itemId: missedTaskId.current });
      return;
    }
    lock.current = false;
    setFound(false);
    setIndex((i) => i + 1);
  }, [isLast, router]);

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
            <View style={s.chat} onLayout={(e) => setChatHeight(e.nativeEvent.layout.height)}>
              <HuntScan height={chatHeight} running={!found} ink={p.text} />
              {task.lines.map((line, li) => (
                <GameRise key={`${task.id}-${li}`} delayMs={li * GAME_MOTION.huntStaggerMs} style={[s.bubbleRow, line.right && s.bubbleRowRight]}>
                  <V2Card seed={li} style={s.bubble}>
                    {line.words.map((word, wi) => {
                      const isWrong = isHuntHit(task, li, wi);
                      return (
                        <HuntWord
                          key={`${task.id}-${li}-${wi}`}
                          text={found && isWrong ? task.fix : word}
                          tappable={line.tappable.includes(wi)}
                          fixed={found && isWrong}
                          missed={missId === `${li}:${wi}`}
                          disabled={found}
                          ink={p.text}
                          good={p.correct}
                          bad={p.wrong}
                          onPress={() => onTap(li, wi)}
                        />
                      );
                    })}
                  </V2Card>
                </GameRise>
              ))}
            </View>
          ) : null}

          {task ? (
            <GameReveal shown={found} style={s.whyWrap}>
            <V2Card seed={2} style={s.why}>
              <View style={[s.whyIcon, { backgroundColor: p.track }]}>
                <Ionicons name="checkmark" size={20} color={p.text} />
              </View>
              <View style={s.whyCopy}>
                <Text style={[s.whyTitle, { color: p.text }]}>{`${task.lines[task.wrong.line].words[task.wrong.word]} → ${task.fix}`}</Text>
                <Text style={[s.whyBody, { color: p.textSecondary }]}>{task.why}</Text>
              </View>
            </V2Card>
            </GameReveal>
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
  scan: { position: 'absolute', top: 0, left: -GAME_MOTION.huntScanBleed, right: -GAME_MOTION.huntScanBleed, height: GAME_MOTION.huntScanHeight, zIndex: 0 },
  // зачем (сверка на телефоне 11.11: полоса резала текст реплики): в макете `.scan` стоит первым в `.chat`, а реплики
  // с подъёмом рисуются поверх неё — сканер виден только в просветах между пузырями
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4, paddingVertical: 12, paddingHorizontal: 14 },
  word: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  tap: { paddingHorizontal: 3, marginHorizontal: -3, borderRadius: 7, justifyContent: 'center' },
  tapTint: { ...StyleSheet.absoluteFillObject, borderRadius: 7 },
  whyWrap: { marginTop: 20 },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  whyIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  whyCopy: { flex: 1, gap: 2 },
  whyTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  whyBody: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
});

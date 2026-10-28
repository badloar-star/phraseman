/**
 * Активный режим 5/6 — Пары на скорость. Источник вёрстки/анимаций:
 * docs/v2/mockups/07-speed-match.html.
 *
 * зачем: форма (irregular verbs и т.п.) должна доводиться до автоматизма —
 * таймер плюс сетка карточек создают давление скорости, которого нет в
 * остальных режимах.
 *
 * Данные: modePayload несёт настоящую pairGrid и отдельно заданный порядок
 * правой колонки. Задание завершается только после сопоставления всех пар.
 *
 * ВАЖНО (Performance Bible / находка аудита): таймер — useSharedValue +
 * useFrameCallback, НЕ setInterval+setState. Обратный отсчёт целиком на
 * UI-треде; текстовое отображение секунд обновляется через scheduleOnRN с троттлом
 * раз в кадр-с-изменением-секунды, а не каждый кадр.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Explain, Lv2Option, lv2CardStyle, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { actionBoxShadow, plateBoxShadow } from "../../../components/v2/ShadowSurface";

import { useLearningV2CompactPractice, useLearningV2PracticeViewportHost } from "../../../components/learning-v2/LearningV2PracticeViewport";
import { useArenaSound } from "../../../hooks/use_arena_sound";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useLineScale, useScaledTextStyles } from "../../../hooks/useLineScale";
import type { Lang } from "../../../constants/i18n";
import { LearningV2TaskTitle } from "../../../components/learning-v2/LearningV2TaskChrome";
import { lv2TaskTokens } from "../../../components/learning-v2/learning_v2_task_theme_tokens";
import { LEARNING_V2_TASK_TITLE_ICONS, learningV2TaskTitle } from "../../../components/learning-v2/learning_v2_task_titles";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeSpeedMatchCopyV1 } from "./mode_copy_v1";
import { SPEED_MATCH_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";
import {
  createLearningV2SpeedMatchRoundStateV1,
  learningV2SpeedMatchCanPickV1,
  resolveLearningV2SpeedMatchMismatchExplanationV1,
  type LearningV2SpeedMatchMismatchExplanationV1,
} from "./speed_match_runtime_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Журнал [SPEED-MATCH-PERF] (жалоба «тормозит», 28.10): счётчики перерисовок на один тап и зазоры кадров после него. */
const PERF = "[SPEED-MATCH-PERF]";
const nowMs = (): number => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());
const speedMatchPerf = { mainRenders: 0, cardRenders: 0 };
/** Лимит раунда. Источник: 07-speed-match.html witness build использует
 * настраиваемый таймер; фиксируем разумный дефолт под один prompt вместо
 * полноценной сетки (см. комментарий "зачем" вверху файла). */
const ROUND_SECONDS = 60;

/** Таймер на UI-треде: useFrameCallback двигает shared value каждый кадр,
 * JS-состояние (для текста "N с") обновляется только когда изменилась целая
 * секунда — troттлинг вручную, чтобы не звать setState 60 раз в секунду. */
function useSpeedMatchTimerV1(
  active: boolean,
  resetToken: number,
  onExpire: () => void,
) {
  // зачем: worklet на UI-треде не может безопасно читать/писать обычный
  // useRef.current — нужны настоящие Reanimated shared values для
  // startedAt/expired, иначе значения не переживут переход JS↔UI-тред.
  const remainingMs = useSharedValue(ROUND_SECONDS * 1000);
  const startedAt = useSharedValue<number | null>(null);
  const expired = useSharedValue(false);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  useFrameCallback((frameInfo) => {
    "worklet";
    if (!active || expired.value) return;
    if (startedAt.value === null) {
      startedAt.value = frameInfo.timestamp;
    }
    const elapsed = frameInfo.timestamp - (startedAt.value ?? frameInfo.timestamp);
    const next = Math.max(0, ROUND_SECONDS * 1000 - elapsed);
    const prevSeconds = Math.ceil(remainingMs.value / 1000);
    remainingMs.value = next;
    const nextSeconds = Math.ceil(next / 1000);
    // зачем: троттлинг вручную — scheduleOnRN(setSecondsLeft) только когда целая
    // секунда реально изменилась, а не каждый кадр (иначе 60 setState/сек).
    if (nextSeconds !== prevSeconds) {
      scheduleOnRN(setSecondsLeft, nextSeconds);
    }
    if (next <= 0 && !expired.value) {
      expired.value = true;
      scheduleOnRN(onExpire);
    }
  }, active);

  useEffect(() => {
    startedAt.value = null;
    expired.value = false;
    remainingMs.value = ROUND_SECONDS * 1000;
    setSecondsLeft(ROUND_SECONDS);
  }, [resetToken, remainingMs, startedAt, expired]);

  return secondsLeft;
}

/** Читалка таймера: секунды живут ЗДЕСЬ, а не в главном компоненте — тик раз в секунду перерисовывает только значок и цифру, а не всю сетку пар. */
const SpeedMatchTimerReadoutV1 = memo(function SpeedMatchTimerReadoutV1({
  active,
  resetToken,
  onExpire,
  suffix,
  normalColor,
  lowColor,
  textStyle,
}: {
  readonly active: boolean;
  readonly resetToken: number;
  readonly onExpire: () => void;
  readonly suffix: string;
  readonly normalColor: string;
  readonly lowColor: string;
  readonly textStyle: React.ComponentProps<typeof Text>["style"];
}) {
  // зачем: колбэк истечения запоминается при создании кадрового обратного вызова — через ref он всегда свежий (собранные пары, раунд)
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const stableExpire = useCallback(() => onExpireRef.current(), []);
  const secondsLeft = useSpeedMatchTimerV1(active, resetToken, stableExpire);
  const low = secondsLeft <= 5;
  return (
    <>
      <Ionicons name="time-outline" size={16} color={low ? lowColor : normalColor} />
      <Text style={[textStyle, { color: low ? lowColor : normalColor }]}>
        {secondsLeft}{suffix}
      </Text>
    </>
  );
});

const SpeedMatchCardV1 = memo(function SpeedMatchCardV1({
  pairId,
  label,
  side,
  picked,
  verdict,
  reducedMotion,
  disabled,
  onPickPair,
}: {
  readonly pairId: string;
  readonly label: string;
  readonly side: "left" | "right";
  readonly picked: boolean;
  readonly verdict: "none" | "ok" | "bad";
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPickPair: (pairId: string) => void;
}) {
  speedMatchPerf.cardRenders += 1;
  const compact = useLearningV2CompactPractice();
  const lh = useLineScale();
  // зачем (perf 28.10): плитка — memo, поэтому onPress и массивы стилей обязаны быть стабильными, иначе Lv2Option перерисовывается зря
  const handlePress = useCallback(() => onPickPair(pairId), [onPickPair, pairId]);
  const lineHeight = lh(21);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (verdict === "ok") {
      scale.value = reducedMotion
        ? 1
        : withSequence(
            withTiming(1.06, { duration: MOTION.matchSquashMs * 0.5, easing: EASE }),
            withTiming(1, { duration: MOTION.matchSquashMs * 0.5, easing: EASE }),
          );
      // зачем (learning-v2.html `.mc.gone` .22, sm-1…3): найденная пара гаснет до тени — видно, что осталось,
      // и ясно, что плитки больше не нажимаются (раньше .62 и зелёная заливка, в макете зелёного нет).
      opacity.value = withTiming(0.22, {
        duration: reducedMotion ? 1 : MOTION.matchFadeOutMs,
        easing: EASE,
      });
    } else {
      opacity.value = withTiming(1, { duration: 160, easing: EASE });
    }
  }, [verdict, reducedMotion, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: picked ? -3 : 0 }] as const,
  }));

  const right = side === "right";
  const optionStyle = useMemo(() => [styles.card, compact && styles.cardCompact, right ? styles.cardRight : styles.cardLeft], [compact, right]);
  const optionTextStyle = useMemo(() => [styles.cardText, right ? styles.cardTextRight : styles.cardTextLeft, { lineHeight }], [right, lineHeight]);
  return (
    <Animated.View style={[styles.tileFrame, right ? styles.frameRight : styles.frameLeft, style]}>
      {/* зачем (эталон speed-match-long-pairs.html, вариант 2, владелец 21.10): слово — узкая колонка 36 %, перевод — широкая;
          длинный перевод переносится на 2–3 строки, а плитка слова в этом же ряду растягивается до той же высоты
          (ряды не разъезжаются). Слово по центру 16/700, перевод слева 16/600; плитки от 64 dp. */}
      <Lv2Option
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled || verdict === "ok"}
        onPress={handlePress}
        selected={picked}
        showMark={false}
        style={optionStyle}
        textStyle={optionTextStyle}
        verdict={verdict === "bad" ? "bad" : "idle"}
        label={label}
      />
    </Animated.View>
  );
});

export function SpeedMatchModeV1(props: LearningV2ModeCommonPropsV1) {
  const compact = useLearningV2CompactPractice();
  const g = useLv2Glass();
  const playArenaSound = useArenaSound();
  const {
    prompt,
    interfaceLocale,
    modePayload,
    reducedMotion,
    resolved,
    explanation,
    onModeNativeComplete,
    phase,
  } = props;

  if (!modePayload) {
    throw new Error("learning_v2_speed_match_payload_missing");
  }
  if (modePayload.family !== "speed_match") {
    throw new Error("learning_v2_speed_match_payload_mismatch");
  }
  const payload = modePayload;
  const copy = learningV2ModeSpeedMatchCopyV1(interfaceLocale);
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [pickedRight, setPickedRight] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [wrongPairIds, setWrongPairIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [mismatchExplanation, setMismatchExplanation] = useState<LearningV2SpeedMatchMismatchExplanationV1 | null>(null);
  const mismatchResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
    },
    [],
  );

  const clearMismatch = useCallback(() => {
    if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
    mismatchResetRef.current = null;
    setWrongPairIds((current) => (current.size === 0 ? current : new Set()));
    setMismatchExplanation(null);
  }, []);

  const showMismatch = useCallback(
    (leftPairId: string, rightPairId: string) => {
      if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
      setWrongPairIds(new Set([leftPairId, rightPairId]));
      setMismatchExplanation(resolveLearningV2SpeedMatchMismatchExplanationV1({
        interfaceLocale,
        leftPairId,
        rightPairId,
        payload,
      }));
      playArenaSound("pairMiss");
      void hapticError();
      mismatchResetRef.current = setTimeout(() => {
        mismatchResetRef.current = null;
        setWrongPairIds(new Set());
        setMismatchExplanation(null);
        setPickedLeft(null);
        setPickedRight(null);
      }, MOTION.mismatchTintMs);
    },
    [interfaceLocale, payload, playArenaSound],
  );

  // зачем: колбэк истечения таймера запоминается при создании кадрового обратного вызова — свежие собранные пары читаем через ref
  const matchedRef = useRef(matchedPairIds);
  matchedRef.current = matchedPairIds;
  const [round, setRound] = useState(() => createLearningV2SpeedMatchRoundStateV1());
  const [timerResetToken, setTimerResetToken] = useState(0);
  const canPick = learningV2SpeedMatchCanPickV1(round);
  const active = !resolved && phase !== "success" && canPick && round.timerEnabled;
  const onTimerExpire = () => {
    // зачем (баг сброса пар, журнал [V2-PAIRS]): момент истечения таймера и сколько пар к этому времени было собрано
    console.warn("[V2-PAIRS] timer: время вышло", JSON.stringify({ matched: [...matchedRef.current], total: payload.pairGrid.length })); // guard-ok: состояние пар на истечении таймера
    setRound((current) => current.expire());
  };

  // зачем (баг «Сверки» 21.10: после «Продолжить без таймера» все собранные пары сбросились в начало; правило «сперва логи»):
  // «Ещё раунд» начинает раунд заново (пары сбрасываются), а «Продолжить без таймера» ТОЛЬКО снимает таймер — найденные пары остаются.
  // Журнал [V2-PAIRS]: какая кнопка, состояние пар до и после, какие пары сохранены / сброшены.
  const restartRound = useCallback((timerEnabled: boolean, keepMatched: boolean) => {
    const before = { matched: [...matchedPairIds], pickedLeft, pickedRight, wrong: [...wrongPairIds], round: round.phase, timerEnabled: round.timerEnabled };
    console.warn("[V2-PAIRS] restart: вход", JSON.stringify({ button: keepMatched ? "without_timer" : "again", requestedTimer: timerEnabled, before })); // guard-ok: трассировка бага сброса пар
    clearMismatch();
    setPickedLeft(null);
    setPickedRight(null);
    if (keepMatched) {
      console.warn("[V2-PAIRS] restart: пары СОХРАНЕНЫ (продолжение без таймера)", JSON.stringify({ kept: before.matched.length, total: payload.pairGrid.length })); // guard-ok: ветка, решившая судьбу пар
    } else {
      console.warn("[V2-PAIRS] restart: пары СБРОШЕНЫ (новый раунд)", JSON.stringify({ dropped: before.matched.length })); // guard-ok: ветка, решившая судьбу пар
      setMatchedPairIds(new Set());
    }
    setWrongPairIds(new Set());
    setRound((current) => current.restart({ timerEnabled }));
    setTimerResetToken((value) => value + 1);
  }, [clearMismatch, matchedPairIds, payload.pairGrid.length, pickedLeft, pickedRight, round.phase, round.timerEnabled, wrongPairIds]);

  const announcedRef = useRef(false);
  useEffect(() => {
    if (phase === "success" && !announcedRef.current) {
      announcedRef.current = true;
      void hapticSuccess();
      if (reducedMotion) AccessibilityInfo.announceForAccessibility?.(prompt);
    }
    if (phase === "needs_work") void hapticError();
    if (phase !== "success") announcedRef.current = false;
  }, [phase, reducedMotion, prompt]);

  speedMatchPerf.mainRenders += 1;
  const tapRef = useRef<{ at: number; side: string; pairId: string; mainAt: number; cardAt: number } | null>(null);
  const perfTap = (side: string, pairId: string) => {
    tapRef.current = { at: nowMs(), side, pairId, mainAt: speedMatchPerf.mainRenders, cardAt: speedMatchPerf.cardRenders };
  };
  const perfTapIgnored = (side: string, pairId: string, reason: string) => {
    tapRef.current = null;
    console.log(`${PERF} tap_ignored`, JSON.stringify({ side, pairId, reason })); // guard-ok: ранний выход пишет причину
  };
  // зачем (жалоба «тормозит»): после каждого коммита, вызванного тапом, пишем мс тап→коммит, число перерисовок страницы/плиток и зазоры 8 кадров
  useEffect(() => {
    const tap = tapRef.current;
    if (!tap) return;
    tapRef.current = null;
    const commitMs = Math.round((nowMs() - tap.at) * 10) / 10;
    console.log(`${PERF} tap`, JSON.stringify({ side: tap.side, pairId: tap.pairId, commitMs, mainRenders: speedMatchPerf.mainRenders - tap.mainAt, cardRenders: speedMatchPerf.cardRenders - tap.cardAt, tiles: payload.pairGrid.length * 2, matched: matchedPairIds.size, timerEnabled: round.timerEnabled })); // guard-ok: одна строка на тап
    let last = nowMs();
    const gaps: number[] = [];
    const step = () => {
      const t = nowMs();
      gaps.push(t - last);
      last = t;
      if (gaps.length < 8) { requestAnimationFrame(step); return; }
      const max = Math.max(...gaps);
      console.log(`${PERF} frames_after_tap`, JSON.stringify({ maxGapMs: Math.round(max * 10) / 10, avgGapMs: Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10, over34: gaps.filter((g) => g > 34).length })); // guard-ok: итог замера кадров после тапа
    };
    requestAnimationFrame(step);
  });
  useEffect(() => {
    console.log(`${PERF} mount`, JSON.stringify({ tiles: payload.pairGrid.length * 2, timerEnabled: round.timerEnabled, compact })); // guard-ok: один раз на показ упражнения
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chooseLeft = (pairId: string) => {
    perfTap("left", pairId);
    if (matchedPairIds.has(pairId)) { perfTapIgnored("left", pairId, "already_matched"); return; }
    clearMismatch();
    setPickedLeft(pairId);
    if (!pickedRight) return;
    if (pickedRight === pairId) {
      const next = new Set(matchedPairIds).add(pairId);
      setMatchedPairIds(next);
      setPickedLeft(null);
      setPickedRight(null);
      playArenaSound("pairMatch");
      void hapticSuccess();
      if (next.size === payload.pairGrid.length) {
        onModeNativeComplete("all_pairs_matched");
      }
    } else {
      showMismatch(pairId, pickedRight);
    }
  };
  const chooseRight = (pairId: string) => {
    perfTap("right", pairId);
    if (matchedPairIds.has(pairId)) { perfTapIgnored("right", pairId, "already_matched"); return; }
    clearMismatch();
    setPickedRight(pairId);
    if (!pickedLeft) return;
    if (pickedLeft === pairId) {
      const next = new Set(matchedPairIds).add(pairId);
      setMatchedPairIds(next);
      setPickedLeft(null);
      setPickedRight(null);
      playArenaSound("pairMatch");
      void hapticSuccess();
      if (next.size === payload.pairGrid.length) {
        onModeNativeComplete("all_pairs_matched");
      }
    } else {
      showMismatch(pickedLeft, pairId);
    }
  };

  // зачем (perf 28.10): стабильные для memo-плиток обработчики; свежие chooseLeft/chooseRight берём через ref
  const pickRef = useRef({ left: chooseLeft, right: chooseRight });
  pickRef.current = { left: chooseLeft, right: chooseRight };
  const onPickLeft = useCallback((pairId: string) => pickRef.current.left(pairId), []);
  const onPickRight = useCallback((pairId: string) => pickRef.current.right(pairId), []);

  const sx = useScaledTextStyles(styles);
  return (
    // зачем (сверка с learning-v2.html sm, 05.10): заголовок 600, фраза 10, сетка пар 22 (gap 10), разбор 18;
    // таймер — пилюля .timer, на исходе краснеет только цифра и значок (`.timer.low` color), без красной заливки.
    <View style={sx.root}>
      {/* зачем (вердикт «Сверки» 21.10, одобренный макет speed-match-long-pairs.html / learning-v2-tasks-review.html): ОДИН заголовок —
          плитка-иконка ⇄ и жирное «Найди пары» в строке с таймером. Прежние «Найди пару быстро» и второй большой «Соедините пары» убраны;
          фраза задания (prompt) остаётся только для озвучки результата (announceForAccessibility). */}
      <LearningV2TaskTitle
        icon={LEARNING_V2_TASK_TITLE_ICONS.match_pairs}
        title={learningV2TaskTitle(interfaceLocale as Lang, "match_pairs")}
        testID="learning-v2-speed-match-title"
        // зачем (владелец 22.10, 1:1): `.timer { background: var(--ctl) }` — заливка таймера = токен controlSoft макета, а не общий opaqueControl
        trailing={round.timerEnabled ? <View style={[sx.timerPill, { backgroundColor: lv2TaskTokens(g).controlSoft }]}>
          <SpeedMatchTimerReadoutV1 active={active} resetToken={timerResetToken} onExpire={onTimerExpire} suffix={copy.secondsSuffix} normalColor={g.text} lowColor={g.bad} textStyle={sx.timerText} />
        </View> : null}
      />
      <View style={styles.titleGap} />

      <SpeedMatchGridV1>
        {payload.leftColumn.map((leftId, index) => {
          const leftPair = payload.pairGrid.find((entry) => entry.pairId === leftId);
          if (!leftPair) throw new Error(`learning_v2_speed_match_pair_missing:${leftId}`);
          const rightId = payload.rightColumn[index];
          const rightPair = rightId === undefined ? undefined : payload.pairGrid.find((entry) => entry.pairId === rightId);
          if (rightId !== undefined && !rightPair) throw new Error(`learning_v2_speed_match_pair_missing:${rightId}`);
          if (!rightPair) {
            // зачем (логи первым делом): колонки разной длины — ряд без перевода, а не немой пропуск
            // guard-ok: редкий сбой данных, причина обязана попасть в лог
            console.warn("[SPEED-MATCH] row without right tile", JSON.stringify({ index, leftId, left: payload.leftColumn.length, right: payload.rightColumn.length }));
          }
          const disabled = resolved || phase === "processing" || !canPick;
          const verdictOf = (pairId: string) => (matchedPairIds.has(pairId) ? "ok" : wrongPairIds.has(pairId) ? "bad" : "none");
          return (
            // зачем (эталон speed-match-long-pairs.html, вариант 2): одна строка = слово слева + перевод справа;
            // строка сама выравнивает высоту обеих плиток, поэтому длинный перевод не разводит колонки.
            <View key={`row-${leftPair.pairId}`} style={[styles.row, compact && { gap: 6 }]}>
              <SpeedMatchCardV1
                pairId={leftPair.pairId}
                label={leftPair.target}
                side="left"
                picked={pickedLeft === leftPair.pairId}
                verdict={verdictOf(leftPair.pairId)}
                reducedMotion={reducedMotion}
                disabled={disabled}
                onPickPair={onPickLeft}
              />
              {rightPair ? (
                <SpeedMatchCardV1
                  pairId={rightPair.pairId}
                  label={rightPair.meaningByLocale[interfaceLocale]}
                  side="right"
                  picked={pickedRight === rightPair.pairId}
                  verdict={verdictOf(rightPair.pairId)}
                  reducedMotion={reducedMotion}
                  disabled={disabled}
                  onPickPair={onPickRight}
                />
              ) : null}
            </View>
          );
        })}
      </SpeedMatchGridV1>

      {mismatchExplanation ? (
        <View accessibilityLiveRegion="polite" style={sx.explainWrap}>
          <Lv2Explain>{`${mismatchExplanation.selectedTarget} + «${mismatchExplanation.selectedMeaning}»: ${mismatchExplanation.selectedTargetExplanation} ${mismatchExplanation.meaningOwnerExplanation}`}</Lv2Explain>
        </View>
      ) : null}

      {round.phase === "finish_timeout" && !resolved && (
        // зачем (learning-v2.html, sm «Время вышло»): карточка `.expl` в колонку — значок часов
        // и «Время вышло», под ней «Ещё раунд» (контур) и «Продолжить без таймера» (залитая).
        <View accessibilityLiveRegion="polite" style={[sx.timeoutCard, lv2CardStyle(g)]}>
          <View style={sx.timeoutHead}>
            <Ionicons name="time-outline" size={20} color={g.secondary} />
            <Text style={[sx.feedbackText, { color: g.text }]}>{copy.timeout}</Text>
          </View>
          <View style={sx.timeoutActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(true, false)}
              style={({ pressed }) => [
                sx.timeoutButton,
                { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g), opacity: pressed ? 0.72 : 1 }, // «Тень» 12.10: контурная кнопка стала плашкой с тенью
              ]}
            >
              <Text style={[sx.timeoutButtonText, { color: g.text }]}>
                {copy.again}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(false, true)}
              style={({ pressed }) => [
                sx.timeoutButton,
                { backgroundColor: g.accent, boxShadow: actionBoxShadow(g), opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[sx.timeoutButtonText, { color: g.accentInk }]}>
                {copy.withoutTimer}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {explanation ? <View style={sx.explainWrap}><Lv2Explain>{explanation}</Lv2Explain></View> : null}
    </View>
  );
}

export default SpeedMatchModeV1;

function SpeedMatchGridV1({ children }: { children: React.ReactNode }): React.JSX.Element {
  const insidePractice = useLearningV2PracticeViewportHost();
  return insidePractice ? <View style={styles.grid}>{children}</View> : (
    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // макет `<div style="height:18px">` между строкой названия и полем пар
  titleGap: { height: 18 },
  timerPill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerText: { fontSize: 16, lineHeight: 21, fontWeight: "700", fontVariant: ["tabular-nums"] },
  gridScroll: { flexGrow: 0, maxHeight: 470 },
  // эталон speed-match-long-pairs.html (вариант 2): строки одна под другой, в строке слово 36 % + перевод на остаток, gap 10.
  grid: { flexDirection: "column", gap: 10, paddingBottom: 4 },
  row: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  tileFrame: { width: "100%" },
  frameLeft: { width: "36%" },
  frameRight: { flex: 1, minWidth: 0 },
  card: {
    width: "100%",
    flexGrow: 1,
    minHeight: 64,
    maxWidth: "100%",
  },
  cardCompact: { minHeight: 56 },
  // слово — по центру с полями 12; перевод — слева с полями 14, плитки в строке одной высоты
  cardLeft: { paddingHorizontal: 12 },
  cardRight: { alignItems: "flex-start", paddingHorizontal: 14 },
  cardText: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  cardTextLeft: { fontWeight: "700" },
  cardTextRight: { textAlign: "left" },
  // `.expl` margin-top 18, padding 14/16, в колонку через 14.
  timeoutCard: { paddingVertical: 14, paddingHorizontal: 16, gap: 14, marginTop: 18 },
  explainWrap: { marginTop: 18 },
  timeoutHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  feedbackText: { flex: 1, fontSize: 16, fontWeight: "700", lineHeight: 22 },
  timeoutActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeoutButton: {
    flex: 1,
    minWidth: 130,
    // `.cta.sm`: 42, r21, 16/600.
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timeoutButtonText: { fontSize: 16, lineHeight: 21, fontWeight: "600", textAlign: "center" },
});

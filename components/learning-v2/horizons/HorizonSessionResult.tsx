import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { learningV2CheckpointCopy } from "../../../app/learning_v2_checkpoint_copy";
import { learningV2SessionUnlocksNextV1 } from "../../../app/learning_v2_session_unlock_policy_v1";
import { useStableSafeAreaInsets } from "../../../app/stable_safe_area_metrics";
import { type Lang } from "../../../constants/i18n";
import { runeAmount, runeWord } from "../../../constants/runes";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import FeedbackRatingCard from "../../FeedbackRatingCard";
import RuneBalanceChip from "../../RuneBalanceChip";
import { useLv2Glass } from "../LearningV2Glass";
import HorizonMistakeReview, {
  HORIZON_MISTAKE_REVIEW_LIMIT,
  type HorizonMistakeReviewItem,
} from "./HorizonMistakeReview";
import HorizonResultGlass, { type HorizonResultSkillRow } from "./HorizonResultGlass";
import { horizonResultGlassCopy } from "./horizon_result_glass_copy";

export type HorizonResultFacts = Readonly<{
  runes: number;
  /** Total completed activities confirmed for this run. */
  total: number;
  firstTry: number;
  elapsedMs: number;
  credit?: "credited" | "existing" | "practice";
}>;

/** Строка «Что вы теперь умеете»: тип задания и закрепилось ли оно с первой попытки. */
export type HorizonResultSkill = Readonly<{
  id: string;
  label: string;
  confirmed: boolean;
}>;

/** Всего занятий в уроке Learning V2 (сквозная нумерация 1..56). */
const SESSIONS_PER_LESSON = 56;

type Props = Readonly<{
  lesson: number;
  sessionOrdinal?: number;
  sessionId?: string;
  kind: "session" | "chapter" | "lesson" | "final";
  stars: 0 | 1 | 2 | 3;
  facts: HorizonResultFacts;
  lang: Lang;
  reducedMotion: boolean;
  rewardsSettled: boolean;
  preview?: boolean;
  nextLessonAvailable?: boolean;
  onContinue: () => void;
  /**
   * Промахи занятия для разбора (аудит 2026-09-21). Максимум три — больше
   * это уже лента стыда. Пусто/не передано → блок не рисуется вовсе:
   * пустой заголовок «ошибок нет» был бы шумом.
   */
  mistakes?: readonly HorizonMistakeReviewItem[];
  /** Сколько промахов было всего — счётчик в шапке разбора. */
  mistakesTotal?: number;
  onOpenMistake?: (id: string) => void;
  /** «Повторить ошибки» — открыть «Мои ошибки». Не передан — кнопки нет. */
  onOpenAllMistakes?: () => void;
  /** Проверка главы: «Что вы теперь умеете» (без «провалено» by design). */
  skills?: readonly HorizonResultSkill[];
}>;

export default function HorizonSessionResult({
  lesson,
  sessionOrdinal = 1,
  sessionId,
  kind,
  stars,
  facts,
  lang,
  reducedMotion,
  rewardsSettled,
  preview = false,
  nextLessonAvailable = true,
  onContinue,
  mistakes,
  mistakesTotal,
  onOpenMistake,
  onOpenAllMistakes,
  skills,
}: Props) {
  // зачем (владелец 2026-09-30, learning-v2.html → «Итог занятия»): единый экран завершения
  // 1 в 1 по макету Liquid Glass. Анимированное ядро — HorizonResultGlass (LG-вариант);
  // общий ResultsSequence остаётся для остальных экранов приложения и здесь не используется.
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const active = useRuntimeActive();
  const c = useMemo(() => horizonResultGlassCopy(lang), [lang]);
  const checkpoint = useMemo(() => learningV2CheckpointCopy(lang), [lang]);
  const chapter = Math.max(1, Math.ceil(sessionOrdinal / 8));
  const total = Math.max(0, Math.round(facts.total));
  const correct = Math.min(total, Math.max(0, Math.round(facts.firstTry)));
  const wrong = total - correct;
  // Начисление показываем только подтверждённым фактом кошелька: повтор («existing»),
  // практика и предпросмотр честно дают +0 — повторного начисления нет.
  // зачем (владелец 19.10 «на экране завершения 10 с был 0»): «practice» = занятие имеет право на награду и она уже
  // проводится фоном (~10 с) — показываем заработанное сразу, как Optimistic UI; повтор и предпросмотр по-прежнему +0.
  const gain = !preview && (facts.credit === "credited" || facts.credit === "practice") ? Math.max(0, Math.round(facts.runes)) : 0; // guard-ok: только показ, баланс не меняется

  const title = kind === "final"
    ? c.courseDone
    : kind === "lesson"
      ? c.lessonDone
      : kind === "chapter"
        ? c.chapterDone
        : c.sessionDone;
  const tail = preview
    ? c.previewNoCredit
    : facts.credit === "existing"
      ? c.resultSaved
      : kind === "lesson"
        ? nextLessonAvailable ? c.nextLessonOpen : c.nextLessonWip
        : kind === "session" && learningV2SessionUnlocksNextV1(stars)
          ? c.nextOpen
          : null;
  const place = kind === "chapter"
    ? c.chapterCheck(chapter)
    : kind === "session"
      ? facts.credit === "existing" ? c.sessionShort(sessionOrdinal) : c.sessionOf(sessionOrdinal, SESSIONS_PER_LESSON)
      : null;
  const subtitle = [c.lessonLabel(lesson), place, tail].filter(Boolean).join(" · ");
  const ctaLabel = kind === "lesson"
    ? nextLessonAvailable ? c.toLesson(lesson + 1) : c.toMap
    : c.continue;

  const skillRows = useMemo<readonly HorizonResultSkillRow[] | undefined>(() => {
    if (kind !== "chapter" || !skills || skills.length === 0) return undefined;
    return skills.map((s) => ({ id: s.id, label: s.label, state: s.confirmed ? "ok" : "review" }));
  }, [kind, skills]);

  const feedbackEntityId = sessionId?.trim() || `learning-v2:${lesson}:${sessionOrdinal}`;
  const visibleMistakes = mistakes?.slice(0, HORIZON_MISTAKE_REVIEW_LIMIT) ?? [];

  return (
    <View
      testID="learning-v2-horizon-result"
      style={[styles.root, { backgroundColor: g.bg, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable
          testID="learning-v2-completion-close"
          accessibilityRole="button"
          accessibilityLabel={c.close}
          hitSlop={8}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: g.buttonFill, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="close" size={20} color={g.text} />
        </Pressable>
        <RuneBalanceChip
          testID="learning-v2-completion-header-runes"
          color={g.text}
          size={22}
          active={active}
        />
      </View>

      <HorizonResultGlass
        title={title}
        subtitle={subtitle}
        stars={stars}
        correct={correct}
        wrong={wrong}
        labels={{ correct: c.correct, wrong: c.wrong, accuracy: c.accuracy }}
        gain={gain}
        gainWord={runeWord(lang, gain)}
        gainA11yLabel={`+${runeAmount(lang, gain)}`}
        rewardsSettled={rewardsSettled || preview}
        reducedMotion={reducedMotion}
        skills={skillRows}
        skillsTitle={checkpoint.outcomeTitle}
        skillOkLabel={checkpoint.confirmed}
        skillReviewLabel={checkpoint.review}
        mistakesSlot={visibleMistakes.length > 0 ? (
          <HorizonMistakeReview
            items={visibleMistakes}
            totalCount={mistakesTotal ?? mistakes?.length ?? visibleMistakes.length}
            lang={lang}
            onOpenItem={onOpenMistake}
            onOpenAll={onOpenAllMistakes}
          />
        ) : undefined}
        feedbackSlot={!preview ? (
          <FeedbackRatingCard
            kind="learning_v2"
            entityId={feedbackEntityId}
            entityLabel={`Learning V2 · ${lesson}.${sessionOrdinal}`}
            lang={lang}
            title={c.feedbackTitle}
            placeholder={c.feedbackPlaceholder}
            sendLabel={c.feedbackSend}
            thanksLabel={c.feedbackThanks}
            ratingA11yLabel={c.feedbackRating}
            testID="learning-v2-completion-feedback"
            presentation="liquid-glass-rate"
          />
        ) : undefined}
        ctaLabel={ctaLabel}
        ctaTestID="horizons-result-continue"
        ctaEnabled={rewardsSettled || preview}
        onContinue={onContinue}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

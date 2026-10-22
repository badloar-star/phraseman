/**
 * HorizonResultGlass — анимированное ядро итога занятия Learning V2 в стиле Liquid Glass.
 *
 * зачем (владелец 2026-09-30, learning-v2.html → блок «Итог занятия», practice.html D64.1):
 * итог переносится 1 в 1 по макету — заголовок, три звезды, карточка «верно · ошибок ·
 * точность», начисление монет (монета пружинит, счёт растёт), «Что вы теперь умеете» на
 * проверке главы, ошибки, «Всё было понятно?», «Продолжить». Общий для приложения
 * ResultsSequence НЕ трогаем: у него ещё несколько экранов (урок, DevHub), и перерисовка
 * ядра под стекло сломала бы их. Это отдельный LG-вариант только для Learning V2.
 *
 * Движение — на UI-треде (reanimated), меняются только opacity/transform: первый кадр уже
 * имеет финальную геометрию, ничего не прыгает. reducedMotion → всё сразу в финале.
 * Празднование не durable: всё живёт в памяти экрана, награда начисляется плеером заранее,
 * здесь только показ факта (credit === "credited"). На повторе показывается +0.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React, { memo, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AnimatedCountUpText } from "../../AnimatedCountUpText";
import { HOME_RUNE_ICON_SOURCE } from "../../home/homeRuneAsset";
import { Lv2Cta, lv2CardStyle, useLv2Glass, type Lv2Glass } from "../LearningV2Glass";
import { useScaledTextStyles } from '../../../hooks/useLineScale';

export type HorizonResultSkillRow = Readonly<{
  id: string;
  label: string;
  /** ok — «Закрепилось», review — «Стоит повторить». «Провалено» не бывает by design. */
  state: "ok" | "review";
}>;

type Props = Readonly<{
  title: string;
  subtitle: string;
  stars: 0 | 1 | 2 | 3;
  correct: number;
  wrong: number;
  labels: Readonly<{ correct: string; wrong: string; accuracy: string }>;
  /** Монеты, реально начисленные этим прохождением. 0 — повтор/практика. */
  gain: number;
  gainWord: string;
  gainA11yLabel: string;
  rewardsSettled: boolean;
  reducedMotion: boolean;
  skills?: readonly HorizonResultSkillRow[];
  skillsTitle?: string;
  skillOkLabel?: string;
  skillReviewLabel?: string;
  /** «Серия вдвоём» (идея 1, макет friends-full.html «Финал занятия»): карточки серии с друзьями — под итогом, до разбора ошибок. */
  friendsSlot?: React.ReactNode;
  mistakesSlot?: React.ReactNode;
  feedbackSlot?: React.ReactNode;
  ctaLabel: string;
  ctaTestID?: string;
  /** Пока локальный барьер наград не опубликовал итог, CTA глухая (как у прежнего ядра). */
  ctaEnabled: boolean;
  onContinue: () => void;
  bottomInset: number;
}>;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const STAR_SIZE = 46;

/** Звезда: погасшая подложка + белая звезда поверх, которая «впрыгивает» (макет star3). */
const ResultStar = memo(function ResultStar({
  filled, index, reducedMotion, g,
}: Readonly<{ filled: boolean; index: number; reducedMotion: boolean; g: Lv2Glass }>) {
  const shown = !filled || reducedMotion;
  const scale = useSharedValue(shown ? 1 : 0.5);
  const opacity = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    if (!filled || reducedMotion) return;
    const delay = 180 + index * 140;
    opacity.value = withDelay(delay, withTiming(1, { duration: 160 }));
    scale.value = withDelay(delay, withSequence(
      withTiming(1.18, { duration: 220, easing: EASE_OUT }),
      withTiming(1, { duration: 200, easing: EASE_OUT }),
    ));
  }, [filled, index, opacity, reducedMotion, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.starSlot}>
      <Ionicons name="star" size={STAR_SIZE} color={g.opaqueControl} />
      {filled ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.starCenter, style]}>
          <Ionicons name="star" size={STAR_SIZE} color={g.text} />
        </Animated.View>
      ) : null}
    </View>
  );
});

/** Начисление: монета пружинит (.5/−30° → 1.18/6° → 1), число растёт 0 → gain. */
const ResultAward = memo(function ResultAward({
  gain, word, a11yLabel, settled, reducedMotion, g,
}: Readonly<{ gain: number; word: string; a11yLabel: string; settled: boolean; reducedMotion: boolean; g: Lv2Glass }>) {
  const sx = useScaledTextStyles(styles);
  const visibleGain = settled ? Math.max(0, Math.round(gain)) : 0;
  const pop = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      pop.value = 1;
      return;
    }
    if (!settled) return;
    pop.value = 0;
    pop.value = withDelay(200, withSequence(
      withTiming(0.55, { duration: 400, easing: EASE_OUT }),
      withTiming(1, { duration: 500, easing: EASE_OUT }),
    ));
  }, [pop, reducedMotion, settled, visibleGain]);
  const coinStyle = useAnimatedStyle(() => {
    // 0 → .55 → 1: scale .5 → 1.18 → 1, поворот −30° → 6° → 0°, как @keyframes pop макета.
    const p = pop.value;
    const scale = p <= 0.55 ? 0.5 + (p / 0.55) * 0.68 : 1.18 - ((p - 0.55) / 0.45) * 0.18;
    const rotate = p <= 0.55 ? -30 + (p / 0.55) * 36 : 6 - ((p - 0.55) / 0.45) * 6;
    return {
      opacity: Math.min(1, p / 0.3),
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });
  return (
    <View
      testID="horizons-rune-award"
      accessible
      accessibilityLabel={a11yLabel}
      style={sx.award}
    >
      <Animated.View style={coinStyle}>
        <Image source={HOME_RUNE_ICON_SOURCE} style={sx.coin} contentFit="contain" accessible={false} />
      </Animated.View>
      <View style={sx.awardNum} importantForAccessibility="no-hide-descendants">
        <Text style={[sx.awardValue, { color: g.text }]}>+</Text>
        <AnimatedCountUpText
          value={visibleGain}
          durationMs={900}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[sx.awardValue, sx.awardCount, { color: g.text }]}
        />
        <Text style={[sx.awardWord, { color: g.secondary }]}>{word}</Text>
      </View>
    </View>
  );
});

export default function HorizonResultGlass({
  title, subtitle, stars, correct, wrong, labels, gain, gainWord, gainA11yLabel,
  rewardsSettled, reducedMotion, skills, skillsTitle, skillOkLabel, skillReviewLabel,
  friendsSlot, mistakesSlot, feedbackSlot, ctaLabel, ctaTestID, ctaEnabled, onContinue, bottomInset,
}: Props) {
  const sx = useScaledTextStyles(styles);
  const g = useLv2Glass();
  const safeCorrect = Math.max(0, Math.round(correct));
  const safeWrong = Math.max(0, Math.round(wrong));
  const total = safeCorrect + safeWrong;
  const accuracy = total > 0 ? Math.round((safeCorrect / total) * 100) : 0;

  // Всё ниже звёзд мягко проявляется после них (6 px подъём): только opacity/transform.
  const details = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      details.value = 1;
      return;
    }
    details.value = withDelay(260, withTiming(1, { duration: 320, easing: EASE_OUT }));
  }, [details, reducedMotion]);
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: details.value,
    transform: [{ translateY: (1 - details.value) * 6 }],
  }));

  return (
    <ScrollView
      style={sx.scroll}
      contentContainerStyle={[sx.content, { paddingBottom: Math.max(16, bottomInset + 12) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={sx.head}>
        <Text accessibilityRole="header" style={[sx.title, { color: g.text }]}>{title}</Text>
        <Text style={[sx.subtitle, { color: g.secondary }]}>{subtitle}</Text>
      </View>

      <View style={sx.starsRow} accessible accessibilityLabel={`${stars}/3`}>
        {[0, 1, 2].map((i) => (
          <ResultStar key={i} index={i} filled={i < stars} reducedMotion={reducedMotion} g={g} />
        ))}
      </View>

      <Animated.View style={detailsStyle}>
        <View testID="horizons-result-stats" style={[sx.stats, lv2CardStyle(g)]}>
          <StatCell value={String(safeCorrect)} label={labels.correct} color={g.good} g={g} />
          <View style={[sx.statDivider, { backgroundColor: g.line }]} />
          <StatCell value={String(safeWrong)} label={labels.wrong} color={g.bad} g={g} />
          <View style={[sx.statDivider, { backgroundColor: g.line }]} />
          <StatCell value={`${accuracy}%`} label={labels.accuracy} color={g.text} g={g} />
        </View>

        <ResultAward
          gain={gain}
          word={gainWord}
          a11yLabel={gainA11yLabel}
          settled={rewardsSettled}
          reducedMotion={reducedMotion}
          g={g}
        />

        {skills && skills.length > 0 ? (
          <View testID="horizons-result-skills" style={[sx.skills, lv2CardStyle(g)]}>
            {skillsTitle ? <Text style={[sx.cardTitle, { color: g.text }]}>{skillsTitle}</Text> : null}
            {skills.map((row) => (
              <View key={row.id} style={[sx.skillRow, { borderTopColor: g.line }]}>
                <Ionicons
                  name={row.state === "ok" ? "checkmark-circle-outline" : "refresh-circle-outline"}
                  size={22}
                  color={row.state === "ok" ? g.good : g.secondary}
                />
                <Text style={[sx.skillLabel, { color: g.text }]}>{row.label}</Text>
                <Text style={[sx.skillTag, { color: g.secondary }]}>
                  {row.state === "ok" ? skillOkLabel : skillReviewLabel}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {friendsSlot ? <View style={sx.block}>{friendsSlot}</View> : null}
        {mistakesSlot ? <View style={sx.block}>{mistakesSlot}</View> : null}
        {feedbackSlot ? <View style={sx.block}>{feedbackSlot}</View> : null}

        <View style={sx.next}>
          <Lv2Cta
            testID={ctaTestID}
            accessibilityLabel={ctaLabel}
            disabled={!ctaEnabled}
            onPress={onContinue}
            right={<Ionicons name="arrow-forward" size={20} color={ctaEnabled ? g.ctaInk : g.mutedText} />}
          >
            {ctaLabel}
          </Lv2Cta>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function StatCell({ value, label, color, g }: Readonly<{ value: string; label: string; color: string; g: Lv2Glass }>) {
  const sx = useScaledTextStyles(styles);
  return (
    <View style={sx.statCell} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[sx.statValue, { color }]}>{value}</Text>
      <Text style={[sx.statLabel, { color: g.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  head: { alignItems: "center", marginTop: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" },
  subtitle: { fontSize: 16, lineHeight: 22, marginTop: 6, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 22 },
  starSlot: { width: STAR_SIZE, height: STAR_SIZE },
  starCenter: { alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", marginTop: 20, paddingVertical: 15 },
  statCell: { flex: 1, alignItems: "center" },
  statDivider: { width: StyleSheet.hairlineWidth },
  statValue: { fontSize: 30, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, lineHeight: 17, fontWeight: "600", marginTop: 4 },
  award: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12, minHeight: 54 },
  coin: { width: 44, height: 44 },
  awardNum: { flexDirection: "row", alignItems: "center" },
  awardValue: { fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  awardCount: { minWidth: 24, textAlign: "left" },
  awardWord: { fontSize: 16, lineHeight: 22, fontWeight: "600", marginLeft: 10 },
  skills: { marginTop: 14, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700", marginBottom: 6 },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth, // guard-ok: разделитель строк макета `.skr`, не рамка
  },
  skillLabel: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  skillTag: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
  block: { marginTop: 14 },
  next: { marginTop: 16 },
});

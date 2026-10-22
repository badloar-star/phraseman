// ═════════════════════════════════════════════════════════════════════════
// LearningV2TaskBody.tsx — общее ТЕЛО задания V2 по колонке «Предлагаем» (docs/design/v2-app/learning-v2-tasks-review.html, реестр №23).
//
// зачем (владелец 22.10 через координатора: «почему новый вид заданий внутри уроков ещё не соответствует макету?»): оболочка (шапка, HUD, подвал) и плитки ответов уже по макету,
// а тело заданий оставалось прежним — «что сделать» и «ситуация» одной серой строкой. В макете у каждого задания одно и то же начало: короткая жирная строка «что сделать» со значком,
// ситуация отдельной карточкой, то, что нужно собрать/сказать, — крупно. Здесь — эти три кирпича; режимы собирают из них свой экран, логика проверки и озвучки режимов не меняется.
// Размеры — из CSS макета (.todo, .sit, .goal, .say); кегли подписей и абзацев 13/16 (правило проекта), крупные строки — как в макете. Обводок нет: плита карточки + тень «Тень».
// Межстрочный растёт с системным шрифтом (FONTSCALE2).
// ═════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { useLv2Glass } from './LearningV2Glass';
import { lv2TaskPlateBase as lv2TaskPlateStyle, lv2TaskTokens } from './learning_v2_task_theme_tokens';
import { LearningV2TaskTitle } from './LearningV2TaskChrome';
import { learningV2TaskBodyCopy } from './learning_v2_task_body_copy';
import { splitLearningV2TaskPromptV1, type LearningV2TaskIconV1, type LearningV2TaskPromptPartsV1 } from '../../modules/learning-v2/runtime/task_prompt_parts_v1';

/** Размеры тела из CSS макета: `.sit`, `.goal`, `.say`. */
export const LV2_TASK_BODY = {
  situation: { marginTop: 14, radius: 18, padTop: 13, padH: 16, padBottom: 14, kickerIcon: 15, valueGap: 5 },
  goal: { marginTop: 18, valueSize: 30, valueLine: 36, valueSizeSmall: 22, valueLineSmall: 28 },
  say: { marginTop: 16, radius: 18, pad: 16 },
} as const;

/** Карточка «Ситуация» (`.sit`): подпись со значком и текст; заливка — карточка темы с 9 % акцента, тень плиты. */
export const LearningV2SituationCard = memo(function LearningV2SituationCard({ lang, text, testID = 'learning-v2-task-situation' }: Readonly<{ lang: Lang; text: string; testID?: string }>) {
  const g = useLv2Glass();
  const s = useScaledTextStyles(baseStyles);
  return (
    <View testID={testID} style={[s.sit, lv2TaskPlateStyle(g)]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.sitTint, { backgroundColor: lv2TaskTokens(g).accentWash9 }]} />
      <View style={s.sitKicker}>
        <Ionicons name="chatbubble-ellipses-outline" size={LV2_TASK_BODY.situation.kickerIcon} color={g.secondary} />
        <Text style={[s.sitKickerText, { color: g.secondary }]}>{learningV2TaskBodyCopy(lang, 'situation')}</Text>
      </View>
      <Text style={[s.sitValue, { color: g.text }]}>{text}</Text>
    </View>
  );
});

/** Цель по центру (`.goal`): короткая подпись и крупная строка («Скажите по-английски — Я здесь.»); справа в строке — кнопка звука, если она нужна. */
export const LearningV2GoalBlock = memo(function LearningV2GoalBlock({ kicker, value, small = false, trailing, testID = 'learning-v2-task-goal' }: Readonly<{
  kicker: string | null;
  value: string;
  /** 22/28 вместо 30/36 (у «Вставь слово» цель — одна строка под ситуацией). */
  small?: boolean;
  trailing?: React.ReactNode;
  testID?: string;
}>) {
  const g = useLv2Glass();
  const s = useScaledTextStyles(baseStyles);
  return (
    <View testID={testID} style={s.goal}>
      {kicker ? <Text style={[s.goalKicker, { color: g.secondary }]}>{kicker}</Text> : null}
      <View style={s.goalRow}>
        <Text accessibilityRole="header" style={[small ? s.goalValueSmall : s.goalValue, { color: g.text }]}>{value}</Text>
        {trailing ?? null}
      </View>
    </View>
  );
});

/** Карточка «фраза + перевод» (`.say`): фраза крупно со звуком, перевод под ней; тело карточки — плита темы с тенью. */
export const LearningV2SayCard = memo(function LearningV2SayCard({ primary, secondary, trailing, kicker = null, chips, testID = 'learning-v2-task-say' }: Readonly<{
  primary: string;
  secondary: string | null;
  trailing?: React.ReactNode;
  /** Подпись сверху («Скажи так») — у интро. */
  kicker?: string | null;
  /** Разбор по словам (`.parts`): «I — я», «here — здесь». */
  chips?: readonly Readonly<{ word: string; meaning: string }>[];
  testID?: string;
}>) {
  const g = useLv2Glass();
  const s = useScaledTextStyles(baseStyles);
  return (
    <View testID={testID} style={[s.say, lv2TaskPlateStyle(g)]}>
      {kicker ? <Text style={[s.sayKicker, { color: g.secondary }]}>{kicker}</Text> : null}
      <View style={s.sayRow}>
        <Text style={[s.sayPrimary, { color: g.text }]}>{primary}</Text>
        {trailing ?? null}
      </View>
      {secondary ? <Text style={[s.saySecondary, { color: g.secondary }]}>{secondary}</Text> : null}
      {chips && chips.length > 0 ? (
        <View style={s.chips}>
          {chips.map((chip) => (
            <View key={chip.word} style={[s.chip, { backgroundColor: g.opaqueControl }]}>
              <Text style={[s.chipWord, { color: g.text }]}>{chip.word}</Text>
              <Text style={[s.chipMeaning, { color: g.secondary }]}>{chip.meaning}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

/**
 * Кнопка задания `.tcta` (макет №23): высота 52, радиус 26, фон — цвет текста, надпись — цвет карточки 16/700, gap 8; недоступная — `--ctl` и `--sec`. Плоская, без тени и градиента.
 * Хаптик — только на управляющей кнопке (правило владельца).
 */
export const LearningV2TaskCta = memo(function LearningV2TaskCta({ children, onPress, disabled, style, testID }: Readonly<{
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const g = useLv2Glass();
  const task = lv2TaskTokens(g);
  const s = useScaledTextStyles(baseStyles);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        void hapticTap();
        onPress?.();
      }}
      style={({ pressed }) => [s.cta, { backgroundColor: disabled ? task.controlSoft : task.ctaFill, opacity: pressed ? 0.88 : 1 }, style]}
    >
      <Text style={[s.ctaText, { color: disabled ? g.secondary : task.ctaInk }]}>{children}</Text>
    </Pressable>
  );
});

/** Ключи значков макета (kit.js) → имена Ionicons. */
const TASK_ICON: Readonly<Record<LearningV2TaskIconV1, React.ComponentProps<typeof Ionicons>['name']>> = {
  ear: 'ear', headset: 'headset', puzzle: 'extension-puzzle', create: 'create', swap: 'swap-horizontal', mic: 'mic',
};

/**
 * Части строки задания по правилам Learning V2 (instruction, icon, situation, goal): подписи «что сделать» на 9 языках, ситуация — только там, где она есть в контенте (ru, uk).
 * Разбор чистый и дешёвый, но выполняется раз на смену задания (useMemo), а не на каждый кадр.
 */
export function useLearningV2TaskParts(input: Readonly<{
  family: string;
  prompt: string;
  interfaceLocale: string;
  modePayload?: unknown;
}>): LearningV2TaskPromptPartsV1 {
  const { family, prompt, interfaceLocale, modePayload } = input;
  return useMemo(
    () => splitLearningV2TaskPromptV1({ family, prompt, interfaceLocale, modePayload }),
    [family, prompt, interfaceLocale, modePayload],
  );
}

/** Начало тела (`.todo` + `.sit`): «что сделать» со значком и — если есть — карточка ситуации. */
export const LearningV2TaskLead = memo(function LearningV2TaskLead({ lang, parts, trailing }: Readonly<{
  lang: Lang;
  parts: LearningV2TaskPromptPartsV1;
  /** Справа в строке названия (таймер «Найди пары»). */
  trailing?: React.ReactNode;
}>) {
  return (
    <>
      <LearningV2TaskTitle icon={TASK_ICON[parts.icon]} title={parts.instruction} trailing={trailing} testID="learning-v2-task-title" />
      {parts.situation ? <LearningV2SituationCard lang={lang} text={parts.situation} /> : null}
    </>
  );
});

const baseStyles = StyleSheet.create({
  sit: { marginTop: LV2_TASK_BODY.situation.marginTop, borderRadius: LV2_TASK_BODY.situation.radius, paddingTop: LV2_TASK_BODY.situation.padTop, paddingHorizontal: LV2_TASK_BODY.situation.padH, paddingBottom: LV2_TASK_BODY.situation.padBottom },
  sitTint: { borderRadius: LV2_TASK_BODY.situation.radius },
  sitKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sitKickerText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  // `.sit .v` 17/24 → 16/24: D145 (владелец 01.10) — обычный текст 16/13; межстрочный как в макете
  sitValue: { marginTop: LV2_TASK_BODY.situation.valueGap, fontSize: 16, lineHeight: 24 },
  goal: { marginTop: LV2_TASK_BODY.goal.marginTop, alignItems: 'center' },
  goalKicker: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  goalValue: { flexShrink: 1, textAlign: 'center', fontSize: LV2_TASK_BODY.goal.valueSize, lineHeight: LV2_TASK_BODY.goal.valueLine, fontWeight: '800', letterSpacing: -0.4 },
  goalValueSmall: { flexShrink: 1, textAlign: 'center', fontSize: LV2_TASK_BODY.goal.valueSizeSmall, lineHeight: LV2_TASK_BODY.goal.valueLineSmall, fontWeight: '800', letterSpacing: -0.3 },
  cta: { marginTop: 22, minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  say: { marginTop: LV2_TASK_BODY.say.marginTop, borderRadius: LV2_TASK_BODY.say.radius, padding: LV2_TASK_BODY.say.pad, alignItems: 'center' },
  sayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  sayPrimary: { flexShrink: 1, textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sayKicker: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  saySecondary: { marginTop: 4, textAlign: 'center', fontSize: 16, lineHeight: 23 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'baseline', gap: 6, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  chipWord: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  chipMeaning: { fontSize: 13, lineHeight: 17 },
});

// зачем: RN-порт примитивов Kimi (source/src/primitives/): IntentButton — единственный
// способ нажатия в поверхностях (варианты primary/secondary/ghost/option из base.css
// .ibtn--*), GraphemeText — безопасная обрезка по графемам, ScriptAnnotation — база +
// надстрочная аннотация (ruby). Иконки/шрифты не выдумываем: всё из cinema-токенов.
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import TapScale from '../../TapScale';
import { C, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from './tokens';

export type IntentButtonVariant = 'primary' | 'secondary' | 'ghost' | 'option';

export interface IntentButtonProps {
  readonly surfaceId: string;
  readonly intent: string;
  readonly payload?: unknown;
  readonly onIntent: (event: { surfaceId: string; intent: string; payload?: unknown }) => void;
  readonly onPress?: () => void;
  readonly variant?: IntentButtonVariant;
  readonly disabled?: boolean;
  /** aria-pressed из Kimi — подсветка выбранного варианта. */
  readonly pressed?: boolean;
  /** data-reveal из OptionGrid: показ правильного/неправильного после проверки. */
  readonly reveal?: 'correct' | 'incorrect';
  readonly style?: StyleProp<ViewStyle>;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
  readonly children: React.ReactNode;
}

/**
 * IntentButton — .ibtn из base.css. Каждое нажатие поднимает типизированный интент
 * в журнал лаборатории (как в Kimi), плюс локальный onPress поверхности.
 */
export const IntentButton = memo(function IntentButton(props: IntentButtonProps) {
  const {
    surfaceId,
    intent,
    payload,
    onIntent,
    onPress,
    variant = 'secondary',
    disabled = false,
    pressed = false,
    reveal,
    style,
    accessibilityLabel,
    testID,
    children,
  } = props;

  const containerStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const base: ViewStyle[] = [ibtn.base];
    if (variant === 'primary') base.push(ibtn.primary);
    if (variant === 'secondary') base.push(ibtn.secondary);
    if (variant === 'ghost') base.push(ibtn.ghost);
    if (variant === 'option') base.push(ibtn.option);
    if (variant === 'option' && pressed && !reveal) base.push(ibtn.optionPressed);
    if (reveal === 'correct') base.push(ibtn.revealCorrect);
    if (reveal === 'incorrect') base.push(ibtn.revealIncorrect);
    if (disabled) base.push(ibtn.disabled);
    return [base, style];
  }, [variant, pressed, reveal, disabled, style]);

  const labelColor =
    variant === 'primary' ? C.accentOnPrimary : C.fgPrimary;

  return (
    <TapScale
      onPress={() => {
        onIntent({ surfaceId, intent, payload });
        onPress?.();
      }}
      disabled={disabled}
      withHaptic
      scaleTo={variant === 'option' ? 0.98 : 0.96}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: pressed }}
      testID={testID}
      style={containerStyle}
    >
      {typeof children === 'string' ? (
        <Text style={[ibtn.label, { color: labelColor }]}>{children}</Text>
      ) : (
        children
      )}
    </TapScale>
  );
});

// guard-ok: границы ниже — не «свои обводки», а тонкие state-границы дизайн-системы
// Kimi (.ibtn--* из base.css). План порта (правило 6) разрешает их сохранять дословно.
const ibtn = StyleSheet.create({
  base: {
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, // guard-ok
    borderColor: 'transparent', // guard-ok
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s2,
  },
  primary: {
    backgroundColor: C.accentPrimary,
    borderColor: C.accentEdge,
  },
  secondary: {
    backgroundColor: C.bgSurface,
    borderColor: C.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: C.borderDefault,
  },
  option: {
    width: '100%',
    justifyContent: 'flex-start',
    backgroundColor: C.bgSurface,
    borderColor: C.borderDefault,
    paddingVertical: SPACE.s3,
  },
  optionPressed: {
    backgroundColor: C.accentSoft,
    borderColor: C.accentEdge,
  },
  revealCorrect: {
    backgroundColor: '#182B31',
    borderColor: C.correct,
  },
  revealIncorrect: {
    backgroundColor: '#2A1B2B',
    borderColor: C.wrong,
  },
  disabled: { opacity: 0.55 },
  label: {
    fontSize: TEXT.base,
    fontWeight: WEIGHT.semibold,
  },
});

/**
 * GraphemeText — порт primitives/GraphemeText: текст без обрезки шрифтом, с лимитом
 * по графемам (эмодзи/составные символы не рвутся посередине).
 */
export const GraphemeText = memo(function GraphemeText(props: {
  readonly text: string;
  readonly maxGraphemes?: number;
  readonly style?: StyleProp<TextStyle>;
}) {
  const { text, maxGraphemes, style } = props;
  const clipped = useMemo(() => clipGraphemes(text, maxGraphemes), [text, maxGraphemes]);
  // зачем: запрет владельца — никакого adjustsFontSizeToFit; длинный текст переносится
  return <Text style={style}>{clipped}</Text>;
});

/** Обрезка по графемам, а не по code units — иначе рвутся эмодзи и диакритика. */
export function clipGraphemes(text: string, maxGraphemes?: number): string {
  if (!maxGraphemes || maxGraphemes <= 0) return text;
  const graphemes = Array.from(text);
  if (graphemes.length <= maxGraphemes) return text;
  return `${graphemes.slice(0, maxGraphemes).join('')}…`;
}

/**
 * ScriptAnnotation — порт primitives/ScriptAnnotation: аннотация (ruby) над базой.
 * Без аннотации — обычный текст, геометрия не меняется.
 */
export const ScriptAnnotation = memo(function ScriptAnnotation(props: {
  readonly base: string;
  readonly annotation?: string;
  readonly baseStyle?: StyleProp<TextStyle>;
  readonly annotationStyle?: StyleProp<TextStyle>;
}) {
  const { base, annotation, baseStyle, annotationStyle } = props;
  if (!annotation) return <Text style={baseStyle}>{base}</Text>;
  return (
    <View style={annot.wrap}>
      <Text style={[annot.rt, annotationStyle]}>{annotation}</Text>
      <Text style={baseStyle}>{base}</Text>
    </View>
  );
});

const annot = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  rt: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.medium,
    letterSpacing: 0.6,
    color: C.fgSecondary,
  },
});

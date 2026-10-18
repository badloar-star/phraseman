import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../PressableHybrid';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ThemeGlassSmoke } from '../v2/ThemeGlassSmoke';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { useLineScale } from '../../hooks/useLineScale';
import { NavIcon } from '../v2/BackGlyph';

// зачем (владелец 2026-09-29): меню урока переносится «1 в 1» по макету learn.html B1–B5
// (Liquid Glass). Раньше экран собирался из общего V2Kit с его собственной палитрой, из-за чего
// размеры (название 26/800, звёзды в рамке-пилюле, значок 52) расходились с макетом. Здесь
// презентационные части меню собраны один раз из токенов 13 тем: без своих цветов, без
// обводок (стиль «Тень», владелец 12.10: плашку отделяют градиент и тень), области нажатия ≥ 44 dp.
// Логика пунктов, доступа, энергии и маршрутов остаётся в app/lesson_menu.tsx.

export type LessonMenuGlassTokens = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_MIN_HEIGHT = 76;
const DIMMED_OPACITY = 0.55;

// зачем (эмулятор 30.09): значки строк меню — как в «Настройках»: в «Акценте/Максимуме»
// яркий цвет темы, в «Спокойно» — прежний нейтральный.
function rowIconColor(glass: LessonMenuGlassTokens): string {
  return glass.level === 'accent' || glass.level === 'max' ? glass.accentBright : glass.text;
}

// зачем («Тень» 12.10): карточка меню — плашка с тенью, без кромки и без overflow hidden (он режет тень); дымку «Максимума» клипует свой слой
function cardStyle(glass: LessonMenuGlassTokens, radius: number) {
  return {
    borderRadius: radius,
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass),
  };
}

/** Дымка «Максимума» поверх плашки: прямоугольные пятна обрезаются скруглением своего слоя, а не контейнера (иначе клип съест тень). */
function ClippedSmoke({ glass, radius }: { glass: LessonMenuGlassTokens; radius: number }) {
  if (glass.level !== 'max') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <ThemeGlassSmoke glass={glass} radius={radius} />
    </View>
  );
}

/** Круглая кнопка шапки (назад / настройки): 44+ dp, тон темы и малая тень, без кромки. */
export function LessonMenuRoundButton({
  glass,
  icon,
  size = 44,
  onPress,
  accessibilityLabel,
  testID,
}: {
  glass: LessonMenuGlassTokens;
  icon: IconName;
  size?: number;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const box = Math.max(44, size);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      withHaptic={false}
      withSound={false}
      variant="icon"
      contentStyle={{
        minWidth: 44,
        minHeight: 44,
        width: box,
        height: box,
        borderRadius: box / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
        boxShadow: nestedBoxShadow(glass),
      }}
    >
      {/* зачем (сверка learn-020 п.1–2; «Тень» 12.10): круг — плашка с градиентом и малой тенью, без кромки. */}
      <KitGlassLayer radius={box / 2} />
      <NavIcon name={icon} size={20} color={glass.text} />
    </PressableHybrid>
  );
}

/** «‹ Урок 3 · A1 … энергия ⚙»: назад, заголовок 20/700, подзаголовок 15, правый слот. */
export function LessonMenuHeader({
  glass,
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  testID,
}: {
  glass: LessonMenuGlassTokens;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
  right?: React.ReactNode;
  testID?: string;
}) {
  const lh = useLineScale();
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }}>
      <LessonMenuRoundButton
        glass={glass}
        icon="chevron-back"
        size={48}
        onPress={onBack}
        accessibilityLabel={backLabel}
        testID={testID ? `${testID}-back` : undefined}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 20, lineHeight: lh(25), fontWeight: '700' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: lh(21), marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Строка пункта меню: круглая плашка 46, заголовок 17/22, подпись 15/19, шеврон. */
export function LessonMenuRow({
  glass,
  testID,
  icon,
  title,
  subtitle,
  dimmed,
  disabled,
  onPress,
  onLongPress,
}: {
  glass: LessonMenuGlassTokens;
  testID?: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  dimmed?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const lh = useLineScale();
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      withHaptic={false}
      withSound={false}
      variant="card"
      contentStyle={{
        ...cardStyle(glass, 14),
        minHeight: ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        opacity: dimmed || disabled ? DIMMED_OPACITY : 1,
      }}
    >
      {/* зачем («Тень» 12.10): строка — плашка с градиентом 180° и тенью; цветная дымка «Максимума» (темы 2.0) ложится поверх заливки. */}
      <KitGlassLayer radius={14} />
      <ClippedSmoke glass={glass} radius={14} />
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: glass.opaqueControl,
        }}
      >
        <Ionicons name={icon} size={22} color={rowIconColor(glass)} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: glass.text, fontSize: 16, lineHeight: lh(21), fontWeight: '700' }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: lh(20), marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
    </PressableHybrid>
  );
}

/** «Небольшой совет»: плитка 55, заголовок 16/21, текст 15/20 (карточка c2 макета, радиус 22). */
export function LessonMenuTip({
  glass,
  icon,
  title,
  body,
}: {
  glass: LessonMenuGlassTokens;
  icon: IconName;
  title: string;
  body: string;
}) {
  const lh = useLineScale();
  return (
    <View
      style={{
        ...cardStyle(glass, 22),
        backgroundColor: glass.opaqueSheet,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        paddingVertical: 18,
        paddingHorizontal: 16,
      }}
    >
      <KitGlassLayer radius={22} />
      <ClippedSmoke glass={glass} radius={22} />
      <View
        style={{
          width: 55,
          height: 55,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: glass.opaqueControl,
        }}
      >
        <Ionicons name={icon} size={24} color={rowIconColor(glass)} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: glass.text, fontSize: 16, lineHeight: lh(21), fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: lh(21), marginTop: 6 }}>{body}</Text>
      </View>
    </View>
  );
}

/**
 * Сводка прогресса под названием урока. Урок с известным счётом (пройден) — три звезды по 22 и
 * «N/50»; урок в процессе — трек 7 dp и «N/50» (макет B2/B3). Без рамки-пилюли.
 */
export function LessonMenuSummary({
  glass,
  testID,
  accessibilityLabel,
  progress,
  earnedStars,
  showStars,
  unitLabel,
}: {
  glass: LessonMenuGlassTokens;
  testID?: string;
  accessibilityLabel: string;
  progress: number;
  earnedStars: number;
  showStars: boolean;
  /** learn.html B: у пройденного урока — «N / 50 фраз», у урока в процессе — «N / 50». */
  unitLabel?: string;
}) {
  const lh = useLineScale();
  const ratio = Math.max(0, Math.min(1, progress / 50));
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      {showStars ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <Ionicons
              key={index} // guard-ok: ровно три статичные звезды
              name={index < earnedStars ? 'star' : 'star-outline'}
              size={22}
              color={index < earnedStars ? glass.text : glass.mutedText}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1, height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: glass.line }}>
          <View style={{ width: `${ratio * 100}%`, minWidth: 7, height: 7, borderRadius: 4, backgroundColor: glass.accentGraphic }} />
        </View>
      )}
      <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: lh(21), fontWeight: '600', fontVariant: ['tabular-nums'] }}>{`${progress} / 50${showStars && unitLabel ? ` ${unitLabel}` : ''}`}</Text>
    </View>
  );
}

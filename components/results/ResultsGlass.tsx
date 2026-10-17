import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../PressableHybrid';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { NavIcon } from '../v2/BackGlyph';

// зачем (владелец 2026-09-30): экраны итогов и полка достижений переносятся «1 в 1» по макету
// results.html (Liquid Glass). Презентационные части собраны один раз из токенов 13 тем:
// круглая кнопка назад ≥ 44 dp, плитка 61 (radius 16) со значком, счётчик-пилюля и пустое
// состояние. Без своих цветов и без рамок (стиль «Тень» 12.10): круглая кнопка — тон темы и малая тень.
// Логика экранов (загрузка, награды, звёзды, маршруты) остаётся на месте.

export type ResultsGlassTokens = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Круглая кнопка «назад» шапки макета: 44 dp, тон темы и малая тень, без кромки. */
export function ResultsGlassBackButton({
  glass,
  onPress,
  accessibilityLabel,
  testID,
  icon = 'chevron-back',
}: {
  glass: ResultsGlassTokens;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  icon?: IconName;
}) {
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
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
        boxShadow: nestedBoxShadow(glass),
      }}
    >
      <NavIcon name={icon} size={20} color={glass.text} />
    </PressableHybrid>
  );
}

/** Плитка `.tile.t61` макета: 61×61, radius 16, значок по центру. */
export function ResultsGlassTile({
  glass,
  icon,
  size = 61,
  testID,
}: {
  glass: ResultsGlassTokens;
  icon: IconName;
  size?: number;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.44)} color={glass.text} />
    </View>
  );
}

/** Пилюля-счётчик `.cntp` макета: высота 24, radius 12, цифры табличные. */
export function ResultsGlassCountPill({
  glass,
  label,
  accessibilityLabel,
  testID,
}: {
  glass: ResultsGlassTokens;
  label: string;
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        minWidth: 33,
        height: 24,
        paddingHorizontal: 9,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
      }}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{ color: glass.text, fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Пустое состояние макета: плитка 61, заголовок 20/700, одна строка пояснения. */
export function ResultsGlassEmptyState({
  glass,
  icon,
  title,
  body,
  testID,
}: {
  glass: ResultsGlassTokens;
  icon: IconName;
  title: string;
  body: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24, gap: 10 }}>
      <ResultsGlassTile glass={glass} icon={icon} />
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={1.3}
        style={{ color: glass.text, fontSize: 20, lineHeight: 25, fontWeight: '700', textAlign: 'center', marginTop: 8 }}
      >
        {title}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center' }}
      >
        {body}
      </Text>
    </View>
  );
}

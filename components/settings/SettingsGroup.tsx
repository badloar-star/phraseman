/**
 * Telegram-style grouped settings primitives.
 *
 * iOS Telegram "Settings" look: rows merged into rounded grouped containers,
 * each row carries a white glyph inside a solid colored rounded-square tile,
 * inset hairline dividers between rows (никогда под последним), section titles
 * above each group.
 *
 * Theme-aware: card surface = `t.bgCard`, divider = `t.border`. На всех 7 темах
 * (включая compass) карточка читается поверх ScreenGradient — bgCard всегда
 * контрастирует с фоном. Шрифт — глобальный Inter (через font_family_patch),
 * здесь только размеры из `f`.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { compassShadow } from '../../constants/compassTheme';

/** Палитра плиток-иконок в духе iOS-Telegram. Белый глиф на плотной заливке. */
export const SETTINGS_TILE_COLORS = {
  blue:   '#3E7BFA',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
  purple: '#AF52DE',
  teal:   '#30B0C7',
  pink:   '#FF2D78',
  indigo: '#5856D6',
  gray:   '#8E8E93',
  yellow: '#FFB300',
} as const;

export type SettingsTileColor = keyof typeof SETTINGS_TILE_COLORS;

const TILE_SIZE = 29;

/** Боковой отступ карточек от краёв экрана (как у Telegram). */
export const SETTINGS_GROUP_MARGIN = 16;
/** Левый отступ ряда (paddingHorizontal). Иконка + текст начинаются отсюда. */
const ROW_PAD_H = 14;
/** Отступ контента после плитки. Делитель выровнен по тексту, не по иконке. */
const ROW_GAP = 12;

interface SettingsIconTileProps {
  icon: keyof typeof Ionicons.glyphMap | string;
  color: SettingsTileColor;
  size?: number;
}

/** Белая глиф-иконка в плотном цветном скруглённом квадрате. */
export function SettingsIconTile({ icon, color, size = TILE_SIZE }: SettingsIconTileProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: SETTINGS_TILE_COLORS[color],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon as any} size={Math.round(size * 0.62)} color="#FFFFFF" />
    </View>
  );
}

interface SettingsSectionTitleProps {
  title: string;
  /** Прижать заголовок к карточке снизу — обычный TG-отступ. */
  style?: TextStyle;
}

/** Мелкий приглушённый заголовок секции над карточкой. */
export function SettingsSectionTitle({ title, style }: SettingsSectionTitleProps) {
  const { f, theme: t } = useTheme();
  return (
    <Text
      style={[
        {
          color: t.textMuted,
          fontSize: f.label,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: SETTINGS_GROUP_MARGIN + ROW_PAD_H,
          paddingTop: 22,
          paddingBottom: 8,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}

interface SettingsGroupProps {
  children: React.ReactNode;
  /** Доп. верхний отступ карточки (по умолчанию 0 — заголовок секции уже даёт паддинг). */
  marginTop?: number;
  marginBottom?: number;
  style?: ViewStyle;
}

/**
 * Скруглённый контейнер-группа. Рядам внутри сам прорисовывает inset-делители
 * (между рядами, не под последним) и скругляет внешние углы через overflow.
 */
export function SettingsGroup({ children, marginTop, marginBottom, style }: SettingsGroupProps) {
  const { theme: t, themeMode } = useTheme();
  const isCompass = themeMode === 'compass';
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          marginHorizontal: SETTINGS_GROUP_MARGIN,
          marginTop: marginTop ?? 0,
          marginBottom: marginBottom ?? 0,
          borderRadius: 12,
          backgroundColor: t.bgCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: t.border,
          overflow: 'hidden',
        },
        isCompass ? compassShadow(1) : null,
        style,
      ]}
    >
      {items.map((child, i) => (
        <View key={(child as any)?.key ?? i}>
          {i > 0 ? (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: t.border,
                marginLeft: ROW_PAD_H + TILE_SIZE + ROW_GAP,
              }}
            />
          ) : null}
          {child}
        </View>
      ))}
    </View>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap | string;
  color: SettingsTileColor;
  label: string;
  sub?: string;
  onPress?: () => void;
  /** Правый аксессуар: по умолчанию шеврон. Передай switch / value-текст / null. */
  right?: React.ReactNode;
  /** Скрыть стандартный шеврон, если right не задан (для рядов-переключателей). */
  hideChevron?: boolean;
  danger?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/** Один ряд внутри SettingsGroup: цветная плитка + текст + аксессуар. */
export function SettingsRow({
  icon,
  color,
  label,
  sub,
  onPress,
  right,
  hideChevron,
  danger,
  testID,
  accessibilityLabel,
}: SettingsRowProps) {
  const { theme: t, f } = useTheme();
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? (testID ? `qa-${testID}` : undefined)}
      accessible={!!(testID || accessibilityLabel)}
      {...(onPress
        ? { onPress, activeOpacity: 0.6, accessibilityRole: 'button' as const }
        : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: ROW_PAD_H,
        paddingVertical: 11,
        minHeight: 52,
      }}
    >
      <SettingsIconTile icon={icon} color={danger ? 'red' : color} />
      <View style={{ flex: 1, marginLeft: ROW_GAP, marginRight: 8 }}>
        <Text
          style={{ color: danger ? t.wrong : t.textPrimary, fontSize: f.bodyLg }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right !== undefined
        ? right
        : hideChevron
          ? null
          : <Ionicons name="chevron-forward" size={17} color={t.textGhost} />}
    </Container>
  );
}

interface SettingsCustomRowProps {
  children: React.ReactNode;
  /** Если у кастомного ряда есть своя плитка-иконка слева — выравниваем как обычный ряд. */
  style?: ViewStyle;
}

/**
 * «Сырой» ряд для нестандартного контента (селектор размера шрифта, ряд с переключателем
 * и собственной разметкой). Даёт те же горизонтальные паддинги, что и SettingsRow,
 * но не навязывает структуру плитка+текст.
 */
export function SettingsCustomRow({ children, style }: SettingsCustomRowProps) {
  return (
    <View style={[{ paddingHorizontal: ROW_PAD_H, paddingVertical: 11 }, style]}>
      {children}
    </View>
  );
}

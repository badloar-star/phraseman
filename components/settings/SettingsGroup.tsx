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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { compassShadow } from '../../constants/compassTheme';

/**
 * Палитра плиток-иконок.
 *
 * Намеренно НЕ системные цвета Apple/iOS: каждый оттенок сдвинут от
 * соответствующего systemColor (#34C759, #FF3B30, #FF9500, #AF52DE …),
 * чтобы экран не читался как точная копия iOS/Telegram-настроек. Сохранены
 * 10 различимых «ролей»-хюэ (рядам нужна разноцветность для скан-абилити),
 * но тон уведён в более тёплую/глубокую гамму приложения.
 *
 * Каждый цвет — пара [верх, низ] для лёгкого вертикального градиента плитки
 * (светлее сверху → насыщеннее снизу), вместо плоской iOS-заливки.
 */
export const SETTINGS_TILE_COLORS = {
  blue:   ['#4C8DF6', '#2D63D8'] as const, // прохладно-индиговый, не systemBlue
  green:  ['#3FB984', '#2C9466'] as const, // лесной/изумрудный, не systemGreen
  orange: ['#F6A53A', '#E07C1E'] as const, // янтарный, не systemOrange
  red:    ['#F06868', '#D24545'] as const, // тёпло-коралловый, не systemRed
  purple: ['#9B7BE8', '#7B5BD6'] as const, // лавандовый, не systemPurple
  teal:   ['#3FB6C2', '#2C90A0'] as const, // приглушённый бирюзовый
  pink:   ['#F26F9C', '#D8487F'] as const, // розово-маджента, не systemPink
  indigo: ['#6F73DE', '#4F53C6'] as const, // сине-фиолетовый
  gray:   ['#9AA0A8', '#727880'] as const, // тёплый графит
  yellow: ['#F6C23A', '#E0A21E'] as const, // золотисто-жёлтый
} as const satisfies Record<string, readonly [string, string]>;

export type SettingsTileColor = keyof typeof SETTINGS_TILE_COLORS;

/**
 * Глифы плиток. Намеренно сдвинуты с дефолтных «filled» Ionicons, которые
 * 1-в-1 совпадают с пиктограммами iOS-настроек: используем circle/outline/
 * альтернативные варианты, чтобы и сами иконки отличались от системных.
 * Ключ — имя, которое передают экраны (исторически = старый filled-глиф),
 * значение — фактически отрисовываемый глиф.
 */
const TILE_GLYPH_ALIAS: Record<string, keyof typeof Ionicons.glyphMap> = {
  person:          'person-circle',       // профиль → кружок-аватар
  key:             'keypad',              // аккаунт → клавиатура-код
  language:        'globe-outline',       // язык → глобус (контур)
  'color-palette': 'color-wand',          // темы → «волшебная палочка»
  text:            'text-outline',        // размер шрифта → контурный glyph
  'phone-portrait':'pulse',               // тактильный отклик → пульс-волна
  school:          'library-outline',     // обучение → библиотека (контур)
  notifications:   'alarm',               // напоминания → будильник
  mail:            'paper-plane-outline', // поддержка → бумажный самолётик
  people:          'people-circle',       // тестеры → кружок-группа
  construct:       'build-outline',       // админ → гаечный ключ (контур)
};

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

/**
 * Белый глиф в скруглённой плитке с лёгким вертикальным градиентом, тонким
 * верхним бликом и hairline-рамкой. Намеренно отличается от плоской
 * iOS-плитки: чуть круглее (0.32 против ~0.22 у Apple) + объём.
 */
export function SettingsIconTile({ icon, color, size = TILE_SIZE }: SettingsIconTileProps) {
  const [top, bottom] = SETTINGS_TILE_COLORS[color];
  const radius = size * 0.32;
  const glyph = TILE_GLYPH_ALIAS[icon as string] ?? (icon as keyof typeof Ionicons.glyphMap);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <LinearGradient
        colors={[top, bottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Верхний внутренний блик — отделяет плитку от плоского iOS-вида. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={glyph as any} size={Math.round(size * 0.6)} color="#FFFFFF" />
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

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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import { compassShadow } from '../../constants/compassTheme';

/**
 * Палитра плиток-иконок.
 *
 * зачем: владелец попросил «нивелированные» цвета в настройках (референс Bevel) —
 * раздел не должен быть ядовитым. Прежняя гамма была близка к неону; здесь те же
 * 10 различимых «ролей»-хюэ (рядам нужна разноцветность для скан-абилити), но
 * сатурация и яркость осознанно снижены: спокойные, припылённые тона, которые
 * не спорят ни с одной темой приложения.
 *
 * Каждый цвет — пара [верх, низ] для едва заметного вертикального градиента
 * плитки (светлее сверху → глубже снизу), вместо плоской iOS-заливки.
 */
export const SETTINGS_TILE_COLORS = {
  blue:   ['#5E8FD0', '#43689F'] as const, // припылённый синий
  green:  ['#5FA981', '#41815F'] as const, // шалфейный зелёный
  orange: ['#D99A57', '#B57634'] as const, // мягкий янтарь
  red:    ['#CF7A6E', '#A85A50'] as const, // глиняный коралл
  purple: ['#9A87CB', '#75629F'] as const, // пыльная лаванда
  teal:   ['#5FA8AF', '#42828A'] as const, // морской туман
  pink:   ['#C77E9B', '#9E5C79'] as const, // увядшая роза
  indigo: ['#7B82C4', '#5A6099'] as const, // сумеречный индиго
  gray:   ['#8E959E', '#6B727B'] as const, // тёплый графит
  yellow: ['#CBA65A', '#A88238'] as const, // приглушённое золото
} as const satisfies Record<string, readonly [string, string]>;

export type SettingsTileColor = keyof typeof SETTINGS_TILE_COLORS;

/** Цвет плитки для danger-рядов. Типизирован, чтобы переименование ключа в палитре
 *  ловилось компилятором, а не падало в рантайме на `SETTINGS_TILE_COLORS[undefined]`. */
const DANGER_TILE_COLOR: SettingsTileColor = 'red';

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

const TILE_SIZE = 30;

/** Боковой отступ карточек от краёв экрана (как у Telegram). */
export const SETTINGS_GROUP_MARGIN = 16;
/** зачем: владелец попросил «такую же чистоту, как в референсе» — карточки
 *  скруглены крупнее (16 вместо 12), ряды выше и дышат свободнее. */
export const SETTINGS_GROUP_RADIUS = 16;
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
/** Моно-плитки для строгой темы «Бизнес»: один нейтральный серый градиент
 *  вместо цветной палитры — иконки настроек становятся чёрно-серо-белыми. */
const SETTINGS_TILE_MONO: readonly [string, string] = ['#2C2C2C', '#1C1C1C'];

export function SettingsIconTile({ icon, color, size = TILE_SIZE }: SettingsIconTileProps) {
  const { themeMode, theme, isFlat } = useTheme();
  const [top, bottom] = themeMode === 'business' || themeMode === 'businessLight'
    ? SETTINGS_TILE_MONO
    : SETTINGS_TILE_COLORS[color];
  const radius = size * 0.32;
  const glyph = TILE_GLYPH_ALIAS[icon as string] ?? (icon as keyof typeof Ionicons.glyphMap);
  // Плоский IG-режим: без плитки вовсе — тонкая outline-иконка в цвет текста.
  if (isFlat) {
    const outline = `${String(glyph)}-outline` as keyof typeof Ionicons.glyphMap;
    const flatGlyph = outline in Ionicons.glyphMap ? outline : glyph;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={flatGlyph as any} size={Math.round(size * 0.78)} color={theme.textPrimary} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[top, bottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* зачем: чистый вид по референсу — блик почти невидим (0.10 вместо 0.28),
          плитка читается спокойной заливкой, а не «глянцевой конфетой». */}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
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

/** Приглушённый заголовок секции над карточкой.
 *  зачем: по референсу владельца («General» в Bevel) — обычный регистр вместо
 *  капса с разрядкой: спокойнее и чище, капс-лейблы читались как крик. */
export function SettingsSectionTitle({ title, style }: SettingsSectionTitleProps) {
  const { f, theme: t } = useTheme();
  return (
    <Text
      style={[
        {
          color: t.textMuted,
          fontSize: f.body,
          fontWeight: '600',
          paddingHorizontal: SETTINGS_GROUP_MARGIN + ROW_PAD_H,
          paddingTop: 26,
          paddingBottom: 10,
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
  surfaceColor?: string;
  borderColor?: string;
  dividerColor?: string;
  style?: ViewStyle;
}

/**
 * Скруглённый контейнер-группа. Рядам внутри сам прорисовывает inset-делители
 * (между рядами, не под последним) и скругляет внешние углы через overflow.
 */
export function SettingsGroup({
  children,
  marginTop,
  marginBottom,
  surfaceColor,
  borderColor,
  dividerColor,
  style,
}: SettingsGroupProps) {
  const { theme: t } = useTheme();
  const isCompass = false;
  const items = React.Children.toArray(children).filter(Boolean);
  const groupSurface = surfaceColor ?? t.bgCard;
  const groupBorder = borderColor ?? t.border;
  const groupDivider = dividerColor ?? groupBorder;

  return (
    <TonalSurface
      radius={SETTINGS_GROUP_RADIUS}
      backgroundColor={groupSurface}
      style={[
        {
          marginHorizontal: SETTINGS_GROUP_MARGIN,
          marginTop: marginTop ?? 0,
          marginBottom: marginBottom ?? 0,
          borderRadius: SETTINGS_GROUP_RADIUS,
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
                backgroundColor: groupDivider,
                marginLeft: ROW_PAD_H + TILE_SIZE + ROW_GAP,
              }}
            />
          ) : null}
          {child}
        </View>
      ))}
    </TonalSurface>
  );
}

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap | string;
  color: SettingsTileColor;
  label: string;
  sub?: string;
  /** Текущее значение справа (имя, тема, язык) — эппловский detail-текст.
   *  зачем: запрет владельца на подписи-расшифровки ПОД названием; значение
   *  живёт справа, ряд остаётся однострочным и чистым (референс Bevel). */
  value?: string;
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
  value,
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
        paddingVertical: 13,
        minHeight: 56,
      }}
    >
      <SettingsIconTile icon={icon} color={danger ? DANGER_TILE_COLOR : color} />
      <View style={{ flex: 1, marginLeft: ROW_GAP, marginRight: 8 }}>
        <Text
          style={{ color: danger ? t.wrong : t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          style={{ color: t.textMuted, fontSize: f.body, maxWidth: '42%', marginRight: 6 }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {right !== undefined
        ? right
        : hideChevron
          ? null
          : <Ionicons name="chevron-forward" size={18} color={t.textGhost} />}
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

import React, { createContext, useContext } from 'react';
import { switchTrackBorder } from './switch_chrome';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableHybrid from '../PressableHybrid';
import SafeLinearGradient from '../SafeLinearGradient';
import { ThemeGlassSmoke } from '../v2/ThemeGlassSmoke';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

// зачем (владелец 2026-09-29): корневой экран «Настройки» переносится 1 в 1 по макету
// profile.html#PRF-01 (Liquid Glass). Строки/секции/переключатель собраны здесь один раз,
// теми же размерами, что уже утверждены на дочерних экранах (язык, обучение): плашка 64 dp,
// радиус 14, плитка 41, заголовок 16/21, подпись 13/18. Токены — только из liquidGlassTokens
// (13 тем), без собственных цветов и без толстых обводок (только тонкая полупрозрачная 1 px).

export type SettingsGlass = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const SETTINGS_GLASS_ROW_MIN_HEIGHT = 64;

export function settingsGlassCardStyle(glass: SettingsGlass) {
  return {
    minHeight: SETTINGS_GLASS_ROW_MIN_HEIGHT,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: glass.opaqueCard,
    borderWidth: 1,
    borderColor: glass.glassEdge,
    overflow: 'hidden' as const,
  };
}

/** Заголовок секции (eyebrow макета): 11/14, жирный, разрежённый, верхний регистр задаёт вызывающий. */
export function SettingsGlassEyebrow({ title, glass, wide = false }: { title: string; glass: SettingsGlass; wide?: boolean }) {
  return (
    <Text
      accessibilityRole="header"
      // wide — заголовок раздела макета A (`.ov` 12/16, разрядка 3, отступ 26; D145: 13); остальные экраны — как было.
      style={{ color: glass.secondary, fontSize: 13, lineHeight: wide ? 16 : 18, fontWeight: '700', letterSpacing: wide ? 3 : 1.7, marginTop: wide ? 26 : 24, marginHorizontal: 4, marginBottom: 10 }}
    >
      {title}
    </Text>
  );
}

// зачем (redesign-round-1 вариант A «Группы одним блоком», владелец 04.10): на корневых «Настройках» пункты
// раздела собраны в ОДНУ карточку с тонкими разделителями. Строки внутри группы плоские (без своего фона и
// кромки), высота 60, поля 9/16. Другие экраны (язык, темы, уведомления, друзья, видео) остаются на
// SettingsGlassList — у них свои макеты; режим включается только через SettingsGlassGroup.
const SettingsGroupContext = createContext<boolean>(false);

const GROUPED_ROW_STYLE = {
  minHeight: 60,
  paddingVertical: 9,
  paddingHorizontal: 16,
  gap: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

/** `.card.list` макета A: одна карточка r14 с кромкой, пункты через тонкий разделитель `.row+.row`. */
export function SettingsGlassGroup({ glass, children, testID, marginTop }: { glass: SettingsGlass; children: React.ReactNode; testID?: string; marginTop?: number }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <View testID={testID} style={{ marginTop, borderRadius: 14, backgroundColor: glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' }}>
      <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
      <ThemeGlassSmoke glass={glass} />
      <KitGlassLayer radius={14} />
      <SettingsGroupContext.Provider value>
        {items.map((child, index) => (
          <View
            key={React.isValidElement(child) && child.key != null ? child.key : index}
            style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: glass.line } : undefined}
          >
            {child}
          </View>
        ))}
      </SettingsGroupContext.Provider>
    </View>
  );
}

/** Колонка плашек с зазором 10 (`.list` макета). */
export function SettingsGlassList({ children, marginTop }: { children: React.ReactNode; marginTop?: number }) {
  return <View style={{ gap: 10, marginTop }}>{children}</View>;
}

export function SettingsGlassTile({ glass, children }: { glass: SettingsGlass; children: React.ReactNode }) {
  return (
    <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' }}>
      {/* зачем (сверка 04.10, kit.css LIQUID GLASS): плитка значка — стекло с бликом и кромкой, как в макете. */}
      <KitGlassLayer radius={10} />
      {children}
    </View>
  );
}

/** Пустая плашка-контейнер с тем же фоном, что у строк (для составных строк: размер шрифта). */
export function SettingsGlassCard({ glass, children, testID, style }: { glass: SettingsGlass; children: React.ReactNode; testID?: string; style?: StyleProp<ViewStyle> }) {
  const grouped = useContext(SettingsGroupContext);
  if (grouped) {
    return <View testID={testID} style={[GROUPED_ROW_STYLE, { paddingVertical: 14 }, style]}>{children}</View>;
  }
  return (
    <View testID={testID} style={[settingsGlassCardStyle(glass), style]}>
      <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
      {/* зачем (темы 2.0): цветная дымка внутри карточки — только «Максимум». */}
      <ThemeGlassSmoke glass={glass} />
      {/* зачем (сверка 04.10, profile-001): строка — стекло kit.css (блик 150°, светлая кромка сверху-слева, тёмная снизу). */}
      <KitGlassLayer radius={14} />
      {children}
    </View>
  );
}

type RowProps = {
  glass: SettingsGlass;
  testID?: string;
  title: string;
  sub?: string;
  value?: string;
  icon?: IconName;
  /** Своя левая часть (монета, флаг) вместо плитки с иконкой. */
  leading?: React.ReactNode;
  /** Без onPress плашка статична: без шеврона и без роли кнопки. */
  onPress?: () => void;
  /** Свой правый элемент (переключатель) вместо значения и шеврона. */
  right?: React.ReactNode;
  /** false — вызывающий обработчик уже даёт тактильный отклик сам. */
  haptic?: boolean;
  accessibilityLabel?: string;
  /** Цвет заголовка вместо основного (деструктивные действия). */
  titleColor?: string;
  titleTestID?: string;
  subTestID?: string;
};

export function SettingsGlassRow({ glass, testID, title, sub, value, icon, leading, onPress, right, haptic = true, accessibilityLabel, titleColor, titleTestID, subTestID }: RowProps) {
  const grouped = useContext(SettingsGroupContext);
  const label = accessibilityLabel ?? [title, value, sub].filter(Boolean).join(', ');
  const containerStyle = grouped ? GROUPED_ROW_STYLE : settingsGlassCardStyle(glass);
  const body = (
    <>
      {grouped ? null : (
        <>
          <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
          {/* зачем (темы 2.0): цветная дымка внутри карточки — только «Максимум». */}
          <ThemeGlassSmoke glass={glass} />
          {/* зачем (сверка 04.10, profile-001): строка — стекло kit.css (блик 150°, светлая кромка сверху-слева, тёмная снизу). */}
          <KitGlassLayer radius={14} />
        </>
      )}
      {leading ?? (icon ? (
        <SettingsGlassTile glass={glass}>
          {/* зачем (темы 2.0): значок плитки в цвете темы в «Акценте/Максимуме»; в «Спокойно» — как было. */}
          <Ionicons name={icon} size={20} color={glass.level === 'accent' || glass.level === 'max' ? glass.accentText : glass.lightTint} />
        </SettingsGlassTile>
      ) : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* `.row .tt` 17/22/600 в группе A — шкала D145: 16/22. */}
        <Text testID={titleTestID} style={{ color: titleColor ?? glass.text, fontSize: 16, lineHeight: grouped ? 22 : 21, fontWeight: grouped ? '600' : '700' }}>{title}</Text>
        {sub ? <Text testID={subTestID} style={{ color: glass.mutedText, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{sub}</Text> : null}
      </View>
      {right ?? (
        <>
          {/* `.row .val` 15 вторичным (D145: 16), `.ch` — шеврон приглушённым тоном. */}
          {value ? <Text style={{ color: glass.secondary, fontSize: grouped ? 16 : 13, lineHeight: grouped ? 22 : 18, textAlign: 'right', flexShrink: 1, maxWidth: '45%' }}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={grouped ? glass.mutedText : glass.secondary} /> : null}
        </>
      )}
    </>
  );
  if (!onPress) {
    return (
      // Со своим правым элементом (переключатель) контейнер не «склеивается» в один фокус —
      // иначе скринридер не доберётся до самого переключателя.
      <View testID={testID} accessible={!right} accessibilityLabel={right ? undefined : label} style={containerStyle}>
        {body}
      </View>
    );
  }
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      withHaptic={haptic}
      withSound={false}
      variant="card"
      contentStyle={containerStyle}
    >
      {body}
    </PressableHybrid>
  );
}

/** Переключатель тем же устройством, что на «Настройках обучения»: нейтральный, не зелёный, 48 dp. */
export function SettingsGlassSwitch({ value, onValueChange, testID, accessibilityLabel, glass }: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
  accessibilityLabel: string;
  glass: SettingsGlass;
}) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      withHaptic={false}
      withSound={false}
      variant="chip"
      style={{ width: 48, minWidth: 48, minHeight: 48, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={{ width: 48, height: 29, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: value ? glass.selected : glass.opaqueControl, borderWidth: 1, borderColor: switchTrackBorder(glass) }}>
        <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: value ? glass.lightTint : glass.secondary, transform: [{ translateX: value ? 19 : 0 }] }} />
      </View>
    </PressableHybrid>
  );
}

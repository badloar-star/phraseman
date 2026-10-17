/**
 * Общие детали Liquid Glass для редактора карточки, создания набора, стопки
 * и соцбара набора (макет cards.html, 30.09.2026).
 *
 * зачем: раньше каждый экран рисовал поля/кнопки на старой палитре темы
 * (`t.bgSurface`, `t.accent`, толстые рамки). Здесь — один набор кирпичей на
 * токенах `liquidGlassTokens`, чтобы четыре экрана не разошлись за месяц.
 * Только внешний вид: ни данных, ни навигации, ни лимитов этот файл не знает.
 *
 * Правила владельца: НИКАКИХ обводок и кромок — стиль «Тень» (12.10): плашку отделяют
 * градиент 180° и тень (components/v2/ShadowSurface), тап ≥44dp, без сжатия шрифта и обрезки строк.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ThemeAccentFill } from '../../components/v2/ThemeAccentFill';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { fcHaptic } from './SoundService';
import { NavIcon } from '../../components/v2/BackGlyph';

export type CardsGlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Мягкий красный из макета для разрушительных действий (удалить/очистить). */
export const CARDS_GLASS_DANGER = '#FF8C82'; // theme-exempt: красный «опасно» кита Карточек (токен bad — у «Тем»)

/** Токены стекла активной темы + шкала шрифтов. */
export function useCardsGlass() {
  const { theme: t, f, liquidGlassThemeId, statusBarLight } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return { t, f, g, statusBarLight };
}

/** Фон экрана: тон + мягкий вертикальный градиент, как у «Моих наборов». */
export function CardsGlassScreen({ g, children }: { g: CardsGlassTokens; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: g.bg }}>
      <LinearGradient pointerEvents="none" colors={[g.bgTop, g.bg, g.bgBottom]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/**
 * Поле / карточка: плашка стиля «Тень» — градиент 180° и тень, без обводки.
 * зачем (владелец 12.10): раньше 1px кромка `glassEdge`/`${g.text}66` при фокусе; теперь фокус и «raised» — приподнятая заливка.
 */
export function CardsGlassSurface({
  g,
  focused = false,
  raised = false,
  style,
  children,
  testID,
}: {
  g: CardsGlassTokens;
  focused?: boolean;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[{ borderRadius: 16, boxShadow: plateBoxShadow(g) }, style]}>
      <PlateFill g={g} radius={16} raised={focused || raised} />
      {children}
    </View>
  );
}

/** Круглая кнопка 44dp (закрыть / меню / озвучка). */
export function CardsGlassRoundButton({
  g,
  icon,
  onPress,
  size = 44,
  iconSize = 22,
  testID,
  label,
}: {
  g: CardsGlassTokens;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  iconSize?: number;
  testID?: string;
  label: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessible
      activeOpacity={0.8}
      onPress={() => {
        fcHaptic('tap');
        onPress();
      }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{
        width: Math.max(44, size),
        height: Math.max(44, size),
        borderRadius: Math.max(44, size) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: g.plateFillFrom,
        boxShadow: plateBoxShadow(g),
      }}
    >
      <NavIcon name={icon} size={iconSize} color={g.text} />
    </TouchableOpacity>
  );
}

/** Главная кнопка: светлая заливка cta; выключенная — тон поверхности. */
export function CardsGlassPrimaryButton({
  g,
  label,
  onPress,
  disabled = false,
  testID,
  variant = 'primary',
  style,
}: {
  g: CardsGlassTokens;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const ghost = variant === 'ghost';
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessible
      disabled={disabled}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        {
          minHeight: 54,
          borderRadius: 27,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          // зачем (темы 2.0): accent/accentInk — в «Спокойно» это прежние cta/ctaInk.
          backgroundColor: disabled ? g.buttonFill : ghost ? g.buttonFill : g.accent,
          // зачем (Тень 12.10): контурный «ghost» заменён плашкой с малой тенью, главная — цветная тень действия
          boxShadow: disabled ? undefined : ghost ? nestedBoxShadow(g) : actionBoxShadow(g),
        },
        style,
      ]}
    >
      {!disabled && !ghost ? <ThemeAccentFill glass={g} radius={27} /> : null}
      <Text
        style={{
          fontSize: 16,
          lineHeight: 21,
          fontWeight: '700',
          textAlign: 'center',
          color: disabled ? g.mutedText : ghost ? g.text : g.accentInk,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Нижняя панель кнопки: затухание снизу + кнопка над safe-area. */
export function CardsGlassBottomBar({
  g,
  bottomInset,
  children,
}: {
  g: CardsGlassTokens;
  bottomInset: number;
  children: React.ReactNode;
}) {
  return (
    <View pointerEvents="box-none" style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(bottomInset, 12) + 8 }}>
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', g.bg]}
        locations={[0, 0.55]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

/** Пустое/ошибочное состояние по центру: плитка-иконка, заголовок, кнопка. */
export function CardsGlassStateBlock({
  g,
  icon,
  title,
  actionLabel,
  onAction,
  testID,
}: {
  g: CardsGlassTokens;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 120 }}>
      <View
        style={{
          width: 61,
          height: 61,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: g.opaqueControl,
        }}
      >
        <Ionicons name={icon} size={26} color={g.text} />
      </View>
      <Text style={{ color: g.text, fontSize: 20, lineHeight: 26, fontWeight: '700', marginTop: 18, textAlign: 'center' }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <CardsGlassPrimaryButton
          g={g}
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: 22, minHeight: 46, paddingHorizontal: 28 }}
        />
      ) : null}
    </View>
  );
}

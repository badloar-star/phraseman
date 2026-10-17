/**
 * Общие части экранов наборов Карточек 2.0 (docs/design/v2-app/cards-v2.html): «Мои наборы», набор открыт, «Из видео», «Сообщество».
 *
 * зачем (владелец 12.10: макет утверждён целиком, «приложение = макет»): верхняя панель (`back()`: «назад» без круга + круглые кнопки),
 * заголовок 34/40 с приглушённым числом (`ttl()`), кнопки `.cta` / `.cta.gh` / `.rb`, чипы `.chipbtn`. Размеры сняты с kit.css и cards-v2.html.
 * Цвета — токены темы, не графит макета; контейнеры без обводок (стиль «Тень»): плашка = заливка + тень, «ghost» = плашка с малой тенью.
 * Нажатие — kit `.t` (KitTouchable).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { useLineScale } from '../../hooks/useLineScale';
import { KitTouchable } from '../KitTouchable';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import BackGlyph, { NavIcon } from '../v2/BackGlyph';

type IonName = keyof typeof Ionicons.glyphMap;

/** `.rb.bare` — «назад» без круга, 30×42, шеврон 24. */
export const PackBackBare = memo(function PackBackBare({ g, onPress, label, testID }: Readonly<{ g: GlassTokens; onPress: () => void; label: string; testID?: string }>) {
  return (
    <KitTouchable testID={testID} accessibilityRole="button" accessibilityLabel={label} hitSlop={12} onPress={onPress} style={styles.bare}>
      <BackGlyph size={24} color={g.text} />
    </KitTouchable>
  );
});

// зачем (координатор 12.10, «сперва логи»): один раз на тему — какая заливка и тень у круглых/квадратных плашек шапки наборов ([PACK-BAR-LAYOUT]); «плоские» на кадре = заливка плашки почти равна фону темы.
const loggedPlateThemes = new Set<string>();
function tracePlate(kind: string, g: GlassTokens, size: number): void {
  if (!__DEV__) return;
  const key = `${kind}|${String(g.plateFillFrom)}|${String(g.bg)}`;
  if (loggedPlateThemes.has(key)) return;
  loggedPlateThemes.add(key);
  console.log(`[PACK-BAR-LAYOUT] ${kind} размер=${size} заливка=${String(g.plateFillFrom)} фон темы=${String(g.bg)} тень=${plateBoxShadow(g)}`); // guard-ok: замер оформления
}

/** `.rb` 42 / `.rb.l` 48 — круглая кнопка-плашка с иконкой (стиль «Тень»: заливка и тень, без кольца). */
export const PackRoundButton = memo(function PackRoundButton({ g, icon, onPress, label, testID, size = 42, iconSize = 20, disabled, style }: Readonly<{
  g: GlassTokens; icon: IonName; onPress: () => void; label: string; testID?: string; size?: 42 | 48; iconSize?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
}>) {
  tracePlate('round', g, size);
  return (
    <KitTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.round, { width: size, height: size, borderRadius: size / 2, boxShadow: plateBoxShadow(g) }, style]}
    >
      <PlateFill g={g} radius={size / 2} />
      <NavIcon name={icon} size={iconSize} color={g.text} />
    </KitTouchable>
  );
});

/** `.rb.sq` — квадратная «⋮» 36 r12. */
export const PackSquareButton = memo(function PackSquareButton({ g, icon = 'ellipsis-vertical', onPress, label, testID }: Readonly<{ g: GlassTokens; icon?: IonName; onPress: () => void; label: string; testID?: string }>) {
  return (
    <KitTouchable testID={testID} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={[styles.square, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
      <Ionicons name={icon} size={18} color={g.text} />
    </KitTouchable>
  );
});

/** `.topbar` — высота 44: слева «назад», справа кнопки. */
export const PackTopBarRow = memo(function PackTopBarRow({ left, right }: Readonly<{ left: React.ReactNode; right?: React.ReactNode }>) {
  return (
    <View style={styles.topbar}>
      {left}
      <View style={styles.topRight}>{right}</View>
    </View>
  );
});

/** `ttl()` — заголовок 34/40 700 и приглушённое число 22/600 через 12. */
export const PackScreenTitle = memo(function PackScreenTitle({ g, title, count, testID }: Readonly<{ g: GlassTokens; title: string; count?: number | null; testID?: string }>) {
  const lh = useLineScale();
  return (
    <Text maxFontSizeMultiplier={1.15} testID={testID} accessibilityRole="header" style={[styles.title, { color: g.text, lineHeight: lh(40) }]}>
      {title}
      {count != null ? <Text style={[styles.titleCount, { color: g.mutedText }]}>{`  ${count}`}</Text> : null}
    </Text>
  );
});

type CtaProps = Readonly<{
  g: GlassTokens;
  label: string;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  icon?: IonName;
  trailingIcon?: IonName;
  /** `.grow` — делит ряд поровну. */
  grow?: boolean;
  /** `.cta.sm` 42 вместо 48. */
  small?: boolean;
  disabled?: boolean;
  /** Надпись вместо иконки справа/слева не режем: перенос по словам, кнопка растёт по высоте. */
  style?: StyleProp<ViewStyle>;
}>;

/** `.cta` — главная кнопка: цвет темы и цветная тень действия. */
export const PackCta = memo(function PackCta({ g, label, onPress, testID, accessibilityLabel, icon, trailingIcon, grow, small, disabled, style }: CtaProps) {
  const lh = useLineScale();
  return (
    <KitTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cta, small ? styles.ctaSmall : null, grow ? styles.grow : null, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }, style]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={g.accentInk} /> : null}
      <Text style={[styles.ctaText, { color: g.accentInk, lineHeight: lh(22) }]}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={small ? 16 : 18} color={g.accentInk} /> : null}
    </KitTouchable>
  );
});

/** `.cta.gh` — кнопка без заливки в макете; в стиле «Тень» — плашка с малой тенью (контурные кнопки запрещены). */
export const PackGhostCta = memo(function PackGhostCta({ g, label, onPress, testID, accessibilityLabel, icon, trailingIcon, grow, small, disabled, style }: CtaProps) {
  const lh = useLineScale();
  return (
    <KitTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cta, small ? styles.ctaSmall : null, grow ? styles.grow : null, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }, style]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={g.text} /> : null}
      <Text style={[styles.ctaText, { color: g.text, lineHeight: lh(22) }]}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={small ? 16 : 18} color={g.text} /> : null}
    </KitTouchable>
  );
});

export type PackChip = Readonly<{ id: string; label: string }>;

/** `.chips` / `.chipbtn` — чипы 36 r18, активный на цвете темы; лента листается вбок и уходит за край экрана. */
export const PackChips = memo(function PackChips({ g, chips, activeId, onChange, testIDPrefix }: Readonly<{ g: GlassTokens; chips: readonly PackChip[]; activeId: string; onChange: (id: string) => void; testIDPrefix: string }>) {
  const lh = useLineScale();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips} decelerationRate="fast" keyboardShouldPersistTaps="handled">
      {/* guard-ok: лента из 3–6 коротких чипов, виртуализация не нужна */ chips.map((chip) => {
        const on = chip.id === activeId;
        return (
          <KitTouchable
            key={chip.id}
            testID={`${testIDPrefix}-${chip.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(chip.id)}
            style={[styles.chip, on ? { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) } : { backgroundColor: g.plateFillFrom, boxShadow: nestedBoxShadow(g) }]}
          >
            <Text style={[styles.chipText, { color: on ? g.accentInk : g.secondary, lineHeight: lh(20) }]}>{chip.label}</Text>
          </KitTouchable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  bare: { width: 30, height: 42, justifyContent: 'center' },
  round: { alignItems: 'center', justifyContent: 'center' },
  square: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topbar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { marginTop: 14, fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  titleCount: { fontSize: 22, fontWeight: '600', letterSpacing: 0 },
  cta: { minHeight: 48, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaSmall: { minHeight: 42, borderRadius: 21, paddingHorizontal: 18 },
  // зачем (кандидат Макетов cards-section-031 / v2-053, 13.10): «✓ В моих наборах» в половинной кнопке (≈180 dp) переносилась на 2 строки — поля 20 и зазор 10 не оставляли места тексту; в растущей кнопке поля 12 и зазор 8 (надпись по-прежнему переносится по словам, не сжимается)
  grow: { flex: 1, minWidth: 0, paddingHorizontal: 12, gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  chipsScroll: { marginHorizontal: -20, flexGrow: 0 },
  chips: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 16, fontWeight: '600' },
});

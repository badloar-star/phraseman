// ─── Визитка 2.0: общие детали — кнопки .vz-b, бейдж PRO, плашка ранга ────────
// зачем: одни и те же детали нужны визитке и шторкам покупки/текста; размеры
// сняты с макета (.vz-b 56pt/28, .vz-badge 30pt, .vz-rank 36pt).
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import V2Pressable from '../v2/V2Pressable';
import { LinearGradient } from '../SafeLinearGradient';
import { CoinImage } from './ProfileCardCoin';
import { gradientPoints, type GradientSpec } from './profile_card_looks';
import { useLineScale } from '../../hooks/useLineScale';
import type { SheetButtonPaint } from './profile_card_sheet_paint';

export type ButtonTone = 'primary' | 'alt' | 'off';

type ButtonProps = Readonly<{
  /** Краски кнопки из темы: в шторках — краски шторки, на арте визитки — profileCardArtInk(…).button. */
  paint: SheetButtonPaint;
  testID: string;
  tone: ButtonTone;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  fill?: Readonly<{ fill: GradientSpec; text: string }> | null;
  style?: StyleProp<ViewStyle>;
  outerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityHint?: string;
  selected?: boolean;
}>;

function ProfileCardButtonBase({
  testID, tone, label, onPress, disabled, busy, fill, style, outerStyle, children, accessibilityHint, selected, paint,
}: ButtonProps) {
  const off = tone === 'off' || disabled;
  const gradient = tone === 'primary' && !off && fill ? fill : null;
  // зачем (замечание владельца 10.10; закон 22.10 «цвета — строго цвета и оттенки текущей темы»): краски кнопки всегда из темы —
  // в шторках краски шторки, на арте визитки белое темы (mediaInk); своей белой «иллюстрационной» ветки больше нет.
  const bg = off ? paint.offBg : tone === 'alt' ? paint.altBg : paint.primaryBg;
  return (
    <V2Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!busy, selected }}
      disabled={!!off || !onPress}
      onPress={onPress}
      scaleTo={0.96}
      outerStyle={outerStyle}
      style={[styles.button, { backgroundColor: gradient ? 'transparent' : bg }, style]}
    >
      {gradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={gradient.fill.colors as unknown as [string, string, ...string[]]}
          locations={gradient.fill.locations as unknown as [number, number, ...number[]] | undefined}
          {...gradientPoints(gradient.fill.angle)}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />
      ) : null}
      {children}
    </V2Pressable>
  );
}

export const ProfileCardButton = memo(ProfileCardButtonBase);

export function buttonInk(
  tone: ButtonTone, fill: Readonly<{ text: string }> | null | undefined, disabled: boolean | undefined, paint: SheetButtonPaint,
): string {
  if (tone === 'off' || disabled) return paint.offInk;
  if (tone === 'alt') return paint.altInk;
  // градиентная главная кнопка вида визитки несёт подпись своего вида; без градиента (шторки, fill = null) — краска кнопки
  return fill?.text ?? paint.primaryInk;
}

/** Двухстрочная подпись кнопки (.vz-2l): жирное название + мелкая цена. */
export function TwoLine({ title, sub, ink, subCoinRank }: { title: string; sub: string; ink: string; subCoinRank?: number | null }) {
  const lh = useLineScale();
  return (
    <View style={styles.twoLine}>
      <Text style={[styles.twoTitle, { color: ink, lineHeight: lh(22) }]}>{title}</Text>
      <View style={[styles.twoSubRow, { opacity: 0.75 }]}>
        {subCoinRank !== undefined ? <CoinImage rank={subCoinRank ?? 0} size={15} /> : null}
        <Text style={[styles.twoSub, { color: ink, lineHeight: lh(16) }]}>{sub}</Text>
      </View>
    </View>
  );
}

export function ProBadge({ fill, text, radius }: { fill: GradientSpec; text: string; radius: number }) {
  return (
    <View testID="profile-card-pro-badge" style={[styles.badge, { borderRadius: radius }]}>
      <LinearGradient
        pointerEvents="none"
        colors={fill.colors as unknown as [string, string, ...string[]]}
        locations={fill.locations as unknown as [number, number, ...number[]] | undefined}
        {...gradientPoints(fill.angle)}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <Text style={[styles.badgeText, { color: text }]}>PRO</Text>
    </View>
  );
}

export function RankChip({ rank, label, bg, ink, testID }: { rank: number | null; label: string; bg: string; ink: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.rank, { backgroundColor: bg }]}>
      <CoinImage rank={rank} size={24} />
      <Text style={[styles.rankText, { color: ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // зачем (Сверка 05.10, coins-003): у «Повысить ранг · 6 000» в половине ширины визитки название не помещается
  // в строку (шрифт сжимать нельзя) — при жёсткой высоте 56 цена обрезалась снизу. Теперь 56 — минимум, кнопка
  // растёт по содержимому (поля 8 сверху/снизу) и ничего не режет.
  button: {
    minHeight: 56,
    paddingVertical: 8,
    // соседняя кнопка ряда (.vz-foot alignItems stretch) растягивается на ту же высоту — пара кнопок ровная.
    flexGrow: 1,
    minWidth: 0,
    borderRadius: 28,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    overflow: 'hidden',
  },
  twoLine: { flexShrink: 1, minWidth: 0, alignItems: 'flex-start', gap: 4 },
  twoTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  twoSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  twoSub: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badge: { height: 30, paddingHorizontal: 12, justifyContent: 'center', overflow: 'hidden' },
  badgeText: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  rank: {
    height: 36,
    borderRadius: 18,
    paddingLeft: 7,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
  },
  rankText: { fontSize: 16, fontWeight: '700' },
});

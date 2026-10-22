// ─── Кольцо Plus у аватара: оверлей, обёртка, метка «◆ Plus» ────────────────
// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): у человека с Plus вокруг аватара-монеты —
// переливающееся кольцо, в углу значок ◆, у имени (только свой профиль, «Аккаунт», визитка) — метка «◆ Plus». Один компонент на все 7 мест.
//
// Кольцо — ОВЕРЛЕЙ: размер самого аватара и раскладка экрана не меняются, кольцо выходит за рамку аватара на ring + gap.
// Зазор прозрачный — виден фон экрана, поэтому цвет фона знать не нужно. Обводку значка рисуем цветом `surface`.
// Производительность: компоненты в React.memo с примитивными пропсами; без Plus не рисуется и не добавляется в дерево ничего.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import {
  PLUS_PIN_COLORS,
  PLUS_PIN_GLYPH_COLOR,
  plusRingArcs,
  plusRingColors,
  plusRingSpec,
  plusTagColors,
  type PlusRingKind,
} from './plus_ring_spec';

type OverlayProps = Readonly<{
  /** Размер аватара (dp), вокруг которого рисуется кольцо. */
  size: number;
  kind?: PlusRingKind;
  /** Цвет поверхности под аватаром — для обводки значка. Нет — фон экрана темы. */
  surface?: string;
  /** Скрыть значок ◆ (кольцо остаётся): например, когда рядом золотое кольцо «Обсидиана». */
  hidePin?: boolean;
  /** Скрыть кольцо (значок остаётся). */
  hideRing?: boolean;
  testID?: string;
}>;

const RingGraphic = memo(function RingGraphic({ size, kind }: { size: number; kind: PlusRingKind }) {
  // зачем (владелец 22.10, №17): в светлых темах кольцо затемнённое (≥ 3:1); isDark === false — только явно светлая тема, без темы остаётся прежнее
  const { isDark } = useTheme();
  const isLight = isDark === false;
  const spec = plusRingSpec(size, kind, isLight);
  const { outer, ring, inset } = spec;
  const center = outer / 2;
  const arcs = spec.flatColor ? [] : plusRingArcs(outer, ring, 0.9, plusRingColors(isLight));
  const idBase = `plr${Math.round(outer * 10)}${isLight ? 'l' : 'd'}`;
  return (
    <Svg width={outer} height={outer} style={{ position: 'absolute', left: -inset, top: -inset }}>
      {spec.flatColor ? (
        <Circle cx={center} cy={center} r={outer / 2 - ring / 2} stroke={spec.flatColor} strokeWidth={ring} fill="none" />
      ) : (
        <>
          <Defs>
            {arcs.map((arc, index) => (
              <SvgLinearGradient key={`g${index}`} id={`${idBase}_${index}`} gradientUnits="userSpaceOnUse" x1={arc.x1} y1={arc.y1} x2={arc.x2} y2={arc.y2}>
                <Stop offset="0" stopColor={arc.from} />
                <Stop offset="1" stopColor={arc.to} />
              </SvgLinearGradient>
            ))}
          </Defs>
          {arcs.map((arc, index) => (
            <Path key={`p${index}`} d={arc.d} stroke={`url(#${idBase}_${index})`} strokeWidth={ring} fill="none" />
          ))}
        </>
      )}
    </Svg>
  );
});

const PinGraphic = memo(function PinGraphic({ size, kind, surface }: { size: number; kind: PlusRingKind; surface: string }) {
  const pin = plusRingSpec(size, kind).pin;
  if (!pin) return null;
  const wrap = pin.size + 2 * pin.outline;
  const edge = -(pin.overhang + pin.outline);
  return (
    <View
      style={{
        position: 'absolute', right: edge, bottom: edge, width: wrap, height: wrap, borderRadius: wrap / 2,
        backgroundColor: surface, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <LinearGradient
        colors={[...PLUS_PIN_COLORS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: pin.size, height: pin.size, borderRadius: pin.size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="diamond" size={pin.glyph} color={PLUS_PIN_GLYPH_COLOR} />
      </LinearGradient>
    </View>
  );
});

/** Оверлей поверх аватара: клади ВНУТРЬ контейнера размера `size` (последним ребёнком). */
export const PlusRingOverlay = memo(function PlusRingOverlay({ size, kind = 'list', surface, hidePin = false, hideRing = false, testID = 'plus-ring' }: OverlayProps) {
  const { theme } = useTheme();
  const resolvedSurface = surface ?? theme.bgPrimary;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {hideRing ? null : <RingGraphic size={size} kind={kind} />}
      {hidePin ? null : <PinGraphic size={size} kind={kind} surface={resolvedSurface} />}
    </View>
  );
});

type WrapperProps = Readonly<{
  /** У человека есть Plus. false/undefined — рисуются только дети, без обёртки. */
  plus?: boolean | null;
  size: number;
  kind?: PlusRingKind;
  surface?: string;
  hidePin?: boolean;
  hideRing?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}>;

/** Обёртка вокруг любого аватара: Plus → контейнер размера аватара + кольцо; нет Plus → дети как есть (нулевая цена в списках). */
export const PlusAvatarRing = memo(function PlusAvatarRing({ plus, size, kind = 'list', surface, hidePin, hideRing, style, children }: WrapperProps) {
  if (plus !== true) return <>{children}</>;
  return (
    <View style={[{ width: size, height: size }, style]}>
      {children}
      <PlusRingOverlay size={size} kind={kind} surface={surface} hidePin={hidePin} hideRing={hideRing} />
    </View>
  );
});

type TagProps = Readonly<{
  isLight: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/** Метка «◆ Plus» у имени: высота 22, радиус 11, поля 8, 13/800. Только свой профиль, «Аккаунт», визитка. */
export const PlusTag = memo(function PlusTag({ isLight, style, testID = 'plus-tag' }: TagProps) {
  const colors = plusTagColors(isLight);
  return (
    <View testID={testID} accessible accessibilityLabel="Plus" style={[styles.tag, { backgroundColor: colors.bg }, style]}>
      <Ionicons name="diamond" size={11} color={colors.ink} />
      <Text maxFontSizeMultiplier={1.15} style={[styles.tagText, { color: colors.ink }]}>Plus</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tag: { height: 22, borderRadius: 11, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  tagText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
});

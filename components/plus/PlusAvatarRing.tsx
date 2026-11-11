// ─── Кольцо Plus у аватара: оверлей, обёртка, метка «◆ Plus» ────────────────
// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): у человека с Plus вокруг аватара-монеты —
// переливающееся кольцо, в углу значок ◆, у имени (только свой профиль, «Аккаунт», визитка) — метка «◆ Plus». Один компонент на все 7 мест.
//
// Кольцо — ОВЕРЛЕЙ: размер самого аватара и раскладка экрана не меняются, кольцо выходит за рамку аватара на ring + gap.
// Зазор прозрачный — виден фон экрана, поэтому цвет фона знать не нужно. Обводку значка рисуем цветом `surface`.
// Производительность: компоненты в React.memo с примитивными пропсами; без Plus не рисуется и не добавляется в дерево ничего.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { LinearGradient } from '../SafeLinearGradient';
import { useTheme } from '../ThemeContext';
import type { SubscriptionTier } from '../../app/subscription_tier';
import {
  PLUS_PIN_COLORS,
  PLUS_PIN_GLYPH_COLOR,
  pinColorsForTier,
  pinGlyphColorForTier,
  plusRingArcs,
  plusRingSpec,
  ringA11yForTier,
  ringColorsForTier,
  tagColorsForTier,
  type PlusRingKind,
} from './plus_ring_spec';

// зачем (владелец 06.11, Plus/Ultra): Ultra (годовая) — та же геометрия, но шестиугольный значок со звездой ✦ вместо круга с ромбом ◆ (макет docs/work/mockups/plus_vs_ultra.html).
const ULTRA_STAR_PATH = 'M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5C11.3 16.9 7.1 12.7 1.5 12 7.1 11.3 11.3 7.1 12 1.5z';
const hexPoints = (box: number, offset: number): string => [[0.5, 0], [0.93, 0.25], [0.93, 0.75], [0.5, 1], [0.07, 0.75], [0.07, 0.25]]
  .map(([x, y]) => `${(offset + x * box).toFixed(2)},${(offset + y * box).toFixed(2)}`).join(' ');

// ВРЕМЕННАЯ ТРАССИРОВКА [PLUS-RING] (владелец 11.11: «кольцо у аватара поломано везде» — видны только верхняя и левая дуги).
// зачем: код кольца не менялся с 05.11, причина по истории не находится — нужны факты с устройства: что посчитали (размер аватара, холст,
// толщина, дуги) и что реально получил холст после раскладки (ширина/высота/смещение). Если холст меньше посчитанного или содержимое
// растянуто — правый и нижний край кольца уходят за край, как на снимках. Одна строка на уникальное сочетание, чтобы списки не шумели.
// УБРАТЬ после починки.
const ringTraceSeen = new Set<string>();
function traceRing(stage: 'calc' | 'layout', key: string, payload: Record<string, unknown>): void {
  const id = `${stage}:${key}`;
  if (ringTraceSeen.has(id)) return;
  ringTraceSeen.add(id);
  console.warn('[PLUS-RING]', stage, JSON.stringify({ ...payload, os: Platform.OS, osVersion: Platform.Version, pixelRatio: PixelRatio.get(), fontScale: PixelRatio.getFontScale() })); // guard-ok: временная трассировка, одна строка на размер
}

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
  /** Уровень подписки: plus (месячная) или ultra (годовая). По умолчанию plus. */
  tier?: SubscriptionTier;
  testID?: string;
}>;

const RingGraphic = memo(function RingGraphic({ size, kind, tier }: { size: number; kind: PlusRingKind; tier: SubscriptionTier }) {
  // зачем (владелец 22.10, №17): в светлых темах кольцо затемнённое (≥ 3:1); isDark === false — только явно светлая тема, без темы остаётся прежнее
  const { isDark } = useTheme();
  const isLight = isDark === false;
  const spec = plusRingSpec(size, kind, isLight, tier);
  const { outer, ring, inset } = spec;
  const center = outer / 2;
  const arcs = spec.flatColor ? [] : plusRingArcs(outer, ring, 0.9, ringColorsForTier(tier, isLight));
  const idBase = `plr${tier === 'ultra' ? 'u' : ''}${Math.round(outer * 10)}${isLight ? 'l' : 'd'}`;
  const traceKey = `${kind}:${tier}:${size}:${isLight ? 'light' : 'dark'}`;
  traceRing('calc', traceKey, { size, kind, tier, isLight, outer, ring, inset, center, flat: spec.flatColor, arcs: arcs.length, firstArc: arcs[0]?.d ?? null, lastArc: arcs[arcs.length - 1]?.d ?? null, idBase });
  const onRingLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // ожидаем: width = height = outer, x = y = −inset; расхождение = причина обрезанного кольца
    traceRing('layout', traceKey, { size, outerExpected: outer, insetExpected: -inset, x, y, width, height, matches: Math.abs(width - outer) < 0.6 && Math.abs(height - outer) < 0.6 });
  };
  return (
    // зачем (владелец 11.11: «кольцо поломано» — видны только левая и верхняя дуги): замер по снимку эмулятора показал, что кольцо рисовалось
    // в ~1,4 раза крупнее своей области и обрезалось её правым и нижним краем. viewBox заставляет рисунок вписываться ровно в область,
    // какой бы масштаб ни взяла нативная часть; при верном масштабе это тождественное преобразование — вид не меняется.
    <Svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`} onLayout={onRingLayout} style={{ position: 'absolute', left: -inset, top: -inset }}>
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

const PinGraphic = memo(function PinGraphic({ size, kind, surface, tier }: { size: number; kind: PlusRingKind; surface: string; tier: SubscriptionTier }) {
  const { isDark } = useTheme();
  const isLight = isDark === false;
  const pin = plusRingSpec(size, kind, isLight, tier).pin;
  if (!pin) return null;
  const wrap = pin.size + 2 * pin.outline;
  const edge = -(pin.overhang + pin.outline);
  if (tier === 'ultra') {
    // шестиугольник: обводка цвета поверхности (больший шестиугольник) + градиентный шестиугольник + звезда ✦ (58 % значка, как ромб у Plus)
    const colors = pinColorsForTier(tier, isLight);
    const glyphColor = pinGlyphColorForTier(tier, isLight);
    const gradId = `pinu${Math.round(pin.size * 10)}${isLight ? 'l' : 'd'}`;
    const star = pin.glyph;
    return (
      <View style={{ position: 'absolute', right: edge, bottom: edge, width: wrap, height: wrap }}>
        <Svg width={wrap} height={wrap}>
          <Defs>
            <SvgLinearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={wrap} y2={wrap}>
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </SvgLinearGradient>
          </Defs>
          <Polygon points={hexPoints(wrap, 0)} fill={surface} />
          <Polygon points={hexPoints(pin.size, pin.outline)} fill={`url(#${gradId})`} />
          <Svg x={(wrap - star) / 2} y={(wrap - star) / 2} width={star} height={star} viewBox="0 0 24 24">
            <Path d={ULTRA_STAR_PATH} fill={glyphColor} />
          </Svg>
        </Svg>
      </View>
    );
  }
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
export const PlusRingOverlay = memo(function PlusRingOverlay({ size, kind = 'list', surface, hidePin = false, hideRing = false, tier = 'plus', testID = 'plus-ring' }: OverlayProps) {
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
      {hideRing ? null : <RingGraphic size={size} kind={kind} tier={tier} />}
      {hidePin ? null : <PinGraphic size={size} kind={kind} surface={resolvedSurface} tier={tier} />}
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
  /** Уровень: plus (месячная) / ultra (годовая); по умолчанию plus. */
  tier?: SubscriptionTier;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}>;

/** Обёртка вокруг любого аватара: Plus → контейнер размера аватара + кольцо; нет Plus → дети как есть (нулевая цена в списках). */
export const PlusAvatarRing = memo(function PlusAvatarRing({ plus, size, kind = 'list', surface, hidePin, hideRing, tier = 'plus', style, children }: WrapperProps) {
  if (plus !== true) return <>{children}</>;
  return (
    <View style={[{ width: size, height: size }, style]}>
      {children}
      <PlusRingOverlay size={size} kind={kind} surface={surface} hidePin={hidePin} hideRing={hideRing} tier={tier} />
    </View>
  );
});

type TagProps = Readonly<{
  isLight: boolean;
  /** Уровень: plus → «◆ Plus», ultra → «✦ Ultra». По умолчанию plus. */
  tier?: SubscriptionTier;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/** Метка «◆ Plus» / «✦ Ultra» у имени: высота 22, радиус 11, поля 8, 13/800. Только свой профиль, «Аккаунт», визитка. */
export const PlusTag = memo(function PlusTag({ isLight, tier = 'plus', style, testID = 'plus-tag' }: TagProps) {
  const colors = tagColorsForTier(tier, isLight);
  const label = ringA11yForTier(tier);
  return (
    <View testID={testID} accessible accessibilityLabel={label} style={[styles.tag, { backgroundColor: colors.bg }, style]}>
      {tier === 'ultra' ? (
        <Svg width={11} height={11} viewBox="0 0 24 24"><Path d={ULTRA_STAR_PATH} fill={colors.ink} /></Svg>
      ) : (
        <Ionicons name="diamond" size={11} color={colors.ink} />
      )}
      <Text maxFontSizeMultiplier={1.15} style={[styles.tagText, { color: colors.ink }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tag: { height: 22, borderRadius: 11, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  tagText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
});

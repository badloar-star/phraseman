// ═══════════════════════════════════════════════════════════════════════════
// PaywallMChart.tsx — честный график пейвола «Вариант М»: «Сколько фраз ты скажешь вслух за месяц».
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q + карта Тем d987464f4, замена G4): линия «бесплатно» — настоящий лимит приложения, линия Plus — сегодняшний темп
// человека. Две линии различаются ФОРМОЙ, а не цветом (в светлых градиентных темах их цвета почти равны): Plus — сплошная 3 px с точками и заливкой 12 %,
// «бесплатно» — пунктир 2 px (4/4) без точек и заливки; подписи на концах обязательны; легенда повторяет форму линии. Размер считается от ширины окна,
// без измерения после первого кадра — первый кадр уже с итоговой геометрией (Performance Bible: layout stability).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import type { PaywallMChartModel } from './paywall_m_model';

const H = 124;
const PAD_X = 10;
const PAD_TOP = 26;
const PAD_BOTTOM = 8;
const PLUS_FILL_ALPHA = '1F'; // 12 % — ровно то, что проверено в карте Тем (G2); плотнее нельзя без перемера

export type PaywallMChartTexts = Readonly<{
  title: string; today: string; in30: string; legendPlus: string; legendFree: string; note: string; plusEndLabel: string; freeEndLabel: string;
}>;

export const PaywallMChart = memo(function PaywallMChart({ g, model, texts }: { g: GlassTokens; model: PaywallMChartModel; texts: PaywallMChartTexts }) {
  const { width: windowWidth } = useWindowDimensions();
  const w = Math.max(220, Math.min(windowWidth, 560) - 64);
  const geo = useMemo(() => {
    const x = (t: number) => PAD_X + t * (w - PAD_X * 2);
    const y = (t: number) => H - PAD_BOTTOM - t * (H - PAD_TOP - PAD_BOTTOM);
    const pts = (list: PaywallMChartModel['plus']) => list.map(([tx, ty]) => ({ x: x(tx), y: y(ty) }));
    const plus = pts(model.plus);
    const free = pts(model.free);
    // Plus — плавная кривая через три точки (середина слегка приподнята контрольными точками), бесплатно — ломаная до потолка
    const plusPath = `M${plus[0].x} ${plus[0].y} Q${plus[1].x} ${plus[1].y} ${plus[2].x} ${plus[2].y}`;
    const plusArea = `${plusPath} L${plus[2].x} ${y(0)} L${plus[0].x} ${y(0)} Z`;
    const freePath = free.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    return { plus, free, plusPath, plusArea, freePath };
  }, [model, w]);
  const plusEnd = geo.plus[geo.plus.length - 1];
  const freeEnd = geo.free[geo.free.length - 1];
  const fill = `${g.accentGraphic.slice(0, 7)}${PLUS_FILL_ALPHA}`;
  return (
    <View testID="paywall-m-chart" style={[S.card, { backgroundColor: g.opaqueCard }]}>
      <Text accessibilityRole="header" style={[S.title, { color: g.text }]}>{texts.title}</Text>
      <View style={{ height: H, marginTop: 6 }}>
        <Svg width={w} height={H} accessibilityLabel={`${texts.plusEndLabel}; ${texts.freeEndLabel}`}>
          <Defs>
            <LinearGradient id="pwm-fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fill} />
              <Stop offset="1" stopColor={fill} stopOpacity={0.35} />
            </LinearGradient>
          </Defs>
          <Path d={geo.plusArea} fill="url(#pwm-fill)" />
          <Path d={geo.freePath} stroke={g.mutedText} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" fill="none" />
          <Path d={geo.plusPath} stroke={g.accentGraphic} strokeWidth={3} strokeLinecap="round" fill="none" />
          {geo.plus.map((p, i) => <Circle key={`pt-${Math.round(p.x)}`} cx={p.x} cy={p.y} r={i === geo.plus.length - 1 ? 5 : 4} fill={i === geo.plus.length - 1 ? g.accentGraphic : g.opaqueCard} stroke={g.accentGraphic} strokeWidth={2.5} />)}
        </Svg>
        <Text style={[S.endLabel, { color: g.text, right: PAD_X, top: Math.max(0, plusEnd.y - 24) }]}>{texts.plusEndLabel}</Text>
        <Text style={[S.endLabelSm, { color: g.secondary, right: PAD_X, top: Math.max(0, freeEnd.y - 22) }]}>{texts.freeEndLabel}</Text>
      </View>
      <View style={S.axis}>
        <Text style={[S.axisText, { color: g.secondary }]}>{texts.today}</Text>
        <Text style={[S.axisText, { color: g.secondary }]}>{texts.in30}</Text>
      </View>
      <View style={S.legend}>
        <View style={S.legendItem}>
          <Svg width={26} height={10}><Path d="M0 5 H26" stroke={g.accentGraphic} strokeWidth={3} strokeLinecap="round" /><Circle cx={13} cy={5} r={4} fill={g.opaqueCard} stroke={g.accentGraphic} strokeWidth={2.5} /></Svg>
          <Text style={[S.axisText, { color: g.secondary }]}>{texts.legendPlus}</Text>
        </View>
        <View style={S.legendItem}>
          <Svg width={26} height={10}><Path d="M0 5 H26" stroke={g.mutedText} strokeWidth={2} strokeDasharray="4 4" /></Svg>
          <Text style={[S.axisText, { color: g.secondary }]}>{texts.legendFree}</Text>
        </View>
      </View>
      <Text style={[S.note, { color: g.secondary }]}>{texts.note}</Text>
    </View>
  );
});

const S = StyleSheet.create({
  card: { borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  endLabel: { position: 'absolute', fontSize: 16, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  endLabelSm: { position: 'absolute', fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisText: { fontSize: 13, lineHeight: 17 },
  legend: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { marginTop: 8, fontSize: 13, lineHeight: 17 },
});

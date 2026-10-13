// ═══════════════════════════════════════════════════════════════════════════
// SpireHomeSkeleton.tsx — первый кадр экрана «Шпиль», пока не прочитан конфиг (config === null).
//
// зачем (правило 10г «нет пустого экрана», координатор 13.10): на холодном старте память конфига пуста, и до чтения с диска экран был пустым
// `View`. Форма экрана известна: заголовок, подзаголовок, башня, карточка этажа. Заголовок «Шпиль» — настоящий текст (без сети), остальное — плашки
// по итоговой геометрии, чтобы настоящий экран встал без скачка. Статично, без бесконечной анимации (перф-бюджет).
// Замок по языку и «выключен» сюда не попадают — решение о них принимает экран выше.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import { useSpirePalette } from './useSpirePalette';
import { spireText } from './spire_strings';

/** Высота окна башни — как `WINDOW_HEIGHT` в SpireTower; карточка этажа — minHeight как у SpireFloorInfo. */
const TOWER_H = 400;
const INFO_H = 72;

function SpireHomeSkeleton({ lang }: Readonly<{ lang: Lang }>) {
  const p = useSpirePalette();
  const g = useShadowGlass();
  return (
    <View style={s.root} testID="spire-loading" accessibilityRole="progressbar" accessibilityLabel={spireText(lang, 'title')}>
      <View style={s.content}>
        <View style={s.head}>
          <View style={s.headText}>
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'title')}</Text>
            <View style={s.subtitleBox}><View style={[s.bar, { width: '58%', backgroundColor: p.cardRaised }]} /></View>
          </View>
          <View style={[s.rulesBtn, { backgroundColor: p.control }]} />
        </View>
        <View style={[s.tower, { boxShadow: plateBoxShadow(g) }]}><PlateFill g={g} radius={22} /></View>
        <View style={[s.info, { boxShadow: plateBoxShadow(g) }]}>
          <PlateFill g={g} radius={16} />
          <View style={[s.bar, { width: '34%', backgroundColor: p.cardRaised }]} />
          <View style={[s.bar, { width: '62%', backgroundColor: p.cardRaised, marginTop: 8 }]} />
        </View>
      </View>
    </View>
  );
}

// Числа взяты из SpireHomeScreen (`head`, `title`, `subtitle`, `rulesBtn`, `towerWrap`) — первый кадр совпадает с настоящим экраном по высоте.
const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: V2.screenPad, paddingTop: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { ...V2_TYPE.largeTitle, letterSpacing: -0.5 },
  subtitleBox: { height: 20, marginTop: 6, justifyContent: 'center' },
  bar: { height: 14, borderRadius: 7 },
  rulesBtn: { width: 44, height: 44, borderRadius: 22 },
  tower: { marginTop: 18, height: TOWER_H, borderRadius: 22, overflow: 'hidden' },
  info: { marginTop: 12, minHeight: INFO_H, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, justifyContent: 'center' },
});

export default memo(SpireHomeSkeleton);

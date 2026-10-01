// ═══════════════════════════════════════════════════════════════════════════
// SpireTour.tsx — тур первого входа в Шпиль, 3 экрана (макет §1).
//
// зачем: «Три экрана, „Пропустить“ на каждом. Показывается один раз.» Картинки —
// иллюстрации правил, не данные: башня (тот же SVG, что на главном), кольцо с
// тремя сердцами, лестница камней из tier_names. Имён людей и мест из макета тут
// нет — их неоткуда честно взять. «Показан» хранится локально (spire_local_store).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { spireTierName } from '../../modules/spire/tier_names';
import V2Pressable from '../v2/V2Pressable';
import SpireTowerSvg from './SpireTowerSvg';
import { useSpirePalette } from './useSpirePalette';
import { spireGameText } from './spire_game_strings';

const IMG_HEIGHT = 340;
const TOWER_WIDTH = 240;
const TOWER_OFFSET = -32;
const noop = () => undefined;

function TourTower({ lang }: Readonly<{ lang: Lang }>) {
  return (
    <View style={s.towerClip} pointerEvents="none">
      <View style={{ marginTop: TOWER_OFFSET, width: TOWER_WIDTH }}>
        <SpireTowerSvg lang={lang} myFloor={null} selected={0} onSelect={noop} width={TOWER_WIDTH} />
      </View>
    </View>
  );
}

function TourRing() {
  const p = useSpirePalette();
  const r = 59;
  const c = 2 * Math.PI * r;
  return (
    <View style={s.center}>
      <View>
        <Svg width={132} height={132} viewBox="0 0 132 132">
          <Circle cx={66} cy={66} r={r} fill="none" stroke={p.control} strokeWidth={7} />
          <Circle cx={66} cy={66} r={r} fill="none" stroke={p.text} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * 0.25} transform="rotate(-90 66 66)" />
        </Svg>
        <View style={s.ringCenter}><Text style={[s.ringText, { color: p.text }]}>10</Text></View>
      </View>
      <View style={[s.heartPill, { backgroundColor: p.control }]}>
        <Ionicons name="heart" size={20} color={p.text} />
        <Ionicons name="heart" size={20} color={p.text} />
        <Ionicons name="heart" size={20} color={p.text} />
      </View>
    </View>
  );
}

function TourStones({ lang }: Readonly<{ lang: Lang }>) {
  const p = useSpirePalette();
  return (
    <View style={s.stones}>
      {[2, 1, 0].map((tier) => (
        <View key={`tier-${tier}`} style={[s.stone, { backgroundColor: tier === 1 ? p.cardRaised : p.card }]}>
          <Text style={[s.stoneText, { color: p.text }]}>{spireTierName(tier, lang)}</Text>
          {tier < 2 ? <Ionicons name="arrow-up" size={18} color={p.correct} /> : null}
        </View>
      ))}
    </View>
  );
}

type Props = Readonly<{ lang: Lang; visible: boolean; onDone: () => void }>;

function SpireTour({ lang, visible, onDone }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const [page, setPage] = useState(0);
  const last = page === 2;
  const next = useCallback(() => {
    if (last) { onDone(); return; }
    setPage((n) => Math.min(2, n + 1));
  }, [last, onDone]);
  const title = spireGameText(lang, page === 0 ? 'tour1Title' : page === 1 ? 'tour2Title' : 'tour3Title');
  const text = page === 2
    ? spireGameText(lang, 'tour3Text', { a: spireTierName(0, lang), b: spireTierName(1, lang), c: spireTierName(2, lang), z: spireTierName(11, lang) })
    : spireGameText(lang, page === 0 ? 'tour1Text' : 'tour2Text');
  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onDone} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 20 }]} testID="spire-tour">
        <View style={s.top}>
          <V2Pressable onPress={onDone} accessibilityRole="button" style={s.skip} testID="spire-tour-skip">
            <Text style={[s.skipText, { color: p.textSecondary }]}>{spireGameText(lang, 'skip')}</Text>
          </V2Pressable>
        </View>
        <View style={s.img}>
          {page === 0 ? <TourTower lang={lang} /> : page === 1 ? <TourRing /> : <TourStones lang={lang} />}
        </View>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.text, { color: p.textSecondary }]}>{text}</Text>
        <View style={s.dots} accessible accessibilityLabel={`${page + 1} / 3`}>
          {[0, 1, 2].map((i) => <View key={`dot-${i}`} style={[s.dot, { backgroundColor: i === page ? p.text : p.control }]} />)}
        </View>
        <View style={s.spacer} />
        <V2Pressable onPress={next} accessibilityRole="button" style={[s.cta, { backgroundColor: p.cta }]} testID="spire-tour-next">
          <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, last ? 'start' : 'next')}</Text>
          <Ionicons name="arrow-forward" size={20} color={p.ctaText} />
        </V2Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: V2.screenPad },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  skip: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  skipText: { fontSize: 16, fontWeight: '600' },
  img: { height: IMG_HEIGHT, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  towerClip: { height: IMG_HEIGHT, width: TOWER_WIDTH, overflow: 'hidden', alignSelf: 'center' },
  center: { alignItems: 'center', gap: 26 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 30, fontWeight: '700' },
  heartPill: { height: 40, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 9 },
  stones: { width: '100%', gap: 12, paddingHorizontal: 34 },
  stone: { minHeight: 60, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stoneText: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, marginTop: 34 },
  text: { fontSize: 16, lineHeight: 23, marginTop: 12 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  spacer: { flex: 1 },
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '700' },
});

export default memo(SpireTour);

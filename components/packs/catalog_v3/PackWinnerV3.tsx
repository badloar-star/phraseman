// ═══════════════════════════════════════════════════════════════════════════
// PackWinnerV3.tsx — праздничное окно победителя «Набора месяца» за 1, 2 и 3 место на «Сцене».
//
// зачем (слово владельца через координатора 26.10: «праздничное окно победителя за 1, 2 и 3 место»; «минимум кнопок, без мелких подписей»): один экран на три места — сияющий
// герой (кубок за первое, медаль за второе и третье), цифра места, «Твой набор — …!», строка набора и ОДНА кнопка «Забрать приз». Празднование живёт на СВОЁМ экране и не хранится
// в очереди показа (фундаментальное правило владельца 01.09): окно поздравляет фактом итога месяца, а не записью «когда-то». Движение: герой выезжает пружиной 520 мс, ореол дышит,
// конфетти падает; при «уменьшить движение» всё статично. Призы без выдуманных чисел: первое — «Plus и монеты», второе и третье — «Монеты».
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import PackCoverV3 from './PackCoverV3';
import PackSceneFrameV3 from './PackSceneFrameV3';
import { packScreensText } from './packs_catalog_v3_screens_copy';
import { packCoverPaint, type PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;
const HERO = 176;
const CONFETTI_COUNT = 18;

export type PackWinnerPlace = 1 | 2 | 3;
export type PackWinnerData = Readonly<{ id: string; title: string; likes: number }>;

type Props = Readonly<{
  lang: Lang;
  colors: PacksCatalogColors;
  place: PackWinnerPlace;
  pack: PackWinnerData;
  topInset: number;
  bottomInset: number;
  onClaim: () => void;
}>;

const HALO_A = colorWithAlpha(SPIRE_SCENE_INK.text, 0.06);
const HALO_B = colorWithAlpha(SPIRE_SCENE_INK.text, 0.1);
const HALO_C = colorWithAlpha(SPIRE_SCENE_INK.text, 0.16);
const GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);
const GLASS_STRONG = colorWithAlpha(SPIRE_SCENE_INK.text, 0.2);

/** Постоянные «случайные» доли для конфетти: одни и те же в каждом показе — без перерисовок и без Math.random в рендере. */
const CONFETTI = (() => {
  let seed = 26102026;
  const next = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  return Object.freeze(Array.from({ length: CONFETTI_COUNT }, (_, i) => Object.freeze({ id: i, x: next(), delay: next() * 2600, dur: 3600 + next() * 2400, tilt: 0.4 + next() * 1.2, tone: i % 3 })));
})();

function ConfettiPiece({ spec, colors, height, width }: Readonly<{ spec: (typeof CONFETTI)[number]; colors: PacksCatalogColors; height: number; width: number }>) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: spec.dur, delay: spec.delay, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, spec.dur, spec.delay]);
  const color = spec.tone === 0 ? colors.accent : spec.tone === 1 ? SPIRE_SCENE_INK.text : colorWithAlpha(SPIRE_SCENE_INK.text, 0.6);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.piece,
        { left: spec.x * (width - 12), backgroundColor: color },
        { opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-24, height] }) }, { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${Math.round(spec.tilt * 540)}deg`] }) }] },
      ]}
    />
  );
}

function PackWinnerV3({ lang, colors, place, pack, topInset, bottomInset, onClaim }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const paint = useMemo(() => packCoverPaint(pack.id, colors), [pack.id, colors]);
  useEffect(() => {
    if (reduceMotion) { pop.setValue(1); return undefined; }
    const spring = Animated.spring(pop, { toValue: 1, stiffness: 160, damping: 13, mass: 1, useNativeDriver: true });
    spring.start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { spring.stop(); loop.stop(); };
  }, [reduceMotion, pop, breathe]);
  const heroStyle = { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] };
  const haloStyle = { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] };
  const titleKey = place === 1 ? 'win1' : place === 2 ? 'win2' : 'win3';
  return (
    <PackSceneFrameV3
      testID={`packs-v3-win-${place}`}
      colors={colors}
      topInset={topInset}
      bottomInset={bottomInset}
      onBack={null}
      backLabel={packScreensText(lang, 'back')}
      cta={{ label: packScreensText(lang, place === 1 ? 'claim' : 'claimCoins'), onPress: onClaim, icon: 'trophy' }}
    >
      {reduceMotion ? null : (
        <View pointerEvents="none" style={[s.confetti, { height: height + 40 }]}>
          {CONFETTI.map((spec) => <ConfettiPiece key={spec.id} spec={spec} colors={colors} height={height} width={width} />)}
        </View>
      )}
      <View style={s.center}>
        <Animated.View style={[s.hero, heroStyle]} testID={`packs-v3-win-${place}-hero`}>
          <Animated.View style={[s.halo, s.haloC, haloStyle]} />
          <View style={[s.halo, s.haloB]} />
          <View style={[s.halo, s.haloA]} />
          <Ionicons name={place === 1 ? 'trophy' : 'medal'} size={92} color={SPIRE_SCENE_INK.text} />
          <View style={s.badge}><Text style={ts.badgeNum} maxFontSizeMultiplier={1}>{place}</Text></View>
        </Animated.View>
        <Text style={ts.kicker} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, 'winMonth')}</Text>
        <Text style={ts.title} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, titleKey)}</Text>
        <View style={s.packRow} testID={`packs-v3-win-${place}-pack`}>
          <PackCoverV3 paint={paint} glyphSize={24} style={s.packCover} />
          <Text style={[ts.packTitle, s.grow]} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.title}</Text>
          <Ionicons name="heart" size={16} color={SPIRE_SCENE_INK.text} />
          <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{pack.likes}</Text>
        </View>
        <View style={s.prize} testID={`packs-v3-win-${place}-prize`}>
          <Ionicons name={place === 1 ? 'sparkles' : 'cash-outline'} size={22} color={SPIRE_SCENE_INK.text} />
          <Text style={ts.prizeText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, place === 1 ? 'prizeFirst' : 'prizeOther')}</Text>
        </View>
      </View>
    </PackSceneFrameV3>
  );
}

export default memo(PackWinnerV3);

const s = StyleSheet.create({
  confetti: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, width: 8, height: 14, borderRadius: 3 },
  center: { alignItems: 'center', paddingTop: 24 },
  hero: { width: HERO, height: HERO, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderRadius: 999 },
  haloC: { width: HERO, height: HERO, backgroundColor: HALO_A },
  haloB: { width: HERO * 0.78, height: HERO * 0.78, backgroundColor: HALO_B },
  haloA: { width: HERO * 0.56, height: HERO * 0.56, backgroundColor: HALO_C },
  badge: { position: 'absolute', bottom: 2, minWidth: 56, height: 56, borderRadius: 28, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS_STRONG },
  badgeNum: { fontSize: 40, lineHeight: 46, fontWeight: '800', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
  kicker: { marginTop: 20, fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.muted },
  title: { marginTop: 6, textAlign: 'center', fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text, letterSpacing: -0.3 },
  packRow: { marginTop: 24, alignSelf: 'stretch', minHeight: 64, borderRadius: 22, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GLASS },
  packCover: { width: 48, height: 48, borderRadius: 16 },
  grow: { flex: 1 },
  packTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  num: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
  prize: { marginTop: 12, alignSelf: 'stretch', minHeight: 56, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GLASS },
  prizeText: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
});

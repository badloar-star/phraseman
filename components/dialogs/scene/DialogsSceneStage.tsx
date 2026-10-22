// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneStage.tsx — «Сцена» «Диалогов»: свет и глубина из цветов темы, герой справа, крупный следующий шаг.
//
// зачем (владелец 21.10 «и так же диалоги»; эталон docs/design/v2-app/dialogs-scene-states.html, `.sc`): сцена — основа bgTop → bg с мягким светом bgGlow, в тёмном
// оформлении к основе подмешан акцент темы (стык со сценой и панелью читается); текст лежит прямо на сцене и красится text/secondary темы, а не белым —
// поэтому читается и в светлых темах. Ничего не обрезается: у сцены минимальная высота, при крупном шрифте она растёт вниз, а не режет текст.
// Герой — картинка состояния справа (предмет; смена на собеседника — константа в dialogs_scene_art). Шапка (пилюля остатка | кнопки раздела) — слоты:
// раздел кладёт туда свои «назад», энергию и аватар. Вид — только из пропсов: что показывать, решают pickDialogsSceneState и buildDialogsSceneCopy.
// Движение: смена героя — мягкое появление 280 мс на UI-потоке (с «Уменьшить движение» — сразу); нажатие — 0.97.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { alphaHex } from '../../../constants/v2Style';
import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import V2Pressable from '../../v2/V2Pressable';
import type { DialogsSceneCopy } from './dialogs_scene_copy';
import type { DialogsSceneState } from './dialogs_scene_state';
import type { DialogsSceneColors } from './dialogs_scene_tokens';

const LOG = '[DIALOGS-SCENE]';
/** Высота сцены эталона (.sc 520); при крупном шрифте сцена растёт, а не режет текст. */
export const DIALOGS_SCENE_MIN_HEIGHT = 520;
/** Панель под сценой наезжает на неё (.dpanel margin-top −38). */
export const DIALOGS_SCENE_PANEL_OVERLAP = 38;
const HERO_W = 216;
const HERO_H = 270;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Десять фиксированных делений шкалы ответов; свои id — деления не пересортировываются. */
const METER_SEGMENTS = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'] as const;

export type DialogsSceneStageProps = Readonly<{
  state: DialogsSceneState;
  colors: DialogsSceneColors;
  copy: DialogsSceneCopy;
  art: ImageSourcePropType | null;
  artAccent: ImageSourcePropType | null;
  /** Герой приглушён (нет сети, лимит). */
  artDim: boolean;
  /** Слева в шапке перед пилюлей остатка (например «назад»). */
  topStart?: React.ReactNode;
  /** Справа в шапке (энергия, аватар). */
  topEnd?: React.ReactNode;
  /** Отступ сверху под системную строку и шапку. */
  topInset: number;
  onCta: () => void;
  onRound: () => void;
}>;

function DialogsSceneStage(p: DialogsSceneStageProps) {
  const { colors: c, copy, state } = p;
  const reduceMotion = useReducedMotion();
  const pressCta = () => {
    if (copy.ctaDisabled) { console.warn(LOG, 'cta:ignored', JSON.stringify({ reason: 'cta_disabled', state })); return; } // guard-ok: ранний выход называет причину
    console.log(LOG, 'cta', JSON.stringify({ state, label: copy.cta })); // guard-ok: одна строка на тап
    p.onCta();
  };
  const pressRound = () => {
    console.log(LOG, 'round', JSON.stringify({ state, kind: copy.round })); // guard-ok: одна строка на тап
    p.onRound();
  };
  return (
    <View testID={`dialogs-scene-${state}`} style={s.stage}>
      <LinearGradient colors={[c.top, c.bottom]} start={{ x: 0.42, y: 0 }} end={{ x: 0.58, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="dlgGlowR" cx="84%" cy="14%" rx="70%" ry="46%" fx="84%" fy="14%">
            <Stop offset="0" stopColor={c.glowRight} stopOpacity="1" />
            <Stop offset="1" stopColor={c.glowRight} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="dlgGlowL" cx="8%" cy="0%" rx="60%" ry="42%" fx="8%" fy="0%">
            <Stop offset="0" stopColor={c.glowLeft} stopOpacity="1" />
            <Stop offset="1" stopColor={c.glowLeft} stopOpacity="0" />
          </RadialGradient>
          {c.glowBottom ? (
            <RadialGradient id="dlgGlowB" cx="50%" cy="100%" rx="80%" ry="50%" fx="50%" fy="100%">
              <Stop offset="0" stopColor={c.glowBottom} stopOpacity="1" />
              <Stop offset="1" stopColor={c.glowBottom} stopOpacity="0" />
            </RadialGradient>
          ) : null}
          <RadialGradient id="dlgHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.halo} stopOpacity="1" />
            <Stop offset="0.62" stopColor={c.halo} stopOpacity="0.2" />
            <Stop offset="1" stopColor={c.halo} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dlgGlowR)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dlgGlowL)" />
        {c.glowBottom ? <Rect x="0" y="0" width="100%" height="100%" fill="url(#dlgGlowB)" /> : null}
        <Rect x="58%" y={96} width={HERO_W} height={HERO_H} fill="url(#dlgHalo)" opacity={p.artDim ? 0.45 : 1} />
      </Svg>
      {c.scrim ? <LinearGradient pointerEvents="none" colors={[alphaHex(c.scrim, 0), alphaHex(c.scrim, 0.62)]} style={s.scrim} /> : null}
      {p.art ? (
        <Animated.View key={state} pointerEvents="none" entering={reduceMotion ? undefined : FadeIn.duration(280).easing(EASE_OUT)} style={[s.hero, p.artDim ? s.heroDim : null]}>
          <ThemedArtLayers source={p.art} accent={p.artAccent} style={s.heroImage} contentFit="contain" contentPosition="center" />
        </Animated.View>
      ) : null}
      <View style={[s.top, { paddingTop: p.topInset }]}>
        {p.topStart ?? null}
        {copy.quota ? (
          <View testID="dialogs-scene-quota" style={[s.pill, { backgroundColor: copy.quota.unlimited ? alphaHex(c.accent, 0.26) : c.glass }]}>
            <Ionicons name={copy.quota.unlimited ? 'infinite' : 'chatbubbles-outline'} size={16} color={c.text} />
            <Text style={[s.pillText, { color: c.text }]}>{copy.quota.label}</Text>
          </View>
        ) : null}
        <View style={s.flex} />
        {p.topEnd ?? null}
      </View>
      <View style={s.flex} />
      <View style={s.body}>
        {copy.offlineLine ? (
          <View testID="dialogs-scene-offline" accessibilityLiveRegion="polite" style={[s.offline, { backgroundColor: c.glass }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={c.text} />
            <Text style={[s.offlineText, { color: c.text }]}><Text style={s.bold}>{copy.offlineLine.bold}</Text> {copy.offlineLine.rest}</Text>
          </View>
        ) : null}
        {copy.kicker ? (
          <View style={s.kickRow}>
            {copy.kickerIcon ? <Ionicons name={copy.kickerIcon} size={16} color={c.secondary} /> : null}
            <Text testID="dialogs-scene-kicker" style={[s.kicker, { color: c.secondary }]}>{copy.kicker}</Text>
          </View>
        ) : null}
        <Text testID="dialogs-scene-title" accessibilityRole="header" style={[copy.small ? s.titleSmall : s.title, { color: c.text }]}>{copy.title}</Text>
        {copy.sub ? <Text testID="dialogs-scene-sub" style={[s.sub, { color: c.secondary }]}>{copy.sub}</Text> : null}
        {copy.meterUsed !== null ? (
          <View testID="dialogs-scene-meter" style={s.meter}>
            {METER_SEGMENTS.map((id, i) => <View key={id} style={[s.seg, { backgroundColor: i < (copy.meterUsed ?? 0) ? c.accent : c.track }]} />)}
          </View>
        ) : null}
        {copy.prog || copy.bar !== null ? (
          <View style={s.progRow}>
            {copy.bar !== null ? <View style={[s.bar, { backgroundColor: c.track }]}><View style={[s.barFill, { width: `${Math.round(copy.bar * 100)}%`, backgroundColor: c.accent }]} /></View> : null}
            {copy.prog ? <Text testID="dialogs-scene-prog" style={[s.prog, { color: c.secondary }]}>{copy.prog}</Text> : null}
          </View>
        ) : null}
        <View style={s.ctaRow}>
          <V2Pressable
            testID="dialogs-scene-cta"
            accessibilityRole="button"
            accessibilityLabel={`${copy.cta}: ${copy.title}`}
            accessibilityState={{ disabled: copy.ctaDisabled }}
            onPress={pressCta}
            scaleTo={0.97}
            outerStyle={s.flex}
            style={[s.cta, { backgroundColor: c.cta }, copy.ctaDisabled ? s.ctaOff : null]}
          >
            {copy.ctaIcon ? <Ionicons name={copy.ctaIcon} size={18} color={c.ctaInk} /> : null}
            <Text style={[s.ctaText, { color: c.ctaInk }]} numberOfLines={2}>{copy.cta}</Text>
          </V2Pressable>
          {copy.round ? (
            <V2Pressable testID="dialogs-scene-round" accessibilityRole="button" accessibilityLabel={copy.roundLabel ?? copy.round} onPress={pressRound} scaleTo={0.94} style={[s.round, { backgroundColor: c.glass }]}>
              <Ionicons name={copy.round} size={22} color={c.text} />
            </V2Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // зачем: сцена во всю ширину, скругление только снизу — как .sc (0 0 36 36); minHeight, а не height — крупный шрифт растит сцену
  stage: { minHeight: DIALOGS_SCENE_MIN_HEIGHT, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  flex: { flex: 1 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  hero: { position: 'absolute', right: 10, top: 96, width: HERO_W, height: HERO_H, opacity: 0.96 },
  heroDim: { opacity: 0.55 },
  heroImage: { width: HERO_W, height: HERO_H },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // зачем: текст сцены у нижнего края (.sc-body bottom 56) — место под панель, которая наезжает на 38
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 56 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  offlineText: { flex: 1, fontSize: 13, lineHeight: 17 },
  bold: { fontWeight: '700' },
  kickRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  kicker: { fontSize: 13, lineHeight: 17, flexShrink: 1 },
  title: { marginTop: 4, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  titleSmall: { marginTop: 4, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  sub: { marginTop: 8, fontSize: 16, lineHeight: 21 },
  meter: { flexDirection: 'row', gap: 4, marginTop: 12 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  progRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  bar: { width: 72, height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4 },
  prog: { fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'] },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  cta: { height: 54, borderRadius: 27, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaOff: { opacity: 0.45 },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  round: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});

export default memo(DialogsSceneStage);

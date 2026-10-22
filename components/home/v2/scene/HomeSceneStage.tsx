// ═══════════════════════════════════════════════════════════════════════════
// HomeSceneStage.tsx — «Сцена» Главной: свет и глубина, герой справа, крупный следующий шаг.
//
// зачем (владелец 21.10 ~23:40: «ВАРИАНТ 1 СЦЕНА! ОТЛИЧНО, МНЕ ОЧЕНЬ НРАВИТСЯ!»; эталон docs/design/v2-app/home-new-concepts.html,
// раздел A, под замком 9e9e23b0b): сцена — градиент из токенов темы (homeSceneThemeTokens по эталону home-scene-states.html), свет
// в левом верхнем углу, мягкий ореол за героем, затемнение снизу под текстом; шапка (серия, монеты | энергия, колокол, аватар)
// лежит на сцене стеклом; внизу — место, крупный заголовок, строка прогресса, белая главная кнопка и стеклянные чипы.
// Вид — только из пропсов: что показывать, решают pickHomeSceneState и buildHomeSceneCopy. Перерисовка — по данным:
// обработчики берутся из ref (как у HomeV2ContinueCard), иначе каждый рендер Главной перерисовывал бы сцену.
// Движение: смена героя — мягкое появление 280 мс на UI-потоке, с «Уменьшить движение» — сразу; нажатие — 0.97.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { renderWindowEpoch, useRenderCause } from '../../../../app/render_cause_probe';
import { useScaledTextStyles } from '../../../../hooks/useLineScale';
import { useEnergyCountdown } from '../../../EnergyContext';
import { ThemedArtLayers } from '../../../theme/ThemedArtLayers';
import V2Pressable from '../../../v2/V2Pressable';
import type { HomeSceneChipKind, HomeSceneCopy } from './home_scene_copy';
import type { HomeSceneState } from './home_scene_state';
import type { HomeSceneStageTokens } from './home_scene_tokens';

const LOG = '[HOME-SCENE]';
/** Высота сцены эталона (.a-stage 540); при крупном шрифте сцена растёт, а не режет текст. */
export const HOME_SCENE_STAGE_MIN_HEIGHT = 540;
/** Панель «Сегодня» наезжает на сцену (.a-panel margin-top −38). */
export const HOME_SCENE_PANEL_OVERLAP = 38;
const HERO = 214;
/** Верх шапки внутри сцены (HomeScene: paddingTop 12). */
const HEADER_TOP = 12;
/** Эталон: шапка на 56, герой на 92 — между ними 36. */
const HERO_BELOW_HEADER = 92 - 56;
const HERO_TOP = HEADER_TOP + HERO_BELOW_HEADER;
/** Высота места под шапку внутри сцены (topSpace): герой в слоте свободного места начинается ниже неё, поэтому поднимается на разницу. */
const TOP_SPACE = 64;
/** Системный шрифт крупнее этого: текст сцены вырастает, и герой вписывается в свободное место над ним (а не наезжает на текст). */
const HERO_BOUND_FONT_SCALE = 1.15;
const HERO_PAD = 13;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type HomeSceneChip = Readonly<{ kind: HomeSceneChipKind; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }>;

type Props = {
  state: HomeSceneState;
  evening: boolean;
  tokens: HomeSceneStageTokens;
  copy: HomeSceneCopy;
  /** Где живые минуты до энергии: в заголовке («нет энергии») или в тёплой строке (вечер при 0); null — нигде. */
  liveEnergy: 'title' | 'warm' | null;
  /** Текст с живыми минутами (null — минуты неизвестны). */
  buildLiveText: (minutes: number | null) => string;
  chips: readonly HomeSceneChip[];
  art: ImageSourcePropType | null;
  artAccent: ImageSourcePropType | null;
  /** 0 энергии: герой приглушён. */
  artDim: boolean;
  /** Место продолжения ещё читается с диска — та же геометрия, вместо текста заготовка (первый кадр = финальная геометрия). */
  pending: boolean;
  /** Занятие курса готовится — кнопка приглушена и помечена занятой. */
  busy: boolean;
  onCta: () => void;
  onChip: (kind: HomeSceneChipKind) => void;
};

export default function HomeSceneStage(props: Props) {
  const latestRef = useRef<Props>(props);
  latestRef.current = props;
  const cta = useCallback(() => latestRef.current.onCta(), []);
  const chip = useCallback((kind: HomeSceneChipKind) => latestRef.current.onChip(kind), []);
  const live = useCallback((minutes: number | null) => latestRef.current.buildLiveText(minutes), []);
  return <HomeSceneStageView {...props} onCta={cta} onChip={chip} buildLiveText={live} />;
}

const HomeSceneStageView = memo(function HomeSceneStageView({ state, evening, tokens, copy, liveEnergy, buildLiveText, chips, art, artAccent, artDim, pending, busy, onCta, onChip }: Props) {
  useRenderCause('home:scene', () => ({ state, evening, tokens, copy, liveEnergy, chips, art, artAccent, artDim, pending, busy }), renderWindowEpoch()); // зачем: причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const reduceMotion = useReducedMotion();
  const s = useScaledTextStyles(baseStyles); // зачем (FONTSCALE2): межстрочный растёт вместе с системным шрифтом, иначе строки наезжают
  const { fontScale } = useWindowDimensions();
  const heroBounded = fontScale > HERO_BOUND_FONT_SCALE;
  const pressCta = () => {
    if (pending) { console.warn(LOG, 'cta:ignored', JSON.stringify({ reason: 'pending_skeleton', state })); return; } // guard-ok: ранний выход называет причину
    if (busy) { console.warn(LOG, 'cta:ignored', JSON.stringify({ reason: 'busy_launching', state })); return; } // guard-ok
    console.log(LOG, 'cta', JSON.stringify({ state, label: copy.cta })); // guard-ok: одна строка на тап
    onCta();
  };
  return (
    <View testID="home-scene-stage" style={s.stage}>
      <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="sceneLight" cx={evening ? '82%' : '18%'} cy="0%" rx="70%" ry="50%" fx={evening ? '82%' : '18%'} fy="0%">
            {/* зачем (эталон home-scene-states.html): вечером справа сверху — тёплый свет eveningGlow, угли снизу слева — sceneEmber */}
            <Stop offset="0" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="1" />
            <Stop offset="1" stopColor={evening ? tokens.eveningGlow : tokens.sceneGlow} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sceneHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          {evening ? (
            <RadialGradient id="sceneEmber" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tokens.sceneEmber} stopOpacity="1" />
              <Stop offset="1" stopColor={tokens.sceneEmber} stopOpacity="0" />
            </RadialGradient>
          ) : null}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sceneLight)" />
        <Rect x="58%" y={HERO_TOP + 4} width={220} height={220} fill="url(#sceneHalo)" />
        {evening ? <Rect x={-40} y={HOME_SCENE_STAGE_MIN_HEIGHT - 200} width={260} height={260} fill="url(#sceneEmber)" /> : null}
      </Svg>
      {/* зачем (эталон: у тёмной сцены затемнения низа нет — иначе стык с карточками сливается; шов ≥ 1,34) */}
      {tokens.scrim ? <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.40)']} style={s.scrim} /> : null}
      <View style={s.topSpace} />
      {/* зачем: герой в слоте свободного места (flex 1) между шапкой и текстом: обычный шрифт — как в эталоне (214 от верха слота, поверх текста допустимо), крупный — не выше свободного места */}
      <View style={s.heroSpace} pointerEvents="none">
        {art ? (
          <Animated.View key={state} pointerEvents="none" entering={reduceMotion ? undefined : FadeIn.duration(280).easing(EASE_OUT)} style={[heroBounded ? s.heroBounded : s.hero, artDim ? s.heroDim : null]}>
            <ThemedArtLayers source={art} accent={artAccent} style={s.heroImage} contentFit="contain" contentPosition={heroBounded ? 'right' : 'center'} />
          </Animated.View>
        ) : null}
      </View>
      <View style={s.body}>
        {pending ? (
          <>
            <View style={[s.skel, { width: 150, height: 14 }]} />
            <View style={[s.skel, { width: '72%', height: 30, marginTop: 10 }]} />
            <View style={[s.skel, { width: 120, height: 12, marginTop: 14 }]} />
          </>
        ) : (
          <>
            {copy.kicker ? <Text testID="home-scene-kicker" style={s.kicker}>{copy.kicker}</Text> : null}
            {liveEnergy === 'title'
              ? <LiveEnergyText testID="home-scene-title" header build={buildLiveText} style={s.title} />
              : <Text testID="home-scene-title" accessibilityRole="header" style={s.title}>{copy.title}</Text>}
            {copy.warm ? (
              <View style={s.warmRow}>
                <Ionicons name="flame" size={16} color="#FFD9D0" />
                {liveEnergy === 'warm' ? <LiveEnergyText testID="home-scene-warm" build={buildLiveText} style={s.warm} /> : <Text style={s.warm}>{copy.warm}</Text>}
              </View>
            ) : null}
            {copy.line ? (
              <View style={s.lineRow}>
                {copy.bar !== null ? <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(copy.bar * 100)}%` }]} /></View> : null}
                <Text style={s.line}>{copy.line}</Text>
              </View>
            ) : null}
          </>
        )}
        {copy.cta ? (
          <V2Pressable
            testID="home-scene-cta"
            accessibilityRole="button"
            accessibilityLabel={pending ? copy.cta : `${copy.cta}: ${copy.title}`}
            accessibilityState={{ busy: pending || busy }}
            onPress={pressCta}
            scaleTo={0.97}
            style={[s.cta, busy ? s.ctaBusy : null]}
          >
            <Ionicons name="play" size={18} color="#121318" />
            <Text style={s.ctaText}>{copy.cta}</Text>
          </V2Pressable>
        ) : null}
        {chips.length > 0 ? (
          <View style={s.chips}>
            {chips.map((c) => (
              <V2Pressable key={c.kind} testID={`home-scene-chip-${c.kind}`} accessibilityRole="button" accessibilityLabel={c.label}
                onPress={() => { console.log(LOG, 'chip', JSON.stringify({ state, kind: c.kind })); onChip(c.kind); }} scaleTo={0.96} style={s.chip}>{/* guard-ok: одна строка на тап */}
                <Ionicons name={c.icon} size={16} color="#FFFFFF" />
                <Text style={s.chipText}>{c.label}</Text>
              </V2Pressable>
            ))}
          </View>
        ) : null}
        {copy.note ? <Text style={s.note}>{copy.note}</Text> : null}
      </View>
    </View>
  );
});

/**
 * Живые минуты до энергии. зачем: таймер энергии тикает раз в секунду — подписан только этот текст, сцена не перерисовывается.
 */
function LiveEnergyText({ build, style, testID, header = false }: Readonly<{ build: (minutes: number | null) => string; style: object; testID: string; header?: boolean }>) {
  const { timeUntilNextMs } = useEnergyCountdown({ visible: true });
  const minutes = timeUntilNextMs > 0 ? Math.max(1, Math.ceil(timeUntilNextMs / 60000)) : null;
  return <Text testID={testID} accessibilityRole={header ? 'header' : undefined} style={style}>{build(minutes)}</Text>;
}

const baseStyles = StyleSheet.create({
  // зачем: сцена во всю ширину экрана, скругление только снизу — как .a-stage (0 0 36 36)
  stage: { minHeight: HOME_SCENE_STAGE_MIN_HEIGHT, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', justifyContent: 'space-between' },
  // зачем (проверка картинок 9 · САЙТ 22.10: у 9 из 10 героев предмет почти у края холста): поле 6 % внутри места героя — 13 из 214
  heroSpace: { flex: 1 },
  hero: { position: 'absolute', right: -26, top: HERO_TOP - TOP_SPACE, width: HERO, height: HERO, padding: HERO_PAD, opacity: 0.96 },
  heroBounded: { position: 'absolute', right: -26, top: HERO_TOP - TOP_SPACE, bottom: 4, width: HERO, maxHeight: HERO, padding: HERO_PAD, opacity: 0.96 },
  heroDim: { opacity: 0.55 },
  heroImage: { width: '100%', height: '100%' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  // зачем: место под шапку — сама шапка лежит поверх сцены из контейнера HomeScene
  topSpace: { height: TOP_SPACE },
  // зачем: текст сцены у нижнего края (.a-body bottom 58) — место под панель «Сегодня», которая наезжает на 38
  body: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 58 },
  // зачем (D145, владелец: шрифты 16/13 главнее макета): подписи сцены — 13/17, крупные строки и кнопка — 16/21
  kicker: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 17 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6, marginTop: 4 },
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  warm: { color: '#FFD9D0', /* аудит контраста 22.10: чуть светлее прежнего #FFD0C4 — 4,45 → ≥ 4,5 в светлых sage/grad_aurora */ fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  bar: { width: 72, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#FFFFFF' },
  line: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'] },
  cta: { marginTop: 16, minHeight: 54, paddingVertical: 8, borderRadius: 27, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 22 },
  ctaBusy: { opacity: 0.72 },
  ctaText: { color: '#121318', fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { minHeight: 36, paddingVertical: 4, maxWidth: '100%', borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)' }, // аудит контраста 22.10: чип 14 % вместо 16 % — текст на нём ≥ 4,5 в светлых sage/grad_aurora
  chipText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  note: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 17, marginTop: 12 },
  skel: { borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
});

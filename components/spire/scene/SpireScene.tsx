// ═══════════════════════════════════════════════════════════════════════════
// SpireScene.tsx — «Сцена» Пика компактной высоты: свет темы, слева этаж и награды, справа башня — герой; под сценой панель
// «Комната недели» (своё место, пьедестал 2-1-3, «Все участники»).
//
// зачем (владелец 22.10: «интегрировать пик в общий дизайн, чтобы он не был отдельной частью в отдельном окошке; башня — герой сцены,
// комната недели — всё ещё как пьедестал»; затем владелец 22.10 выбрал вариант 2 scenes-compact.html — «сцены не должны быть такими
// огромными с кучей пустоты», высота всех сцен 46 %): сцена — 392 из 844 вместе со строкой статуса и вкладками «Сообщества»; пьедестал и
// своё место ушли в панель под сценой, она наезжает на низ сцены на 22, как «Сегодня» на Главной. Цвета сцены — homeSceneTokensForTheme
// (всегда уровень «Максимум»), башня — прежний SpireTower в режиме «сцена», тексты и состояние — spire_scene_model, места и размеры —
// spire_scene_layout (сетка без пересечений). Вид — только из пропсов: что показывать, решает экран.
// Кегли — шкала 16/13 (D145: «шрифты 16/13 главнее макета»), заголовок этажа 30/36 — как в варианте 2.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import type { Lang } from '../../../constants/i18n';
import AvatarView from '../../AvatarView';
import { useEnergyCountdown } from '../../EnergyContext';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { useTheme } from '../../ThemeContext';
import { homeSceneTokensForTheme } from '../../home/v2/scene/home_scene_tokens';
import V2Pressable from '../../v2/V2Pressable';
import SpireRankCoin from '../SpireRankCoin';
import SpireTower from '../SpireTower';
import { spireGameText } from '../spire_game_strings';
import type { SpireRankByView } from '../spire_room_types';
import { spireText } from '../spire_strings';
import type { SpireRival } from '../spire_tower_model';
import { useSpirePalette } from '../useSpirePalette';
import SpireScenePodium from './SpireScenePodium';
import type { SpireSceneCopy, SpireSceneDecision, SpireSceneRoom } from './spire_scene_model';
import { setSpireSceneHeaderTint } from './spire_scene_header_tint';
import { SPIRE_SCENE_COPY_BOTTOM, SPIRE_SCENE_PANEL_OVERLAP, spireSceneFrame } from './spire_scene_layout';
import { SPIRE_SCENE_INK } from './spire_scene_palette';
import { spireScenePromoText, spireSceneText } from './spire_scene_strings';

const BASE_COIN_RANK = 0;
/** Рост мелких подписей сцены с системным шрифтом (межстрочный растёт так же — useScaledTextStyles). */
const TEXT_MAX_SCALE = 1.3;
/** Крупный заголовок сцены («Этаж 4» 30) уже крупный и не растёт: иначе на 360 dp переносится и выталкивает текст под вкладки. */
const DISPLAY_MAX_SCALE = 1;

type Props = Readonly<{
  lang: Lang;
  decision: SpireSceneDecision;
  copy: SpireSceneCopy;
  room: SpireSceneRoom;
  rankBy: SpireRankByView;
  /** Камень лиги («Гранит») для строки «Комната недели». */
  tierName: string;
  myCoinRank: number | null;
  myPlus: boolean;
  myFloor: number | null;
  selected: number;
  onSelect: (floor: number) => void;
  rivalsByFloor: ReadonlyMap<number, readonly SpireRival[]>;
  tier: number | null;
  onTouchActive?: (active: boolean) => void;
  onOpenAll: () => void;
  /** Только dev-вход: «6:40» из моков вместо живого отсчёта энергии. */
  energyTime?: string;
  /** «Пик» на экране: верх сцены красит шапку «Сообщества» и полосу под часами (spire_scene_header_tint). dev-вход не красит. */
  headerTint?: boolean;
}>;

/** Живой отсчёт до энергии в заголовке: тикает только этот текст, сцена не перерисовывается. */
function LiveEnergyTitle({ override }: Readonly<{ override?: string }>) {
  const { formattedTime } = useEnergyCountdown({ visible: override === undefined });
  return <Text accessibilityRole="header" testID="spire-scene-title" maxFontSizeMultiplier={DISPLAY_MAX_SCALE} style={s.title}>{override ?? (formattedTime || '—')}</Text>;
}

function SpireScene(p: Props) {
  const { width, height: windowH, fontScale } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const pal = useSpirePalette();
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const evening = p.decision.state === 'eve';
  // зачем: владелец 22.10 — сцена всегда как утверждённый эталон (токены уровня «Максимум» при любом положении ползунка)
  const tokens = useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening), [liquidGlassThemeId, liquidGlassAppearance, evening]);
  const off = p.decision.offlineLine;
  const searching = p.decision.state === 'search';
  const guardChars = useMemo(() => spireText(p.lang, 'guard').toUpperCase().length, [p.lang]);
  // зачем (координатор 22.10, крайние случаи 2 · ДИЗАЙН: шрифт 1,3): межстрочный мелких подписей растёт вместе со шрифтом (до 1,3), буквы не срезаются
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  // зачем (владелец 22.10, вариант 2: высота сцен 46 %; координатор: «сетка без пересечений на 360–430 dp»): высота сцены, окно башни и
  // колонка текста — из одного расчёта: текст кончается левее подписей этажей, ряды соперников — над панелью «Комната недели» (spire_scene_layout)
  const frame = useMemo(() => spireSceneFrame({ width, windowH, topInset: insets.top, fontScale, guardChars }), [width, windowH, insets.top, fontScale, guardChars]);
  const offText = useMemo(() => {
    const full = spireGameText(p.lang, 'offline');
    const cut = full.indexOf('. ');
    return cut > 0 ? { bold: full.slice(0, cut + 1), rest: full.slice(cut + 1) } : { bold: full, rest: '' };
  }, [p.lang]);
  const glow = evening ? tokens.eveningGlow : tokens.sceneGlow;
  const haloSize = Math.round(frame.towerW * 0.9);
  // зачем (эталон: сцена уходит под вкладки и под часы): пока «Пик» на экране — верхний цвет сцены шапке «Сообщества» и полосе статуса
  useEffect(() => {
    if (!p.headerTint) return undefined;
    setSpireSceneHeaderTint(tokens.sceneTop);
    return () => setSpireSceneHeaderTint(null);
  }, [p.headerTint, tokens.sceneTop]);
  const promo = p.room.placesToPromo !== null && p.room.placesToPromo > 0 ? spireScenePromoText(p.lang, p.room.placesToPromo, false) : null;
  return (
    <View>
      <View testID={`spire-scene-${p.decision.state}`} style={[s.stage, { height: frame.sceneH }]}>
        <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="spireSceneLight" cx={evening ? '82%' : '18%'} cy="0%" rx="70%" ry="50%" fx={evening ? '82%' : '18%'} fy="0%">
              <Stop offset="0" stopColor={glow} stopOpacity="1" />
              <Stop offset="1" stopColor={glow} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="spireSceneHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={SPIRE_SCENE_INK.text} stopOpacity="0.22" />
              <Stop offset="0.7" stopColor={SPIRE_SCENE_INK.text} stopOpacity="0" />
            </RadialGradient>
            {evening ? (
              <RadialGradient id="spireSceneEmber" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tokens.sceneEmber} stopOpacity="1" />
                <Stop offset="0.68" stopColor={tokens.sceneEmber} stopOpacity="0" />
              </RadialGradient>
            ) : null}
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#spireSceneLight)" />
          {/* мягкий ореол за башней (как .glow варианта 2: за героем справа) */}
          <Rect x={width - haloSize} y={8} width={haloSize} height={haloSize} fill="url(#spireSceneHalo)" />
          {evening ? <Rect x={-40} y={frame.sceneH - 200} width={260} height={260} fill="url(#spireSceneEmber)" /> : null}
        </Svg>
        {tokens.scrim ? <LinearGradient pointerEvents="none" colors={[SPIRE_SCENE_INK.clear, SPIRE_SCENE_INK.scrim]} style={s.scrim} /> : null}
        <View style={[s.tower, { width: frame.towerW, left: frame.towerLeft, top: frame.windowTop }]}>
          <SpireTower
            variant="scene"
            lang={p.lang}
            myFloor={p.myFloor}
            selected={p.selected}
            onSelect={p.onSelect}
            myCoinRank={p.myCoinRank}
            rivalsByFloor={p.rivalsByFloor}
            dimRivals={off}
            tier={p.tier}
            windowHeight={frame.windowH}
            sceneRowsClearBottom={frame.rowsClearBottom}
            onTouchActive={p.onTouchActive}
          />
        </View>
        <View testID="spire-scene-copy" style={[s.copy, { bottom: SPIRE_SCENE_COPY_BOTTOM, width: frame.copyW }]}>
          <Text style={ts.kicker} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.kicker}</Text>
          {p.copy.kicker2 ? <Text style={ts.kicker} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.kicker2}</Text> : null}
          {p.copy.liveEnergyTitle ? <LiveEnergyTitle override={p.energyTime} /> : <Text accessibilityRole="header" testID="spire-scene-title" maxFontSizeMultiplier={DISPLAY_MAX_SCALE} style={s.title}>{p.copy.title}</Text>}
          {p.copy.warm ? (
            <View style={s.warmRow}>
              <Ionicons name="trending-up" size={16} color={SPIRE_SCENE_INK.warm} style={s.warmIcon} />
              <Text style={ts.warm} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.warm}</Text>
            </View>
          ) : null}
          {p.copy.line ? (
            <View style={s.lineRow}>
              {p.copy.bar !== null ? <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(p.copy.bar * 100)}%` }]} /></View> : null}
              <Text style={ts.line} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.line}</Text>
            </View>
          ) : null}
          {p.copy.rewards.length > 0 ? (
            <View style={s.rewards}>
              {p.copy.rewards.map((r) => (
                <View key={r} style={s.reward}>
                  <AvatarView avatar="" coinRank={BASE_COIN_RANK} size={20} />
                  <Text style={ts.rewardText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{r}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {off ? (
          <View testID="spire-scene-offline" style={s.offline} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={18} color={SPIRE_SCENE_INK.text} />
            <Text style={ts.offlineText} maxFontSizeMultiplier={TEXT_MAX_SCALE}><Text style={s.offlineBold}>{offText.bold}</Text>{offText.rest}</Text>
          </View>
        ) : null}
      </View>
      {/* зачем (владелец 22.10, вариант 2 scenes-compact.html): «Комната недели» — панель под сценой, наезжает на её низ на 22; своё место,
          пьедестал и вход во «Все участники» — здесь, в цветах темы (не на свету сцены) */}
      <View testID="spire-scene-me" style={[s.panel, { backgroundColor: pal.card, marginTop: -SPIRE_SCENE_PANEL_OVERLAP }, off ? s.dim : null]}>
        <V2Pressable
          testID="spire-scene-all"
          onPress={p.onOpenAll}
          disabled={searching || p.room.count === 0}
          accessibilityRole="button"
          accessibilityLabel={p.room.count > 0 ? `${spireText(p.lang, 'allMembers')}, ${p.room.count}` : spireText(p.lang, 'allMembers')}
          scaleTo={0.98}
          style={s.panelHead}
        >
          <Text style={[ts.panelTitle, { color: pal.text }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{`${spireText(p.lang, 'roomWeek')} · ${p.tierName}`}</Text>
          <Text style={[ts.panelCount, { color: pal.textSecondary }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{searching ? '…' : String(p.room.count)}</Text>
          <Ionicons name="chevron-forward" size={18} color={pal.textSecondary} />
        </V2Pressable>
        <View style={s.meRow}>
          {searching ? (
            <View style={s.meText}>
              <Text style={[ts.meValue, { color: pal.text }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireSceneText(p.lang, 'searching')}</Text>
              <Text style={[ts.meSub, { color: pal.textSecondary }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireSceneText(p.lang, 'yourLevelRoom')}</Text>
            </View>
          ) : (
            <>
              <SpireRankCoin rank={p.myCoinRank} size={30} plus={p.myPlus} />
              <View style={s.meText}>
                <Text style={[ts.meValue, { color: pal.text }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.room.myPlace !== null ? spireSceneText(p.lang, 'place', { n: p.room.myPlace }) : '—'}</Text>
                {promo ? (
                  <View style={s.meSubRow}>
                    <Ionicons name="arrow-up" size={13} color={pal.textSecondary} />
                    <Text style={[ts.meSub, { color: pal.textSecondary }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{promo}</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
        <SpireScenePodium lang={p.lang} top={p.room.top} rankBy={p.rankBy} loading={searching} dim={off} />
      </View>
    </View>
  );
}

export default memo(SpireScene);

const s = StyleSheet.create({
  // зачем (вариант 2, .sc): сцена во всю ширину, скругление только снизу 32
  stage: { overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  tower: { position: 'absolute' },
  copy: { position: 'absolute', left: 20 },
  kicker: { color: SPIRE_SCENE_INK.kicker, fontSize: 13, lineHeight: 17 },
  title: { color: SPIRE_SCENE_INK.text, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  warmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  warmIcon: { marginTop: 2 },
  warm: { color: SPIRE_SCENE_INK.warm, fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bar: { width: 56, height: 4, borderRadius: 2, backgroundColor: SPIRE_SCENE_INK.barTrack, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: SPIRE_SCENE_INK.text },
  line: { color: SPIRE_SCENE_INK.line, fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'] }, // guard-ok: «ступень 7 из 8» — строка прогресса этажа (эталон V2), не подпись-расшифровка
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reward: { minHeight: 30, maxWidth: '100%', borderRadius: 15, paddingLeft: 6, paddingRight: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SPIRE_SCENE_INK.glass },
  rewardText: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17, fontWeight: '700', flexShrink: 1 },
  // зачем (вариант 2, .pn): панель «Комната недели» — карточка темы без рамки, скругление 24, поверх низа сцены
  panel: { marginHorizontal: 16, borderRadius: 24, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  panelTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  panelCount: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  meText: { flex: 1, minWidth: 0 },
  meValue: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  meSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meSub: { fontSize: 13, lineHeight: 17, flexShrink: 1 }, // guard-ok: «2 места до повышения» — данные места (эталон V2), не подпись-расшифровка
  offline: { position: 'absolute', top: 8, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: SPIRE_SCENE_INK.glass },
  offlineText: { flex: 1, color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17 },
  offlineBold: { fontWeight: '700' },
  dim: { opacity: 0.55 },
});

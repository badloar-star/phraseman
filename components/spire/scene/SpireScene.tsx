// ═══════════════════════════════════════════════════════════════════════════
// SpireScene.tsx — «Сцена» Пика (V2 «Пьедестал перед башней»): свет темы, башня — герой справа, этаж и награды слева, своё место,
// пьедестал 2-1-3 «Комнаты недели» во всю ширину перед башней, «Все участники».
//
// зачем (владелец 22.10: «интегрировать пик в общий дизайн, чтобы он не был отдельной частью в отдельном окошке; башня — герой сцены,
// комната недели — всё ещё как пьедестал»; выбран V2, эталон docs/design/v2-app/peak-scene-v2.html под замком 3ea39f80c):
// цвета сцены — homeSceneTokensForTheme (всегда уровень «Максимум», как утверждённый эталон), башня — прежний SpireTower в режиме
// «сцена» (без плиты и окна), тексты и состояние — spire_scene_model. Вид — только из пропсов: что показывать, решает экран.
// Горизонталь — доли ширины эталона (430), вертикаль — постоянные места эталона (сцена 760 минус строка статуса и вкладки).
// Кегли — шкала 16/13 (D145: «шрифты 16/13 главнее макета»), заголовки 40/26/22 — как в эталоне.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Lang } from '../../../constants/i18n';
import AvatarView from '../../AvatarView';
import { useEnergyCountdown } from '../../EnergyContext';
import { useTheme } from '../../ThemeContext';
import { homeSceneTokensForTheme } from '../../home/v2/scene/home_scene_tokens';
import V2Pressable from '../../v2/V2Pressable';
import SpireRankCoin from '../SpireRankCoin';
import SpireTower from '../SpireTower';
import { spireGameText } from '../spire_game_strings';
import type { SpireRankByView } from '../spire_room_types';
import { spireText } from '../spire_strings';
import type { SpireRival } from '../spire_tower_model';
import SpireScenePodium from './SpireScenePodium';
import type { SpireSceneCopy, SpireSceneDecision, SpireSceneRoom } from './spire_scene_model';
import { SPIRE_SCENE_INK } from './spire_scene_palette';
import { spireScenePromoText, spireSceneText } from './spire_scene_strings';

/** Ширина эталона: горизонтальные места сцены — доли от неё. */
const BASE_W = 430;
/** Высота сцены (эталон: сцена 760, из них 112 — строка статуса и вкладки «Сообщества», их рисует экран над сценой). */
export const SPIRE_SCENE_H = 648;
const TOWER = Object.freeze({ top: 38, h: 450, w: 240, right: -6 });
const HALO = Object.freeze({ top: 38, size: 260, right: 12 });
const COPY_TOP = 12;
/** «Нет сети» стоит строкой сверху — текст сцены опускается под неё (эталон: 116 → 184). */
const COPY_TOP_OFFLINE = 76;
const ME_TOP = 336;
/** Низ блоков пьедестала (эталон 680 − 112). */
const PODIUM_BOTTOM = 568;
/** Строка «Все участники» высотой 44 (касание), текст — на месте эталона (588). */
const LINK_TOP = 576;
const BASE_COIN_RANK = 0;

type Props = Readonly<{
  lang: Lang;
  decision: SpireSceneDecision;
  copy: SpireSceneCopy;
  room: SpireSceneRoom;
  rankBy: SpireRankByView;
  /** Камень лиги («Гранит») для строки своего места. */
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
  /** Справа сверху — энергия Пика (пока строка вкладок «Сообщества» не стоит на сцене, шаг 3b-2). */
  topRight?: React.ReactNode;
}>;

/** Живой отсчёт до энергии в заголовке: тикает только этот текст, сцена не перерисовывается. */
function LiveEnergyTitle({ override }: Readonly<{ override?: string }>) {
  const { formattedTime } = useEnergyCountdown({ visible: override === undefined });
  return <Text accessibilityRole="header" testID="spire-scene-title" style={s.title}>{override ?? (formattedTime || '—')}</Text>;
}

function SpireScene(p: Props) {
  const { width } = useWindowDimensions();
  const k = width / BASE_W;
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const evening = p.decision.state === 'eve';
  // зачем: владелец 22.10 — сцена всегда как утверждённый эталон (токены уровня «Максимум» при любом положении ползунка)
  const tokens = useMemo(() => homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening), [liquidGlassThemeId, liquidGlassAppearance, evening]);
  const off = p.decision.offlineLine;
  const searching = p.decision.state === 'search';
  const towerW = Math.round(TOWER.w * k);
  // зачем: текст не заходит на башню — справа от него остаётся место под номера этажей и монеты соперников (как в эталоне: 184 из 430)
  const copyW = Math.max(132, Math.round(width - towerW - 6));
  const haloSize = Math.round(HALO.size * k);
  const offText = useMemo(() => {
    const full = spireGameText(p.lang, 'offline');
    const cut = full.indexOf('. ');
    return cut > 0 ? { bold: full.slice(0, cut + 1), rest: full.slice(cut + 1) } : { bold: full, rest: '' };
  }, [p.lang]);
  const glow = evening ? tokens.eveningGlow : tokens.sceneGlow;
  return (
    <View testID={`spire-scene-${p.decision.state}`} style={[s.stage, { height: SPIRE_SCENE_H }]}>
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
        {/* мягкий ореол за башней (эталон .a-glow: справа 12, сверху 150 − 112, 260 × 260) */}
        <Rect x={width - Math.round(HALO.right * k) - haloSize} y={HALO.top} width={haloSize} height={haloSize} fill="url(#spireSceneHalo)" />
        {evening ? <Rect x={-40} y={SPIRE_SCENE_H - 200} width={260} height={260} fill="url(#spireSceneEmber)" /> : null}
      </Svg>
      {tokens.scrim ? <LinearGradient pointerEvents="none" colors={[SPIRE_SCENE_INK.clear, SPIRE_SCENE_INK.scrim]} style={s.scrim} /> : null}
      <View style={[s.tower, { width: towerW, right: TOWER.right, top: TOWER.top }]}>
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
          windowHeight={TOWER.h}
          onTouchActive={p.onTouchActive}
        />
      </View>
      <View testID="spire-scene-copy" style={[s.copy, { top: off ? COPY_TOP_OFFLINE : COPY_TOP, width: copyW }]}>
        <Text style={s.kicker}>{p.copy.kicker}</Text>
        {p.copy.kicker2 ? <Text style={s.kicker}>{p.copy.kicker2}</Text> : null}
        {p.copy.liveEnergyTitle ? <LiveEnergyTitle override={p.energyTime} /> : <Text accessibilityRole="header" testID="spire-scene-title" style={s.title}>{p.copy.title}</Text>}
        {p.copy.warm ? (
          <View style={s.warmRow}>
            <Ionicons name="trending-up" size={16} color={SPIRE_SCENE_INK.warm} style={s.warmIcon} />
            <Text style={s.warm}>{p.copy.warm}</Text>
          </View>
        ) : null}
        {p.copy.line ? (
          <View style={s.lineRow}>
            {p.copy.bar !== null ? <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(p.copy.bar * 100)}%` }]} /></View> : null}
            <Text style={s.line}>{p.copy.line}</Text>
          </View>
        ) : null}
        {p.copy.rewards.length > 0 ? (
          <View style={s.rewards}>
            {p.copy.rewards.map((r) => (
              <View key={r} style={s.reward}>
                <AvatarView avatar="" coinRank={BASE_COIN_RANK} size={20} />
                <Text style={s.rewardText}>{r}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View testID="spire-scene-me" style={[s.me, { top: ME_TOP }, off ? s.dim : null]}>
        <Text style={s.meLabel}>{`${spireText(p.lang, 'roomWeek')} · ${p.tierName}`}</Text>
        {searching ? (
          <>
            <Text style={s.meValue}>{spireSceneText(p.lang, 'searching')}</Text>
            <Text style={s.meSub}>{spireSceneText(p.lang, 'yourLevelRoom')}</Text>
          </>
        ) : (
          <>
            <View style={s.meValueRow}>
              <SpireRankCoin rank={p.myCoinRank} size={30} plus={p.myPlus} />
              <Text style={s.meValue}>{p.room.myPlace !== null ? spireSceneText(p.lang, 'place', { n: p.room.myPlace }) : '—'}</Text>
            </View>
            {p.room.placesToPromo !== null && p.room.placesToPromo > 0 ? (
              <View style={s.meSubRow}>
                <Ionicons name="arrow-up" size={13} color={SPIRE_SCENE_INK.up} />
                <Text style={s.meSub}>{spireScenePromoText(p.lang, p.room.placesToPromo, false)}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      <View style={[s.podium, { bottom: SPIRE_SCENE_H - PODIUM_BOTTOM }]}>
        <SpireScenePodium lang={p.lang} top={p.room.top} rankBy={p.rankBy} loading={searching} dim={off} />
      </View>
      <View style={[s.linkWrap, { top: LINK_TOP }, off ? s.dim : null]}>
        <V2Pressable
          testID="spire-scene-all"
          onPress={p.onOpenAll}
          disabled={searching || p.room.count === 0}
          accessibilityRole="button"
          accessibilityLabel={p.room.count > 0 ? `${spireText(p.lang, 'allMembers')}, ${p.room.count}` : spireText(p.lang, 'allMembers')}
          scaleTo={0.98}
          style={s.link}
        >
          <Text style={s.linkText}>{`${spireText(p.lang, 'allMembers')} `}<Text style={s.linkCount}>{searching ? '…' : String(p.room.count)}</Text></Text>
          <Ionicons name="chevron-forward" size={18} color={SPIRE_SCENE_INK.label} style={s.linkChevron} />
        </V2Pressable>
      </View>
      {off ? (
        <View testID="spire-scene-offline" style={[s.offline, p.topRight ? s.offlineBesideTop : null]} accessibilityLiveRegion="polite">
          <Ionicons name="cloud-offline-outline" size={18} color={SPIRE_SCENE_INK.text} />
          <Text style={s.offlineText}><Text style={s.offlineBold}>{offText.bold}</Text>{offText.rest}</Text>
        </View>
      ) : null}
      {p.topRight ? <View style={s.topRight}>{p.topRight}</View> : null}
    </View>
  );
}

export default memo(SpireScene);

const s = StyleSheet.create({
  // зачем (эталон .pk2 .a-stage): сцена во всю ширину, скругление только снизу 36
  stage: { overflow: 'hidden', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  tower: { position: 'absolute' },
  copy: { position: 'absolute', left: 20 },
  kicker: { color: SPIRE_SCENE_INK.kicker, fontSize: 13, lineHeight: 17 },
  title: { color: SPIRE_SCENE_INK.text, fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  warmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  warmIcon: { marginTop: 2 },
  warm: { color: SPIRE_SCENE_INK.warm, fontSize: 16, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  bar: { width: 48, height: 4, borderRadius: 2, backgroundColor: SPIRE_SCENE_INK.barTrack, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: SPIRE_SCENE_INK.text },
  line: { color: SPIRE_SCENE_INK.line, fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'] }, // guard-ok: «ступень 7 из 8» — строка прогресса этажа (эталон V2), не подпись-расшифровка
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reward: { height: 30, borderRadius: 15, paddingLeft: 6, paddingRight: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SPIRE_SCENE_INK.glass },
  rewardText: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  me: { position: 'absolute', left: 20, right: 20 },
  meLabel: { color: SPIRE_SCENE_INK.label, fontSize: 13, lineHeight: 17 }, // guard-ok: «Комната недели · Гранит» — заголовок блока своего места (эталон V2), не подпись-расшифровка
  meValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  meValue: { color: SPIRE_SCENE_INK.text, fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  meSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  meSub: { color: SPIRE_SCENE_INK.kicker, fontSize: 13, lineHeight: 17 }, // guard-ok: «2 места до повышения» — данные места (эталон V2), не подпись-расшифровка
  podium: { position: 'absolute', left: 0, right: 0 },
  linkWrap: { position: 'absolute', left: 20, right: 20 },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  linkText: { color: SPIRE_SCENE_INK.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  linkCount: { color: SPIRE_SCENE_INK.muted, fontWeight: '400' },
  linkChevron: { marginLeft: 'auto' },
  offline: { position: 'absolute', top: 8, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: SPIRE_SCENE_INK.glass },
  offlineText: { flex: 1, color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17 },
  offlineBold: { fontWeight: '700' },
  // «Нет сети» не заходит под энергию справа сверху
  offlineBesideTop: { right: 84 },
  topRight: { position: 'absolute', top: 14, right: 20 },
  dim: { opacity: 0.55 },
});

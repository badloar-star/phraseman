// ═══════════════════════════════════════════════════════════════════════════
// SpireScene.tsx — «Сцена» Пика: свет темы, башня целиком — герой справа, этаж и награды слева; ниже сцены — «Комната недели»:
// своё место и пьедестал 2-1-3, вся карточка ведёт во «Все участники».
//
// зачем (владелец 22.10: «интегрировать пик в общий дизайн… башня — герой сцены, комната недели — всё ещё как пьедестал»; эталон V2
// peak-scene-v2.html; владелец 22.10 кнопкой: «Сцена выше, башня крупнее» — Пик исключение из правила 46 %): сцена почти на весь экран,
// башня видна ЦЕЛИКОМ в масштабе эталона V2 и стоит над закреплённой «Играть»; «Комната недели» и пьедестал — ниже, прокруткой.
// Владелец 22.10: «НАДО, ЧТОБЫ АВАТАРКИ НАЖИМАЛИСЬ» — соперник на башне, призёр, своё место и своя метка открывают карточку игрока
// (та же, что в «Друзьях»); данные — из кэша комнаты, без новых чтений. Цвета сцены — homeSceneTokensForTheme (уровень «Максимум»),
// башня — SpireTower в режиме «сцена», тексты — spire_scene_model. Кегли — шкала 16/13 (D145), заголовки 40/26 — как в эталоне V2.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import type { Lang } from '../../../constants/i18n';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import AvatarView from '../../AvatarView';
import { useEnergyCountdown } from '../../EnergyContext';
import type { PlayerInfo } from '../../PlayerProfileModal';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { useTheme } from '../../ThemeContext';
import { homeSceneTokensForTheme } from '../../home/v2/scene/home_scene_tokens';
import V2Pressable from '../../v2/V2Pressable';
import SpireRankCoin from '../SpireRankCoin';
import SpireTower from '../SpireTower';
import { spireGameText } from '../spire_game_strings';
import type { SpireMemberRow, SpireRankByView } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { spireTowerHeadroom } from '../spire_tower_bounds';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, type SpireRival } from '../spire_tower_model';
import { useSpirePalette } from '../useSpirePalette';
import SpirePlayerCard from './SpirePlayerCard';
import SpireScenePodium from './SpireScenePodium';
import type { SpireSceneCopy, SpireSceneDecision, SpireSceneRoom } from './spire_scene_model';
import { setSpireSceneHeaderTint } from './spire_scene_header_tint';
import { SPIRE_SCENE_BASE_W, SPIRE_SCENE_PANEL_OVERLAP, spireSceneFrame, spireSceneVisibleH } from './spire_scene_layout';
import { SPIRE_SCENE_INK } from './spire_scene_palette';
import { spireScenePromoText, spireSceneText } from './spire_scene_strings';

const HALO = Object.freeze({ top: 38, size: 260, right: 12 });
const COPY_TOP = 12;
/** «Нет сети» стоит строкой сверху — текст сцены опускается под неё (эталон: 116 → 184). */
const COPY_TOP_OFFLINE = 76;
const BASE_COIN_RANK = 0;
/** Рост мелких подписей сцены с системным шрифтом (межстрочный растёт так же — useScaledTextStyles). */
const TEXT_MAX_SCALE = 1.3;
/** Крупные числа-заголовки сцены («Этаж 4» 40) уже крупные и не растут: иначе на 360 dp «Этаж 4» переносится. */
const DISPLAY_MAX_SCALE = 1;
/** dev-вход без экрана Пика: от низа экрана до верха «Играть» — нижнее меню и кнопка, dp. */
const DEFAULT_DOCK_CLEAR = 150;
const LOG_TAP = '[SPIRE-TAP]';

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
  /** «Пик» на экране: верх сцены красит шапку «Сообщества» и полосу под часами (spire_scene_header_tint). dev-вход не красит. */
  headerTint?: boolean;
  /** Все строки комнаты (кэш комнаты недели): карточка игрока по тапу берёт данные отсюда — без новых чтений. */
  members?: readonly SpireMemberRow[] | null;
  /** От низа экрана до верха закреплённой «Играть», dp: башня целиком стоит над кнопкой. */
  dockClear?: number;
}>;

/** Живой отсчёт до энергии в заголовке: тикает только этот текст, сцена не перерисовывается. */
function LiveEnergyTitle({ override }: Readonly<{ override?: string }>) {
  const { formattedTime } = useEnergyCountdown({ visible: override === undefined });
  return <Text accessibilityRole="header" testID="spire-scene-title" maxFontSizeMultiplier={DISPLAY_MAX_SCALE} style={s.title}>{override ?? (formattedTime || '—')}</Text>;
}

function SpireScene(p: Props) {
  const { width, height: windowH, fontScale } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const k = width / SPIRE_SCENE_BASE_W;
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
  // зачем (владелец 22.10: «башня вся»): запас сверху — граница короны своей лиги (острие, навершие, ореол), как у самой башни
  const headroom = useMemo(() => spireTowerHeadroom(spireSkinForTier(p.tier), p.myFloor === SPIRE_FLOOR_COUNT), [p.tier, p.myFloor]);
  // зачем (владелец 22.10 кнопкой: «Сцена выше, башня крупнее»): видимая под шапкой высота до верха «Играть» — башня целиком над кнопкой
  const visibleH = spireSceneVisibleH(windowH, insets.top, p.dockClear ?? DEFAULT_DOCK_CLEAR);
  const frame = useMemo(() => spireSceneFrame({ width, visibleH, fontScale, guardChars, headroom }), [width, visibleH, fontScale, guardChars, headroom]);
  const haloSize = Math.round(HALO.size * k);
  const offText = useMemo(() => {
    const full = spireGameText(p.lang, 'offline');
    const cut = full.indexOf('. ');
    return cut > 0 ? { bold: full.slice(0, cut + 1), rest: full.slice(cut + 1) } : { bold: full, rest: '' };
  }, [p.lang]);
  const glow = evening ? tokens.eveningGlow : tokens.sceneGlow;
  // зачем (эталон: сцена уходит под вкладки и под часы): пока «Пик» на экране — верхний цвет сцены шапке «Сообщества» и полосе статуса
  useEffect(() => {
    if (!p.headerTint) return undefined;
    setSpireSceneHeaderTint(tokens.sceneTop);
    return () => setSpireSceneHeaderTint(null);
  }, [p.headerTint, tokens.sceneTop]);
  // зачем (координатор 22.10: «логи [SPIRE-LAYOUT] — высота башни и видимые этажи»): один раз на смену сетки — масштаб, размер, окно, что видно
  useEffect(() => {
    const topUnit = SPIRE_TOWER_GEOM.height - frame.windowH / frame.scale;
    const shown = SPIRE_TOWER_GEOM.floors.filter((fl) => fl.y >= topUnit - 0.5).map((fl) => fl.f);
    console.log('[SPIRE-LAYOUT]', JSON.stringify({ // guard-ok: журнал сетки Пика (координатор 22.10)
      width, windowH, visibleH: Math.round(visibleH), fontScale, tier: p.tier, myFloor: p.myFloor, headroom: Math.round(headroom),
      scale: Number(frame.scale.toFixed(3)), towerW: frame.towerW, towerH: Math.round(frame.windowH), towerLeft: frame.towerLeft,
      windowTop: Math.round(frame.windowTop), sceneH: frame.sceneH, floors: shown.length > 0 ? `${shown[0]}–${shown[shown.length - 1]}` : 'none',
      crown: topUnit <= SPIRE_TOWER_GEOM.top - headroom + 0.5, wordsHidden: frame.wordsHidden, copyW: frame.copyW,
    }));
  }, [frame, width, windowH, visibleH, fontScale, headroom, p.tier, p.myFloor]);
  // зачем (владелец 22.10: «аватарки нажимались»): карточка игрока — по строке комнаты (кэш недели); нет строки — журнал причины, без окна
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const members = p.members ?? null;
  const me = useMemo(() => members?.find((m) => m.isMe) ?? null, [members]);
  const byUid = useMemo(() => new Map((members ?? []).map((m) => [m.uid, m] as const)), [members]);
  const openMember = useCallback((m: SpireMemberRow | null, from: string) => {
    if (!m) {
      console.log(LOG_TAP, JSON.stringify({ from, opened: false, reason: members === null ? 'room_not_loaded' : 'no_member_row' })); // guard-ok: ранний выход
      return;
    }
    console.log(LOG_TAP, JSON.stringify({ from, uid: m.uid, isMe: m.isMe, opened: true })); // guard-ok: одна строка на тап
    setPlayer({ name: m.name, points: p.rankBy === 'coins' ? (m.weekCoins ?? 0) : m.steps, isMe: m.isMe, uid: m.uid, coinRank: m.coinRank ?? null, isPremium: m.isPremium === true });
  }, [members, p.rankBy]);
  const onPressRival = useCallback((uid: string) => openMember(byUid.get(uid) ?? null, 'tower_rival'), [byUid, openMember]);
  const onPressMe = useCallback(() => openMember(me, 'tower_marker'), [me, openMember]);
  const onPressPodium = useCallback((m: SpireMemberRow) => openMember(m, 'podium'), [openMember]);
  const onPressMyPlace = useCallback(() => openMember(me, 'my_place'), [me, openMember]);
  const closePlayer = useCallback(() => setPlayer(null), []);
  const promo = p.room.placesToPromo !== null && p.room.placesToPromo > 0 ? spireScenePromoText(p.lang, p.room.placesToPromo, false) : null;
  const roomEmpty = searching || p.room.count === 0;
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
          {/* мягкий ореол за башней (эталон .a-glow: справа 12, сверху 150 − 112, 260 × 260) */}
          <Rect x={width - Math.round(HALO.right * k) - haloSize} y={HALO.top} width={haloSize} height={haloSize} fill="url(#spireSceneHalo)" />
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
            hideFloorWords={frame.wordsHidden}
            onTouchActive={p.onTouchActive}
            onPressRival={onPressRival}
            onPressMore={p.onOpenAll}
            onPressMe={onPressMe}
          />
        </View>
        <View testID="spire-scene-copy" style={[s.copy, { top: off ? COPY_TOP_OFFLINE : COPY_TOP, width: frame.copyW }]}>
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
          // зачем (аудит кнопок Ревизора 22.10, F6): плашка «нет сети» лежит поверх верха башни — касания проходят сквозь неё к этажам
          <View testID="spire-scene-offline" pointerEvents="none" style={s.offline} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={18} color={SPIRE_SCENE_INK.text} />
            <Text style={ts.offlineText} maxFontSizeMultiplier={TEXT_MAX_SCALE}><Text style={s.offlineBold}>{offText.bold}</Text>{offText.rest}</Text>
          </View>
        ) : null}
      </View>
      {/* зачем (владелец 22.10 кнопкой: «Комната недели» и пьедестал — ниже, прокруткой; аудит Ревизора F3: вся карточка нажимается):
          карточка темы наезжает на низ сцены на 22; тап по ней — «Все участники», по призёру и своей монете — карточка игрока */}
      <V2Pressable
        testID="spire-scene-all"
        onPress={p.onOpenAll}
        disabled={roomEmpty}
        accessibilityRole="button"
        accessibilityLabel={p.room.count > 0 ? `${spireText(p.lang, 'allMembers')}, ${p.room.count}` : spireText(p.lang, 'allMembers')}
        scaleTo={0.99}
        style={[s.panel, { backgroundColor: pal.card, marginTop: -SPIRE_SCENE_PANEL_OVERLAP }, off ? s.dim : null]}
      >
        <View style={s.panelHead}>
          <Text style={[ts.panelTitle, { color: pal.text }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{`${spireText(p.lang, 'roomWeek')} · ${p.tierName}`}</Text>
          <Text style={[ts.panelCount, { color: pal.textSecondary }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{searching ? '…' : String(p.room.count)}</Text>
          <Ionicons name="chevron-forward" size={18} color={pal.textSecondary} />
        </View>
        <View testID="spire-scene-me" style={s.meRow}>
          {searching ? (
            <View style={s.meText}>
              <Text style={[ts.meValue, { color: pal.text }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireSceneText(p.lang, 'searching')}</Text>
              <Text style={[ts.meSub, { color: pal.textSecondary }]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{spireSceneText(p.lang, 'yourLevelRoom')}</Text>
            </View>
          ) : (
            <>
              <V2Pressable testID="spire-scene-my-coin" onPress={onPressMyPlace} accessibilityRole="button" accessibilityLabel={spireSceneText(p.lang, 'place', { n: p.room.myPlace ?? 0 })} hitSlop={7} scaleTo={0.92}>
                <SpireRankCoin rank={p.myCoinRank} size={30} plus={p.myPlus} />
              </V2Pressable>
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
        <SpireScenePodium lang={p.lang} top={p.room.top} rankBy={p.rankBy} loading={searching} dim={off} onPressMember={onPressPodium} />
      </V2Pressable>
      <SpirePlayerCard player={player} myName={me?.name ?? ''} onClose={closePlayer} />
    </View>
  );
}

export default memo(SpireScene);

const s = StyleSheet.create({
  // зачем (scenes-compact .sc): сцена во всю ширину, скругление только снизу 32
  stage: { overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
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
  reward: { minHeight: 30, maxWidth: '100%', borderRadius: 15, paddingLeft: 6, paddingRight: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: SPIRE_SCENE_INK.glass },
  rewardText: { color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17, fontWeight: '700', flexShrink: 1 },
  // зачем (scenes-compact .pn): «Комната недели» — карточка темы без рамки, скругление 24, поверх низа сцены
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

// ═══════════════════════════════════════════════════════════════════════════
// SpireScene.tsx — «Сцена» Пика: свет темы, башня целиком — герой справа; слева этаж и «Комната недели» — список топ-3, своё место,
// и «Все участники»; всё на одном экране без прокрутки.
//
// зачем (владелец 22.10: «интегрировать пик в общий дизайн… башня — герой сцены, комната недели — всё ещё как пьедестал»; эталон V2
// peak-scene-v2.html; владелец 22.10 кнопкой: «Сцена выше, башня крупнее» — Пик исключение из правила 46 %): сцена почти на весь экран,
// башня видна ЦЕЛИКОМ в масштабе эталона V2 и стоит над закреплённой «Играть»; «Комната недели» — список топ-3 слева от башни (вариант 3 peak-pedestal-left.html).
// Владелец 22.10: «НАДО, ЧТОБЫ АВАТАРКИ НАЖИМАЛИСЬ» — соперник на башне, призёр, своё место и своя метка открывают карточку игрока
// (та же, что в «Друзьях»); данные — из кэша комнаты, без новых чтений. Цвета сцены — homeSceneTokensForTheme (уровень «Максимум»),
// башня — SpireTower в режиме «сцена», тексты — spire_scene_model. Кегли — шкала 16/13 (D145), заголовки 40/26 — как в эталоне V2.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import type { Lang } from '../../../constants/i18n';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import { useEnergyCountdown } from '../../EnergyContext';
import type { PlayerInfo } from '../../PlayerProfileModal';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { useTheme } from '../../ThemeContext';
import { homeSceneTokensForTheme } from '../../home/v2/scene/home_scene_tokens';
import SpireTower from '../SpireTower';
import { spireGameText } from '../spire_game_strings';
import type { SpireMemberRow, SpireRankByView } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { spireTowerHeadroom } from '../spire_tower_bounds';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, type SpireRival } from '../spire_tower_model';
import SpirePlayerCard from './SpirePlayerCard';
import SpireScenePedestal, { SPIRE_SCENE_PEDESTAL_INSET } from './SpireScenePedestal';
import type { SpireSceneCopy, SpireSceneDecision, SpireSceneRoom } from './spire_scene_model';
import { setSpireSceneHeaderTint } from './spire_scene_header_tint';
import SpireSceneBackdrop, { setSpireSceneBackdrop, type SpireSceneBackdropSpec } from './spire_scene_backdrop';
import { useSpireHeaderOverlayInset } from './spire_header_overlay';
import { spireSceneFrame, spireScenePedestalCompact, spireSceneVisibleH } from './spire_scene_layout';
import { SPIRE_SCENE_INK } from './spire_scene_palette';

/**
 * Звёзды сцены — по всей плоскости до краёв, одни и те же в каждом кадре (владелец 22.10: «звёздочки рассыпь по всей плоскости, а не только
 * справа»). Доли ширины и высоты сцены, радиус и непрозрачность; генератор с постоянным зерном — без перерисовки.
 */
const SCENE_STARS: readonly (readonly [number, number, number, number])[] = (() => {
  let seed = 22102026;
  const next = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  return Object.freeze(Array.from({ length: 46 }, (_, i) => Object.freeze([next(), next(), i % 5 === 0 ? 1.4 : 0.9, i % 3 === 0 ? 0.7 : 0.4] as const)));
})();

/** Светлый оттенок цвета темы (rgb/rgba/#rrggbb) — смесь с белым; не разобрался — цвет как есть. Звёзды — оттенок свечения сцены темы. */
function lightShade(color: string, white: number): string {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  const h = /^#([0-9a-f]{6})/i.exec(color);
  const rgb = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : h ? [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)) : null;
  if (!rgb) return color;
  return `rgb(${rgb.map((c) => Math.round(c + (255 - c) * white)).join(',')})`;
}
const COPY_TOP = 12;
/** «Нет сети» стоит строкой сверху — текст сцены опускается под неё (эталон: 116 → 184). */
const COPY_TOP_OFFLINE = 76;
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
  const offText = useMemo(() => {
    const full = spireGameText(p.lang, 'offline');
    const cut = full.indexOf('. ');
    return cut > 0 ? { bold: full.slice(0, cut + 1), rest: full.slice(cut + 1) } : { bold: full, rest: '' };
  }, [p.lang]);
  const glow = evening ? tokens.eveningGlow : tokens.sceneGlow;
  // зачем (Сверка 22.10 по 7961dde6a: «звёзды белые в обеих темах»): звёзды — оттенок свечения темы с четвертью белого, а не почти белые
  const starColor = useMemo(() => lightShade(tokens.sceneGlow, 0.25), [tokens.sceneGlow]);
  // зачем (владелец 22.10: «цвета строго оттенками текущей темы»; сцена всегда на «Максимуме»): акцент темы — для наряда башни
  const sceneAccent = useMemo(() => liquidGlassTokens(liquidGlassThemeId, { level: 'max', appearance: liquidGlassAppearance }).accent, [liquidGlassThemeId, liquidGlassAppearance]);
  // наряд башни (владелец 22.10: «башню перекрашиваем в оттенки темы») — из акцента темы и цветов сцены
  const themeColors = useMemo(() => ({ accent: sceneAccent, sceneTop: tokens.sceneTop, sceneBottom: tokens.sceneBottom }), [sceneAccent, tokens.sceneTop, tokens.sceneBottom]);
  // зачем (эталон: сцена уходит под вкладки и под часы): пока «Пик» на экране — верхний цвет сцены шапке «Сообщества» и полосе статуса
  useEffect(() => {
    if (!p.headerTint) return undefined;
    setSpireSceneHeaderTint(tokens.sceneTop);
    return () => setSpireSceneHeaderTint(null);
  }, [p.headerTint, tokens.sceneTop]);
  // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, верх цельный): фон сцены — от верха экрана; bleed = где верх сцены на экране (под шапкой «Сообщества»)
  const [measuredBleed, setBleed] = useState(0);
  // зачем (Сверка 25.10: полоса ~108 px под часами = строка состояния; замок «верх цельный»): при шапке поверх сцены верх сцены на экране РОВНО равен
  // высоте шапки (тот же источник, что отступ ленты Пика) — замер measureInWindow на Android мог не включать строку состояния; он — только запасной путь
  const headerInset = useSpireHeaderOverlayInset();
  const bleed = headerInset > 0 ? headerInset : measuredBleed;
  useEffect(() => {
    console.log('[TOP-BAND]', JSON.stringify({ at: 'spire_scene_bleed', headerInset, measuredBleed, bleed, source: headerInset > 0 ? 'header_overlay' : 'measure' })); // guard-ok: одна строка на смену источника/значения
  }, [headerInset, measuredBleed, bleed]);
  const backdrop = useMemo<SpireSceneBackdropSpec>(() => ({ top: tokens.sceneTop, bottom: tokens.sceneBottom, glow, evening, bleed, sceneH: frame.sceneH }), [tokens.sceneTop, tokens.sceneBottom, glow, evening, bleed, frame.sceneH]);
  useEffect(() => {
    if (!p.headerTint) return undefined;
    setSpireSceneBackdrop(backdrop);
    return () => setSpireSceneBackdrop(null);
  }, [p.headerTint, backdrop]);
  // зачем (координатор 22.10: «логи [SPIRE-LAYOUT] — высота башни и видимые этажи»): один раз на смену сетки — масштаб, размер, окно, что видно
  useEffect(() => {
    const topUnit = SPIRE_TOWER_GEOM.height - frame.windowH / frame.scale;
    const shown = SPIRE_TOWER_GEOM.floors.filter((fl) => fl.y >= topUnit - 0.5).map((fl) => fl.f);
    console.log('[SPIRE-LAYOUT]', JSON.stringify({ // guard-ok: журнал сетки Пика (координатор 22.10)
      state: p.decision.state, width, windowH, visibleH: Math.round(visibleH), fontScale, tier: p.tier, myFloor: p.myFloor, headroom: Math.round(headroom),
      scale: Number(frame.scale.toFixed(3)), towerW: frame.towerW, towerH: Math.round(frame.windowH), towerLeft: frame.towerLeft,
      windowTop: Math.round(frame.windowTop), sceneH: frame.sceneH, floors: shown.length > 0 ? `${shown[0]}–${shown[shown.length - 1]}` : 'none',
      crown: topUnit <= SPIRE_TOWER_GEOM.top - headroom + 0.5, wordsHidden: frame.wordsHidden, copyW: frame.copyW,
    }));
  }, [frame, width, windowH, visibleH, fontScale, headroom, p.tier, p.myFloor, p.decision.state]);
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
  // зачем (владелец 22.10, вариант 3 «Список топ-3»: всё на одном экране без прокрутки): колонка не влезает над «Играть» — сжатый пьедестал.
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот это убери текст» — строки «N мест до повышения» на сцене нет: ни у пьедестала, ни тёплой строкой
  const shape = useMemo(() => ({ kicker2: p.copy.kicker2 !== null, line: p.copy.line !== null }), [p.copy.kicker2, p.copy.line]);
  const pedestalCompact = spireScenePedestalCompact({ visibleH, fontScale, copyTop: off ? COPY_TOP_OFFLINE : COPY_TOP, shape });
  useEffect(() => {
    console.log('[SPIRE-LAYOUT] pedestal', JSON.stringify({ compact: pedestalCompact, visibleH: Math.round(visibleH), fontScale, offline: off, ...shape })); // guard-ok: вид пьедестала (вариант 3)
  }, [pedestalCompact, visibleH, fontScale, off, shape]);
  return (
    <View>
      {/* зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, «сцена от самого верха»): фон над рамкой сцены — от верха экрана под шапкой «Сообщества» и часами; низ скруглён, как у рамки */}
      <View pointerEvents="none" style={[s.backdrop, { top: -bleed, height: bleed + frame.sceneH }]}><SpireSceneBackdrop spec={backdrop} offsetTop={0} /></View>
      <View
        testID={`spire-scene-${p.decision.state}`}
        style={[s.stage, { height: frame.sceneH }]}
        onLayout={(e) => {
          const target = e.currentTarget as unknown as { measureInWindow?: (cb: (x: number, y: number) => void) => void };
          // зачем: верх сцены на экране — до него тянется общий фон; не померилось — фон от своего верха, как раньше (журнал [TOP-BAND])
          if (typeof target?.measureInWindow !== 'function') { console.warn('[TOP-BAND]', JSON.stringify({ at: 'spire_scene_bleed', decision: 'no_measure' })); return; } // guard-ok: ранний выход с причиной
          target.measureInWindow((_x, y) => {
            const next = Math.max(0, Math.round(y));
            // зачем (Сверка 25.10: шов под вкладками на 4fa3e9457?; сперва логи): где верх сцены на экране, какой сдвиг фона, сцена из какой сборки
            console.log('[TOP-BAND]', JSON.stringify({ at: 'spire_scene_measure', rev: 'scene-from-top-4fa3e9457', windowY: Math.round(y), bleedBefore: measuredBleed, bleedAfter: next, headerInset, layoutY: Math.round(e.nativeEvent.layout.y), sceneH: frame.sceneH })); // guard-ok: одна строка на раскладку сцены
            setBleed((prev) => (prev === next ? prev : next));
          });
        }}
      >
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            {evening ? (
              <RadialGradient id="spireSceneEmber" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tokens.sceneEmber} stopOpacity="1" />
                <Stop offset="0.68" stopColor={tokens.sceneEmber} stopOpacity="0" />
              </RadialGradient>
            ) : null}
          </Defs>
          {/* зачем (владелец 22.10: «фон за башней — чтобы не отличался»; «звёздочки по всей плоскости до краёв»): ореола за башней нет — фон
              единый; звёзды — по всей сцене, светлый оттенок свечения темы */}
          {SCENE_STARS.map(([x, y, r, o], i) => <Circle key={`st${i}` /* guard-ok: постоянный список звёзд */} cx={x * width} cy={y * frame.sceneH} r={r} fill={starColor} opacity={o} />)}
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
            themeColors={themeColors}
          />
        </View>
        <View testID="spire-scene-copy" style={[s.copy, { top: off ? COPY_TOP_OFFLINE : COPY_TOP, width: frame.copyW }]}>
          <Text style={ts.kicker} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.kicker}</Text>
          {p.copy.kicker2 ? <Text style={ts.kicker} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.kicker2}</Text> : null}
          {p.copy.liveEnergyTitle ? <LiveEnergyTitle override={p.energyTime} /> : <Text accessibilityRole="header" testID="spire-scene-title" maxFontSizeMultiplier={DISPLAY_MAX_SCALE} style={s.title}>{p.copy.title}</Text>}
          {p.copy.line ? (
            <View style={s.lineRow}>
              {p.copy.bar !== null ? <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(p.copy.bar * 100)}%` }]} /></View> : null}
              <Text style={ts.line} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{p.copy.line}</Text>
            </View>
          ) : null}
          {/* зачем (владелец 22.10: «ВОТ ЭТОТ ТЕКСТ УБИРАЙ»): плашек «+10 за ступень / этаж» на сцене нет; строки наград в модели остаются */}
          {/* зачем (владелец 22.10 по макету peak-pedestal-left.html, вариант 3): «Комната недели» — список топ-3 под текстом, слева от башни */}
          <SpireScenePedestal
            lang={p.lang}
            width={frame.copyW + SPIRE_SCENE_PEDESTAL_INSET}
            top={p.room.top}
            count={p.room.count}
            myPlace={p.room.myPlace}
            me={me}
            myCoinRank={p.myCoinRank}
            compact={pedestalCompact}
            loading={searching}
            dim={off}
            onPressMember={onPressPodium}
            onPressMe={onPressMyPlace}
            onOpenAll={p.onOpenAll}
          />
        </View>
        {off ? (
          // зачем (аудит кнопок Ревизора 22.10, F6): плашка «нет сети» лежит поверх верха башни — касания проходят сквозь неё к этажам
          <View testID="spire-scene-offline" pointerEvents="none" style={s.offline} accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={18} color={SPIRE_SCENE_INK.text} />
            <Text style={ts.offlineText} maxFontSizeMultiplier={TEXT_MAX_SCALE}><Text style={s.offlineBold}>{offText.bold}</Text>{offText.rest}</Text>
          </View>
        ) : null}
      </View>
      <SpirePlayerCard player={player} myName={me?.name ?? ''} onClose={closePlayer} />
    </View>
  );
}

export default memo(SpireScene);

const s = StyleSheet.create({
  // зачем (scenes-compact .sc): сцена во всю ширину, скругление только снизу 32
  stage: { overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backdrop: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  tower: { position: 'absolute' },
  copy: { position: 'absolute', left: 20 },
  kicker: { color: SPIRE_SCENE_INK.kicker, fontSize: 13, lineHeight: 17 },
  title: { color: SPIRE_SCENE_INK.text, fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -0.8, marginTop: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  bar: { width: 48, height: 4, borderRadius: 2, backgroundColor: SPIRE_SCENE_INK.barTrack, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: SPIRE_SCENE_INK.text },
  line: { color: SPIRE_SCENE_INK.line, fontSize: 13, lineHeight: 17, flexShrink: 1, fontVariant: ['tabular-nums'] }, // guard-ok: «ступень 7 из 8» — строка прогресса этажа (эталон V2), не подпись-расшифровка
  offline: { position: 'absolute', top: 8, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: SPIRE_SCENE_INK.glass },
  offlineText: { flex: 1, color: SPIRE_SCENE_INK.text, fontSize: 13, lineHeight: 17 },
  offlineBold: { fontWeight: '700' },
});

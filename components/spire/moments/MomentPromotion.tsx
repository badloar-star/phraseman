// ═══════════════════════════════════════════════════════════════════════════
// MomentPromotion.tsx — момент m01 «Повышение лиги — три акта» (эталон engagement-moments-v3-all.html, m01, вариант A «~10 с»; снимок C:/Temp/claude/sec6/m0123.png, левый кадр = акт 3).
//
// зачем (владелец 14.10: «перенести точно по макетам»; D162/D190/D191): поверх Главной при первом открытии после закрытия недели. Акт 1: таблица комнаты в МОНЕТАХ недели, линия ТОП-5 опускается
// и замирает под «Ты» (повышаются 5 из 30). Акт 2: монета-персонаж cheer + «N место. Поднимаешься». Акт 3: башня новой лиги ЦЕЛИКОМ (SpireTowerSvg, граница без обрезки — острие, навершие и ореол
// внутри кадра), горит 1 этаж, на нём монета-аватар и «Этаж 1» (новая неделя — все с 1 этажа), фейерверк ×3 + дрожь 700 мс, «{Лига}», «+100 монет за повышение» и «Играть» (монеты начисляет
// ночной крон, кнопки «Забрать» нет — компонент ничего не начисляет и не пишет).
// Тайминги эталона (мс): 300 мерцание строк · 1600 линия ТОП-5 (1,4 с) · 3000 «Граница топ-5 — под тобой» + вспышка «Ты» · 4200 акт 2 · 6200 акт 3 (башня 0,9 с, «Пропустить» исчезает) ·
// 7300 монета садится на этаж · 7700 «Этаж 1» · 8800 дрожь + фейерверк + итог. Анимации на UI-потоке (Reanimated); reduceMotion — без движения: сразу итоговый вид. Haptics/звук — по тайм-листу.
// Где и когда показывать — решает Ядро (флаг moments_v3, D191); здесь — только компонент с пропсами.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import { spireTierName } from '../../../modules/spire/tier_names';
import { hapticHeavyImpact, hapticMediumImpact, hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { V2Button } from '../../v2/V2Kit';
import SpireRankCoin from '../SpireRankCoin';
import SpireTowerSvg from '../SpireTowerSvg';
import { SPIRE_TOWER_GEOM, SPIRE_TW, spireMarkerXY } from '../spire_tower_model';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireScene } from '../useSpireScene';
import { useSpireShadow } from '../useSpireShadow';
import MomentFirework, { useMomentRumble } from './moments_effects';
import { MomentCoin } from './moments_coin';
import { MomentFullScreen } from './moments_layout';
import { MOMENT_SOUND_EVENTS, playMomentSound } from './moments_sound';
import { momentNumber, momentText } from './moments_strings';

export type MomentRoomRow = Readonly<{
  uid: string;
  name: string;
  /** Ранг монеты участника 0…19 (null — базовая монета). */
  coinRank: number | null;
  /** Монеты недели во всех режимах (D162). */
  coins: number;
  isMe: boolean;
}>;

export type MomentPromotionProps = Readonly<{
  lang: Lang;
  /** Лига, ИЗ которой поднимаемся (индекс 0…11) — в заголовке акта 1. */
  fromTier: number;
  /** Лига, В КОТОРУЮ поднимаемся (индекс 0…11): имя в итоге и наряд башни. */
  toTier: number;
  /**
   * Строки комнаты недели по убыванию монет (в образце — первые 6; «Ты» среди них).
   * зачем (Ядро/координатор 14.10): лестницу присылает сервер только с 17.10 — нет строк (старые итоги) → акт 1 пропускается, момент начинается с места и идёт к башне, ничего не выдумываем.
   */
  rows?: readonly MomentRoomRow[];
  /** Моё место в комнате (1…30). */
  myPlace: number;
  /** Мой ранг монеты 0…19 (null — базовая): монета-персонаж и маркер на этаже. */
  myCoinRank: number | null;
  /** Монеты за повышение — число сервера (promotionCoins итога недели), их начисляет ночной крон; здесь только показ. 0 — строки «+N монет за повышение» нет. */
  bonusCoins: number;
  onPlay: () => void;
  testID?: string;
}>;

/** Тайминг эталона, мс. */
export const MOMENT_PROMO_TIMELINE = { flicker: 300, zone: 1600, topLine: 3000, act2: 4200, act3: 6200, marker: 7300, tag: 7700, final: 8800 } as const;
const ZONE_SWEEP_MS = 1400;
/** Длительность «стоп-кадра» эталона (`emFreeze 420ms steps(1)`), мс. */
export const FREEZE_MS = 420;
const ROW_GAP = 6;
const FALLBACK_ROW_H = 48;
const TOP5 = 5;
/** Эталон нарисован на экране 390 × 844: координаты фейерверка масштабируются по ширине. */
const DESIGN_W = 390;

type Phase = Readonly<{ act: 1 | 2 | 3; zone: boolean; topLine: boolean; cheer: boolean; tower: boolean; marker: boolean; tag: boolean; final: boolean; skip: boolean }>;
const PHASE_START: Phase = { act: 1, zone: false, topLine: false, cheer: false, tower: false, marker: false, tag: false, final: false, skip: true };
const PHASE_END: Phase = { act: 3, zone: true, topLine: true, cheer: true, tower: true, marker: true, tag: true, final: true, skip: false };

type RowProps = Readonly<{ row: MomentRoomRow; index: number; place: number; flicker: boolean; rise: boolean; onFirstLayout?: (e: LayoutChangeEvent) => void; testID: string }>;

const LadderRow = memo(function LadderRow({ row, index, place, flicker, rise, onFirstLayout, testID }: RowProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const op = useSharedValue(1);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!flicker) return;
    // `.flicker`: мерцание 1200 мс ступенями, строки по очереди через 60 мс
    op.value = withDelay(index * 60, withSequence(withTiming(0.35, { duration: 100 }), withTiming(1, { duration: 100 }), withTiming(0.5, { duration: 100 }), withTiming(1, { duration: 100 }), withTiming(0.7, { duration: 100 }), withTiming(1, { duration: 100 })));
  }, [flicker, index, op]);
  useEffect(() => {
    if (!rise) return;
    // `emRowGlow` строки «Ты»: вспышка кольца акцента 1100 мс
    ring.value = withDelay(0, withSequence(withTiming(1, { duration: 440 }), withTiming(0, { duration: 660 })));
  }, [rise, ring]);
  const rowStyle = useAnimatedStyle(() => ({ opacity: op.value }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  return (
    <Animated.View
      onLayout={onFirstLayout}
      testID={testID}
      accessible
      accessibilityLabel={`${place}. ${row.name}, ${momentNumber(row.coins)}`}
      style={[s.row, { backgroundColor: row.isMe ? p.cardRaised : p.card }, row.isMe ? sh.plate : sh.nested, rowStyle]}
    >
      <Text style={[s.pos, { color: p.textSecondary }]}>{place}</Text>
      <SpireRankCoin rank={row.coinRank} size={28} />
      <Text style={[s.name, { color: p.text }]} numberOfLines={1}>{row.name}</Text>
      <Text style={[s.pts, { color: row.isMe ? p.text : p.textSecondary }]}>{momentNumber(row.coins)}</Text>
      {row.isMe ? <Animated.View pointerEvents="none" style={[s.meRing, { boxShadow: `0 0 0 2px ${p.cta}` }, ringStyle]} /> : null}
    </Animated.View>
  );
});

function MomentPromotion({ lang, fromTier, toTier, rows, myPlace, myCoinRank, bonusCoins, onPlay, testID = 'moment-promotion' }: MomentPromotionProps) {
  const p = useSpirePalette();
  const scene = useSpireScene();
  const reduceMotion = useReducedMotion();
  const insets = useStableSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const skin = useMemo(() => spireSkinForTier(toTier), [toTier]);
  const hasLadder = (rows?.length ?? 0) > 0;
  const [phase, setPhase] = useState<Phase>(reduceMotion ? PHASE_END : hasLadder ? PHASE_START : { ...PHASE_START, act: 2 });
  const [rowH, setRowH] = useState(FALLBACK_ROW_H);
  const [fire, setFire] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rumble = useMomentRumble();
  const zoneTop = useSharedValue(0);
  const towerIn = useSharedValue(reduceMotion ? 1 : 0);
  const markerIn = useSharedValue(reduceMotion ? 1 : 0);
  const tagIn = useSharedValue(reduceMotion ? 1 : 0);
  const finalIn = useSharedValue(reduceMotion ? 1 : 0);
  // «стоп-кадр» эталона (`.freeze`: emFreeze 420 мс steps(1), contrast 1,3 + brightness 1,4): на 3,0 с экран на миг вспыхивает светлее и возвращается — светлая вуаль без плавности
  const flash = useSharedValue(0);

  const league = spireTierName(toTier, lang);
  const fromLeague = spireTierName(fromTier, lang);
  const shown = useMemo(() => (rows ?? []).slice(0, 6), [rows]);

  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);

  /** Все биты акта 3 разом, без движения (пропуск и reduceMotion). */
  const jumpToEnd = useCallback((why: 'skip' | 'reduceMotion') => {
    if (__DEV__) console.log(`[MOMENT-PROMO] прыжок к итогу причина=${why}`); // guard-ok: единичный лог пропуска
    clearTimers();
    towerIn.value = 1; markerIn.value = 1; tagIn.value = 1; finalIn.value = 1;
    setPhase(PHASE_END);
  }, [clearTimers, finalIn, markerIn, tagIn, towerIn]);

  useEffect(() => {
    if (__DEV__) console.log(`[MOMENT-PROMO] показ из=${fromTier} в=${toTier} место=${myPlace} строк=${rows?.length ?? 0} лестница=${String(hasLadder)} бонус=${bonusCoins} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) { setFire(false); return undefined; }
    const T = MOMENT_PROMO_TIMELINE;
    // без лестницы акт 1 не играется: акт 2 («место») встаёт на 0,4 с, дальше тот же ритм образца (сдвиг всех последующих меток)
    const shift = hasLadder ? 0 : T.act2 - 400;
    const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, Math.max(0, ms - shift))); };
    if (hasLadder) at(T.flicker, () => setPhase((v) => ({ ...v })));
    if (hasLadder) at(T.zone, () => { setPhase((v) => ({ ...v, zone: true })); zoneTop.value = withTiming((rowH + ROW_GAP) * TOP5 - 3, { duration: ZONE_SWEEP_MS, easing: Easing.out(Easing.cubic) }); playMomentSound(MOMENT_SOUND_EVENTS.promoTick); void hapticTap(); });
    if (hasLadder) at(T.topLine, () => { setPhase((v) => ({ ...v, topLine: true })); flash.value = withSequence(withTiming(1, { duration: 0 }), withDelay(FREEZE_MS, withTiming(0, { duration: 0 }))); playMomentSound(MOMENT_SOUND_EVENTS.promoFlip); void hapticMediumImpact(); });
    at(T.act2, () => { setPhase((v) => ({ ...v, act: 2, cheer: true })); playMomentSound(MOMENT_SOUND_EVENTS.promoCorrect); void hapticSuccess(); });
    at(T.act3, () => {
      setPhase((v) => ({ ...v, act: 3, tower: true, skip: false }));
      towerIn.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
      void hapticTap();
    });
    at(T.marker, () => { setPhase((v) => ({ ...v, marker: true })); markerIn.value = withTiming(1, { duration: 520, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }); playMomentSound(MOMENT_SOUND_EVENTS.promoMarker); void hapticMediumImpact(); });
    at(T.tag, () => { setPhase((v) => ({ ...v, tag: true })); tagIn.value = withTiming(1, { duration: 300 }); });
    at(T.final, () => {
      setPhase((v) => ({ ...v, final: true }));
      finalIn.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
      rumble.play();
      setFire(true);
      playMomentSound(MOMENT_SOUND_EVENTS.promoDone);
      void hapticHeavyImpact();
    });
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий запускается один раз на монтирование
  }, []);

  // ── акт 3: башня ЦЕЛИКОМ (граница с ореолом внутри кадра); если экран низкий — масштаб ниже, не обрезка ──
  const towerTop = Math.max(insets.top + 28, 76);
  const finalBlockH = 190 + Math.max(insets.bottom, 12);
  const ratio = SPIRE_TOWER_GEOM.height / SPIRE_TW;
  const towerW = Math.max(120, Math.min(196, Math.floor((winH - towerTop - finalBlockH) / ratio)));
  const k = towerW / SPIRE_TW;
  const mk = spireMarkerXY(SPIRE_TOWER_GEOM.floors[0]);
  const towerStyle = useAnimatedStyle(() => ({ opacity: towerIn.value, transform: [{ translateY: (1 - towerIn.value) * 28 }] }));
  const markerStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, markerIn.value * 5), transform: [{ scale: 0.4 + 0.6 * markerIn.value }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagIn.value }));
  const finalStyle = useAnimatedStyle(() => ({ opacity: finalIn.value, transform: [{ translateY: (1 - finalIn.value) * 18 }] }));
  const zoneStyle = useAnimatedStyle(() => ({ top: zoneTop.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.16 }));
  const fw = winW / DESIGN_W;

  return (
    <MomentFullScreen testID={testID}>
      <Animated.View style={[s.stage, rumble.style]}>
        {phase.act === 1 ? (
          <Animated.View key="act1" entering={reduceMotion ? undefined : FadeIn.duration(420)} exiting={reduceMotion ? undefined : FadeOut.duration(300)} style={[s.act, { paddingTop: insets.top + 28 }]}>
            <Text style={[s.ov, { color: p.textSecondary }]}>{momentText(lang, 'promoWeekOverline', { league: fromLeague })}</Text>
            <Text style={[s.hMd, { color: p.text }]} testID={`${testID}-drum`}>{phase.topLine ? momentText(lang, 'promoBorder') : momentText(lang, 'promoCounting')}</Text>
            <View style={s.ladder}>
              {phase.zone ? (
                <Animated.View pointerEvents="none" style={[s.zone, { backgroundColor: p.correct, boxShadow: `0 0 12px ${p.correct}` }, zoneStyle]}>
                  <Text style={[s.zoneLbl, { color: p.correct }]}>{momentText(lang, 'zoneTop5')}</Text>
                </Animated.View>
              ) : null}
              {shown.map((row, i) => (
                <LadderRow
                  key={row.uid}
                  row={row}
                  index={i}
                  place={i + 1}
                  flicker
                  rise={phase.topLine && row.isMe}
                  onFirstLayout={i === 0 ? (e) => setRowH(Math.round(e.nativeEvent.layout.height)) : undefined}
                  testID={`${testID}-row-${i}`}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {phase.act === 2 ? (
          <Animated.View key="act2" entering={reduceMotion ? undefined : FadeIn.duration(420)} exiting={reduceMotion ? undefined : FadeOut.duration(300)} style={[s.act, s.center]}>
            <MomentCoin rank={myCoinRank} size={120} mood={phase.cheer ? 'cheer' : 'idle'} glints emote={phase.cheer ? 'star' : null} testID={`${testID}-coin`} />
            <Text style={[s.ov, { color: p.accentText, marginTop: 22 }]}>{momentText(lang, 'promoRoomOverline')}</Text>
            <Text style={[s.hXl, { color: p.text, marginTop: 6 }]}>{momentText(lang, 'promoPlace', { n: myPlace })}</Text>
          </Animated.View>
        ) : null}

        {phase.act === 3 ? (
          <Animated.View key="act3" entering={reduceMotion ? undefined : FadeIn.duration(420)} style={s.act3}>
            <Animated.View testID={`${testID}-tower`} style={[s.tower, { top: towerTop, width: towerW, left: (winW - towerW) / 2, height: Math.round(SPIRE_TOWER_GEOM.height * k) }, towerStyle]}>
              <SpireTowerSvg lang={lang} myFloor={1} selected={0} onSelect={noopSelect} width={towerW} skin={skin} scene={scene} />
              <Animated.View style={[s.marker, { left: Math.round(mk.x * k - 17), top: Math.round(mk.y * k - 17) }, markerStyle]} testID={`${testID}-marker`}>
                <View style={s.markerInner}><SpireRankCoin rank={myCoinRank} size={26} /></View>
              </Animated.View>
              <Animated.View style={[s.floorTag, { left: Math.round(mk.x * k + 24), top: Math.round(mk.y * k - 14), backgroundColor: p.control }, tagStyle]} testID={`${testID}-floor`}>
                <Text style={[s.floorTagText, { color: p.text }]}>{momentText(lang, 'floorTag', { n: 1 })}</Text>
              </Animated.View>
            </Animated.View>
            {phase.final ? (
              <Animated.View style={[s.final, { paddingBottom: Math.max(insets.bottom, 12) + 24 }, finalStyle]} testID={`${testID}-final`}>
                <Text accessibilityRole="header" style={[s.hXl, { color: p.text }]}>{league}</Text>
                {bonusCoins > 0 ? <Text style={[s.pBonus, { color: p.textSecondary }]}>{momentText(lang, 'promoBonus', { n: bonusCoins })}</Text> : null}
                <View style={s.playWrap}>
                  <V2Button label={momentText(lang, 'play')} icon="arrow-forward" onPress={onPlay} testID={`${testID}-play`} />
                </View>
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} testID={`${testID}-freeze`} />{/* theme-exempt: вспышка «стоп-кадра» — светлая вуаль (эталон contrast/brightness) */}
        <MomentFirework fire={fire} x={195 * fw} y={130} r={110} />
        <MomentFirework fire={fire} x={120 * fw} y={200} r={70} delayMs={250} />
        <MomentFirework fire={fire} x={270 * fw} y={180} r={80} delayMs={450} />
      </Animated.View>

      {phase.skip ? (
        <Text
          accessibilityRole="button"
          onPress={() => jumpToEnd('skip')}
          style={[s.skip, { color: p.textSecondary, backgroundColor: p.control, top: insets.top + 10 }]}
          testID={`${testID}-skip`}
        >
          {momentText(lang, 'skip')}
        </Text>
      ) : null}
    </MomentFullScreen>
  );
}

const noopSelect = (): void => undefined;

const s = StyleSheet.create({
  stage: { flex: 1 },
  act: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 24, alignItems: 'center' },
  center: { justifyContent: 'center' },
  act3: { ...StyleSheet.absoluteFillObject },
  // `.ov`: 12/16, разрядка 2,6, капс
  ov: { fontSize: 12, lineHeight: 16, letterSpacing: 2.6, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  hMd: { marginTop: 6, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2, textAlign: 'center' },
  hXl: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  ladder: { alignSelf: 'stretch', marginTop: 18, gap: ROW_GAP },
  // `.lrow`: 10/12 отступы, зазор 12, радиус 16, 16/600
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  pos: { width: 26, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  name: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600' },
  pts: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meRing: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  // `.zone-line`: линия 2 px по ширине таблицы (+8 с краёв), подпись ТОП-5 справа над линией
  zone: { position: 'absolute', left: -8, right: -8, height: 2, zIndex: 3 },
  zoneLbl: { position: 'absolute', right: 8, top: -18, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  tower: { position: 'absolute' },
  // маркер «Ты здесь» 34: кольцо светлое, внутри чёрный круг 30 с монетой 26, ореол 10
  marker: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#F2F1F6', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 10px rgba(255,255,255,0.12)' }, // theme-exempt: маркер «Ты здесь» как в SpireTower (метка текущего этажа)
  markerInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0C0C0D', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: маркер «Ты здесь» как в SpireTower
  floorTag: { position: 'absolute', height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center' },
  floorTagText: { fontSize: 13, lineHeight: 28, fontWeight: '700' },
  final: { position: 'absolute', left: 24, right: 24, bottom: 0, alignItems: 'center' },
  pBonus: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  playWrap: { alignSelf: 'stretch', marginTop: 16 },
  skip: { position: 'absolute', right: 18, zIndex: 70, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, fontSize: 13, fontWeight: '700' },
});

export default memo(MomentPromotion);

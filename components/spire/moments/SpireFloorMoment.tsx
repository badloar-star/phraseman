// ═══════════════════════════════════════════════════════════════════════════
// SpireFloorMoment.tsx — момент m07 «Этаж пройден / Вершина» (эталон engagement-moments-v3-all.html, `floor3` / `summit3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m07; координатор): итог этажа — отдельный экран темы поверх экрана ступени. Этаж: «Этаж N пройден», окно башни 280 × 240
// на следующем этаже — на 0,6 с башня перерисовывается и окна следующего этажа загораются, счётчик монет за этаж бежит 0,9 с, монета выглядывает; заголовок «Впереди этаж N» / «Впереди Страж», подпись как в коде;
// «На N этаж» (главная) и «Передохнуть». Вершина: «Вершина», монета радуется с сердцами, «15 этаж», «+N монет за вершину» (число из config/spire_v1.coins.summitBonus), три залпа фейерверка с дрожью, «Дальше».
// Правило «10×N» и награда за вершину — из конфига сервера (spireFloorCoinsOf / summitBonus), «+200» в коде не живёт. Без карточки шеринга (D76 — только итоги лиги). Компонент ничего не пишет:
// «На N этаж» / «Дальше» зовут прежний подъём (climb), «Передохнуть» — dismissOutcome. Конфетти — общий StreakConfetti (серия), 90 штук на третьем залпе.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import type { SpireStepOutcome } from '../../../app/spire/use_spire_game';
import type { SpireCoinsConfig } from '../../../modules/spire/config_contract';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import { hapticHeavyImpact, hapticMediumImpact, hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import { playUnlessRecentlyPlayed } from '../../../modules/sound_v2/legacy_bridge';
import MomentCoin from '../../moments/MomentCoin';
import StreakConfetti from '../../streak/moments/StreakConfetti';
import CountText from './CountText';
import { V2_TYPE } from '../../../constants/v2Style';
import { V2Button } from '../../v2/V2Kit';
import SpireRankCoin from '../SpireRankCoin';
import SpireTowerSvg from '../SpireTowerSvg';
import { spireGameText } from '../spire_game_strings';
import { spireStepsCount } from '../spire_plurals';
import { spireText } from '../spire_strings';
import { floorMomentFrame } from './floor_moment_frame';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, spireFloorCoinsOf, spireIsGuard, spireStepsIn } from '../spire_tower_model';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireScene } from '../useSpireScene';
import MomentFirework, { useMomentRumble } from './moments_effects';
import { MomentFullScreen } from './moments_layout';
import { stepMomentText } from './step_moment_strings';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../../moments/title_scale';

const TOWER_W = 280;
const TOWER_H = 240;
/** Тайминги образца, мс: башня перерисовывается 600, счётчик 1100 (900 мс), монета выглядывает 1300 / вершина: радость 500, залпы 900, 1300, 1700. */
export const FLOOR_MOMENT_TIMELINE = { relight: 600, count: 1100, countMs: 900, peek: 1300, cheer: 500, volley1: 900, volley2: 1300, volley3: 1700 } as const;
const plusFormat = (value: number): string => `+${value}`;

export type SpireFloorMomentProps = Readonly<{
  lang: Lang;
  /** Итог ступени: kind 'floor' или 'summit'. */
  outcome: SpireStepOutcome;
  coins: SpireCoinsConfig;
  /** Ранг монеты человека 0…19; null — базовая. */
  coinRank: number | null;
  /** «На N этаж» / «Дальше»: прежний подъём (climb). */
  onNext: () => void;
  /** «Передохнуть»: закрыть итог. */
  onLater: () => void;
  busy?: boolean;
  testID?: string;
}>;

function FloorView({ lang, outcome, coins, coinRank, onNext, onLater, busy, testID }: SpireFloorMomentProps & { testID: string }) {
  const p = useSpirePalette();
  const scene = useSpireScene();
  const reduceMotion = useReducedMotion();
  const next = Math.min(outcome.local.floor, SPIRE_FLOOR_COUNT);
  const guardNext = spireIsGuard(next);
  const reward = spireFloorCoinsOf(outcome.floorBefore, coins);
  const skin = useMemo(() => spireSkinForTier(outcome.local.tier), [outcome.local.tier]);
  const [litFloor, setLitFloor] = useState(reduceMotion ? next : outcome.floorBefore);
  const [peek, setPeek] = useState(reduceMotion);
  // окно башни: центр на следующем этаже (образец `focus: 5`)
  // зачем (Ревизор 15.10, R02; закон владельца 14.10 «пик башни не обрезается, свет тоже»): на 13–15 этаже центровка окна 280×240 срезала верх башни (шпиль, ореол) — кадр считает floorMomentFrame:
  // масштаб вписывает запас над верхним этажом и низ следующего этажа в высоту окна, окно прижимается к верху башни; нижние этажи — центровка, как в образце.
  const { k, towerW, shift } = useMemo(() => floorMomentFrame(skin, next, TOWER_W, TOWER_H), [skin, next]);

  useEffect(() => {
    console.log(`[FLOOR-MOMENT] этаж ${outcome.floorBefore} пройден → ${next}, монеты=${reward} страж=${String(guardNext)} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    // зачем: игра уже сыграла 'floor' мгновенно — момент повторит только если прошло > 400 мс
    playUnlessRecentlyPlayed('floor', 'SpireFloorMoment');
    if (reduceMotion) return undefined;
    const T = FLOOR_MOMENT_TIMELINE;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { setLitFloor(next); playEvent('tap'); void hapticTap(); }, T.relight));
    // зачем (координатор 15.10, аудит скорости окон моментов): сам счёт «+N» крутит CountText (там интервал), здесь — только звук монеты в ту же метку
    timers.push(setTimeout(() => { playEvent('coin'); }, T.count));
    timers.push(setTimeout(() => { setPeek(true); void hapticSuccess(); }, T.peek));
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const sub = guardNext
    ? spireGameText(lang, 'guardSub', { n: next, m: coins.guardianMultiplier })
    : `${spireStepsCount(lang, spireStepsIn(next))} · ${spireFloorCoinsOf(next, coins)} ${spireText(lang, 'coinsPerFloor')}`;

  return (
    <>
      <View style={s.body}>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn} style={[s.ov, { color: p.textSecondary }]}>{spireGameText(lang, 'floorCleared', { n: outcome.floorBefore }).toUpperCase()}</Animated.Text>
        <View style={[s.window, { width: TOWER_W, height: TOWER_H }]} testID={`${testID}-tower`}>
          <View style={{ width: towerW, height: Math.round(SPIRE_TOWER_GEOM.height * k), alignSelf: 'center', transform: [{ translateY: shift }] }}>
            <SpireTowerSvg lang={lang} myFloor={litFloor} selected={0} onSelect={noopSelect} width={towerW} skin={skin} scene={scene} />
          </View>
        </View>
        <View style={s.rewardRow}>
          <View style={[s.pill, { backgroundColor: p.control }]}>
            <SpireRankCoin rank={coinRank} size={24} />
            <CountText to={reward} delayMs={FLOOR_MOMENT_TIMELINE.count} durationMs={FLOOR_MOMENT_TIMELINE.countMs} reduceMotion={reduceMotion} format={plusFormat} style={[s.pillText, { color: p.text }]} testID={`${testID}-count`} />
          </View>
          <MomentCoin rank={coinRank} size={56} mood={peek ? 'peek' : 'idle'} shadow={false} testID={`${testID}-coin`} />
        </View>
        <Text accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.hLg, { color: p.text }]} testID={`${testID}-title`}>{guardNext ? spireGameText(lang, 'guardAhead') : spireGameText(lang, 'floorAhead', { n: next })}</Text>
        <Text style={[s.p, { color: p.textSecondary }]}>{sub}</Text>
      </View>
      <View style={s.foot}>
        <V2Button label={stepMomentText(lang, 'toFloor', { n: next })} icon="arrow-forward" onPress={onNext} disabled={busy} testID={`${testID}-next`} />
        <View style={s.gap} />
        <V2Button label={stepMomentText(lang, 'rest')} variant="secondary" onPress={onLater} testID={`${testID}-later`} />
      </View>
    </>
  );
}

function SummitView({ lang, coins, coinRank, onNext, busy, testID }: SpireFloorMomentProps & { testID: string }) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const rumble = useMomentRumble();
  const [cheer, setCheer] = useState(reduceMotion);
  const [fire, setFire] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    console.log(`[FLOOR-MOMENT] вершина: бонус=${coins.summitBonus} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    // зачем: игра уже сыграла 'summit' мгновенно — момент повторит только если прошло > 400 мс
    playUnlessRecentlyPlayed('summit', 'SpireFloorMoment');
    if (reduceMotion) return undefined;
    const T = FLOOR_MOMENT_TIMELINE;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { setCheer(true); playEvent('correct'); void hapticSuccess(); }, T.cheer));
    timers.push(setTimeout(() => { setFire(true); rumble.play(); void hapticHeavyImpact(); }, T.volley1));
    timers.push(setTimeout(() => { void hapticMediumImpact(); }, T.volley2));
    // залп 3 + конфетти цветов темы (образец: confetti n=90 на 1,7 с; общий компонент серии)
    timers.push(setTimeout(() => { setConfetti(true); void hapticMediumImpact(); }, T.volley3));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  return (
    <Animated.View style={[s.fill, rumble.style]}>
      <StreakConfetti fire={confetti} n={90} />
      <View style={s.body}>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn} style={[s.ov, { color: p.textSecondary }]}>{spireText(lang, 'summit').toUpperCase()}</Animated.Text>
        <View style={s.summitCoin}>
          <MomentCoin rank={coinRank} size={120} mood={cheer ? 'cheer' : 'idle'} glints emote={cheer ? 'heart' : null} emoteCount={5} testID={`${testID}-coin`} />
        </View>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(400)} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.hXl, { color: p.text }]} testID={`${testID}-title`}>{stepMomentText(lang, 'floorN', { n: SPIRE_FLOOR_COUNT })}</Animated.Text>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(500)} style={[s.p, { color: p.textSecondary }]} testID={`${testID}-bonus`}>{stepMomentText(lang, 'summitBonus', { n: coins.summitBonus })}</Animated.Text>
      </View>
      <View style={s.foot}>
        <V2Button label={spireGameText(lang, 'onward')} icon="arrow-forward" onPress={onNext} disabled={busy} testID={`${testID}-next`} />
      </View>
      <MomentFirework fire={fire} x={195} y={180} r={110} />
      <MomentFirework fire={fire} x={110} y={240} r={70} delayMs={400} />
      <MomentFirework fire={fire} x={280} y={220} r={80} delayMs={800} />
    </Animated.View>
  );
}

const noopSelect = (): void => undefined;

function SpireFloorMoment(props: SpireFloorMomentProps) {
  const testID = props.testID ?? 'floor-moment';
  return (
    <MomentFullScreen testID={testID}>
      <View style={s.full}>
        {props.outcome.kind === 'summit' ? <SummitView {...props} testID={testID} /> : <FloorView {...props} testID={testID} />}
      </View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // `.full`: колонка, поля 24, верх 76 / низ 36
  full: { flex: 1, paddingHorizontal: 24, paddingTop: 76, paddingBottom: 36 },
  fill: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m07: надзаголовок — V2_TYPE.overline (13/17 · 700 · трекинг 1,4)
  ov: { ...V2_TYPE.overline, textAlign: 'center' },
  window: { marginTop: 10, overflow: 'hidden', alignItems: 'center' },
  rewardRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { height: 44, borderRadius: 22, paddingLeft: 10, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillText: { fontSize: 21, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m07: «5 этаж — Страж» 24/30 · 800 · −0,3
  hLg: { marginTop: 12, ...V2_TYPE.momentTitleLg, textAlign: 'center' },
  hXl: { marginTop: 14, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  p: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  summitCoin: { marginTop: 10 },
  foot: { gap: 0 },
  gap: { height: 12 },
});

export default memo(SpireFloorMoment);

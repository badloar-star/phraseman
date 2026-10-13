// ═══════════════════════════════════════════════════════════════════════════
// SpireResultPanel.tsx — итог ступени / этажа / вершины на сцене башни (макет §7–8).
//
// зачем (фундамент владельца «празднование живёт на своём экране, фактом»): панель
// снизу поверх башни, маркер в это время уже едет на новый этаж (SpireTower сам
// анимирует смену этажа). Итог хранится только в памяти экрана — никаких очередей
// «показать потом». Суммы монет — из config/spire_v1 (сервер начисляет их тем же
// правилом при досылке отчёта: spire_coins.ts), здесь ничего не придумываем.
// «Выше» сразу стартует следующую ступень, «Ещё раз» даёт новый набор из 10 заданий.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';
import type { SpireStepOutcome } from '../../app/spire/use_spire_game';
import AvatarView from '../AvatarView';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import { spireText } from './spire_strings';
import { spireStepsCount } from './spire_plurals';
import { spireClock, spireGameText } from './spire_game_strings';
import { SPIRE_FLOOR_COUNT, spireFloorCoinsOf, spireIsGuard, spireStepsIn } from './spire_tower_model';

type Props = Readonly<{
  lang: Lang;
  outcome: SpireStepOutcome;
  coins: SpireCoinsConfig;
  myCoinRank: number | null;
  myPlace: number | null;
  busy: boolean;
  onHigher: () => void;
  onLater: () => void;
}>;

function CoinPill({ amount, rank }: Readonly<{ amount: number; rank: number | null }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  return (
    <View style={[s.pill, { backgroundColor: p.control }, sh.nested]}>
      {rank !== null ? <AvatarView avatar="" coinRank={rank} size={22} /> : <Ionicons name="ellipse" size={18} color={p.textSecondary} />}
      {/* зачем (Сверка spire-013, kit.js coins()): число без «+» */}
      <Text style={[s.pillText, { color: p.text }]}>{String(amount)}</Text>
    </View>
  );
}

type View_ = Readonly<{ over: string; overBad: boolean; title: string; sub: string; pills: readonly number[]; cta: string; ctaUp: boolean; ghost: string | null; ghostPill: boolean }>;

function describe(lang: Lang, o: SpireStepOutcome, coins: SpireCoinsConfig, place: number | null): View_ {
  const floorNow = Math.min(o.local.floor, SPIRE_FLOOR_COUNT);
  if (o.kind === 'failed' || o.kind === 'save_failed') {
    const title = o.kind === 'save_failed' ? spireGameText(lang, 'saveFailed')
      : o.failReason === 'timeout' ? spireGameText(lang, 'failTimeout')
        : o.failReason === 'backed_out' ? spireGameText(lang, 'failBack') : spireGameText(lang, 'failHearts');
    // зачем (аудит Макетов 7a207bc4a, координатор 12.10): при сбое СОХРАНЕНИЯ ступень не провалена по вине игрока — красная строка «Ступень не пройдена» и «Ещё раз»
    // заставляли думать, что он проиграл. Здесь строки нет, заголовок «Ступень не сохранилась. Попробуй ещё раз», кнопка «Повторить».
    const saveFailed = o.kind === 'save_failed';
    return {
      over: saveFailed ? '' : spireGameText(lang, 'stepFailed'), overBad: true, title,
      // зачем (Сверка spire-gap-014, savePanel): у «не сохранилась» нет подписи про новый набор; «Позже» там — текст (.sg-ghost), а у провала — таблетка (.cta.gh, spire-011)
      sub: saveFailed ? '' : spireGameText(lang, 'failSub', { n: o.floorBefore }), pills: [],
      cta: spireGameText(lang, saveFailed ? 'retry' : 'again'), ctaUp: false, ghost: spireGameText(lang, 'later'), ghostPill: !saveFailed,
    };
  }
  if (o.kind === 'summit') {
    return {
      over: spireText(lang, 'summit'), overBad: false, title: spireGameText(lang, 'onFloorN', { n: SPIRE_FLOOR_COUNT }),
      sub: spireGameText(lang, 'summitSub', { s: o.local.stepsCleared, p: place ?? '—' }),
      pills: [spireFloorCoinsOf(SPIRE_FLOOR_COUNT, coins), coins.summitBonus],
      cta: spireGameText(lang, 'aboveCloudsCta'), ctaUp: true, ghost: null, ghostPill: false,
    };
  }
  if (o.kind === 'floor') {
    const next = o.local.floor;
    const guardNext = spireIsGuard(next);
    return {
      over: spireGameText(lang, 'floorCleared', { n: o.floorBefore }), overBad: false,
      title: guardNext ? spireGameText(lang, 'guardAhead') : spireGameText(lang, 'floorAhead', { n: next }),
      sub: guardNext
        ? spireGameText(lang, 'guardSub', { n: next, m: coins.guardianMultiplier })
        : `${spireStepsCount(lang, spireStepsIn(next))} · ${spireFloorCoinsOf(next, coins)} ${spireText(lang, 'coinsPerFloor')}`,
      pills: [coins.perStep, spireFloorCoinsOf(o.floorBefore, coins)],
      cta: spireGameText(lang, 'higher'), ctaUp: true, ghost: null, ghostPill: false,
    };
  }
  const errors = o.errors === 0 ? spireGameText(lang, 'noErrors') : spireGameText(lang, 'errorsN', { n: o.errors });
  const progress = spireGameText(lang, 'onFloorProgress', { k: o.local.stepInFloor, n: spireStepsIn(floorNow) });
  return {
    over: spireGameText(lang, 'stepPassed'), overBad: false, title: spireGameText(lang, 'oneHigher'),
    sub: `${spireClock(o.usedMs)} / ${spireClock(o.budgetMs)} · ${errors} · ${progress}`,
    pills: [coins.perStep], cta: spireGameText(lang, 'higher'), ctaUp: true, ghost: null, ghostPill: false,
  };
}

function SpireResultPanel({ lang, outcome, coins, myCoinRank, myPlace, busy, onHigher, onLater }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const g = useShadowGlass();
  const v = describe(lang, outcome, coins, myPlace);
  return (
    <View style={[s.panel, { boxShadow: plateBoxShadow(g) }]} accessibilityLiveRegion="polite" testID={`spire-result-${outcome.kind}`}>
      <PlateFill g={g} radius={24} />
      {v.over ? <Text style={[s.over, { color: v.overBad ? p.wrong : p.textSecondary }]}>{v.over.toUpperCase()}</Text> : null}
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{v.title}</Text>
      {v.sub ? <Text style={[s.sub, { color: p.textSecondary }]}>{v.sub}</Text> : null}
      {v.pills.length > 0 ? (
        <View style={s.pills}>
          {v.pills.map((amount, i) => <CoinPill key={`c${i}-${amount}`} amount={amount} rank={myCoinRank} />)}
        </View>
      ) : null}
      <V2Pressable
        onPress={onHigher}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={v.cta}
        accessibilityState={{ disabled: busy, busy }}
        style={[s.cta, { backgroundColor: p.cta, opacity: busy ? 0.6 : 1 }, sh.action(p.cta)]}
        testID="spire-result-cta"
      >
        <Text style={[s.ctaText, { color: p.ctaText }]}>{v.cta}</Text>
        {/* зачем (Сверка spire-013, kit.css `.cta .ar`): стрелка у правого края */}
        {v.ctaUp ? <View pointerEvents="none" style={s.arrow}><Ionicons name="arrow-up" size={20} color={p.ctaText} /></View> : null}
      </V2Pressable>
      {v.ghost ? (
        <V2Pressable onPress={onLater} accessibilityRole="button" style={[s.ghost, v.ghostPill && [s.ghostPill, { backgroundColor: p.control }, sh.nested]]} testID="spire-result-later">
          <Text style={[s.ctaText, { color: p.text }]}>{v.ghost}</Text>
        </V2Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // Плашка стиля «Тень» (12.10): без кромки, градиент и тень.
  panel: { borderRadius: 24,
 paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  over: { fontSize: 13, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 16, lineHeight: 21, textAlign: 'center', marginTop: 6 },
  pills: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 },
  pill: { minHeight: 36, borderRadius: 18, paddingLeft: 7, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillText: { fontSize: 16, fontWeight: '700' },
  cta: { marginTop: 18, minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ghost: { marginTop: 8, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  arrow: { position: 'absolute', right: 22 },
  ghostPill: { marginTop: 10 },
});

export default memo(SpireResultPanel);

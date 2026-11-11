// ═══════════════════════════════════════════════════════════════════════════
// frames_reward.tsx — кадры историй наград (U36): итог недели Пика со статуэткой лиги (два вида) и ачивка на сцене.
//
// зачем (владелец 11.11): «за что дали награду» человек видит только в историях; кадр должен быть «дорогим и премиальным» — настоящая графика,
// свет, отражение, длинная анимация (активная фаза ≈ 5 с). Макет: docs/work/mockups/reward-reasons-2026-11-11/reward_story_premium.html.
// Решения владельца 11.11: оба вида кадра недели живут вместе и выбираются случайно (story_reward_variant); сцена — в цветах темы.
//
// Сумма на кадре (шаг 3, владелец 11.11: «делай»): награда за место и за повышение приходят в событии истории и равны 0, пока сервер
// не подтвердил выплату, — поэтому кадр показывает сумму только когда монеты дошли. Причины под суммой — прежние строки окна итога
// («+N за K место», «+N за повышение», 9 языков), новых переводов нет.
// Энергия (шаг 5, владелец 11.11): строка «+1 / −1 к запасу энергии» — тем же правилом, что в окне итога недели (spireWeekEnergyLine).
// «В пути» (шаг 6, владелец 11.11): пока монеты не дошли до кошелька, вместо суммы — монета и подпись «в пути»; после выплаты
// хранилище историй обновляет событие (refreshSpireWeekReward), и та же история показывает сумму.
// Чего на кадре пока нет: «сколько не хватило до пятёрки».
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { achievementConditionForLang, achievementDescForLang, achievementNameForLang, ALL_ACHIEVEMENTS } from '../../../app/achievements';
import { DebugLogger } from '../../../app/debug-logger';
import { getSpireEnergyBonus } from '../../../app/spire_energy_bonus_store';
import { spireTierName } from '../../../modules/spire/tier_names';
import AchievementArt from '../../AchievementArt';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { momentLeagueIn, momentText } from '../../spire/moments/moments_strings';
import { spireWeekEnergyLine } from '../../spire/spire_week_energy';
import { streakDayWord } from '../../streak/moments/streak_moments_strings';
import { storyText, storyThousands } from '../story_strings';
import { EASE_FALL, frameMs, phase, useStoryFrameClock } from './story_frame_clock';
import { Art, Confetti, FrameRoot, H1, Ov, P, k } from './story_template_kit';
import { CountUp, Enter } from './story_template_motion';
import { Sheen } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { spireLeagueStatue } from './story_reward_art';
import { REWARD_LAND_MS, StageDust, StageLight, StatueSwap } from './story_reward_stage';
import { peakWeekSeed, prevTierOf, storyRewardVariant } from './story_reward_variant';
import { tplText } from './story_template_strings';

const LOG = '[STORY-REWARD]';

/** Сторона статуэтки: не шире кадра без полей 28 и не больше 300 dp (на узких экранах сжимается вместе с кадром). */
function statueSize(windowWidth: number): number {
  return Math.max(180, Math.min(300, Math.round(windowWidth - 56)));
}

// ── сумма награды: своя монета, счёт от нуля и пять монет, падающих в неё из луча ─────────────────────────────────────────────

/** Сторона монеты у суммы и падающих монет, dp. */
const SUM_COIN = 40;
const FALL_COIN = 26;
/** Падение монет: первая стартует через 620 мс после того, как статуэтка встала; шаг 125 мс, полёт 860 мс (макет). */
const FALL_AT = REWARD_LAND_MS + 620;
const FALL_STEP = 125;
const FALL_MS = 860;
const FALL_COUNT = 5;

const FallingCoin = memo(function FallingCoin({ index, rank, fromY }: Readonly<{ index: number; rank: number | null; fromY: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const spread = (index - (FALL_COUNT - 1) / 2) * 34;
  const animated = useAnimatedStyle(() => {
    const raw = phase(frameMs(progress.value, durationMs, final), FALL_AT + index * FALL_STEP, FALL_MS);
    const p = EASE_FALL(raw);
    // до старта и после приземления монеты нет: в покое (и при «меньше движения») видна только монета у суммы
    const opacity = raw <= 0 || raw >= 1 ? 0 : Math.min(1, raw * 8);
    return { opacity, transform: [{ translateX: spread * (1 - p) }, { translateY: -fromY * (1 - p) }, { rotateY: `${900 * p}deg` }, { scale: 0.7 + 0.3 * p }] };
  });
  return <Animated.View pointerEvents="none" style={[f.fall, animated]}><SpireRankCoin rank={rank} size={FALL_COIN} /></Animated.View>;
});

/** Строка суммы: монета человека и «+N», которое досчитывается, пока монеты приземляются. */
const RewardSum = memo(function RewardSum({ total, rank }: Readonly<{ total: number; rank: number | null }>) {
  const pal = useStoryTemplatePalette();
  const { height } = useWindowDimensions();
  const { final } = useStoryFrameClock();
  const drops = useMemo(() => Array.from({ length: FALL_COUNT }, (_, i) => i), []);
  return (
    <Enter d={REWARD_LAND_MS + 420} style={f.sum}>
      <View style={f.sumCoin}>
        <SpireRankCoin rank={rank} size={SUM_COIN} />
        {final ? null : drops.map((i) => <FallingCoin key={i} index={i} rank={rank} fromY={height * 0.42} />)}
      </View>
      <CountUp to={total} d={FALL_AT + FALL_MS - 80} dur={FALL_COUNT * FALL_STEP + 260} prefix="+" style={[k.bigS, { color: pal.tx }]} testID="story-tpl-peakweek-sum" />
    </Enter>
  );
});

/** Награда ещё идёт в кошелёк: та же строка, что у суммы, но вместо числа — подпись «в пути». Монеты не падают. */
const RewardPending = memo(function RewardPending({ text, rank }: Readonly<{ text: string; rank: number | null }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter d={REWARD_LAND_MS + 420} style={f.sum}>
      <SpireRankCoin rank={rank} size={SUM_COIN} />
      <Text testID="story-tpl-peakweek-pending" style={[f.pending, { color: pal.sec }]}>{text}</Text>
    </Enter>
  );
});

// ── 8 · Пик · итог недели — статуэтка лиги ───────────────────────────────────────────────────────────────────────────

export const PeakWeekRewardFrame = memo(function PeakWeekRewardFrame({ tpl, lang, myRank }: StoryFrameProps<'peakweek'>) {
  const { width } = useWindowDimensions();
  const size = statueSize(width);
  const variant = useMemo(() => storyRewardVariant(peakWeekSeed(tpl)), [tpl]);
  const prevTier = prevTierOf(tpl.tier, tpl.outcome);
  const dir: 1 | 0 | -1 = tpl.outcome === 'up' ? 1 : tpl.outcome === 'down' ? -1 : 0;
  // на краях лестницы лиг прежняя лига совпадает с новой — тогда статуэтка одна, без смены
  const changed = dir !== 0 && prevTier !== tpl.tier;
  const league = spireTierName(tpl.tier, lang);

  // зачем (Ядро 14.10, прежний кадр): «+N за повышение» — только из promotionCoins сервера и только при подъёме
  const promotionCoins = tpl.outcome === 'up' ? Math.max(0, tpl.promotionCoins) : 0;
  // старое событие без поля → 0; оба числа уже нулевые, пока сервер не подтвердил выплату
  const placeCoins = Math.max(0, tpl.placeCoins ?? 0);
  const total = placeCoins + promotionCoins;
  // «в пути» — только когда суммы ещё нет: пришли числа — показываем их, даже если признак остался от старой записи
  const pending = total === 0 && tpl.rewardPending === true;
  // зачем (владелец 11.11: «добавь энергию на кадр»): то же правило и тот же источник запаса, что у окон повышения и карточки итога —
  // «+1» при подъёме, пока запас не на потолке; «−1» при спуске, только если было что снимать; лига не менялась — строки нет.
  const energyBonus = getSpireEnergyBonus();
  const energy = spireWeekEnergyLine(lang, { promoted: tpl.outcome === 'up', demoted: tpl.outcome === 'down' }, energyBonus);

  useEffect(() => {
    DebugLogger.info(LOG, `итог недели: вид=${variant} исход=${tpl.outcome} лига=${tpl.tier} прежняя=${prevTier} смена=${changed} место=${tpl.place}/${tpl.total} `
      + `монетНедели=${tpl.weekCoins} заМесто=${placeCoins}(в событии ${tpl.placeCoins === undefined ? 'нет поля' : tpl.placeCoins}) заПовышение=${promotionCoins} `
      + `сумма=${total}${total > 0 ? '' : pending ? ' → «в пути»' : ' → строки суммы нет'} вПутиВСобытии=${String(tpl.rewardPending ?? 'нет поля')} запасЭнергии=${energyBonus} строкаЭнергии=${energy === null ? 'нет' : `«${energy}»`} статуэтка=${size}dp`);
  }, [variant, tpl, prevTier, changed, size, placeCoins, promotionCoins, total, pending, energyBonus, energy]);

  const outcome = tpl.outcome === 'up' ? storyText(lang, 'weekUp', { league })
    : tpl.outcome === 'down' ? storyText(lang, 'weekDown', { league })
      : momentText(lang, 'stayTitle', { league: momentLeagueIn(lang, tpl.tier, league) });
  // Есть сумма — под ней её причины («за N место», «за повышение»). Нет суммы — исход недели и монеты недели, как раньше.
  const reason = (total > 0 ? [
    placeCoins > 0 ? momentText(lang, tpl.place > 0 ? 'placeBonus' : 'placeBonusNoRank', { n: placeCoins, place: tpl.place }) : null,
    promotionCoins > 0 ? momentText(lang, 'promoBonus', { n: promotionCoins }) : null,
  ] : [
    outcome,
    tpl.weekCoins > 0 ? storyText(lang, 'weekCoins', { coins: storyThousands(tpl.weekCoins) }) : null,
  ]).filter((part): part is string => part !== null).join(' · ');

  return (
    <FrameRoot
      testID="story-tpl-peakweek"
      layer={(
        <>
          <StageLight variant={variant} />
          <StageDust />
          {/* искры в цветах темы — только при подъёме, в момент, когда новая статуэтка встала в свет */}
          {tpl.outcome === 'up' ? <Confetti n={14} d0={REWARD_LAND_MS - 80} /> : null}
        </>
      )}
    >
      <Art style={f.art}>
        <StatueSwap from={changed ? spireLeagueStatue(prevTier) : null} to={spireLeagueStatue(tpl.tier)} size={size} dir={changed ? dir : 0} variant={variant} label={league} />
      </Art>
      <Ov text={storyText(lang, 'weekResult')} d={REWARD_LAND_MS - 350} />
      <H1 text={league} d0={REWARD_LAND_MS - 250} />
      {tpl.place > 0 && tpl.total > 0 ? <P text={storyText(lang, 'weekPlace', { place: tpl.place, total: tpl.total })} d={REWARD_LAND_MS + 150} /> : null}
      {total > 0 ? <RewardSum total={total} rank={myRank} /> : pending ? <RewardPending text={tplText(lang, 'rewardOnTheWay')} rank={myRank} /> : null}
      <P text={reason} d={REWARD_LAND_MS + (total > 0 ? 1550 : 600)} />
      {energy !== null ? <P text={energy} d={REWARD_LAND_MS + (total > 0 ? 1800 : 850)} /> : null}
    </FrameRoot>
  );
});

// ── 3 · ачивка на сцене ──────────────────────────────────────────────────────────────────────────────────────────────

/** Сторона арта ачивки на сцене (у прежнего кадра — 132). */
const ACH_SIZE = 200;
const ACH_RADIUS = 44;

export const AchRewardFrame = memo(function AchRewardFrame({ tpl, lang }: StoryFrameProps<'ach'>) {
  const pal = useStoryTemplatePalette();
  const copy = useMemo(() => {
    const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === tpl.achievementId);
    if (!achievement) {
      DebugLogger.info(LOG, `ачивка ${tpl.achievementId}: нет в каталоге — кадр без названия и условия`);
      return { name: '', reason: '' };
    }
    return { name: achievementNameForLang(achievement, lang), reason: achievementConditionForLang(achievement, lang) ?? achievementDescForLang(achievement, lang) };
  }, [lang, tpl.achievementId]);

  useEffect(() => {
    DebugLogger.info(LOG, `ачивка: id=${tpl.achievementId} открыто=${tpl.opened ?? '—'}/${tpl.total ?? '—'} следующая=${tpl.nextDays ?? '—'} естьНазвание=${copy.name !== ''}`);
  }, [tpl, copy.name]);

  const overline = tpl.opened !== null && tpl.total !== null ? tplText(lang, 'achCount', { opened: tpl.opened, total: tpl.total }) : storyText(lang, 'achOverline');
  return (
    <FrameRoot testID="story-tpl-ach" layer={<><StageLight variant="pedestal" /><StageDust /><Confetti n={16} d0={1500} /></>}>
      <Art style={f.art}>
        {/* арт выходит из темноты: проявление с подъёмом за 1,3 с, затем по нему проходит блик */}
        <Enter kind="rise" d={150} dur={1300}>
          <View style={[f.ach, { boxShadow: `0 26px 54px -18px ${mix(pal.shTint, 0.7)}` }]}>
            <View style={f.achClip}>
              <AchievementArt achievementId={tpl.achievementId} iconColor={pal.acc} size={ACH_SIZE} borderRadius={ACH_RADIUS} accessibilityLabel={copy.name || undefined} />
              <Sheen size={ACH_SIZE} />
            </View>
          </View>
        </Enter>
      </Art>
      <Ov text={overline} d={1500} />
      {copy.name ? <H1 text={copy.name} d0={1600} /> : null}
      {copy.reason ? <P text={copy.reason} d={2000} /> : null}
      {tpl.nextDays !== null ? <P text={storyText(lang, 'achNext', { n: tpl.nextDays, dn: streakDayWord(lang, tpl.nextDays) })} d={2300} /> : null}
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // у статуэтки под основанием отражение — оставляем ему место до текста
  art: { marginBottom: 34 },
  // строка суммы: монета и число в ряд по центру; падающие монеты лежат поверх монеты и не занимают места в вёрстке
  sum: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
  sumCoin: { width: SUM_COIN, height: SUM_COIN },
  // подпись «в пути» у монеты: спокойнее числа суммы, вторичным цветом темы
  pending: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  fall: { position: 'absolute', left: (SUM_COIN - FALL_COIN) / 2, top: (SUM_COIN - FALL_COIN) / 2, width: FALL_COIN, height: FALL_COIN },
  ach: { width: ACH_SIZE, height: ACH_SIZE, borderRadius: ACH_RADIUS },
  achClip: { width: ACH_SIZE, height: ACH_SIZE, borderRadius: ACH_RADIUS, overflow: 'hidden' },
});

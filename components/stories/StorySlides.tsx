// ═══════════════════════════════════════════════════════════════════════════
// StorySlides.tsx — четыре вида кадра просмотра сторис (D192): итог недели, рубеж серии, ранг монеты, ачивка.
//
// зачем (владелец 14.10; образец docs/design/v2-app/stories-avatar.html, s3 «События — по одному кадру»): показываем ТОЛЬКО то, что реально произошло. Кадры собираются из уже готовых деталей —
// башня новой лиги целиком со своим этажом и монетой-маркером (SpireTowerSvg, как в моменте повышения), огонь серии с цифрой на тёмной плашке (StreakMomentFlame), монета ранга до → после,
// арт ачивки (AchievementArt). Монета здесь — только валюта и аватар ранга: никаких реплик и эмоций. Данные берутся из payload события Ядра (modules/story_events), сеть не нужна.
// Нет нужного поля в payload — кадр рисует то, что есть, и не выдумывает остальное (нет `total` — строки «место из» нет).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { spireSkinForTier } from '../../modules/spire/tower_skins';
import { clampSpireTierIndex, spireTierName } from '../../modules/spire/tier_names';
import type { StoryEvent } from '../../modules/story_events/story_events_core';
import { achievementNameForLang, ALL_ACHIEVEMENTS } from '../../app/achievements';
import { coinRankRowForDisplay, isValidCoinRank } from '../../app/coin_rank_table_v1';
import AchievementArt from '../AchievementArt';
import SpireRankCoin from '../spire/SpireRankCoin';
import SpireTowerSvg from '../spire/SpireTowerSvg';
import { SPIRE_TOWER_GEOM, SPIRE_TW, spireMarkerXY } from '../spire/spire_tower_model';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireScene } from '../spire/useSpireScene';
import { momentLeagueIn, momentText } from '../spire/moments/moments_strings';
import StreakMomentFlame from '../streak/moments/StreakMomentFlame';
import { isStreakMilestone, nextStreakMilestone, streakFlameStage } from '../streak/moments/streak_milestones';
import { streakMilestoneTitle, streakMomentText } from '../streak/moments/streak_moments_strings';
import { storyText, storyThousands } from './story_strings';

export type StorySlideProps = Readonly<{
  event: StoryEvent;
  lang: Lang;
  /** Ранг монеты человека (для маркера «ты здесь» на башне); null — базовая монета. */
  coinRank: number | null;
}>;

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || fallback);
const noopSelect = (): void => undefined;
/** Пороги стадий огня образца (streak_milestones.streakFlameStage): первый день новой стадии показывает «новая стадия огня». */
const STAGE_START_DAYS: readonly number[] = [7, 30, 100, 365, 1000];

// ─── итог недели ────────────────────────────────────────────────────────────
function WeekSlide({ event, lang, coinRank }: StorySlideProps) {
  const p = useSpirePalette();
  const scene = useSpireScene();
  const { height: winH } = useWindowDimensions();
  const tier = clampSpireTierIndex(num(event.payload.floor));
  const outcome = String(event.payload.outcome ?? 'stay');
  const place = num(event.payload.place);
  const total = num(event.payload.total);
  // зачем (Ядро 14.10): монеты недели и награда за повышение приходят в payload события; число награды — ТОЛЬКО из promotionCoins сервера (0 или нет поля — строки нет), «+100» в коде не живёт
  const weekCoins = num(event.payload.weekCoins);
  const promotionCoins = num(event.payload.promotionCoins);
  const skin = useMemo(() => spireSkinForTier(tier), [tier]);
  const ratio = SPIRE_TOWER_GEOM.height / SPIRE_TW;
  // высота под башню: экран − шапка/полосы (120) − низ (60) − блок текста (150) − воздух
  const towerW = Math.max(110, Math.min(170, Math.floor((winH - 120 - 60 - 150 - 40) / ratio)));
  const k = towerW / SPIRE_TW;
  const mk = spireMarkerXY(SPIRE_TOWER_GEOM.floors[0]);
  const league = spireTierName(tier, lang);
  const title = outcome === 'up' ? storyText(lang, 'weekUp', { league })
    : outcome === 'down' ? storyText(lang, 'weekDown', { league })
      : momentText(lang, 'stayTitle', { league: momentLeagueIn(lang, tier, league) });
  const subParts = [
    total > 0 && place > 0 ? storyText(lang, 'weekPlace', { place, total }) : null,
    weekCoins > 0 ? storyText(lang, 'weekCoins', { coins: storyThousands(weekCoins) }) : null,
    outcome === 'up' && promotionCoins > 0 ? `+${storyThousands(promotionCoins)}` : null,
  ].filter((part): part is string => part !== null);
  return (
    <>
      <View testID="story-week-tower" style={{ width: towerW, height: Math.round(SPIRE_TOWER_GEOM.height * k) }}>
        <SpireTowerSvg lang={lang} myFloor={1} selected={0} onSelect={noopSelect} width={towerW} skin={skin} scene={scene} />
        <View style={[s.marker, { left: Math.round(mk.x * k - 17), top: Math.round(mk.y * k - 17) }]}>
          <View style={s.markerInner}><SpireRankCoin rank={coinRank} size={26} /></View>
        </View>
      </View>
      <Text style={[s.overline, { color: p.accentText, marginTop: 14 }]}>{`${storyText(lang, 'weekResult')} · ${momentText(lang, 'floorTag', { n: 1 })}`}</Text>
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
      {subParts.length > 0 ? <Text style={[s.sub, { color: p.textSecondary }]}>{subParts.join(' \u00B7 ')}</Text> : null}
    </>
  );
}

// ─── рубеж серии ────────────────────────────────────────────────────────────
function StreakSlide({ event, lang }: StorySlideProps) {
  const p = useSpirePalette();
  const days = num(event.payload.days);
  const next = nextStreakMilestone(days);
  const stageStarts = STAGE_START_DAYS.includes(days);
  const nextStage = STAGE_START_DAYS.find((d) => d > days) ?? null;
  const sub = stageStarts && nextStage
    ? streakMomentText(lang, 'stageNew', { next: nextStage })
    : stageStarts ? streakMomentText(lang, 'finalStage')
      : next ? streakMomentText(lang, 'toNext', { next, left: next - days }) : null;
  return (
    <>
      <StreakMomentFlame days={days} label={days} size={150} testID="story-streak-flame" />
      <Text style={[s.overline, { color: p.accentText, marginTop: 14 }]}>{streakMomentText(lang, 'overline', { n: days })}</Text>
      {isStreakMilestone(days) ? <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{streakMilestoneTitle(lang, days)}</Text> : null}
      {sub ? <Text style={[s.sub, { color: p.textSecondary }]}>{sub}</Text> : null}
    </>
  );
}

// ─── ранг монеты ────────────────────────────────────────────────────────────
function CoinRankSlide({ event, lang }: StorySlideProps) {
  const p = useSpirePalette();
  const toRank = num(event.payload.toRank);
  const fromRank = Math.max(0, toRank - 1);
  const price = isValidCoinRank(toRank) ? coinRankRowForDisplay(toRank).priceToReach : toRank * 1000;
  return (
    <>
      <View style={s.rankRow}>
        <View style={s.rankFrom}><SpireRankCoin rank={fromRank} size={56} /></View>
        <Ionicons name="arrow-forward" size={22} color={p.textSecondary} />
        <SpireRankCoin rank={toRank} size={110} />
      </View>
      <Text style={[s.overline, { color: p.accentText, marginTop: 18 }]}>{storyText(lang, 'rankOverline')}</Text>
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{storyText(lang, 'rankTitle', { n: toRank })}</Text>
      <Text style={[s.sub, { color: p.textSecondary }]}>{storyText(lang, 'rankPaid', { price: storyThousands(price) })}</Text>
    </>
  );
}

// ─── ачивка ─────────────────────────────────────────────────────────────────
function AchievementSlide({ event, lang }: StorySlideProps) {
  const p = useSpirePalette();
  const id = String(event.payload.achievementId ?? '');
  const def = ALL_ACHIEVEMENTS.find((a) => a.id === id);
  const name = def ? achievementNameForLang(def, lang) : '';
  return (
    <>
      <View style={s.achArt}><AchievementArt achievementId={id} size={120} borderRadius={28} accessibilityLabel={name || undefined} /></View>
      <Text style={[s.overline, { color: p.accentText, marginTop: 18 }]}>{storyText(lang, 'achOverline')}</Text>
      {name ? <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{name}</Text> : null}
    </>
  );
}

function StorySlide(props: StorySlideProps) {
  switch (props.event.type) {
    case 'spire_week': return <WeekSlide {...props} />;
    case 'streak_milestone': return <StreakSlide {...props} />;
    case 'coin_rank_up': return <CoinRankSlide {...props} />;
    case 'achievement': return <AchievementSlide {...props} />;
    default: return null;
  }
}

const s = StyleSheet.create({
  // `.ov`: 13/16, капсом с разрядкой не нужен — короткая строка над заголовком
  overline: { fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  // `.h-xl`: 30/36/700
  title: { marginTop: 8, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  sub: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  marker: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: '#F2F1F6', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: маркер «Ты здесь» как в SpireTower и моменте повышения
  markerInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#0C0C0D', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: маркер «Ты здесь» как в SpireTower
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankFrom: { opacity: 0.5 },
  achArt: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
});

export default memo(StorySlide);

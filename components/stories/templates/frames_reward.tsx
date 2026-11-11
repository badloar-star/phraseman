// ═══════════════════════════════════════════════════════════════════════════
// frames_reward.tsx — кадры историй наград (U36): итог недели Пика со статуэткой лиги (два вида) и ачивка на сцене.
//
// зачем (владелец 11.11): «за что дали награду» человек видит только в историях; кадр должен быть «дорогим и премиальным» — настоящая графика,
// свет, отражение, длинная анимация (активная фаза ≈ 5 с). Макет: docs/work/mockups/reward-reasons-2026-11-11/reward_story_premium.html.
// Решения владельца 11.11: оба вида кадра недели живут вместе и выбираются случайно (story_reward_variant); сцена — в цветах темы.
//
// Первый шаг переноса работает на тех данных, что история уже знает: лига, исход, место, монеты недели, бонус за повышение.
// Разбивки «за место / за повышение», признака «монеты дошли» и изменения энергии в событии пока нет — их добавляет отдельный шаг
// (файлы сборки события 11.11 редактировались в другой сессии). Поэтому большой суммы на кадре нет: показывать «+100», когда человек
// получил больше, было бы неправдой. Слова — прежние строки итога недели, новых переводов этот шаг не требует.
//
// Кадры пока НЕ подключены в StoryTemplateSlide: подключение — после проверки типов и тестов (решение владельца 11.11).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { achievementConditionForLang, achievementDescForLang, achievementNameForLang, ALL_ACHIEVEMENTS } from '../../../app/achievements';
import { DebugLogger } from '../../../app/debug-logger';
import { spireTierName } from '../../../modules/spire/tier_names';
import AchievementArt from '../../AchievementArt';
import { momentLeagueIn, momentText } from '../../spire/moments/moments_strings';
import { streakDayWord } from '../../streak/moments/streak_moments_strings';
import { storyText, storyThousands } from '../story_strings';
import { Art, Confetti, FrameRoot, H1, Ov, P } from './story_template_kit';
import { Enter } from './story_template_motion';
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

// ── 8 · Пик · итог недели — статуэтка лиги ───────────────────────────────────────────────────────────────────────────

export const PeakWeekRewardFrame = memo(function PeakWeekRewardFrame({ tpl, lang }: StoryFrameProps<'peakweek'>) {
  const { width } = useWindowDimensions();
  const size = statueSize(width);
  const variant = useMemo(() => storyRewardVariant(peakWeekSeed(tpl)), [tpl]);
  const prevTier = prevTierOf(tpl.tier, tpl.outcome);
  const dir: 1 | 0 | -1 = tpl.outcome === 'up' ? 1 : tpl.outcome === 'down' ? -1 : 0;
  // на краях лестницы лиг прежняя лига совпадает с новой — тогда статуэтка одна, без смены
  const changed = dir !== 0 && prevTier !== tpl.tier;
  const league = spireTierName(tpl.tier, lang);

  useEffect(() => {
    DebugLogger.info(LOG, `итог недели: вид=${variant} исход=${tpl.outcome} лига=${tpl.tier} прежняя=${prevTier} смена=${changed} место=${tpl.place}/${tpl.total} `
      + `монетНедели=${tpl.weekCoins} заПовышение=${tpl.promotionCoins} статуэтка=${size}dp`);
  }, [variant, tpl, prevTier, changed, size]);

  const outcome = tpl.outcome === 'up' ? storyText(lang, 'weekUp', { league })
    : tpl.outcome === 'down' ? storyText(lang, 'weekDown', { league })
      : momentText(lang, 'stayTitle', { league: momentLeagueIn(lang, tpl.tier, league) });
  // зачем (Ядро 14.10, прежний кадр): «+N за повышение» — только из promotionCoins сервера и только при подъёме
  const reason = [
    outcome,
    tpl.weekCoins > 0 ? storyText(lang, 'weekCoins', { coins: storyThousands(tpl.weekCoins) }) : null,
    tpl.outcome === 'up' && tpl.promotionCoins > 0 ? momentText(lang, 'promoBonus', { n: tpl.promotionCoins }) : null,
  ].filter((part): part is string => part !== null).join(' · ');

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
      <P text={reason} d={REWARD_LAND_MS + 600} />
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
  ach: { width: ACH_SIZE, height: ACH_SIZE, borderRadius: ACH_RADIUS },
  achClip: { width: ACH_SIZE, height: ACH_SIZE, borderRadius: ACH_RADIUS, overflow: 'hidden' },
});

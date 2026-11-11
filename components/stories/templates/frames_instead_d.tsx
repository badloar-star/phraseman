// ═══════════════════════════════════════════════════════════════════════════
// frames_instead_d.tsx — кадры «Пик · позиция выросла» и «Пик · последний шанс» (третий кадр Пика — «тебя обгоняют» —
// живёт в frames_instead_b.tsx на месте прежнего кадра 17).
//
// зачем (владелец 11.11: макет stories-peak-position — «Да, в приложение»; часы — «Считать при открытии»): окна позиции Пика
// всплывали над башней до трёх подряд. Кадры показывают только то, что знали окна; разметка и задержки — из `render()` макета
// docs/design/v2-app/stories-peak-position.html построчно. Слова — те же, что у окон (position_moment_strings, moments_strings).
// «Последний шанс»: время считается в момент открытия истории (не тикает) — после конца недели кадр не строится вовсе.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { Text } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { positionClockHms, positionMomentText } from '../../spire/moments/position_moment_strings';
import { momentText } from '../../spire/moments/moments_strings';
import { spireClock } from '../../spire/spire_game_strings';
import { Art, FrameRoot, H1, Ov, P, Ring, k } from './story_template_kit';
import { Enter } from './story_template_motion';
import { LevelSwap } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import { IconDisc } from './story_instead_parts';
import { insteadText } from './story_instead_strings';

/** Место «было → стало» (0-основанные, как у окна) и монеты ступени. */
export type PeakRiseStory = Readonly<{ fromIndex: number; toIndex: number; coinsGained: number }>;
/** Конец недели и возврат энергии; разрыв до топ-5 — в ступенях, если комната по ступеням, иначе в монетах; null — границы нет. */
export type PeakLastChanceStory = Readonly<{ weekEndsAtMs: number; energyReadyAtMs: number; gapCoins: number | null; gapSteps: number | null }>;

type FrameProps<D> = Readonly<{ tpl: D; lang: Lang; myRank: number | null }>;

/** Граница топа комнаты недели — та же, что у окна «Позиция выросла». */
const TOP5 = 5;

// ── 18 · Пик · позиция выросла (взамен окна «Позиция выросла» после ступени) ─────────────────────────

export const PeakRiseFrame = memo(function PeakRiseFrame({ tpl, lang, myRank }: FrameProps<PeakRiseStory>) {
  const pal = useStoryTemplatePalette();
  // заголовок — правилом окна: вошёл в топ-5 — «Ты в топ-5», иначе «N место. Поднимаешься»
  const crossesTop5 = tpl.fromIndex >= TOP5 && tpl.toIndex < TOP5;
  const title = crossesTop5 ? positionMomentText(lang, 'inTop5') : momentText(lang, 'promoPlace', { n: tpl.toIndex + 1 });
  return (
    <FrameRoot testID="story-tpl-instead-peak-rise">
      <Art>
        <Ring frac={1}><LevelSwap from={String(tpl.fromIndex + 1)} to={String(tpl.toIndex + 1)} /></Ring>
      </Art>
      <H1 text={title} d0={780} />
      {tpl.coinsGained > 0 ? (
        <Enter d={1050} style={[k.chip, { backgroundColor: mix(pal.tx, 0.12) }]}>
          <SpireRankCoin rank={myRank} size={20} />
          <Text style={[k.chipT, { color: pal.tx }]}>{insteadText(lang, 'plusCoins', { coins: tpl.coinsGained })}</Text>
        </Enter>
      ) : null}
    </FrameRoot>
  );
});

// ── 20 · Пик · последний шанс (взамен окна «Последний шанс» в воскресенье) ───────────────────────────

export const PeakLastChanceFrame = memo(function PeakLastChanceFrame({ tpl, lang }: FrameProps<PeakLastChanceStory>) {
  const pal = useStoryTemplatePalette();
  // зачем (владелец 11.11: «Считать при открытии»): время берётся в момент открытия кадра и дальше не тикает
  const now = useMemo(() => Date.now(), []);
  const weekClock = positionClockHms(Math.max(0, tpl.weekEndsAtMs - now));
  const energyClock = spireClock(Math.max(0, tpl.energyReadyAtMs - now));
  const gap = tpl.gapSteps !== null
    ? positionMomentText(lang, 'gapSteps', { steps: tpl.gapSteps })
    : tpl.gapCoins !== null ? positionMomentText(lang, 'gapCoins', { n: tpl.gapCoins }) : null;
  return (
    <FrameRoot testID="story-tpl-instead-peak-last">
      <Art><IconDisc icon="hourglass" /></Art>
      <Ov text={positionMomentText(lang, 'lastOver')} d={380} />
      <Enter d={460}><Text style={[k.bigS, { color: pal.tx }]}>{weekClock}</Text></Enter>
      {gap !== null ? <P text={positionMomentText(lang, 'lastBody', { gap, t: energyClock })} d={820} /> : null}
    </FrameRoot>
  );
});

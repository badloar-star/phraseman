// ═══════════════════════════════════════════════════════════════════════════
// frames_instead_a.tsx — кадры 1–8 и 16 макета stories-instead-of-modals.html: приветствие новичка, с возвращением,
// бонусы стали монетами, хватает на ранг, вышло обновление, личное сообщение, напоминания выключены, Plus закончился, Plus подключён.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», затем «Да, в приложение»):
// каждый кадр заменяет одно всплывающее окно из аудита (какое именно — в комментарии над кадром). Разметка, задержки и кегли —
// из `render()` кадров макета построчно; кадры собраны из готовых блоков набора историй (монета, переворот, дождь монет, плитки чисел).
//
// ФАЙЛ ПОКА НИКЕМ НЕ ИМПОРТИРУЕТСЯ: раздел историй 11.11 правит другая сессия (реестр, StoryTemplateSlide, события). Подключение —
// id в story_template_registry, ветки в StoryTemplateSlide, события-источники в modules/story_events, снятие самих окон — отдельным
// шагом после её коммита; тогда типы пропсов ниже переезжают в реестр. Пакет: docs/work/tasks/stories-instead-of-modals-frames-2026-11-11.md
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import type { Lang } from '../../../constants/i18n';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { Art, Chip, Confetti, FrameRoot, H1, Ov, P, Stat, Stats, k, statNumberStyle } from './story_template_kit';
import { CoinFlip, CoinRain } from './story_template_layers';
import { CountUp, Enter } from './story_template_motion';
import { Breathe } from './story_template_parts';
import { useStoryTemplatePalette } from './story_template_palette';
import { tplNumber } from './story_template_strings';
import { BigPlusMark, Bubbles, IconDisc, PerkRows } from './story_instead_parts';
import { insteadText } from './story_instead_strings';
import { pickUpdateText } from '../../UpdateModal';
import { notifNudgeCopy } from '../../../app/notif_nudge_copy';

/** Данные кадров — только то, что событие уже знает. При подключении переезжают в story_template_registry. */
export type HelloNewStory = Readonly<{ coinRank: number }>;
export type WelcomeBackStory = Readonly<{ coinRank: number | null; daysAway: number; dueCards: number; phrasesLearned: number }>;
/** Сколько было старого: опыт, жемчуг, вращения — то, что сервер пересчитал в монеты (legacy_bonus_view: from). */
export type LegacyCoinsStory = Readonly<{ coins: number; xpBefore: number; pearlsBefore: number; spinsBefore: number }>;
export type RankEnoughStory = Readonly<{ rank: number; nextRank: number; balance: number; price: number }>;
/** Текст из настроек обновления (его показывало окно) или null — тогда стандартный текст окна. Номера версии и списка изменений проверка обновления не знает. */
export type AppUpdateStory = Readonly<{ message: string | null }>;
export type TeamMessageStory = Readonly<{ text: string; whenLabel: string }>;
/** Сколько дней без занятий — единственное, что знает сигнал; занимался ли человек в дни до этого, приложение не знает. */
export type NotifNudgeStory = Readonly<{ missedDays: number }>;
/** `freezesPerMonth` — из PREMIUM_FREE_FREEZES_PER_MONTH, `untilLabel` — готовая дата на языке интерфейса; null — дата неизвестна, строки с датой нет. */
export type PlusStateStory = Readonly<{ untilLabel: string | null; freezesPerMonth: number }>;

type FrameProps<D> = Readonly<{ tpl: D; lang: Lang }>;

/** Три возможности Plus — одни и те же в кадрах «закончился» и «подключён», только порядок как в макете. */
function plusPerks(lang: Lang, freezesPerMonth: number): Readonly<{ shield: string; dialogs: string; lessons: string }> {
  return { shield: insteadText(lang, 'perkShield', { n: freezesPerMonth }), dialogs: insteadText(lang, 'perkDialogs'), lessons: insteadText(lang, 'perkLessons') };
}

// ── 1 · приветствие новичка (взамен окна-приветствия после онбординга) ───────────────────────────────

export const HelloNewFrame = memo(function HelloNewFrame({ tpl, lang }: FrameProps<HelloNewStory>) {
  return (
    <FrameRoot testID="story-tpl-instead-hello">
      <Art>
        <Enter kind="pop" d={120}><Breathe><SpireRankCoin rank={tpl.coinRank} size={124} /></Breathe></Enter>
      </Art>
      <Ov text={insteadText(lang, 'helloOverline')} d={380} />
      <H1 text={insteadText(lang, 'helloTitle')} d0={460} small />
      <P text={insteadText(lang, 'helloText')} d={760} />
    </FrameRoot>
  );
});

// ── 2 · с возвращением (взамен окна «С возвращением») ────────────────────────────────────────────────

export const WelcomeBackFrame = memo(function WelcomeBackFrame({ tpl, lang }: FrameProps<WelcomeBackStory>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-instead-back">
      <Art>
        <Enter kind="pop" d={120}><Breathe><SpireRankCoin rank={tpl.coinRank} size={112} /></Breathe></Enter>
      </Art>
      <Ov text={insteadText(lang, 'backOverline', { days: tpl.daysAway })} d={380} />
      <H1 text={insteadText(lang, 'backTitle')} d0={460} />
      <P text={insteadText(lang, 'backText')} d={640} />
      <Stats>
        <Stat d={800} value={<CountUp to={tpl.dueCards} d={900} dur={800} style={statNumberStyle(pal)} />} label={insteadText(lang, 'backCardsLabel', { cards: tpl.dueCards })} />
        <Stat d={880} value={<CountUp to={tpl.phrasesLearned} d={980} dur={800} style={statNumberStyle(pal)} />} label={insteadText(lang, 'backPhrasesLabel')} />
      </Stats>
    </FrameRoot>
  );
});

// ── 3 · бонусы стали монетами (взамен окна «Встречайте PhraseMan 2.0») ───────────────────────────────

export const LegacyCoinsFrame = memo(function LegacyCoinsFrame({ tpl, lang }: FrameProps<LegacyCoinsStory>) {
  const pal = useStoryTemplatePalette();
  const before = useMemo(() => ([
    { key: 'xp', value: tpl.xpBefore, label: 'legacyXpLabel' },
    { key: 'pearls', value: tpl.pearlsBefore, label: 'legacyPearlsLabel' },
    { key: 'spins', value: tpl.spinsBefore, label: 'legacySpinsLabel' },
  ] as const).filter((row) => row.value > 0), [tpl.xpBefore, tpl.pearlsBefore, tpl.spinsBefore]);
  return (
    <FrameRoot testID="story-tpl-instead-legacy" layer={<CoinRain />} layerClip={false}>
      <Enter d={300}><CountUp to={tpl.coins} d={500} dur={1100} style={[k.bigM, { color: pal.tx }]} /></Enter>
      <Ov text={insteadText(lang, 'legacyOverline')} d={700} />
      <H1 text={insteadText(lang, 'legacyTitle')} d0={780} small />
      <P text={insteadText(lang, 'legacyText')} d={1100} />
      {/* зачем: плитка — только у того, что реально было (ноль опыта или вращений строкой не показываем); задержки 1250 / 1330 / 1410 */}
      {before.length > 0 ? (
        <Stats>
          {before.map((row, i) => <Stat key={row.key} d={1250 + i * 80} value={tplNumber(row.value)} label={insteadText(lang, row.label)} />)}
        </Stats>
      ) : null}
    </FrameRoot>
  );
});

// ── 4 · хватает на ранг (взамен окна «Хватает на ранг N») ────────────────────────────────────────────

export const RankEnoughFrame = memo(function RankEnoughFrame({ tpl, lang }: FrameProps<RankEnoughStory>) {
  // зачем: «останется» — только для подписи кадра, из чисел события; баланс здесь не меняется
  const left = Math.max(0, tpl.balance - tpl.price); // guard-ok: остаток для подписи кадра, баланс не меняется
  return (
    <FrameRoot testID="story-tpl-instead-rank">
      <Art><CoinFlip from={tpl.rank} to={tpl.nextRank} /></Art>
      <Ov text={insteadText(lang, 'rankOverline', { rank: tpl.rank })} d={500} />
      <H1 text={insteadText(lang, 'rankTitle', { next: tpl.nextRank })} d0={580} />
      <P text={insteadText(lang, 'rankText', { coins: tpl.balance, next: tpl.nextRank, price: tpl.price })} d={800} />
      <Chip icon="wallet" text={insteadText(lang, 'rankLeft', { left })} d={950} />
    </FrameRoot>
  );
});

// ── 5 · вышло обновление (взамен окна «Доступно обновление») ─────────────────────────────────────────

export const AppUpdateFrame = memo(function AppUpdateFrame({ tpl, lang }: FrameProps<AppUpdateStory>) {
  // зачем (шаг 2и, 11.11): слова — те же, что у окна «Доступно обновление» (голос Компаса); придуманные в макете «Версия 2.1»
  // и три строки изменений убраны — проверка обновления знает только «есть версия новее» и необязательный текст
  const copy = pickUpdateText(lang);
  return (
    <FrameRoot testID="story-tpl-instead-update">
      <Art><IconDisc icon="rocket" /></Art>
      <H1 text={copy.title} d0={380} />
      <P text={tpl.message ?? copy.body} d={760} />
    </FrameRoot>
  );
});

// ── 6 · личное сообщение (взамен окна личного сообщения от команды) ──────────────────────────────────

export const TeamMessageFrame = memo(function TeamMessageFrame({ tpl, lang }: FrameProps<TeamMessageStory>) {
  const bubbles = useMemo(() => [{ text: tpl.text, me: false }], [tpl.text]);
  return (
    <FrameRoot testID="story-tpl-instead-message">
      <Bubbles bubbles={bubbles} d0={240} wide />
      <Ov text={insteadText(lang, 'msgOverline')} d={620} />
      <H1 text={insteadText(lang, 'msgTitle')} d0={700} />
      <P text={tpl.whenLabel} d={940} />
    </FrameRoot>
  );
});

// ── 7 · напоминания выключены (взамен окна «Включить уведомления») ───────────────────────────────────

export const NotifNudgeFrame = memo(function NotifNudgeFrame({ tpl, lang }: FrameProps<NotifNudgeStory>) {
  // зачем (шаг 2к, 11.11): слова — те же, что у окна «Включи напоминания» (app/notif_nudge_copy). Неделя с галочками из макета убрана:
  // сигнал знает только число пропущенных дней, а галочки «занимался» за дни до этого были бы выдумкой — вместо неё знак в круге
  const copy = notifNudgeCopy(lang, tpl.missedDays);
  return (
    <FrameRoot testID="story-tpl-instead-nudge">
      <Art><IconDisc icon="time" /></Art>
      <H1 text={copy.title} d0={380} />
      <P text={copy.body} d={760} />
    </FrameRoot>
  );
});

// ── 8 · Plus закончился (взамен автоперехода на экран оплаты после истёкшей подписки) ────────────────

export const PlusExpiredFrame = memo(function PlusExpiredFrame({ tpl, lang }: FrameProps<PlusStateStory>) {
  const perks = plusPerks(lang, tpl.freezesPerMonth);
  return (
    <FrameRoot testID="story-tpl-instead-plus-expired">
      <Art><BigPlusMark off id="expired" /></Art>
      {tpl.untilLabel ? <Ov text={insteadText(lang, 'untilOverline', { date: tpl.untilLabel })} d={380} /> : null}
      <H1 text={insteadText(lang, 'expiredTitle')} d0={460} />
      <PerkRows items={[perks.shield, perks.dialogs, perks.lessons]} locked d0={700} />
    </FrameRoot>
  );
});

// ── 16 · Plus подключён (взамен праздничного окна после покупки или выдачи Plus) ─────────────────────

export const PlusOnFrame = memo(function PlusOnFrame({ tpl, lang }: FrameProps<PlusStateStory>) {
  const perks = plusPerks(lang, tpl.freezesPerMonth);
  return (
    <FrameRoot testID="story-tpl-instead-plus-on" layer={<Confetti n={18} d0={600} />}>
      <Art><BigPlusMark id="on" /></Art>
      {tpl.untilLabel ? <Ov text={insteadText(lang, 'untilOverline', { date: tpl.untilLabel })} d={380} /> : null}
      <H1 text={insteadText(lang, 'plusOnTitle')} d0={460} />
      <PerkRows items={[perks.lessons, perks.dialogs, perks.shield]} d0={700} />
    </FrameRoot>
  );
});

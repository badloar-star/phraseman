// ═══════════════════════════════════════════════════════════════════════════
// StoryTemplateSlide.tsx — кадр истории по шаблону: выбирает один из 23 кадров макета stories-templates-v1.html по id.
//
// зачем (владелец 28.10): просмотр рисует новые кадры вместо прежних StorySlides для всех событий, у которых есть шаблон;
// лог [STORY-TPL] — какой кадр показан и с какими данными (числа и id; имена — только длина, без текста).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { LevelFrame, Streak100Frame, Streak7Frame } from './frames_streak';
import { ExamFrame, LessonFrame, SummitFrame } from './frames_progress';
// зачем (владелец 11.11, U36 «За что дали награду»: «Подключить сейчас»): кадры ачивки и итога недели теперь рисует frames_reward —
// статуэтка лиги на сцене со светом, два вида кадра недели выбираются случайно. Прежние AchFrame и PeakWeekFrame остаются в своих
// файлах (их держат сторожа и фотостудия прежнего макета); вернуть прежний вид — заменить две строки ниже обратно.
import { AchRewardFrame, PeakWeekRewardFrame } from './frames_reward';
import { DuelFrame, FriendFrame, InviteFrame, OvertakenFrame } from './frames_social';
import { DialogFrame, MistakesFrame, PackFrame, PackPopFrame, PhraseFrame } from './frames_cards';
import { CoinsFrame, HolidayFrame, MonthFrame, RankFrame, ThemeFrame, WeekFrame } from './frames_recap';
import { ContestInviteFrame, ContestPrizesFrame, ContestStartFrame, ContestVoteFrame, ContestWinnerFrame } from './frames_contest';
import { LadderFriendFrame, LadderInvitedFrame, LadderPlusFrame } from './frames_ladder';
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): 17 кадров взамен всплывающих окон — макет stories-instead-of-modals.html
import { AppUpdateFrame, HelloNewFrame, LegacyCoinsFrame, NotifNudgeFrame, PlusExpiredFrame, PlusOnFrame, RankEnoughFrame, TeamMessageFrame, WelcomeBackFrame } from './frames_instead_a';
import { FirstDialogFrame, LessonOpenFrame, PackPrizeFrame, PeakOvertakeFrame, PerfectLessonFrame, RateAppFrame, ReferralEndedFrame, ReferralWelcomeFrame } from './frames_instead_b';
import { LessonMedalFrame, LevelExamOpenFrame, LingmanExamOpenFrame } from './frames_instead_c';
// зачем (владелец 11.11: «карточки предложения переместить в истории»): три кадра-предложения Plus (макет stories-plus-offers.html)
import { PlusDialogFrame, PlusStreakFrame, PlusWeekFrame } from './frames_plus';
import type { StoryTemplate } from './story_template_registry';

const LOG = '[STORY-TPL]';

/** Данные кадра для лога: числа и флаги как есть, строки — длиной (имена людей в лог не пишем). */
export function storyTemplateBrief(tpl: StoryTemplate): string {
  return Object.entries(tpl).map(([key, value]) => {
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return `${key}=${String(value)}`;
    if (typeof value === 'string') return key === 'id' || key === 'achievementId' || key === 'themeId' ? `${key}=${value}` : `${key}=«${value.length}»`;
    return Array.isArray(value) ? `${key}=[${value.length}]` : `${key}={…}`;
  }).join(' ');
}

type Props = Readonly<{ tpl: StoryTemplate; lang: Lang; myRank: number | null }>;

function StoryTemplateSlide({ tpl, lang, myRank }: Props) {
  useEffect(() => {
    DebugLogger.info(LOG, `кадр показан lang=${lang} ранг=${myRank ?? '—'} ${storyTemplateBrief(tpl)}`);
  }, [lang, myRank, tpl]);
  switch (tpl.id) {
    case 'streak7': return <Streak7Frame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'streak100': return <Streak100Frame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'ach': return <AchRewardFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'level': return <LevelFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'lesson': return <LessonFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'exam': return <ExamFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'summit': return <SummitFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'peakweek': return <PeakWeekRewardFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'duel': return <DuelFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'overtaken': return <OvertakenFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'friend': return <FriendFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'pack': return <PackFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'packpop': return <PackPopFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'phrase': return <PhraseFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'week': return <WeekFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'month': return <MonthFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'invite': return <InviteFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'holiday': return <HolidayFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'rank': return <RankFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'theme': return <ThemeFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'coins': return <CoinsFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'mistakes': return <MistakesFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'dialog': return <DialogFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'contest_start': return <ContestStartFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'contest_vote': return <ContestVoteFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'contest_prizes': return <ContestPrizesFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'contest_invite': return <ContestInviteFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'contest_winner': return <ContestWinnerFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'ladder_friend': return <LadderFriendFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'ladder_plus': return <LadderPlusFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'ladder_invited': return <LadderInvitedFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_hello': return <HelloNewFrame tpl={tpl} lang={lang} />;
    case 'instead_back': return <WelcomeBackFrame tpl={tpl} lang={lang} />;
    case 'instead_legacy': return <LegacyCoinsFrame tpl={tpl} lang={lang} />;
    case 'instead_rank': return <RankEnoughFrame tpl={tpl} lang={lang} />;
    case 'instead_update': return <AppUpdateFrame tpl={tpl} lang={lang} />;
    case 'instead_message': return <TeamMessageFrame tpl={tpl} lang={lang} />;
    case 'instead_nudge': return <NotifNudgeFrame tpl={tpl} lang={lang} />;
    case 'instead_plus_expired': return <PlusExpiredFrame tpl={tpl} lang={lang} />;
    case 'instead_ref_welcome': return <ReferralWelcomeFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_ref_ended': return <ReferralEndedFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_perfect': return <PerfectLessonFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_lesson_open': return <LessonOpenFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_rate': return <RateAppFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_pack_prize': return <PackPrizeFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_first_dialog': return <FirstDialogFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_plus_on': return <PlusOnFrame tpl={tpl} lang={lang} />;
    case 'instead_peak_overtake': return <PeakOvertakeFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'instead_medal': return <LessonMedalFrame tpl={tpl} lang={lang} />;
    case 'instead_level_exam': return <LevelExamOpenFrame tpl={tpl} lang={lang} />;
    case 'instead_lingman_exam': return <LingmanExamOpenFrame tpl={tpl} lang={lang} />;
    case 'plus_streak': return <PlusStreakFrame tpl={tpl} lang={lang} />;
    case 'plus_week': return <PlusWeekFrame tpl={tpl} lang={lang} />;
    case 'plus_dialog': return <PlusDialogFrame tpl={tpl} lang={lang} />;
    default: {
      const never: never = tpl;
      DebugLogger.info(LOG, `неизвестный шаблон ${String((never as { id?: unknown }).id)} — кадра нет`);
      return null;
    }
  }
}

export default memo(StoryTemplateSlide);

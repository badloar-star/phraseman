// ═══════════════════════════════════════════════════════════════════════════
// StoryTemplateSlide.tsx — кадр истории по шаблону: выбирает один из 23 кадров макета stories-templates-v1.html по id.
//
// зачем (владелец 28.10): просмотр рисует новые кадры вместо прежних StorySlides для всех событий, у которых есть шаблон;
// лог [STORY-TPL] — какой кадр показан и с какими данными (числа и id; имена — только длина, без текста).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { AchFrame, LevelFrame, Streak100Frame, Streak7Frame } from './frames_streak';
import { ExamFrame, LessonFrame, PeakWeekFrame, SummitFrame } from './frames_progress';
import { DuelFrame, FriendFrame, InviteFrame, OvertakenFrame } from './frames_social';
import { DialogFrame, MistakesFrame, PackFrame, PackPopFrame, PhraseFrame } from './frames_cards';
import { CoinsFrame, HolidayFrame, MonthFrame, RankFrame, ThemeFrame, WeekFrame } from './frames_recap';
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
    case 'ach': return <AchFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'level': return <LevelFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'lesson': return <LessonFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'exam': return <ExamFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'summit': return <SummitFrame tpl={tpl} lang={lang} myRank={myRank} />;
    case 'peakweek': return <PeakWeekFrame tpl={tpl} lang={lang} myRank={myRank} />;
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
    default: {
      const never: never = tpl;
      DebugLogger.info(LOG, `неизвестный шаблон ${String((never as { id?: unknown }).id)} — кадра нет`);
      return null;
    }
  }
}

export default memo(StoryTemplateSlide);

// ═══════════════════════════════════════════════════════════════════════════
// AnnouncementV2Slide.tsx — кадр объявления по design: выбирает один из 36 кадров макета stories-announcements-v1.html (v2.1).
//
// зачем (владелец 28.10: «все должны быть добавлены в админку и работать корректно в приложении точно так же, как на макете»):
// просмотр (StoryViewer, Моменты) зовёт этот слайд, когда у объявления известен design; лог [STORY-ANN2] — какой кадр показан.
// Все 36 кадров — в семи файлах групп макета (frames_text … frames_service); неизвестный design — null, просмотр рисует запасной вид.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import type { PublishedAnnouncement } from '../../../modules/story_events/story_announcements_contract';
import { EditorialFrame, List3Frame, ManifestFrame, NumberFrame, QaFrame, QuoteFrame } from './frames_text';
import { CountdownFrame, DateFrame, ScheduleFrame, SoonFrame, Today24Frame } from './frames_time';
import { CardsFrame, DialogsFrame, DuelsFrame, LessonsFrame, PeakFrame } from './frames_sections_a';
import { AiFrame, ExamFrame, MistakesFrame, PhraseFrame, VideoFrame } from './frames_sections_b';
import { ChallengeFrame, ContestFrame, InviteFrame, PlusFrame } from './frames_promo';
import { AuthorFrame, HolidayFrame, NewYearFrame, PollFrame, ThanksFrame } from './frames_community';
import { BirthdayFrame, FeedbackFrame, MaintenanceFrame, ThemeFrame, TipFrame, VersionFrame } from './frames_service';
import { isAnnouncementV2Design, type AnnouncementV2Content } from './announcement_v2_registry';
import type { AnnFrameProps, AnnPoll } from './announcement_v2_text';

export { isAnnouncementV2Design } from './announcement_v2_registry';

const LOG = '[STORY-ANN2]';

type Props = Readonly<{ content: PublishedAnnouncement; lang: Lang; myRank: number | null; poll?: AnnPoll | null; inviteCode?: string | null }>;

function AnnouncementV2Slide({ content: published, lang, myRank, poll, inviteCode }: Props) {
  const design = published.design;
  const content = useMemo<AnnouncementV2Content | null>(() => (isAnnouncementV2Design(design) ? { ...published, design, publishedAtMs: published.publishedAtMs } : null), [design, published]);
  useEffect(() => {
    if (!content) { DebugLogger.info(LOG, `design=${String(design)} неизвестен — кадра нет, просмотр рисует запасной вид`); return; }
    DebugLogger.info(LOG, `кадр ${content.design} lang=${lang} ранг=${myRank ?? '—'} заголовок=«${content.title.length}» блоков=${content.blocks.length} кнопка=${content.cta ? content.cta.action : 'нет'} опрос=${poll ? 'есть' : 'нет'}`);
  }, [content, design, lang, myRank, poll]);
  if (!content) return null;
  const props: AnnFrameProps = { content, lang, myRank, poll: poll ?? null, inviteCode: inviteCode ?? null };
  switch (content.design) {
    case 'manifest': return <ManifestFrame {...props} />;
    case 'editorial': return <EditorialFrame {...props} />;
    case 'quote': return <QuoteFrame {...props} />;
    case 'list3': return <List3Frame {...props} />;
    case 'qa': return <QaFrame {...props} />;
    case 'number': return <NumberFrame {...props} />;
    case 'countdown': return <CountdownFrame {...props} />;
    case 'date': return <DateFrame {...props} />;
    case 'schedule': return <ScheduleFrame {...props} />;
    case 'soon': return <SoonFrame {...props} />;
    case 'today24': return <Today24Frame {...props} />;
    case 'lessons': return <LessonsFrame {...props} />;
    case 'dialogs': return <DialogsFrame {...props} />;
    case 'cards': return <CardsFrame {...props} />;
    case 'peak': return <PeakFrame {...props} />;
    case 'duels': return <DuelsFrame {...props} />;
    case 'phrase': return <PhraseFrame {...props} />;
    case 'mistakes': return <MistakesFrame {...props} />;
    case 'video': return <VideoFrame {...props} />;
    case 'exam': return <ExamFrame {...props} />;
    case 'ai': return <AiFrame {...props} />;
    case 'plus': return <PlusFrame {...props} />;
    case 'contest': return <ContestFrame {...props} />;
    case 'challenge': return <ChallengeFrame {...props} />;
    case 'invite': return <InviteFrame {...props} />;
    case 'thanks': return <ThanksFrame {...props} />;
    case 'poll': return <PollFrame {...props} />;
    case 'author': return <AuthorFrame {...props} />;
    case 'newyear': return <NewYearFrame {...props} />;
    case 'holiday': return <HolidayFrame {...props} />;
    case 'birthday': return <BirthdayFrame {...props} />;
    case 'theme': return <ThemeFrame {...props} />;
    case 'version': return <VersionFrame {...props} />;
    case 'maintenance': return <MaintenanceFrame {...props} />;
    case 'feedback': return <FeedbackFrame {...props} />;
    case 'tip': return <TipFrame {...props} />;
    default: {
      const never: never = content.design;
      DebugLogger.info(LOG, `неизвестный design ${String(never)} — кадра нет`);
      return null;
    }
  }
}

export default memo(AnnouncementV2Slide);

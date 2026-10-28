// ═══════════════════════════════════════════════════════════════════════════
// StoryAnnouncementV2Layer.tsx — объявление по шаблону v1 (36 кадров stories-announcements-v1, кадры рисует Сайт) в просмотре историй.
//
// зачем (владелец 28.10: «в приложении точно как на макете»): слайд Сайта получает объявление, свой ранг монеты и опрос. Опрос — useStoryPoll:
// мгновенный выбор, замок до ответа, откат при ошибке. Ошибка голоса — короткое сообщение на 3 с (те же слова, что у «Опроса дня»).
// Слой пропускает касания к вариантам опроса (box-none); тап по варианту помечается (onInnerPress), чтобы просмотр не перелистнул кадр.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { acquireInviteCodeShared } from '../../../app/invite_code_singleton';
import type { PublishedAnnouncement } from '../../../modules/story_events/story_announcements_contract';
import AnnouncementV2Slide from '../announcements_v2/AnnouncementV2Slide';
import { useStoryPoll } from '../use_story_poll';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import { tplText } from './story_template_strings';

const NOTICE_MS = 3000;
const LOG = '[STORY-TPL]';
/** Код приглашения в фотостудии — пример макета, чтобы снимок совпал. */
const STUDIO_INVITE_CODE = 'PM-7K2Q';

type Props = Readonly<{
  announcement: PublishedAnnouncement;
  lang: Lang;
  myRank: number | null;
  /** Низ кадра: 60 dp, с кнопкой действия — 150 (как у кадров шаблонов). */
  bottom: number;
  /** Тап по варианту опроса — просмотр не листает кадр. */
  onInnerPress: () => void;
  /** Фотостудия: код приглашения — пример макета. */
  studio: boolean;
  testID?: string;
}>;

function StoryAnnouncementV2Layer({ announcement, lang, myRank, bottom, onInnerPress, studio, testID }: Props) {
  const pal = useStoryTemplatePalette();
  const [notice, setNotice] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFail = useCallback(() => {
    setNotice(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(false), NOTICE_MS);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // зачем (Сайт 28.10): кадр «Пригласи друзей» показывает настоящий код человека; нет кода — композиция без карточки.
  // Код — из общего кэша приложения (память / локальное хранилище; сервер — только если кода ещё нет), и только у design=invite.
  const [inviteCode, setInviteCode] = useState<string | null>(studio ? STUDIO_INVITE_CODE : null);
  useEffect(() => {
    if (studio || announcement.design !== 'invite') return undefined;
    const lease = acquireInviteCodeShared();
    let alive = true;
    const t0 = Date.now();
    lease.promise
      .then((code) => {
        if (!alive) return;
        DebugLogger.info(LOG, `код приглашения для кадра invite: ${code ? 'есть' : 'нет'} за ${Date.now() - t0} мс`);
        setInviteCode(code || null);
      })
      .catch((error: unknown) => { DebugLogger.info(LOG, `код приглашения не получен: ${String(error).slice(0, 80)} — кадр без карточки`); });
    return () => { alive = false; lease.release(); };
  }, [announcement.design, studio]);
  // зачем (Сайт 28.10, гейт снимков): в фотостудии опроса нет — кадр poll рисует состояние макета (52/31/17, выбран первый вариант),
  // а тап по варианту ничего не отправляет на сервер (фотостудия ничего не пишет).
  const poll = useStoryPoll(!studio && announcement.design === 'poll' ? announcement.id : null, announcement.revision, onFail);
  const pollForSlide = useMemo(
    () => (poll ? { ...poll, onVote: (index: number) => { onInnerPress(); poll.onVote(index); } } : null),
    [poll, onInnerPress],
  );
  return (
    <View testID={testID} pointerEvents="box-none" style={[s.slide, { bottom }]}>
      <AnnouncementV2Slide content={announcement} lang={lang} myRank={myRank} poll={pollForSlide} inviteCode={inviteCode} />
      {notice ? (
        <View pointerEvents="none" style={[s.notice, { backgroundColor: mix(pal.tx, 0.16) }]} accessibilityLiveRegion="polite">
          <Text style={[s.noticeText, { color: pal.tx }]}>{tplText(lang, 'pollVoteFailed')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  slide: { position: 'absolute', left: 0, right: 0, top: 120 },
  notice: { position: 'absolute', left: 28, right: 28, bottom: 8, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  noticeText: { fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
});

export default memo(StoryAnnouncementV2Layer);

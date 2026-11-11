// ═══════════════════════════════════════════════════════════════════════════
// StoryAnnouncementV2Layer.tsx — объявление по шаблону v1 (36 кадров stories-announcements-v1, кадры рисует Сайт) в просмотре историй.
//
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { acquireInviteCodeShared } from '../../../app/invite_code_singleton';
import type { PublishedAnnouncement } from '../../../modules/story_events/story_announcements_contract';
import AnnouncementV2Slide from '../announcements_v2/AnnouncementV2Slide';

const LOG = '[STORY-TPL]';
/** Код приглашения в фотостудии — пример макета, чтобы снимок совпал. */
const STUDIO_INVITE_CODE = 'PM-7K2Q';

type Props = Readonly<{
  announcement: PublishedAnnouncement;
  lang: Lang;
  myRank: number | null;
  /** Низ кадра: 60 dp, с кнопкой действия — 150 (как у кадров шаблонов). */
  bottom: number;
  /** Фотостудия: код приглашения — пример макета. */
  studio: boolean;
  testID?: string;
}>;

function StoryAnnouncementV2Layer({ announcement, lang, myRank, bottom, studio, testID }: Props) {
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
  return (
    <View testID={testID} pointerEvents="box-none" style={[s.slide, { bottom }]}>
      <AnnouncementV2Slide content={announcement} lang={lang} myRank={myRank} inviteCode={inviteCode} />
    </View>
  );
}

const s = StyleSheet.create({
  slide: { position: 'absolute', left: 0, right: 0, top: 120 },
});

export default memo(StoryAnnouncementV2Layer);

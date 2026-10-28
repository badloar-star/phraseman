// ═══════════════════════════════════════════════════════════════════════════
// AnnouncementV2Studio.tsx — «фотостудия объявлений» (только dev-маршрут dev_moments_preview?state=announcements): настоящий просмотр
// StoryViewer со всеми 36 объявлениями макета stories-announcements-v1.html на примерных данных — для снимков Сверки «эмулятор | макет».
//
// зачем (владелец 28.10: «гейт на точное соответствие макетам»): кадры показывает тот же StoryViewer, что в бою (полосы, шапка, тап,
// удержание, свайп, кнопка действия, фон темы); очередь — 36 событий-объявлений с design; &frame=poll | 1…36 — с какого кадра,
// &long=1 — длинные заголовки макета, &settle=1 — конечное состояние анимаций (часы кадра final, как ST.settle(true) макета).
// После последнего кадра или ✕ просмотр открывается заново (как плеер макета). Кнопки действия здесь только пишут лог.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import StoryViewer from '../StoryViewer';
import { ANNOUNCEMENT_V2_DESIGNS, announcementStudioEvents, announcementStudioStartIndex } from './announcement_v2_registry';

const LOG = '[STORY-ANN2]';
/** Свой ранг монеты в примерах макета (`coin(5)` — «ты»). */
const STUDIO_MY_RANK = 5;
/** Пауза между закрытием и новым показом, мс (макет: улёт 320 + 100). */
const REOPEN_MS = 420;

type Props = Readonly<{ lang: Lang; frame?: string; long?: boolean; settle?: boolean }>;

export default function AnnouncementV2Studio({ lang, frame, long = false, settle = false }: Props) {
  const startIndex = announcementStudioStartIndex(frame);
  const events = useMemo(() => announcementStudioEvents(Date.now(), long), [long]);
  const liveIds = useMemo(() => events.map((e) => e.id), [events]);
  const [round, setRound] = useState(0);
  const [open, setOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    DebugLogger.info(LOG, `фотостудия объявлений: ${events.length} кадров, старт с ${startIndex + 1} (${ANNOUNCEMENT_V2_DESIGNS[startIndex]}) lang=${lang} long=${String(long)} settle=${String(settle)}`);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [events.length, lang, long, settle, startIndex]);
  const onClose = useCallback(() => {
    DebugLogger.info(LOG, `фотостудия объявлений: просмотр закрыт, новый показ через ${REOPEN_MS} мс`);
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setRound((r) => r + 1); setOpen(true); }, REOPEN_MS);
  }, []);
  const onSeen = useCallback((id: string) => { DebugLogger.info(LOG, `фотостудия объявлений: показан ${id}`); }, []);
  if (!open) return null;
  // зачем (Моменты ae0261b1b): studioSettle — часы кадра сразу в конечном состоянии, как ST.settle(true) макета (снимки гейта)
  return (
    <StoryViewer key={`ann-studio-${round}-${long ? 'l' : 's'}`} lang={lang} events={events} liveAnnouncementIds={liveIds} coinRank={STUDIO_MY_RANK} origin={null} onSeen={onSeen} onClose={onClose} studio studioSettle={settle} startIndex={startIndex} testID="story-ann-studio" />
  );
}

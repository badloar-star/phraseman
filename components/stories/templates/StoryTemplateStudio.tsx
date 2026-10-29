// ═══════════════════════════════════════════════════════════════════════════
// StoryTemplateStudio.tsx — «фотостудия историй» (только dev-маршрут): настоящий просмотр StoryViewer со всеми 23 кадрами макета
// stories-templates-v1.html на примерных данных — для снимков Сверки «эмулятор | макет».
//
// зачем (владелец 28.10: «проверить, что они именно так выглядят в приложении через дев»): кадры показывает тот же StoryViewer, что в бою
// (полосы, шапка, тап, удержание, свайп, кнопка действия, фон темы), очередь — 23 события-метки фотостудии; после последнего кадра или ✕
// просмотр открывается заново (как плеер макета). Кнопки действия здесь только пишут лог — ничего не меняется и не отправляется.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import StoryViewer from '../StoryViewer';
import { STORY_ALL_TEMPLATE_IDS, STORY_SAMPLE_MY_RANK, studioEvents, studioStartIndex } from './story_template_registry';

const LOG = '[STORY-TPL]';
/** Пауза между закрытием и новым показом, мс (макет: улёт 320 + 100). */
const REOPEN_MS = 420;

/** settle — кадр сразу в конечном состоянии и без автоперехода (снимок «конечное состояние» без системного «Уменьшить движение»). */
type Props = Readonly<{ lang: Lang; frame?: string; settle?: boolean }>;

export default function StoryTemplateStudio({ lang, frame, settle = false }: Props) {
  const startIndex = studioStartIndex(frame);
  const events = useMemo(() => studioEvents(Date.now()), []);
  const [round, setRound] = useState(0);
  const [open, setOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // зачем (анонс конкурса 29.10): кадры 1–23 — макет stories-templates-v1, 24–27 — анонс «Набор месяца»
    DebugLogger.info(LOG, `фотостудия: ${events.length} кадров, старт с ${startIndex + 1} (${STORY_ALL_TEMPLATE_IDS[startIndex]}) lang=${lang} settle=${String(settle)}`);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [events.length, lang, settle, startIndex]);
  const onClose = useCallback(() => {
    DebugLogger.info(LOG, `фотостудия: просмотр закрыт, новый показ через ${REOPEN_MS} мс`);
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setRound((r) => r + 1); setOpen(true); }, REOPEN_MS);
  }, []);
  const onSeen = useCallback((id: string) => { DebugLogger.info(LOG, `фотостудия: показан ${id}`); }, []);
  if (!open) return null;
  return <StoryViewer key={`studio-${round}`} lang={lang} events={events} coinRank={STORY_SAMPLE_MY_RANK} origin={null} onSeen={onSeen} onClose={onClose} studio studioSettle={settle} startIndex={startIndex} testID="story-studio" />;
}

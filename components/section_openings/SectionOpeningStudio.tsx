// SectionOpeningStudio.tsx — DEV-превью окон «Открытие разделов» для Сверки (только через app/dev_moments_preview, state=openings).
//
// зачем (координатор 04.11): снять все 26 состояний макета без реального роста ранга и БЕЗ отметки «показано»: окно рисуется само по себе
// (хост, хранилище и арбитр не участвуют, ничего не пишется). ?section=rank|video|dialogs|peak|cards|plus &phase=1..4 (Предвкушение,
// Раскрытие, Праздник, CTA; без phase — живой проигрыш с начала) &reduce=0|1 (1 — «уменьшенное движение»: сразу финальный кадр).
// OTA1 (координатор 06.11, жесты истории): &queue=rank,video,dialogs — ИСТОРИЯ из нескольких кадров, как после нового ранга: сегментная полоска (3 сегмента), тап справа — дальше, слева — назад,
// удержание — пауза, свайп вниз — закрыть кадр (в превью — следующий кадр/конец); все жесты пишут [STORY-GESTURE] (tap_next / tap_prev / hold_start / hold_end / swipe_down_close).
import React, { useCallback, useMemo, useState } from 'react';
import type { Lang } from '../../constants/i18n';
import { sectionOpeningFreezeAt, type SectionOpeningId } from '../../modules/section_openings/section_opening_core';
import { isSectionOpeningId, parseOpeningQueue } from '../../modules/section_openings/section_opening_queue';

export { isSectionOpeningId };
import { SectionOpeningCeremony } from './SectionOpeningCeremony';

const LOG = '[SECTION-OPENING-DEV]';

type Props = Readonly<{ lang: Lang; section?: string; phase?: string; reduce?: string; queue?: string }>;

export default function SectionOpeningStudio({ lang, section, phase, reduce, queue }: Props) {
  const list = useMemo(() => parseOpeningQueue(queue), [queue]);
  const [index, setIndex] = useState(0);
  const next = useCallback(() => {
    console.log(LOG, 'next', JSON.stringify({ from: index, total: list.length })); // guard-ok: dev-превью, переход в очереди
    setIndex((value) => Math.min(list.length - 1, value + 1));
  }, [index, list.length]);
  const prev = useCallback((): boolean => {
    if (index <= 0) return false;
    console.log(LOG, 'prev', JSON.stringify({ from: index, total: list.length })); // guard-ok: dev-превью, переход назад
    setIndex((value) => Math.max(0, value - 1));
    return true;
  }, [index, list.length]);

  const id: SectionOpeningId = list.length > 0 ? list[Math.min(index, list.length - 1)]! : isSectionOpeningId(section) ? section : 'video';
  const freezeAt = sectionOpeningFreezeAt(phase);
  const forceReduced = reduce === '1';
  const queued = list.length > 0;
  return (
    <SectionOpeningCeremony
      key={`${id}-${index}-${phase ?? 'live'}-${forceReduced ? 'r' : 'm'}`}
      id={id}
      lang={lang}
      freezeAt={freezeAt}
      forceReduced={forceReduced}
      segments={queued ? list.length : 1}
      segmentIndex={queued ? index : 0}
      onPrev={queued ? prev : undefined}
      onCta={() => { console.log(LOG, 'cta', JSON.stringify({ id })); }} // guard-ok: dev-превью, действие только в журнал
      onSkip={() => { console.log(LOG, 'skip', JSON.stringify({ id })); if (queued && index < list.length - 1) next(); }} // guard-ok: dev-превью, действие только в журнал; в очереди — следующий кадр
    />
  );
}

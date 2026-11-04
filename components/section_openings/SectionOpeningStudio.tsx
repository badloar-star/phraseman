// SectionOpeningStudio.tsx — DEV-превью окон «Открытие разделов» для Сверки (только через app/dev_moments_preview, state=openings).
//
// зачем (координатор 04.11): снять все 26 состояний макета без реального роста ранга и БЕЗ отметки «показано»: окно рисуется напрямую
// (хост, хранилище и арбитр не участвуют, ничего не пишется). ?section=rank|video|dialogs|peak|cards|plus &phase=1..4 (Предвкушение,
// Раскрытие, Праздник, CTA; без phase — живой проигрыш с начала) &reduce=0|1 (1 — «уменьшенное движение»: сразу финальный кадр).
import React from 'react';
import type { Lang } from '../../constants/i18n';
import {
  SECTION_OPENING_IDS, sectionOpeningFreezeAt, type SectionOpeningId,
} from '../../modules/section_openings/section_opening_core';
import { SectionOpeningCeremony } from './SectionOpeningCeremony';

const LOG = '[SECTION-OPENING-DEV]';

export const isSectionOpeningId = (value: unknown): value is SectionOpeningId =>
  typeof value === 'string' && (SECTION_OPENING_IDS as readonly string[]).includes(value);

type Props = Readonly<{ lang: Lang; section?: string; phase?: string; reduce?: string }>;

export default function SectionOpeningStudio({ lang, section, phase, reduce }: Props) {
  const id: SectionOpeningId = isSectionOpeningId(section) ? section : 'video';
  const freezeAt = sectionOpeningFreezeAt(phase);
  const forceReduced = reduce === '1';
  return (
    <SectionOpeningCeremony
      key={`${id}-${phase ?? 'live'}-${forceReduced ? 'r' : 'm'}`}
      id={id}
      lang={lang}
      freezeAt={freezeAt}
      forceReduced={forceReduced}
      onCta={() => { console.log(LOG, 'cta', JSON.stringify({ id })); }} // guard-ok: dev-превью, действие только в журнал
      onSkip={() => { console.log(LOG, 'skip', JSON.stringify({ id })); }} // guard-ok: dev-превью, действие только в журнал
    />
  );
}

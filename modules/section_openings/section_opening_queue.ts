// section_opening_queue.ts — разбор очереди dev-превью «история из нескольких кадров» (&queue=rank,video,dialogs). Чистая функция без React.
import { SECTION_OPENING_IDS, type SectionOpeningId } from './section_opening_core';

export const isSectionOpeningId = (value: unknown): value is SectionOpeningId =>
  typeof value === 'string' && (SECTION_OPENING_IDS as readonly string[]).includes(value);

/** «rank,video,dialogs» → [rank, video, dialogs]; мусор отбрасывается, не больше 6 кадров. */
export function parseOpeningQueue(raw: string | undefined): readonly SectionOpeningId[] {
  if (!raw) return [];
  return raw.split(',').map((item) => item.trim()).filter(isSectionOpeningId).slice(0, SECTION_OPENING_IDS.length);
}

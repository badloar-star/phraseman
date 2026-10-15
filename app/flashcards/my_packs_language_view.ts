// ═══════════════════════════════════════════════════════════════════════════
// my_packs_language_view.ts — какие из «Моих наборов» показывать при выбранном языке.
//
// зачем (координатор 15.10, R06/R27/R28; владелец: набор из видео добавил, а «Мои наборы» пусты): набор из видео мог получить язык, отличный от выбранного (сервер определяет язык по фразам, сомнение → en),
// и фильтр молча прятал его. Правило: фильтр по языку остаётся, но (1) если из-за него не видно НИ ОДНОГО набора — показываем все; (2) если часть скрыта — отдаём счётчик для строки «Скрыто N: другой язык · Показать все»;
// (3) явное «Показать все» отключает фильтр. Чистая функция — тестируется в node.
// ═══════════════════════════════════════════════════════════════════════════
import { packMatchesLanguageFilter, type PackLanguage } from './pack_languages';

type PackWithLanguage = Readonly<{ packLanguage?: unknown; studyTarget?: unknown }>;

export type MyPacksLanguageView<T extends PackWithLanguage> = Readonly<{
  added: readonly T[];
  created: readonly T[];
  /** Сколько наборов скрыто выбранным языком (для строки «Скрыто N»). */
  hidden: number;
  /** Фильтр снят автоматически: по выбранному языку не нашлось ни одного набора. */
  auto: boolean;
  total: number;
}>;

export function applyMyPacksLanguageView<T extends PackWithLanguage>(input: Readonly<{
  added: readonly T[];
  created: readonly T[];
  language: PackLanguage;
  showAll: boolean;
}>): MyPacksLanguageView<T> {
  const keep = (pack: T): boolean => packMatchesLanguageFilter(pack.packLanguage ?? pack.studyTarget, input.language);
  const keepAdded = input.added.filter(keep);
  const keepCreated = input.created.filter(keep);
  const total = input.added.length + input.created.length;
  const kept = keepAdded.length + keepCreated.length;
  const everything = input.showAll || (kept === 0 && total > 0);
  return {
    added: everything ? input.added : keepAdded,
    created: everything ? input.created : keepCreated,
    hidden: everything ? 0 : total - kept,
    auto: !input.showAll && kept === 0 && total > 0,
    total,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// pack_lang_trace.ts — журнал [PACK-LANG]: какой язык выбран, какой язык у КАЖДОГО набора, откуда он взят и что отфильтровано.
//
// зачем (владелец/координатор 15.10, «сперва логи»): при выбранном FR в списке попал итальянский набор («Думай на итальянском — 38 фраз»). Либо фильтр не применяется к этой ленте,
// либо у набора неверное поле языка. Журнал показывает всё: выбранный язык, сырое packLanguage и studyTarget набора, источник (поле → нормализация → умолчание), признак видео-набора, оставлен или отфильтрован.
// Чистая функция без React — тестируется в node.
// ═══════════════════════════════════════════════════════════════════════════
import { isPackLanguage, normalizePackLanguage, packMatchesLanguageFilter, type PackLanguage } from './pack_languages';

export const PACK_LANG_TAG = '[PACK-LANG]';

type PackLike = Readonly<{ id: string; packLanguage?: unknown; studyTarget?: unknown; videoId?: unknown; codeName?: unknown; isCommunityUgc?: unknown }>;

export type PackLangRow = Readonly<{
  id: string;
  name: string;
  kind: 'video' | 'ugc' | 'official';
  rawPackLanguage: string;
  rawStudyTarget: string;
  /** Откуда взят язык набора: поле packLanguage, поле studyTarget или умолчание «en» (поля нет / не язык). */
  source: 'packLanguage' | 'studyTarget' | 'default_en';
  language: PackLanguage;
  kept: boolean;
}>;

const show = (value: unknown): string => (value === undefined ? 'undefined' : value === null ? 'null' : String(value));

export function packLangRow(pack: PackLike, selected: PackLanguage): PackLangRow {
  const rawLanguage = pack.packLanguage;
  const rawTarget = pack.studyTarget;
  const source: PackLangRow['source'] = isPackLanguage(rawLanguage) ? 'packLanguage' : isPackLanguage(rawTarget) && (rawLanguage === undefined || rawLanguage === null) ? 'studyTarget' : 'default_en';
  const language = normalizePackLanguage(rawLanguage ?? rawTarget);
  return {
    id: pack.id,
    name: show(pack.codeName ?? ''),
    kind: pack.videoId ? 'video' : pack.isCommunityUgc ? 'ugc' : 'official',
    rawPackLanguage: show(rawLanguage),
    rawStudyTarget: show(rawTarget),
    source,
    language,
    kept: packMatchesLanguageFilter(rawLanguage ?? rawTarget, selected),
  };
}

/** Строки журнала: сводка и по строке на набор (до `limit`). */
export function formatPackLangTrace(scope: string, selected: PackLanguage, packs: readonly PackLike[], limit = 60): readonly string[] {
  const rows = packs.map((pack) => packLangRow(pack, selected));
  const kept = rows.filter((row) => row.kept).length;
  const byLanguage = rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.language]: (acc[row.language] ?? 0) + 1 }), {});
  const head = `${PACK_LANG_TAG} ${scope} selected=${selected} total=${rows.length} kept=${kept} filtered=${rows.length - kept} byLanguage=${JSON.stringify(byLanguage)}`;
  const lines = rows.slice(0, limit).map((row) => `${PACK_LANG_TAG} ${scope} ${row.kept ? 'KEPT' : 'DROPPED'} id=${row.id} name=${row.name} kind=${row.kind} packLanguage=${row.rawPackLanguage} studyTarget=${row.rawStudyTarget} source=${row.source} language=${row.language}`);
  return [head, ...lines];
}

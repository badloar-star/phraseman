// ═══════════════════════════════════════════════════════════════════════════
// phrase_workshop_theory_v1.ts — теория «Мастерской фраз»: страницы вступления того занятия V2, откуда пришла фраза.
//
// зачем (владелец 25.10: «теория» в составе режима; координатор от Learning V2): источник — вступления занятий (Смысл / Схема /
// Ловушка) из бандла factory_native: строка манифеста урока+занятия, `row.loadIntro()` — ленивый require, без сети и без банка.
// Фраза в банке помнит занятие (sourceSessionOrdinal), поэтому теория показывает ровно то, что объясняло ЭТУ фразу.
// Тексты есть только на ru/uk — для остальных языков теории нет (null), кнопку не показываем. Чистый разбор отделён от
// доступа к манифесту, чтобы тестироваться в node без 10-мегабайтного манифеста.
// ═══════════════════════════════════════════════════════════════════════════

export type PhraseWorkshopTheoryKind = 'concept' | 'formula' | 'trap';
/** pageId нужен показу «Скажи так» (learningV2IntroSayPartsForPageV1 принимает настоящий pageId страницы). */
export type PhraseWorkshopTheoryPage = Readonly<{ kind: PhraseWorkshopTheoryKind; pageId: string; title: string; body: string }>;
export type PhraseWorkshopTheoryLocale = 'ru' | 'uk';

const KINDS: ReadonlySet<string> = new Set(['concept', 'formula', 'trap']);

/** Языки, на которых теория написана. Для остальных — нет теории (решение координатора). */
export function phraseWorkshopTheoryLocale(lang: string): PhraseWorkshopTheoryLocale | null {
  return lang === 'ru' || lang === 'uk' ? lang : null;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function localized(value: unknown, locale: PhraseWorkshopTheoryLocale): string {
  const text = record(value)[locale];
  return typeof text === 'string' ? text.trim() : '';
}

/** Разбор intro.json занятия: страницы с известным видом и непустым текстом; остальное отбрасывается. */
export function parsePhraseWorkshopTheoryPages(rawIntro: unknown, locale: PhraseWorkshopTheoryLocale): readonly PhraseWorkshopTheoryPage[] {
  const pages = record(rawIntro).pages;
  if (!Array.isArray(pages)) return [];
  const out: PhraseWorkshopTheoryPage[] = [];
  for (const raw of pages) {
    const page = record(raw);
    const kind = String(page.kind);
    const title = localized(page.titleByLocale, locale);
    const body = localized(page.bodyByLocale, locale);
    if (!KINDS.has(kind) || !body) continue;
    out.push({ kind: kind as PhraseWorkshopTheoryKind, pageId: typeof page.pageId === 'string' ? page.pageId : '', title, body });
  }
  return out;
}

const cache = new Map<string, readonly PhraseWorkshopTheoryPage[] | null>();

type ManifestRow = Readonly<{ lessonOrdinal: number; sessionOrdinal: number; loadIntro: () => unknown }>;

/**
 * Теория для фразы: страницы вступления занятия (урок, занятие) на языке интерфейса. null — теории нет (язык не ru/uk,
 * занятия нет в бандле или в нём нет страниц). Причина — в журнал [PHRASE-WORKSHOP] theory.
 */
export function phraseWorkshopTheoryFor(lessonOrdinal: number, sessionOrdinal: number, lang: string): readonly PhraseWorkshopTheoryPage[] | null {
  const locale = phraseWorkshopTheoryLocale(lang);
  if (!locale) return null;
  const key = `${lessonOrdinal}:${sessionOrdinal}:${locale}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let result: readonly PhraseWorkshopTheoryPage[] | null = null;
  try {
    // ленивый require: манифест тяжёлый, а нужен только тому, кто открыл теорию
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = (require('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as { FACTORY_NATIVE_MANIFEST_V1: readonly ManifestRow[] }).FACTORY_NATIVE_MANIFEST_V1;
    const row = manifest.find((candidate) => candidate.lessonOrdinal === lessonOrdinal && candidate.sessionOrdinal === sessionOrdinal);
    if (!row) {
      console.warn('[PHRASE-WORKSHOP] theory:no_row', JSON.stringify({ lessonOrdinal, sessionOrdinal }));
    } else {
      const pages = parsePhraseWorkshopTheoryPages(row.loadIntro(), locale);
      result = pages.length > 0 ? pages : null;
      console.log('[PHRASE-WORKSHOP] theory:loaded', JSON.stringify({ lessonOrdinal, sessionOrdinal, locale, pages: pages.length }));
    }
  } catch (error: unknown) {
    console.warn('[PHRASE-WORKSHOP] theory:failed', JSON.stringify({ lessonOrdinal, sessionOrdinal, reason: error instanceof Error ? error.message : String(error) }));
  }
  cache.set(key, result);
  return result;
}

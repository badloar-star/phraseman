import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime';
import type { RuntimeSourceLocale } from './target_storage_keys';

type FrenchLessonWord = {
  en: string;
  ru: string;
  uk: string;
  es: string;
  pos: 'phrases';
  context: string;
  definition: string;
};

function normalizeFrenchWord(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordKey(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('fr-FR');
}

export async function loadFrenchRemoteLessonWordBank(
  lessonId: number,
  sourceLocale: RuntimeSourceLocale = 'ru',
): Promise<FrenchLessonWord[]> {
  const rows = await loadFrenchRemoteLessonRows(lessonId, sourceLocale);
  const words = new Map<string, FrenchLessonWord>();

  for (const row of rows) {
    const frenchPhrase = normalizeFrenchWord(row.french || row.english);
    const sourceLocales = row.sourceLocales as Partial<Record<'ru' | 'uk', string>> | undefined;
    const ru = normalizeFrenchWord(sourceLocales?.ru || row.russian || row.english);
    const uk = normalizeFrenchWord(sourceLocales?.uk || row.ukrainian || row.english);
    const sourceHint = sourceLocale === 'uk' ? uk : ru;
    for (const item of row.wordsFr ?? row.words ?? []) {
      const surface = normalizeFrenchWord(item.correct || item.text);
      if (!surface) continue;
      const key = wordKey(surface);
      if (words.has(key)) continue;
      words.set(key, {
        en: surface,
        ru,
        uk,
        es: frenchPhrase,
        pos: 'phrases',
        context: frenchPhrase,
        definition: sourceHint,
      });
    }
  }

  return [...words.values()];
}

export default function __FrenchLessonWordsRemoteRuntimeRouteShim() {
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// study_language_words.ts — название ИЗУЧАЕМОГО языка в нужной форме на 9 языках интерфейса.
//
// зачем (D188-следствие, владелец 14.10: «У НАС ЖЕ НЕ ТОЛЬКО АНГЛИЙСКИЙ ЯЗЫК, ПРАВДА»): с открытием es/fr/de/it любой текст
// интерфейса с зашитым «английский / по-английски / English» при другом изучаемом языке — ложь. Текст берёт слово отсюда
// по studyTarget. Формы:
//   name — именительный / основа («английский», «English», «inglés»);
//   gen  — родительный там, где он есть («английского», «англійської», «angielskiego»; иначе = name);
//   adv  — «на языке / как говорить» («по-английски», «англійською», «in English», «en inglés», «po angielsku»).
// Чистый модуль, без сети и состояния.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from './i18n';

export type StudyLanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it';
export type StudyLanguageForm = 'name' | 'gen' | 'adv';

type Row = Readonly<Record<StudyLanguageCode, string>>;
type Table = Readonly<Record<StudyLanguageForm, Row>>;

const RU: Table = {
  name: { en: 'английский', es: 'испанский', fr: 'французский', de: 'немецкий', it: 'итальянский' },
  gen: { en: 'английского', es: 'испанского', fr: 'французского', de: 'немецкого', it: 'итальянского' },
  adv: { en: 'по-английски', es: 'по-испански', fr: 'по-французски', de: 'по-немецки', it: 'по-итальянски' },
};
const UK: Table = {
  name: { en: 'англійська', es: 'іспанська', fr: 'французька', de: 'німецька', it: 'італійська' },
  gen: { en: 'англійської', es: 'іспанської', fr: 'французької', de: 'німецької', it: 'італійської' },
  adv: { en: 'англійською', es: 'іспанською', fr: 'французькою', de: 'німецькою', it: 'італійською' },
};
const EN: Table = {
  name: { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian' },
  gen: { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian' },
  adv: { en: 'in English', es: 'in Spanish', fr: 'in French', de: 'in German', it: 'in Italian' },
};
const ES: Table = {
  name: { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán', it: 'italiano' },
  gen: { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán', it: 'italiano' },
  adv: { en: 'en inglés', es: 'en español', fr: 'en francés', de: 'en alemán', it: 'en italiano' },
};
const PT: Table = {
  name: { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' },
  gen: { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' },
  adv: { en: 'em inglês', es: 'em espanhol', fr: 'em francês', de: 'em alemão', it: 'em italiano' },
};
const VI: Table = {
  name: { en: 'tiếng Anh', es: 'tiếng Tây Ban Nha', fr: 'tiếng Pháp', de: 'tiếng Đức', it: 'tiếng Ý' },
  gen: { en: 'tiếng Anh', es: 'tiếng Tây Ban Nha', fr: 'tiếng Pháp', de: 'tiếng Đức', it: 'tiếng Ý' },
  adv: { en: 'bằng tiếng Anh', es: 'bằng tiếng Tây Ban Nha', fr: 'bằng tiếng Pháp', de: 'bằng tiếng Đức', it: 'bằng tiếng Ý' },
};
const ID: Table = {
  name: { en: 'bahasa Inggris', es: 'bahasa Spanyol', fr: 'bahasa Prancis', de: 'bahasa Jerman', it: 'bahasa Italia' },
  gen: { en: 'bahasa Inggris', es: 'bahasa Spanyol', fr: 'bahasa Prancis', de: 'bahasa Jerman', it: 'bahasa Italia' },
  adv: { en: 'dalam bahasa Inggris', es: 'dalam bahasa Spanyol', fr: 'dalam bahasa Prancis', de: 'dalam bahasa Jerman', it: 'dalam bahasa Italia' },
};
const TR: Table = {
  name: { en: 'İngilizce', es: 'İspanyolca', fr: 'Fransızca', de: 'Almanca', it: 'İtalyanca' },
  gen: { en: 'İngilizce', es: 'İspanyolca', fr: 'Fransızca', de: 'Almanca', it: 'İtalyanca' },
  adv: { en: 'İngilizce', es: 'İspanyolca', fr: 'Fransızca', de: 'Almanca', it: 'İtalyanca' },
};
const PL: Table = {
  name: { en: 'angielski', es: 'hiszpański', fr: 'francuski', de: 'niemiecki', it: 'włoski' },
  gen: { en: 'angielskiego', es: 'hiszpańskiego', fr: 'francuskiego', de: 'niemieckiego', it: 'włoskiego' },
  adv: { en: 'po angielsku', es: 'po hiszpańsku', fr: 'po francusku', de: 'po niemiecku', it: 'po włosku' },
};

const BY_UI: Readonly<Record<Lang, Table>> = { ru: RU, uk: UK, en: EN, es: ES, 'pt-BR': PT, vi: VI, id: ID, tr: TR, pl: PL };

export const STUDY_LANGUAGE_CODES: readonly StudyLanguageCode[] = Object.freeze(['en', 'es', 'fr', 'de', 'it']);

/** Неизвестный язык интерфейса → английский интерфейс; неизвестный изучаемый → английский (язык по умолчанию). */
export function studyLanguageWord(uiLang: Lang | string, studyTarget: string | null | undefined, form: StudyLanguageForm = 'name'): string {
  const table = BY_UI[uiLang as Lang] ?? EN;
  const code: StudyLanguageCode = (STUDY_LANGUAGE_CODES as readonly string[]).includes(String(studyTarget)) ? (studyTarget as StudyLanguageCode) : 'en';
  return table[form][code];
}

type ActionVerb = 'say' | 'write';
const ACTION: Readonly<Record<Lang, Readonly<Record<ActionVerb, (adv: string) => string>>>> = {
  ru: { say: (a) => `Скажи ${a}`, write: (a) => `Напиши ${a}` },
  uk: { say: (a) => `Скажи ${a}`, write: (a) => `Напиши ${a}` },
  en: { say: (a) => `Say it ${a}`, write: (a) => `Write it ${a}` },
  es: { say: (a) => `Dilo ${a}`, write: (a) => `Escríbelo ${a}` },
  'pt-BR': { say: (a) => `Diga ${a}`, write: (a) => `Escreva ${a}` },
  vi: { say: (a) => `Nói ${a}`, write: (a) => `Viết ${a}` },
  id: { say: (a) => `Ucapkan ${a}`, write: (a) => `Tulis ${a}` },
  tr: { say: (a) => `${a} söyle`, write: (a) => `${a} yaz` },
  pl: { say: (a) => `Powiedz ${a}`, write: (a) => `Napisz ${a}` },
};

/** «Скажи / Напиши» + изучаемый язык («Скажи по-испански», «Write it in French», «İtalyanca yaz»). Для en — прежние строки. */
export function studyLanguageAction(uiLang: Lang | string, studyTarget: string | null | undefined, verb: ActionVerb): string {
  const forms = ACTION[uiLang as Lang] ?? ACTION.en;
  return forms[verb](studyLanguageWord(uiLang, studyTarget, 'adv'));
}

/** Все формы всех языков (для сторожа «нет чужого названия языка»). */
export function allStudyLanguageWords(uiLang: Lang | string, studyTarget: StudyLanguageCode): readonly string[] {
  const table = BY_UI[uiLang as Lang] ?? EN;
  return [table.name[studyTarget], table.gen[studyTarget], table.adv[studyTarget]];
}

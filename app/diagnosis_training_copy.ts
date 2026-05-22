import type { Lang, PlannedInterfaceLang, PlannedTriLangCopy } from '../constants/i18n';

type CopyLang = Lang;
type DiagnosisCopyValue = { ru: string; uk: string; es: string } & PlannedTriLangCopy;

type Rule = [RegExp, string];

const DIAGNOSIS_PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly PlannedInterfaceLang[];

const DIAGNOSIS_NEEDS_REVIEW_COPY: Record<PlannedInterfaceLang, string> = {
  'pt-BR': 'needs-review: este texto de treino ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: nội dung luyện tập này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: teks latihan ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu alıştırma metni Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: ten tekst ćwiczenia nadal wymaga przeglądu po polsku.',
};

function isDiagnosisPlannedLocale(lang: CopyLang): lang is PlannedInterfaceLang {
  const allowed = DIAGNOSIS_PLANNED_LOCALES as readonly string[];
  return allowed.includes(lang);
}

const RU_RULES: Rule[] = [
  [/\bfrequency adverbs?\b/gi, 'наречия частоты'],
  [/\badverbs?\b/gi, 'наречие'],
  [/\badjective form\b/gi, 'форма прилагательного'],
  [/\badjectives?\b/gi, 'прилагательное'],
  [/\bnouns?\b/gi, 'существительное'],
  [/\bmain verbs?\b/gi, 'основной глагол'],
  [/\bauxiliary\/modal\b/gi, 'вспомогательный или модальный глагол'],
  [/\bauxiliaries\b/gi, 'вспомогательные глаголы'],
  [/\bauxiliary\b/gi, 'вспомогательный глагол'],
  [/\bmodal verbs?\b/gi, 'модальный глагол'],
  [/\bmodals?\b/gi, 'модальный глагол'],
  [/\bbase verbs?\b/gi, 'начальная форма глагола'],
  [/\bsubject\b/gi, 'подлежащее'],
  [/\bobjects?\b/gi, 'дополнение'],
  [/\bquestion words?\b/gi, 'вопросительное слово'],
  [/\bword order\b/gi, 'порядок слов'],
  [/\bcomparative form\b/gi, 'форма сравнения'],
  [/\bcomparatives?\b/gi, 'сравнение'],
  [/\bsuperlatives?\b/gi, 'превосходная степень'],
  [/\bconditional\b/gi, 'условное предложение'],
  [/\bimperative\b/gi, 'команда или просьба'],
  [/\brelative clauses?\b/gi, 'придаточная часть с who/which/that'],
  [/\breported speech\b/gi, 'передача чужих слов'],
  [/\bpronouns?\b/gi, 'местоимение'],
  [/\bpossessive\b/gi, 'притяжательная форма'],
  [/\bdeterminers?\b/gi, 'указатели перед существительным'],
  [/\bquantifiers?\b/gi, 'слова количества'],
  [/\bpresent simple\b/gi, 'Present Simple'],
  [/\bpast simple\b/gi, 'Past Simple'],
  [/\bpresent continuous\b/gi, 'Present Continuous'],
  [/\bpresent perfect\b/gi, 'Present Perfect'],
];

const UK_RULES: Rule[] = [
  [/\bfrequency adverbs?\b/gi, 'прислівники частоти'],
  [/\badverbs?\b/gi, 'прислівник'],
  [/\badjective form\b/gi, 'форма прикметника'],
  [/\badjectives?\b/gi, 'прикметник'],
  [/\bnouns?\b/gi, 'іменник'],
  [/\bmain verbs?\b/gi, 'основне дієслово'],
  [/\bauxiliary\/modal\b/gi, 'допоміжне або модальне дієслово'],
  [/\bauxiliaries\b/gi, 'допоміжні дієслова'],
  [/\bauxiliary\b/gi, 'допоміжне дієслово'],
  [/\bmodal verbs?\b/gi, 'модальне дієслово'],
  [/\bmodals?\b/gi, 'модальне дієслово'],
  [/\bbase verbs?\b/gi, 'початкова форма дієслова'],
  [/\bsubject\b/gi, 'підмет'],
  [/\bobjects?\b/gi, 'додаток'],
  [/\bquestion words?\b/gi, 'питальне слово'],
  [/\bword order\b/gi, 'порядок слів'],
  [/\bcomparative form\b/gi, 'форма порівняння'],
  [/\bcomparatives?\b/gi, 'порівняння'],
  [/\bsuperlatives?\b/gi, 'найвищий ступінь'],
  [/\bconditional\b/gi, 'умовне речення'],
  [/\bimperative\b/gi, 'команда або прохання'],
  [/\brelative clauses?\b/gi, 'підрядна частина з who/which/that'],
  [/\breported speech\b/gi, 'передача чужих слів'],
  [/\bpronouns?\b/gi, 'займенник'],
  [/\bpossessive\b/gi, 'присвійна форма'],
  [/\bdeterminers?\b/gi, 'вказівники перед іменником'],
  [/\bquantifiers?\b/gi, 'слова кількості'],
  [/\bpresent simple\b/gi, 'Present Simple'],
  [/\bpast simple\b/gi, 'Past Simple'],
  [/\bpresent continuous\b/gi, 'Present Continuous'],
  [/\bpresent perfect\b/gi, 'Present Perfect'],
];

export const DIAGNOSIS_COPY_FORBIDDEN_RU_UK = [
  'frequency adverb',
  'auxiliary',
  'main verb',
  'base verb',
  'subject',
  'object',
  'adjective form',
  'adverb form',
  'noun',
  'modal',
] as const;

export function sanitizeDiagnosisCopy(lang: CopyLang, value: string): string {
  if (lang !== 'ru' && lang !== 'uk') return value;
  const rules = lang === 'uk' ? UK_RULES : RU_RULES;
  return rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function diagnosisCopy(lang: CopyLang, value: DiagnosisCopyValue): string {
  if (isDiagnosisPlannedLocale(lang)) {
    const selected = value[lang]?.trim();
    return selected || DIAGNOSIS_NEEDS_REVIEW_COPY[lang];
  }

  const selected = lang === 'uk' ? value.uk : lang === 'es' ? value.es : value.ru;
  return sanitizeDiagnosisCopy(lang, selected);
}

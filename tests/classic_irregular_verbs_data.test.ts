// зачем (владелец 05.11: «Неправильные глаголы и аналог для es/fr/de/it — в 150, по урокам, ТОЛЬКО новые в уроке, без повторов, по образцу
// английского»): сторож данных modules/classic-irregular-verbs/<lang>.json и их подключения к экрану/меню.
// Падает, если глагол повторяется в двух уроках, урок вне 1–32, глагол стоит не в том уроке, где впервые встретился во фразах,
// нет перевода ru/uk/en, форма тренажёра пустая или из нескольких слов там, где её нужно собирать из букв, или раздел снова закрыт.
import fs from 'node:fs';
import path from 'node:path';

import { CLASSIC_IRREGULAR_VERBS_ENABLED, classicIrregularVerbsByLesson, classicVerbsSlotCaptions, classicVerbsSpeechLanguage } from '../app/classic_irregular_verbs';
import { irregularVerbsForLesson, allIrregularVerbsFor } from '../app/irregular_verbs_for_target';
import { IRREGULAR_VERBS_BY_LESSON } from '../app/irregular_verbs_data';
import { vocabularyContentAvailableForTarget } from '../app/vocabulary_target_gate';

const ROOT = path.join(__dirname, '..');
const COURSES = ['fr', 'es', 'de', 'it'] as const;

type Entry = { lemma: string; meaning: Record<string, string>; train: { base: string; past: string; pp: string }; examples: string[] };
type File = { schema: string; lang: string; lessons: Record<string, Entry[]> };

function readFile(lang: string): File {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'modules', 'classic-irregular-verbs', `${lang}.json`), 'utf8')) as File;
}

function phrasesOf(lang: string): Map<string, { lesson: number; target: string }> {
  const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
  const out = new Map<string, { lesson: number; target: string }>();
  for (const f of fs.readdirSync(dir).filter((x) => /^lessons-\d+\.json$/.test(x))) {
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { lesson: number; phrases: { id: string; target: string }[] };
    for (const p of lesson.phrases) out.set(p.id, { lesson: lesson.lesson, target: p.target });
  }
  return out;
}

const STUB = /(^|[^\p{L}])(пока|скоро|todo|tbd|заглушк\p{L}*|незабаром|поки що)([^\p{L}]|$)/iu;

describe.each(COURSES)('%s: неправильные глаголы курса', (lang) => {
  const file = readFile(lang);
  const phrases = phrasesOf(lang);
  const entries = Object.entries(file.lessons).flatMap(([lesson, list]) => list.map((e) => ({ lesson: Number(lesson), e })));

  it('схема и язык файла', () => {
    expect(file.schema).toBe('phraseman.classic-irregular-verbs/1');
    expect(file.lang).toBe(lang);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('нет повторов между уроками: каждая лемма — ровно в одном уроке 1–32', () => {
    const seen = new Map<string, number>();
    const repeats: string[] = [];
    for (const { lesson, e } of entries) {
      expect([e.lemma, Number.isInteger(lesson) && lesson >= 1 && lesson <= 32]).toEqual([e.lemma, true]);
      const k = e.lemma.toLocaleLowerCase();
      if (seen.has(k)) repeats.push(`${e.lemma}: уроки ${seen.get(k)} и ${lesson}`);
      seen.set(k, lesson);
    }
    expect(repeats).toEqual([]);
  });

  it('только новые в уроке: первый пример глагола — из его же урока, ни один пример не раньше урока глагола', () => {
    const wrong: string[] = [];
    for (const { lesson, e } of entries) {
      expect([e.lemma, e.examples.length >= 1 && e.examples.length <= 3]).toEqual([e.lemma, true]);
      const ex = e.examples.map((id) => phrases.get(id));
      if (ex.some((p) => !p)) wrong.push(`${e.lemma}: пример не найден ${e.examples.join(',')}`);
      if (ex[0] && ex[0].lesson !== lesson) wrong.push(`${e.lemma}@${lesson}: первый пример из урока ${ex[0].lesson}`);
      if (ex.some((p) => p && p.lesson < lesson)) wrong.push(`${e.lemma}@${lesson}: глагол встречался раньше`);
    }
    expect(wrong).toEqual([]);
  });

  it('переводы на все 9 языков интерфейса есть, без заглушек; не-ru/uk без кириллицы', () => {
    const bad: string[] = [];
    for (const { e } of entries) {
      for (const l of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
        if (l !== 'ru' && l !== 'uk' && /[Ѐ-ӿ]/u.test(e.meaning?.[l] ?? '')) bad.push(`${e.lemma}.${l} кириллица`);
        const t = String(e.meaning?.[l] ?? '').trim();
        if (!t || STUB.test(t)) bad.push(`${e.lemma}.${l}`);
      }
      if (/[Ѐ-ӿ]/u.test(e.meaning.en ?? '')) bad.push(`${e.lemma}.en кириллица`);
    }
    expect(bad).toEqual([]);
  });

  it('три формы тренажёра заполнены; несколько слов — только у отделяемых немецких глаголов', () => {
    const bad: string[] = [];
    for (const { e } of entries) {
      for (const k of ['base', 'past', 'pp'] as const) {
        const v = String(e.train?.[k] ?? '').trim();
        if (!v) bad.push(`${e.lemma}.${k} пусто`);
        if (/\s/u.test(v) && !(lang === 'de' && k === 'past')) bad.push(`${e.lemma}.${k}="${v}"`);
      }
      if (e.train.base !== e.lemma) bad.push(`${e.lemma}: инфинитив тренажёра ${e.train.base}`);
    }
    expect(bad).toEqual([]);
  });

  it('переходник читает тот же список: урок = файл, английские глаголы не подмешаны', () => {
    const byLesson = classicIrregularVerbsByLesson(lang);
    for (const [lesson, list] of Object.entries(file.lessons)) {
      const verbs = byLesson[Number(lesson)] ?? [];
      expect([lesson, verbs.map((v) => v.base)]).toEqual([lesson, list.map((e) => e.train.base)]);
      expect(verbs.every((v) => v.classicCourse === lang)).toBe(true);
    }
    const englishBases = new Set(Object.values(IRREGULAR_VERBS_BY_LESSON).flat().map((v) => `${v.base}|${v.past}|${v.pp}`));
    expect(Object.values(byLesson).flat().filter((v) => englishBases.has(`${v.base}|${v.past}|${v.pp}`))).toEqual([]);
  });

  it('раздел в приложении открыт ровно тогда, когда включён флаг (150 — выключен, слово владельца 05.11)', () => {
    expect(vocabularyContentAvailableForTarget(lang, 'irregular_verbs')).toBe(CLASSIC_IRREGULAR_VERBS_ENABLED);
    if (!CLASSIC_IRREGULAR_VERBS_ENABLED) {
      // выключено — меню и экран не видят ни одного глагола курса (пункт скрыт, английский список не подставлен)
      expect(allIrregularVerbsFor(lang)).toEqual([]);
      return;
    }
    for (const [lesson, list] of Object.entries(file.lessons)) {
      expect([lesson, irregularVerbsForLesson(lang, Number(lesson)).map((v) => v.base)]).toEqual([lesson, list.map((e) => e.train.base)]);
    }
    // урок без новых глаголов — пусто (пункт меню скрыт), а не текст-заглушка
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      if (!file.lessons[String(lesson)]) expect(irregularVerbsForLesson(lang, lesson)).toEqual([]);
    }
  });

  it('подписи форм и голос — свои у курса', () => {
    expect(classicVerbsSpeechLanguage(lang)).toBe({ fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT' }[lang]);
    const ru = classicVerbsSlotCaptions(lang, 'ru');
    expect(ru.base).toBe('инфинитив');
    expect(ru.pp).toBe('причастие');
    expect(ru.past).toBe(lang === 'fr' || lang === 'it' ? 'настоящее' : 'прошлое');
  });
});

describe('английский курс не изменился', () => {
  it('для en — прежний список, для неизвестного курса — пусто', () => {
    expect(irregularVerbsForLesson('en', 3)).toBe(IRREGULAR_VERBS_BY_LESSON[3]);
    expect(irregularVerbsForLesson('en', 3).some((v) => v.classicCourse)).toBe(false);
  });
});

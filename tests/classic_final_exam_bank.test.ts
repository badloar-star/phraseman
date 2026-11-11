// зачем (владелец 11.11, F01): итоговый экзамен ES/DE/IT/FR обязан открывать задания СВОЕГО языка.
// Сторож проверяет содержимое банков на настоящих данных курсов и маршрут экрана.
import fs from 'fs';
import path from 'path';
import {
  buildClassicFinalExamQuestions,
  buildClassicLevelExamQuestions,
  classicExamQuestionFromPhrase,
  classicFinalExamTarget,
  soleWholeWordIndex,
  type ClassicFinalExamTarget,
} from '../app/classic_final_exam_bank';
import { getClassicLessonPhrases } from '../app/classic_course_phrases';
import { COURSE_LEVEL_RANGES, type CourseLevel } from '../app/course_levels';
import type { Lang } from '../constants/i18n';

const ROOT = path.join(__dirname, '..');
const TARGETS: readonly ClassicFinalExamTarget[] = ['es', 'de', 'it', 'fr'];
const UI_LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('банк итогового экзамена классических курсов', () => {
  it('у английского своего банка здесь нет, у четырёх языков — есть', () => {
    expect(classicFinalExamTarget('en')).toBeNull();
    expect(classicFinalExamTarget(undefined)).toBeNull();
    expect(classicFinalExamTarget('pl')).toBeNull();
    for (const target of TARGETS) expect(classicFinalExamTarget(target)).toBe(target);
  });

  it('слово ищется целым и только если оно в предложении одно', () => {
    expect(soleWholeWordIndex('Estoy aquí.', 'aquí')).toBe(6);
    expect(soleWholeWordIndex('No, no estoy.', 'no')).toBe(4);
    expect(soleWholeWordIndex('no y no', 'no')).toBe(-1);
    expect(soleWholeWordIndex('Je suis ici.', 'i')).toBe(-1);
    expect(soleWholeWordIndex('J’ai faim.', 'J’')).toBe(0);
    expect(soleWholeWordIndex('J’ai faim.', 'ai')).toBe(2);
  });

  describe.each(TARGETS)('%s', (target) => {
    const phraseById = new Map<string, { sentence: string; lesson: number }>();
    for (let lesson = 1; lesson <= 32; lesson++) {
      for (const phrase of getClassicLessonPhrases(lesson, target)) phraseById.set(String(phrase.id), { sentence: phrase.english, lesson });
    }

    it('в курсе 32 урока по 50 фраз', () => {
      expect(phraseById.size).toBe(1600);
    });

    it.each(UI_LANGS)('интерфейс %s: 50 заданий своего языка, каждый урок представлен', (lang) => {
      for (const seed of [1, 7, 2026]) {
        const questions = buildClassicFinalExamQuestions(target, lang, 50, seeded(seed));
        expect(questions).toHaveLength(50);
        expect(new Set(questions.map((q) => q.lessonNum)).size).toBe(32);
        expect(new Set(questions.map((q) => `${q.q}|${q.hint}`)).size).toBe(50);
        for (const q of questions) {
          const source = phraseById.get(q.phraseId);
          // задание взято из фразы курса ЭТОГО языка и этого урока
          expect(q.phraseId.startsWith(`${target}:`)).toBe(true);
          expect(source).toBeDefined();
          expect(source?.lesson).toBe(q.lessonNum);
          // верный вариант, вставленный в пропуск, даёт ровно фразу курса
          expect(q.q.split('___')).toHaveLength(2);
          expect(q.q.replace('___', q.opts[q.correct])).toBe(source?.sentence);
          // четыре разных варианта, верный ровно один
          expect(q.opts).toHaveLength(4);
          expect(new Set(q.opts.map((o) => o.toLocaleLowerCase())).size).toBe(4);
          expect(q.correct).toBeGreaterThanOrEqual(0);
          // перевод есть и не совпадает с ответом
          expect(q.hint.trim().length).toBeGreaterThan(0);
          expect(q.hint.trim().toLocaleLowerCase()).not.toBe(source?.sentence.trim().toLocaleLowerCase());
          expect(q.topic.trim().length).toBeGreaterThan(0);
          expect(q.rawTopic).toBe(`${target}:lesson:${q.lessonNum}`);
        }
      }
    });

    it.each(['A1', 'A2', 'B1', 'B2'] as CourseLevel[])('зачёт %s: 30 заданий своего языка, только уроки уровня, каждый урок представлен', (level) => {
      const [from, to] = COURSE_LEVEL_RANGES[level];
      for (const lang of ['ru', 'es', 'en'] as Lang[]) {
        for (const seed of [5, 99]) {
          const questions = buildClassicLevelExamQuestions(target, lang, level, 30, seeded(seed));
          expect(questions).toHaveLength(30);
          expect(new Set(questions.map((q) => q.lessonNum)).size).toBe(to - from + 1);
          expect(new Set(questions.map((q) => `${q.q}|${q.hint}`)).size).toBe(30);
          for (const q of questions) {
            const source = phraseById.get(q.phraseId);
            expect(q.lessonNum).toBeGreaterThanOrEqual(from);
            expect(q.lessonNum).toBeLessThanOrEqual(to);
            expect(source?.lesson).toBe(q.lessonNum);
            expect(q.q.replace('___', q.opts[q.correct])).toBe(source?.sentence);
            expect(new Set(q.opts.map((o) => o.toLocaleLowerCase())).size).toBe(4);
            expect(q.hint.trim().toLocaleLowerCase()).not.toBe(source?.sentence.trim().toLocaleLowerCase());
          }
        }
      }
    });

    it('запаса хватает: в каждом уроке не меньше 10 фраз, из которых собирается задание', () => {
      const rng = seeded(42);
      const weakest = { lesson: 0, usable: Infinity };
      for (let lesson = 1; lesson <= 32; lesson++) {
        const usable = getClassicLessonPhrases(lesson, target).filter((p) => classicExamQuestionFromPhrase(p, lesson, target, 'ru' as Lang, rng)).length;
        if (usable < weakest.usable) { weakest.lesson = lesson; weakest.usable = usable; }
      }
      expect(weakest.usable).toBeGreaterThanOrEqual(10);
    });

    it('неверные варианты не совпадают с принятыми ответами фразы', () => {
      const rng = seeded(3);
      for (let lesson = 1; lesson <= 32; lesson++) {
        for (const phrase of getClassicLessonPhrases(lesson, target)) {
          const q = classicExamQuestionFromPhrase(phrase, lesson, target, 'ru' as Lang, rng);
          if (!q) continue;
          const accepted = new Set<string>();
          for (const text of [phrase.english, ...(phrase.alternatives ?? []), ...((phrase.classic?.accepted ?? []).flat())]) {
            for (const token of text.split(/\s+/)) accepted.add(token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’']+$/gu, '').toLocaleLowerCase());
          }
          q.opts.forEach((option, index) => {
            if (index !== q.correct) expect(accepted.has(option.toLocaleLowerCase())).toBe(false);
          });
        }
      }
    });
  });

  it('экран: не-английский язык никогда не получает английский банк', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'exam.tsx'), 'utf8');
    expect(source).toContain("import { classicFinalExamTarget, loadClassicFinalExamQuestions } from './classic_final_exam_bank'");
    expect(source).toContain('const classicExamTarget = classicFinalExamTarget(storageStudyTarget(studyTarget))');
    expect(source).toContain('const questions = classicExamTarget ? classicQuestions : englishQuestions;');
    // английский банк собирается только когда своего банка у языка нет (то есть для английского)
    expect(source).toMatch(/const englishQuestions = React\.useMemo\(\(\) => \{\s*if \(frenchExamBlocked \|\| classicExamTarget\) return \[\];/);
    expect(source).toContain("'exam_questions_unavailable'");
    expect(source).not.toContain('loadFrenchRemoteFinalExamQuestions');
  });

  it('экран зачёта: не-английский язык не получает английский банк, а в движок идёт со своим языком курса', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'level_exam.tsx'), 'utf8');
    // зачем (владелец 11.11.2026, «Проверен, вырезать»): прежний встроенный экран экзамена уровня удалён из app/level_exam.tsx — английского банка в файле больше нет вовсе
    expect(source).not.toContain('QUESTION_POOL');
    expect(source).not.toContain('englishQuestions');
    // зачем (владелец 11.11.2026, позже в тот же день: «Перевести на новые механики»): экзамен уровня всех пяти курсов идёт через
    // новый движок, но каждый — СО СВОИМ языком. Прежнее правило «движок только английскому» заменено: суть та же —
    // не-английский курс не получает английских заданий, — только теперь её держит передача языка курса в движок.
    expect(source).toMatch(/if \(!frenchExamBlocked\) \{\s*return \(\s*<LevelExamV2[\s\S]{0,300}?studyTarget=\{classicExamTarget \?\? 'en'\}/);
    expect(source).not.toContain('loadFrenchRemoteLevelExamQuestions');
  });
});

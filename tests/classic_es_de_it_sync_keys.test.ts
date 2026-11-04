// Сторож (классические курсы 04.11, «прогресс не пропадает»): прогресс новых курсов es/de/it синхронизируется с облаком
// так же, как у французского: ключи списка соответствуют схеме targetKey, серверные ключи — парой клиент+сервер.
import fs from 'fs';
import path from 'path';
import { buildTargetCourseOnlySyncKeys, isServerOwnedProgressKey } from '../app/cloud_sync';
import { lessonBestScoreKey, lessonProgressKey, unlockedLessonsKey, lastOpenedLessonKey, levelExamKey } from '../app/target_storage_keys';

const TARGETS = ['es', 'de', 'it'] as const;

describe('синхронизация прогресса es/de/it', () => {
  for (const target of TARGETS) {
    it(`${target}: список содержит ключи уроков/последнего урока/экзаменов и только свой язык`, () => {
      const keys = [...buildTargetCourseOnlySyncKeys(target)];
      expect(keys.length).toBeGreaterThan(100);
      expect(keys).toEqual(expect.arrayContaining([
        unlockedLessonsKey(target), lastOpenedLessonKey(target), lessonBestScoreKey(1, target), lessonProgressKey(32, target),
        levelExamKey('A1', 'passed', target),
      ]));
      expect(keys.every((k) => typeof k === 'string' && k.length > 0)).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
      // ничего английского legacy и чужих языков
      const other = TARGETS.filter((t) => t !== target).concat(['fr' as never]);
      for (const o of other) expect(keys.some((k) => k.includes(`::${o}::`))).toBe(false);
      expect(keys.some((k) => /^lesson\d+_(?:best_score|pass_count|progress)$/.test(k))).toBe(false);
    });

    it(`${target}: серверные ключи уроков — как у французского (клиент)`, () => {
      expect(isServerOwnedProgressKey(`lesson_progress_v2::${target}::lesson3_best_score`)).toBe(true);
      expect(isServerOwnedProgressKey(`lesson_progress_v2::${target}::7`)).toBe(true);
      expect(isServerOwnedProgressKey(`lesson_progress_v2::${target}::unlocked_lessons`)).toBe(true);
      expect(isServerOwnedProgressKey(`level_exams_v2::${target}::level_exam_A1_pct`)).toBe(true);
      // не серверные: последний урок, карточки
      expect(isServerOwnedProgressKey(lastOpenedLessonKey(target))).toBe(false);
    });
  }

  it('пара клиент+сервер: серверный список в progress_events совпадает по языкам', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'progress_events.ts'), 'utf8');
    expect(server).toMatch(/lesson_progress_v2::\(\?:es\|fr\|de\|it\)::/);
    expect(server).toMatch(/level_exams_v2::\(\?:es\|fr\|de\|it\)::/);
  });

  it('firestore.rules блокирует pass_live для es/de/it (реферальная подделка)', () => {
    const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
    for (const t of ['fr', ...TARGETS]) expect(rules).toContain(`'lesson_progress_v2::${t}::lesson1_pass_live'`);
  });
});

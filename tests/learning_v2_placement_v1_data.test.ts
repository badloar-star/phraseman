// Данные входного теста №10 (экран 2 · ДИЗАЙН): уроки, вопросы по правилу 12 · ТЕОРИИ, итог «просто открыто».
import { learningV2PlacementLessonsV1, learningV2PlacementLessonTitleV1, learningV2PlacementQuestionV1 } from '../app/learning_v2_placement_v1';
import { LEARNING_V2_PLACEMENT_ITEMS_V1 } from '../app/learning_v2_placement_items_v1';

describe('placement data v1', () => {
  it('lessons: contiguous from 1, capped at the pool checked by Theory; every lesson has a title', () => {
    const lessons = learningV2PlacementLessonsV1();
    expect(lessons[0]).toBe(1);
    expect(lessons.length).toBeLessThanOrEqual(22);
    lessons.forEach((lesson, i) => { expect(lesson).toBe(i + 1); expect(learningV2PlacementLessonTitleV1(lesson)).not.toBe(''); });
  });

  // жалобы владельца 28.10: бредовые задания и несколько верных ответов — тест берёт только проверенные задания (learning_v2_placement_items_v1)
  it('every lesson of the test has at least three vetted items, and every question comes from that list', () => {
    for (const lesson of learningV2PlacementLessonsV1()) {
      const vetted = LEARNING_V2_PLACEMENT_ITEMS_V1[lesson] ?? [];
      expect(vetted.length).toBeGreaterThanOrEqual(3);
      const used: string[] = [];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const q = learningV2PlacementQuestionV1({ lessonOrdinal: lesson, attemptIndex: attempt, usedInteractionIds: used });
        expect(q && vetted.includes(q.interactionId)).toBe(true);
        if (q) used.push(q.interactionId);
      }
    }
  });

  it('questions: gap-grammar of the lesson, three distinct per topic, exclusions honoured, no form hint in l15', () => {
    for (const lesson of [1, 3, 9, 14, 15]) {
      const used: string[] = [];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const q = learningV2PlacementQuestionV1({ lessonOrdinal: lesson, attemptIndex: attempt, usedInteractionIds: used });
        expect(q).not.toBeNull();
        if (!q) continue;
        expect(q.family).toBe('context_gap_grammar');
        expect(q.lessonOrdinal).toBe(lesson);
        expect(used).not.toContain(q.interactionId);
        if (lesson === 3 && q.sessionOrdinal <= 8) expect(q.interactionId).not.toMatch(/:i14$/);
        // проверенные задания у15 — going to с am / is / are, без подсказки «Передайте … через …» (её нечего отрезать)
        expect(q.promptOverride).toBeNull();
        used.push(q.interactionId);
      }
    }
  });
});

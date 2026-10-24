// Данные входного теста №10 (экран 2 · ДИЗАЙН): уроки, вопросы по правилу 12 · ТЕОРИИ, итог «просто открыто».
import { learningV2PlacementLessonsV1, learningV2PlacementLessonTitleV1, learningV2PlacementQuestionV1 } from '../app/learning_v2_placement_v1';

describe('placement data v1', () => {
  it('lessons: contiguous from 1, capped at the pool checked by Theory; every lesson has a title', () => {
    const lessons = learningV2PlacementLessonsV1();
    expect(lessons[0]).toBe(1);
    expect(lessons.length).toBeLessThanOrEqual(22);
    lessons.forEach((lesson, i) => { expect(lesson).toBe(i + 1); expect(learningV2PlacementLessonTitleV1(lesson)).not.toBe(''); });
  });

  it('questions: gap-grammar of the lesson, three distinct per topic, exclusions honoured, l15 hint cut', () => {
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
        if (lesson === 15) { expect(q.promptOverride).toBeTruthy(); expect(q.promptOverride).not.toMatch(/Передайте/); }
        else expect(q.promptOverride).toBeNull();
        used.push(q.interactionId);
      }
    }
  });
});

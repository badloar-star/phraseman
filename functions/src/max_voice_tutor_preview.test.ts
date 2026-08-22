import { TUTOR_MEMORY_EMPTY, type TutorMemory } from './max_voice_tutor_memory';
import { buildTutorPreview } from './max_voice_tutor_preview';
import { MAX_TEXT_LANGS } from './max_voice_can_do_goals';
import { buildVoiceInstructions } from './max_voice_prompt';

const UI_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function memory(overrides: Partial<TutorMemory> = {}): TutorMemory {
  return {
    ...TUTOR_MEMORY_EMPTY,
    facts: [], recurringErrors: [], homework: [], phraseQueue: [], goalMastery: {},
    ...overrides,
  };
}

describe('buildTutorPreview', () => {
  test.each(UI_LANGS)('has authored preview and complete goal copy for %s', (interfaceLang) => {
    const preview = buildTutorPreview({
      memory: memory(), cefr: 'A1', interfaceLang, tutorName: 'Max', nowMs: 1_000,
    });
    expect(preview.displayTitle.trim()).not.toBe('');
    expect(preview.outcome.trim()).not.toBe('');
    expect(preview.goal).not.toBeNull();
    MAX_TEXT_LANGS.forEach((locale) => expect(preview.goal?.title[locale].trim()).not.toBe(''));
  });

  test('never uses Russian as the fallback for a non-Russian interface', () => {
    const prompt = buildVoiceInstructions({
      cefr: 'A1', format: 'tutor', personaName: 'Max', personaRole: '',
      learnerLangName: 'Ukrainian', targetLangName: 'English',
    });
    expect(prompt).toContain('Never use Russian as a fallback');
  });
  test('returns a stable current-lesson preview without mutating memory', () => {
    const source = memory({ callCount: 3 });
    const before = JSON.stringify(source);
    const first = buildTutorPreview({ memory: source, cefr: 'A1', interfaceLang: 'ru', tutorName: 'Max', nowMs: 1_000 });
    const second = buildTutorPreview({ memory: source, cefr: 'A1', interfaceLang: 'ru', tutorName: 'Max', nowMs: 2_000 });

    expect(first.lessonOrdinal).toBe(4);
    expect(first.displayTitle).toBe(second.displayTitle);
    expect(first.outcome.length).toBeLessThanOrEqual(180);
    expect(JSON.stringify(source)).toBe(before);
  });

  test('uses distinctive titles for consecutive modes working on the same goal', () => {
    const previews = [
      memory({ callCount: 0 }),
      memory({ callCount: 1, goalMastery: { a1_greet: 1 } }),
      memory({ callCount: 2 }),
    ].map((lessonMemory) => buildTutorPreview({
      memory: lessonMemory, cefr: 'A1', interfaceLang: 'ru', tutorName: 'Max', nowMs: 1_000,
    }));

    expect(previews.map((preview) => preview.lessonType)).toEqual([
      'new_material', 'review_and_scene', 'free_talk',
    ]);
    expect(new Set(previews.map((preview) => preview.displayTitle)).size).toBe(3);
    expect(previews.map((preview) => preview.displayTitle)).toEqual([
      'Первый контакт',
      'Знакомство без подсказок',
      'Разговор, который не оборвётся',
    ]);
  });

  test('localizes authored title patterns and keeps the goal payload', () => {
    const preview = buildTutorPreview({
      memory: memory({ callCount: 3 }), cefr: 'A1', interfaceLang: 'en', tutorName: 'Max', nowMs: 1_000,
    });

    expect(preview.displayTitle).toContain('Greet and say goodbye');
    expect(preview.goal).toMatchObject({ id: 'a1_greet', level: 'A1' });
    expect(preview).not.toHaveProperty('goalsTotal');
    expect(preview).not.toHaveProperty('goalsDone');
  });
});

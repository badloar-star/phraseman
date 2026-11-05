// зачем (Макеты 05.11: «Vocabulary грузится 7 с — Preparing practice…», координатор: убрать ожидание): экран слов не ждёт чтения хранилища, когда прогресс урока
// уже в памяти (прогрев при запуске/прошлый заход). Ждёт только при пустом кэше. Плюс: английские местоимения и формы мн. числа не попадают в прогресс fr/es/de/it.
import fs from 'fs';
import path from 'path';

const words = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_words.tsx'), 'utf8');
const menu = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_menu.tsx'), 'utf8');

describe('lesson words: no waiting for storage when progress is cached', () => {
  it('readiness starts from the in-memory cache and is refreshed in the background', () => {
    expect(words).toContain('useState(() => lessonWordsProgressCache.has(storageKey))');
    expect(words).toContain('setWordProgressReady(primed)');
    expect(words).toContain('[LESSON-WORDS] progress ready from memory=');
  });

  it('English-only progress migrations are not applied to fr/es/de/it', () => {
    expect(words).toContain("const englishOnly = storageStudyTarget(studyTarget) === 'en';");
    expect(words).toContain('if (englishOnly && lessonId === 1');
    expect(words).toContain('englishOnly ? mergeLegacyPluralLessonWordCounts(counts).counts : counts');
    expect(words).not.toMatch(/parseLessonWordCounts\([^)]*lessonId\)(?!,)/);
    expect(menu).toContain("storageStudyTarget(studyTarget) === 'en' && lessonId === 1 && Object.values(counts).some(c => c >= 3)");
  });
});

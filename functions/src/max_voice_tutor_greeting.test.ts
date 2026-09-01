// Сторож: MAX не знакомится заново с тем, кого уже знает.
//
// зачем (владелец 2026-09-01): «урок второй раз запустил после первых 5 минут,
// и он снова спросил моё имя и откуда я, а не продолжил урок».
//
// Корень: у ПРОБНИКА callCount намеренно не растёт (reviewOnly — итоги урока
// не засчитываются), зато имя и факты сохраняются. Промпт проверял только
// счётчик, видел ноль и командовал «это первый урок, узнай имя» — MAX
// знакомился заново с человеком, которого знает по имени.
//
// Это худший класс бага для голосового учителя: «он меня забыл» обижает
// сильнее любой технической ошибки.

import { renderTutorMemoryBlock, TUTOR_MEMORY_EMPTY, type TutorMemory } from './max_voice_tutor_memory';

const NOW = 1_757_000_000_000;

const FIRST_LESSON_HINT = 'This is your FIRST lesson together';
const ALREADY_MET_HINT = 'YOU HAVE ALREADY MET THIS LEARNER';

describe('приветствие учителя зависит от памяти, а не только от счётчика', () => {
  it('совсем новый ученик — знакомимся', () => {
    const block = renderTutorMemoryBlock(TUTOR_MEMORY_EMPTY, NOW);
    expect(block).toContain(FIRST_LESSON_HINT);
  });

  it('пробник назвал имя — второй раз НЕ спрашиваем', () => {
    // Ровно случай владельца: callCount ноль (пробник его не растит), но имя
    // уже сохранено.
    const memory: TutorMemory = { ...TUTOR_MEMORY_EMPTY, preferredName: 'Максим' };
    const block = renderTutorMemoryBlock(memory, NOW);
    expect(block).not.toContain(FIRST_LESSON_HINT);
    expect(block).toContain(ALREADY_MET_HINT);
  });

  it('известна цель обучения — тоже уже знакомы', () => {
    const memory: TutorMemory = { ...TUTOR_MEMORY_EMPTY, learningGoal: 'для работы' };
    expect(renderTutorMemoryBlock(memory, NOW)).not.toContain(FIRST_LESSON_HINT);
  });

  it('есть запомненные факты — тоже уже знакомы', () => {
    const memory: TutorMemory = { ...TUTOR_MEMORY_EMPTY, facts: ['живёт в Праге'] };
    expect(renderTutorMemoryBlock(memory, NOW)).not.toContain(FIRST_LESSON_HINT);
  });

  it('обычный ученик со счётчиком — прежнее поведение не сломано', () => {
    const memory: TutorMemory = {
      ...TUTOR_MEMORY_EMPTY,
      callCount: 3,
      lastCallAtMs: NOW - 86_400_000,
      preferredName: 'Максим',
    };
    const block = renderTutorMemoryBlock(memory, NOW);
    expect(block).not.toContain(FIRST_LESSON_HINT);
    expect(block).toContain('Lessons so far: 3');
    // При живом счётчике особая подсказка не нужна — её место занимает
    // обычная строка про число уроков.
    expect(block).not.toContain(ALREADY_MET_HINT);
  });
});

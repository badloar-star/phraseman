/**
 * Контракт генератора турнирных заданий.
 *
 * зачем: генератор наполняет боевой пул tournamentTasks. Если он выпустит
 * задание, не проходящее серверный валидатор, оно либо молча выпадет из
 * выборки, либо (при нехватке пула) отменит комнату с возвратом билетов.
 * Поэтому проверяем не «функция что-то вернула», а что КАЖДОЕ задание
 * проходит validateTournamentTask и что сборка детерминирована.
 */

import {
  difficultyForDay,
  generateTournamentTasks,
  phraseTokens,
  TOURNAMENT_MODES,
  type SourceDay,
  type SourcePhrase,
} from './tournament_task_factory';
import { validateTournamentTask } from './tournament_core';

function phrase(id: string, english: string, ru: string, words?: SourcePhrase['words']): SourcePhrase {
  return { id, english, meaning: { ru }, words };
}

/**
 * validateTournamentTask отбраковывает всё с verified !== true — это гейт пула
 * на выборке в комнату, а не проверка формы. Генератор по умолчанию выпускает
 * черновики на ревью, поэтому форму проверяем на опубликованной копии.
 */
function assertServerAccepts(task: { verified: boolean }): void {
  expect(validateTournamentTask({ ...task, verified: true } as never))
    .toEqual({ ok: true, kind: expect.any(String) });
}

const WORDS = [
  { text: 'I', partOfSpeech: 'pronoun', distractors: ['you', 'he', 'she'] },
  { text: 'am', partOfSpeech: 'to-be', distractors: ['is', 'are', 'was'] },
  { text: 'here', partOfSpeech: 'adverb', distractors: ['soon', 'later', 'always'] },
];

function day(overrides: Partial<SourceDay> = {}): SourceDay {
  return {
    planId: 'mitap',
    dayIndex: 1,
    level: 'A1',
    topic: { ru: 'Знакомство' },
    phrases: [
      phrase('p1', 'I am here', 'Я здесь', WORDS),
      phrase('p2', 'Nice to meet you', 'Приятно познакомиться', WORDS),
      phrase('p3', 'See you later', 'До встречи', WORDS),
      phrase('p4', 'How are you', 'Как дела', WORDS),
      phrase('p5', 'My name is Anna', 'Меня зовут Анна', WORDS),
    ],
    ...overrides,
  };
}

describe('генератор турнирных заданий', () => {
  it('каждое выпущенное задание проходит серверный валидатор', () => {
    const { tasks } = generateTournamentTasks([day()]);

    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) assertServerAccepts(task);
  });

  it('choice отдаёт ровно 4 варианта и correctIndex указывает на верный перевод', () => {
    const { tasks } = generateTournamentTasks([day()], { kinds: ['choice'] });
    expect(tasks.length).toBeGreaterThan(0);

    for (const task of tasks) {
      const options = task.payload.options as string[];
      const correctIndex = task.payload.correctIndex as number;
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4); // без повторов
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(correctIndex).toBeLessThan(4);
      expect(task.mode).toBe(TOURNAMENT_MODES.choice);
      expect(task.isVoice).toBe(false);
    }
  });

  it('choice берёт правильный перевод именно своей фразы', () => {
    const source = day();
    const { tasks } = generateTournamentTasks([source], { kinds: ['choice'] });

    for (const task of tasks) {
      const options = task.payload.options as string[];
      const correct = options[task.payload.correctIndex as number];
      const origin = source.phrases.find((p) => p.english === task.payload.phrase);
      expect(origin).toBeDefined();
      expect(correct).toBe(origin?.meaning.ru);
    }
  });

  it('translate: банк содержит все токены фразы плюс отвлекающие слова', () => {
    const { tasks } = generateTournamentTasks([day()], { kinds: ['translate'] });
    expect(tasks.length).toBeGreaterThan(0);

    for (const task of tasks) {
      const bank = task.payload.wordBank as string[];
      const correctTokens = task.payload.correctTokens as string[];
      for (const token of correctTokens) expect(bank).toContain(token);
      expect(bank.length).toBeGreaterThan(correctTokens.length);
    }
  });

  it('translate не кладёт в отвлекающие слова токен самой фразы', () => {
    const { tasks } = generateTournamentTasks([day()], { kinds: ['translate'] });

    for (const task of tasks) {
      const bank = task.payload.wordBank as string[];
      // Каждый токен встречается в банке ровно столько раз, сколько во фразе:
      // дистрактор, совпавший с верным словом, сделал бы задание нерешаемым.
      const correctTokens = task.payload.correctTokens as string[];
      for (const token of new Set(correctTokens)) {
        const inPhrase = correctTokens.filter((t) => t === token).length;
        const inBank = bank.filter((t) => t.toLowerCase() === token.toLowerCase()).length;
        expect(inBank).toBe(inPhrase);
      }
    }
  });

  it('timeattack собирает связный сет с корректными индексами', () => {
    const { tasks } = generateTournamentTasks([day()], { kinds: ['timeattack'] });
    expect(tasks).toHaveLength(1);

    const items = tasks[0].payload.items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(8);
    for (const item of items) {
      const options = item.options as string[];
      const index = item.correctIndex as number;
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(options.length);
    }
  });

  it('голосовые задания не генерируются — серверный скоринг голоса выключен', () => {
    const { tasks } = generateTournamentTasks([day()]);
    expect(tasks.every((task) => task.isVoice === false)).toBe(true);
    expect(tasks.some((task) => task.mode.includes('voice'))).toBe(false);
  });

  it('повторный запуск даёт побайтово тот же результат (нет дублей в пуле)', () => {
    const first = generateTournamentTasks([day()]);
    const second = generateTournamentTasks([day()]);
    expect(JSON.stringify(second.tasks)).toBe(JSON.stringify(first.tasks));
  });

  it('taskId уникальны в пределах выпуска', () => {
    const { tasks } = generateTournamentTasks([day(), day({ dayIndex: 2 })]);
    const ids = tasks.map((task) => task.taskId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('по умолчанию задания не verified — сначала ревью владельца', () => {
    const { tasks } = generateTournamentTasks([day()]);
    expect(tasks.every((task) => task.verified === false)).toBe(true);

    const published = generateTournamentTasks([day()], { verified: true });
    expect(published.tasks.every((task) => task.verified === true)).toBe(true);
  });

  it('сложность растёт по CEFR и попадает в диапазон раундов сервера', () => {
    expect(difficultyForDay(day({ level: 'A1' }))).toBe(1);
    expect(difficultyForDay(day({ level: 'B1' }))).toBe(2);
    expect(difficultyForDay(day({ level: 'B2' }))).toBe(3);
    // Без CEFR — по номеру дня.
    expect(difficultyForDay(day({ level: undefined, dayIndex: 3 }))).toBe(1);
    expect(difficultyForDay(day({ level: undefined, dayIndex: 20 }))).toBe(2);
    expect(difficultyForDay(day({ level: undefined, dayIndex: 40 }))).toBe(3);
  });

  it('день с малым числом фраз не рождает choice с повторяющимися вариантами', () => {
    const tiny = day({ phrases: [phrase('a', 'Hi', 'Привет', WORDS), phrase('b', 'Bye', 'Пока', WORDS)] });
    const { tasks } = generateTournamentTasks([tiny], { kinds: ['choice'] });
    expect(tasks).toHaveLength(0); // лучше ноль, чем задание с дублями
  });

  it('битые фразы отбрасываются, а не ломают выпуск', () => {
    const broken = day({
      phrases: [
        phrase('ok', 'I am here', 'Я здесь', WORDS),
        { id: 'no-ru', english: 'Something', meaning: { ru: '   ' } },
        { id: 'no-en', english: '', meaning: { ru: 'Пусто' } },
        phrase('ok2', 'See you', 'Увидимся', WORDS),
        phrase('ok3', 'Thanks', 'Спасибо', WORDS),
        phrase('ok4', 'Please', 'Пожалуйста', WORDS),
      ],
    });
    const { tasks, stats } = generateTournamentTasks([broken]);
    expect(tasks.length).toBeGreaterThan(0);
    expect(stats.phrasesSeen).toBe(4); // две битые не считаются
    for (const task of tasks) assertServerAccepts(task);
  });

  it('limit останавливает выпуск ровно на заданном числе', () => {
    const { tasks } = generateTournamentTasks([day(), day({ dayIndex: 2 })], { limit: 3 });
    expect(tasks).toHaveLength(3);
  });

  it('статистика отражает реальный выпуск', () => {
    const { tasks, stats } = generateTournamentTasks([day()]);
    expect(stats.produced).toBe(tasks.length);
    expect(stats.daysSeen).toBe(1);
    expect(stats.byKind.choice + stats.byKind.translate + stats.byKind.timeattack)
      .toBe(tasks.length);
  });

  it('теги несут план, день и уровень — по ним админка отбирает пул', () => {
    const { tasks } = generateTournamentTasks([day()]);
    for (const task of tasks) {
      expect(task.tags).toContain('plan:mitap');
      expect(task.tags).toContain('day:1');
      expect(task.tags).toContain('cefr:a1');
      expect(task.tags.length).toBeLessThanOrEqual(12); // лимит сервера
    }
  });

  it('длинная кириллическая тема не роняет день: тег режется по байтам', () => {
    // Регрессия: обрезка по символам давала тег 78 байт при лимите 64 —
    // сервер отбраковывал task_tags_invalid и день целиком выпадал из пула.
    const longTopic = day({ topic: { ru: 'Подключиться к созвону и поздороваться с коллегами по работе' } });
    const { tasks } = generateTournamentTasks([longTopic]);

    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      assertServerAccepts(task);
      for (const tag of task.tags) {
        expect(Buffer.byteLength(tag, 'utf8')).toBeLessThanOrEqual(64);
      }
    }
  });

  it('токенизация совпадает с рантаймом: хвостовая пунктуация снята', () => {
    expect(phraseTokens("I'm here!")).toEqual(["I'm", 'here']);
    expect(phraseTokens('How are you?')).toEqual(['How', 'are', 'you']);
    expect(phraseTokens('  spaced   out  ')).toEqual(['spaced', 'out']);
  });
});

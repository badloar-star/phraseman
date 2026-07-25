/**
 * Контракт серверной части раздела «Турниры» в админке.
 *
 * зачем: эти callable пишут в боевой пул и включают режим для живых игроков.
 * Проверяем разбор входа (никакого доверия клиенту), гейт «нельзя включить
 * слоты при пустом пуле» и расчёт готовности раундов — ошибка здесь означает
 * комнаты, которые создаются и тут же отменяются, списывая билеты.
 */

import {
  parseGenerateRequest,
  parseListRequest,
  parseMutateRequest,
  parseScheduleRequest,
  publicAdminTask,
  ROUND_DIFFICULTIES,
  ROUND_TASK_TARGET,
} from './admin_tournament_tasks';
import { TOURNAMENT_SOURCE_PLANS } from './tournament_content_source';
import type { TournamentTask } from './tournament_core';

function expectRejected(run: () => unknown): void {
  expect(run).toThrow();
}

describe('разбор запроса генерации', () => {
  it('без параметров берёт все планы и все форматы', () => {
    const parsed = parseGenerateRequest(undefined);
    expect(parsed.plans).toEqual(TOURNAMENT_SOURCE_PLANS);
    expect(parsed.kinds).toEqual(['choice', 'translate', 'timeattack']);
    expect(parsed.dryRun).toBe(false);
  });

  it('отклоняет неизвестный план и неизвестный формат', () => {
    expectRejected(() => parseGenerateRequest({ plans: ['../../etc/passwd'] }));
    expectRejected(() => parseGenerateRequest({ plans: ['unknown_plan'] }));
    expectRejected(() => parseGenerateRequest({ kinds: ['voice'] })); // голос выключен
    expectRejected(() => parseGenerateRequest({ kinds: ['sql_injection'] }));
  });

  it('отклоняет лишние поля — клиенту не даём протащить произвольное', () => {
    expectRejected(() => parseGenerateRequest({ plans: ['mitap'], evil: true }));
  });

  it('ограничивает limit разумным потолком', () => {
    expectRejected(() => parseGenerateRequest({ limit: 0 }));
    expectRejected(() => parseGenerateRequest({ limit: -5 }));
    expectRejected(() => parseGenerateRequest({ limit: 999_999 }));
    expectRejected(() => parseGenerateRequest({ limit: 1.5 }));
    expect(parseGenerateRequest({ limit: 100 }).limit).toBe(100);
  });

  it('дедуплицирует планы', () => {
    const parsed = parseGenerateRequest({ plans: ['mitap', 'mitap', 'echo'] });
    expect(parsed.plans).toEqual(['mitap', 'echo']);
  });
});

describe('разбор запроса списка', () => {
  it('дефолты разумны и ограничены', () => {
    const parsed = parseListRequest(undefined);
    expect(parsed.limit).toBe(25);
    expect(parsed.status).toBe('');
  });

  it('отклоняет запредельный limit и мусорный курсор', () => {
    expectRejected(() => parseListRequest({ limit: 5_000 }));
    expectRejected(() => parseListRequest({ cursor: 'плохой курсор с пробелами' }));
    expectRejected(() => parseListRequest({ status: 'всё' }));
    expectRejected(() => parseListRequest({ difficulty: 9 }));
  });

  it('принимает валидные фильтры', () => {
    const parsed = parseListRequest({ limit: 50, status: 'draft', difficulty: 2 });
    expect(parsed).toMatchObject({ limit: 50, status: 'draft', difficulty: 2 });
  });
});

describe('разбор запроса публикации', () => {
  it('требует непустой список id и известное действие', () => {
    expectRejected(() => parseMutateRequest({ taskIds: [], action: 'publish' }));
    expectRejected(() => parseMutateRequest({ taskIds: ['a'], action: 'drop_database' }));
    expectRejected(() => parseMutateRequest({ taskIds: ['../escape'], action: 'publish' }));
  });

  it('дедуплицирует id — двойная публикация одного задания не нужна', () => {
    const parsed = parseMutateRequest({ taskIds: ['a', 'a', 'b'], action: 'publish' });
    expect(parsed.taskIds).toEqual(['a', 'b']);
  });
});

describe('разбор расписания', () => {
  it('принимает три слота с таймзоной', () => {
    const parsed = parseScheduleRequest({
      slots: [
        { slotId: 'noon', hour: 12, minute: 0, enabled: false },
        { slotId: 'evening', hour: 19, minute: 0, enabled: true },
      ],
      timezone: 'Europe/Moscow',
    });
    expect(parsed.slots).toHaveLength(2);
    expect(parsed.slots[1].enabled).toBe(true);
    expect(parsed.timezone).toBe('Europe/Moscow');
  });

  it('отклоняет невозможное время и мусорную таймзону', () => {
    expectRejected(() => parseScheduleRequest({ slots: [{ slotId: 'a', hour: 25, minute: 0 }] }));
    expectRejected(() => parseScheduleRequest({ slots: [{ slotId: 'a', hour: 12, minute: 61 }] }));
    expectRejected(() => parseScheduleRequest({
      slots: [{ slotId: 'a', hour: 12, minute: 0 }],
      timezone: 'НеТаймзона',
    }));
  });

  it('отклоняет дубли слотов — иначе комнаты создадутся дважды', () => {
    expectRejected(() => parseScheduleRequest({
      slots: [
        { slotId: 'noon', hour: 12, minute: 0 },
        { slotId: 'noon', hour: 19, minute: 0 },
      ],
    }));
  });

  it('enabled по умолчанию false — слот не включается молча', () => {
    const parsed = parseScheduleRequest({ slots: [{ slotId: 'noon', hour: 12, minute: 0 }] });
    expect(parsed.slots[0].enabled).toBe(false);
  });
});

describe('карточка задания для ревью', () => {
  const task: TournamentTask = {
    taskId: 'choice_mitap_1_p1',
    mode: 'guess_phrase',
    isVoice: false,
    difficulty: 1,
    payload: { phrase: 'I am here', options: ['Я здесь', 'Как дела', 'Спасибо', 'Пока'], correctIndex: 0 },
    tags: ['plan:mitap'],
    verified: false,
  };

  it('показывает правильный ответ — ревьюер обязан видеть, что проверяет', () => {
    const card = publicAdminTask(task.taskId, task);
    expect(card.payload).toEqual(task.payload);
    expect(card.valid).toBe(true);
    expect(card.verified).toBe(false);
  });

  it('помечает битое задание как невалидное, а не скрывает', () => {
    const broken = { ...task, payload: { phrase: 'x', options: ['a'], correctIndex: 0 } };
    expect(publicAdminTask('broken', broken as TournamentTask).valid).toBe(false);
  });
});

describe('готовность раундов', () => {
  it('сложности раундов совпадают с serverside selectRoundTasks', () => {
    // Зеркало tournament_core.selectRoundTasks: раунд 1 → [1], 4 → [2,3].
    expect(ROUND_DIFFICULTIES[1]).toEqual([1]);
    expect(ROUND_DIFFICULTIES[2]).toEqual([1, 2]);
    expect(ROUND_DIFFICULTIES[3]).toEqual([2]);
    expect(ROUND_DIFFICULTIES[4]).toEqual([2, 3]);
  });

  it('порог набора заданий на раунд разумно больше 5 вопросов', () => {
    // 5 вопросов в батче; порог должен давать запас, иначе игроки увидят
    // одни и те же задания в соседних турнирах.
    expect(ROUND_TASK_TARGET).toBeGreaterThanOrEqual(25);
  });
});

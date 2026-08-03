// ════════════════════════════════════════════════════════════════════════════
// tournament_no_star_loss_contract.test.ts — звёзды нельзя потерять.
//
// зачем 2026-08-03 (владелец): «исправить начисление звёзд, оно должно работать
// корректно, сервер не должен перезатирать, и никто не может потерять свои
// звёзды или жемчуг».
//
// Это ДЕНЬГИ игрока: от суммы звёзд считаются места, доли призового банка и
// прогресс сезонного пропуска. Потеря звезды здесь — потеря реальной награды.
//
// Тест закрывает все пути, на которых счёт мог обнулиться или задвоиться:
// повторная отправка, досчёт раунда по дедлайну, замена таймаута поздним
// ответом и симуляция ботов.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

import {
  applyTournamentSubmission,
  completeTournamentRoundAtDeadline,
  type TournamentRoomDoc,
  type TournamentTask,
} from './tournament_core';

const CORE_SOURCE = fs.readFileSync(path.join(__dirname, 'tournament_core.ts'), 'utf8');

function choiceTask(taskId: string, correctIndex: number, difficulty = 1): TournamentTask {
  return {
    taskId,
    mode: 'guess_phrase',
    kind: 'choice',
    difficulty,
    isVoice: false,
    // verified и tags обязательны: validateTournamentTask работает fail-closed
    // и не пускает в игру ни непроверенный контент (task_not_verified), ни
    // задание без корректного массива тегов (task_tags_invalid).
    verified: true,
    tags: [],
    payload: {
      phrase: `phrase ${taskId}`,
      options: ['a', 'b', 'c', 'd'],
      correctIndex,
    },
  } as unknown as TournamentTask;
}

function room(tasks: TournamentTask[]): TournamentRoomDoc {
  return {
    roomId: 'room_test_2026-08-03',
    slotId: 'daily_1200',
    seed: 'seed',
    state: 'round1',
    startsAt: 0,
    stateStartedAtMs: 1_000,
    stateDeadlineAtMs: 100_000,
    version: 1,
    players: [
      { id: 'human', name: 'Игрок', avatar: '', color: '#111111', score: 0, streak: 0 },
      { id: 'bot_001', isBot: true, name: 'Бот', avatar: '', color: '#222222', score: 0, streak: 0, botWinRate: 0.5 },
    ],
    rounds: [
      { roundNo: 1, mode: 'guess_phrase', taskIds: tasks.map((t) => t.taskId), results: {} },
    ],
  } as unknown as TournamentRoomDoc;
}

function submitAll(base: TournamentRoomDoc, tasks: TournamentTask[], idempotencyKeyHash?: string) {
  return applyTournamentSubmission(base, {
    playerId: 'human',
    roundNo: 1,
    answers: tasks.map((task) => ({
      taskId: task.taskId,
      answer: { selectedIndex: (task.payload as { correctIndex: number }).correctIndex },
    })),
    tasks,
    receivedAtMs: 5_000,
    taskReceivedAtMs: Object.fromEntries(tasks.map((t) => [t.taskId, 5_000])),
    maxMsPerTask: 10_000,
    ...(idempotencyKeyHash ? { idempotencyKeyHash } : {}),
  });
}

describe('повторная отправка не задваивает и не обнуляет счёт', () => {
  const tasks = [choiceTask('t1', 0), choiceTask('t2', 1)];

  test('первая отправка начисляет звёзды', () => {
    const applied = submitAll(room(tasks), tasks);
    const human = applied.room.players.find((p) => p.id === 'human')!;
    expect(applied.replay).toBe(false);
    expect(human.score).toBeGreaterThan(0);
  });

  test('повтор той же отправки НЕ добавляет звёзд второй раз', () => {
    const first = submitAll(room(tasks), tasks, 'hash-a');
    const scoreAfterFirst = first.room.players.find((p) => p.id === 'human')!.score;
    const second = submitAll(first.room, tasks, 'hash-a');
    const scoreAfterSecond = second.room.players.find((p) => p.id === 'human')!.score;
    expect(second.replay).toBe(true);
    expect(scoreAfterSecond).toBe(scoreAfterFirst);
  });

  test('повтор не ОБНУЛЯЕТ уже начисленное', () => {
    const first = submitAll(room(tasks), tasks, 'hash-a');
    const second = submitAll(first.room, tasks, 'hash-a');
    expect(second.room.players.find((p) => p.id === 'human')!.score).toBeGreaterThan(0);
  });
});

describe('досчёт раунда по дедлайну не трогает уже начисленное', () => {
  const tasks = [choiceTask('t1', 0), choiceTask('t2', 1)];

  test('счёт ответившего игрока переживает финализацию раунда', () => {
    const submitted = submitAll(room(tasks), tasks);
    const before = submitted.room.players.find((p) => p.id === 'human')!.score;
    expect(before).toBeGreaterThan(0);

    const finalized = completeTournamentRoundAtDeadline(
      { ...submitted.room, stateDeadlineAtMs: 1 },
      tasks,
      200_000,
    );
    const after = finalized.room.players.find((p) => p.id === 'human')!.score;
    expect(after).toBe(before);
  });

  test('игрок с готовым результатом пропускается, а не переписывается нулём', () => {
    // Корневая защита: без неё финализация штамповала бы timed_out поверх
    // честного ответа и обнуляла раунд.
    expect(CORE_SOURCE).toContain('if (rounds[roundIndex].results[player.id]) continue;');
  });

  test('бот получает звёзды и не отнимает их у людей', () => {
    const submitted = submitAll(room(tasks), tasks);
    const humanBefore = submitted.room.players.find((p) => p.id === 'human')!.score;
    const finalized = completeTournamentRoundAtDeadline(
      { ...submitted.room, stateDeadlineAtMs: 1 },
      tasks,
      200_000,
    );
    expect(finalized.room.players.find((p) => p.id === 'human')!.score).toBe(humanBefore);
    expect(finalized.room.players.find((p) => p.id === 'bot_001')!.score).toBeGreaterThanOrEqual(0);
  });
});

describe('счёт наращивается, а не перезаписывается', () => {
  test('запись счёта идёт от предыдущего значения', () => {
    // score: entry.score + ... — если кто-то заменит на присваивание, накопленное
    // за прошлые раунды пропадёт.
    expect(CORE_SOURCE).toMatch(/score: entry\.score/);
    expect(CORE_SOURCE).toMatch(/score: player\.score \+ scored\.roundScore/);
  });

  test('замена таймаута поздним ответом вычитает старый вклад ровно один раз', () => {
    // Иначе счёт либо задвоится, либо уйдёт в минус.
    expect(CORE_SOURCE).toContain('entry.score - (replacingTimedOut ? existing.roundScore : 0) + scored.roundScore');
  });

  test('пересчёт чужих результатов задним числом УДАЛЁН', () => {
    // Блок reconcile существовал ради рангов и после отмены гонки стал вредным:
    // пересчитывал звёзды без difficulty и без пар, затирая верные значения.
    expect(CORE_SOURCE).not.toContain('reconciledScore');
  });

  test('счёт никогда не уходит ниже нуля', () => {
    const tasks = [choiceTask('t1', 0)];
    const wrong = applyTournamentSubmission(room(tasks), {
      playerId: 'human',
      roundNo: 1,
      answers: [{ taskId: 't1', answer: { selectedIndex: 3 } }],
      tasks,
      receivedAtMs: 5_000,
      taskReceivedAtMs: { t1: 5_000 },
      maxMsPerTask: 10_000,
    });
    expect(wrong.room.players.find((p) => p.id === 'human')!.score).toBeGreaterThanOrEqual(0);
  });
});

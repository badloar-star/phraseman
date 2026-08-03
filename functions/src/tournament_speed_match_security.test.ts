import {
  answerFingerprint,
  applySpeedMatchAttempt,
  applyTournamentSubmission,
  toPublicTournamentTask,
  validateTournamentTask,
  validateTournamentTaskForNewRoom,
  type TournamentRoomDoc,
  type TournamentTask,
} from './tournament_core';

const speedTask = (count = 6): TournamentTask => {
  const pairs = [
    ['ticket', 'билет'],
    ['hotel', 'отель'],
    ['coffee', 'кофе'],
    ['train', 'поезд'],
    ['airport', 'аэропорт'],
    ['passport', 'паспорт'],
  ].slice(0, count);
  const options = pairs.map(([, russian]) => russian);
  return {
    taskId: 'speed-secure', mode: 'speed_match', isVoice: false, difficulty: 1,
    payload: {
      prompt: 'Match the pairs', rightOptions: options,
      items: pairs.map(([english], index) => ({
        prompt: english,
        options,
        correctIndex: index,
        explanation: {
          ruleNote: `${english} has one exact match.`,
          example: `${english} — ${options[index]}.`,
          wrongOptionReasons: options.map((_, optionIndex) => (
            optionIndex === index ? '' : 'This is another pair.'
          )),
        },
      })),
    },
    explanation: {
      ruleNote: 'Match every left item to its exact right item.',
      example: 'ticket — билет.',
      wrongOptionReasons: [],
    },
    tags: [], verified: true,
  };
};

const room = (): TournamentRoomDoc => ({
  roomId: 'room-secure', slotId: 'slot', seed: 'seed', state: 'round1', startsAt: 1_000,
  createdAtMs: 900,
  stateStartedAtMs: 1_000, stateDeadlineAtMs: 20_000, version: 0,
  players: [{ id: 'human-1', isBot: false, name: 'Human', avatar: '🙂', color: '#fff', score: 0, streak: 0 }],
  rounds: [{ roundNo: 1, mode: 'speed_match', taskIds: ['speed-secure'], results: {} }],
});

describe('speed-match security contract', () => {
  it('publishes room-scoped feedback fingerprints without exposing correctIndex', () => {
    const publicTask = toPublicTournamentTask(speedTask(), 'room-secure');
    expect(publicTask?.answerFingerprints).toEqual([
      answerFingerprint('room-secure', 'speed-secure', 0),
      answerFingerprint('room-secure', 'speed-secure', 1),
      answerFingerprint('room-secure', 'speed-secure', 2),
      answerFingerprint('room-secure', 'speed-secure', 3),
      answerFingerprint('room-secure', 'speed-secure', 4),
      answerFingerprint('room-secure', 'speed-secure', 5),
    ]);
    expect(JSON.stringify(publicTask)).not.toContain('correctIndex');
  });

  // зачем 2026-08-03 (владелец: «убрать штраф»): раньше тест назывался
  // «subtracts one star per unique wrong attempt» и требовал 3⭐/2⭐/1⭐/0⭐ по
  // числу промахов. Правило отменено: награда за пары — это «сколько правильно,
  // столько звёзд», а промах уже наказан тем, что пара не засчитана. Двойное
  // наказание вдобавок усиливало прод-баг с откатом поля: игрок повторно тапал
  // откатившиеся пары, и его же за это штрафовали.
  //
  // Журналирование промахов ОСТАЁТСЯ — оно защищает от перебора вариантов и
  // нужно разбору; проверяем, что счётчик честен и идемпотентен.
  it('journals unique wrong attempts without taking stars away', () => {
    const task = speedTask();
    const wrong = applySpeedMatchAttempt(task, undefined, 0, 1);
    expect(wrong).toMatchObject({ correct: false, progress: { wrongAttempts: 1 } });
    const replay = applySpeedMatchAttempt(task, wrong.progress, 0, 1);
    expect(replay.progress.wrongAttempts).toBe(1);
    // Промахи делаем по паре 5 индексами, которые ей не подходят, а собираем
    // ВСЕ шесть пар. Награда обязана быть одинаковой при любом числе промахов.
    const scoreWithWrongAttempts = (wrongAttempts: number): number => {
      let progress = applySpeedMatchAttempt(task, undefined, 5, 0).progress;
      for (let selectedIndex = 1; selectedIndex < wrongAttempts; selectedIndex += 1) {
        progress = applySpeedMatchAttempt(task, progress, 5, selectedIndex).progress;
      }
      for (let pairIndex = 0; pairIndex < 6; pairIndex += 1) {
        progress = applySpeedMatchAttempt(task, progress, pairIndex, pairIndex).progress;
      }
      expect(progress.wrongAttempts).toBe(wrongAttempts);
      expect(progress.matchedIndexes).toEqual([0, 1, 2, 3, 4, 5]);
      const applied = applyTournamentSubmission(room(), {
        playerId: 'human-1', roundNo: 1, receivedAtMs: 1_100,
        answers: [{ taskId: task.taskId, answer: { selectedIndexes: [0, 1, 2, 3, 4, 5] } }],
        tasks: [task], speedMatchProgress: { [task.taskId]: progress },
      });
      expect(applied.result).toMatchObject({ correct: 1 });
      return applied.result.roundScore;
    };

    const clean = scoreWithWrongAttempts(1);
    for (const wrongAttempts of [2, 3, 4] as const) {
      expect(scoreWithWrongAttempts(wrongAttempts)).toBe(clean);
    }
  });

  // зачем 2026-08-03 (владелец: «после ответа не считает правильно звёзды,
  // показывает максимум 4»): неполное поле обязано оплачиваться по числу
  // собранных пар, а не обнуляться. Именно этот путь чинит автоотправка по
  // таймауту на экране раунда — без неё частичный результат вообще не доезжал
  // до сервера.
  it('частично собранное поле оплачивается по числу пар', () => {
    const task = speedTask();
    for (const matched of [1, 2, 3, 4, 5] as const) {
      // Первая пара создаёт журнал, остальные его дополняют — прогресс здесь
      // всегда определён, поэтому тип сужается без `undefined`.
      let progress = applySpeedMatchAttempt(task, undefined, 0, 0).progress;
      for (let pairIndex = 1; pairIndex < matched; pairIndex += 1) {
        progress = applySpeedMatchAttempt(task, progress, pairIndex, pairIndex).progress;
      }
      const selectedIndexes = Array.from({ length: 6 }, (_, pairIndex) => (
        pairIndex < matched ? pairIndex : -1
      ));
      const applied = applyTournamentSubmission(room(), {
        playerId: 'human-1', roundNo: 1, receivedAtMs: 1_100,
        answers: [{ taskId: task.taskId, answer: { selectedIndexes } }],
        tasks: [task], speedMatchProgress: { [task.taskId]: progress },
      });
      expect(applied.result.roundScore).toBe(matched);
    }
  });

  // зачем 2026-08-03 (прод-инцидент «пары восстановились и не засчитались»):
  // applySpeedMatchAttempt проверял доску СТРОГИМ контрактом отбора в новые
  // комнаты. После ужесточения контракта (плитка ≤3 слов) каждый тап по уже
  // собранной доске старого формата кидал speed_match_attempt_invalid — клиент
  // откатывал все пары, задание уходило в timed_out с нулём. В момент игры
  // доска обязана проверяться мягким validateTournamentTask: уже идущая
  // комната должна доиграться при ЛЮБОМ будущем ужесточении отбора.
  it('доска, собранная под старый контракт, продолжает принимать тапы', () => {
    const legacyBoard = speedTask();
    legacyBoard.payload.items = (legacyBoard.payload.items as Array<Record<string, unknown>>)
      .map((item, index) => ({
        ...item,
        // Плитки-фразы из комнат до 2026-08-02: больше трёх слов.
        prompt: `I need something for a sore throat ${index}`,
      }));
    expect(validateTournamentTask(legacyBoard).ok).toBe(true);
    expect(validateTournamentTaskForNewRoom(legacyBoard).ok).toBe(false);

    const first = applySpeedMatchAttempt(legacyBoard, undefined, 0, 0);
    expect(first).toMatchObject({ correct: true, completed: false });
    let progress = first.progress;
    for (let pairIndex = 1; pairIndex < 6; pairIndex += 1) {
      progress = applySpeedMatchAttempt(legacyBoard, progress, pairIndex, pairIndex).progress;
    }
    expect(progress.matchedIndexes).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('requires exactly six speed-match pairs and rejects retired audio modes in new rooms', () => {
    expect(validateTournamentTaskForNewRoom(speedTask())).toEqual({ ok: true, kind: 'match' });
    expect(validateTournamentTaskForNewRoom(speedTask(5))).toEqual({
      ok: false, reason: 'speed_match_field_contract_invalid',
    });
    const sound: TournamentTask = {
      taskId: 'sound-1', mode: 'sound_contrast', isVoice: false, difficulty: 1,
      payload: {
        audioUri: 'https://example.com/ship.mp3', phrase: 'ship',
        options: ['ship', 'sheep', 'shape'], correctIndex: 0, contrast: '/ɪ/ vs /iː/',
      },
      tags: [], verified: true,
    };
    expect(validateTournamentTask(sound)).toEqual({ ok: true, kind: 'listen' });
    expect(validateTournamentTaskForNewRoom(sound)).toEqual({
      ok: false, reason: 'task_mode_retired',
    });
  });
});

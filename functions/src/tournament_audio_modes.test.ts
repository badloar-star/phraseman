/**
 * Контракт аудио-режимов турнира (владелец отобрал 2026-07-27: «Выбор на слух»,
 * «Пары звуков», «Диктант»).
 *
 * зачем эти тесты: у аудио-задания ответ — это САМ УСЛЫШАННЫЙ ТЕКСТ. Если он
 * протечёт в публичную версию задания, турнир сломан: клиент увидит фразу в
 * данных и слушать будет незачем. Проверяем именно утечку, а не happy-path.
 */
import {
  toPublicTournamentTask,
  validateTournamentTask,
  verifyTournamentAnswer,
  type TournamentTask,
} from './tournament_core';

const listenTask: TournamentTask = {
  taskId: 'ai_listen_1',
  mode: 'listen_choose',
  isVoice: false,
  difficulty: 1,
  payload: {
    audioUri: 'https://firebasestorage.googleapis.com/v0/b/x/o/tournament-audio%2Fa.mp3?alt=media',
    phrase: 'Nice to meet you',
    options: ['Nice to meet you', 'My name is Anna', 'See you later'],
    correctIndex: 0,
  },
  tags: ['source:ai'],
  verified: true,
};

const contrastTask: TournamentTask = {
  ...listenTask,
  taskId: 'ai_contrast_1',
  mode: 'sound_contrast',
  payload: {
    audioUri: 'https://firebasestorage.googleapis.com/v0/b/x/o/tournament-audio%2Fb.mp3?alt=media',
    phrase: 'sheep',
    options: ['ship', 'sheep'],
    correctIndex: 1,
  },
};

const dictateTask: TournamentTask = {
  taskId: 'ai_dictate_1',
  mode: 'listen_build',
  isVoice: false,
  difficulty: 2,
  payload: {
    audioUri: 'https://firebasestorage.googleapis.com/v0/b/x/o/tournament-audio%2Fc.mp3?alt=media',
    phrase: 'My name is Anna',
    wordBank: ['My', 'name', 'is', 'Anna', 'names', 'am'],
    correctTokens: ['My', 'name', 'is', 'Anna'],
  },
  tags: ['source:ai'],
  verified: true,
};

describe('аудио-режимы турнира', () => {
  it('распознаются как отдельные kind, а не как голосовые', () => {
    // voice = игрок ГОВОРИТ (скоринг отключён навсегда). Спутать нельзя:
    // аудио-задание перестало бы оцениваться вообще.
    expect(validateTournamentTask(listenTask)).toEqual({ ok: true, kind: 'listen' });
    expect(validateTournamentTask(contrastTask)).toEqual({ ok: true, kind: 'listen' });
    expect(validateTournamentTask(dictateTask)).toEqual({ ok: true, kind: 'dictate' });
  });

  it('УСЛЫШАННЫЙ ТЕКСТ не попадает клиенту — иначе слушать незачем', () => {
    for (const task of [listenTask, contrastTask, dictateTask]) {
      const publicTask = toPublicTournamentTask(task);
      expect(publicTask).not.toBeNull();
      if (!publicTask) continue;
      // Поле phrase вырезано. В «Выборе на слух» правильный текст всё равно
      // виден среди options — так и задумано (это варианты ответа), но игрок
      // не знает, КОТОРЫЙ из них прозвучал: correctIndex скрыт.
      expect(publicTask.payload.phrase).toBeUndefined();
      expect(publicTask.payload.correctIndex).toBeUndefined();
      expect(publicTask.payload.correctTokens).toBeUndefined();
      // Озвучка при этом обязана дойти — без неё задание неиграбельно.
      expect(publicTask.payload.audioUri).toBe(task.payload.audioUri);
    }
  });

  it('варианты ответа клиенту приходят (их надо показать)', () => {
    expect(toPublicTournamentTask(listenTask)?.payload.options)
      .toEqual(['Nice to meet you', 'My name is Anna', 'See you later']);
    expect(toPublicTournamentTask(dictateTask)?.payload.wordBank)
      .toEqual(['My', 'name', 'is', 'Anna', 'names', 'am']);
  });

  it('ответ проверяется: выбор индекса и сборка из чипов', () => {
    expect(verifyTournamentAnswer(listenTask, { selectedIndex: 0 })).toBe(true);
    expect(verifyTournamentAnswer(listenTask, { selectedIndex: 1 })).toBe(false);
    expect(verifyTournamentAnswer(contrastTask, { selectedIndex: 1 })).toBe(true);
    expect(verifyTournamentAnswer(dictateTask, { tokens: ['My', 'name', 'is', 'Anna'] })).toBe(true);
    expect(verifyTournamentAnswer(dictateTask, { tokens: ['My', 'names', 'is', 'Anna'] })).toBe(false);
    // Порядок важен: диктант проверяет последовательность, а не набор слов.
    expect(verifyTournamentAnswer(dictateTask, { tokens: ['Anna', 'is', 'name', 'My'] })).toBe(false);
  });

  it('задание без озвучки не проходит контракт', () => {
    const noAudio = { ...listenTask, payload: { ...listenTask.payload, audioUri: '' } };
    expect(validateTournamentTask(noAudio as TournamentTask).ok).toBe(false);
  });

  it('лишние поля в payload отклоняются (fail-closed)', () => {
    const extra = {
      ...listenTask,
      payload: { ...listenTask.payload, hint: 'подсказка' },
    };
    expect(validateTournamentTask(extra as TournamentTask)).toEqual({
      ok: false, reason: 'task_payload_fields_invalid',
    });
  });

  it('диктант не отдаёт услышанный текст ни в каком виде', () => {
    // Здесь утечка была бы фатальной: в диктанте нет вариантов-подсказок,
    // текст фразы — единственный ответ, и его нельзя увидеть в данных.
    const publicTask = toPublicTournamentTask(dictateTask);
    expect(JSON.stringify(publicTask)).not.toContain('My name is Anna');
  });

  it('«Пары звуков» допускают ровно два варианта', () => {
    expect(validateTournamentTask(contrastTask).ok).toBe(true);
    const single = {
      ...contrastTask,
      payload: { ...contrastTask.payload, options: ['ship'], correctIndex: 0 },
    };
    expect(validateTournamentTask(single as TournamentTask).ok).toBe(false);
  });

  it('неверифицированное задание не играется, даже с полной озвучкой', () => {
    expect(validateTournamentTask({ ...listenTask, verified: false })).toEqual({
      ok: false, reason: 'task_not_verified',
    });
  });
});

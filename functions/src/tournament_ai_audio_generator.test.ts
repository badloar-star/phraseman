/**
 * Контракт генератора аудио-заданий.
 *
 * зачем эти тесты: в аудио-режиме брак не виден глазами. Текстовый вопрос с
 * плохим дистрактором заметен при беглом просмотре карточки; задание, где
 * варианты не похожи НА СЛУХ, выглядит идеально и превращается в лотерею
 * только у игрока в наушниках. Поэтому смысловые проверки — здесь.
 */
import {
  AUDIO_MIN_ACCEPTED,
  audioTaskFrom,
  audioTaskId,
  audioTasksFrom,
  buildAudioPromptPacket,
  dictationTokens,
  isTournamentAudioMode,
  validateAudioBatch,
} from './tournament_ai_audio_generator';

const listenItem = {
  phrase: 'I can hear you',
  options: ['I can hear you', "I can't hear you", 'I could hear you'],
  correctIndex: 0,
  difficulty: 'medium',
  confusionNote: 'can/can\'t на слух',
};

const contrastItem = {
  phrase: 'sheep',
  wordA: 'ship',
  wordB: 'sheep',
  correctIndex: 1,
  difficulty: 'easy',
  contrast: '/ɪ/ vs /iː/',
};

const dictationItem = {
  phrase: 'My name is Anna',
  extraWords: ['names', 'am'],
  difficulty: 'easy',
  confusionNote: 'name/names',
};

const batch = (items: unknown[]) => ({ items });

/** Батч уникальных элементов: варьируем фразу, СОХРАНЯЯ связь с ответом. */
const repeatListen = (item: Record<string, unknown>, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const phrase = `${item.phrase} ${i}`;
    const options = (item.options as string[]).map((option, index) =>
      (index === Number(item.correctIndex) ? phrase : `${option} ${i}`));
    return { ...item, phrase, options };
  });

const repeatContrast = (item: Record<string, unknown>, count: number) =>
  Array.from({ length: count }, (_, i) => ({ ...item, contrast: `${item.contrast} ${i}` }));

const repeatDictation = (item: Record<string, unknown>, count: number) =>
  Array.from({ length: count }, (_, i) => ({ ...item, phrase: `${item.phrase} number${i}` }));

describe('генератор аудио-заданий', () => {
  it('знает свои режимы и не берёт чужие', () => {
    for (const mode of ['listen_choose', 'sound_contrast', 'listen_build']) {
      expect(isTournamentAudioMode(mode)).toBe(true);
    }
    for (const mode of ['guess_phrase', 'speed_match', 'shadowing', '']) {
      expect(isTournamentAudioMode(mode)).toBe(false);
    }
  });

  it('промпт требует похожести НА СЛУХ, а не на вид', () => {
    const packet = buildAudioPromptPacket({ mode: 'listen_choose', level: 'A2' });
    // Ключевое требование: без аудио задание не должно решаться.
    expect(packet.task).toContain('WITHOUT audio must not be able to tell');
    expect(packet.task).toContain('VOWEL_LENGTH');
    expect(packet.task).toContain('REDUCTION');
    // Таймер: длинную фразу не разобрать за один проход.
    expect(packet.system).toContain('ONCE under a timer');
  });

  it('промпт минимальных пар требует ровно один различающийся звук', () => {
    const packet = buildAudioPromptPacket({ mode: 'sound_contrast', level: 'A1' });
    expect(packet.task).toContain('differ in exactly ONE phoneme');
    expect(packet.task).toContain('Never pair words that differ in more than one sound');
  });

  it('ОТВЕТ обязан совпадать с тем, что прозвучит', () => {
    // Иначе игрок слышит одну фразу, а «правильным» считается другая —
    // задание нерешаемо в принципе.
    const broken = repeatListen(listenItem, 10).map((item) => ({ ...item, correctIndex: 1 }));
    const result = validateAudioBatch('listen_choose', batch(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('does not match the spoken phrase');
    }
  });

  it('минимальная пара из непохожих слов отклоняется', () => {
    // ship/sheep — задание. ship/table — подбрасывание монеты.
    const broken = { ...contrastItem, wordA: 'ship', wordB: 'telephone', phrase: 'telephone' };
    // Одна и та же пара повторяется — дубли отсеются, но ПЕРВЫЙ элемент
    // обязан упасть именно на проверке минимальной пары.
    const result = validateAudioBatch('sound_contrast', batch(repeatContrast(broken, 10)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('too different to be a minimal pair');
    }
  });

  it('дистрактор диктанта не может быть словом из фразы', () => {
    // Иначе лишний чип оказывается валидным словом и сборка ломается.
    const broken = { ...dictationItem, extraWords: ['name', 'am'] };
    const result = validateAudioBatch('listen_build', batch(repeatDictation(broken, 10)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('decoy word appears in the phrase');
    }
  });

  it('дубли фраз внутри батча не проходят', () => {
    const duplicated = Array.from({ length: 10 }, () => ({ ...listenItem }));
    const result = validateAudioBatch('listen_choose', batch(duplicated));
    expect(result.ok).toBe(false);
  });

  it('годный батч принимается целиком', () => {
    const result = validateAudioBatch('listen_choose', batch(repeatListen(listenItem, 10)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items.length).toBeGreaterThanOrEqual(AUDIO_MIN_ACCEPTED);
  });

  it('диктант: чипы — слова фразы плюс дистракторы, без пунктуации', () => {
    expect(dictationTokens('My name is Anna.')).toEqual(['My', 'name', 'is', 'Anna']);
    const task = audioTaskFrom('listen_build', dictationItem, 'A1');
    expect(task.payload.correctTokens).toEqual(['My', 'name', 'is', 'Anna']);
    expect(task.payload.wordBank).toEqual(['My', 'name', 'is', 'Anna', 'names', 'am']);
  });

  it('черновик создаётся БЕЗ озвучки — платим только за одобренное', () => {
    const task = audioTaskFrom('listen_choose', listenItem, 'A2');
    expect(task.payload.audioUri).toBe('');
    expect(task.verified).toBe(false);
    // Но форма уже проверена: ошибки ловятся до трат на TTS.
    expect(audioTasksFrom('listen_choose', [listenItem], 'A2')).not.toBeNull();
  });

  it('id стабилен: одна фраза — одно задание при перегенерации', () => {
    expect(audioTaskId('listen_choose', 'Nice to meet you'))
      .toBe(audioTaskId('listen_choose', '  nice to meet you '));
    // Разные режимы на одной фразе — разные задания.
    expect(audioTaskId('listen_choose', 'Nice to meet you'))
      .not.toBe(audioTaskId('listen_build', 'Nice to meet you'));
  });

  it('«Пары звуков» дают ровно два варианта в задании', () => {
    const task = audioTaskFrom('sound_contrast', contrastItem, 'A1');
    expect(task.payload.options).toEqual(['ship', 'sheep']);
    expect(task.payload.correctIndex).toBe(1);
    expect(task.payload.phrase).toBe('sheep');
  });
});

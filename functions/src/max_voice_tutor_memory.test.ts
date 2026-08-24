// Память учителя между уроками + выжимка устава (вариант A, владелец 2026-08-16).

import {
  TUTOR_PHRASE_INTERVAL_DAYS,
  TUTOR_PHRASE_QUEUE_MAX,
  applyPhraseResults,
  duePhrases,
  tutorLessonTypeFor,
  selectTutorLessonType,
  TUTOR_APP_DIGEST_FALLBACK,
  TUTOR_MEMORY_EMPTY,
  TUTOR_MEMORY_ERRORS_MAX,
  TUTOR_MEMORY_FACTS_MAX,
  TUTOR_MEMORY_RECENT_SESSIONS_MAX,
  applyGoalProgress,
  applyTutorMemoryUpdate,
  acceptMemoryCandidate,
  mergeTutorMemory,
  parseTutorMemory,
  renderTutorCharterDigest,
  renderTutorMemoryBlock,
  voiceTutorMemoryDocId,
} from './max_voice_tutor_memory';
import { parseProductCharter } from './jarvis/product_charter';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

describe('voiceTutorMemoryDocId', () => {
  it('хэш-id по паттерну квоты, стабилен для пары uid', () => {
    expect(voiceTutorMemoryDocId('a', 's')).toBe(voiceTutorMemoryDocId('a', 's'));
    expect(voiceTutorMemoryDocId('a', 's')).toMatch(/^vtm_[0-9a-f]{48}$/);
    expect(voiceTutorMemoryDocId('a', 's')).not.toBe(voiceTutorMemoryDocId('b', 's'));
  });
});

describe('parseTutorMemory', () => {
  it('мусор → пустая память, никогда не бросает', () => {
    expect(parseTutorMemory(undefined)).toEqual(TUTOR_MEMORY_EMPTY);
    expect(parseTutorMemory({ facts: 'x', callCount: 'abc', homework: [1, null] })).toEqual(TUTOR_MEMORY_EMPTY);
  });

  it('режет по потолкам, схлопывает дубли без учёта регистра, чистит control-символы', () => {
    const many = Array.from({ length: 30 }, (_, i) => `fact ${i}`);
    const m = parseTutorMemory({ facts: [...many, 'FACT 1', 'fact\u0000 3'], recurringErrors: ['a', 'A', 'b'], callCount: 3.7 });
    expect(m.facts).toHaveLength(TUTOR_MEMORY_FACTS_MAX);
    expect(m.recurringErrors).toEqual(['a', 'b']);
    expect(m.callCount).toBe(3);
  });

  it('migrates V1 facts and recurring errors without losing learning state', () => {
    const queue = [{ text: 'I went there', box: 1, dueAtMs: NOW }];
    const memory = parseTutorMemory({
      stableUid: 'stable-1',
      facts: ['Likes hiking'],
      recurringErrors: ['past tense'],
      phraseQueue: queue,
    });

    expect(memory.schemaVersion).toBe(2);
    expect(memory.stableUid).toBe('stable-1');
    expect(memory.conversationHooks).toContainEqual(expect.objectContaining({ text: 'Likes hiking' }));
    expect(memory.activeIssues).toContainEqual(expect.objectContaining({ label: 'past tense' }));
    expect(memory.phraseQueue).toEqual(queue);
  });

  it.each([
    'my password is qwerty',
    'card 4111 1111 1111 1111',
    'email me at learner@example.com',
    'my phone is +1 (415) 555-2671',
    'мой телефон 8 999 123-45-67',
    'I live at 12 Main Street',
    'diagnosed with depression',
    'my sister is being sued for fraud',
    'I am a Catholic and vote Labour',
  ])('rejects sensitive memory candidate: %s', (candidate) => {
    expect(acceptMemoryCandidate(candidate, {
      evidenceSessionId: 'session-1',
      directlyStatedByLearner: true,
    })).toBe(false);
  });

  it.each(['I enjoy hiking', 'I work in healthcare', 'I want English for travel'])(
    'keeps a harmless learner-backed memory candidate: %s',
    (candidate) => {
      expect(acceptMemoryCandidate(candidate, {
        evidenceSessionId: 'session-1',
        directlyStatedByLearner: true,
      })).toBe(true);
    },
  );

  it('requires lexical learner evidence when the candidate is model-extracted rather than directly marked', () => {
    expect(acceptMemoryCandidate('I enjoy hiking', {
      evidenceSessionId: 'session-1',
      learnerText: 'On weekends I enjoy hiking with friends.',
    })).toBe(true);
    expect(acceptMemoryCandidate('Owns a yacht', {
      evidenceSessionId: 'session-1',
      learnerText: 'Yesterday I went to the park.',
    })).toBe(false);
  });
});

describe('mergeTutorMemory', () => {
  it('moves an issue to resolved only with repeated pass evidence', () => {
    const previous = parseTutorMemory({ recurringErrors: ['past tense'] });
    const once = mergeTutorMemory(previous, {
      sessionId: 'session-1',
      resolvedErrors: ['past tense'],
      nowMs: NOW,
    }, { passCount: 1 });
    expect(once.activeIssues).toContainEqual(expect.objectContaining({ label: 'past tense' }));
    expect(once.resolvedIssues).toEqual([]);

    const twice = mergeTutorMemory(once, {
      sessionId: 'session-2',
      resolvedErrors: ['past tense'],
      nowMs: NOW + 1,
    }, { passCount: 2 });
    expect(twice.activeIssues).toEqual([]);
    expect(twice.resolvedIssues[0]).toEqual(expect.objectContaining({ label: 'past tense' }));
  });
  it('сервер отклоняет домашку без pass evidence целиком и сохраняет прежнее задание', () => {
    const prev = parseTutorMemory({ homework: ['Previous phrase'] });
    const next = mergeTutorMemory(prev, {
      homework: ['Passed phrase', 'Unpractised phrase'],
      phraseResults: [{ text: 'Passed phrase', result: 'pass' }],
      enforceHomeworkEvidence: true,
      nowMs: NOW,
    });
    expect(next.homework).toEqual(['Previous phrase']);
    expect(next.phraseQueue.some((item) => item.text === 'Unpractised phrase')).toBe(false);
  });

  it('strict persistence propagates a transaction failure instead of returning a false acknowledgement', async () => {
    const db = {
      collection: () => ({ doc: () => ({}) }),
      runTransaction: jest.fn().mockRejectedValue(new Error('firestore unavailable')),
    };
    await expect(applyTutorMemoryUpdate(
      db as any,
      'auth-1',
      'stable-1',
      { nowMs: NOW },
      { strict: true },
    )).rejects.toThrow('firestore unavailable');
  });
  it('mastery 3 принимает только релевантную сцену переноса или явный новый контекст', () => {
    const atTwo = { a1_greet: 2 };
    expect(applyGoalProgress(atTwo, {
      goalId: 'a1_greet', mastery: 3, evidence: 'scene', sceneId: 'coffee',
    }, 'done', 'a1_greet')).toEqual(atTwo);
    expect(applyGoalProgress(atTwo, {
      goalId: 'a1_greet', mastery: 3, evidence: 'scene', sceneId: 'first_meeting',
    }, 'done', 'a1_greet')).toEqual({ a1_greet: 3 });

    const inventedAtTwo = { a1_family: 2 };
    expect(applyGoalProgress(inventedAtTwo, {
      goalId: 'a1_family', mastery: 3, evidence: 'novel_context',
    }, '', 'a1_family')).toEqual({ a1_family: 3 });
  });
  it('свежие факты и ошибки — впереди, решённые ошибки уходят, домашка заменяется, счётчик растёт', () => {
    const prev = parseTutorMemory({
      facts: ['lives in Kyiv', 'has a dog'],
      recurringErrors: ['forgets -s in he goes', 'says I go yesterday'],
      homework: ['old phrase'],
      nextTopic: 'weekend',
      callCount: 2,
      lastCallAtMs: NOW - DAY,
      lastCefr: 'A1',
    });
    const next = mergeTutorMemory(prev, {
      sessionId: 'session-fresh',
      facts: ['works as a nurse', 'has a dog'],
      recurringErrors: ['mixes in/on'],
      resolvedErrors: ['forgets -s in he goes'],
      homework: ['I would like a coffee', 'How much is it?'],
      nextTopic: 'ordering food',
      cefr: 'A2',
      nowMs: NOW,
    }, { passCount: 2 });
    expect(next.facts).toEqual(['works as a nurse', 'has a dog', 'lives in Kyiv']);
    expect(next.recurringErrors).toEqual(['mixes in/on', 'says I go yesterday']);
    expect(next.homework).toEqual(['I would like a coffee', 'How much is it?']);
    expect(next.nextTopic).toBe('ordering food');
    expect(next.callCount).toBe(3);
    expect(next.lastCallAtMs).toBe(NOW);
    expect(next.lastCefr).toBe('A2');
  });

  it('без новой домашки прошлая не тянется (она либо сдана, либо устарела); уровень сохраняется', () => {
    const prev = parseTutorMemory({ homework: ['x'], lastCefr: 'B1', callCount: 1 });
    const next = mergeTutorMemory(prev, { nowMs: NOW });
    expect(next.homework).toEqual([]);
    expect(next.lastCefr).toBe('B1');
    expect(next.recurringErrors.length).toBeLessThanOrEqual(TUTOR_MEMORY_ERRORS_MAX);
  });

  it('повтор одного sessionId не засчитывает урок, сцену и mastery второй раз, но принимает поздний разбор', () => {
    const first = mergeTutorMemory(parseTutorMemory({ lastCefr: 'A1' }), {
      sessionId: 'session-1',
      homework: ['How are you?'],
      sceneOutcome: 'done',
      goalProgress: { goalId: 'a1_greet', mastery: 3 },
      nowMs: NOW,
    } as any);

    const retried = mergeTutorMemory(first, {
      sessionId: 'session-1',
      facts: ['likes hiking'],
      recurringErrors: ['drops the verb be'],
      homework: ['How are you?'],
      sceneOutcome: 'done',
      goalProgress: { goalId: 'a1_greet', mastery: 3 },
      nowMs: NOW + 1,
    } as any);

    expect(retried.callCount).toBe(1);
    expect(retried.scenesDone).toBe(1);
    expect(retried.scenesTotal).toBe(1);
    expect(retried.goalMastery.a1_greet).toBe(1);
    expect(retried.homework).toEqual(['How are you?']);
    expect(retried.facts).toContain('likes hiking');
    expect(retried.recurringErrors).toContain('drops the verb be');
  });

  it('sessionId очищается стабильно, а журнал последних сессий остаётся ограниченным', () => {
    let memory = parseTutorMemory({});
    for (let i = 0; i < TUTOR_MEMORY_RECENT_SESSIONS_MAX + 5; i += 1) {
      memory = mergeTutorMemory(memory, { sessionId: `  session\u0000-${i}  `, nowMs: NOW + i });
    }

    expect(memory.recentSessionIds).toHaveLength(TUTOR_MEMORY_RECENT_SESSIONS_MAX);
    expect(memory.recentSessionIds[0]).toBe(`session-${TUTOR_MEMORY_RECENT_SESSIONS_MAX + 4}`);
    expect(memory.recentSessionIds).not.toContain('session-0');

    const retry = mergeTutorMemory(memory, {
      sessionId: `session-${TUTOR_MEMORY_RECENT_SESSIONS_MAX + 4}`,
      facts: ['late fact'],
      nowMs: NOW + 100,
    });
    expect(retry.callCount).toBe(memory.callCount);
    expect(retry.facts).toContain('late fact');
  });

  it('без sessionId сохраняет прежнюю семантику: каждый merge считается отдельным уроком', () => {
    const first = mergeTutorMemory(parseTutorMemory({}), { nowMs: NOW });
    const second = mergeTutorMemory(first, { nowMs: NOW + 1 });
    expect(second.callCount).toBe(2);
    expect(second.recentSessionIds).toEqual([]);
  });

  it('reviewOnly добавляет поздние факты без второго урока для старого клиента без sessionId', () => {
    const evidence = mergeTutorMemory(parseTutorMemory({}), { homework: ['Hello'], nowMs: NOW });
    const reviewed = mergeTutorMemory(evidence, {
      reviewOnly: true,
      facts: ['likes hiking'],
      recurringErrors: ['drops articles'],
      nowMs: NOW + 1,
    });
    expect(reviewed.callCount).toBe(1);
    expect(reviewed.homework).toEqual(['Hello']);
    expect(reviewed.facts).toContain('likes hiking');
    expect(reviewed.recurringErrors).toContain('drops articles');
  });
});

describe('языковое предпочтение ученика (владелец: «говори со мной по-английски»)', () => {
  it('просьба за урок сохраняется в памяти, молчание не трогает, default сбрасывает', () => {
    const prev = parseTutorMemory({ callCount: 1 });
    const asked = mergeTutorMemory(prev, { languagePreference: 'more_target', nowMs: NOW });
    expect(asked.languagePreference).toBe('more_target');
    const silent = mergeTutorMemory(asked, { nowMs: NOW + 1 });
    expect(silent.languagePreference).toBe('more_target');
    // Старое имя (до второго изучаемого языка) читается как more_target.
    expect(parseTutorMemory({ languagePreference: 'more_english' }).languagePreference).toBe('more_target');
    const reset = mergeTutorMemory(silent, { languagePreference: 'default', nowMs: NOW + 2 });
    expect(reset.languagePreference).toBeNull();
    expect(parseTutorMemory({ languagePreference: 'junk' }).languagePreference).toBeNull();
  });

  it('блок памяти говорит учителю соблюдать просьбу поверх дефолта уровня', () => {
    const m = parseTutorMemory({ callCount: 2, languagePreference: 'more_target' });
    expect(renderTutorMemoryBlock(m, NOW)).toContain('MORE of the language they are learning');
    const n = parseTutorMemory({ callCount: 2, languagePreference: 'more_native' });
    expect(renderTutorMemoryBlock(n, NOW)).toContain('MORE in their native language');
    expect(renderTutorMemoryBlock(parseTutorMemory({ callCount: 2 }), NOW)).not.toContain('LANGUAGE PREFERENCE');
  });
});

describe('renderTutorMemoryBlock', () => {
  it('первый урок — короткая заметка познакомиться', () => {
    const block = renderTutorMemoryBlock(TUTOR_MEMORY_EMPTY, NOW);
    expect(block).toContain('FIRST lesson');
    expect(block).not.toContain('Homework');
  });

  it('повторный урок — счёт уроков, давность, факты, ошибки, домашка и обещанная тема', () => {
    const m = parseTutorMemory({
      facts: ['name is Olga'], recurringErrors: ['says I go yesterday'], homework: ['I would like a tea'],
      nextTopic: 'travel', callCount: 4, lastCallAtMs: NOW - 2 * DAY,
    });
    const block = renderTutorMemoryBlock(m, NOW);
    expect(block).toContain('Lessons so far: 4');
    expect(block).toContain('2 days ago');
    expect(block).toContain('name is Olga');
    expect(block).toContain('says I go yesterday');
    expect(block).toContain('I would like a tea');
    expect(block).toContain('travel');
  });

  it('renders teaching continuity without announcing a stored personal profile', () => {
    const memory = parseTutorMemory({
      schemaVersion: 2,
      preferredName: 'Olga',
      learningGoal: 'Speak confidently while travelling',
      pacePreference: 'slower',
      conversationHooks: [
        { text: 'Enjoys hiking', evidenceSessionId: 's1', updatedAtMs: NOW - 3 },
        { text: 'Plans a trip to Spain', evidenceSessionId: 's2', updatedAtMs: NOW - 2 },
        { text: 'Likes cooking', evidenceSessionId: 's3', updatedAtMs: NOW - 1 },
      ],
      activeIssues: [{ label: 'past tense', evidenceCount: 2, lastSeenAtMs: NOW }],
      resolvedIssues: [{ label: 'third-person -s', resolvedAtMs: NOW - DAY }],
      callCount: 4,
    });
    const block = renderTutorMemoryBlock(memory, NOW);

    expect(block).toContain('Preferred name: Olga');
    expect(block).toContain('Learning goal: Speak confidently while travelling');
    expect(block).toContain('PACE PREFERENCE: slower');
    expect(block).toContain('Use at most ONE relevant memory detail naturally');
    expect(block).toContain('Never announce that a profile or memory is stored');
    expect(block).toContain('Likes cooking');
    expect(block).toContain('Plans a trip to Spain');
    expect(block).not.toContain('Enjoys hiking');
    expect(block).toContain('Active learning issues: past tense');
    expect(block).toContain('Already resolved: third-person -s');
  });
});

describe('renderTutorCharterDigest', () => {
  it('берёт только разделы, полезные учителю, и режет длину; пустой устав → пусто (минт возьмёт встроенную выжимку)', () => {
    const charter = parseProductCharter({
      sections: [
        { key: 'about', body: 'Phraseman is an app…' },
        { key: 'learning', body: 'Lessons, trainer, dialogs. '.repeat(80) },
        { key: 'money', body: 'Plus €4.99' },
        { key: 'disabled', body: 'Tournaments are OFF' },
      ],
      revision: 1,
    });
    const digest = renderTutorCharterDigest(charter);
    expect(digest).toContain('[learning]');
    expect(digest).toContain('[disabled] Tournaments are OFF');
    expect(digest).not.toContain('[money]');
    expect(digest).not.toContain('[about]');
    expect(digest.length).toBeLessThanOrEqual(2_200);
    expect(renderTutorCharterDigest(parseProductCharter(undefined))).toBe('');
    expect(TUTOR_APP_DIGEST_FALLBACK).toContain('Trainer');
  });
});

// ── Ступень 1 плана обучения: очередь повторения речи, тип урока, сцены-задачи ──

describe('план обучения: очередь повторения речи', () => {
  const D = 86_400_000;

  it('новая домашка входит в очередь на завтра (коробка 0); верный ответ двигает коробку и интервал 1→3→7→21', () => {
    let q = applyPhraseResults([], [], ['I would like a coffee', 'How much is it?'], NOW);
    expect(q.map((p) => [p.text, p.box, p.dueAtMs])).toEqual([
      ['I would like a coffee', 0, NOW + 1 * D],
      ['How much is it?', 0, NOW + 1 * D],
    ]);
    q = applyPhraseResults(q, [{ text: 'i would like a coffee', result: 'pass' }], [], NOW + D);
    const coffee = q.find((p) => p.text === 'I would like a coffee')!;
    expect(coffee.box).toBe(1);
    expect(coffee.dueAtMs).toBe(NOW + D + 3 * D);
    q = applyPhraseResults(q, [{ text: 'I would like a coffee', result: 'pass' }], [], NOW + 4 * D);
    expect(q.find((p) => p.text === 'I would like a coffee')!.box).toBe(2); // 7 дней
    q = applyPhraseResults(q, [{ text: 'I would like a coffee', result: 'pass' }], [], NOW + 11 * D);
    q = applyPhraseResults(q, [{ text: 'I would like a coffee', result: 'pass' }], [], NOW + 32 * D);
    expect(q.find((p) => p.text === 'I would like a coffee')!.box).toBe(TUTOR_PHRASE_INTERVAL_DAYS.length - 1); // потолок 21 день
  });

  it('не смог сказать → коробка 0 и завтра снова; потолок очереди соблюдается', () => {
    let q = applyPhraseResults([{ text: 'a', box: 3, dueAtMs: NOW }], [{ text: 'a', result: 'needs_work' }], [], NOW);
    expect(q[0]).toEqual({ text: 'a', box: 0, dueAtMs: NOW + D });
    const many = Array.from({ length: 60 }, (_, i) => `phrase ${i}`);
    q = applyPhraseResults([], [], many, NOW);
    expect(q.length).toBe(TUTOR_PHRASE_QUEUE_MAX);
  });

  it('неуверенное распознавание и непригодное аудио нейтральны для интервала', () => {
    const original = [{ text: 'Could you help me?', box: 2, dueAtMs: NOW - DAY }];
    expect(applyPhraseResults(original, [{ text: 'Could you help me?', result: 'uncertain' }], [], NOW)).toEqual(original);
    expect(applyPhraseResults(original, [{ text: 'Could you help me?', result: 'invalid' }], [], NOW)).toEqual(original);
  });

  it('duePhrases отдаёт только созревшие, старейшие первыми, не больше потолка', () => {
    const m = parseTutorMemory({
      phraseQueue: [
        { text: 'later', box: 1, dueAtMs: NOW + D },
        { text: 'old', box: 0, dueAtMs: NOW - 2 * D },
        { text: 'now', box: 0, dueAtMs: NOW },
        { text: 'x1', box: 0, dueAtMs: NOW - D }, { text: 'x2', box: 0, dueAtMs: NOW - D }, { text: 'x3', box: 0, dueAtMs: NOW - D },
      ],
    });
    const due = duePhrases(m, NOW);
    expect(due.length).toBe(4);
    expect(due[0].text).toBe('old');
    expect(due.some((p) => p.text === 'later')).toBe(false);
  });

  it('тип урока чередуется по номеру урока; сцены-задачи считаются; блок памяти показывает план', () => {
    expect([0, 1, 2, 3].map(tutorLessonTypeFor)).toEqual(['new_material', 'review_and_scene', 'free_talk', 'new_material']);
    const prev = parseTutorMemory({ callCount: 1, phraseQueue: [{ text: 'due one', box: 0, dueAtMs: NOW - D }] });
    const next = mergeTutorMemory(prev, { sceneOutcome: 'done', homework: ['new hw'], nowMs: NOW });
    expect(next.scenesDone).toBe(1);
    expect(next.scenesTotal).toBe(1);
    expect(next.phraseQueue.some((p) => p.text === 'new hw')).toBe(true);
    const block = renderTutorMemoryBlock(next, NOW);
    expect(block).toContain("TODAY'S LESSON TYPE: REVIEW + SCENE"); // созревшая фраза важнее ротации
    expect(block).toContain('PHRASES DUE FOR SPOKEN RETRIEVAL TODAY');
    expect(block).toContain('due one');
    expect(block).toContain('Scene tasks completed so far: 1 of 1');
  });

  it('фактический тип урока выбирает доказательства, а не слепую ротацию', () => {
    expect(selectTutorLessonType(parseTutorMemory({ callCount: 1 }), NOW)).toBe('new_material');
    expect(selectTutorLessonType(parseTutorMemory({ callCount: 1, goalMastery: { a1_greet: 1 } }), NOW)).toBe('review_and_scene');
    expect(selectTutorLessonType(parseTutorMemory({
      callCount: 1, phraseQueue: [{ text: 'due', box: 0, dueAtMs: NOW }],
    }), NOW)).toBe('review_and_scene');
    expect(selectTutorLessonType(parseTutorMemory({ callCount: 2 }), NOW)).toBe('free_talk');
  });
});

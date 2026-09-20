import { generateDialogWithRepeatGuard } from './premium_dialog_quality';
import {
  createLiveReplyPublisher,
  publishAcceptedDialogReply,
  type LiveDialogEvent,
} from './premium_dialog_stream_parse';
import fs from 'fs';
import path from 'path';

/**
 * Контракт ЖИВОГО стрима диалога (владелец 2026-09-14: «отвечать немедленно»).
 *
 * Раньше сервер держал весь ответ до анти-повтор проверки и лишь потом резал
 * его на дельты — здесь охраняется обратное: дельты уходят по мере генерации,
 * отвергнутый черновик стирается кадром `reset`, а `done` остаётся авторитетным.
 */
describe('live dialog stream publisher', () => {
  it('streams plain-text replies as a monotonic tail', () => {
    const events: LiveDialogEvent[] = [];
    const publisher = createLiveReplyPublisher(false, (event) => events.push(event));

    publisher.push('Good');
    publisher.push('Good morning');
    publisher.push('Good morning'); // ничего нового — кадра нет
    publisher.push('Good morning, sir!');

    expect(events).toEqual([
      { type: 'delta', text: 'Good' },
      { type: 'delta', text: ' morning' },
      { type: 'delta', text: ', sir!' },
    ]);
    expect(publisher.publishedLength()).toBe('Good morning, sir!'.length);
  });

  it('in game mode publishes only the reply field of the unfinished JSON envelope', () => {
    const events: LiveDialogEvent[] = [];
    const publisher = createLiveReplyPublisher(true, (event) => events.push(event));

    publisher.push('{"re');
    publisher.push('{"reply": "Wha');
    publisher.push('{"reply": "What size');
    publisher.push('{"reply": "What size?", "mood": 7');
    publisher.push('{"reply": "What size?", "mood": 70, "outcome": "ongoing"}');

    expect(events.map((event) => (event.type === 'delta' ? event.text : event.type)).join('|'))
      .toBe('Wha|t size|?');
  });

  it('never emits a shrinking or non-continuing tail (broken escape at chunk edge)', () => {
    const events: LiveDialogEvent[] = [];
    const publisher = createLiveReplyPublisher(true, (event) => events.push(event));

    publisher.push('{"reply": "abc');
    publisher.push('{"reply": "abc\\'); // оборванный escape → видимый текст короче/равен
    publisher.push('{"reply": "abc\\nnext');

    expect(events).toEqual([
      { type: 'delta', text: 'abc' },
      { type: 'delta', text: '\nnext' },
    ]);
  });

  it('emits reset before a regenerated reply and skips it when nothing was published', () => {
    const events: LiveDialogEvent[] = [];
    const publisher = createLiveReplyPublisher(false, (event) => events.push(event));

    publisher.reset(); // ничего не публиковалось — кадр не нужен
    publisher.push('What size would you like?');
    publisher.reset();
    publisher.push('Would you prefer a small');

    expect(events).toEqual([
      { type: 'delta', text: 'What size would you like?' },
      { type: 'reset' },
      { type: 'delta', text: 'Would you prefer a small' },
    ]);
  });

  it('works end-to-end with the repeat guard: rejected draft is followed by reset', async () => {
    const history = [{ role: 'assistant' as const, content: 'What size would you like?' }];
    const events: LiveDialogEvent[] = [];
    const publisher = createLiveReplyPublisher(false, (event) => events.push(event));
    const drafts = ['What size would you like?', 'Would you prefer a small or large cup?'];

    const accepted = await generateDialogWithRepeatGuard(async (attempt: 0 | 1) => {
      if (attempt > 0) publisher.reset();
      const reply = drafts[attempt];
      // имитация чанков провайдера
      for (let i = 4; i <= reply.length; i += 4) publisher.push(reply.slice(0, i));
      publisher.push(reply);
      return { reply };
    }, history);

    expect(accepted.value.reply).toBe(drafts[1]);
    expect(accepted.quality.regenerationAttempted).toBe(true);
    const resetIndex = events.findIndex((event) => event.type === 'reset');
    expect(resetIndex).toBeGreaterThan(0);
    const before = events.slice(0, resetIndex).map((e) => (e.type === 'delta' ? e.text : '')).join('');
    const after = events.slice(resetIndex + 1).map((e) => (e.type === 'delta' ? e.text : '')).join('');
    expect(before).toBe(drafts[0]);
    expect(after).toBe(drafts[1]);
  });
});

describe('premium_dialog_stream source contract', () => {
  const source = fs.readFileSync(path.join(__dirname, 'premium_dialog_stream.ts'), 'utf8');

  it('buffers non-English provider chunks until full-response language validation', () => {
    expect(source).toContain("return studyTarget === 'en';");
    const guard = source.indexOf('if (!canPublishUncheckedDeltas) return;');
    expect(guard).toBeGreaterThan(0);
    expect(source.indexOf('publisher.push(accumulated)')).toBeGreaterThan(guard);
    expect(source).toContain('publishAcceptedDialogReply(');
  });

  it('marks the request started before generation and keeps done authoritative', () => {
    const started = source.indexOf("sseWrite(res, { type: 'started' });");
    const generation = source.indexOf('generateDialogWithRepeatGuard(async (attempt) =>');
    const done = source.indexOf("type: 'done'");

    expect(started).toBeGreaterThan(0);
    expect(generation).toBeGreaterThan(started);
    expect(done).toBeGreaterThan(generation);
    expect(source).toContain('assistantMessage,');
    expect(source).toContain('quality,');
  });

  it('keeps post-filters on the full reply before done', () => {
    const generation = source.indexOf('generateDialogWithRepeatGuard(async (attempt) =>');
    const done = source.indexOf("type: 'done'");
    const sanitize = source.indexOf('sanitizeRegulatedAdviceReply(reply, studyTarget)');
    const langGuard = source.indexOf('assertDialogReplyMatchesTarget(reply, studyTarget)');
    expect(sanitize).toBeGreaterThan(generation);
    expect(langGuard).toBeGreaterThan(sanitize);
    expect(done).toBeGreaterThan(langGuard);
  });

  it('logs stage latency under one grep-able prefix', () => {
    expect(source).toContain("'[DIALOG-LAT] stream ok'");
    expect(source).toContain("'[DIALOG-LAT] stream failed'");
  });
});

describe('validated dialogue stream publication', () => {
  it('emits no learner-visible text when full-response validation rejects', () => {
    const events: LiveDialogEvent[] = [];

    expect(() => publishAcceptedDialogReply(
      'Wrong language response',
      () => { throw new Error('wrong-language'); },
      (event) => events.push(event),
    )).toThrow('wrong-language');

    expect(events).toEqual([]);
  });

  it('publishes only after the complete accepted reply passes validation', () => {
    const order: string[] = [];
    publishAcceptedDialogReply(
      'Good morning.',
      () => order.push('validated'),
      (event) => order.push(`published:${event.type}`),
    );
    expect(order).toEqual(['validated', 'published:delta']);
  });
});

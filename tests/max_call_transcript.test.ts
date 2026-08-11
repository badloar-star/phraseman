import {
  TRANSCRIPT_FLUSH_MS,
  createTranscriptBuffer,
} from '../app/max_call_transcript';

// Управляемые часы: буфер должен зависеть только от инжектированного now(),
// иначе тесты троттлинга становятся флаки.
function makeClock(startMs = 1_000) {
  let t = startMs;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('createTranscriptBuffer: батчинг дельт', () => {
  it('N дельт между flush-окнами дают один снапшот c уже склеенным текстом', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('item_1', 'Hel');
    buf.pushAssistantDelta('item_1', 'lo ');
    buf.pushAssistantDelta('item_1', 'there');

    const first = buf.flushIfDue();
    expect(first).toEqual([{ role: 'assistant', text: 'Hello there', atMs: 1_000 }]);

    // Новые дельты внутри 250мс-окна не порождают второй flush.
    buf.pushAssistantDelta('item_1', ', friend');
    clock.advance(TRANSCRIPT_FLUSH_MS - 1);
    expect(buf.flushIfDue()).toBeNull();

    // Окно истекло — накопленное уходит одним снапшотом.
    clock.advance(1);
    const second = buf.flushIfDue();
    expect(second).toEqual([{ role: 'assistant', text: 'Hello there, friend', atMs: 1_000 }]);
  });

  it('без изменений flush не срабатывает даже спустя ≥250мс', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    expect(buf.flushIfDue()).toBeNull(); // пустой буфер — нечего отдавать

    buf.pushAssistantDelta('item_1', 'Hi');
    expect(buf.flushIfDue()).not.toBeNull();

    clock.advance(TRANSCRIPT_FLUSH_MS * 4);
    expect(buf.flushIfDue()).toBeNull(); // время прошло, изменений не было
  });

  it('пустая дельта не считается изменением и не взводит flush', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('item_1', 'Done');
    expect(buf.flushIfDue()).not.toBeNull();

    clock.advance(TRANSCRIPT_FLUSH_MS);
    buf.pushAssistantDelta('item_1', '');
    expect(buf.flushIfDue()).toBeNull();
  });
});

describe('createTranscriptBuffer: barge-in', () => {
  it('оборванная реплика ИИ закрывается «—» и помечается interrupted', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('item_1', 'So the recipe starts with');
    buf.markInterrupted('item_1');

    const snapshot = buf.flushIfDue();
    expect(snapshot).toEqual([
      {
        role: 'assistant',
        text: 'So the recipe starts with —',
        interrupted: true,
        atMs: 1_000,
      },
    ]);
  });

  it('поздние дельты после обрыва игнорируются — реплика не «оживает»', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('item_1', 'Let me tell');
    buf.markInterrupted('item_1');
    buf.pushAssistantDelta('item_1', ' you everything'); // out-of-order хвост

    expect(buf.history()).toEqual([
      { role: 'assistant', text: 'Let me tell —', interrupted: true, atMs: 1_000 },
    ]);
  });

  it('markInterrupted по неизвестному itemId и после complete — no-op, не throw', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    expect(() => buf.markInterrupted('ghost')).not.toThrow();
    expect(buf.flushIfDue()).toBeNull();

    buf.pushAssistantDelta('item_1', 'All good.');
    buf.completeAssistantItem('item_1');
    buf.markInterrupted('item_1'); // завершённую реплику задним числом не обрываем

    expect(buf.history()).toEqual([{ role: 'assistant', text: 'All good.', atMs: 1_000 }]);
  });
});

describe('createTranscriptBuffer: реплики юзера', () => {
  it('финальная реплика появляется целиком, interim-состояний нет', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    expect(buf.history()).toEqual([]); // до финала от юзера в истории пусто

    clock.advance(500);
    buf.pushUserFinal('I would like a cappuccino');

    expect(buf.history()).toEqual([
      { role: 'user', text: 'I would like a cappuccino', atMs: 1_500 },
    ]);
  });
});

describe('createTranscriptBuffer: целостность истории для шита/summary', () => {
  function buildDialog() {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('a1', 'Hi! What can I get you?');
    buf.completeAssistantItem('a1');
    clock.advance(2_000);
    buf.pushUserFinal('A large latte please');
    clock.advance(1_000);
    buf.pushAssistantDelta('a2', 'Great choice, one large');
    buf.markInterrupted('a2'); // юзер перебил
    clock.advance(500);
    buf.pushUserFinal('Actually make it small');
    return { clock, buf };
  }

  it('history сохраняет порядок реплик и содержимое независимо от троттлинга flush', () => {
    const { buf } = buildDialog();
    expect(buf.history()).toEqual([
      { role: 'assistant', text: 'Hi! What can I get you?', atMs: 1_000 },
      { role: 'user', text: 'A large latte please', atMs: 3_000 },
      { role: 'assistant', text: 'Great choice, one large —', interrupted: true, atMs: 4_000 },
      { role: 'user', text: 'Actually make it small', atMs: 4_500 },
    ]);
  });

  it('fullText отдаёт формат AI:/You: построчно', () => {
    const { buf } = buildDialog();
    expect(buf.fullText()).toBe(
      [
        'AI: Hi! What can I get you?',
        'You: A large latte please',
        'AI: Great choice, one large —',
        'You: Actually make it small',
      ].join('\n'),
    );
  });

  it('снапшоты изолированы от внутреннего состояния (мутация снаружи не портит историю)', () => {
    const { buf } = buildDialog();
    const snapshot = buf.history();
    snapshot[0]!.text = 'hacked';
    snapshot.pop();
    expect(buf.history()[0]!.text).toBe('Hi! What can I get you?');
    expect(buf.history()).toHaveLength(4);
  });

  it('дельты разных itemId идут в разные реплики, дельты одного — в одну', () => {
    const clock = makeClock();
    const buf = createTranscriptBuffer(clock.now);

    buf.pushAssistantDelta('a1', 'First');
    buf.pushAssistantDelta('a2', 'Second');
    buf.pushAssistantDelta('a1', ' turn');

    expect(buf.history()).toEqual([
      { role: 'assistant', text: 'First turn', atMs: 1_000 },
      { role: 'assistant', text: 'Second', atMs: 1_000 },
    ]);
  });
});

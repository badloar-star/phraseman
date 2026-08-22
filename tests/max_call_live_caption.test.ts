import {
  LIVE_CAPTION_INITIAL,
  liveCaptionChunkDelayMs,
  reduceLiveCaption,
} from '../app/max_call_live_caption';

describe('MAX live caption pacing', () => {
  test('assistant text remains invisible until remote audio starts', () => {
    const buffered = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta',
      itemId: 'a1',
      delta: 'Where is the station?',
    });

    expect(buffered.fullText).toBe('Where is the station?');
    expect(buffered.visibleText).toBe('');
    expect(reduceLiveCaption(buffered, { type: 'tick' }).visibleText).toBe('');
  });

  test('audio start releases two-to-five-word chunks without losing full text', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta',
      itemId: 'a1',
      delta: 'Where is the train station near here?',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });

    const words = state.visibleText.trim().split(/\s+/u);
    expect(words.length).toBeGreaterThanOrEqual(2);
    expect(words.length).toBeLessThanOrEqual(5);
    expect(state.fullText).toBe('Where is the train station near here?');
  });

  test('punctuation ends a readable chunk before the five-word cap', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta',
      itemId: 'a1',
      delta: 'Almost! Say the whole phrase again.',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });

    expect(state.visibleText).toBe('Almost! Say');
  });

  test('holds an incomplete trailing word until another delta completes it', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'Where is the sta',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });
    expect(state.visibleText).toBe('Where is the');

    state = reduceLiveCaption(state, {
      type: 'assistant_delta', itemId: 'a1', delta: 'tion?',
    });
    state = reduceLiveCaption(state, { type: 'assistant_done', itemId: 'a1' });
    state = reduceLiveCaption(state, { type: 'tick' });
    expect(state.visibleText).toBe('Where is the station?');
  });

  test('audio stop pauses without revealing text that was not reached by a playing tick', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'This is the complete answer.',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });
    const visibleBeforeStop = state.visibleText;
    state = reduceLiveCaption(state, { type: 'audio_stopped' });

    expect(state.visibleText).toBe(visibleBeforeStop);
    expect(state.playing).toBe(false);
  });

  test.each(['audio_cleared', 'reconnect'] as const)(
    '%s does not poison the next response when audio starts before its transcript',
    (type) => {
      let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
        type: 'assistant_delta', itemId: 'a1', delta: 'Cancelled old answer.',
      });
      state = reduceLiveCaption(state, { type: 'audio_started' });
      state = reduceLiveCaption(state, { type });

      state = reduceLiveCaption(state, { type: 'audio_started' });
      state = reduceLiveCaption(state, {
        type: 'assistant_delta', itemId: 'a2', delta: 'New response starts here. ',
      });
      state = reduceLiveCaption(state, { type: 'tick' });

      expect(state).toMatchObject({
        itemId: 'a2',
        playing: true,
        cancelled: false,
      });
      expect(state.visibleText).toBe('New response starts here.');
    },
  );

  test('a late same-item delta after audio stop waits for playback to resume', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'Hello',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'audio_stopped' });
    state = reduceLiveCaption(state, {
      type: 'assistant_delta', itemId: 'a1', delta: ' world.',
    });

    expect(state.fullText).toBe('Hello world.');
    expect(state.visibleText).toBe('');
    expect(state.playing).toBe(false);
  });

  test('publishes one completed-turn accessibility announcement, never every chunk', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'A complete spoken response.',
    });
    state = reduceLiveCaption(state, { type: 'assistant_done', itemId: 'a1' });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });
    expect(state.announcementText).toBe('');
    state = reduceLiveCaption(state, { type: 'audio_stopped' });
    expect(state.announcementText).toBe('A complete spoken response.');
    const announced = state;
    expect(reduceLiveCaption(state, { type: 'audio_stopped' })).toBe(announced);
  });

  test('audio restart never reveals cancelled text before a new item arrives', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'Stale words must stay hidden.',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'audio_cleared' });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'tick' });

    expect(state.visibleText).toBe('');
    expect(state.cancelled).toBe(true);
    expect(state.playing).toBe(true);
  });

  test.each(['audio_cleared', 'reconnect', 'end', 'fail'] as const)(
    '%s cancels pending stale caption text',
    (type) => {
      let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
        type: 'assistant_delta', itemId: 'a1', delta: 'Do not reveal this later',
      });
      state = reduceLiveCaption(state, { type: 'audio_started' });
      state = reduceLiveCaption(state, { type });

      expect(state.playing).toBe(false);
      expect(state.cancelled).toBe(true);
      expect(reduceLiveCaption(state, { type: 'tick' })).toEqual(state);
    },
  );

  test('a new assistant item replaces only display state', () => {
    let state = reduceLiveCaption(LIVE_CAPTION_INITIAL, {
      type: 'assistant_delta', itemId: 'a1', delta: 'First answer.',
    });
    state = reduceLiveCaption(state, { type: 'audio_started' });
    state = reduceLiveCaption(state, { type: 'audio_stopped' });
    state = reduceLiveCaption(state, {
      type: 'assistant_delta', itemId: 'a2', delta: 'Second answer.',
    });

    expect(state).toMatchObject({
      itemId: 'a2',
      fullText: 'Second answer.',
      visibleText: '',
      playing: false,
      cancelled: false,
    });
  });

  test('chunk delay is bounded and grows with word count', () => {
    expect(liveCaptionChunkDelayMs('two words')).toBeGreaterThanOrEqual(420);
    expect(liveCaptionChunkDelayMs('one two three four five')).toBeLessThanOrEqual(1_100);
    expect(liveCaptionChunkDelayMs('one two three four five'))
      .toBeGreaterThan(liveCaptionChunkDelayMs('two words'));
  });
});

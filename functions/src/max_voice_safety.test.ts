// Сейфти-журнал голосовых уроков (владелец 2026-08-16): чистые части без сети.

import {
  VOICE_SAFETY_TRANSCRIPT_MAX_CHARS,
  collectLocalVoiceVerdicts,
  dedupeVerdicts,
  renderSafetyTranscript,
  sanitizeClientSafetyFlags,
} from './max_voice_safety';

describe('sanitizeClientSafetyFlags', () => {
  it('принимает только известные категории, дедупит, режет заметку и количество', () => {
    const flags = sanitizeClientSafetyFlags([
      { kind: 'harassment', note: 'x'.repeat(500) },
      { kind: 'harassment', note: 'dup' },
      { kind: 'teleport' },
      { kind: 'self_harm' },
      'junk',
      ...Array.from({ length: 20 }, () => ({ kind: 'other' })),
    ]);
    expect(flags.map((f) => f.kind)).toEqual(['harassment', 'self_harm', 'other']);
    expect(flags[0].note!.length).toBe(200);
    expect(sanitizeClientSafetyFlags('nope')).toEqual([]);
  });
});

describe('collectLocalVoiceVerdicts + dedupe', () => {
  const history = [
    { role: 'assistant' as const, content: 'Hi! How are you today?' },
    { role: 'user' as const, content: 'I want to kill myself' },
    { role: 'user' as const, content: 'ok whatever' },
  ];

  it('флаг учителя (инструмент) + словарь по репликам ученика; реплики учителя не судятся', () => {
    const items = collectLocalVoiceVerdicts(history, [{ kind: 'harassment', note: 'insulted the tutor' }]);
    expect(items.map((i) => [i.verdict.category, i.source])).toEqual([
      ['harassment', 'tutor_tool'],
      ['suicide', 'keywords'],
    ]);
    expect(items[0].userText).toBe('insulted the tutor');
    expect(items[1].userText).toBe('I want to kill myself');
  });

  it('дедуп по категории — первый источник побеждает', () => {
    const items = collectLocalVoiceVerdicts(history, [{ kind: 'suicide' }]);
    const unique = dedupeVerdicts(items);
    expect(unique).toHaveLength(1);
    expect(unique[0].source).toBe('tutor_tool');
  });
});

describe('renderSafetyTranscript', () => {
  it('роли и обрезка сверху по потолку (хвост разговора важнее начала)', () => {
    const short = renderSafetyTranscript([
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Hi' },
    ]);
    expect(short).toBe('Tutor: Hello\nLearner: Hi');
    const long = renderSafetyTranscript([{ role: 'user', content: 'a'.repeat(VOICE_SAFETY_TRANSCRIPT_MAX_CHARS + 500) }]);
    expect(long.length).toBe(VOICE_SAFETY_TRANSCRIPT_MAX_CHARS);
  });
});

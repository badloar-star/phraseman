import {
  assertVoiceSnapshotBatchFits,
  decodeVoiceResearchCursor,
  encodeVoiceResearchCursor,
  packVoiceResearchSnapshot,
  parseVoiceResearchRequest,
  unpackVoiceResearchSnapshot,
  exportVoiceResearchRows,
} from './admin_voice_research';

describe('Admin Voice & Research read contract', () => {
  test('accepts only supported views and bounds filters/page size', () => {
    expect(parseVoiceResearchRequest({ view: 'secrets', pageSize: 999 })).toMatchObject({ view: 'ideas', pageSize: 100, cursor: null });
    expect(parseVoiceResearchRequest({ view: 'onboarding-sources', filters: { rangeDays: 999, platform: 'windows' } })).toMatchObject({
      view: 'onboarding-sources', filters: { rangeDays: 180, platform: 'all', status: '', category: '', reason: '', query: '' },
    });
    expect(parseVoiceResearchRequest({ view: 'surveys', selectedSurveyId: '../bad' })).toMatchObject({ selectedSurveyId: 'bad' });
    expect(() => parseVoiceResearchRequest({ cursor: 'broken' })).toThrow('invalid_cursor');
  });

  test('binds cursors to immutable snapshot and exact normalized request scope', () => {
    const request = parseVoiceResearchRequest({ view: 'ideas', filters: { status: 'pending', query: ' Test ' } });
    const cursor = encodeVoiceResearchCursor('snap-a', 100, request.scope);
    expect(decodeVoiceResearchCursor(cursor, request.scope)).toEqual({ snapshotId: 'snap-a', offset: 100 });
    const other = parseVoiceResearchRequest({ view: 'ideas', filters: { status: 'approved', query: 'test' } });
    expect(() => decodeVoiceResearchCursor(cursor, other.scope)).toThrow('cursor_mismatch');
  });

  test('round-trips a frozen snapshot and enforces one safe atomic Firestore batch', () => {
    const payload = { generatedAtMs: 1, view: 'ideas', items: Array.from({ length: 10_001 }, (_, index) => ({ id: `i-${index}` })), summary: { total: 10_001 }, sources: [] };
    const chunks = packVoiceResearchSnapshot(payload);
    assertVoiceSnapshotBatchFits(chunks);
    const restored = unpackVoiceResearchSnapshot(chunks);
    payload.items[10_000].id = 'mutated';
    expect(restored.items[10_000]).toEqual({ id: 'i-10000' });
    expect(() => assertVoiceSnapshotBatchFits(Array(12).fill('x'.repeat(700_000)))).toThrow('voice_snapshot_too_large');
  });

  test('exports survey answers into one column per question', () => {
    const csv = exportVoiceResearchRows('surveys', [{ uid: 'u1', submittedAtMs: 10, platform: 'ios', appVersion: '1.0', answers: { q1: { optionId: 'yes', comment: 'Because' }, q2: { optionId: 'comment', comment: '=formula' } } }], { selectedSurveyId: 's1', surveys: [{ surveyId: 's1', questions: [{ id: 'q1' }, { id: 'q2' }] }] });
    expect(csv.split('\r\n')[0]).toBe('"uid","submittedAtMs","platform","appVersion","q1","q2"');
    expect(csv).toContain('"yes — Because"');
    expect(csv).toContain('"comment — =formula"');
    expect(csv).not.toContain('"answers"');
    const collision = exportVoiceResearchRows('surveys', [{ uid: 'real-user', submittedAtMs: 10, platform: 'ios', appVersion: '1.0', answers: { uid: { optionId: 'answer-user' }, platform: { optionId: 'answer-platform' } } }], { selectedSurveyId: 's1', surveys: [{ surveyId: 's1', questions: [{ id: 'uid' }, { id: 'platform' }] }] });
    expect(collision.split('\r\n')[1]).toBe('"real-user","10","ios","1.0","answer-user","answer-platform"');
  });
});

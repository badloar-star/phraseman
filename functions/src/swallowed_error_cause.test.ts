// зачем (координатор 13.10, SERVER_SILENT_CATCH_R1): причина сбоя пишется без личных данных и без текста реплик.
const mockWarn = jest.fn();
jest.mock('firebase-functions/logger', () => ({ warn: (...args: unknown[]) => mockWarn(...args) }));

import { maskServerCauseText, reportCauseServer } from './swallowed_error';

describe('reportCauseServer', () => {
  beforeEach(() => mockWarn.mockClear());

  test('writes code, name and a masked message under one prefix', () => {
    const error = Object.assign(new Error('No document to update: users/aB3dE5gH7jK9mN1pQ3sT5vX7/progress'), { code: 'not-found' });
    reportCauseServer('dialogue_v2_completion:read_session', error);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    const [line, fields] = mockWarn.mock.calls[0] as [string, Record<string, unknown>];
    expect(line).toBe('[SERVER-CAUSE] dialogue_v2_completion:read_session');
    expect(fields).toMatchObject({ tag: 'dialogue_v2_completion:read_session', code: 'not-found', name: 'Error' });
    expect(String(fields.message)).not.toContain('aB3dE5gH7jK9mN1pQ3sT5vX7');
    expect(String(fields.message)).toContain('users/…/progress');
  });

  test('omitMessage keeps the model text out of the log', () => {
    reportCauseServer('dialogue_v2_completion:feedback_not_json', new SyntaxError('Unexpected token \'H\', "Hello, my name is Ann" is not valid JSON'), {
      omitMessage: true,
      extra: { length: 21 },
    });
    const fields = mockWarn.mock.calls[0][1] as Record<string, unknown>;
    expect(fields).not.toHaveProperty('message');
    expect(fields).toMatchObject({ name: 'SyntaxError', length: 21 });
  });

  test('never throws, even for odd values', () => {
    expect(() => reportCauseServer('x:y', undefined)).not.toThrow();
    expect(() => reportCauseServer('x:y', { code: 7 })).not.toThrow();
    expect(maskServerCauseText('token ' + 'a'.repeat(40))).toBe('token …');
  });
});

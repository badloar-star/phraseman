const runtime = require('./tournaments') as Record<string, any>;

describe('tournamentStartNow internal error logging', () => {
  it('keeps only bounded message and stack fields from unknown server errors', () => {
    expect(runtime.tournamentStartNowInternalErrorLog).toBeDefined();
    const error = Object.assign(new Error('firestore serialization failed'), {
      uid: 'private-user-id',
      requestPayload: { answer: 'private-payload' },
      secret: 'private-secret',
    });

    const logged = runtime.tournamentStartNowInternalErrorLog(error);

    expect(logged).toEqual({
      message: 'firestore serialization failed',
      stack: expect.stringContaining('Error: firestore serialization failed'),
    });
    expect(JSON.stringify(logged)).not.toContain('private-user-id');
    expect(JSON.stringify(logged)).not.toContain('private-payload');
    expect(JSON.stringify(logged)).not.toContain('private-secret');
  });
});

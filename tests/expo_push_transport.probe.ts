import assert from 'node:assert/strict';
import { sendExpoPush } from '../functions/src/expo_push';

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
  globalThis.fetch = (async (_url, options) => {
    calls += 1;
    const body = JSON.parse(String(options?.body));
    assert.equal(body[0].to, 'ExponentPushToken[test]');
    assert.deepEqual(body[0].data, { type: 'friend_event' });
    return { ok: true, json: async () => ({ data: [{ status: 'ok' }] }) } as Response;
  }) as typeof fetch;
  assert.equal(await sendExpoPush('', 'title', 'body', {}), 'skipped');
  assert.equal(calls, 0);
  assert.equal(await sendExpoPush('ExponentPushToken[test]', 'title', 'body', { type: 'friend_event' }), 'sent');
  assert.equal(calls, 1);
  globalThis.fetch = (async () => ({ ok: false })) as typeof fetch;
  assert.equal(await sendExpoPush('ExponentPushToken[test]', 'title', 'body', {}), 'failed');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

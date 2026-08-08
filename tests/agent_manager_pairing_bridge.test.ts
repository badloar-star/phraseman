const {
  PAIRING_BRIDGE_ORIGIN,
  PAIRING_BRIDGE_PATH,
  startPairingBridge,
  validatePairingPayload,
} = require('../scripts/agent_manager_pairing_bridge.cjs');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const validPayload = Object.freeze({
  pairingId: 'pair-123',
  pairingCode: '48291345',
  expiresAtMs: 2_000_000_000_000,
  exchangeUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerExchangePairing',
  claimUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerClaim',
  submitUrl: 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/agentManagerLocalRunnerSubmit',
});

describe('local Agent Manager pairing bridge', () => {
  test('the persistent watcher starts the bridge before falling back to the clipboard', () => {
    const watcher = fs.readFileSync(path.resolve(__dirname, '../scripts/agent_manager_codex_runner_watch.ps1'), 'utf8');
    expect(watcher).toContain('agent_manager_pairing_bridge.cjs');
    expect(watcher).toMatch(/Start-Process[\s\S]*\$bridge[\s\S]*--config[\s\S]*\$ConfigPath/);
  });

  test('accepts only the exact production pairing payload while it is fresh', () => {
    expect(validatePairingPayload(validPayload, 1_999_999_999_000)).toEqual(validPayload);
    expect(() => validatePairingPayload({ ...validPayload, exchangeUrl: 'https://example.test/exchange' }, 1_999_999_999_000)).toThrow('pairing payload is invalid');
    expect(() => validatePairingPayload({ ...validPayload, pairingId: ['pair-123'] }, 1_999_999_999_000)).toThrow('pairing payload is invalid');
    expect(() => validatePairingPayload({ ...validPayload, pairingCode: ['48291345'] }, 1_999_999_999_000)).toThrow('pairing payload is invalid');
    expect(() => validatePairingPayload({ ...validPayload, unexpected: true }, 1_999_999_999_000)).toThrow('pairing payload is invalid');
    expect(() => validatePairingPayload({ ...validPayload, expiresAtMs: 1_999_999_999_000 }, 1_999_999_999_000)).toThrow('pairing payload is expired');
  });

  test('binds only to loopback, rejects an untrusted origin, and consumes one valid post once', async () => {
    const received: unknown[] = [];
    const bridge = await startPairingBridge({
      port: 0,
      now: () => 1_999_999_999_000,
      onPairing: async (payload: unknown) => { received.push(payload); },
    });
    try {
      expect(bridge.host).toBe('127.0.0.1');
      const base = `http://127.0.0.1:${bridge.port}${PAIRING_BRIDGE_PATH}`;
      const rejected = await fetch(base, { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: JSON.stringify(validPayload) });
      expect(rejected.status).toBe(403);
      expect(received).toEqual([]);

      const accepted = await fetch(base, { method: 'POST', headers: { origin: PAIRING_BRIDGE_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(validPayload) });
      expect(accepted.status).toBe(202);
      expect(received).toEqual([validPayload]);

      const replay = await fetch(base, { method: 'POST', headers: { origin: PAIRING_BRIDGE_ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(validPayload) });
      expect(replay.status).toBe(409);
    } finally {
      await bridge.close();
    }
  });

  test('reserves the one-time receipt before awaiting a slow request body', async () => {
    const received: unknown[] = [];
    const bridge = await startPairingBridge({ port: 0, now: () => 1_999_999_999_000, onPairing: async (payload: unknown) => { received.push(payload); } });
    try {
      const body = JSON.stringify(validPayload);
      const options = { hostname: '127.0.0.1', port: bridge.port, path: PAIRING_BRIDGE_PATH, method: 'POST', headers: { origin: PAIRING_BRIDGE_ORIGIN, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } };
      const slow = http.request(options);
      slow.write(body.slice(0, 8));
      const fast = await fetch(`http://127.0.0.1:${bridge.port}${PAIRING_BRIDGE_PATH}`, { method: 'POST', headers: { origin: PAIRING_BRIDGE_ORIGIN, 'content-type': 'application/json' }, body });
      slow.end(body.slice(8));
      const slowResponse = await new Promise<any>((resolve) => slow.on('response', resolve));
      expect(slowResponse.statusCode).toBe(202);
      expect(fast.status).toBe(409);
      expect(received).toEqual([validPayload]);
    } finally {
      await bridge.close();
    }
  });
});

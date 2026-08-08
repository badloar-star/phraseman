import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Admin V2 local runner pairing contract', () => {
  test('delivers a newly issued pairing packet to the fixed loopback bridge and keeps clipboard only as fallback', () => {
    const source = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');
    expect(source).toContain("http://127.0.0.1:43817/v1/agent-manager/pairing");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("credentials: 'omit'");
    expect(source).toContain("headers: { 'content-type': 'application/json' }");
    expect(source).toMatch(/await\s+deliverAgentManagerPairingToLocalBridge\(pairing\)[\s\S]{0,500}clipboard/);
  });

  test('permits Admin V2 to reach only the fixed local pairing bridge through its Content Security Policy', () => {
    const firebase = fs.readFileSync(path.join(root, 'firebase.json'), 'utf8');
    expect(firebase).toContain('http://127.0.0.1:43817');
  });

  test('keeps only the expiry in Admin V2 state after the one-time code is delivered', () => {
    const source = fs.readFileSync(path.join(root, 'admin/v2/scripts/admin-core.js'), 'utf8');
    expect(source).toMatch(/state\.agentManager\s*=\s*\{\s*\.\.\.state\.agentManager,\s*pairing:\s*\{\s*expiresAtMs:/);
    expect(source).not.toContain('pairing: pairing');
  });
});

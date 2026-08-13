import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'legacy.html'), 'utf8');

function functionBlock(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin protected remote-config workflow', () => {
  test('declares one cached callable per protected server operation', () => {
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminGetRemoteConfigWorkspace'\)/g) || []).toHaveLength(1);
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminPublishRemoteConfig'\)/g) || []).toHaveLength(1);
    expect(legacy).toContain('let _adminRemoteConfigWorkspace = null;');
  });

  test('publishes once with cryptographic operation ids and the cached revision', () => {
    const block = functionBlock(
      'async function publishAdminRemoteConfigPatch(nextConfig, reason)',
      'function rcSetStatus(',
    );

    expect(block).toContain('expectedRevision: workspace.config.revision');
    expect(block).toContain("createAdminCommandId('remote_config_operation')");
    expect(block).toContain("createAdminCommandId('remote_config_request')");
    expect(block).toContain('if (!data || data.ok !== true)');
    expect(block.match(/getAdminPublishRemoteConfigCallable\(\)/g) || []).toHaveLength(1);
    expect(block).toContain('_adminRemoteConfigWorkspace = null');
    expect(block).not.toMatch(/while\s*\(|for\s*\([^)]*retry|retry/i);
  });

  test.each([
    ['window.loadRemoteConfig = async function(force)', 'window.saveRemoteConfig = async function()', 'loadAdminRemoteConfigWorkspace'],
    ['window.saveRemoteConfig = async function()', '// ── Пульт управления', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelBool = async function(key, checked)', '// Совместимость: старый онколл lifetime-тумблера', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelTexts = async function(patch)', '// ── 📺 YouTube-канал', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelNumbers = async function(patch)', '// ── Недельные бонусы', 'publishAdminRemoteConfigPatch'],
  ])('%s uses protected helpers without direct Firestore writes or reads', (start, end, expectedHelper) => {
    const block = functionBlock(start, end);
    expect(block).toContain(expectedHelper);
    expect(block).not.toMatch(/\b(?:getDoc|setDoc|addDoc|logAction)\s*\(/);
  });

  test('remote-config history is rendered from the protected workspace', () => {
    const block = functionBlock('window.rcLoadHistory = async function(force)', '// ══ Paywall A/B');
    expect(block).toContain('loadAdminRemoteConfigWorkspace');
    expect(block).not.toMatch(/\bgetDocs\s*\(/);
  });
});

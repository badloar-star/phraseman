import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const legacy = normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8'));

// зачем (04.10): в живой админке порядок секций поменялся, поэтому конец функции ищем
// по закрытию на втором отступе, а не по соседнему комментарию.
function functionBlock(startMarker: string): string {
  const start = legacy.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const tail = legacy.slice(start);
  const close = /\n {2}\}/.exec(tail);
  expect(close).not.toBeNull();
  return tail.slice(0, (close as RegExpExecArray).index);
}

describe('Legacy admin protected remote-config workflow', () => {
  test('declares one cached callable per protected server operation', () => {
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminGetRemoteConfigWorkspace'\)/g) || []).toHaveLength(1);
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminPublishRemoteConfig'\)/g) || []).toHaveLength(1);
    expect(legacy).toContain('let _adminRemoteConfigWorkspace = null;');
  });

  test('publishes once with cryptographic operation ids and the cached revision', () => {
    const block = functionBlock('async function publishAdminRemoteConfigPatch(nextConfig, reason)');

    expect(block).toContain('expectedRevision: workspace.config.revision');
    expect(block).toContain("createAdminCommandId('remote_config_operation')");
    expect(block).toContain("createAdminCommandId('remote_config_request')");
    expect(block).toContain('if (!data || data.ok !== true)');
    expect(block.match(/getAdminPublishRemoteConfigCallable\(\)/g) || []).toHaveLength(1);
    expect(block).toContain('_adminRemoteConfigWorkspace = null');
    expect(block).not.toMatch(/while\s*\(|for\s*\([^)]*retry|retry/i);
  });

  test.each([
    ['window.loadRemoteConfig = async function(force)', 'loadAdminRemoteConfigWorkspace'],
    ['window.saveRemoteConfig = async function()', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelBool = async function(key, checked)', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelTexts = async function(patch)', 'publishAdminRemoteConfigPatch'],
    ['window.saveControlPanelNumbers = async function(patch)', 'publishAdminRemoteConfigPatch'],
  ])('%s uses protected helpers without direct Firestore writes or reads', (start, expectedHelper) => {
    const block = functionBlock(start);
    expect(block).toContain(expectedHelper);
    expect(block).not.toMatch(/\b(?:getDoc|setDoc|addDoc|logAction)\s*\(/);
  });

  test('remote-config history is rendered from the protected workspace', () => {
    const block = functionBlock('window.rcLoadHistory = async function(force)');
    expect(block).toContain('loadAdminRemoteConfigWorkspace');
    expect(block).not.toMatch(/\bgetDocs\s*\(/);
  });
});

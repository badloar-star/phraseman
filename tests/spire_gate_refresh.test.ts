// зачем (владелец 11.10: «ШПИЛЬ НЕМЕДЛЕННО»): сервер включил Шпиль, а клиент держал кэши 6 ч. При закрытых воротах —
// один принудительный перечит не чаще раза в 60 секунд; при открытых — ни одного лишнего чтения. И событие об изменении
// рубильников уходит ПОСЛЕ обновления зеркала кэша — иначе слушатели читали старое.
import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_GATE_REFRESH_MIN_INTERVAL_MS, shouldForceSpireGateRefresh } from '../app/spire_gate_refresh';

const NOW = 1_800_000_000_000;

describe('ворота Шпиля: когда перечитывать', () => {
  test('ворота открыты — не читаем ничего', () => {
    expect(shouldForceSpireGateRefresh({ open: true, lastMs: undefined, nowMs: NOW })).toEqual({ refresh: false, reason: 'open' });
  });
  test('закрыты и перечита не было — читаем', () => {
    expect(shouldForceSpireGateRefresh({ open: false, lastMs: undefined, nowMs: NOW })).toEqual({ refresh: true, reason: 'due' });
  });
  test('закрыты, но перечит был меньше 60 секунд назад — ждём (Firebase-экономия)', () => {
    expect(shouldForceSpireGateRefresh({ open: false, lastMs: NOW - SPIRE_GATE_REFRESH_MIN_INTERVAL_MS + 1000, nowMs: NOW }))
      .toEqual({ refresh: false, reason: 'throttled' });
  });
  test('закрыты и прошло 60 секунд — читаем снова', () => {
    expect(shouldForceSpireGateRefresh({ open: false, lastMs: NOW - SPIRE_GATE_REFRESH_MIN_INTERVAL_MS, nowMs: NOW }).refresh).toBe(true);
  });
  test('часы ушли назад (метка из будущего) — не застреваем, читаем', () => {
    expect(shouldForceSpireGateRefresh({ open: false, lastMs: NOW + 60_000, nowMs: NOW }).refresh).toBe(true);
  });
});

describe('подключение', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  test('событие remote_config_changed — после обновления зеркала кэша', () => {
    const client = read('app/remote_config_client.ts');
    const remember = client.indexOf('rememberRemoteConfigCacheRaw(encoded);');
    const emit = client.indexOf("emitAppEvent('remote_config_changed');");
    expect(remember).toBeGreaterThan(0);
    expect(emit).toBeGreaterThan(remember);
  });
  test('«Сообщество» перечитывает рубильники, пока вкладка Шпиля скрыта', () => {
    expect(read('app/(tabs)/community.tsx')).toMatch(/if \(!tabVisible \|\| spireVisible\) return;\s*void refreshSpireTabFlagIfClosed\('community_focus'\);/);
  });
  test('экран Шпиля перечитывает config/spire_v1, если по кэшу он выключен', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toMatch(/refreshSpireConfigIfLocked\('spire_home', false\)/);
  });
  test('флаг вкладки сменился — кэш config/spire_v1 сбрасывается', () => {
    expect(read('app/spire_tab_flag.ts')).toMatch(/if \(before !== null && before !== _remoteEnabled\) void invalidateSpireConfigCache\(/);
  });
  test('Dev Hub: «Обновить рубильники сейчас»', () => {
    expect(read('components/dev/devToolRegistry.ts')).toMatch(/action: 'refresh-remote-gates'/);
    expect(read('components/dev/DevHubSheet.tsx')).toMatch(/case 'refresh-remote-gates':[\s\S]{0,300}forceRefreshSpireGatesNow\(\)/);
  });
});

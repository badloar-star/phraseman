// зачем (решения координатора 15.10 по бета-тесту А4): видеорейка без видео тихо скрывается через 10 с и возвращается сама; Пик без конфига при отсутствии сети говорит «Нет интернета»;
// «Восстановить» в управлении Plus имеет потолок 8 с; потеря моста курса пишет [V2-BRIDGE]. Тесты — вердикт сети для Пика (с подменой NetInfo) и сторожа по исходникам.
import fs from 'node:fs';
import path from 'node:path';

const mockFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: (...args: unknown[]) => mockFetch(...args) } }));

import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';
import { SPIRE_CONFIG_OFFLINE, spireConfigFallback } from '../components/spire/spire_config_offline';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

describe('Пик: что показать, когда конфиг не прочитался', () => {
  it('сети нет → отдельный офлайн-объект (экран напишет «Нет интернета»), это не тот же объект, что дефолт', async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false, type: 'none' });
    expect(await spireConfigFallback(new Error('unavailable'))).toBe(SPIRE_CONFIG_OFFLINE);
    expect(SPIRE_CONFIG_OFFLINE).not.toBe(SPIRE_CONFIG_DEFAULTS);
    expect(SPIRE_CONFIG_OFFLINE.enabled).toBe(false);
  });

  it('сеть есть (причина другая) → прежний замок «откроется чуть позже»', async () => {
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true, type: 'wifi' });
    expect(await spireConfigFallback(new Error('permission-denied'))).toBe(SPIRE_CONFIG_DEFAULTS);
  });

  it('проверка сети сама упала → прежний замок, причина в журнале', async () => {
    mockFetch.mockRejectedValue(new Error('netinfo_down'));
    expect(await spireConfigFallback(new Error('x'))).toBe(SPIRE_CONFIG_DEFAULTS);
    expect((console.warn as jest.Mock).mock.calls.some((c) => String(c[0]).includes('[SPIRE-OFFLINE]') && String(c[0]).includes('netinfo_down'))).toBe(true);
  });

  // 18.10: правило владельца «экранов-ошибок нигде» заменило решение 15.10 — «Нет интернета» на всю вкладку больше не показывается;
  // сбой чтения: сохранённый конфиг не затирается, без него — спокойная фраза замка, чтение повторяется тихо (use_spire_config_quiet_retry).
  it('проводка: сбой конфига → тихий повтор без «Нет интернета»; fallback по сети — только для журнала; экран ≤ 400 строк', () => {
    const screen = read('components/spire/SpireHomeScreen.tsx');
    const hook = read('components/spire/use_spire_config_quiet_retry.ts');
    expect(screen).toContain('configQuietRetry.handleLoadFailure(error, () => alive)');
    expect(screen).not.toContain('offline={config === SPIRE_CONFIG_OFFLINE}');
    expect(hook).toContain('spireConfigFallback(error)');
    expect(hook).toContain('setConfig((cur) => cur ?? fallback)');
    expect(screen.split('\n').length).toBeLessThanOrEqual(400);
    expect(read('components/spire/SpireLockedState.tsx')).toContain("offline ? offlineBannerText(lang)");
    expect(read('components/OfflineBanner.tsx')).toContain('export function offlineBannerText(lang: string): string');
  });
});

describe('Главная: видеорейка без видео', () => {
  const rail = read('components/home/v2/HomeV2VideoRail.tsx');
  it('через 10 с без видео блок скрывается, с появлением видео возвращается сам; в журнале [HOME-VIDEO]', () => {
    expect(rail).toContain('export const VIDEO_RAIL_GIVE_UP_MS = 10_000;');
    expect(rail).toContain('if (!hasVideos && gaveUp) return null;');
    expect(rail).toContain('[HOME-VIDEO] блок скрыт');
    expect(rail).toContain('[HOME-VIDEO] блок возвращён');
    expect(rail).toMatch(/animateNextLayoutTransition\(\);\s*setGaveUp\(true\);/);
    expect(rail).toMatch(/animateNextLayoutTransition\(\);\s*setGaveUp\(false\);/);
  });
});

describe('«Восстановить»: потолок магазина', () => {
  const src = read('app/manage_subscription.tsx');
  it('8 с → снять замок и крутилку, тост «не удалось связаться»; поздний finally старого запуска замок нового не снимает', () => {
    expect(src).toContain('const RESTORE_CEILING_MS = 8000;');
    expect(src).toContain('const runId = ++restoreRunRef.current;');
    expect(src).toContain("emitAppEvent('action_toast', storeUnreachableToast());");
    expect(src).toContain('clearTimeout(ceilingTimer);');
    expect(src).toContain('if (restoreRunRef.current === runId) {');
  });
});

describe('Курс V2: мост карта → занятие', () => {
  it('потеря моста пишет [V2-BRIDGE] с причиной и значениями до возврата на карту', () => {
    const src = read('app/learning_v2_direct_session_player_v1.tsx');
    expect(src).toContain('[V2-BRIDGE] bounce_to_map reason=learning_v2_session_ready_handoff_missing');
  });
});

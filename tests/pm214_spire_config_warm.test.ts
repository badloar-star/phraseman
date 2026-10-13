// зачем (PM-214, координатор 13.10): первый заход в Пик за запуск рисует экран из памяти, а не скелет. Конфиг прогревается из дискового кэша в память
// после первого кадра Главной (и после онбординга), сеть не используется.
import fs from 'node:fs';
import path from 'node:path';
import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const CACHE_KEY = 'spire_config_cache_v1';

type Storage = { setItem: (k: string, v: string) => Promise<void>; clear: () => Promise<void> };

// зачем: изоляция модулей даёт свежую память конфига; хранилище берём из ТОЙ ЖЕ изоляции, иначе клиент и тест видят разные заглушки
function freshClient(): { client: typeof import('../app/spire_config_client'); storage: Storage } {
  let client!: typeof import('../app/spire_config_client');
  let storage!: Storage;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storage = require('@react-native-async-storage/async-storage').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    client = require('../app/spire_config_client');
  });
  return { client, storage };
}

describe('прогрев конфига Пика из диска', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('есть кэш на диске → конфиг в памяти процесса, первый кадр Пика без скелета', async () => {
    const config = { ...SPIRE_CONFIG_DEFAULTS, enabled: true };
    const { client, storage } = freshClient();
    await storage.clear();
    await storage.setItem(CACHE_KEY, JSON.stringify({ fetchedAtMs: Date.now() - 3_600_000, config }));
    expect(client.peekSpireConfig()).toBeNull(); // до прогрева — как раньше, скелет
    await expect(client.warmSpireConfigFromDisk()).resolves.toBe('disk');
    expect(client.peekSpireConfig()?.enabled).toBe(true);
    await expect(client.warmSpireConfigFromDisk()).resolves.toBe('memory'); // повторный вызов дёшев
  });

  it('кэша нет → память пуста, скелет первого захода остаётся (прежнее поведение), причина в журнале', async () => {
    const { client, storage } = freshClient();
    await storage.clear();
    await expect(client.warmSpireConfigFromDisk()).resolves.toBe('none');
    expect(client.peekSpireConfig()).toBeNull();
    expect(console.log).toHaveBeenCalledWith('[PM-214] spire_config_warm', expect.stringContaining('"source":"none"'));
  });

  it('битый кэш не роняет прогрев', async () => {
    const { client, storage } = freshClient();
    await storage.clear();
    await storage.setItem(CACHE_KEY, '{не json');
    await expect(client.warmSpireConfigFromDisk()).resolves.toBe('none');
  });
});

describe('прогрев подключён после первого кадра Главной и после онбординга', () => {
  it('home.tsx: runAfterHomeFirstFrame + holdDuringOnboarding + динамический импорт (первый кадр Главной не тяжелеет)', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("runAfterHomeFirstFrame('spire_config_warm', () => import('../spire_config_client').then((m) => m.warmSpireConfigFromDisk()), { holdDuringOnboarding: true })");
  });

  it('прогрев не ходит в сеть и не затирает конфиг, пришедший с сервера', () => {
    const client = read('app/spire_config_client.ts');
    const start = client.indexOf('export async function warmSpireConfigFromDisk');
    const body = client.slice(start, client.indexOf('// Ленивый импорт', start));
    expect(body).not.toMatch(/getFirestore|\.get\(\)|collection\(/);
    expect(body).toContain('if (configMemory === null) configMemory = cached.config;');
  });

  it('журнал [PM-214] первого кадра Пика на экране', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain("console.log('[PM-214] spire first_frame'");
  });
});

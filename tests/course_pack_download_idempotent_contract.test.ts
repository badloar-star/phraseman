import fs from 'node:fs';
import path from 'node:path';

// ════════════════════════════════════════════════════════════════════════════
// КОРЕНЬ бага Фазы 1 «Бандл-диеты» (найден 2026-08-24 на живом устройстве).
//
// Нативный expo-file-system на Android:
//   if (options?.idempotent != true && destination.exists())
//       throw DestinationAlreadyExistsException()
//
// Загрузчик пака вызывал downloadFileAsync БЕЗ этого флага. Как только файл
// один раз создавался, любая последующая загрузка бросала исключение, оно
// глоталось общим catch и возвращалось как `network_unavailable` — в логе это
// выглядело как «нет сети», хотя сеть была. Пак не собирался НИКОГДА, и вход
// в день всегда падал на bundled-копию.
//
// Тест воспроизводит нативный контракт на моке и проверяет, что загрузчик
// переживает существующий файл.
// ════════════════════════════════════════════════════════════════════════════

jest.mock('../app/course_pack_loader', () => ({
  COURSE_PACK_REMOTE_LOADING_ENABLED: false,
  VERIFIED_COURSE_PACK_REMOTE_ENABLED: true,
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn((_alg: string, data: string) =>
    Promise.resolve(require('crypto').createHash('sha256').update(data).digest('hex'))),
}));

/** Реестр «существующих» файлов — как настоящая файловая система устройства. */
const existingFiles = new Set<string>();
const downloadCalls: Array<{ url: string; idempotent: boolean }> = [];

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      const base = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${base}/${name}` : base;
    }
    get exists() { return existingFiles.has(this.uri); }
    get size() { return existingFiles.has(this.uri) ? 4096 : 0; }
    text() { return Promise.resolve('{"entries":[]}'); }

    // Точная копия нативного контракта Android.
    static downloadFileAsync(url: string, to: MockFile, options?: { idempotent?: boolean }) {
      downloadCalls.push({ url, idempotent: options?.idempotent === true });
      if (options?.idempotent !== true && existingFiles.has(to.uri)) {
        return Promise.reject(new Error('Destination already exists'));
      }
      existingFiles.add(to.uri);
      return Promise.resolve(to);
    }
  }
  class MockDirectory {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      const base = typeof parent === 'string' ? parent : parent.uri;
      this.uri = name ? `${base}/${name}` : base;
    }
    get exists() { return true; }
    create() { /* no-op */ }
    delete() { /* no-op */ }
  }
  return { Paths: { cache: 'file:///cache' }, File: MockFile, Directory: MockDirectory };
});

const MANIFEST = {
  packId: 'en.ru.plan_content.release.test.1',
  studyTarget: 'en',
  sourceLocale: 'ru',
  surface: 'plan_content',
  schemaVersion: 'course-pack-v1',
  contentVersion: 'release.test.1',
  minAppVersion: '1.0.0',
  sha256: 'a'.repeat(64),
  byteSize: 1024,
  createdAt: '2026-08-24T00:00:00.000Z',
  dependencies: [],
  entryIndex: 'index.json',
};

describe('course pack download is idempotent', () => {
  beforeEach(() => {
    existingFiles.clear();
    downloadCalls.length = 0;
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(MANIFEST),
    })) as never;
  });

  it('передаёт idempotent:true — иначе повторная загрузка падает', async () => {
    const mod = await import('../app/course_pack_remote_loader');
    await mod.ensureRemoteCoursePack('https://example.com/manifest.json', (p) => `https://example.com/${p}`);

    expect(downloadCalls.length).toBeGreaterThan(0);
    for (const call of downloadCalls) {
      expect(call.idempotent).toBe(true);
    }
  });

  it('ПОВТОРНАЯ сборка пака проходит, когда index.json уже на диске', async () => {
    const mod = await import('../app/course_pack_remote_loader');

    const first = await mod.ensureRemoteCoursePack(
      'https://example.com/manifest.json', (p) => `https://example.com/${p}`);
    expect(first.state).toBe('ready');

    // Именно этот путь раньше возвращал network_unavailable на каждом запуске.
    const second = await mod.ensureRemoteCoursePack(
      'https://example.com/manifest.json', (p) => `https://example.com/${p}`);
    expect(second.state).toBe('ready');
  });

  it('провал индекса отличим от провала манифеста', async () => {
    const loader = fs.readFileSync(
      path.join(process.cwd(), 'app/course_pack_remote_loader.ts'), 'utf8');
    expect(loader).toContain("'index_download_failed'");
    // Провал манифеста остаётся network_unavailable — состояния не слиты.
    expect(loader).toMatch(/if \(manifest === null\) return \{ state: 'network_unavailable' \}/);
  });
});

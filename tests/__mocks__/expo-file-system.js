// ═══════════════════════════════════════════════════════════════════════════
// tests/__mocks__/expo-file-system.js
//
// зачем: пакет expo-file-system отдаёт TypeScript-ИСХОДНИК (node_modules/
// expo-file-system/src/index.ts), а ts-jest по умолчанию не трансформирует
// node_modules. Любой тест, чей граф импортов задевал этот пакет, падал ещё до
// первого it() с «Jest encountered an unexpected token» и показывал
// «Tests: 0 total» — то есть выглядел защитой, но молча ничего не проверял.
//
// Так молчал tests/paywall_purchase_behavior.test.ts — сторож ДЕНЕЖНОГО пути
// (категории ошибок покупки, обрезка цены стора). Найдено аудитом 2026-08-25.
//
// Почему мок, а не transformIgnorePatterns: трансформация чужого TS в
// node_modules замедляет каждый прогон и тянет реальные нативные модули в
// node-окружение. Проект уже лечит такие пакеты моками через moduleNameMapper
// (expo-constants, expo-crypto, expo-secure-store, async-storage) — здесь тот
// же приём, ровно с тем API, который использует app/course_pack_remote_loader.ts
// и app/personal_plan_exercise.tsx.
//
// Это ФЕЙК В ПАМЯТИ, а не заглушка-пустышка: файлы и папки живут в Map, поэтому
// тест может проверять реальную логику «скачали → лежит → прочитали». Диска не
// касается (в тестах включён sandbox-сторож записи).
// ═══════════════════════════════════════════════════════════════════════════

/** Виртуальный диск: uri → { kind, bytes }. */
const disk = new Map();

function normalizeUri(parts) {
  const joined = parts
    .map((p) => (p && typeof p === 'object' && typeof p.uri === 'string' ? p.uri : String(p ?? '')))
    .filter(Boolean)
    .join('/');
  // Схлопываем повторные слэши, но НЕ трогаем «file://».
  return joined.replace(/(?<!:)\/{2,}/g, '/');
}

class Directory {
  constructor(...parts) {
    this.uri = normalizeUri(parts);
  }

  get exists() {
    return disk.get(this.uri)?.kind === 'dir';
  }

  create(options = {}) {
    if (this.exists) return;
    if (options.intermediates) {
      // Создаём всю цепочку родителей, как настоящий intermediates: true.
      const segments = this.uri.split('/');
      for (let i = 1; i <= segments.length; i += 1) {
        const partial = segments.slice(0, i).join('/');
        if (partial && disk.get(partial)?.kind !== 'file') disk.set(partial, { kind: 'dir' });
      }
      return;
    }
    disk.set(this.uri, { kind: 'dir' });
  }

  delete() {
    // Удаляем каталог вместе со всем, что лежит внутри.
    for (const key of Array.from(disk.keys())) {
      if (key === this.uri || key.startsWith(`${this.uri}/`)) disk.delete(key);
    }
  }

  list() {
    const out = [];
    for (const [key, value] of disk.entries()) {
      if (!key.startsWith(`${this.uri}/`)) continue;
      const rest = key.slice(this.uri.length + 1);
      if (rest.includes('/')) continue; // только прямые дети
      out.push(value.kind === 'dir' ? new Directory(key) : new File(key));
    }
    return out;
  }
}

class File {
  constructor(...parts) {
    this.uri = normalizeUri(parts);
  }

  get exists() {
    return disk.get(this.uri)?.kind === 'file';
  }

  get size() {
    const entry = disk.get(this.uri);
    return entry?.kind === 'file' ? entry.bytes.length : null;
  }

  create() {
    if (!this.exists) disk.set(this.uri, { kind: 'file', bytes: Buffer.alloc(0) });
  }

  write(contents) {
    disk.set(this.uri, {
      kind: 'file',
      bytes: Buffer.isBuffer(contents) ? contents : Buffer.from(String(contents), 'utf8'),
    });
  }

  async text() {
    const entry = disk.get(this.uri);
    if (entry?.kind !== 'file') throw new Error(`ENOENT: ${this.uri}`);
    return entry.bytes.toString('utf8');
  }

  async bytes() {
    const entry = disk.get(this.uri);
    if (entry?.kind !== 'file') throw new Error(`ENOENT: ${this.uri}`);
    return new Uint8Array(entry.bytes);
  }

  delete() {
    disk.delete(this.uri);
  }

  /**
   * зачем idempotent: без него настоящий Android бросает
   * DestinationAlreadyExistsException — на этом уже горел прод (память
   * project_expo_download_idempotent_trap). Мок повторяет тот же контракт,
   * чтобы тест ловил регрессию, а не маскировал её.
   */
  static downloadFileAsync = jest.fn(async (url, destination, options = {}) => {
    const target = destination instanceof File ? destination : new File(destination);
    if (target.exists && !options.idempotent) {
      throw new Error('DestinationAlreadyExistsException');
    }
    target.write(`mock-download:${url}`);
    return target;
  });
}

const Paths = {
  cache: 'file:///mock/cache',
  document: 'file:///mock/documents',
};

module.exports = {
  Directory,
  File,
  Paths,
  /** Сброс виртуального диска между тестами. */
  __reset: () => {
    disk.clear();
    File.downloadFileAsync.mockClear();
    File.downloadFileAsync.mockImplementation(async (url, destination, options = {}) => {
      const target = destination instanceof File ? destination : new File(destination);
      if (target.exists && !options.idempotent) {
        throw new Error('DestinationAlreadyExistsException');
      }
      target.write(`mock-download:${url}`);
      return target;
    });
  },
};

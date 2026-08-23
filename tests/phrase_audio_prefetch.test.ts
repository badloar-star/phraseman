// Контракт фоновой докачки озвучки пачкой. Проверяем поведение, которое легко
// сломать незаметно: приоритет головы, уважение к мобильному тарифу, отмена при
// уходе с экрана и молчаливая живучесть при ошибках сети.

const downloads: string[] = [];
let netStatus: 'online' | 'offline' | 'unknown' = 'online';
let ensureImpl: (text: string, url: string) => Promise<boolean> = async (text) => {
  downloads.push(text);
  return true;
};

jest.mock('../app/phrase_audio_url_map.generated', () => ({
  getPhraseAudioUrl: (text: string) =>
    text.startsWith('нет-клипа') ? undefined : `https://cdn.test/${encodeURIComponent(text)}.mp3`,
  normalizePhraseAudioKey: (t: string) => t.trim().toLowerCase(),
}));

jest.mock('../app/net_status', () => ({ getNetStatus: () => netStatus }));

jest.mock('../app/interactive_network_quiet', () => ({
  withBackgroundNetworkLease: async (
    _source: string,
    run: (lease: { signal: AbortSignal; assertCurrent(): void }) => Promise<void>,
  ) => run({ signal: new AbortController().signal, assertCurrent() {} }),
}));

jest.mock('../hooks/phrase_audio_player', () => ({
  ensurePhraseAudioCached: (text: string, url: string) => ensureImpl(text, url),
}));

import { prefetchPhraseAudio, cancelPhraseAudioPrefetch } from '../hooks/phrase_audio_prefetch';

const flush = async (): Promise<void> => {
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
};

const wifi = { fetch: async () => ({ type: 'wifi', isConnectionExpensive: false }) };
const cellular = { fetch: async () => ({ type: 'cellular', isConnectionExpensive: true }) };

beforeEach(() => {
  downloads.length = 0;
  netStatus = 'online';
  ensureImpl = async (text: string) => {
    downloads.push(text);
    return true;
  };
  cancelPhraseAudioPrefetch();
});

describe('prefetchPhraseAudio', () => {
  it('качает весь список на Wi-Fi', async () => {
    const texts = Array.from({ length: 12 }, (_, i) => `фраза ${i}`);
    prefetchPhraseAudio(texts, { netInfo: wifi });
    await flush();
    expect(downloads).toHaveLength(12);
  });

  it('первые фразы качаются раньше остальных — их услышат первыми', async () => {
    const texts = Array.from({ length: 10 }, (_, i) => `фраза ${i}`);
    prefetchPhraseAudio(texts, { netInfo: wifi });
    await flush();
    // Голова идёт строго по порядку; хвост может прийти в любом порядке.
    expect(downloads.slice(0, 5)).toEqual(['фраза 0', 'фраза 1', 'фраза 2', 'фраза 3', 'фраза 4']);
  });

  it('на мобильном интернете качает только начало — уважает лимитный тариф', async () => {
    const texts = Array.from({ length: 50 }, (_, i) => `фраза ${i}`);
    prefetchPhraseAudio(texts, { netInfo: cellular });
    await flush();
    expect(downloads.length).toBeLessThanOrEqual(8);
    expect(downloads.length).toBeGreaterThan(0);
  });

  it('офлайн не качает ничего', async () => {
    netStatus = 'offline';
    prefetchPhraseAudio(['фраза 1', 'фраза 2'], { netInfo: wifi });
    await flush();
    expect(downloads).toHaveLength(0);
  });

  it('пропускает фразы, для которых нет клипа', async () => {
    prefetchPhraseAudio(['нет-клипа 1', 'обычная', 'нет-клипа 2'], { netInfo: wifi });
    await flush();
    expect(downloads).toEqual(['обычная']);
  });

  it('дубли не качаются дважды', async () => {
    prefetchPhraseAudio(['одна', 'одна', 'одна', 'другая'], { netInfo: wifi });
    await flush();
    expect(downloads).toEqual(['одна', 'другая']);
  });

  it('новая пачка отменяет прошлую — экран сменился, старые файлы не нужны', async () => {
    const gate: { release: (() => void) | null } = { release: null };
    ensureImpl = async (text: string) => {
      downloads.push(text);
      if (text === 'старая 0') await new Promise<void>((r) => { gate.release = r; });
      return true;
    };

    prefetchPhraseAudio(Array.from({ length: 20 }, (_, i) => `старая ${i}`), { netInfo: wifi });
    await flush();
    prefetchPhraseAudio(['новая 0'], { netInfo: wifi });
    gate.release?.();
    await flush();

    expect(downloads).toContain('новая 0');
    // Прошлая пачка не должна была докачаться до конца.
    expect(downloads.filter((t) => t.startsWith('старая'))).not.toHaveLength(20);
  });

  it('cancel() останавливает пачку', async () => {
    const gate: { release: (() => void) | null } = { release: null };
    ensureImpl = async (text: string) => {
      downloads.push(text);
      if (text === 'фраза 0') await new Promise<void>((r) => { gate.release = r; });
      return true;
    };

    const handle = prefetchPhraseAudio(Array.from({ length: 20 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    handle.cancel();
    gate.release?.();
    await flush();

    expect(downloads.length).toBeLessThan(20);
  });

  it('ошибка в голове не роняет пачку и не обрывает очередь', async () => {
    // 'фраза 1' попадает в голову (первые 5) — самый опасный случай: раньше
    // её throw уходил в необработанный reject и валил процесс целиком.
    ensureImpl = async (text: string) => {
      if (text === 'фраза 1') throw new Error('сеть отвалилась');
      downloads.push(text);
      return true;
    };
    prefetchPhraseAudio(Array.from({ length: 8 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    // Упала одна — скачались остальные семь.
    expect(downloads).toHaveLength(7);
    expect(downloads).not.toContain('фраза 1');
    expect(downloads).toContain('фраза 7');
  });

  it('ошибка в хвосте не уносит с собой остаток очереди', async () => {
    ensureImpl = async (text: string) => {
      if (text === 'фраза 6') throw new Error('сеть отвалилась');
      downloads.push(text);
      return true;
    };
    prefetchPhraseAudio(Array.from({ length: 12 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    expect(downloads).toHaveLength(11);
    expect(downloads).not.toContain('фраза 6');
    expect(downloads).toContain('фраза 11');
  });

  it('пустой вызов НЕ отменяет уже идущую пачку', async () => {
    // Экран часто зовёт предзагрузку в момент, когда фразы ещё не пришли.
    // Такой пустой вызов не должен убивать полезную очередь.
    const gate: { release: (() => void) | null } = { release: null };
    ensureImpl = async (text: string) => {
      downloads.push(text);
      if (text === 'фраза 0') await new Promise<void>((r) => { gate.release = r; });
      return true;
    };

    prefetchPhraseAudio(Array.from({ length: 10 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    prefetchPhraseAudio([], { netInfo: wifi });
    gate.release?.();
    await flush();

    expect(downloads).toHaveLength(10);
  });

  it('список без единого клипа тоже не отменяет идущую пачку', async () => {
    const gate: { release: (() => void) | null } = { release: null };
    ensureImpl = async (text: string) => {
      downloads.push(text);
      if (text === 'фраза 0') await new Promise<void>((r) => { gate.release = r; });
      return true;
    };

    prefetchPhraseAudio(Array.from({ length: 10 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    prefetchPhraseAudio(['нет-клипа 1', 'нет-клипа 2'], { netInfo: wifi });
    gate.release?.();
    await flush();

    expect(downloads).toHaveLength(10);
  });

  it('огромный раздел режется потолком, и усечение ВИДНО вызывающему коду', async () => {
    // Словарь — 992 слова. Молча загрузить начало и промолчать нельзя:
    // вызывающий должен знать, что предзагружен не весь раздел.
    const texts = Array.from({ length: 500 }, (_, i) => `фраза ${i}`);
    const handle = prefetchPhraseAudio(texts, { netInfo: wifi });
    await flush();

    expect(handle.truncated).toBeGreaterThan(0);
    expect(handle.planned + handle.truncated).toBe(500);
    expect(downloads.length).toBe(handle.planned);
  });

  it('раздел, влезающий в потолок, не считается усечённым', async () => {
    const handle = prefetchPhraseAudio(Array.from({ length: 20 }, (_, i) => `фраза ${i}`), { netInfo: wifi });
    await flush();
    expect(handle.truncated).toBe(0);
    expect(handle.planned).toBe(20);
  });

  it('без NetInfo считает сеть недорогой — иначе предзагрузка молча отключилась бы', async () => {
    const texts = Array.from({ length: 12 }, (_, i) => `фраза ${i}`);
    prefetchPhraseAudio(texts, { netInfo: null });
    await flush();
    expect(downloads).toHaveLength(12);
  });
});

// зачем (аудит «пропала сеть», 13.10, п.6): вход в комнату Шпиля ждал нативные ~60–70 с. Теперь у callable потолок 18 с,
// а истёкший потолок для человека — «нет сети» (кэш недели и понятное сообщение), а не «сервис сломан».
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { SPIRE_CALLABLE_TIMEOUT_MS, spireClassifyNetError } from '../app/spire/spire_net';

describe('Шпиль: потолок callable', () => {
  it('deadline-exceeded (код или текст) → offline; пауза миграции → paused; прочее — как раньше', () => {
    expect(spireClassifyNetError({ code: 'functions/deadline-exceeded', message: 'DEADLINE_EXCEEDED' })).toBe('offline');
    expect(spireClassifyNetError({ code: 'deadline-exceeded' })).toBe('offline');
    expect(spireClassifyNetError(new Error('deadline exceeded'))).toBe('offline');
    expect(spireClassifyNetError(new Error('spire_migration_paused'))).toBe('paused');
    expect(spireClassifyNetError({ code: 'unavailable' })).toBe('offline');
  });

  it('потолок вызова больше серверного (15 с) и передаётся в httpsCallable', () => {
    expect(SPIRE_CALLABLE_TIMEOUT_MS).toBeGreaterThan(15_000);
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'spire_net.ts'), 'utf8');
    expect(src).toContain('httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name, { timeout: SPIRE_CALLABLE_TIMEOUT_MS })');
  });
});

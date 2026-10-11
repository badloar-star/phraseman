// зачем (владелец 11.10): Шпиль в первом выпуске только для интерфейса ru и uk — для каждого из 9 языков виден/скрыт,
// смена языка на лету скрывает сразу, закрытые языком ворота не тратят чтения на перечит рубильников.
import fs from 'fs';
import path from 'path';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const mockRefreshRemoteConfigNow = jest.fn(async () => undefined);
jest.mock('../app/remote_config_client', () => ({
  readRemoteConfigCacheRaw: jest.fn(async () => null),
  refreshRemoteConfigNow: () => mockRefreshRemoteConfigNow(),
}));
jest.mock('../app/spire_config_client', () => ({
  invalidateSpireConfigCache: jest.fn(async () => undefined),
  loadSpireConfig: jest.fn(async () => null),
}));

import { writePeekAppLang } from '../app/app_snapshot_bootstrap';
import { isSpireTabEnabled, setSpireTabDevOverride } from '../app/spire_tab_flag';
import { refreshSpireTabFlagIfClosed } from '../app/spire_gate_refresh';
import { SPIRE_UI_LANGS, spireUiLangDecision } from '../app/spire/spire_ui_lang_gate';

const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('Шпиль только для интерфейса ru/uk', () => {
  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await setSpireTabDevOverride(true);
  });
  afterAll(() => jest.restoreAllMocks());

  it.each(UI_LANGS)('интерфейс %s', (lang) => {
    writePeekAppLang(lang);
    expect(isSpireTabEnabled()).toBe(lang === 'ru' || lang === 'uk');
  });

  it('язык ещё не известен — скрыт; список разрешённых — ровно ru и uk', () => {
    writePeekAppLang(null);
    expect(isSpireTabEnabled()).toBe(false);
    expect([...SPIRE_UI_LANGS]).toEqual(['ru', 'uk']);
    expect(spireUiLangDecision('es').reason).toBe('ui_lang_not_supported');
  });

  it('смена ru → es посреди недели скрывает Шпиль сразу, без перезапуска', () => {
    writePeekAppLang('ru');
    expect(isSpireTabEnabled()).toBe(true);
    writePeekAppLang('es');
    expect(isSpireTabEnabled()).toBe(false);
  });

  it('флаг вкладки выключен — скрыт и для ru', async () => {
    writePeekAppLang('ru');
    await setSpireTabDevOverride(false);
    expect(isSpireTabEnabled()).toBe(false);
    await setSpireTabDevOverride(true);
  });

  it('закрыто языком — перечит рубильников не делается (экономия чтений)', async () => {
    writePeekAppLang('es');
    mockRefreshRemoteConfigNow.mockClear();
    await expect(refreshSpireTabFlagIfClosed('test', { force: true })).resolves.toBe(false);
    expect(mockRefreshRemoteConfigNow).not.toHaveBeenCalled();
  });
});

describe('входы в Шпиль за тем же замком (контракт по исходнику)', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it('плитка Главной', () => {
    expect(read('app/(tabs)/home.tsx')).toContain("available: isLearningSurfaceReady(studyTarget, 'spire') && spireTabEnabled,");
  });
  it('тап по пушу Шпиля проверяет замок и ведёт на Главную', () => {
    const src = read('app/notification_tap_handler.ts');
    expect(src).toContain('if (isSpireTabEnabled()) {');
    expect(src).toContain("action: 'redirect_home'");
  });
  it('ссылка ?section=spire в «Сообществе» уводит на Главную', () => {
    expect(read('app/(tabs)/community.tsx')).toContain("router.replace('/(tabs)/home');");
  });
  it('задания дня берут тот же замок', () => {
    expect(read('hooks/use_today_tasks.ts')).toContain('isSpireTabEnabled()');
  });
});

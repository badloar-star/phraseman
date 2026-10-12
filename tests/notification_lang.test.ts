// зачем (§AUTH-0110, координатор 12.10): пуши «энергия восполнена» и «серия потеряна» уходили по-русски для en / pt-BR / vi / id / tr / pl —
// язык брался как `uk ? uk : es ? es : ru`. Сторож: язык пуша = язык интерфейса на всех включённых языках, мусор → язык устройства.
import fs from 'node:fs';
import path from 'node:path';
import { coerceInterfaceLang, getDeviceBootstrapLocale } from '../constants/i18n';
import { resolveNotificationLang } from '../app/notification_lang';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('notification language follows the interface language', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('keeps every enabled interface language instead of falling back to ru', () => {
    const codes = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    for (const code of codes) {
      const enabled = coerceInterfaceLang(code);
      expect(resolveNotificationLang(code, 'test')).toBe(enabled ?? getDeviceBootstrapLocale());
    }
    // en / pt-BR / vi / id / tr / pl больше не превращаются в ru, если они включены
    for (const code of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      if (coerceInterfaceLang(code)) expect(resolveNotificationLang(code, 'test')).toBe(code);
    }
  });

  it('falls back to the device language for an absent or unknown value and logs it', () => {
    const log = jest.spyOn(console, 'log');
    expect(resolveNotificationLang(null, 'energy_full')).toBe(getDeviceBootstrapLocale());
    expect(resolveNotificationLang('klingon', 'energy_full')).toBe(getDeviceBootstrapLocale());
    expect(log.mock.calls.some(([line]) => String(line).includes('[LANG-SWITCH] notification_lang source=energy_full'))).toBe(true);
  });

  it('is used by the energy-full and streak-lost pushes; the ru/uk/es shortcut is gone', () => {
    const energy = read('components/EnergyContext.tsx');
    const streak = read('app/hall_of_fame_utils.ts');
    expect(energy).toContain("resolveNotificationLang(raw, 'energy_full')");
    expect(streak).toContain("resolveNotificationLang(value, 'streak_lost')");
    for (const src of [energy, streak]) {
      expect(src).not.toMatch(/=== 'uk' \? 'uk' : \w+ === 'es' \? 'es' : 'ru'/);
    }
  });
});

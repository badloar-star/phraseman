// зачем (координатор 12.10, п.76 «английский интерфейс в R1»; падение 27.08): включение ENGLISH_UI_LOCALE_ENABLED уронило прод —
// словари Record<Lang,…> без ключа `en` (STUDIO_COPY[lang] и др.) отдавали undefined, экраны падали; tsc тогда «молчал» из-за
// нехватки памяти. Предполётка СТРОЖЕ сторожей «не растёт» (i18n_missing_en_fallback): перед включением словарей без `en` должно
// быть РОВНО ноль, прямых чтений словаря по языку без защиты — ноль, а с включённым флагом `en` обязан проходить как язык интерфейса.
// Новый словарь без английского ключа ломает этот тест — так и задумано.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const runScript = (name: string): string =>
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', name)], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });

describe('English interface enable preflight (crash of 27.08 must not repeat)', () => {
  it('there are ZERO language dictionaries without an English key (baseline and live scan)', () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'missing-en-baseline.json'), 'utf8')) as { total: number };
    expect(baseline.total).toBe(0);
    expect(runScript('scan_missing_en_dictionaries.mjs')).toContain('OK: 0 словарей без en');
  });

  it('no unguarded direct read DICT[lang] of a dictionary without `en`', () => {
    expect(runScript('scan_direct_lang_index.mjs')).toContain('OK');
  });

  it('with the flag on, `en` is a real interface language; with it off, behaviour is unchanged', () => {
    const load = (englishOn: boolean): typeof import('../constants/i18n') => {
      let mod!: typeof import('../constants/i18n');
      jest.isolateModules(() => {
        jest.doMock('../app/config', () => ({ ...jest.requireActual('../app/config'), ENGLISH_UI_LOCALE_ENABLED: englishOn }));
        jest.doMock('../app/dev_ui_lang', () => ({ isDevUiLangEnOn: () => false }));
        mod = require('../constants/i18n');
      });
      return mod;
    };
    const on = load(true);
    expect(on.coerceInterfaceLang('en')).toBe('en');
    expect(on.triLang('en', { ru: 'Привет', uk: 'Привіт', en: 'Hello', es: 'Hola' })).toBe('Hello');
    const off = load(false);
    expect(off.coerceInterfaceLang('en')).not.toBe('en');
    jest.dontMock('../app/config');
    jest.dontMock('../app/dev_ui_lang');
  });
});

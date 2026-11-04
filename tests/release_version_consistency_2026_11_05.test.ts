// зачем (ночной выпуск 05.11, pre-flight EAS): версия, versionCode, buildNumber и runtimeVersion меняются ВРУЧНУЮ в app.json (eas.json: appVersionSource=local, autoIncrement=false),
// поэтому один забытый номер роняет сабмит или выпускает OTA не на тот runtime. Сторож: числа согласованы; профиль production и сабмит iOS не отправляют на ревью;
// для Android сабмита в скрипте сборки нет (в Google Play ничего не уходит автоматически).
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const expo = json('app.json').expo;
const eas = json('eas.json');

describe('согласованность версий релиза (app.json)', () => {
  it('version — semver, runtimeVersion совпадает с version (новый JS/нативка → новый runtime, OTA не уходит на чужой бинарник)', () => {
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(expo.runtimeVersion).toBe(expo.version);
  });
  it('android.versionCode и ios.buildNumber — одно целое число (общая нумерация сборок)', () => {
    expect(Number.isInteger(expo.android.versionCode)).toBe(true);
    expect(expo.android.versionCode).toBeGreaterThanOrEqual(1);
    expect(String(expo.ios.buildNumber)).toBe(String(expo.android.versionCode));
  });
  it('идентификаторы приложения совпадают на обеих платформах', () => {
    expect(expo.android.package).toBe(expo.ios.bundleIdentifier);
  });
});

describe('eas.json: профиль production и сабмит', () => {
  it('версия — из app.json (appVersionSource local), без автоувеличения; коммит обязателен', () => {
    expect(eas.cli.appVersionSource).toBe('local');
    expect(eas.cli.requireCommit).toBe(true);
    expect(eas.build.production.autoIncrement).toBe(false);
  });
  it('production: канал production, окружение production, стор-режим включён', () => {
    expect(eas.build.production.channel).toBe('production');
    expect(eas.build.production.environment).toBe('production');
    expect(eas.build.production.env.EXPO_PUBLIC_STORE_RELEASE).toBe('1');
  });
  it('сабмит iOS: только ascAppId, ни одного параметра, который сам отправляет на ревью', () => {
    const ios = eas.submit.production.ios;
    expect(typeof ios.ascAppId).toBe('string');
    expect(Object.keys(ios).sort()).toEqual(['ascAppId']);
  });
  it('скрипт сборки из HEAD: --auto-submit только в строках iOS; у Android сабмита нет', () => {
    const script = fs.readFileSync(path.join(root, 'scripts/eas_build_from_head.sh'), 'utf8').replace(/\r\n/g, '\n');
    const commands = script.split('\n').filter((l) => /^\s*npx eas build\b/.test(l));
    expect(commands.length).toBeGreaterThanOrEqual(2);
    for (const line of commands.filter((l) => l.includes('--auto-submit'))) expect(line).toContain('--platform ios');
    for (const line of commands.filter((l) => l.includes('--platform android'))) {
      expect(line).not.toContain('--auto-submit');
      expect(line).toContain('--non-interactive');
    }
  });
});

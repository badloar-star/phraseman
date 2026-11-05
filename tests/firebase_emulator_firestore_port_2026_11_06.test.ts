// E2E 06.11: порт 8080 на ПК разработчика занят Open WebUI → Firestore-эмулятор на 8085 (firebase.e2e.json), приложение узнаёт порт из EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT (только dev).
import fs from 'node:fs';
import path from 'node:path';
import { FIREBASE_EMULATOR_PORTS, resolveFirestoreEmulatorPort } from '../app/firebase_emulator_dev';

const ROOT = path.resolve(__dirname, '..');

describe('resolveFirestoreEmulatorPort', () => {
  it('нет переменной — порт из firebase.json', () => {
    expect(resolveFirestoreEmulatorPort(undefined)).toBe(FIREBASE_EMULATOR_PORTS.firestore);
    expect(resolveFirestoreEmulatorPort('')).toBe(FIREBASE_EMULATOR_PORTS.firestore);
  });
  it('верное число принимается', () => {
    expect(resolveFirestoreEmulatorPort('8085')).toBe(8085);
    expect(resolveFirestoreEmulatorPort(' 8086 ')).toBe(8086);
  });
  it.each(['abc', '80', '70000', '8085.5', '-1'])('мусор «%s» — порт по умолчанию', (raw) => {
    expect(resolveFirestoreEmulatorPort(raw)).toBe(FIREBASE_EMULATOR_PORTS.firestore);
  });
});

describe('E2E-эмуляторы только на loopback и согласованы со скриптами', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.e2e.json'), 'utf8')) as { emulators: Record<string, { port?: number; host?: string }> };
  it('Auth 9099 и Firestore 8085 слушают только 127.0.0.1', () => {
    expect(cfg.emulators.auth).toMatchObject({ port: 9099, host: '127.0.0.1' });
    expect(cfg.emulators.firestore).toMatchObject({ port: 8085, host: '127.0.0.1' });
  });
  it('скрипты используют этот конфиг и порт', () => {
    const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(read('scripts/e2e/start_emulators.sh')).toContain('--config firebase.e2e.json');
    expect(read('scripts/e2e/seed.mjs')).toContain("'127.0.0.1:8085'");
    expect(read('scripts/e2e/metro_emulator.sh')).toContain('EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT=8085');
  });
});

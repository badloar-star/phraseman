// зачем (удобство №5, владелец одобрил 04.11): размер, время блица и направление «вспомни и напиши» помнятся по режиму — «Начать» одним тапом.
// Сторож: разбор/слияние записи, ключ в стираемой семье на владельца, восстановление только поверх значений по умолчанию, запись в фоне при «Начать».
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));

import { mergeTrainingSetupPrefs, parseTrainingSetupPrefs, trainingSetupPrefsKey } from '../app/flashcards/training_setup_prefs';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('настройки тренировки карточек помнятся', () => {
  it('ключ в стираемой семье story_events_v1 и на владельца', () => {
    expect(trainingSetupPrefsKey('abc')).toBe('story_events_v1:cards_training_setup_prefs:abc');
  });
  it('запись режима переживает слияние другого режима (без мутации прежней записи)', () => {
    const first = mergeTrainingSetupPrefs(null, 'blitz', { size: '20', sec: '90', dir: 'to_target' });
    const second = mergeTrainingSetupPrefs(first, 'recall', { size: 'all', sec: '60', dir: 'to_source' });
    expect(parseTrainingSetupPrefs(second, 'blitz')).toEqual({ size: '20', sec: '90', dir: 'to_target' });
    expect(parseTrainingSetupPrefs(second, 'recall')).toEqual({ size: 'all', sec: '60', dir: 'to_source' });
    expect(parseTrainingSetupPrefs(first, 'recall')).toBeNull();
  });
  it('недопустимые значения и мусор не ломают экран — возвращается null', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseTrainingSetupPrefs('{bad json', 'blitz')).toBeNull();
    expect(parseTrainingSetupPrefs(JSON.stringify({ v: 1, modes: { blitz: { size: '7', sec: '60', dir: 'to_target' } } }), 'blitz')).toBeNull();
    expect(parseTrainingSetupPrefs(JSON.stringify({ v: 2, modes: { blitz: { size: '10', sec: '60', dir: 'to_target' } } }), 'blitz')).toBeNull();
    expect(parseTrainingSetupPrefs(null, 'blitz')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('экран: восстановление только поверх значений по умолчанию и запись в фоне при «Начать»', () => {
    const screen = read('app/flashcards_training_setup.tsx');
    expect(screen).toContain("setSizeId((prev) => (prev === '20' ? saved.size : prev));");
    expect(screen).toContain("setSecId((prev) => (prev === '60' ? saved.sec : prev));");
    expect(screen).toContain("setDirId((prev) => (prev === 'to_target' ? saved.dir : prev));");
    expect(screen).toContain('void writeTrainingSetupPrefs(mode, { size: sizeId, sec: secId, dir: dirId });');
  });
  it('без сети и Firebase', () => {
    const logic = read('app/flashcards/training_setup_prefs.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(logic).not.toMatch(/firebase|firestore|fetch\(/i);
  });
});

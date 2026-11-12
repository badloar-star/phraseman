/**
 * зачем (координатор 12.11, Performance Bible «первый кадр — окончательный»): экран «Навыки» и карточка статистики на
 * холодном старте рисовали нули, пока сами не дочитают диск, — число и звезда прыгали. Стартовое чтение снимка кладёт
 * очки в память до первого кадра; peekSkills() должен отдать их синхронно.
 */
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __skillStoreTestHooks as hooks, peekSkills, primeSkillsFromBoot, recordSkillAction, refreshSkills, skillsStorageKey,
} from '../modules/skills/skill_store';

const NOON = new Date(2026, 10, 11, 12, 0, 0).getTime();
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  hooks.setDeps({ now: () => NOON, ownerStableId: async () => 'owner-a' });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Сохранить очки и «перезапустить приложение»: память пуста, диск остался. */
async function savedThenColdStart(): Promise<string | null> {
  await recordSkillAction({ action: 'lesson_phrase_first_try', itemKey: 'p1' });
  const raw = await AsyncStorage.getItem(skillsStorageKey('owner-a'));
  hooks.reset();
  hooks.setDeps({ now: () => NOON, ownerStableId: async () => 'owner-a' });
  return raw;
}

it('ключ стартового чтения совпадает с ключом хранилища', () => {
  expect(skillsStorageKey('owner-a')).toBe('skills_v1:owner-a');
});

it('холодный старт без прогрева: первый кадр видит null — это и были нули', async () => {
  await savedThenColdStart();
  expect(peekSkills()).toBeNull();
});

it('после стартового чтения первый кадр получает сохранённые очки синхронно, не нули', async () => {
  const raw = await savedThenColdStart();
  primeSkillsFromBoot(raw, 'owner-a');
  const first = peekSkills();
  expect(first).not.toBeNull();
  expect(first?.totals.grammar).toBe(3);
});

it('догрузка экрана после прогрева не меняет числа — прыжка нет', async () => {
  const raw = await savedThenColdStart();
  primeSkillsFromBoot(raw, 'owner-a');
  const before = peekSkills()?.totals;
  const after = (await refreshSkills()).totals;
  expect(after).toEqual(before);
});

it('прогрев не затирает память, которую уже заполнило начисление', async () => {
  const raw = await savedThenColdStart();
  await recordSkillAction({ action: 'recall_written', itemKey: 'w1' });
  const live = peekSkills()?.totals;
  primeSkillsFromBoot(raw, 'owner-a');
  expect(peekSkills()?.totals).toEqual(live);
});

it('новый человек без сохранённых очков: прогрев кладёт настоящие нули, не null', () => {
  primeSkillsFromBoot(null, 'owner-a');
  expect(peekSkills()?.totals.grammar).toBe(0);
});

it('стартовое чтение несёт ключ навыков в общем multiGet и греет память до публикации снимка', () => {
  const src = read('app/app_snapshot_bootstrap.ts');
  expect(src).toContain("import { primeSkillsFromBoot, skillsStorageKey } from '../modules/skills/skill_store';");
  expect(src).toContain('...(skillsKey ? [skillsKey] : []),');
  const primeAt = src.indexOf('primeSkillsFromBoot(values.get(skillsKey)');
  expect(primeAt).toBeGreaterThan(-1);
  expect(primeAt).toBeLessThan(src.indexOf('patchAppSnapshot((current) => ({\n    profile,'));
});

it('экран «Навыки» читает память синхронно, а Главная держит запасной прогрев после первого кадра', () => {
  expect(read('app/skills.tsx')).toContain('useSyncExternalStore(subscribeSkills, peekSkills, peekSkills)');
  expect(read('app/(tabs)/home.tsx')).toContain("runAfterHomeFirstFrame('skills_warm', () => import('../../modules/skills/skill_store').then((m) => m.refreshSkills()))");
});

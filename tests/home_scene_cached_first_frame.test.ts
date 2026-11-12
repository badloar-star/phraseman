/**
 * зачем (координатор 12.11, журнал [HOME-FIT]: высота сцены на холодном старте 280 → 325 (заготовка) → 333 → 306 — всё ниже
 * съезжало): первый кадр сцены рисует последний показанный текст из кэша. Состояние не изменилось → тело сцены первого кадра
 * совпадает с итоговым (та же высота). Заготовка — только без кэша (самый первый запуск).
 */
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

let owner: string | null = 'owner-scene-1';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: owner ? 'active' : 'uninitialized', stableId: owner, generation: 1 }),
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));

import type { HomeSceneCopy } from '../components/home/v2/scene/home_scene_copy';
import {
  __homeSceneCopyCacheTestHooks as hooks,
  bodyFromCopy,
  homeSceneCopyCacheKey,
  peekHomeSceneBodyCopy,
  primeHomeSceneCopyFromBoot,
  rememberHomeSceneBodyCopy,
  resolveHomeSceneBody,
} from '../components/home/v2/scene/home_scene_copy_cache';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const FINAL: HomeSceneCopy = {
  kicker: 'С возвращением!', title: 'Урок 13', line: 'Тебя не было 13 дней. Начни с короткого повтора', bar: 0.4,
  warm: null, cta: 'Продолжить', note: null, chips: [],
};
/** Пока место продолжения читается, текст ещё пустой (как в журнале [HOME-HERO] pending:true). */
const PENDING: HomeSceneCopy = { ...FINAL, kicker: '', title: '', line: null, bar: null };

beforeEach(async () => {
  hooks.reset();
  await AsyncStorage.clear();
  owner = 'owner-scene-1';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Показали итоговый текст → «перезапуск»: память пуста, стартовое чтение достаёт запись с диска. */
async function shownThenColdStart(): Promise<void> {
  rememberHomeSceneBodyCopy(bodyFromCopy(FINAL, 'welcome_back', 'ru'));
  await flush();
  const raw = await AsyncStorage.getItem(homeSceneCopyCacheKey('owner-scene-1'));
  hooks.reset();
  primeHomeSceneCopyFromBoot(raw, 'owner-scene-1');
}

it('самый первый запуск без кэша: заготовка', () => {
  const frame = resolveHomeSceneBody({ pending: true, copy: PENDING, state: 'continue', lang: 'ru', cached: peekHomeSceneBodyCopy('ru') });
  expect(frame.mode).toBe('skeleton');
});

it('кэш есть и состояние не изменилось: тело первого кадра = итоговому (высота та же, сдвига нет)', async () => {
  await shownThenColdStart();
  const first = resolveHomeSceneBody({ pending: true, copy: PENDING, state: 'continue', lang: 'ru', cached: peekHomeSceneBodyCopy('ru') });
  const final = resolveHomeSceneBody({ pending: false, copy: FINAL, state: 'welcome_back', lang: 'ru', cached: null });
  expect(first.mode).toBe('cached');
  const rows = (b: typeof first.body) => b && { kicker: b.kicker, title: b.title, warm: b.warm, line: b.line, bar: b.bar };
  expect(rows(first.body)).toEqual(rows(final.body));
});

it('кэш чужого аккаунта или другого языка интерфейса не показывается', async () => {
  await shownThenColdStart();
  expect(peekHomeSceneBodyCopy('uk')).toBeNull();
  owner = 'someone-else';
  expect(peekHomeSceneBodyCopy('ru')).toBeNull();
});

it('без аккаунта текст не запоминается', async () => {
  owner = null;
  rememberHomeSceneBodyCopy(bodyFromCopy(FINAL, 'welcome_back', 'ru'));
  await flush();
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

it('битая запись на диске — заготовка, без падения', () => {
  primeHomeSceneCopyFromBoot('{not json', 'owner-scene-1');
  expect(peekHomeSceneBodyCopy('ru')).toBeNull();
  primeHomeSceneCopyFromBoot(JSON.stringify({ lang: 'ru' }), 'owner-scene-1');
  expect(peekHomeSceneBodyCopy('ru')).toBeNull();
});

it('проводка: сцена рисует тело через resolveHomeSceneBody и запоминает обычную сцену; стартовое чтение греет кэш до публикации снимка', () => {
  const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
  expect(stage).toContain("resolveHomeSceneBody({ pending, copy, state, lang, cached: pending ? peekHomeSceneBodyCopy(lang) : null })");
  expect(stage).toContain("bodyFrame.mode === 'skeleton' ? (");
  expect(stage).toContain('if (pending || specialKey) return;');
  const boot = read('app/app_snapshot_bootstrap.ts');
  expect(boot).toContain('...(sceneCopyKey ? [sceneCopyKey] : []),');
  const primeAt = boot.indexOf('primeHomeSceneCopyFromBoot(values.get(sceneCopyKey)');
  expect(primeAt).toBeGreaterThan(-1);
  expect(primeAt).toBeLessThan(boot.indexOf('patchAppSnapshot((current) => ({\n    profile,'));
});

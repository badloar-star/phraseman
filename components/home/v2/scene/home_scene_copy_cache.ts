// ════════════════════════════════════════════════════════════════════════════
// home_scene_copy_cache.ts — последний показанный текст сцены Главной для первого кадра.
//
// зачем (координатор 12.11, обход 4 + журнал [HOME-FIT]: на каждом холодном старте высота сцены 280 → 325 (заготовка)
// → 333 → 306 — всё ниже съезжало): пока место продолжения читается с диска, сцена рисовала заготовку другой высоты, чем
// настоящий текст. Решение координатора — «из кэша»: первый кадр рисует последний показанный текст (надзаголовок,
// заголовок, тёплая строка, строка прогресса). Состояние не изменилось — сдвига нет вовсе. Заготовка — только при самом
// первом запуске, когда кэша ещё нет.
//   • Хранение — AsyncStorage, ключ на владельца; читается общим стартовым multiGet (app_snapshot_bootstrap). Firestore — нет.
//   • Кэш чужого владельца или другого языка интерфейса не показывается.
//   • Запоминается только обычная сцена (особые сцены — события дня, им не место на следующем старте).
// Логи — префикс [HOME-SCENE-CACHE] на каждом раннем выходе и catch.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration } from '../../../../app/account_generation';
import { onAccountOwnerChanged } from '../../../../app/account_owner_change';
import type { HomeSceneCopy } from './home_scene_copy';

const LOG = '[HOME-SCENE-CACHE]';
const KEY_PREFIX = 'home_scene_last_copy_v1:';

/** Та часть текста сцены, от которой зависит высота её тела. */
export type HomeSceneBodyCopy = Readonly<{
  lang: string;
  state: string;
  kicker: string;
  title: string;
  warm: string | null;
  line: string | null;
  bar: number | null;
}>;

export type HomeSceneBodyFrame = Readonly<{ mode: 'live' | 'cached' | 'skeleton'; body: HomeSceneBodyCopy | null }>;

let cached: HomeSceneBodyCopy | null = null;
let cachedOwner: string | null = null;

onAccountOwnerChanged('home_scene_copy', () => {
  cached = null;
  cachedOwner = null;
});

function activeOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

export function homeSceneCopyCacheKey(owner: string): string {
  return `${KEY_PREFIX}${owner}`;
}

function clean(value: unknown): HomeSceneBodyCopy | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' ? x : null);
  const lang = str(v.lang);
  const state = str(v.state);
  const kicker = str(v.kicker);
  const title = str(v.title);
  if (lang === null || state === null || kicker === null || title === null) return null;
  const bar = typeof v.bar === 'number' && Number.isFinite(v.bar) ? Math.max(0, Math.min(1, v.bar)) : null;
  return { lang, state, kicker, title, warm: str(v.warm), line: str(v.line), bar };
}

/** Стартовое чтение уже достало запись с диска — положить в память до первого кадра. */
export function primeHomeSceneCopyFromBoot(raw: string | null, owner: string): void {
  if (cached && cachedOwner === owner) {
    console.log(`${LOG} boot_prime:skip ${JSON.stringify({ reason: 'already_in_memory' })}`);
    return;
  }
  if (!raw) {
    console.log(`${LOG} boot_prime:none ${JSON.stringify({ reason: 'first_launch_or_cleared', fallback: 'skeleton' })}`);
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} boot_prime:bad_json ${JSON.stringify({ error: error instanceof Error ? error.message : String(error), fallback: 'skeleton' })}`);
    return;
  }
  const body = clean(parsed);
  if (!body) {
    console.warn(`${LOG} boot_prime:bad_shape ${JSON.stringify({ fallback: 'skeleton' })}`);
    return;
  }
  cached = body;
  cachedOwner = owner;
  console.log(`${LOG} boot_prime ${JSON.stringify({ state: body.state, lang: body.lang, hasKicker: body.kicker !== '', hasTitle: body.title !== '', hasLine: body.line !== null, hasWarm: body.warm !== null })}`);
}

/** Кэш для первого кадра: только своего владельца и того же языка интерфейса. */
export function peekHomeSceneBodyCopy(lang: string): HomeSceneBodyCopy | null {
  if (!cached) return null;
  if (cachedOwner !== activeOwner() || cached.lang !== lang) return null;
  return cached;
}

export function bodyFromCopy(copy: HomeSceneCopy, state: string, lang: string): HomeSceneBodyCopy {
  return { lang, state, kicker: copy.kicker, title: copy.title, warm: copy.warm, line: copy.line, bar: copy.bar };
}

/** Что рисовать в теле сцены: живой текст, кэш на время ожидания или заготовку (кэша нет). Чистая функция — проверяется тестом. */
export function resolveHomeSceneBody(input: Readonly<{ pending: boolean; copy: HomeSceneCopy; state: string; lang: string; cached: HomeSceneBodyCopy | null }>): HomeSceneBodyFrame {
  if (!input.pending) return { mode: 'live', body: bodyFromCopy(input.copy, input.state, input.lang) };
  if (input.cached) return { mode: 'cached', body: input.cached };
  return { mode: 'skeleton', body: null };
}

function sameBody(a: HomeSceneBodyCopy | null, b: HomeSceneBodyCopy): boolean {
  return !!a && a.lang === b.lang && a.state === b.state && a.kicker === b.kicker && a.title === b.title
    && a.warm === b.warm && a.line === b.line && a.bar === b.bar;
}

/** Запомнить показанный текст (только при изменении). Запись на диск фоном; сбой — память остаётся, причина в журнале. */
export function rememberHomeSceneBodyCopy(body: HomeSceneBodyCopy): void {
  const owner = activeOwner();
  if (!owner) {
    console.log(`${LOG} remember:skip ${JSON.stringify({ reason: 'no_active_account' })}`);
    return;
  }
  if (cachedOwner === owner && sameBody(cached, body)) return;
  cached = body;
  cachedOwner = owner;
  void AsyncStorage.setItem(homeSceneCopyCacheKey(owner), JSON.stringify(body)).catch((error: unknown) => {
    console.warn(`${LOG} remember:write_failed ${JSON.stringify({ error: error instanceof Error ? error.message : String(error), status: 'stays_in_memory' })}`);
  });
}

export const __homeSceneCopyCacheTestHooks = Object.freeze({
  reset(): void {
    cached = null;
    cachedOwner = null;
  },
});

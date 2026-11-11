/*
 * [API-ROUTER] точка входа: импортируется из index.js до expo-router/entry — перехват должен стоять до первого вызова функций.
 * зачем (владелец 11.11, план docs/work/tasks/firebase-cold-start-router-2026-11-11.md, шаг 2): одна установка вместо правки
 * 77 мест вызова. По умолчанию ничего не меняет: стадия читается из сохранённого Remote Config
 * (numbers.api_router_stage_v1), нет значения — 0, все вызовы идут как раньше.
 * Сбой установки не должен мешать запуску: причина пишется в журнал, приложение работает прежним путём.
 */
import { API_ROUTER_REGION, API_ROUTER_STAGE_KEY, installApiRouter } from './api_router_client';

async function readStageFromRemoteConfigCache(): Promise<number> {
  // require внутри: remote_config_client тянет хранилище — на старте его не грузим, пока не понадобится первый вызов из списка.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readRemoteConfigCacheRaw } = require('./remote_config_client') as typeof import('./remote_config_client');
  const raw = await readRemoteConfigCacheRaw();
  if (!raw) return 0;
  const numbers = (JSON.parse(raw) as { numbers?: Record<string, unknown> }).numbers;
  const value = numbers?.[API_ROUTER_STAGE_KEY];
  return typeof value === 'number' ? value : 0;
}

try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
  const { getFunctions } = require('@react-native-firebase/functions') as { getFunctions: (app: unknown, region?: string) => object };
  /* eslint-enable @typescript-eslint/no-require-imports */
  // класс модуля функций не экспортируется — прототип берём у экземпляра; все регионы делят его
  const proto = Object.getPrototypeOf(getFunctions(getApp(), 'us-central1')) as Record<string | symbol, unknown>;
  const installed = installApiRouter(proto, {
    readStage: readStageFromRemoteConfigCache,
    euInstance: () => getFunctions(getApp(), API_ROUTER_REGION),
    now: Date.now,
    log: (line) => console.warn(line), // guard-ok: смена режима и запасной путь — редкие события, в release log/info вырезаны
  });
  if (!installed) console.warn('[API-ROUTER] не установлен: нет httpsCallable у модуля функций или уже стоит'); // guard-ok: причина пропуска
} catch (error) {
  console.warn(`[API-ROUTER] не установлен (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина пропуска
}

/* expo-router route shim */
export default function __ApiRouterBootRouteShim() { return null; }

// ═══════════════════════════════════════════════════════════════════════════
// api_router_client.ts — переключатель «общей точки входа» для вызовов облачных функций.
//
// зачем (владелец 11.11 «да, делай», план docs/work/tasks/firebase-cold-start-router-2026-11-11.md, шаг 2):
// у приложения 63 отдельные серверные функции; каждая засыпает и платит за холодный старт (5 328 стартов в неделю ≈ 70 %
// процессорного времени, плюс 5–7 с ожидания у пользователя). Серверная функция `api` в europe-west1 принимает {name, data}
// и передаёт запрос тому же обработчику — общий сервис занят почти непрерывно и рядом с базой.
//
// Здесь — единая точка перехвата вместо правки 77 мест вызова: приём тот же, что у app/dev_callable_counter.ts.
// ВЫКЛЮЧЕНО ПО УМОЛЧАНИЮ: без remote_config/app numbers.api_router_stage_v1 ≥ 1 приложение работает как раньше.
// Откат без сборки — выставить стадию 0.
//
// Правило запасного пути (деньги и награды): старым путём повторяем ТОЛЬКО когда доказано, что обработчик не запускался.
//   • сервер ответил router_unknown_name — имя вне его белого списка, обработчик не вызывался: безопасно всегда;
//   • not-found — точки входа ещё нет в облаке. Но not-found может вернуть и сам обработчик («документ не найден»),
//     поэтому по нему повторяем лишь «читающие» функции (repeatSafe), а действия с наградами идут через точку входа только
//     после того, как она в этом запуске уже ответила (значит, существует) — и их not-found уходит наверх как есть;
//   • таймаут, сеть, internal — действие могло выполниться: повтора нет, ошибка наверх, как при прямом вызове.
// ═══════════════════════════════════════════════════════════════════════════

export const API_ROUTER_FUNCTION = 'api';
export const API_ROUTER_REGION = 'europe-west1';
export const API_ROUTER_STAGE_KEY = 'api_router_stage_v1';
const STAGE_MEMO_MS = 60_000;
const LOG = '[API-ROUTER]';

export type ApiRouterStage = Readonly<{ names: readonly string[]; repeatSafe: boolean }>;

/**
 * Очереди включения: стадия N включает очереди с первой по N-ю. Имена обязаны быть в белом списке сервера
 * (functions/src/api_router.ts) — это сторожит tests/api_router_client.test.ts.
 * Стадия 1 — только чтение: повтор ничего не выдаёт дважды и ничего не теряет.
 */
export const API_ROUTER_STAGES: readonly ApiRouterStage[] = [
  {
    names: ['storyAnnouncementsGet', 'globalBroadcastListActive', 'getActiveShardSurvey', 'premiumThemeEntitlementsGet'],
    repeatSafe: true,
  },
];

type CallableFn = (data?: unknown) => Promise<unknown>;
type HttpsCallableMethod = (this: unknown, name: string, ...rest: unknown[]) => CallableFn;
type CallableProto = Record<string | symbol, unknown> & { httpsCallable?: HttpsCallableMethod };

export type ApiRouterDeps = Readonly<{
  /** Стадия из Remote Config (0 — выключено). Сбой чтения = выключено. */
  readStage: () => Promise<number>;
  /** Экземпляр модуля функций региона europe-west1. */
  euInstance: () => unknown;
  now: () => number;
  log: (line: string) => void;
  stages?: readonly ApiRouterStage[];
}>;

const INSTALLED = Symbol.for('phraseman.api_router_installed');

function normalizeStage(stage: unknown, max: number): number {
  if (typeof stage !== 'number' || !Number.isInteger(stage) || stage <= 0) return 0;
  return Math.min(stage, max);
}

export function routedNamesForStage(stage: number, stages: readonly ApiRouterStage[] = API_ROUTER_STAGES): string[] {
  return stages.slice(0, normalizeStage(stage, stages.length)).flatMap((entry) => [...entry.names]);
}

/** Почему можно позвать функцию старым путём. null — нельзя (ошибка уходит наверх). */
export function apiRouterFallbackReason(error: unknown): 'unknown_name' | 'router_missing' | null {
  const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
  const text = `${String(row.code ?? '')} ${String(row.message ?? '')}`.toLowerCase();
  if (text.includes('router_unknown_name')) return 'unknown_name';
  if (text.includes('not-found') || text.includes('not_found')) return 'router_missing';
  return null;
}

/** Обернуть httpsCallable прототипа модуля функций. Повторная установка — без двойной обёртки. */
export function installApiRouter(proto: CallableProto, deps: ApiRouterDeps): boolean {
  if (!proto || proto[INSTALLED]) return false;
  const original = proto.httpsCallable;
  if (typeof original !== 'function') return false;

  const stages = deps.stages ?? API_ROUTER_STAGES;
  const stageIndexByName = new Map<string, number>();
  stages.forEach((entry, index) => entry.names.forEach((name) => stageIndexByName.set(name, index))); // guard-ok: Map в памяти, не запись Firestore

  // Память этого запуска. Сбрасывается только перезапуском приложения — как у выбора региона входа.
  let routerMissingThisRun = false;
  let routerConfirmedThisRun = false;
  let skippedNames: ReadonlySet<string> = new Set();
  let stageMemo: { value: number; atMs: number } | null = null;

  const currentStage = async (): Promise<number> => {
    const nowMs = deps.now();
    if (stageMemo && nowMs - stageMemo.atMs < STAGE_MEMO_MS) return stageMemo.value;
    let value = 0;
    try {
      value = normalizeStage(await deps.readStage(), stages.length);
    } catch (error) {
      deps.log(`${LOG} stage_read_failed — выключено: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!stageMemo || stageMemo.value !== value) deps.log(`${LOG} stage=${value}`);
    stageMemo = { value, atMs: nowMs };
    return value;
  };

  proto.httpsCallable = function patched(this: unknown, name: string, ...rest: unknown[]): CallableFn {
    const direct = original.call(this, name, ...rest);
    const stageIndex = stageIndexByName.get(String(name));
    // Имя вне всех очередей (в том числе сама точка входа): никаких проверок и чтений — прежний вызов как есть.
    if (stageIndex === undefined) return direct;
    const repeatSafe = stages[stageIndex].repeatSafe;

    return async (data?: unknown) => {
      if (routerMissingThisRun || skippedNames.has(name)) return direct(data);
      if ((await currentStage()) <= stageIndex) return direct(data);
      // Действие, которое нельзя выполнить дважды, идёт через точку входа только когда она уже ответила в этом запуске.
      if (!repeatSafe && !routerConfirmedThisRun) return direct(data);
      try {
        const routed = original.call(deps.euInstance(), API_ROUTER_FUNCTION, ...rest);
        const result = await routed({ name, data: data ?? null });
        routerConfirmedThisRun = true;
        return result;
      } catch (error) {
        const reason = apiRouterFallbackReason(error);
        if (reason === 'unknown_name') {
          routerConfirmedThisRun = true; // ответил сам маршрутизатор — он существует
          skippedNames = new Set([...skippedNames, name]);
          deps.log(`${LOG} unknown_name name=${name} — сервер не знает имя, до конца запуска зовём старым путём`);
          return direct(data);
        }
        if (reason === 'router_missing' && repeatSafe) {
          routerMissingThisRun = true;
          deps.log(`${LOG} router_missing name=${name} — точки входа нет, до конца запуска зовём старым путём`);
          return direct(data);
        }
        throw error; // обработчик запускался или это неизвестно — повтор запрещён
      }
    };
  };
  proto[INSTALLED] = true;
  return true;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }

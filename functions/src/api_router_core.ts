// зачем (владелец 11.11 «да, начинай», план docs/work/tasks/firebase-cold-start-router-2026-11-11.md, шаг 1):
// 63 пользовательские функции — 63 отдельных сервиса, каждый засыпает и платит за холодный старт (5 328 стартов/нед,
// ≈ 70 % процессорного времени). Одна общая точка входа не засыпает: вместе их трафик почти непрерывен.
// Здесь только чистая логика маршрутизации — без firebase-admin и без списка функций, чтобы её можно было проверить тестом.
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

/** Код-маркер «обработчик НЕ запускался»: только по нему приложение вправе повторить вызов старым путём. */
export const API_ROUTER_UNKNOWN_NAME = 'router_unknown_name';
export const API_ROUTER_BAD_REQUEST = 'router_bad_request';
const NAME_MAX_LENGTH = 80;

/** Всё, что маршрутизатору нужно от callable: метод run из firebase-functions (сам обработчик, без HTTP-обвязки). */
export type ApiRoute = Readonly<{ run: (request: CallableRequest<any>) => unknown }>;
export type ApiRouterLog = (level: 'info' | 'warn', payload: Readonly<{ name: string; ms: number; outcome: string }>) => void;
export type ApiRouterDeps = Readonly<{ now: () => number; log: ApiRouterLog }>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function outcomeOf(error: unknown): string {
  // Не-HttpsError платформа сама превращает в internal — в журнале пишем то, что увидит приложение.
  return error instanceof HttpsError ? error.code : 'internal';
}

export function createApiRouterHandler(routes: Readonly<Record<string, ApiRoute>>, deps: ApiRouterDeps) {
  return async function apiRouter(request: CallableRequest<unknown>): Promise<unknown> {
    const envelope = request.data;
    const name = isPlainObject(envelope) ? envelope.name : undefined;
    if (typeof name !== 'string' || name.length === 0 || name.length > NAME_MAX_LENGTH) {
      // Ранний выход: формат запроса не наш. Имя в журнал не пишем — оно может оказаться чем угодно.
      deps.log('warn', { name: '', ms: 0, outcome: API_ROUTER_BAD_REQUEST });
      throw new HttpsError('invalid-argument', API_ROUTER_BAD_REQUEST);
    }
    // Только собственные ключи белого списка: 'constructor' и '__proto__' именами функций не являются.
    const route = Object.prototype.hasOwnProperty.call(routes, name) ? routes[name] : undefined;
    if (!route) {
      deps.log('warn', { name, ms: 0, outcome: API_ROUTER_UNKNOWN_NAME });
      throw new HttpsError('unimplemented', API_ROUTER_UNKNOWN_NAME);
    }
    const startedAtMs = deps.now();
    try {
      // Новый объект запроса: auth, rawRequest (IP для лимитов) и app остаются теми же ссылками, меняется только data.
      // Отсутствующее data — null, как при прямом вызове callable без аргумента.
      const payload = (envelope as Record<string, unknown>).data ?? null;
      const result = await route.run({ ...request, data: payload });
      deps.log('info', { name, ms: deps.now() - startedAtMs, outcome: 'ok' });
      return result;
    } catch (error) {
      // Ошибку обработчика отдаём приложению без изменений — оно уже умеет разбирать коды каждой функции.
      deps.log('warn', { name, ms: deps.now() - startedAtMs, outcome: outcomeOf(error) });
      throw error;
    }
  };
}

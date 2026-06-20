export const HOME_BACK_FALLBACK = '/(tabs)/home';

type SafeBackRouter = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (fallback: any) => void;
};

// ──────────────────────────────────────────────────────────────────────────
// Честная история навигации.
//
// Раньше тут хранились ДВЕ переменные (remembered + previous), и возврат брал
// «последний по времени» маршрут. Это давало замкнутый цикл: открыл Б из А →
// «назад» кидал в Б (последний), потом снова в Б и т.д. — по кругу, потому что
// сам возврат через replace тоже записывался как «последний переход».
//
// Теперь ведём НАСТОЯЩИЙ стек посещённых маршрутов:
//  - заходишь на новый экран → push в стек;
//  - возвращаешься назад → pop текущего и переход на предыдущий в стеке;
//  - переход, инициированный самим safeRouterBack, НЕ пушится повторно
//    (флаг suppressNextRemember), иначе возврат снова попал бы в стек.
// Дубликаты подряд (тот же путь) не пушим — это смены query-параметров и т.п.
// ──────────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
let navigationStack: string[] = [];
let suppressNextRemember = false;
// Когда экран уходит через router.replace (свап, а не push) — следующий честный
// rememberNavigationPath должен ЗАМЕНИТЬ верх стека, а не добавить поверх него.
// Иначе наш стек расходится с нативным: replace убирает экран из expo-router,
// но в нашем массиве он остаётся, и «назад» из нового экрана возвращает на тот
// самый заменённый экран (без query-параметров → пустой).
let replaceTopOnNextRemember = false;
let pendingNoopBackTimer: ReturnType<typeof setTimeout> | null = null;

// Транзитные маршруты-редиректы, которые НЕ должны попадать в стек «назад».
// premium_modal — диспетчер пейвола: он мгновенно делает replace на paywall_a/b/c.
// Если бы он оставался в стеке, «закрыть пейвол» возвращало бы на диспетчер, а тот
// тут же снова открывал бы пейвол → бесконечный цикл (нельзя закрыть пейвол).
const TRANSIENT_REDIRECT_PATHS: ReadonlySet<string> = new Set([
  '/premium_modal',
  '/premium_modal_v2',
]);

function isTransientRedirectPath(path: string): boolean {
  return TRANSIENT_REDIRECT_PATHS.has(path);
}

/**
 * Пометить, что СЛЕДУЮЩИЙ переход — это router.replace (свап текущего экрана),
 * а не push. Вызывать НЕПОСРЕДСТВЕННО перед router.replace, который уводит
 * пользователя с текущего экрана на новый «вместо» него.
 *
 * Пример: «Теория дня» по кнопке «Начать урок» делает replace на упражнение —
 * теория должна исчезнуть и из нашего стека «назад», чтобы возврат из упражнения
 * вёл в МЕНЮ ПЛАНА, а не открывал пустую (без параметров) теорию.
 */
export function markNextNavigationAsReplace(): void {
  replaceTopOnNextRemember = true;
}

function clearPendingNoopBackTimer(): void {
  if (pendingNoopBackTimer) {
    clearTimeout(pendingNoopBackTimer);
    pendingNoopBackTimer = null;
  }
}

/** Текущий (верхний) маршрут в стеке. */
function currentPath(): string | null {
  return navigationStack.length > 0 ? navigationStack[navigationStack.length - 1]! : null;
}

/**
 * Стек оперирует БАЗОВЫМ путём экрана (без ?query). Иначе смена вкладки/фильтра
 * внутри одного экрана (разные query) плодила бы записи, и «назад» возвращал бы
 * на тот же экран в прошлом состоянии вместо выхода из раздела.
 */
function basePath(path: string): string {
  const q = path.indexOf('?');
  return q >= 0 ? path.slice(0, q) : path;
}

export function rememberNavigationPath(path: string | null | undefined): void {
  const raw = path && path.length > 0 ? path : null;
  if (raw === null) return;
  const nextPath = basePath(raw);

  // Диспетчер пейвола (premium_modal) — транзитный редирект: в стек его не кладём,
  // чтобы «назад/закрыть» с пейвола не возвращало на него (иначе он снова откроет пейвол).
  // Но флаг suppressNextRemember всё равно гасим, чтобы не сбить следующий честный push.
  if (isTransientRedirectPath(nextPath)) {
    if (suppressNextRemember) suppressNextRemember = false;
    if (replaceTopOnNextRemember) replaceTopOnNextRemember = false;
    clearPendingNoopBackTimer();
    return;
  }

  // Переход, который вызвал сам safeRouterBack: текущий уже снят со стека,
  // целевой уже в стеке — повторно не пушим, просто гасим флаг.
  if (suppressNextRemember) {
    suppressNextRemember = false;
    if (replaceTopOnNextRemember) replaceTopOnNextRemember = false;
    // На случай рассинхрона: если верх стека не равен целевому — выровняем.
    if (currentPath() !== nextPath) {
      const existingIdx = navigationStack.lastIndexOf(nextPath);
      if (existingIdx >= 0) {
        navigationStack = navigationStack.slice(0, existingIdx + 1);
      } else {
        navigationStack.push(nextPath);
      }
    }
    clearPendingNoopBackTimer();
    return;
  }

  // router.replace: текущий верх стека заменяется новым экраном. Снимаем верх,
  // чтобы дальше отработала обычная логика push/сворачивания — итог идентичен
  // нативному стеку (заменённый экран в «назад» не появится).
  if (replaceTopOnNextRemember) {
    replaceTopOnNextRemember = false;
    if (navigationStack.length > 0 && currentPath() !== nextPath) {
      navigationStack.pop();
    }
  }

  // Тот же путь подряд (смена query, ре-навигация на себя) — не дублируем.
  if (currentPath() === nextPath) {
    clearPendingNoopBackTimer();
    return;
  }

  // Если возвращаемся жестом/системной кнопкой на экран, который уже есть
  // глубже в стеке, — сворачиваем стек до него (а не плодим дубль), чтобы
  // история не разрасталась и не закольцовывалась.
  const existingIdx = navigationStack.lastIndexOf(nextPath);
  if (existingIdx >= 0) {
    navigationStack = navigationStack.slice(0, existingIdx + 1);
  } else {
    navigationStack.push(nextPath);
    if (navigationStack.length > MAX_HISTORY) {
      navigationStack = navigationStack.slice(navigationStack.length - MAX_HISTORY);
    }
  }
  clearPendingNoopBackTimer();
}

export function safeRouterBack(
  router: SafeBackRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  clearPendingNoopBackTimer();
  // Native-stack router.back() hard-crashes the app on Android/Fabric during the
  // Back teardown (see screenOptions note in app/_layout.tsx — the stack already
  // forces animation:'none' to work around that native fault). Going back through
  // router.back() re-exposes that crash on the universal "exit from any section"
  // path. Since the stack has no animation, a deterministic replace to the previous
  // route is visually identical and never triggers the native crash.

  // Снимаем текущий маршрут со стека и берём предыдущий — честный «назад».
  if (navigationStack.length > 0) {
    navigationStack.pop();
  }
  const target = currentPath() ?? fallback;

  // Если по какой-то причине предыдущий совпал с местом, где мы стоим, или
  // стек опустел — уходим на fallback (главную), чтобы не было no-op/петли.
  const safeTarget = target && target.length > 0 ? target : fallback;

  // Гасим запись следующего rememberNavigationPath, иначе целевой маршрут
  // запушится заново и стек снова закольцуется.
  suppressNextRemember = true;
  router.replace(safeTarget);
}

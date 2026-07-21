export const HOME_BACK_FALLBACK = '/(tabs)/home';

type SafeBackRouter = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (fallback: any) => void;
};

type ModalDismissRouter = SafeBackRouter & {
  canDismiss?: () => boolean;
  dismiss?: (count?: number) => void;
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
let paywallDismissShouldReplace = false;
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

// Сами экраны пейвола (paywall_a/b/c) — это КОНЕЧНАЯ точка показа, а НЕ место,
// куда можно «вернуться». Если при рассинхроне стека «назад» с пейвола разрешается
// в запись, которая сама является пейволом (или диспетчером premium_modal), то
// safeRouterBack делает replace на тот же пейвол → он закрывается и тут же
// открывается «на месте», бесконечно (баг «не закрыть пейвол»). Поэтому при выборе
// цели возврата мы ПРОПУСКАЕМ любые такие записи и уходим на первый реальный экран
// под ними (или на home-fallback). Сравниваем по basePath: query (context/source)
// не должен мешать сопоставлению.
const PAYWALL_BASE_PATHS: ReadonlySet<string> = new Set([
  '/paywall_a',
  '/paywall_b',
  '/paywall_c',
  '/paywall_d',
  '/paywall_e',
  '/paywall_f',
  '/paywall_g',
]);

/** true для пейволов и транзитных диспетчеров — на них «назад» вести нельзя. */
function isNonBackTargetPath(path: string): boolean {
  const base = basePath(path);
  return PAYWALL_BASE_PATHS.has(base) || isTransientRedirectPath(base);
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

// Параметры, которые ИДЕНТИФИЦИРУЮТ сущность экрана (а не косметику внутри него).
// Их нужно СОХРАНИТЬ в ключе стека: '/lesson_menu?id=5' и '/lesson_menu?id=6' — это
// РАЗНЫЕ экраны (меню урока 5 и урока 6), а не два состояния одного экрана. Если их
// отрезать, «назад» делает replace на голый '/lesson_menu' без id, а тот по дефолту
// показывает урок 1 — отсюда и баг «выход из теории/урока кидает в меню урока 1».
// Косметические же параметры (tab, from, replayIntro, filter…) по-прежнему отбрасываем,
// иначе смена вкладки/фильтра внутри одного экрана плодила бы записи в стеке.
const IDENTITY_QUERY_KEYS: ReadonlySet<string> = new Set([
  'id',
  'lessonId',
  'level',
  'planId',
  'dayIndex',
  'planInstanceId',
]);

/**
 * Ключ экрана в стеке: путь + только ИДЕНТИФИЦИРУЮЩИЕ параметры (id и т.п.),
 * отсортированные для стабильности. Косметические query отбрасываются, поэтому
 * смена вкладки/фильтра не плодит записи, но «назад» на id-зависимый экран
 * (меню урока, exam уровня, день плана) сохраняет нужную сущность.
 */
function basePath(path: string): string {
  const q = path.indexOf('?');
  if (q < 0) return path;
  const base = path.slice(0, q);
  const identityParams = path
    .slice(q + 1)
    .split('&')
    .filter((pair) => {
      const key = decodeURIComponent(pair.split('=')[0] ?? '');
      return IDENTITY_QUERY_KEYS.has(key);
    })
    .sort();
  return identityParams.length > 0 ? `${base}?${identityParams.join('&')}` : base;
}

export function rememberNavigationPath(path: string | null | undefined): void {
  const raw = path && path.length > 0 ? path : null;
  if (raw === null) return;
  const nextPath = basePath(raw);

  // Диспетчер пейвола (premium_modal) — транзитный редирект: в стек его не кладём,
  // чтобы «назад/закрыть» с пейвола не возвращало на него (иначе он снова откроет пейвол).
  // If the transient route was reached through router.replace, keep the replace marker
  // alive for the real target (/paywall_a/b/c). Otherwise a blocked source screen remains
  // under the paywall and immediately reopens it after close.
  if (isTransientRedirectPath(nextPath)) {
    if (replaceTopOnNextRemember) paywallDismissShouldReplace = true;
    if (suppressNextRemember) suppressNextRemember = false;
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
    if (isNonBackTargetPath(nextPath)) paywallDismissShouldReplace = true;
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

  // Пропускаем любые записи-пейволы/диспетчеры под нами: «назад» с пейвола НИКОГДА
  // не должно вести на другой пейвол (иначе replace на тот же экран = бесконечное
  // «моргание на месте», пейвол не закрыть). Снимаем их со стека, пока сверху не
  // окажется реальный экран. Если под пейволом ничего реального нет — уйдём на
  // fallback (home) ниже.
  while (navigationStack.length > 0 && isNonBackTargetPath(currentPath()!)) {
    navigationStack.pop();
  }
  const target = currentPath() ?? fallback;

  // Если по какой-то причине предыдущий совпал с местом, где мы стоим, или
  // стек опустел — уходим на fallback (главную), чтобы не было no-op/петли.
  // Доп. страховка: даже если в target каким-то образом просочился пейвол —
  // не возвращаемся на него, а уходим на fallback.
  const safeTarget =
    target && target.length > 0 && !isNonBackTargetPath(target) ? target : fallback;

  // Гасим запись следующего rememberNavigationPath, иначе целевой маршрут
  // запушится заново и стек снова закольцуется.
  suppressNextRemember = true;
  paywallDismissShouldReplace = false;
  router.replace(safeTarget);
}

export function dismissPaywallModal(
  router: ModalDismissRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  clearPendingNoopBackTimer();

  if (navigationStack.length > 0) {
    navigationStack.pop();
  }

  while (navigationStack.length > 0 && isNonBackTargetPath(currentPath()!)) {
    navigationStack.pop();
  }
  const target = currentPath() ?? fallback;
  const safeTarget =
    target && target.length > 0 && !isNonBackTargetPath(target) ? target : fallback;

  const shouldReplace = paywallDismissShouldReplace;
  paywallDismissShouldReplace = false;
  suppressNextRemember = true;
  if (!shouldReplace && typeof router.canDismiss === 'function' && typeof router.dismiss === 'function' && router.canDismiss()) {
    router.dismiss(1);
    return;
  }

  router.replace(safeTarget);
}

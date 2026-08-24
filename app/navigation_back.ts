export const HOME_BACK_FALLBACK = '/(tabs)/home';

type SafeBackRouter = {
  canGoBack?: () => boolean;
  canDismiss?: () => boolean;
  back: () => void;
  dismiss?: (count?: number) => void;
  dismissTo?: (target: any) => void;
  replace: (fallback: any) => void;
};

type ModalDismissRouter = SafeBackRouter & {
  canDismiss?: () => boolean;
  dismiss?: (count?: number) => void;
};

type NavigationSection =
  | 'home'
  | 'lessons'
  | 'practice'
  | 'flashcards'
  | 'dialogs'
  | 'lingman'
  | 'arena'
  | 'friends'
  | 'settings'
  | 'league'
  | 'stats';

type RouteRole = 'root' | 'child' | 'portal' | 'transient' | 'unknown';

type NavigationEntry = Readonly<{
  /** Полный href: source/from/returnTo нужны экрану после возврата. */
  href: string;
  /** Ключ экрана: pathname + только параметры идентичности сущности. */
  key: string;
  /** Владелец непрерывной ветки. null означает fail-closed неизвестный маршрут. */
  section: NavigationSection | null;
  role: RouteRole;
}>;

type FixedRoutePolicy = Readonly<{ role: 'root' | 'child'; section: NavigationSection }>;
type RoutePolicy = FixedRoutePolicy | Readonly<{ role: 'portal' | 'transient' | 'unknown' }>;

// Корень раздела — жёсткая граница. После входа в него прежняя ветка другого
// раздела больше не может стать целью Back.
const SECTION_ROOTS: ReadonlyMap<string, NavigationSection> = new Map([
  ['/', 'home'],
  ['/home', 'home'],
  ['/(tabs)', 'home'],
  ['/(tabs)/home', 'home'],

  ['/lessons', 'lessons'],
  ['/journal', 'lessons'],
  ['/(tabs)/lessons', 'lessons'],
  ['/(tabs)/journal', 'lessons'],
  ['/lessons_list', 'lessons'],

  ['/flashcards', 'flashcards'],
  ['/flashcards_packs', 'flashcards'],
  ['/flashcards_my_packs', 'flashcards'],
  ['/ai_dialog_home', 'dialogs'],
  ['/lingman_videos', 'lingman'],

  ['/arena', 'arena'],


  ['/friends', 'friends'],
  ['/(tabs)/friends', 'friends'],
  ['/settings', 'settings'],
  ['/(tabs)/settings', 'settings'],

  ['/league_screen', 'league'],
  ['/club_screen', 'league'],
  ['/streak_stats', 'stats'],
]);

// Порталы открываются из нескольких разделов и наследуют владельца точки входа.
// Назначить им один статический раздел нельзя: например shards_shop открывается
// из Home, Friends, Stats, Flashcards, Arena/Tournaments и Avatar.
const CONTEXTUAL_PORTAL_PATHS: ReadonlySet<string> = new Set([
  '/premium_modal',
  '/paywall_a',
  '/paywall_b',
  '/paywall_c',
  '/paywall_d',
  '/paywall_e',
  '/paywall_f',
  '/paywall_g',
  '/max_paywall',
  '/manage_subscription',
  '/shards_shop',
  '/coin_exchange',
  '/avatar_select',
  '/collectibles_screen',
  '/achievements_screen',
  '/level_gifts_inventory',
  '/level_reward_spin',
  '/season_pass',
  '/referrals',
  '/promo_code_entry',
  '/settings_edu',
  '/flashcards_voice_picker',
  '/problem_coach',
  '/survey_screen',
  '/ai_dialog_briefing',
  '/ai_dialog_consent_gate',
  '/ai_dialog_session',
  '/ai_companion_session',
]);

// Единственный настоящий redirect в этой семье. premium_modal теперь сам
// рисует выбранный paywall и поэтому является контекстным экраном, не redirect.
const TRANSIENT_REDIRECT_PATHS: ReadonlySet<string> = new Set([
  '/premium_modal_v2',
]);

const PAYWALL_BASE_PATHS: ReadonlySet<string> = new Set([
  '/paywall_a',
  '/paywall_b',
  '/paywall_c',
  '/paywall_d',
  '/paywall_e',
  '/paywall_f',
  '/paywall_g',
  '/max_paywall',
]);

// Эти экраны владеют особыми Android Back-сценариями (подтверждение выхода,
// закрытие внутренней панели, сохранение сессии). Глобальный guard их не перебивает.
const SCREEN_OWNED_ANDROID_BACK_PATHS: ReadonlySet<string> = new Set([
  '/arena_match',
  '/exam',
  '/flashcards_collection',
  '/flashcards_my_packs',
  '/flashcards_packs',
  '/flashcards_swipe',
  '/lesson1',
  '/lesson_complete',
  '/lesson_words',
  '/pack_opening',
  '/shards_shop',
]);

const MAX_HISTORY = 50;
const NATIVE_POP_TO_BACK_ENABLED =
  typeof process === 'undefined' || process.env.EXPO_PUBLIC_NATIVE_POP_TO_BACK !== '0';

let navigationStack: NavigationEntry[] = [];
let suppressNextRemember = false;
let replaceTopOnNextRemember = false;
let paywallDismissShouldReplace = false;

function pathnameOf(path: string): string {
  const end = path.search(/[?#]/);
  const pathname = (end >= 0 ? path.slice(0, end) : path).replace(/\/$/, '');
  return pathname || '/';
}

function hrefForTarget(target: unknown): string | null {
  if (typeof target === 'string') return target.length > 0 ? target : null;
  if (!target || typeof target !== 'object') return null;

  const pathname = (target as { pathname?: unknown }).pathname;
  if (typeof pathname !== 'string' || pathname.length === 0) return null;
  const params = (target as { params?: unknown }).params;
  if (!params || typeof params !== 'object') return pathname;

  const query = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    })
    .sort()
    .join('&');
  return query ? `${pathname}?${query}` : pathname;
}

// Параметры, которые идентифицируют экземпляр экрана. Остальные параметры
// сохраняются в href, но не создают отдельный history entry.
const IDENTITY_QUERY_KEYS: ReadonlySet<string> = new Set([
  'id',
  'roomId',
  'lessonId',
  'level',
  'planId',
  'dayIndex',
  'planInstanceId',
  'pack',
  'packId',
  'deck',
  'matchId',
  'runId',
  'requestId',
  'inviteId',
  'inviteToken',
  'scenarioId',
  'playlistId',
  'videoId',
  'surveyId',
  'trainingId',
  'microDiagnosisId',
]);

function basePath(path: string): string {
  const hashIndex = path.indexOf('#');
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const q = withoutHash.indexOf('?');
  if (q < 0) return pathnameOf(withoutHash);
  const base = pathnameOf(withoutHash.slice(0, q));
  const identityParams = withoutHash
    .slice(q + 1)
    .split('&')
    .filter(Boolean)
    .filter((pair) => {
      const key = decodeURIComponent(pair.split('=')[0] ?? '');
      return IDENTITY_QUERY_KEYS.has(key);
    })
    .sort();
  return identityParams.length > 0 ? `${base}?${identityParams.join('&')}` : base;
}

function fixedChildSection(pathname: string): NavigationSection | null {
  // MAX — самостоятельная поверхность главной. Даже старый deeplink или
  // сохранённый стек из «Диалогов» не должен возвращать звонок в тот раздел.
  if (
    pathname === '/max_call_prestart'
    || pathname === '/max_call_session'
    || pathname === '/max_voice_review'
  ) return 'home';

  if (
    pathname.startsWith('/learning-v2/')
    || pathname.startsWith('/learning_v2_')
    || pathname.startsWith('/lesson')
    || pathname === '/hint'
    || pathname === '/preposition_drill'
    || pathname === '/diagnostic_test'
    || pathname === '/exam'
    || pathname === '/level_exam'
  ) return 'lessons';

  if (
    pathname === '/phrase_analytics_screen'
    || pathname === '/_pos_analytics_audit'
    || pathname === '/pos_analytics_audit'
  ) return 'practice';

  if (
    pathname.startsWith('/flashcards')
    || pathname === '/mistake_practice_session'
    || pathname === '/community_pack_create'
    || pathname === '/pack_opening'
  ) return 'flashcards';

  if (pathname.startsWith('/lingman_')) return 'lingman';
  if (pathname.startsWith('/arena_')) return 'arena';

  if (
    pathname.startsWith('/settings_')
    || pathname === '/privacy_settings'
    || pathname === '/privacy_screen'
    || pathname === '/terms_screen'
    || pathname === '/account_details'
    || pathname === '/ideas_submit'
    || pathname === '/language_welcome'
    // зачем: DEV-витрина движения живёт в DEV Hub (настройки). Без записи в
    // журнал экраны, открытые из неё (пейволы и др.), при закрытии не находили
    // кандидата «назад» и уводили на главную (замечание владельца).
    || pathname === '/motion_showcase'
  ) return 'settings';

  return null;
}

function routePolicy(path: string): RoutePolicy {
  const pathname = pathnameOf(path);
  if (TRANSIENT_REDIRECT_PATHS.has(pathname)) return { role: 'transient' };
  const rootSection = SECTION_ROOTS.get(pathname);
  if (rootSection) return { role: 'root', section: rootSection };
  if (CONTEXTUAL_PORTAL_PATHS.has(pathname)) return { role: 'portal' };
  const childSection = fixedChildSection(pathname);
  if (childSection) return { role: 'child', section: childSection };
  return { role: 'unknown' };
}

function sourceSectionHint(href: string): NavigationSection | null {
  const q = href.indexOf('?');
  if (q < 0) return null;
  const params = new URLSearchParams(href.slice(q + 1));
  const hint = `${params.get('source') ?? ''} ${params.get('from') ?? ''} ${params.get('returnTo') ?? ''}`.toLowerCase();
  if (/settings/.test(hint)) return 'settings';
  if (/mistake|practice|diagnos/.test(hint)) return 'practice';
  if (/flash|card|pack/.test(hint)) return 'flashcards';
  if (/max_call|max_voice/.test(hint)) return 'home';
  if (/lesson|dialog/.test(hint)) return 'lessons';
  // зачем 2026-08-23: раздел «турниры» выключен и заархивирован. Подсказка
  // season принадлежит ЖИВЫМ экранам сезонного пропуска Арены
  // (season_pass.tsx, arena_season_pass.tsx) — иначе они остались бы без
  // раздела и возврат уводил бы на общий запасной путь.
  if (/arena|season/.test(hint)) return 'arena';
  if (/friend|referral/.test(hint)) return 'friends';
  if (/streak|stats/.test(hint)) return 'stats';
  if (/home|afterwin|winback/.test(hint)) return 'home';
  return null;
}

function currentEntry(): NavigationEntry | null {
  return navigationStack.length > 0 ? navigationStack[navigationStack.length - 1]! : null;
}

function createEntry(href: string, policy: RoutePolicy, opener: NavigationEntry | null): NavigationEntry {
  const section = policy.role === 'root' || policy.role === 'child'
    ? policy.section
    : policy.role === 'portal'
      ? (opener?.section ?? sourceSectionHint(href))
      : null;
  return { href, key: basePath(href), section, role: policy.role };
}

function trimHistory(): void {
  if (navigationStack.length > MAX_HISTORY) {
    navigationStack = navigationStack.slice(navigationStack.length - MAX_HISTORY);
  }
}

function rememberEntry(entry: NavigationEntry): void {
  if (entry.role === 'root') {
    navigationStack = [entry];
    return;
  }

  const current = currentEntry();
  if (current?.key === entry.key) {
    navigationStack[navigationStack.length - 1] = entry;
    return;
  }

  // Fixed child of a different branch and every unknown route start an isolated
  // segment. We never search deeper through a foreign branch for a familiar path.
  if (
    entry.section === null
    || (entry.role === 'child' && current?.section !== entry.section)
  ) {
    navigationStack = [entry];
    return;
  }

  navigationStack.push(entry);
  trimHistory();
}

function isNonBackTargetPath(path: string): boolean {
  const pathname = pathnameOf(path);
  return PAYWALL_BASE_PATHS.has(pathname)
    || pathname === '/premium_modal'
    || TRANSIENT_REDIRECT_PATHS.has(pathname);
}

/** Следующая смена маршрута является router.replace, а не push. */
export function markNextNavigationAsReplace(): void {
  replaceTopOnNextRemember = true;
}

export function rememberNavigationPath(path: string | null | undefined): void {
  const href = path && path.length > 0 ? path : null;
  if (!href) return;

  const policy = routePolicy(href);
  if (policy.role === 'transient') {
    if (replaceTopOnNextRemember) paywallDismissShouldReplace = true;
    if (suppressNextRemember) suppressNextRemember = false;
    return;
  }

  const opener = currentEntry();
  const entry = createEntry(href, policy, opener);

  if (suppressNextRemember) {
    suppressNextRemember = false;
    replaceTopOnNextRemember = false;
    rememberEntry(entry);
    return;
  }

  if (replaceTopOnNextRemember) {
    replaceTopOnNextRemember = false;
    if (isNonBackTargetPath(href)) paywallDismissShouldReplace = true;
    if (navigationStack.length > 0 && currentEntry()?.key !== entry.key) {
      navigationStack.pop();
    }
  }

  rememberEntry(entry);
}

function popBackCandidate(leaving: NavigationEntry | null): NavigationEntry | null {
  if (navigationStack.length > 0) navigationStack.pop();

  while (navigationStack.length > 0 && isNonBackTargetPath(currentEntry()!.href)) {
    navigationStack.pop();
  }

  const candidate = currentEntry();
  if (
    !leaving
    || leaving.role === 'root'
    || leaving.section === null
    || !candidate
    || candidate.section !== leaving.section
  ) {
    // Чужая/неизвестная ветка не должна воскреснуть после перехода на fallback.
    navigationStack = [];
    return null;
  }
  return candidate;
}

function safeTarget(candidate: NavigationEntry | null, fallback: any): { target: any; path: string } {
  const fallbackPath = hrefForTarget(fallback) ?? HOME_BACK_FALLBACK;
  const candidatePath = candidate?.href ?? null;
  if (candidatePath && !isNonBackTargetPath(candidatePath)) {
    return { target: candidatePath, path: candidatePath };
  }
  if (!isNonBackTargetPath(fallbackPath)) return { target: fallback, path: fallbackPath };
  return { target: HOME_BACK_FALLBACK, path: HOME_BACK_FALLBACK };
}

export function safeRouterBack(
  router: SafeBackRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  const leaving = currentEntry();
  const candidate = popBackCandidate(leaving);
  const chosen = safeTarget(candidate, fallback);

  // Settings sheets are mounted over the retained Settings tab. A native one-step
  // dismiss preserves that tab instance, but only when Settings owns this branch.
  const forceSettingsFallback = basePath(hrefForTarget(fallback) ?? '') === '/(tabs)/settings'
    && leaving?.section === 'settings';
  if (
    forceSettingsFallback
    && candidate !== null
    && typeof router.canDismiss === 'function'
    && typeof router.dismiss === 'function'
    && router.canDismiss()
  ) {
    router.dismiss(1);
    return;
  }

  const samePathDifferentIdentity = !!leaving
    && pathnameOf(leaving.href) === pathnameOf(chosen.path)
    && leaving.key !== basePath(chosen.path);

  if (NATIVE_POP_TO_BACK_ENABLED) {
    if (
      samePathDifferentIdentity
      && candidate !== null
      && typeof router.canDismiss === 'function'
      && typeof router.dismiss === 'function'
      && router.canDismiss()
    ) {
      router.dismiss(1);
      return;
    }
    if (typeof router.dismissTo === 'function') {
      router.dismissTo(chosen.target);
      return;
    }
  }

  suppressNextRemember = true;
  paywallDismissShouldReplace = false;
  router.replace(chosen.target);
}

export function dismissPaywallModal(
  router: ModalDismissRouter,
  fallback: any = HOME_BACK_FALLBACK,
): void {
  const leaving = currentEntry();
  const candidate = popBackCandidate(leaving);
  const chosen = safeTarget(candidate, fallback);
  const shouldReplace = paywallDismissShouldReplace;
  paywallDismissShouldReplace = false;

  if (
    !shouldReplace
    && candidate !== null
    && typeof router.canDismiss === 'function'
    && typeof router.dismiss === 'function'
    && router.canDismiss()
  ) {
    router.dismiss(1);
    return;
  }

  if (NATIVE_POP_TO_BACK_ENABLED && typeof router.dismissTo === 'function') {
    router.dismissTo(chosen.target);
    return;
  }

  suppressNextRemember = true;
  router.replace(chosen.target);
}

function fallbackForSection(section: NavigationSection | null): string {
  switch (section) {
    case 'lessons': return '/lessons_list';
    case 'practice': return '/flashcards_collection';
    /**
     * FIX (владелец, 2026-08-16): разделы карточек были зациклены сами на себя.
     * `/flashcards` — не хаб над ними, а СОСЕД по нижнему таббару карточек
     * (сохранённые карточки / наборы / мои наборы — три позиции одного уровня).
     * Отправляя «назад» на /flashcards, мы возвращали человека в тот же раздел,
     * из которого он выходил, и выйти к главной становилось нечем.
     *
     * Порядок владельца: набор → «Мои наборы» → ГЛАВНАЯ. Экран сохранённых
     * карточек в цепочку выхода не входит.
     */
    case 'flashcards': return HOME_BACK_FALLBACK;
    case 'dialogs': return '/(tabs)/lessons';
    case 'lingman': return '/lingman_videos';
    case 'arena': return '/arena';
    case 'friends': return '/(tabs)/friends';
    case 'settings': return '/(tabs)/settings';
    default: return HOME_BACK_FALLBACK;
  }
}

/** Детерминированный fallback для Android Back и общих экранных оболочек. */
export function navigationFallbackForPath(path: string | null | undefined): string {
  if (!path) return HOME_BACK_FALLBACK;
  const policy = routePolicy(path);
  if (policy.role === 'root') return HOME_BACK_FALLBACK;
  if (policy.role === 'child') return fallbackForSection(policy.section);
  if (policy.role === 'portal') {
    const current = currentEntry();
    if (current && pathnameOf(current.href) === pathnameOf(path)) {
      return fallbackForSection(current.section);
    }
    return fallbackForSection(sourceSectionHint(path));
  }
  return HOME_BACK_FALLBACK;
}

/** Home может закрыть Android-приложение; остальные экраны идут через branch guard. */
export function shouldHandleGlobalHardwareBack(path: string | null | undefined): boolean {
  if (!path) return false;
  const pathname = pathnameOf(path);
  const homeSection = SECTION_ROOTS.get(pathname) === 'home';
  return !homeSection && !SCREEN_OWNED_ANDROID_BACK_PATHS.has(pathname);
}

/** Read-only surface for the route-registry contract test and future audits. */
export function navigationRoutePolicyForAudit(path: string): Readonly<{
  role: RouteRole;
  section: NavigationSection | null;
}> {
  const policy = routePolicy(path);
  return {
    role: policy.role,
    section: policy.role === 'root' || policy.role === 'child' ? policy.section : null,
  };
}

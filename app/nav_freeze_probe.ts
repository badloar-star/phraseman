/**
 * [PAYWALL-CLOSE-FREEZE] — снимок корневого стека навигации для журнала (только dev).
 *
 * зачем (координатор 14.10, 🔴 владелец: «закрыл предложение купить — всё зависло»; Сверка WB-R: после крестика через dismiss(1)
 * Главная видна, скролл стоит, тап по вкладке подсвечивается, а экран не меняется — 1 из 2 чистых прогонов): что осталось в стеке
 * после закрытия пейвола и кто держит слот окон. Корневой layout регистрирует ссылку на контейнер навигации, navigation_back
 * пишет снимки на +0/300/800/1500 мс. Только чтение, поведение не меняется.
 */
type RootNavRef = { getRootState?: () => unknown };

let rootNavRef: RootNavRef | null = null;
let overlayActiveKey: string | null = null;

export function registerRootNavProbe(ref: unknown): void {
  rootNavRef = (ref ?? null) as RootNavRef | null;
}

/** OverlayArbiter сообщает текущего держателя слота окон (для журнала вне React). */
export function noteOverlayActiveForProbe(key: string | null): void {
  overlayActiveKey = key;
}

type NavStateLike = { index?: number; routes?: { name?: string; state?: NavStateLike }[] };

function describe(state: NavStateLike | undefined, depth: number): string {
  if (!state || !Array.isArray(state.routes)) return 'none';
  const names = state.routes.map((r, i) => `${i === state.index ? '*' : ''}${r.name ?? '?'}`).join(',');
  const focused = state.routes[state.index ?? state.routes.length - 1];
  const inner = depth < 2 && focused?.state ? ` > ${describe(focused.state, depth + 1)}` : '';
  return `[${names}]${inner}`;
}

/** Строка для журнала: стек корня (* — индекс), есть ли premium_modal, держатель слота окон. */
export function rootNavProbeLine(): string {
  try {
    const state = rootNavRef?.getRootState?.() as NavStateLike | undefined;
    const routes = state?.routes ?? [];
    const paywallInStack = routes.some((r) => r.name === 'premium_modal');
    const top = routes[routes.length - 1]?.name ?? 'none';
    return `stack=${describe(state, 0)} index=${state?.index ?? 'none'} top=${top} paywallInStack=${paywallInStack} overlay=${overlayActiveKey ?? 'none'}`;
  } catch (error) {
    return `stack=unavailable(${error instanceof Error ? error.message.slice(0, 60) : String(error)}) overlay=${overlayActiveKey ?? 'none'}`;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

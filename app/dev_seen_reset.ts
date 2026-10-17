/**
 * Dev-сброс «уже показано» для окон «один раз на аккаунт» (ссылка dev_state `seen=reset` или `seen=<окно>`).
 *
 * зачем (координатор 18.10, блокер Сверки): окна Plus, рефералки, «Нет энергии», «С возвращением», сторис после
 * первого показа больше не появляются, и снять их кадр повторно можно было только через pm clear. Вызывается ТОЛЬКО
 * из applyDevState после гейта dev-сборки (в стор-сборке ветка недоступна). Сервер не трогаем.
 */
export const DEV_SEEN_WINDOWS = ['energy', 'welcome', 'plus', 'referral', 'stories', 'team'] as const;
export type DevSeenWindow = (typeof DEV_SEEN_WINDOWS)[number];
export type DevSeenRequest = 'reset' | DevSeenWindow;

const FIXED_KEYS: Readonly<Record<Exclude<DevSeenWindow, 'stories' | 'team'>, readonly string[]>> = {
  energy: ['energy_onboarding_shown'],
  welcome: ['welcome_back_shown_at_v1', 'winback_shown_at_v1'],
  plus: [
    'premium_celebration_seen_v1',
    'vip_celebration_seen_v1',
    'intro_full_access_welcome_seen_v1',
    'intro_full_access_ended_seen_v1',
    'after_win_upsell_last_shown_v1',
    'streak_paywall_shown',
  ],
  referral: ['referral_access_ended_seen_for_v1'],
};

const STORY_EVENTS_PREFIX = 'story_events_v1:';

/** Ключи к удалению для окна (или всех окон) среди ключей хранилища текущего устройства. */
export function devSeenResetKeys(
  request: DevSeenRequest,
  stableId: string | null,
  storedKeys: readonly string[],
): string[] {
  const windows: readonly DevSeenWindow[] = request === 'reset' ? DEV_SEEN_WINDOWS : [request];
  const keys = new Set<string>();
  for (const window of windows) {
    if (window === 'stories') {
      storedKeys.filter((key) => key.startsWith(STORY_EVENTS_PREFIX)).forEach((key) => keys.add(key));
      continue;
    }
    if (window === 'team') continue; // «прочитано» подтверждает сервер — локально сбрасывать нечего
    FIXED_KEYS[window].forEach((key) => keys.add(key));
    if (window === 'referral' && stableId) keys.add(`referral_welcome_seen::${stableId}`);
  }
  return [...keys];
}

export function parseDevSeenRequest(value: unknown): DevSeenRequest | undefined {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'reset') return 'reset';
  return (DEV_SEEN_WINDOWS as readonly string[]).includes(raw) ? raw as DevSeenWindow : undefined;
}

/**
 * Normalizes incoming deep links before Expo Router attempts matching.
 * This prevents "Unmatched Route" on root custom-scheme launches.
 */

// зачем (Сверка 10.10: `phraseman://video` открывает Главную; сперва логи): каждый вход и выход нормализации ссылки пишется одной строкой —
// видно, что пришло, холодный ли это старт и куда ссылку отправили. Поиск по префиксу [DEEPLINK].
export function redirectSystemPath(args: { path: string; initial: boolean }): string {
  const out = redirectSystemPathInner(args);
  console.log('[DEEPLINK] redirectSystemPath', JSON.stringify({ in: String(args.path ?? ''), initial: args.initial, out }));
  return out;
}

function redirectSystemPathInner({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  const rawInput = String(path || '').trim();
  let raw = rawInput;

  // In some launches Expo can pass a full URL (e.g. "phraseman:///").
  // Normalize it to route-like path before matching.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const customSchemeAuthorityPath = url.protocol.toLowerCase() === 'phraseman:' && url.host
        ? `/${url.host}${url.pathname === '/' ? '' : url.pathname}`
        : null;
      const routePath = customSchemeAuthorityPath
        ?? (url.pathname && url.pathname !== '/'
        ? url.pathname
        : url.host
          ? `/${url.host}`
          : '');
      raw = `${routePath}${url.search || ''}${url.hash || ''}`.trim();
    } catch {
      raw = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').trim();
      raw = raw.startsWith('/') ? raw : `/${raw}`;
    }
  }

  // Handles launches like `phraseman:///` or empty path.
  if (!raw || raw === '/' || raw === '///') {
    return '/home';
  }

  // зачем: D83 — клиентская Арена удалена целиком. Любая старая ссылка Арены
  // (корень, приглашение в дуэль /arena/invite/…, призрачная дуэль, прямые
  // /arena_* экраны) обязана открыть Главную, а не мёртвый маршрут. Проверка
  // стоит ДО реферального `/invite`, иначе `/arena/invite/…` ушло бы туда.
  if (/(?:^|\/)arena(?:_[a-z_]+)?(?:[/?#]|$)/i.test(raw)) {
    return '/home';
  }

  // зачем (владелец 2026-09-30): пейволы A–G удалены, остался один пейвол Plus
  // за диспетчером /premium_modal. Старые внешние ссылки /paywall_a…/paywall_g
  // (с их query — context/source) открывают его, а не «Unmatched Route».
  const retiredPaywall = raw.match(/^\/?paywall_[a-g](?=[?#]|$)/i);
  if (retiredPaywall) {
    return `/premium_modal${raw.slice(retiredPaywall[0].length)}`;
  }

  // Referral invite links should not route to a non-existent `/invite` screen.
  // The root layout captures the ref query from Linking.getInitialURL/listeners;
  // this redirect only keeps app launch/navigation on a valid screen.
  const inviteMatch =
    raw.match(/(?:^|\/)invite(?:[/?#]|$)/i) ??
    raw.match(/(?:^|\/)phraseman\/invite(?:[/?#]|$)/i);
  if (inviteMatch) {
    const queryIndex = raw.indexOf('?');
    const hashIndex = raw.indexOf('#');
    const endIndex =
      hashIndex >= 0 && (queryIndex < 0 || hashIndex > queryIndex)
        ? hashIndex
        : raw.length;
    const query = queryIndex >= 0 ? raw.slice(queryIndex, endIndex) : '';
    return `/home${query}`;
  }

  // Retired competitive routes (Арена снята выше — D83). Старые
  // notifications/widgets/duel links могут жить дольше экранов — fail closed.
  if (/(?:^|\/)phraseman\/(?:duel|arena(?:_join)?|quizzes?|quiz)(?:[/?#]|$)/i.test(raw)
    || /(?:^|\/)(?:duel|arena(?:_join)?|quizzes?|quiz)(?:[/?#]|$)/i.test(raw)) {
    return '/home';
  }

  // "Phrase of the day" widget taps:
  // - phraseman://phrase/<id>          -> open home, focus the daily phrase card
  // - phraseman://phrase/<id>?play=1   -> ...and auto-play its audio
  // The daily phrase lives in <DailyPhraseCard> on the home tab, so we route to
  // /home and pass openPhrase/play flags the card reacts to.
  const phraseMatch = raw.match(/(?:^|\/)phrase\/([A-Za-z0-9_-]+)/i);
  if (phraseMatch?.[1]) {
    const play = /[?&]play=1\b/i.test(raw) ? '&play=1' : '';
    return `/home?openPhrase=${encodeURIComponent(phraseMatch[1])}${play}`;
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

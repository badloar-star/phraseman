/**
 * Normalizes incoming deep links before Expo Router attempts matching.
 * This prevents "Unmatched Route" on root custom-scheme launches.
 */
export function redirectSystemPath({
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

  // Retired Quiz/Arena links from older installs must land on a valid safe screen.
  if (/(?:^|\/)(?:duel|arena(?:[_/-][a-z0-9_-]+)?|quizzes?(?:_screen)?)(?:[/?#]|$)/i.test(raw)) {
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

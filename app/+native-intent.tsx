/**
 * Normalizes incoming deep links before Expo Router attempts matching.
 * This prevents "Unmatched Route" on root custom-scheme launches.
 */
import { IS_STORE_RELEASE } from './config';
import { DebugLogger } from './debug-logger';

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

  // Personal-plan developer surfaces can modify local plan state. Store builds
  // must fail closed even when an old/system deep link targets them directly.
  if (
    IS_STORE_RELEASE &&
    /(?:^|\/)personal_plan_(?:runtime_)?dev(?:[/?#]|$)/i.test(raw)
  ) {
    return '/home';
  }

  // Arena V2 friend-duel links carry a random 128-bit invite id. This check
  // must precede the generic referral `/invite` matcher below.
  const arenaInviteMatch = raw.match(
    /(?:^|\/)arena\/invite\/([A-Za-z0-9_-]{20,200})(?:[/?#]|$)/i,
  );
  if (arenaInviteMatch?.[1]) {
    return `/arena_invite?inviteId=${encodeURIComponent(arenaInviteMatch[1])}`;
  }

  // зачем: экран /arena_ghost_duel удалён (владелец, 2026-08-16 — экраны
  // расширения убраны совсем, не только из таббара). Старая ссылка на
  // призрачную дуэль больше никуда не ведёт содержательно, поэтому падает в
  // тот же безопасный дом, что и остальные retired-ссылки ниже: живой корень
  // Арены, а не мёртвый экран или экран с ошибкой параметров.
  const arenaGhostMatch = raw.match(
    /(?:^|\/)arena\/ghost\/([A-Za-z0-9_.-]{20,200})(?:[/?#]|$)/i,
  );
  if (arenaGhostMatch?.[1]) {
    return '/arena';
  }

  // Arena V2 снова является живым продуктом. Старый catch-all ниже нужен для
  // удалённых duel/arena_join/quiz ссылок, но не должен поглощать новый корень.
  if (/^(?:\/phraseman)?\/arena\/?(?:[?#].*)?$/i.test(raw)) {
    return '/arena';
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

  // Retired competitive routes (кроме нового корня Arena V2). Старые
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

  // Personal-deck widget taps always target the exact local collection/card.
  // Decode once here; Expo Router receives a normal route with safe query data.
  const deckMatch = raw.match(/(?:^|\/)deck\/(saved|created)\/([^/?#]+)/i);
  if (deckMatch?.[1] && deckMatch[2]) {
    const category = deckMatch[1].toLowerCase() === 'saved' ? 'saved' : 'custom';
    let cardId = deckMatch[2];
    try { cardId = decodeURIComponent(cardId); } catch (e) {
      // already raw
      DebugLogger.error('+native-intent:cardId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return `/flashcards_collection?cat=${category}&widgetCard=${encodeURIComponent(cardId)}`;
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

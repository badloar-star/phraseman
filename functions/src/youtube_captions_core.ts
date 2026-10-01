/**
 * Чистое ядро «Взять расшифровку из YouTube» — без Firestore и секретов, всё
 * сетевое через переданный fetch, чтобы тестировалось целиком.
 *
 * зачем (владелец 01.10, через координатора): кнопка «⏱ Загрузить транскрипцию»
 * в «Видео-студии» должна сама брать расшифровку выбранного ролика, без выбора
 * файла, и бесплатно. Неофициальные пути закрыты (timedtext без pot-токена отдаёт
 * 0 байт, youtubei get_transcript → 400). Рабочий бесплатный путь — официальный
 * YouTube Data API от имени владельца канала: captions.list (50 ед.) →
 * captions.download tfmt=vtt (200 ед.), квота та же 10 000/сутки.
 *
 * Токены сюда приходят аргументами и НИКОГДА не попадают в логи и ответы.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const YOUTUBE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 15_000;
/** Расшифровка ролика — десятки КБ; больше — подозрительно, не тащим в память. */
export const MAX_TRANSCRIPT_BYTES = 4 * 1024 * 1024;

export class YoutubeCaptionsError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(code);
    this.name = 'YoutubeCaptionsError';
  }
}

type UnknownRecord = Record<string, unknown>;
const rec = (value: unknown): UnknownRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {});
const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

async function timedFetch(fetchImpl: FetchLike, url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (rec(error).name === 'AbortError') throw new YoutubeCaptionsError('timeout');
    throw new YoutubeCaptionsError('network');
  } finally {
    clearTimeout(timer);
  }
}

/** Ссылка на экран согласия Google. offline + consent — чтобы Google выдал refresh token. */
export function buildYoutubeAuthUrl(input: Readonly<{ clientId: string; redirectUri: string; state: string }>): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', YOUTUBE_OAUTH_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', input.state);
  return url.toString();
}

async function postToken(fetchImpl: FetchLike, body: Record<string, string>): Promise<UnknownRecord> {
  const response = await timedFetch(fetchImpl, TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  let json: UnknownRecord = {};
  try { json = rec(await response.json()); } catch { /* тело не JSON — решаем по статусу ниже */ }
  if (!response.ok) {
    // invalid_grant = токен отозван/истёк: нужно подключить канал заново.
    const reason = str(json.error) === 'invalid_grant' ? 'reconnect_required' : 'token_http';
    throw new YoutubeCaptionsError(reason, response.status);
  }
  return json;
}

export async function exchangeYoutubeAuthCode(
  fetchImpl: FetchLike,
  input: Readonly<{ code: string; clientId: string; clientSecret: string; redirectUri: string }>,
): Promise<Readonly<{ accessToken: string; refreshToken: string; scope: string }>> {
  const json = await postToken(fetchImpl, {
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
  });
  const accessToken = str(json.access_token);
  const refreshToken = str(json.refresh_token);
  if (!accessToken) throw new YoutubeCaptionsError('no_access_token');
  // Без refresh token подключение одноразовое — значит, Google не выдал offline-доступ.
  if (!refreshToken) throw new YoutubeCaptionsError('no_refresh_token');
  return { accessToken, refreshToken, scope: str(json.scope) };
}

export async function refreshYoutubeAccessToken(
  fetchImpl: FetchLike,
  input: Readonly<{ refreshToken: string; clientId: string; clientSecret: string }>,
): Promise<string> {
  const json = await postToken(fetchImpl, {
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'refresh_token',
  });
  const accessToken = str(json.access_token);
  if (!accessToken) throw new YoutubeCaptionsError('no_access_token');
  return accessToken;
}

async function apiGet(fetchImpl: FetchLike, path: string, params: Record<string, string>, auth: { accessToken?: string; apiKey?: string }): Promise<Response> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (auth.apiKey) url.searchParams.set('key', auth.apiKey);
  const headers: Record<string, string> = auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {};
  const response = await timedFetch(fetchImpl, url.toString(), { headers });
  if (!response.ok) {
    if (response.status === 401) throw new YoutubeCaptionsError('unauthorized', 401);
    if (response.status === 403) throw new YoutubeCaptionsError('forbidden_or_quota', 403);
    if (response.status === 404) throw new YoutubeCaptionsError('not_found', 404);
    throw new YoutubeCaptionsError('api_http', response.status);
  }
  return response;
}

/** Канал, от имени которого выдан токен (бренд-аккаунт выбирается на экране согласия). */
export async function fetchOwnChannels(fetchImpl: FetchLike, accessToken: string): Promise<{ id: string; title: string }[]> {
  const response = await apiGet(fetchImpl, 'channels', { part: 'snippet', mine: 'true', maxResults: '50' }, { accessToken });
  const items = rec(await response.json()).items;
  return (Array.isArray(items) ? items : []).map(rec)
    .map((item) => ({ id: str(item.id), title: str(rec(item.snippet).title) }))
    .filter((item) => item.id);
}

export type YoutubeVideoOwner = Readonly<{ channelId: string; channelTitle: string; title: string; audioLanguage: string }>;

/** Чей ролик — по публичному ключу API (1 ед.), токен канала для этого не нужен. */
export async function fetchVideoOwner(fetchImpl: FetchLike, apiKey: string, videoId: string): Promise<YoutubeVideoOwner> {
  const response = await apiGet(fetchImpl, 'videos', {
    part: 'snippet', id: videoId, fields: 'items(snippet(channelId,channelTitle,title,defaultAudioLanguage,defaultLanguage))',
  }, { apiKey });
  const item = (rec(await response.json()).items as unknown[] | undefined)?.map(rec)[0];
  if (!item) throw new YoutubeCaptionsError('video_not_found');
  const snippet = rec(item.snippet);
  const channelId = str(snippet.channelId);
  if (!channelId) throw new YoutubeCaptionsError('video_channel_unknown');
  return {
    channelId,
    channelTitle: str(snippet.channelTitle),
    title: str(snippet.title),
    audioLanguage: str(snippet.defaultAudioLanguage) || str(snippet.defaultLanguage),
  };
}

export type CaptionTrack = Readonly<{ id: string; language: string; trackKind: string; isDraft: boolean; name: string }>;

export async function listCaptionTracks(fetchImpl: FetchLike, accessToken: string, videoId: string): Promise<CaptionTrack[]> {
  const response = await apiGet(fetchImpl, 'captions', { part: 'snippet', videoId }, { accessToken });
  const items = rec(await response.json()).items;
  return (Array.isArray(items) ? items : []).map(rec).map((item) => {
    const snippet = rec(item.snippet);
    return {
      id: str(item.id),
      language: str(snippet.language),
      trackKind: str(snippet.trackKind).toLowerCase(),
      isDraft: snippet.isDraft === true,
      name: str(snippet.name),
    };
  }).filter((track) => track.id);
}

const langBase = (code: string): string => code.toLowerCase().split(/[-_]/)[0] ?? '';

/**
 * Какую дорожку брать: сначала ручную (standard) на языке звука ролика, потом
 * любую ручную, потом автоматическую (asr) на языке звука, потом любую asr.
 * Черновики и «forced» (только для перевода надписей) не берём.
 */
export function pickCaptionTrack(tracks: readonly CaptionTrack[], audioLanguage: string): CaptionTrack | null {
  const usable = tracks.filter((track) => !track.isDraft && track.trackKind !== 'forced');
  const audio = langBase(audioLanguage);
  const sameLang = (track: CaptionTrack) => Boolean(audio) && langBase(track.language) === audio;
  const manual = usable.filter((track) => track.trackKind !== 'asr');
  const asr = usable.filter((track) => track.trackKind === 'asr');
  return manual.find(sameLang) ?? manual[0] ?? asr.find(sameLang) ?? asr[0] ?? null;
}

export async function downloadCaptionVtt(fetchImpl: FetchLike, accessToken: string, trackId: string): Promise<string> {
  const response = await apiGet(fetchImpl, `captions/${encodeURIComponent(trackId)}`, { tfmt: 'vtt' }, { accessToken });
  const text = await response.text();
  if (!text.trim()) throw new YoutubeCaptionsError('caption_empty');
  if (Buffer.byteLength(text, 'utf8') > MAX_TRANSCRIPT_BYTES) throw new YoutubeCaptionsError('caption_too_large');
  return text;
}

/** Куда можно вернуть админа после согласия — только наш хостинг админки. */
export function safeAdminReturnUrl(raw: unknown, fallback: string): string {
  try {
    const url = new URL(String(raw ?? ''));
    const allowedHosts = new Set(['phraseman-ea0b3.web.app', 'phraseman-ea0b3.firebaseapp.com', 'localhost', '127.0.0.1']);
    if ((url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') && allowedHosts.has(url.hostname)) return url.toString();
  } catch { /* не URL — вернём запасной адрес ниже */ }
  return fallback;
}

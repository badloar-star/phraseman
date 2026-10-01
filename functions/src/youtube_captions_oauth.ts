import { randomBytes } from 'crypto';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { alignVideoPhraseTranscript, requireContentWriter, VIDEO_ID_RE } from './video_phrase_timing';
import {
  buildYoutubeAuthUrl,
  downloadCaptionVtt,
  exchangeYoutubeAuthCode,
  fetchOwnChannels,
  fetchVideoOwner,
  listCaptionTracks,
  pickCaptionTrack,
  refreshYoutubeAccessToken,
  safeAdminReturnUrl,
  YoutubeCaptionsError,
  type FetchLike,
} from './youtube_captions_core';

/**
 * «⏱ Взять расшифровку из YouTube» в «Видео-студии» админки.
 *
 * зачем (владелец 01.10, через координатора): кнопка должна сама брать
 * расшифровку выбранного ролика, без выбора файла, бесплатно. Путь — официальный
 * YouTube Data API от имени владельца канала (OAuth, scope youtube.force-ssl).
 *
 * Как устроено:
 *  1) adminYoutubeOAuthStart — админ жмёт «Подключить YouTube», получает ссылку
 *     на экран согласия Google (одноразовый state, 10 минут).
 *  2) youtubeOAuthCallback — Google возвращает code; сервер меняет его на
 *     refresh token и кладёт в admin_youtube_channels/{channelId}. Бренд-аккаунты
 *     подключаются по одному: канал выбирается на экране согласия.
 *  3) adminYoutubeChannelsList — какие каналы подключены (без токенов).
 *  4) adminFetchVideoTranscript — ролик → его канал → свежий access token →
 *     captions.list → дорожка → captions.download (vtt) → та же подгонка
 *     времени, что у ручной загрузки файла.
 *
 * Безопасность: refresh token живёт только на сервере (Admin SDK). Коллекции
 * исключены из админского catch-all в firestore.rules и закрыты `if false`.
 * Ни токены, ни code не пишутся в логи и не уходят в ответы.
 * App Check не включаем (запломбировано, CLAUDE.md).
 */
const REGION = 'us-central1';
const LOG = '[VIDEO-TRANSCRIPT]';
export const YOUTUBE_OAUTH_CLIENT_ID = defineSecret('YOUTUBE_OAUTH_CLIENT_ID');
export const YOUTUBE_OAUTH_CLIENT_SECRET = defineSecret('YOUTUBE_OAUTH_CLIENT_SECRET');
// Тот же секрет, что у каталога YouTube (youtube_catalog.ts); объявлен здесь, чтобы не тянуть каталог при старте.
const YOUTUBE_DATA_API_KEY = defineSecret('YOUTUBE_DATA_API_KEY');
export const YOUTUBE_OAUTH_REDIRECT_URI = 'https://us-central1-phraseman-ea0b3.cloudfunctions.net/youtubeOAuthCallback';
const ADMIN_FALLBACK_URL = 'https://phraseman-ea0b3.web.app/legacy.html';
export const CHANNELS_COLLECTION = 'admin_youtube_channels';
export const OAUTH_STATES_COLLECTION = 'admin_youtube_oauth_states';
const STATE_TTL_MS = 10 * 60 * 1000;

type AuthLike = { uid?: string; token?: Record<string, unknown> } | undefined;
const db = () => admin.firestore();
const fetchImpl: FetchLike = (input, init) => fetch(input, init);

function oauthClient(): { clientId: string; clientSecret: string } {
  const clientId = YOUTUBE_OAUTH_CLIENT_ID.value().trim();
  const clientSecret = YOUTUBE_OAUTH_CLIENT_SECRET.value().trim();
  if (!clientId || !clientSecret) {
    console.warn(`${LOG} oauth client secrets missing — владелец ещё не завёл OAuth-клиент`);
    throw new HttpsError('failed-precondition', 'youtube_oauth_not_configured');
  }
  return { clientId, clientSecret };
}

function codeOf(error: unknown): string {
  return error instanceof YoutubeCaptionsError ? error.code : error instanceof Error ? error.message : 'unknown';
}

export const adminYoutubeOAuthStart = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET] },
  async (request) => {
    const uid = requireContentWriter(request.auth as AuthLike);
    const { clientId } = oauthClient();
    const state = randomBytes(24).toString('hex');
    const returnUrl = safeAdminReturnUrl(request.data?.returnUrl, ADMIN_FALLBACK_URL);
    const nowMs = Date.now();
    await db().collection(OAUTH_STATES_COLLECTION).doc(state).set({
      uid,
      returnUrl,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + STATE_TTL_MS,
      // Служебная запись: TTL-политика по expireAt чистит её сама.
      expireAt: admin.firestore.Timestamp.fromMillis(nowMs + STATE_TTL_MS),
    });
    console.log(`${LOG} oauth:start uid=${uid} returnHost=${new URL(returnUrl).host}`);
    return { ok: true, url: buildYoutubeAuthUrl({ clientId, redirectUri: YOUTUBE_OAUTH_REDIRECT_URI, state }) };
  },
);

function redirectBack(res: { redirect: (status: number, url: string) => void }, returnUrl: string, params: Record<string, string>): void {
  const url = new URL(returnUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  res.redirect(302, url.toString());
}

export const youtubeOAuthCallback = onRequest(
  { region: REGION, secrets: [YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET], timeoutSeconds: 30 },
  async (req, res) => {
    const state = String(req.query.state ?? '');
    const code = String(req.query.code ?? '');
    const googleError = String(req.query.error ?? '');
    if (!/^[0-9a-f]{48}$/.test(state)) {
      console.warn(`${LOG} oauth:callback rejected — state malformed`);
      res.status(400).send('Неверная ссылка подключения. Вернитесь в админку и нажмите «Подключить YouTube» ещё раз.');
      return;
    }
    // Одноразовый state: читаем и удаляем в транзакции — повтор ссылки не сработает.
    const stateRef = db().collection(OAUTH_STATES_COLLECTION).doc(state);
    let stateData: FirebaseFirestore.DocumentData | undefined;
    try {
      stateData = await db().runTransaction(async (tx) => {
        const snap = await tx.get(stateRef);
        if (!snap.exists) return undefined;
        tx.delete(stateRef);
        return snap.data();
      });
    } catch (error) {
      console.error(`${LOG} oauth:callback state read failed`, codeOf(error));
      res.status(500).send('Не удалось проверить подключение. Попробуйте ещё раз.');
      return;
    }
    if (!stateData || Number(stateData.expiresAtMs ?? 0) < Date.now()) {
      console.warn(`${LOG} oauth:callback rejected — state ${stateData ? 'expired' : 'unknown_or_used'}`);
      res.status(400).send('Ссылка подключения устарела. Вернитесь в админку и нажмите «Подключить YouTube» ещё раз.');
      return;
    }
    const returnUrl = safeAdminReturnUrl(stateData.returnUrl, ADMIN_FALLBACK_URL);
    const uid = String(stateData.uid ?? '');
    if (googleError || !code) {
      console.warn(`${LOG} oauth:callback google_error=${googleError || 'no_code'} uid=${uid}`);
      redirectBack(res, returnUrl, { yt_oauth: 'denied' });
      return;
    }
    try {
      const { clientId, clientSecret } = oauthClient();
      const tokens = await exchangeYoutubeAuthCode(fetchImpl, { code, clientId, clientSecret, redirectUri: YOUTUBE_OAUTH_REDIRECT_URI });
      const channels = await fetchOwnChannels(fetchImpl, tokens.accessToken);
      if (!channels.length) {
        console.warn(`${LOG} oauth:callback no channel for this Google account uid=${uid}`);
        redirectBack(res, returnUrl, { yt_oauth: 'no_channel' });
        return;
      }
      const nowMs = Date.now();
      const batch = db().batch();
      for (const channel of channels) {
        batch.set(db().collection(CHANNELS_COLLECTION).doc(channel.id), {
          channelId: channel.id,
          title: channel.title,
          refreshToken: tokens.refreshToken,
          scope: tokens.scope,
          status: 'connected',
          connectedAtMs: nowMs,
          connectedByUid: uid,
        });
      }
      await batch.commit();
      console.log(`${LOG} oauth:callback connected channels=${channels.map((c) => c.id).join(',')} uid=${uid}`);
      redirectBack(res, returnUrl, { yt_oauth: 'connected', yt_channel: channels[0].title || channels[0].id });
    } catch (error) {
      console.error(`${LOG} oauth:callback failed reason=${codeOf(error)} uid=${uid}`);
      redirectBack(res, returnUrl, { yt_oauth: 'failed', yt_reason: codeOf(error) });
    }
  },
);

export const adminYoutubeChannelsList = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireContentWriter(request.auth as AuthLike);
  // Подключённых каналов единицы — читаем всю маленькую коллекцию, отдаём без токенов.
  const snap = await db().collection(CHANNELS_COLLECTION).limit(50).get();
  const channels = snap.docs.map((doc) => ({
    channelId: doc.id,
    title: String(doc.get('title') ?? ''),
    status: String(doc.get('status') ?? 'connected'),
    connectedAtMs: Number(doc.get('connectedAtMs') ?? 0),
  }));
  console.log(`${LOG} channels:list count=${channels.length}`);
  return { ok: true, channels };
});

export const adminFetchVideoTranscript = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, YOUTUBE_DATA_API_KEY],
  },
  async (request) => {
    const uid = requireContentWriter(request.auth as AuthLike);
    const videoId = String(request.data?.videoId ?? '').trim();
    if (!VIDEO_ID_RE.test(videoId)) throw new HttpsError('invalid-argument', 'video_id_invalid');
    const startedAt = Date.now();
    console.log(`${LOG} fetch:start video=${videoId} uid=${uid}`);

    let owner;
    try {
      owner = await fetchVideoOwner(fetchImpl, YOUTUBE_DATA_API_KEY.value(), videoId);
    } catch (error) {
      console.warn(`${LOG} fetch:video_owner_failed video=${videoId} reason=${codeOf(error)}`);
      throw new HttpsError('not-found', `video_lookup_failed:${codeOf(error)}`);
    }
    console.log(`${LOG} fetch:owner video=${videoId} channel=${owner.channelId} audioLang=${owner.audioLanguage || '-'}`);

    const channelRef = db().collection(CHANNELS_COLLECTION).doc(owner.channelId);
    const channelSnap = await channelRef.get();
    const refreshToken = String(channelSnap.get('refreshToken') ?? '');
    if (!channelSnap.exists || !refreshToken || channelSnap.get('status') === 'revoked') {
      console.warn(`${LOG} fetch:channel_not_connected channel=${owner.channelId} exists=${channelSnap.exists} status=${String(channelSnap.get('status') ?? '-')}`);
      throw new HttpsError('failed-precondition', 'youtube_channel_not_connected', {
        channelId: owner.channelId, channelTitle: owner.channelTitle,
      });
    }

    const { clientId, clientSecret } = oauthClient();
    let accessToken: string;
    try {
      accessToken = await refreshYoutubeAccessToken(fetchImpl, { refreshToken, clientId, clientSecret });
    } catch (error) {
      const reason = codeOf(error);
      console.warn(`${LOG} fetch:token_refresh_failed channel=${owner.channelId} reason=${reason}`);
      if (reason === 'reconnect_required') {
        await channelRef.set({ status: 'revoked', revokedAtMs: Date.now() }, { merge: true })
          .catch((writeError: unknown) => console.warn(`${LOG} fetch:mark_revoked_failed ${codeOf(writeError)}`));
        throw new HttpsError('failed-precondition', 'youtube_channel_not_connected', {
          channelId: owner.channelId, channelTitle: owner.channelTitle, reconnect: true,
        });
      }
      throw new HttpsError('unavailable', `youtube_token_failed:${reason}`);
    }

    let tracks;
    try {
      tracks = await listCaptionTracks(fetchImpl, accessToken, videoId);
    } catch (error) {
      console.warn(`${LOG} fetch:captions_list_failed video=${videoId} reason=${codeOf(error)}`);
      throw new HttpsError('unavailable', `captions_list_failed:${codeOf(error)}`);
    }
    const track = pickCaptionTrack(tracks, owner.audioLanguage);
    console.log(`${LOG} fetch:tracks video=${videoId} count=${tracks.length} picked=${track ? `${track.trackKind}/${track.language}` : 'none'}`);
    if (!track) throw new HttpsError('not-found', 'no_caption_tracks');

    let vtt: string;
    try {
      vtt = await downloadCaptionVtt(fetchImpl, accessToken, track.id);
    } catch (error) {
      console.warn(`${LOG} fetch:download_failed video=${videoId} track=${track.trackKind}/${track.language} reason=${codeOf(error)}`);
      throw new HttpsError('unavailable', `caption_download_failed:${codeOf(error)}`);
    }
    console.log(`${LOG} fetch:downloaded video=${videoId} bytes=${Buffer.byteLength(vtt, 'utf8')} ms=${Date.now() - startedAt}`);

    const result = alignVideoPhraseTranscript({ videoId, rawPhrases: request.data?.phrases, transcript: vtt, uid, source: 'youtube' });
    return { ...result, track: { kind: track.trackKind, language: track.language, name: track.name } };
  },
);

import {
  buildYoutubeAuthUrl,
  downloadCaptionVtt,
  exchangeYoutubeAuthCode,
  fetchVideoOwner,
  listCaptionTracks,
  pickCaptionTrack,
  refreshYoutubeAccessToken,
  safeAdminReturnUrl,
  YOUTUBE_OAUTH_SCOPE,
  type CaptionTrack,
  type FetchLike,
} from './youtube_captions_core';
import * as fs from 'fs';
import * as path from 'path';

function fakeFetch(routes: Array<{ match: RegExp; status?: number; json?: unknown; text?: string }>, seen: string[] = []): FetchLike {
  return async (input) => {
    seen.push(String(input));
    const route = routes.find((r) => r.match.test(String(input)));
    if (!route) throw new Error(`unexpected ${input}`);
    const status = route.status ?? 200;
    const body = route.text ?? JSON.stringify(route.json ?? {});
    return new Response(body, { status });
  };
}

const track = (over: Partial<CaptionTrack>): CaptionTrack => ({ id: 'x', language: 'en', trackKind: 'standard', isDraft: false, name: '', ...over });

describe('youtube captions core', () => {
  it('ссылка согласия просит offline-доступ, consent и только youtube.force-ssl', () => {
    const url = new URL(buildYoutubeAuthUrl({ clientId: 'cid', redirectUri: 'https://cb', state: 's1' }));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toBe(YOUTUBE_OAUTH_SCOPE);
    expect(url.searchParams.get('state')).toBe('s1');
  });

  it('обмен кода: без refresh token — ошибка (иначе подключение одноразовое)', async () => {
    const f = fakeFetch([{ match: /oauth2\.googleapis\.com\/token/, json: { access_token: 'a' } }]);
    await expect(exchangeYoutubeAuthCode(f, { code: 'c', clientId: 'i', clientSecret: 's', redirectUri: 'r' }))
      .rejects.toMatchObject({ code: 'no_refresh_token' });
  });

  it('отозванный токен (invalid_grant) → reconnect_required', async () => {
    const f = fakeFetch([{ match: /token/, status: 400, json: { error: 'invalid_grant' } }]);
    await expect(refreshYoutubeAccessToken(f, { refreshToken: 'r', clientId: 'i', clientSecret: 's' }))
      .rejects.toMatchObject({ code: 'reconnect_required' });
  });

  it('владелец ролика берётся по ключу API, без токена канала', async () => {
    const seen: string[] = [];
    const f = fakeFetch([{ match: /\/videos\?/, json: { items: [{ snippet: { channelId: 'UC1', channelTitle: 'Chan', title: 'T', defaultAudioLanguage: 'en-US' } }] } }], seen);
    const owner = await fetchVideoOwner(f, 'KEY', 'abcdefghijk');
    expect(owner).toEqual({ channelId: 'UC1', channelTitle: 'Chan', title: 'T', audioLanguage: 'en-US' });
    expect(seen[0]).toContain('key=KEY');
  });

  it('список дорожек разбирается, пустые id отбрасываются', async () => {
    const f = fakeFetch([{ match: /\/captions\?/, json: { items: [{ id: 't1', snippet: { language: 'en', trackKind: 'ASR' } }, { snippet: {} }] } }]);
    expect(await listCaptionTracks(f, 'tok', 'abcdefghijk')).toEqual([{ id: 't1', language: 'en', trackKind: 'asr', isDraft: false, name: '' }]);
  });

  it('выбор дорожки: ручная на языке звука → любая ручная → asr на языке → любая asr; черновики и forced мимо', () => {
    const asrEn = track({ id: 'asr-en', trackKind: 'asr', language: 'en' });
    const manualRu = track({ id: 'man-ru', language: 'ru' });
    const manualEn = track({ id: 'man-en', language: 'en-GB' });
    const draftEn = track({ id: 'draft', language: 'en', isDraft: true });
    const forced = track({ id: 'forced', trackKind: 'forced', language: 'en' });
    expect(pickCaptionTrack([asrEn, manualRu, manualEn, draftEn, forced], 'en-US')?.id).toBe('man-en');
    expect(pickCaptionTrack([asrEn, manualRu], 'en')?.id).toBe('man-ru');
    expect(pickCaptionTrack([asrEn, track({ id: 'asr-ru', trackKind: 'asr', language: 'ru' })], 'en')?.id).toBe('asr-en');
    expect(pickCaptionTrack([draftEn, forced], 'en')).toBeNull();
  });

  it('скачивание vtt: пустой ответ — ошибка', async () => {
    const f = fakeFetch([{ match: /\/captions\/t1\?tfmt=vtt/, text: '  ' }]);
    await expect(downloadCaptionVtt(f, 'tok', 't1')).rejects.toMatchObject({ code: 'caption_empty' });
  });

  it('403 от API (нет прав на ролик или квота) — понятный код', async () => {
    const f = fakeFetch([{ match: /\/captions\?/, status: 403 }]);
    await expect(listCaptionTracks(f, 'tok', 'abcdefghijk')).rejects.toMatchObject({ code: 'forbidden_or_quota' });
  });

  it('возврат после согласия — только на наш хостинг', () => {
    expect(safeAdminReturnUrl('https://phraseman-ea0b3.web.app/legacy.html#video', 'F')).toBe('https://phraseman-ea0b3.web.app/legacy.html#video');
    expect(safeAdminReturnUrl('https://evil.example/steal', 'F')).toBe('F');
    expect(safeAdminReturnUrl('javascript:alert(1)', 'F')).toBe('F');
  });

  it('модуль OAuth не пишет токены и code в логи и закрыт правилами', () => {
    const src = fs.readFileSync(path.join(__dirname, 'youtube_captions_oauth.ts'), 'utf8');
    const logLines = src.split('\n').filter((line) => /console\.(log|warn|error)/.test(line));
    for (const line of logLines) {
      expect(line).not.toMatch(/refreshToken|accessToken|tokens\.|\$\{code\}|clientSecret/);
    }
    expect(src).not.toMatch(/enforceAppCheck:\s*true/);
    const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    expect(rules).toContain("collection != 'admin_youtube_channels'");
    expect(rules).toContain("collection != 'admin_youtube_oauth_states'");
  });
});

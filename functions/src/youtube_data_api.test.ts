import {
  YoutubeDataApiError,
  createYoutubeDataGateway,
  type FetchLike,
} from './youtube_data_api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('YouTube Data API gateway', () => {
  test('requests channel metadata with bounded fields and keeps the key out of results', async () => {
    const fetchImpl = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(async () => jsonResponse({
      items: [{
        id: 'UCNNVZbMkh4jrW6uluaaJTwA',
        snippet: {
          title: 'PHRASEMAN',
          customUrl: '@PhrasemanENGLISH',
          thumbnails: { high: { url: 'https://yt3.ggpht.com/avatar' } },
        },
        contentDetails: { relatedPlaylists: { uploads: 'UUNNVZbMkh4jrW6uluaaJTwA' } },
      }],
    }));
    const gateway = createYoutubeDataGateway({ apiKey: 'server-secret', fetchImpl });

    await expect(gateway.getChannel('UCNNVZbMkh4jrW6uluaaJTwA')).resolves.toMatchObject({
      displayName: 'PHRASEMAN',
      handle: '@PhrasemanENGLISH',
      uploadsPlaylistId: 'UUNNVZbMkh4jrW6uluaaJTwA',
    });

    const requestUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://www.googleapis.com/youtube/v3/channels');
    expect(requestUrl.searchParams.get('fields')).toBeTruthy();
    expect(requestUrl.searchParams.get('key')).toBe('server-secret');
    expect(JSON.stringify(await gateway.getChannel('UCNNVZbMkh4jrW6uluaaJTwA'))).not.toContain('server-secret');
  });

  test('chunks videos.list requests at 50 ids', async () => {
    const fetchImpl = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(async (input) => {
      const ids = new URL(String(input)).searchParams.get('id')?.split(',') ?? [];
      return jsonResponse({ items: ids.map((id) => ({
        id,
        snippet: {
          title: `Video ${id}`,
          description: '',
          publishedAt: '2026-08-08T12:00:00Z',
          thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } },
        },
        statistics: { viewCount: '42' },
        contentDetails: { duration: 'PT10M' },
        liveStreamingDetails: {},
      })) });
    });
    const gateway = createYoutubeDataGateway({ apiKey: 'secret', fetchImpl });
    const ids = Array.from({ length: 51 }, (_, index) => `${String(index).padStart(10, '0')}A`);

    const videos = await gateway.getVideos(ids);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(videos).toHaveLength(51);
  });

  test('paginates playlist items but stops at the requested limit', async () => {
    const fetchImpl = jest
      .fn<ReturnType<FetchLike>, Parameters<FetchLike>>()
      .mockResolvedValueOnce(jsonResponse({
        items: [{ contentDetails: { videoId: 'aaaaaaaaaaa' } }],
        nextPageToken: 'next',
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [
          { contentDetails: { videoId: 'bbbbbbbbbbb' } },
          { contentDetails: { videoId: 'ccccccccccc' } },
        ],
      }));
    const gateway = createYoutubeDataGateway({ apiKey: 'secret', fetchImpl });

    await expect(gateway.getPlaylistVideoIds('PL1234567890', 2)).resolves.toEqual([
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('normalizes quota errors without leaking the API key', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({ error: { message: 'quota exceeded' } }, 403);
    const gateway = createYoutubeDataGateway({ apiKey: 'never-log-me', fetchImpl });

    await expect(gateway.searchEvents('UCNNVZbMkh4jrW6uluaaJTwA', 'live')).rejects.toMatchObject({
      name: 'YoutubeDataApiError',
      code: 'quota',
      retryable: false,
    });
    try {
      await gateway.searchEvents('UCNNVZbMkh4jrW6uluaaJTwA', 'live');
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeDataApiError);
      expect(String(error)).not.toContain('never-log-me');
    }
  });

  test('turns an aborted request into a retryable timeout error', async () => {
    const fetchImpl: FetchLike = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    });
    const gateway = createYoutubeDataGateway({ apiKey: 'secret', fetchImpl, timeoutMs: 5 });

    await expect(gateway.getPlaylists('UCNNVZbMkh4jrW6uluaaJTwA', 5)).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
    });
  });
});

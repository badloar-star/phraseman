// зачем (координатор 12.10, «сперва логи»): пустые превью роликов на cards-028 и в ленте «Видео» Главной чинятся по фактам — журнал [THUMB] должен
// называть поверхность, id, адрес, источник картинки, время и при ошибке код ответа. Тест держит и поведение журнала, и подключение в обоих местах.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('[THUMB] trace of video previews', () => {
  let logs: string[];
  let warns: string[];
  beforeEach(() => {
    jest.resetModules();
    logs = [];
    warns = [];
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.join(' ')); });
    jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { warns.push(args.join(' ')); });
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('logs start and load once per address with the source of the picture', () => {
    const { thumbTrace } = require('../app/thumb_trace') as typeof import('../app/thumb_trace');
    const h = thumbTrace('home_video_rail', 'abc', 'https://i.ytimg.com/vi/abc/hqdefault.jpg?sqp=secret');
    h.onLoadStart();
    h.onLoadStart();
    h.onLoad({ cacheType: 'none', source: { url: 'x', width: 480, height: 360, mediaType: 'image/jpeg' } });
    h.onLoad({ cacheType: 'none', source: { url: 'x', width: 480, height: 360, mediaType: 'image/jpeg' } });
    expect(logs.filter((l) => l.includes('[THUMB] start'))).toHaveLength(1);
    const load = logs.filter((l) => l.includes('[THUMB] load'));
    expect(load).toHaveLength(1);
    expect(load[0]).toContain('home_video_rail id=abc url=i.ytimg.com/vi/abc/hqdefault.jpg');
    expect(load[0]).toContain('источник=сеть');
    expect(load[0]).not.toContain('secret'); // параметры запроса в журнал не идут
  });

  it('on error writes the reason and probes the address once for the server code', async () => {
    const fetchMock = jest.fn(async () => ({ status: 404, headers: { get: () => 'text/html' } }));
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
    const { thumbTrace } = require('../app/thumb_trace') as typeof import('../app/thumb_trace');
    const h = thumbTrace('video_pack_card', 'p1', 'https://i.ytimg.com/vi/zzz/hqdefault.jpg');
    h.onError({ error: 'java.net.UnknownHostException: i.ytimg.com' });
    h.onError({ error: 'java.net.UnknownHostException: i.ytimg.com' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(warns.filter((l) => l.includes('[THUMB] error'))).toHaveLength(1);
    expect(warns[0]).toContain('UnknownHostException');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logs.some((l) => l.includes('[THUMB] probe') && l.includes('http=404'))).toBe(true);
  });

  it('a failed probe is logged with its reason, not swallowed', async () => {
    (globalThis as { fetch?: unknown }).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    const { thumbTrace } = require('../app/thumb_trace') as typeof import('../app/thumb_trace');
    thumbTrace('home_video_rail', 'v9', 'https://i.ytimg.com/vi/v9/hqdefault.jpg').onError({ error: 'timeout' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(warns.some((l) => l.includes('[THUMB] probe') && l.includes('Network request failed'))).toBe(true);
  });

  it('an empty address is reported with the reason and renders nothing', () => {
    const { traceThumbMissing } = require('../app/thumb_trace') as typeof import('../app/thumb_trace');
    expect(traceThumbMissing('home_video_rail', 'v1', 'thumbnailUrl пуст')).toBeNull();
    expect(traceThumbMissing('home_video_rail', 'v1', 'thumbnailUrl пуст')).toBeNull();
    expect(warns.filter((l) => l.includes('url=(пусто)'))).toHaveLength(1);
  });

  it('both surfaces are wired (Home video rail, Cards video pack row — card and plain variants)', () => {
    const rail = read('components/home/v2/HomeV2VideoRail.tsx');
    expect(rail).toMatch(/thumbTrace\('home_video_rail', video\.id, video\.thumbnailUrl\)/);
    expect(rail).toContain('traceThumbMissing');
    // зачем (координатор 12.10, cards-028): превью и запасной вид живут в VideoThumb; строка набора подключает его для обеих плиток
    const row = read('app/flashcards/VideoPackRow.tsx');
    expect(row).toMatch(/<VideoThumb surface="video_pack_card" id=\{pack\.id\}/);
    expect(row).toMatch(/<VideoThumb surface=\{plain \? 'video_pack_plain' : 'video_pack_card'\} id=\{pack\.id\}/);
    const thumb = read('app/flashcards/VideoThumb.tsx');
    expect(thumb).toMatch(/thumbTrace\(surface, id, thumbUrl\)/);
    expect(thumb).toContain('traceThumbMissing(surface, id,');
  });
});

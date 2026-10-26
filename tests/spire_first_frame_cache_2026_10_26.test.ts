// Владелец 26.10 (скрин эмулятора, вкладка Пик): «СДЕЛАЙ, ЧТОБЫ ПИК ВСЕГДА БЫЛ В ПРОГРУЖЕННОМ СОСТОЯНИИ!» — на входе были «ступень 0 из 5»,
// «Комната недели 0», «—» и серая «Играть». Комната уже лежала в памяти (прогрев на Главной), но экран ждал асинхронного uid, а неделю
// никто заранее не читал. Теперь: uid и комната — синхронно из памяти на первом кадре, неделя прогревается на Главной вместе с комнатой,
// без кэша и конфига — скелет под потолком 2,5 с. Чтений Firestore на первом кадре — 0.
import fs from 'node:fs';
import path from 'node:path';

const mockRoom = { weekId: 'W', members: [{ uid: 'a' }, { uid: 'b' }], tier: 2, fetchedAtMs: 1 };
let mockStableId: string | null = 'sid-1';
let mockRoomInMemory = true;

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/stable_id', () => ({ peekStableId: () => mockStableId }));
jest.mock('../app/spire_report_client', () => ({ peekSpireWeekLocal: () => null, spireReadWeekLocal: async () => null }));
jest.mock('../app/spire_config_client', () => ({ peekSpireConfig: () => null, warmSpireConfigFromDisk: async () => 'none' }));
jest.mock('../app/spire/spire_room_client', () => ({
  peekSpireRoom: (uid: string, lang: string) => (mockRoomInMemory && uid === 'sid-1' && lang === 'en' ? mockRoom : null),
  spireReadRoomCache: async () => null,
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: async () => 'sid-1' }));
jest.mock('../components/spire/spire_tower_model', () => ({ spireCurrentWeekKey: () => 'W' }));
jest.mock('../components/spire/spire_home_week', () => ({ asSpireLang: (v: unknown) => (v === 'en' ? 'en' : null) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const trace = require('../app/spire/spire_load_trace') as typeof import('../app/spire/spire_load_trace');
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: первый кадр из памяти, без «0» и «—»', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { mockStableId = 'sid-1'; mockRoomInMemory = true; logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => logSpy.mockRestore());

  it('uid = stableId из памяти процесса; нет stableId — null (тогда ждём чтения, как раньше)', () => {
    expect(trace.spirePeekFirstFrameIds()).toEqual({ uid: 'sid-1', stableId: 'sid-1' });
    mockStableId = null;
    expect(trace.spirePeekFirstFrameIds()).toBeNull();
  });

  it('комната в памяти — сразу на первом кадре, 0 чтений; в журнале источник каждой части', () => {
    expect(trace.spirePeekFirstFrameRoomLoad('en')).toEqual({ status: 'cache', room: mockRoom, reason: 'memory_first_frame' });
    const line = logSpy.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('[SPIRE-LOAD] first_frame')) ?? '';
    expect(line).toContain('"room":"memory"');
    expect(line).toContain('"ids":"memory"');
    expect(line).toContain('"reads":0');
  });

  it('памяти нет / язык без Пика — null (экран рисует скелет), причина в журнале', () => {
    mockRoomInMemory = false;
    expect(trace.spirePeekFirstFrameRoomLoad('en')).toBeNull();
    expect(trace.spirePeekFirstFrameRoomLoad('de')).toBeNull();
    expect(logSpy.mock.calls.map((c) => c.join(' ')).some((l) => l.includes('"room":"none"'))).toBe(true);
  });

  it('хук: начальные uid и комната из памяти; повтор того же uid не пересоздаёт объект (без второй волны сети)', () => {
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain('useState<Readonly<{ uid: string; stableId: string }> | null>(spirePeekFirstFrameIds)');
    expect(game).toContain('useState<SpireRoomLoad | null>(() => spirePeekFirstFrameRoomLoad(lang))');
    expect(game).toContain('setIds((cur) => (cur && cur.uid === uid && cur.stableId === stableId ? cur : { uid, stableId }))');
  });

  it('Главная прогревает и комнату, и свою неделю — один раз после первого кадра, только с устройства', () => {
    const src = read('app/spire/spire_load_trace.ts');
    expect(src).toContain('await Promise.all([spireReadRoomCache(uid, lang), spireReadWeekLocal(uid, lang)');
    expect(src).toContain("spireLoadMark('week:warm'");
    expect(read('app/(tabs)/home.tsx')).toContain("runAfterHomeFirstFrame('spire_room_warm'");
  });
});

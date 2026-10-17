// зачем (жалоба владельца 17.10: «Пик очень долго грузился — людей не видно, кнопка „Играть“ недоступна»): первый кадр Пика —
// из копии прошлой загрузки на устройстве (любого возраста, эта неделя), сеть догоняет фоном. Сторож правила и журнала [SPIRE-LOAD].
import fs from 'node:fs';
import path from 'node:path';

const mockRoomCache = jest.fn();
const mockPeekRoom = jest.fn();
const mockWarm = jest.fn();
const mockPeekConfig = jest.fn();
jest.mock('../app/spire/spire_room_client', () => ({ peekSpireRoom: (...a: unknown[]) => mockPeekRoom(...a), spireReadRoomCache: (...a: unknown[]) => mockRoomCache(...a) }));
jest.mock('../app/spire_config_client', () => ({ warmSpireConfigFromDisk: () => mockWarm(), peekSpireConfig: () => mockPeekConfig() }));
jest.mock('../components/spire/spire_tower_model', () => ({ spireCurrentWeekKey: () => '2026-W42' }));

/* eslint-disable import/first */
import { spireFirstFrameRoom, spireLoadEnter } from '../app/spire/spire_load_trace';
/* eslint-enable import/first */

const room = (weekId: string, ageMs: number) => ({ weekId, fetchedAtMs: Date.now() - ageMs, members: [{}, {}], tier: 2 });
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: первый кадр из копии прошлой загрузки', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); mockRoomCache.mockReset(); mockPeekRoom.mockReset(); mockWarm.mockReset(); mockPeekConfig.mockReset(); });

  it('комната этой недели с диска показывается сразу, даже старше 6 ч', async () => {
    mockPeekRoom.mockReturnValue(null);
    mockRoomCache.mockResolvedValue(room('2026-W42', 9 * 60 * 60 * 1000));
    const load = await spireFirstFrameRoom('u1', 'en', 12);
    expect(load).toMatchObject({ status: 'cache', reason: 'disk_first_frame' });
    expect(load?.room?.members).toHaveLength(2);
  });

  it('память — раньше диска; комната прошлой недели — не показывается', async () => {
    mockPeekRoom.mockReturnValue(room('2026-W42', 0));
    expect(await spireFirstFrameRoom('u1', 'en', 0)).toMatchObject({ reason: 'memory_peek' });
    expect(mockRoomCache).not.toHaveBeenCalled();
    mockPeekRoom.mockReturnValue(null);
    mockRoomCache.mockResolvedValue(room('2026-W41', 0));
    expect(await spireFirstFrameRoom('u1', 'en', 0)).toBeNull();
  });

  it('конфиг: память пуста → с диска; в памяти — диск не читается', async () => {
    mockWarm.mockResolvedValue('disk');
    mockPeekConfig.mockReturnValue({ enabled: true });
    expect(await spireLoadEnter(false)).toEqual({ enabled: true });
    mockWarm.mockClear();
    expect(await spireLoadEnter(true)).toBeNull();
    expect(mockWarm).not.toHaveBeenCalled();
  });
});

describe('Пик: экран и хук подключены', () => {
  it('экран берёт конфиг с диска до сети и пишет готовность «Играть»; хук берёт комнату с диска', () => {
    const screen = read('components/spire/SpireHomeScreen.tsx');
    const hook = read('app/spire/use_spire_game.ts');
    expect(screen).toContain('void spireLoadEnter(config !== null).then((disk) => { if (alive && disk) setConfig((cur) => cur ?? disk); });');
    expect(screen).toContain('useSpireLoadReadiness(realGame, preview !== null);');
    expect(hook).toContain('void spireFirstFrameRoom(uid, lang as SpireLang, Date.now() - identityStartedAt).then((first) => { if (alive && first) setRoomLoad((cur) => cur ?? first); });');
    expect(hook).toMatch(/spireLoadMark\('room:sync', \{ status: load\.status/);
  });
});

describe('Пик: ворота не пересоздаются тем же конфигом', () => {
  it('зависимость ворот — содержимое конфига, не объект (замер 17.10: тройной room:sync)', () => {
    expect(read('app/spire/use_spire_game.ts')).toContain('[unlocked, lang, config ? JSON.stringify(config) : null]');
  });
});

describe('💸 Пик: без опроса раз в 5 минут, журнал [SPIRE-COST]', () => {
  it('досылка — вход, фон, закрытие этажа, уход с экрана; таймера нет', () => {
    const hook = read('app/spire/use_spire_game.ts');
    expect(hook).not.toMatch(/setInterval\(\(\) => flush\('interval'\)/);
    expect(hook).toContain("if (kind === 'floor' || kind === 'summit') flush('floor_closed');");
    expect(hook).toContain("flush('app_background')");
    expect(hook).toContain("flush('screen_leave')");
  });
  it('каждый запрос и пропуск отчётов и комнаты пишет причину', () => {
    const report = read('app/spire_report_client.ts');
    const room = read('app/spire/spire_room_client.ts');
    for (const why of ["why: 'cloud_off'", "why: 'not_current_owner'", "result: out.status === 'skipped' ? 'skip' : out.status"]) expect(report).toContain(why);
    expect(room).toContain("call: 'room', result: 'skip', why: 'cache_fresh'");
    expect(room).toContain("call: 'room', result: 'request'");
  });
});

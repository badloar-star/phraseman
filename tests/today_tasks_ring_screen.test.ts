// зачем (владелец 17.10, координатор): кольца дня — не на Главной, а на экране «Сегодня» по «Смотреть все»; заполнение «до → после»
// с прошлого открытия, первое за день — от нуля. Сторож: правило «до», память/диск/потолок, экран и Главная по строкам файлов.
import fs from 'node:fs';
import path from 'node:path';

const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));

/* eslint-disable import/first */
import {
  __resetTodayRingSeenForTests,
  readTodayRingFrom,
  rememberTodayRingSeen,
  TODAY_RING_SEEN_KEY,
  todayRingFrom,
} from '../app/today_ring_seen';
/* eslint-enable import/first */

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кольцо дня: откуда заполнять', () => {
  beforeEach(() => { storage.clear(); __resetTodayRingSeenForTests(); });

  it('тот же день — с увиденного; другой день или пусто — от нуля', () => {
    expect(todayRingFrom({ dayKey: 'd1|lesson,cards,dialog', progress: [1, 2, 0] }, 'd1|lesson,cards,dialog')).toEqual([1, 2, 0]);
    expect(todayRingFrom({ dayKey: 'd0|lesson,cards,dialog', progress: [1, 2, 0] }, 'd1|lesson,cards,dialog')).toEqual([0, 0, 0]);
    expect(todayRingFrom(null, 'd1')).toEqual([0, 0, 0]);
  });

  it('первое открытие за день — от нуля; второе — с того, что показали', async () => {
    expect(await readTodayRingFrom('d1|a,b,c')).toEqual({ from: [0, 0, 0], source: 'none' });
    rememberTodayRingSeen('d1|a,b,c', [1, 3, 4]);
    expect(await readTodayRingFrom('d1|a,b,c')).toEqual({ from: [1, 3, 4], source: 'memory' });
  });

  it('после перезапуска «до» берётся с диска; смена набора дня — от нуля', async () => {
    storage.set(TODAY_RING_SEEN_KEY, JSON.stringify({ dayKey: 'd1|a,b,c', progress: [0, 1, 5] }));
    expect(await readTodayRingFrom('d1|a,b,c')).toEqual({ from: [0, 1, 5], source: 'disk' });
    __resetTodayRingSeenForTests();
    expect(await readTodayRingFrom('d1|a,c,b')).toEqual({ from: [0, 0, 0], source: 'other_day' });
  });

  it('битая запись — от нуля, без падения', async () => {
    storage.set(TODAY_RING_SEEN_KEY, '{"dayKey":1}');
    expect(await readTodayRingFrom('d1')).toEqual({ from: [0, 0, 0], source: 'broken' });
  });
});

describe('экран «Сегодня» и Главная — по строкам файлов', () => {
  const screen = read('app/today_tasks.tsx');
  const card = read('components/home/v2/HomeV2TodayCard.tsx');
  const home = read('app/(tabs)/home.tsx');
  const rings = read('components/streak/moments/TodayRings.tsx');

  it('экран: кольцо с «до» из памяти/диска, место под кольцо зарезервировано, те же строки задач, журнал [TODAY-RING]', () => {
    // макет Б (Макеты 17.10): кольца 222, монета 86, без плашки «День выполнен»; место под блок — константа без условий
    expect(screen).toContain('<TodayRingsSlot tasks={tasks} fromProgress={ringFrom.from} size={222} showDayDone={false} />');
    expect(screen).toContain('rings: { minHeight: RINGS_BLOCK_HEIGHT, paddingTop: 26, paddingBottom: 12 }');
    expect(screen).not.toMatch(/DAY_DONE_EXTRA/);
    expect(screen).toContain('<HomeV2TodayCard title={null} tasks={tasks} onOpenTask={openTask} doneColors={ringsOn ? doneColors : null} />');
    expect(screen).toContain('rememberTodayRingSeen(seenKey, progress);');
    for (const tag of ['screen:open', 'ring:from', 'task:open']) expect(screen).toContain(`[TODAY-RING] ${tag}`);
    expect(screen).toMatch(/entering=\{reduceMotion \? undefined : RINGS_ENTER\}/);
  });

  it('кольца: старт с «до», reduceMotion — сразу финал', () => {
    expect(rings).toContain('const v = useSharedValue(instant ? value : from);');
    expect(rings).toContain('instant={reduceMotion}');
  });

  it('Главная: без колец, отметка нейтральная, «Смотреть все» → /today_tasks только за флагом', () => {
    expect(card).not.toMatch(/TodayRingsSlot|todayRingColors/);
    expect(card).toContain('const doneColor = doneColors?.[index] ?? p.iconTint;');
    expect(card).toContain('testID="home-v2-today-see-all"');
    expect(card).toContain('const seeAllShown = ringsScreenOn ? seeAll : null;');
    expect(home).toMatch(/seeAll=\{\{/);
    expect(home).toContain("go('/today_tasks');");
  });
});

describe('кольца 222 (макет Б): толщина 16, зазор 7, монета 86; 148 — как было', () => {
  const rings = read('components/streak/moments/TodayRings.tsx');
  it('геометрия и плашка «День выполнен» по пропу', () => {
    expect(rings).toContain('222: Object.freeze({ size: 222, stroke: 16, gap: 7, coin: 86 })');
    expect(rings).toContain('148: Object.freeze({ size: 148, stroke: STROKE, gap: GAP, coin: 58 })');
    expect(rings).toContain('{allClosed && showDayDone ? (');
    expect(rings).toContain('delayMs={fromProgress ? i * RING_STAGGER_MS : 0}');
  });
});

describe('заголовок экрана «Сегодня» 28/34 (макет Б), остальные экраны — общий стиль', () => {
  it('размер только здесь', () => {
    expect(read('app/today_tasks.tsx')).toContain('title: { flex: 1, ...V2_TYPE.title, fontSize: 28, lineHeight: 34 },');
  });
});

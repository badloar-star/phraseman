// зачем (координатор 15.10): рубежи серии подключены к настоящему событию роста серии. Проверяем: решение показа (флаг, дата, число дней), хранилище «рубеж ждёт показа»
// (один раз на рубеж, пауза для других окон, сброс), и что подключение на месте в streak_day_signal / итоге урока / итоге разговора (ленивая загрузка, очередь «сначала рубеж»).
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';
import { decideStreakMilestone } from '../components/streak/moments/streak_milestone_gate';
import {
  __resetStreakMilestonePendingForTests,
  consumeStreakMilestonePending,
  isStreakMilestoneHold,
  markStreakMilestoneOpen,
  noteStreakMilestonePending,
  peekStreakMilestonePending,
} from '../app/streak_milestone_pending';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
const TODAY = '2026-10-15';
const FACT = { dayKey: TODAY, counted: true, days: 7 };
const base = { momentsV3: true, pending: { days: 7, dayKey: TODAY }, today: TODAY, fact: FACT };

describe('решение показа окна рубежа', () => {
  it('всё сходится — показать, с названием рубежа', () => {
    expect(decideStreakMilestone(base)).toMatchObject({ show: true, milestone: 7 });
  });
  it.each([
    ['флаг выключен', { ...base, momentsV3: false }],
    ['нет ожидающего рубежа', { ...base, pending: null }],
    ['рубеж другого дня', { ...base, pending: { days: 7, dayKey: '2026-10-14' } }],
    ['число не рубеж', { ...base, pending: { days: 8, dayKey: TODAY }, fact: { ...FACT, days: 8 } }],
    ['состояние серии неизвестно', { ...base, fact: null }],
    ['день не засчитан', { ...base, fact: { ...FACT, counted: false } }],
    ['состояние другого дня', { ...base, fact: { ...FACT, dayKey: '2026-10-14' } }],
    ['число дней сменилось', { ...base, fact: { ...FACT, days: 9 } }],
  ])('не показывать: %s', (_name, input) => {
    const d = decideStreakMilestone(input as never);
    expect(d.show).toBe(false);
    expect(d.reason.length).toBeGreaterThan(5);
  });
});

describe('рубеж ждёт показа в памяти', () => {
  beforeEach(() => { __resetStreakMilestonePendingForTests(); });

  it('записали → забрали один раз → повтор того же рубежа в тот же день не ставится', () => {
    noteStreakMilestonePending(30, TODAY);
    expect(peekStreakMilestonePending()).toEqual({ days: 30, dayKey: TODAY });
    expect(consumeStreakMilestonePending()).toEqual({ days: 30, dayKey: TODAY });
    expect(peekStreakMilestonePending()).toBeNull();
    noteStreakMilestonePending(30, TODAY);
    expect(peekStreakMilestonePending()).toBeNull(); // показали — один раз на рубеж
  });
  it('новый рубеж другого дня ставится', () => {
    noteStreakMilestonePending(30, TODAY);
    consumeStreakMilestonePending();
    noteStreakMilestonePending(50, '2026-11-04');
    expect(peekStreakMilestonePending()).toEqual({ days: 50, dayKey: '2026-11-04' });
  });
  it('забрать, когда ничего нет — null', () => {
    expect(consumeStreakMilestonePending()).toBeNull();
  });
  it('пауза для других окон: hold непрерывно true от записи до закрытия и ровно один раз падает в false (m09/m17 откроются один раз)', () => {
    const trace: boolean[] = [isStreakMilestoneHold()];
    noteStreakMilestonePending(7, TODAY); trace.push(isStreakMilestoneHold());
    markStreakMilestoneOpen(7); trace.push(isStreakMilestoneHold()); // хост: сначала «открыто»
    consumeStreakMilestonePending(); trace.push(isStreakMilestoneHold()); // потом забирает ожидающий — пауза не мигает
    markStreakMilestoneOpen(null); trace.push(isStreakMilestoneHold()); // закрыли
    noteStreakMilestonePending(7, TODAY); trace.push(isStreakMilestoneHold()); // повтор того же рубежа в тот же день не ставится
    expect(trace).toEqual([false, true, true, true, false, false]);
  });
  it('открытие и закрытие окна не падают', () => {
    markStreakMilestoneOpen(7);
    markStreakMilestoneOpen(7);
    markStreakMilestoneOpen(null);
    expect(isStreakMilestoneHold()).toBe(false);
  });
});

describe('подключение на месте', () => {
  it('день засчитан → рубеж ждёт показа (только числа-рубежи), ничего не пишется на диск', () => {
    const src = read('app/streak_day_signal.ts');
    expect(src).toContain("import { noteStreakMilestonePending } from './streak_milestone_pending';");
    expect(src).toContain('if (isStreakMilestone(input.days)) noteStreakMilestonePending(input.days, today);');
    const pending = read('app/streak_milestone_pending.ts');
    expect(pending).not.toMatch(/AsyncStorage|SecureStore|setItem/);
  });
  // R64 (edd75a0e3): ленивая загрузка ловит сбой модуля — помощник снимает удержание слота #36, экран итога не виснет
  it('итог урока: хост грузится лениво, идёт первым, идеал-окно и оценка ждут', () => {
    const src = read('app/lesson_complete.tsx');
    expect(src).toContain("const StreakMilestoneHost = lazy(() => import('../components/streak/moments/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed));");
    expect(src).toContain('const milestoneHold = momentsV3 && milestoneHoldRaw;');
    expect(src).toContain('perfectDecision.show && !milestoneHold');
    expect(src).toContain('showReview && !perfectMomentOpen && !milestoneHold');
    expect(src).toMatch(/milestoneHold && sequenceShowing \? \(\s*<Suspense fallback=\{null\}>\s*<StreakMilestoneHost lang=\{lang\} \/>/);
  });
  it('итог разговора: хост грузится лениво и идёт перед окном «Первый разговор»', () => {
    const src = read('app/dialogue_v2_completion.tsx');
    expect(src).toContain("const StreakMilestoneHost = lazy(() => import('../components/streak/moments/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed));");
    expect(src).toContain('goalsTotal > 0 && !milestoneHold');
    expect(src.indexOf('<StreakMilestoneHost')).toBeLessThan(src.indexOf('<FirstDialogHost'));
  });
  it('итог карточек и итог «Моих ошибок»: тот же ленивый хост', () => {
    const cards = read('app/flashcards/SessionResultScreen.tsx');
    expect(cards).toContain("const StreakMilestoneHost = lazy(() => import('../../components/streak/moments/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed));");
    expect(cards).toContain('milestoneHold ? (');
    const mistakes = read('app/mistake_practice_session.tsx');
    expect(mistakes).toContain("const StreakMilestoneHost = lazy(() => import('../components/streak/moments/StreakMilestoneHost').catch(streakMilestoneHostLoadFailed));");
    expect(mistakes.indexOf('milestoneHold ? (')).toBeGreaterThan(mistakes.indexOf('<MistakeSessionFinale'));
  });
  it('хост: решение через gate + диск, журнал [STREAK-MILESTONE], «открыто» до забора ожидающего, тост без блокировки касаний, сцены в Modal', () => {
    const src = read('components/streak/moments/StreakMilestoneHost.tsx');
    expect(src).toContain('decideStreakMilestone(');
    expect(src).toContain('await wasStreakMilestoneShown(key)');
    expect(src).toContain('[STREAK-MILESTONE] gate:');
    expect(src).toContain('void markStreakMilestoneShownOnDisk(key);');
    expect(src.indexOf('markStreakMilestoneOpen(decision.milestone);')).toBeLessThan(src.indexOf('        consumeStreakMilestonePending();')); // пауза не мигает: сначала «открыто»
    expect(src).toContain('pointerEvents="box-none"');
    expect(src).toContain('<Modal visible transparent');
  });
});

describe('«рубеж уже показан» на диске', () => {
  const mockStore: Record<string, string> = {};
  const mockFailures = { read: false, write: false };
  jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
      getItem: async (key: string) => {
        if (mockFailures.read) throw new Error('disk_read');
        return Object.prototype.hasOwnProperty.call(mockStore, key) ? mockStore[key]! : null;
      },
      setItem: async (key: string, value: string) => {
        if (mockFailures.write) throw new Error('disk_write');
        mockStore[key] = value;
      },
    },
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shownStore = require('../app/streak_milestone_shown_store') as typeof import('../app/streak_milestone_shown_store');

  beforeEach(() => { for (const key of Object.keys(mockStore)) delete mockStore[key]; mockFailures.read = false; mockFailures.write = false; });

  it('не показан → отметили → показан; ключ «число:день»', async () => {
    expect(await shownStore.wasStreakMilestoneShown('7:2026-10-15')).toBe(false);
    await shownStore.markStreakMilestoneShownOnDisk('7:2026-10-15');
    expect(await shownStore.wasStreakMilestoneShown('7:2026-10-15')).toBe(true);
    expect(await shownStore.wasStreakMilestoneShown('7:2026-10-16')).toBe(false);
  });
  it('хранится не больше 24 последних', async () => {
    for (let i = 0; i < 30; i += 1) await shownStore.markStreakMilestoneShownOnDisk(`${i}:d`);
    const list = JSON.parse(mockStore[shownStore.STREAK_MILESTONE_SHOWN_KEY]!) as string[];
    expect(list).toHaveLength(24);
    expect(list[list.length - 1]).toBe('29:d');
  });
  it('сбой чтения = «не праздновали» (лучше показать), сбой записи не бросает исключение', async () => {
    mockFailures.read = true;
    expect(await shownStore.wasStreakMilestoneShown('7:x')).toBe(false);
    mockFailures.read = false;
    mockFailures.write = true;
    await expect(shownStore.markStreakMilestoneShownOnDisk('7:x')).resolves.toBeUndefined();
  });
});

describe('ожидающий рубеж в памяти не ходит на диск', () => {
  it('в модуле ожидания нет хранилища', () => {
    expect(read('app/streak_milestone_pending.ts')).not.toMatch(/AsyncStorage|SecureStore|setItem/);
  });
});

describe('dev-подмена streak=N (только __DEV__)', () => {
  it('ссылка dev_state ?streak=N подключена к подмене: разбор, отказ с причиной, запуск', () => {
    const src = read('app/dev_state_fixtures.ts');
    expect(src).toContain('const streakDays = parseDevStreakMilestone(streakMilestoneRaw);');
    expect(src).toContain('rejected.streakMilestone =');
    expect(src).toContain("await import('./dev_streak_milestone')");
  });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dev = require('../app/dev_streak_milestone') as typeof import('../app/dev_streak_milestone');
  it('разбор: целое 1…5000, остальное — отказ', () => {
    expect(dev.parseDevStreakMilestone('100')).toBe(100);
    expect(dev.parseDevStreakMilestone(' 7 ')).toBe(7);
    for (const bad of ['0', '-3', '5001', '12.5', 'abc', '', undefined, null]) expect(dev.parseDevStreakMilestone(bad)).toBeNull();
  });
  it('вне dev-сборки ничего не делает и пишет причину отказа', () => {
    const src = read('app/dev_streak_milestone.ts');
    expect(src).toContain("if (typeof __DEV__ === 'undefined' || __DEV__ !== true)");
    expect(src).toContain('[DEV-STREAK-MILESTONE] отказ: не dev-сборка');
    expect(src).toContain("markStreakDayCounted({ wasCountedBefore: false, days, source: 'dev_state_streak', today });");
  });
});

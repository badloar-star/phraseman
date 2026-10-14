// Сторож D191, этап 1 (координатор 14.10): на Главной после первого кадра — только проба итога недели и журнал
// [SPIRE-WEEK-MODAL] «когда показали бы»; окно не показывается, отметка «показано» не ставится (карточка в Пике остаётся).
const mockInfo = jest.fn();
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: (...a: unknown[]) => mockInfo(...a), warn: jest.fn(), error: jest.fn() } }));
const mockLoad = jest.fn();
jest.mock('../app/spire/spire_week_result_client', () => ({ spireLoadWeekResult: (...a: unknown[]) => mockLoad(...a) }));
let mockGate: unknown = { where: 'home_week_modal' };
jest.mock('../app/spire/spire_live_gate', () => ({ spireOpenLiveGate: jest.fn(() => mockGate) }));
jest.mock('../app/spire_config_client', () => ({ warmSpireConfigFromDisk: jest.fn(async () => 'memory'), peekSpireConfig: jest.fn(() => ({ enabled: true })) }));
let mockUid: string | null = 'uid_1';
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => mockUid) }));

import fs from 'node:fs';
import path from 'node:path';
import { __resetSpireWeekModalProbeForTests, spireProbeWeekModal } from '../app/spire/spire_week_modal_probe';

const lines = () => mockInfo.mock.calls.map(([, line]) => String(line));
const base = { uiLang: 'ru', studyTarget: 'en', tabEnabled: true };

beforeEach(() => {
  mockInfo.mockClear();
  mockLoad.mockReset();
  mockGate = { where: 'home_week_modal' };
  mockUid = 'uid_1';
  __resetSpireWeekModalProbeForTests();
});

describe('D191: проба окна итога недели на Главной', () => {
  it('итог есть → «ПОКАЗАЛИ БЫ» в журнале; загрузчик в режиме «только посмотреть»', async () => {
    mockLoad.mockResolvedValue({ weekId: '2026-W43', promoted: true, demoted: false, prevTier: 3, newTier: 4, rankBy: 'coins' });
    await spireProbeWeekModal(base);
    expect(mockLoad).toHaveBeenCalledWith({ where: 'home_week_modal' }, { uid: 'uid_1', lang: 'en' }, { markShown: false, where: 'home_week_modal' });
    expect(lines().some((l) => l.includes('[SPIRE-WEEK-MODAL] ПОКАЗАЛИ БЫ') && l.includes('outcome=promoted') && l.includes('3→4'))).toBe(true);
  });

  it('каждая причина непоказа пишется в журнал', async () => {
    await spireProbeWeekModal({ ...base, tabEnabled: false });
    await spireProbeWeekModal({ ...base, uiLang: 'en' });
    await spireProbeWeekModal({ ...base, studyTarget: 'xx' });
    mockGate = null;
    await spireProbeWeekModal(base);
    mockGate = { where: 'home_week_modal' };
    mockUid = null;
    await spireProbeWeekModal(base);
    mockUid = 'uid_1';
    mockLoad.mockResolvedValue(null);
    await spireProbeWeekModal(base);
    const text = lines().join('\n');
    for (const why of ['вкладка Пика выключена', 'язык интерфейса en', 'язык изучения xx', 'ворота Пика закрыты', 'нет uid', 'итога прошлой недели нет']) {
      expect(text).toContain(why);
    }
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('один раз за запуск на пару «интерфейс+язык»', async () => {
    mockLoad.mockResolvedValue(null);
    await spireProbeWeekModal(base);
    await spireProbeWeekModal(base);
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(lines().some((l) => l.includes('уже проверяли в этом запуске'))).toBe(true);
  });

  it('Главная зовёт пробу после первого кадра; окна и арбитра в этой правке нет', () => {
    const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
    expect(home).toContain("runAfterHomeFirstFrame('spire_week_modal_probe'");
    const probe = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'spire_week_modal_probe.ts'), 'utf8');
    expect(probe).not.toMatch(/overlay_arbiter|emitAppEvent|<Modal|from 'react-native'/);
    const loader = fs.readFileSync(path.join(__dirname, '..', 'app', 'spire', 'spire_week_result_client.ts'), 'utf8');
    expect(loader).toContain('if (shouldMark) await markShown();');
    expect(loader).toContain("else await writeRow(input.uid, input.lang, { weekId: prevWeek, state: 'found', checkedAtMs: nowMs, result });");
  });
});

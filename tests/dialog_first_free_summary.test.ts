// зачем (координатор 25.10, пейвол «М»): итог ПЕРВОГО бесплатного разговора — только на телефоне; при входе dialog_limit
// уходит параметрами к прежним context/source; нет данных — прежний вход; фраза не попадает в аналитику и журнал.
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  },
}));

/* eslint-disable import/first */
import {
  DIALOG_FIRST_FREE_SUMMARY_KEY,
  __resetDialogFirstFreeSummaryForTests,
  dialogLimitPaywallParams,
  recordDialogFirstFreeSummary,
  warmDialogFirstFreeSummary,
} from '../app/dialog_first_free_summary';

const base = { freeTier: true, startedAtMs: 0, endedAtMs: 7 * 60_000 + 20_000, learnerTurns: 12 };
const corrections = [{ original: 'I go to shop yesterday', corrected: 'I went to the shop yesterday' }];

beforeEach(() => {
  mockStore.clear();
  __resetDialogFirstFreeSummaryForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('итог первого бесплатного разговора', () => {
  it('нет данных — прежний вход: только context и source', async () => {
    await warmDialogFirstFreeSummary();
    expect(dialogLimitPaywallParams('dialogue_v2_hub')).toEqual({ context: 'dialog_limit', source: 'dialogue_v2_hub' });
    expect(console.log).toHaveBeenCalledWith('[DIALOG-FIRST-SUMMARY] paywall source=dialogue_v2_hub params=none reason=no_summary');
  });

  it('запись: минуты (округление), реплики, первая пара «было → стало»; параметры к прежнему входу', async () => {
    await recordDialogFirstFreeSummary({ ...base, corrections });
    expect(JSON.parse(mockStore.get(DIALOG_FIRST_FREE_SUMMARY_KEY) ?? '{}')).toMatchObject({ minutes: 7, learnerTurns: 12 });
    expect(dialogLimitPaywallParams('dialogs_catalogue')).toEqual({
      context: 'dialog_limit',
      source: 'dialogs_catalogue',
      firstDialogMinutes: '7',
      firstDialogTurns: '12',
      firstDialogWas: 'I go to shop yesterday',
      firstDialogNow: 'I went to the shop yesterday',
    });
  });

  it('только ПЕРВЫЙ разговор: второй не перезаписывает; Plus и ноль реплик — пропуск с причиной', async () => {
    await recordDialogFirstFreeSummary({ ...base, freeTier: false, corrections });
    expect(console.log).toHaveBeenCalledWith('[DIALOG-FIRST-SUMMARY] write skipped reason=not_free_tier');
    await recordDialogFirstFreeSummary({ ...base, learnerTurns: 0, corrections });
    expect(console.log).toHaveBeenCalledWith('[DIALOG-FIRST-SUMMARY] write skipped reason=no_learner_turns');
    expect(mockStore.has(DIALOG_FIRST_FREE_SUMMARY_KEY)).toBe(false);
    await recordDialogFirstFreeSummary({ ...base, endedAtMs: 10_000, corrections: [] });
    await recordDialogFirstFreeSummary({ ...base, learnerTurns: 40, corrections });
    expect(console.log).toHaveBeenCalledWith('[DIALOG-FIRST-SUMMARY] write skipped reason=already_saved');
    expect(dialogLimitPaywallParams('x')).toEqual({ context: 'dialog_limit', source: 'x', firstDialogMinutes: '1', firstDialogTurns: '12' });
  });

  it('после перезапуска читается с телефона; текст фразы не пишется в журнал', async () => {
    await recordDialogFirstFreeSummary({ ...base, corrections });
    __resetDialogFirstFreeSummaryForTests();
    await warmDialogFirstFreeSummary();
    expect(dialogLimitPaywallParams('dialogue_v2_memory').firstDialogNow).toBe('I went to the shop yesterday');
    const logged = [...(console.log as jest.Mock).mock.calls, ...(console.warn as jest.Mock).mock.calls].flat().join('\n');
    expect(logged).not.toContain('shop');
  });
});

describe('входы dialog_limit', () => {
  const root = path.join(__dirname, '..');
  const files = [
    'components/DialogsTabContent.tsx', 'components/dialogs/scene/DialogsSceneHub.tsx', 'components/dialogs/DialogueV2CatalogueContainer.tsx',
    'app/ai_companion_session.tsx', 'app/ai_dialog_session.tsx', 'app/dialogue_v2_briefing.tsx', 'app/dialogue_v2_freeform.tsx',
    'app/dialogue_v2_memory.tsx', 'app/dialogue_v2_session.tsx',
  ];

  it('каждый вход строит params помощником; аналитика получает только context/source', () => {
    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      expect(src).not.toMatch(/params: \{ context: 'dialog_limit'/);
      expect(src).toContain("params: dialogLimitPaywallParams('");
      expect(src).not.toMatch(/track\w*Event\([^)]*firstDialog/);
      expect(src).not.toMatch(/track\w*Event\([^)]*dialogLimitPaywallParams/);
    }
    const session = fs.readFileSync(path.join(root, 'app/dialogue_v2_session.tsx'), 'utf8');
    expect(session).toContain('void recordDialogFirstFreeSummary({');
  });
});

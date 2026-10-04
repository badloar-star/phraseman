// зачем (координатор 04.10, после 6c5c6e220): сверка журнала грантов тренировки на старте отложена на 4 с после interactions.
// Охраняем: (1) раньше срока не стартует, (2) снимается при размонтировании, (3) на одно поколение аккаунта идёт одна сверка —
// повторный хук/перерисовка не запускает вторую. Вход в тренировку от сверки не зависит: экраны сами делают prepare/reconcile
// через журнал под общим замком хранилища (там же идёт чистка осиротевших манифестов, поэтому они не идут параллельно).
import { cleanup, renderHook } from '@testing-library/react-native';

import { beginAccountGeneration } from '../app/account_generation';

// зачем: этот раннер не умеет динамический import() (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG), поэтому каждый ЗАПУЩЕННЫЙ проход сверки
// заканчивается ровно одним reportSwallowed('...:maintain') — считаем запуски по нему, а не по вызову самой сверки.
const realSetTimeout = setTimeout;
const mockSwallowed = jest.fn();
jest.mock('../app/debug-logger', () => ({
  ...jest.requireActual('../app/debug-logger'),
  reportSwallowed: (...args: unknown[]) => mockSwallowed(...args),
}));
const mockMaintain = jest.fn();
const mockResolveAccount = jest.fn();

jest.mock('../app/flashcard_training_pending_grant', () => ({
  resolveFlashcardTrainingPendingGrantAccount: (...args: unknown[]) => mockResolveAccount(...args),
  maintainFlashcardTrainingPendingGrants: (...args: unknown[]) => mockMaintain(...args),
}));

// зачем: «после первого кадра» наступило сразу — проверяем именно 4-секундную задержку поверх него. Прокси, а не spread: spread
// дёргает все геттеры react-native (в том числе нативные модули) и роняет загрузку.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const interaction = { runAfterInteractions: (task: () => void) => { task(); return { cancel: jest.fn() }; } };
  return new Proxy(actual, { get: (target, key) => (key === 'InteractionManager' ? interaction : target[key as keyof typeof target]) });
});

import { useFlashcardTrainingGrantBootMaintenance } from '../components/use_flashcard_training_grant_boot_maintenance';

const runs = (): number => mockSwallowed.mock.calls.filter((c) => c[0] === 'use_flashcard_training_grant_boot_maintenance:maintain').length + mockResolveAccount.mock.calls.length;
// зачем: динамический import() грузится в реальном времени — после фейковых 4 с даём ему реальные 300 мс, прежде чем считать запуски.
const advance = async (ms: number): Promise<void> => {
  await jest.advanceTimersByTimeAsync(ms);
  await new Promise<void>((resolve) => realSetTimeout(resolve, 300));
};
// зачем: после запуска ждём реально (до 3 с), пока проход не засчитается, и ещё 300 мс — вдруг стартует второй.
const settleAfterStart = async (): Promise<void> => {
  for (let i = 0; i < 30 && runs() === 0; i += 1) await new Promise<void>((resolve) => realSetTimeout(resolve, 100));
  await new Promise<void>((resolve) => realSetTimeout(resolve, 300));
};
const refund = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  jest.clearAllMocks();
  mockResolveAccount.mockResolvedValue({ stableUid: 'u1', lineage: 1 });
  mockMaintain.mockResolvedValue({ status: 'maintained', removed: 0, retained: 0 });
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

test('T1 сверка не стартует сразу и не стартует после размонтирования', async () => {
  beginAccountGeneration('acc-schedule-1');
  const hook = await renderHook(() => useFlashcardTrainingGrantBootMaintenance(true, refund));
  await advance(3_000);
  expect(runs()).toBe(0);
  hook.unmount();
  await advance(10_000);
  expect(runs()).toBe(0);
  expect(runs()).toBe(0);
});

test('T3 два планировщика в одном дереве дают одну сверку', async () => {
  beginAccountGeneration('acc-schedule-3');
  const both = await renderHook(() => {
    useFlashcardTrainingGrantBootMaintenance(true, refund);
    useFlashcardTrainingGrantBootMaintenance(true, refund);
  });
  await advance(10_000);
  await settleAfterStart();
  expect(runs()).toBe(1);
  both.unmount();
});

test('T2 сверка стартует один раз и повторный хук того же поколения её не дублирует', async () => {
  beginAccountGeneration('acc-schedule-2');
  const first = await renderHook(() => useFlashcardTrainingGrantBootMaintenance(true, refund));
  await advance(10_000);
  await settleAfterStart();
  expect(runs()).toBe(1);

  const second = await renderHook(() => useFlashcardTrainingGrantBootMaintenance(true, refund));
  first.rerender({});
  await advance(10_000);
  await settleAfterStart();
  expect(runs()).toBe(1);
  second.unmount();
  first.unmount();
});

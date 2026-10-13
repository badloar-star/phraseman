// зачем (координатор 13.10, EN-проход en-dialog-completion-001): подставной итог диалога — на языке интерфейса, без пометки «(dev)».
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => async () => ({ data: null }) }));
const mockKind = jest.fn(() => 'clean' as string | null);
jest.mock('../app/dev_dialog_state', () => ({ getDevDialogCompletion: () => mockKind() }));

import { completeDialogueV2Session } from '../app/dialogue_v2_completion_client';

const selection = (interfaceLang: string) => ({ sessionId: 'd2s_dev', studyTarget: 'en', scenarioId: 'social_01', interfaceLang } as never);

describe('dev dialogue completion copy', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  test('English interface gets English review and goals without the (dev) mark', async () => {
    mockKind.mockReturnValue('errors');
    const result = await completeDialogueV2Session(selection('en'));
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/[А-Яа-яЁё]/);
    expect(text).not.toContain('(dev)');
    expect(result?.review.objectiveResults.map((o) => o.label)).toEqual(['Say hello', 'Place an order']);
  });

  test('Russian interface keeps Russian copy; unknown language falls back to Russian', async () => {
    mockKind.mockReturnValue('clean');
    expect((await completeDialogueV2Session(selection('ru')))?.review.assessment).toBe('Отличный разговор — все цели выполнены.');
    expect((await completeDialogueV2Session(selection('xx')))?.review.assessment).toBe('Отличный разговор — все цели выполнены.');
  });
});

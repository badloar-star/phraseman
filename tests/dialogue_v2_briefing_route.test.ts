/* eslint-disable import/first */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

const h = React.createElement;
const mockFetchCatalogue = jest.fn();
const mockBuildModel = jest.fn();
const mockUseStudyTarget = jest.fn();
const mockUseMyCoinRank = jest.fn();
const mockUseLang = jest.fn();
const mockParams = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockScreen: jest.Mock = jest.fn(() => null);

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Platform: { OS: 'ios' }, StyleSheet: { flatten: (style: unknown) => style },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock('../app/dialogue_v2_catalogue_client', () => ({
  fetchReleasedDialogueV2Catalogue: (...args: unknown[]) => mockFetchCatalogue(...args),
  // зачем: первый кадр брифинга берётся из каталога в памяти; в узловом тесте его нет — экран ждёт сеть.
  peekDialogueV2Catalogue: () => null,
}));
const mockPrestart = jest.fn();
const mockMarkStartTap = jest.fn();
jest.mock('../app/dialogue_v2_turn_client', () => ({ prestartDialogueV2TextSession: (...args: unknown[]) => mockPrestart(...args) }));
jest.mock('../app/dialogue_v2_session_prestart', () => ({ markDialogueV2StartTap: (...args: unknown[]) => mockMarkStartTap(...args) }));
jest.mock('../app/dialogue_v2_briefing_model', () => ({
  buildDialogueV2BriefingModel: (...args: unknown[]) => mockBuildModel(...args),
}));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => mockUseStudyTarget() }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => mockUseMyCoinRank() }));
jest.mock('../components/LangContext', () => ({ useLang: () => mockUseLang() }));
// 30.09: старт диалога списывает 1 энергию (владелец: «как урок»).
const mockConfirmSpendOne = jest.fn(async () => 'spent');
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ confirmSpendOne: mockConfirmSpendOne, acknowledgeSessionStart: jest.fn(async () => true) }),
  useEnergySessionIntent: () => ({ operationId: 'op-1', grant: { kind: 'ai_dialog' } }),
}));
const mockNoEnergyModal = jest.fn((_props: unknown) => null);
jest.mock('../components/NoEnergyModal', () => ({ __esModule: true, default: (props: unknown) => mockNoEnergyModal(props) }));
// Экран-гейт Liquid Glass (загрузка / недоступно / Plus) — простая замена для узлового теста.
jest.mock('../components/dialogs/glass/DialogueGlassKit', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  return {
    useDialogueGlass: () => ({}),
    DialogueGlassGate: ({ testID, title, action }: { testID: string; title: string; action?: { label: string; onPress: () => void } }) => mockReact.createElement(
      'View',
      { testID },
      mockReact.createElement('Text', null, title),
      action ? mockReact.createElement('Pressable', { accessibilityLabel: action.label, onPress: action.onPress }, mockReact.createElement('Text', null, action.label)) : null,
    ),
  };
});
jest.mock('../components/dialogs/DialogueV2BriefingScreen', () => ({
  DialogueV2BriefingScreen: (props: unknown) => mockScreen(props),
}));
jest.mock('../components/feedback/PressableScale', () => ({ PressableScale: 'PressableScale' }));

import DialogueV2BriefingRoute from '../app/dialogue_v2_briefing';

const envelope = Object.freeze({ ok: true, packets: Object.freeze([{ scenario: { id: 'work_01' } }]) });
const unlockedModel = Object.freeze({
  title: 'Согласовать время', cefr: 'A1', briefing: 'Уточни время встречи в чате.', rankRequired: 1,
  unlocked: true,
  objectives: Object.freeze([{ id: 'goal_1', label: 'Поздороваться.' }]),
  participants: Object.freeze([{ id: 'host', displayName: 'Анна', styleNote: 'Пишет кратко.' }]),
});

describe('Dialogue V2 briefing route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ scenarioId: 'work_01' });
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'de' });
    mockUseMyCoinRank.mockReturnValue(3);
    mockUseLang.mockReturnValue({ lang: 'ru' });
    mockFetchCatalogue.mockResolvedValue(envelope);
    mockBuildModel.mockReturnValue(unlockedModel);
  });

  it('accepts only the scenario route id and renders the revalidated V2 briefing model', async () => {
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));

    expect(mockFetchCatalogue).toHaveBeenCalledWith('de');
    expect(mockBuildModel).toHaveBeenCalledWith({
      packets: envelope.packets, studyTarget: 'de', scenarioId: 'work_01', localCoinRank: 3,
      // зачем (владелец 01.10): служебный текст сцены — на языке интерфейса.
      uiLang: 'ru',
    });
    expect(mockScreen).toHaveBeenCalledWith(expect.objectContaining({
      ...unlockedModel,
      labels: expect.objectContaining({ start: 'Начать диалог' }),
    }));
  });

  it('fails closed without fetching for malformed route params or an unsupported target', async () => {
    mockParams.mockReturnValue({ scenarioId: ['work_01'] });
    const screen = await render(h(DialogueV2BriefingRoute));
    await expect(screen.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockFetchCatalogue).not.toHaveBeenCalled();
    expect(mockBuildModel).not.toHaveBeenCalled();

    await screen.unmount();
    mockParams.mockReturnValue({ scenarioId: 'work_01' });
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'pt-BR' });
    const targetScreen = await render(h(DialogueV2BriefingRoute));
    await expect(targetScreen.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockFetchCatalogue).not.toHaveBeenCalled();
  });

  it('keeps a locked briefing non-startable even when its callback is invoked directly', async () => {
    mockBuildModel.mockReturnValue({ ...unlockedModel, unlocked: false });
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));

    const props = mockScreen.mock.calls[0][0];
    expect(props.unlocked).toBe(false);
    props.onStart();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockScreen).toHaveBeenCalledTimes(1);
  });

  it('starts only the new ID-only V2 session route', async () => {
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));

    await act(async () => {
      mockScreen.mock.calls[0][0].onStart();
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dialogue_v2_session',
      params: { scenarioId: 'work_01', energyOp: 'op-1' },
    });
  });

  it('does not open the session without energy and shows the no-energy window', async () => {
    mockConfirmSpendOne.mockResolvedValueOnce('insufficient');
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => {
      mockScreen.mock.calls[0][0].onStart();
    });
    expect(mockPush).not.toHaveBeenCalled();
    const last = mockNoEnergyModal.mock.calls[mockNoEnergyModal.mock.calls.length - 1][0] as { visible: boolean };
    expect(last.visible).toBe(true);
  });
});

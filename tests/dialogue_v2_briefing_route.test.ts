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
const mockReplace = jest.fn();
const mockScreen: jest.Mock = jest.fn(() => null);

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Platform: { OS: 'ios' }, StyleSheet: { flatten: (style: unknown) => style },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
  // R52: возврат на брифинг (фокус) снимает защёлку старта — в узловом тесте фокус = монтирование
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, [cb]); },
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
// зачем (m16, владелец 15.10): «Входящий звонок» поверх брифинга — свой тест tests/dialogue_incoming_call_m16.test.tsx; здесь проверяется старт диалога
const mockIncomingCall = jest.fn();
jest.mock('../components/dialogs/DialogueIncomingCall', () => ({ __esModule: true, default: (props: unknown) => { mockIncomingCall(props); return null; } }));
// По умолчанию тариф ещё не известен → запрет по месячному остатку не действует (прежние проверки не меняются).
const mockUsePremium = jest.fn(() => ({ accessResolved: false, hasPremiumAccess: false }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => mockUsePremium() }));
const mockReadMonthlyQuota = jest.fn(async () => ({ status: 'allowed', remaining: 10 }));
jest.mock('../app/ai_dialog_daily_quota', () => ({
  readAiDialogMonthlyQuota: (...args: unknown[]) => mockReadMonthlyQuota(...(args as [])),
}));

// зачем (находка d8b078e8e, 12.10): брифинг спрашивает согласие на ИИ ДО списания энергии. По умолчанию согласие дано —
// прежние проверки старта не меняются; отдельные тесты ниже снимают его.
const mockConsent = { hydrated: true, granted: true, decided: true };
const mockSetConsent = jest.fn(async (_state: string) => undefined);
jest.mock('../app/ai_dialog_consent', () => ({
  isAiDialogConsentHydrated: () => mockConsent.hydrated,
  isAiDialogConsentGranted: () => mockConsent.granted,
  hasAiDialogConsentDecision: () => mockConsent.decided,
  hydrateAiDialogConsentFromStorage: async () => { mockConsent.hydrated = true; },
  setAiDialogConsent: (state: string) => mockSetConsent(state),
  recordAiDialogConsentToCloud: async () => undefined,
}));
const mockConsentModal = jest.fn((_props: unknown) => null);
jest.mock('../components/AiDialogConsentModal', () => ({ __esModule: true, default: (props: unknown) => mockConsentModal(props) }));
type ConsentModalProps = { visible: boolean; onAccept: () => void; onDecline: () => void };
const lastConsentModal = () => mockConsentModal.mock.calls[mockConsentModal.mock.calls.length - 1][0] as ConsentModalProps;

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
    Object.assign(mockConsent, { hydrated: true, granted: true, decided: true });
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
    // 18.10 (владелец: экранов-ошибок нигде): без «Диалоги недоступны» — тихо в хаб Диалогов.
    const screen = await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ai_dialog_home'));
    expect(screen.queryByText('Диалоги недоступны')).toBeNull();
    expect(mockFetchCatalogue).not.toHaveBeenCalled();
    expect(mockBuildModel).not.toHaveBeenCalled();

    await screen.unmount();
    mockReplace.mockClear();
    mockParams.mockReturnValue({ scenarioId: 'work_01' });
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'pt-BR' });
    const targetScreen = await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/ai_dialog_home'));
    expect(targetScreen.queryByText('Диалоги недоступны')).toBeNull();
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

  // зачем (аудит кнопок R52, 15.10): после успешного старта брифинг ещё на экране (анимация перехода) — второй тап не списывает энергию повторно
  it('a second tap after a successful start neither spends again nor opens a second session', async () => {
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(1));
    await act(async () => { mockScreen.mock.calls[0][0].onStart(); });
    await act(async () => { mockScreen.mock.calls[mockScreen.mock.calls.length - 1][0].onStart(); });
    expect(mockConfirmSpendOne).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockScreen.mock.calls[mockScreen.mock.calls.length - 1][0].starting).toBe(true);
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

  // зачем (Сверка 05.10 🟡): при 0 оставшихся ответах Free диалог не стартует — энергия не списывается, сразу экран
  // лимита (тот же, что у хаба).
  it('opens the limit screen instead of starting when Free monthly replies are exhausted', async () => {
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    mockReadMonthlyQuota.mockResolvedValue({ status: 'exhausted' } as never);
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockReadMonthlyQuota).toHaveBeenCalled());
    await act(async () => {});
    await act(async () => {
      mockScreen.mock.calls.at(-1)[0].onStart();
    });
    expect(mockConfirmSpendOne).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/premium_modal',
      params: { context: 'dialog_limit', source: 'ai_dialog_briefing_direct' },
    });
  });

  it('starts normally for Free with replies left', async () => {
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    mockReadMonthlyQuota.mockResolvedValue({ status: 'allowed', remaining: 3 } as never);
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockReadMonthlyQuota).toHaveBeenCalled());
    await act(async () => {});
    await act(async () => {
      mockScreen.mock.calls.at(-1)[0].onStart();
    });
    expect(mockConfirmSpendOne).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dialogue_v2_session',
      params: { scenarioId: 'work_01', energyOp: 'op-1' },
    });
  });

  // зачем (находка Макетов d8b078e8e, координатор 12.10): без согласия на ИИ энергия НЕ списывается — шторка поверх брифинга.
  it('asks for AI consent before spending energy and spends nothing until accepted', async () => {
    Object.assign(mockConsent, { granted: false, decided: false });
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => {
      mockScreen.mock.calls.at(-1)[0].onStart();
    });
    expect(mockConfirmSpendOne).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(lastConsentModal().visible).toBe(true);

    await act(async () => {
      lastConsentModal().onAccept();
    });
    expect(mockSetConsent).toHaveBeenCalledWith('granted');
    // списание — после закрытия шторки (зазор для iOS)
    await waitFor(() => expect(mockConfirmSpendOne).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/dialogue_v2_session',
      params: { scenarioId: 'work_01', energyOp: 'op-1' },
    });
  });

  it('declining AI consent on the briefing spends no energy and opens nothing', async () => {
    Object.assign(mockConsent, { granted: false, decided: false });
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => {
      mockScreen.mock.calls.at(-1)[0].onStart();
    });
    expect(lastConsentModal().visible).toBe(true);
    await act(async () => {
      lastConsentModal().onDecline();
    });
    expect(mockSetConsent).toHaveBeenCalledWith('denied');
    expect(lastConsentModal().visible).toBe(false);
    expect(mockConfirmSpendOne).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('accept without energy shows the no-energy window after the consent sheet, spending once on a double tap', async () => {
    Object.assign(mockConsent, { granted: false, decided: false });
    mockConfirmSpendOne.mockResolvedValueOnce('insufficient');
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onStart(); });
    await act(async () => {
      lastConsentModal().onAccept();
      lastConsentModal().onAccept();
    });
    await waitFor(() => expect(mockConfirmSpendOne).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const last = mockNoEnergyModal.mock.calls[mockNoEnergyModal.mock.calls.length - 1][0] as { visible: boolean };
      expect(last.visible).toBe(true);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a repeated decline (already denied) does not rewrite consent', async () => {
    Object.assign(mockConsent, { granted: false, decided: true });
    await render(h(DialogueV2BriefingRoute));
    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await act(async () => { mockScreen.mock.calls.at(-1)[0].onStart(); });
    await act(async () => { lastConsentModal().onDecline(); });
    expect(mockSetConsent).not.toHaveBeenCalled();
    expect(mockConfirmSpendOne).not.toHaveBeenCalled();
  });
});

/* eslint-disable import/first */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

const h = React.createElement;

const mockFetchCatalogue = jest.fn();
const mockPeekCatalogue = jest.fn();
const mockEmbeddedCatalogue = jest.fn();
const mockProjection = jest.fn();
const mockUseStudyTarget = jest.fn();
const mockUseMyCoinRank = jest.fn();
const mockUseLang = jest.fn();
const mockSection: jest.Mock = jest.fn(() => null);
const mockUsePremium = jest.fn();
const mockPush = jest.fn();
const mockPlusTools: jest.Mock = jest.fn(() => null);
const mockReadQuota = jest.fn();

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'ios' },
  StyleSheet: { flatten: (style: unknown) => style },
  // зачем (11.10): перепроверка каталога стартует после анимации входа (runAfterInteractions); в тесте анимаций нет —
  // колбэк сразу, отмена — как у настоящего InteractionManager.
  InteractionManager: {
    runAfterInteractions: (task: () => void) => {
      task();
      return { cancel: () => undefined };
    },
  },
}));
// Переводы названий проверяет свой тест модуля; здесь — только проекция каталога.
jest.mock('../app/dialogue_v2_ui_copy', () => ({ dialogueV2UiCopy: () => null, dialogueV2UiWorldTitle: () => null }));
jest.mock('../app/dialogue_v2_catalogue_client', () => ({
  fetchReleasedDialogueV2Catalogue: (...args: unknown[]) => mockFetchCatalogue(...args),
  peekDialogueV2Catalogue: (...args: unknown[]) => mockPeekCatalogue(...args),
  getEmbeddedDialogueV2Catalogue: (...args: unknown[]) => mockEmbeddedCatalogue(...args),
}));
jest.mock('../app/dialogue_v2_authorized_catalogue_projection', () => ({
  projectAuthorizedDialogueV2Catalogue: (...args: unknown[]) => mockProjection(...args),
}));
jest.mock('../components/StudyTargetContext', () => ({
  useStudyTarget: () => mockUseStudyTarget(),
}));
jest.mock('../hooks/use_my_coin_rank', () => ({
  useMyCoinRank: () => mockUseMyCoinRank(),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => mockUseLang() }));
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  return {
    useRouter: () => ({ push: mockPush }),
    // Фокус вкладки в тесте = монтирование.
    useFocusEffect: (effect: () => void | (() => void)) => { mockReact.useEffect(effect, [effect]); },
  };
});
jest.mock('../app/ai_dialog_daily_quota', () => ({
  readAiDialogMonthlyQuota: (...args: unknown[]) => mockReadQuota(...args),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'stable-user', phase: 'active' }),
}));
// D111/A5/A6: карточки хаба — простые заглушки с testID, вид проверяется source-контрактом.
jest.mock('../components/dialogs/DialogueV2HubNotices', () => {
  const mockReact = jest.requireActual('react') as typeof React;
  return {
    dialogueV2HubCopy: () => ({
      quotaA11y: (remaining: number, total: number) => `${remaining} из ${total}`,
      exhaustedTitle: 'Plus снимает лимит ответов',
      exhaustedText: (total: number) => `В этом месяце осталось 0 из ${total} ответов.`,
      gateTitle: 'Диалоги на этом языке ещё проверяются',
      gateText: 'text',
      gateCta: 'К урокам',
    }),
    DialogueV2HubQuotaRow: ({ text }: { text: string }) => mockReact.createElement('Text', { testID: 'dialogue-v2-hub-quota' }, text),
    DialogueV2HubExhaustedCard: ({ onPress }: { onPress: () => void }) => mockReact.createElement('View', { testID: 'dialogue-v2-hub-exhausted', onPress }),
    DialogueV2HubLanguageGate: ({ onPress, testID = 'dialogue-v2-hub-language-gate', title }: { onPress: () => void; testID?: string; title: string }) =>
      mockReact.createElement('View', { testID, onPress }, mockReact.createElement('Text', null, title)),
  };
});
jest.mock('../components/PremiumContext', () => ({ usePremium: () => mockUsePremium() }));
jest.mock('../components/v2/useV2Palette', () => ({
  useV2Palette: () => ({ textSecondary: '#text' }),
}));
jest.mock('../components/dialogs/DialogueV2PlusTools', () => ({
  DialogueV2PlusTools: (props: unknown) => mockPlusTools(props),
}));
jest.mock('../components/dialogs/DialogueV2CatalogueSection', () => ({
  DialogueV2CatalogueSection: (props: unknown) => mockSection(props),
}));
// зачем (E2, 12.10): скелет каталога тянет Reanimated (ESM) — в этом тесте его содержимое не важно, важно лишь что он стоит на месте пустоты
jest.mock('../components/dialogs/DialogueV2CatalogueSkeleton', () => ({
  DialogueV2CatalogueSkeleton: () => null,
}));
// зачем (владелец 22.10, плитки тем хаба): плитки тянут Ionicons (ESM) — в этом тесте их вид не важен
jest.mock('../components/dialogs/hub/DialogsHubThemes', () => ({ __esModule: true, default: () => null }));

import { DialogueV2CatalogueContainer } from '../components/dialogs/DialogueV2CatalogueContainer';

const packetEnvelope = Object.freeze({ ok: true, packets: Object.freeze([{ scenario: { id: 'work_01' } }]) });
const projection = Object.freeze({
  worlds: Object.freeze([{ id: 'social', title: 'Общение' }]),
  items: Object.freeze([{
    id: 'work_01', worldId: 'social', title: 'Согласовать время', cefr: 'A1', rankRequired: 1,
    status: 'available' as const,
  }]),
});

describe('DialogueV2CatalogueContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'de' });
    mockUseMyCoinRank.mockReturnValue(3);
    mockUseLang.mockReturnValue({ lang: 'ru' });
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: true });
    mockFetchCatalogue.mockResolvedValue(packetEnvelope);
    mockPeekCatalogue.mockReturnValue(null);
    mockEmbeddedCatalogue.mockReturnValue(null);
    mockProjection.mockReturnValue(projection);
    mockReadQuota.mockResolvedValue({ status: 'unknown', limit: 30 });
  });

  it('renders the catalogue on the FIRST frame from cache/embedded, without waiting for the network (01.10)', async () => {
    mockPeekCatalogue.mockReturnValue(packetEnvelope);
    mockFetchCatalogue.mockReturnValue(new Promise(() => undefined));
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));

    expect(mockSection).toHaveBeenCalled();
    expect(screen.queryByTestId('dialogue-v2-catalogue-loading')).toBeNull();
    expect(screen.queryByText('Диалоги не загрузились')).toBeNull();
    expect(mockPeekCatalogue).toHaveBeenCalledWith('de');
    // Вход в хаб запускает фоновую проверку (окно 12 ч — внутри клиента каталога).
    expect(mockFetchCatalogue).toHaveBeenCalledWith('de', { awaitRefresh: true });
  });

  it('falls back to the embedded approved catalogue when the network envelope fails revalidation', async () => {
    const embedded = Object.freeze({ ok: true, packets: Object.freeze([{ scenario: { id: 'social_01' } }]) });
    mockEmbeddedCatalogue.mockReturnValue(embedded);
    mockProjection.mockImplementation((input: { packets: unknown }) => (input.packets === embedded.packets ? projection : null));
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));

    await waitFor(() => expect(mockSection).toHaveBeenCalled());
    expect(screen.queryByText('Диалоги не загрузились')).toBeNull();
  });

  it('routes Plus tools without treating local catalogue state as entitlement authority', async () => {
    const plusScreen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await waitFor(() => expect(mockSection).toHaveBeenCalledTimes(1));

    const plusProps = mockPlusTools.mock.calls.at(-1)![0] as {
      onOpenFreeform: () => void;
      onOpenMemory?: () => void;
    };
    // зачем (приказ владельца 11.10): «Память диалогов» убрана из раздела — только в Настройках → Приватность.
    expect(plusProps.onOpenMemory).toBeUndefined();
    plusProps.onOpenFreeform();
    expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: '/dialogue_v2_freeform' });

    await plusScreen.unmount();
    mockPlusTools.mockClear();
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await waitFor(() => expect(mockPlusTools).toHaveBeenCalled());
    const freeProps = mockPlusTools.mock.calls.at(-1)![0] as {
      onOpenFreeform: () => void;
    };
    freeProps.onOpenFreeform();
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/premium_modal',
      params: { context: 'dialog_limit', source: 'dialogue_v2_freeform' },
    });
  });

  it('loads only a supported study target and renders the revalidated release projection', async () => {
    const onPressItem = jest.fn();
    await render(h(DialogueV2CatalogueContainer, { onPressItem }));

    await waitFor(() => expect(mockSection).toHaveBeenCalledTimes(1));

    expect(mockFetchCatalogue).toHaveBeenCalledWith('de', { awaitRefresh: true });
    expect(mockProjection).toHaveBeenCalledWith(expect.objectContaining({
      packets: packetEnvelope.packets,
      studyTarget: 'de',
      localCoinRank: 3,
      worldHeadings: expect.arrayContaining([
        expect.objectContaining({ id: 'social', title: 'Общение' }),
      ]),
    }));
    expect(mockSection).toHaveBeenCalledWith({
      worlds: projection.worlds,
      items: projection.items,
      // Строка ранга под закрытым диалогом (макет dialogs.html A4) локализуется здесь.
      labels: expect.objectContaining({ lockedAtRank: expect.any(Function) }),
      onPressItem,
    });
  });

  it('shows the «still being checked» card without a fetch when the language contour is unsupported (A6)', async () => {
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'pt-BR' });
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));

    await expect(screen.findByTestId('dialogue-v2-hub-language-gate')).resolves.toBeTruthy();
    screen.getByTestId('dialogue-v2-hub-language-gate').props.onPress();
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/lessons');
    expect(mockFetchCatalogue).not.toHaveBeenCalled();
    expect(mockProjection).not.toHaveBeenCalled();
    expect(mockSection).not.toHaveBeenCalled();
    // зачем (координатор 12.10, dialogs-005; образец «Хаб — язык ещё проверяется»): под языковым гейтом «Свободный разговор» скрыт — вход в разговор мимо гейта нелогичен
    expect(mockPlusTools).not.toHaveBeenCalled();
  });

  // зачем (владелец 01.10: «Диалоги не загрузились — ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ»): ни карточки
  // ошибки, ни кнопки «Повторить» — тихий повтор в фоне, пользователь ошибок не видит.
  it('never shows an error card or a loading line, even when the network and projection fail', async () => {
    mockFetchCatalogue.mockResolvedValue(null);
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    expect(screen.queryByText('Диалоги не загрузились')).toBeNull();
    expect(screen.queryByTestId('dialogue-v2-catalogue-unavailable')).toBeNull();
    expect(screen.queryByTestId('dialogue-v2-catalogue-loading')).toBeNull();

    mockFetchCatalogue.mockResolvedValue(packetEnvelope);
    mockProjection.mockReturnValue(null);
    await screen.unmount();
    const again = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    expect(again.queryByText('Диалоги не загрузились')).toBeNull();
    expect(again.queryByTestId('dialogue-v2-catalogue-unavailable')).toBeNull();
  });

  it('shows the monthly remainder for Free and the Plus card when it is used up (A1/A5, D111)', async () => {
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    mockReadQuota.mockResolvedValue({ status: 'allowed', remaining: 12, limit: 30, resetAtMs: 1, quotaVersion: 2 });
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await expect(screen.findByText('12/30')).resolves.toBeTruthy();
    expect(screen.queryByTestId('dialogue-v2-hub-exhausted')).toBeNull();
    await screen.unmount();

    mockReadQuota.mockResolvedValue({ status: 'exhausted', remaining: 0, limit: 30, resetAtMs: 1, quotaVersion: 3 });
    const exhausted = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await expect(exhausted.findByTestId('dialogue-v2-hub-exhausted')).resolves.toBeTruthy();
    exhausted.getByTestId('dialogue-v2-hub-exhausted').props.onPress();
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/premium_modal',
      params: { context: 'dialog_limit', source: 'dialogue_v2_hub' },
    });
  });

  it('never shows the remainder to Plus', async () => {
    mockReadQuota.mockResolvedValue({ status: 'allowed', remaining: 12, limit: 30, resetAtMs: 1, quotaVersion: 2 });
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await waitFor(() => expect(mockSection).toHaveBeenCalled());
    expect(screen.queryByTestId('dialogue-v2-hub-quota')).toBeNull();
    expect(mockReadQuota).not.toHaveBeenCalled();
  });
});

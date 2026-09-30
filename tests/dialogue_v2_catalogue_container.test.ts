/* eslint-disable import/first */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const h = React.createElement;

const mockFetchCatalogue = jest.fn();
const mockProjection = jest.fn();
const mockUseStudyTarget = jest.fn();
const mockUseMyCoinRank = jest.fn();
const mockUseLang = jest.fn();
const mockSection: jest.Mock = jest.fn(() => null);
const mockUsePremium = jest.fn();
const mockPush = jest.fn();
const mockPlusTools: jest.Mock = jest.fn(() => null);

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'ios' },
  StyleSheet: { flatten: (style: unknown) => style },
}));
jest.mock('../app/dialogue_v2_catalogue_client', () => ({
  fetchReleasedDialogueV2Catalogue: (...args: unknown[]) => mockFetchCatalogue(...args),
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
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
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
    mockProjection.mockReturnValue(projection);
  });

  it('routes Plus tools without treating local catalogue state as entitlement authority', async () => {
    const plusScreen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await waitFor(() => expect(mockSection).toHaveBeenCalledTimes(1));

    const plusProps = mockPlusTools.mock.calls.at(-1)![0] as {
      onOpenFreeform: () => void;
      onOpenMemory: () => void;
    };
    plusProps.onOpenFreeform();
    plusProps.onOpenMemory();
    expect(mockPush).toHaveBeenNthCalledWith(1, { pathname: '/dialogue_v2_freeform' });
    expect(mockPush).toHaveBeenNthCalledWith(2, { pathname: '/dialogue_v2_memory' });

    await plusScreen.unmount();
    mockPlusTools.mockClear();
    mockUsePremium.mockReturnValue({ accessResolved: true, hasPremiumAccess: false });
    await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await waitFor(() => expect(mockPlusTools).toHaveBeenCalled());
    const freeProps = mockPlusTools.mock.calls.at(-1)![0] as {
      onOpenFreeform: () => void;
      onOpenMemory: () => void;
    };
    freeProps.onOpenMemory();
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/dialogue_v2_memory' });
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

    expect(mockFetchCatalogue).toHaveBeenCalledWith('de');
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

  it('fails closed without a fetch when the selected language contour is unsupported', async () => {
    mockUseStudyTarget.mockReturnValue({ studyTarget: 'pt-BR' });
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));

    await expect(screen.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockFetchCatalogue).not.toHaveBeenCalled();
    expect(mockProjection).not.toHaveBeenCalled();
    expect(mockSection).not.toHaveBeenCalled();
  });

  it('shows only a neutral unavailable state when the release or revalidation fails', async () => {
    mockFetchCatalogue.mockResolvedValue(null);
    const screen = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));

    await expect(screen.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockSection).not.toHaveBeenCalled();

    mockFetchCatalogue.mockResolvedValue(packetEnvelope);
    mockProjection.mockReturnValue(null);
    await screen.unmount();
    const retry = await render(h(DialogueV2CatalogueContainer, { onPressItem: jest.fn() }));
    await expect(retry.findByText('Диалоги недоступны')).resolves.toBeTruthy();
    expect(mockSection).not.toHaveBeenCalled();
  });
});

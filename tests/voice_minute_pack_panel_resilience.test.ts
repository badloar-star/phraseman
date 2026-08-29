import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import VoiceMinutePackPanel from '../modules/voice_minutes/VoiceMinutePackPanel';

const mockLoadVoiceMinutePackages = jest.fn();
const mockReadVoiceMinuteWalletStatus = jest.fn();

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
    hairlineWidth: 1,
  },
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#8EEA63', bgCard: '#171927', bgSurface2: '#222536', border: '#34384C',
      correctText: '#07110A', textMuted: '#A7A9BB', textPrimary: '#FFFFFF', wrong: '#FF6B86',
    },
    f: { h1: 28, h2: 22, h3: 18, body: 15, sub: 13 },
  }),
}));
jest.mock('../constants/i18n', () => ({
  triLang: (_lang: string, copy: Record<string, string>) => copy.ru,
}));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../modules/voice_minutes/purchase', () => ({
  loadVoiceMinutePackages: (...args: unknown[]) => mockLoadVoiceMinutePackages(...args),
  purchaseVoiceMinutePack: jest.fn(),
}));
jest.mock('../modules/voice_minutes/wallet', () => ({
  readVoiceMinuteWalletStatus: (...args: unknown[]) => mockReadVoiceMinuteWalletStatus(...args),
}));

const storePack = (minutes: 30 | 120 | 300, priceString: string) => ({
  productId: `phraseman_voice_minutes_${minutes}`,
  minutes,
  seconds: minutes * 60,
  priceString,
  revenueCatPackage: { product: { identifier: `phraseman_voice_minutes_${minutes}`, priceString } },
});

describe('VoiceMinutePackPanel resilience', () => {
  beforeEach(() => {
    mockLoadVoiceMinutePackages.mockReset();
    mockReadVoiceMinuteWalletStatus.mockReset();
  });

  it('keeps all three store-priced purchase buttons when the wallet request fails', async () => {
    mockLoadVoiceMinutePackages.mockResolvedValue([
      storePack(30, '€5,99'),
      storePack(120, '€17,99'),
      storePack(300, '€39,99'),
    ]);
    mockReadVoiceMinuteWalletStatus.mockRejectedValue(new Error('callable unavailable'));

    const view = await render(React.createElement(VoiceMinutePackPanel));

    await waitFor(() => {
      expect(view.getAllByTestId(/^voice-minute-pack-/)).toHaveLength(3);
      expect(view.getByText('€5,99')).toBeTruthy();
      expect(view.getByText('€17,99')).toBeTruthy();
      expect(view.getByText('€39,99')).toBeTruthy();
    });
    expect(view.getByTestId('voice-minute-pack-30').props.accessibilityState.disabled).toBe(false);
  });

  it('keeps three visible disabled choices without inventing prices when RevenueCat is unavailable', async () => {
    mockLoadVoiceMinutePackages.mockRejectedValue(new Error('catalog unavailable'));
    mockReadVoiceMinuteWalletStatus.mockResolvedValue({ availableSeconds: 0, eventCount: 0 });

    const view = await render(React.createElement(VoiceMinutePackPanel));

    await waitFor(() => {
      expect(view.getAllByTestId(/^voice-minute-pack-/)).toHaveLength(3);
      expect(view.getAllByText('Цена недоступна')).toHaveLength(3);
      expect(view.getByText('Попробовать снова')).toBeTruthy();
    });
    expect(view.queryByText(/[€$£]\s*\d/)).toBeNull();
    expect(view.getByTestId('voice-minute-pack-30').props.accessibilityState.disabled).toBe(true);
  });
});

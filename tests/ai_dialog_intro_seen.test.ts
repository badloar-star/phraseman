import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aiDialogIntroSeenKey,
  hasSeenAiDialogIntro,
  markAiDialogIntroSeen,
} from '../app/ai_dialog_intro_seen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

describe('ai dialog intro seen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds the exact English key', () => {
    expect(aiDialogIntroSeenKey('en', 'briefing')).toBe('ai_dialog_intro_seen:v1:en:briefing');
  });

  it('isolates target and scenario', () => {
    expect(aiDialogIntroSeenKey('en', 'a')).not.toBe(aiDialogIntroSeenKey('fr', 'a'));
    expect(aiDialogIntroSeenKey('en', 'a')).not.toBe(aiDialogIntroSeenKey('en', 'b'));
  });

  it('supports false to true read/write flow', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce('1');
    expect(await hasSeenAiDialogIntro('en', 'briefing')).toBe(false);
    await markAiDialogIntroSeen('en', 'briefing');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('ai_dialog_intro_seen:v1:en:briefing', '1');
    expect(await hasSeenAiDialogIntro('en', 'briefing')).toBe(true);
  });

  it('returns false when getItem rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage unavailable'));
    await expect(hasSeenAiDialogIntro('en', 'briefing')).resolves.toBe(false);
  });
});

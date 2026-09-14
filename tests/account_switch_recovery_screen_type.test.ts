jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-native', () => ({
  ActivityIndicator: () => null,
  Modal: () => null,
  ScrollView: () => null,
  Text: () => null,
  View: () => null,
  Platform: { OS: 'ios' },
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../app/account_switch_quarantine', () => ({
  getAccountSwitchQuarantineSnapshot: () => ({ visible: false, status: 'idle', reason: null }),
  resumeRuntimeAccountSwitchQuarantine: jest.fn(async () => ({ result: 'none' })),
  subscribeAccountSwitchQuarantine: jest.fn(() => () => {}),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#00ff00', bgCard: '#111111', textPrimary: '#ffffff',
      textSecond: '#cccccc', correctText: '#000000',
    },
    f: { h2: 20, body: 16 },
  }),
}));
jest.mock('../components/PressableHybrid', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../app/stable_safe_area_metrics', () => ({
  useStableSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));

test('account-switch recovery wall compiles as a global component', () => {
  const screen = require('../components/AccountSwitchRecoveryScreen').default;
  expect(screen).toBeDefined();
});

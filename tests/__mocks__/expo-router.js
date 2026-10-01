// зачем (координатор §48, 2026-10-01): настоящий expo-router тянет @react-navigation
// и нативный стек — в jest.rntl.config наборы падали на импорте до проверок. Это
// общая лёгкая заглушка; набор, которому важна навигация, по-прежнему делает свой
// jest.mock('expo-router', ...) — он главнее этого сопоставления.
const React = require('react');

const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn(() => false),
  setParams: jest.fn(),
};

module.exports = {
  router,
  useRouter: () => router,
  usePathname: () => '/',
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()), goBack: jest.fn() }),
  useFocusEffect: (effect) => { React.useEffect(effect, []); },
  useRootNavigationState: () => ({ key: 'root' }),
  Link: ({ children }) => children ?? null,
  Redirect: () => null,
  Stack: Object.assign(({ children }) => children ?? null, { Screen: () => null }),
  Tabs: Object.assign(({ children }) => children ?? null, { Screen: () => null }),
};

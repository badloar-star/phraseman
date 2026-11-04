// Сторож (04.11): мост ярлыков устойчив к отсутствию нативного модуля expo-quick-actions — ноль исключений, лог unavailable.
import fs from 'fs';
import path from 'path';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));

describe('мост ярлыков без нативного модуля', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('require падает «Unable to resolve» → loadQuickActionsModule возвращает null без исключения', () => {
    jest.doMock('expo-quick-actions', () => { throw new Error('Unable to resolve module expo-quick-actions'); });
    const bridge = require('../app/quick_actions_bridge') as typeof import('../app/quick_actions_bridge');
    bridge.__resetQuickActionsModuleForTests();
    expect(() => bridge.loadQuickActionsModule()).not.toThrow();
    expect(bridge.loadQuickActionsModule()).toBeNull();
    const logged = (console.log as jest.Mock).mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toMatch(/\[QUICK-ACTIONS\] unavailable:Unable to resolve/);
  });

  it('модуль есть, но форма не та (нет setItems) → null, не падаем', () => {
    jest.doMock('expo-quick-actions', () => ({ initial: undefined }));
    const bridge = require('../app/quick_actions_bridge') as typeof import('../app/quick_actions_bridge');
    bridge.__resetQuickActionsModuleForTests();
    expect(bridge.loadQuickActionsModule()).toBeNull();
  });

  it('модуль есть и исправен → возвращается', () => {
    jest.doMock('expo-quick-actions', () => ({ initial: undefined, setItems: jest.fn(async () => undefined), addListener: jest.fn(() => ({ remove: jest.fn() })) }));
    const bridge = require('../app/quick_actions_bridge') as typeof import('../app/quick_actions_bridge');
    bridge.__resetQuickActionsModuleForTests();
    expect(bridge.loadQuickActionsModule()).not.toBeNull();
  });

  it('в файлах моста и конфига нет статического import модуля на верхнем уровне', () => {
    for (const file of ['quick_actions_bridge.tsx', 'quick_actions_config.ts']) {
      const src = fs.readFileSync(path.join(__dirname, '..', 'app', file), 'utf8');
      expect(src).not.toMatch(/^import[^\n]*from 'expo-quick-actions'/m);
    }
  });
});

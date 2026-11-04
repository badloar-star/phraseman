// зачем (владелец 04.11): приветствие B-3 — только новому и один раз; шлюз подключён в Главной одной строкой.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../app/rank_gates_new_user', () => ({ readRankGateUserVerdict: jest.fn() }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../components/onboarding/ApprovedWelcome', () => ({ ApprovedWelcome: () => null }));

import { WELCOME_B3_SHOWN_KEY, shouldShowWelcome, welcomeLanguageName } from '../components/onboarding/WelcomeGate';

test('показываем только новому пользователю и только один раз', () => {
  expect(shouldShowWelcome({ isNew: true, alreadyShown: false })).toBe(true);
  expect(shouldShowWelcome({ isNew: true, alreadyShown: true })).toBe(false);
  expect(shouldShowWelcome({ isNew: false, alreadyShown: false })).toBe(false);
  expect(WELCOME_B3_SHOWN_KEY).toBe('welcome_b3_shown_v1');
});

test('название языка обучения на языке интерфейса; запасной вариант — английское название', () => {
  expect(welcomeLanguageName('ru', 'en')).toBe('английский');
  expect(welcomeLanguageName('pl', 'de')).toBe('niemiecki');
  expect(welcomeLanguageName('xx', 'fr')).toBe('French');
});

test('Главная монтирует шлюз, шлюз использует правило новых пользователей и отметку «показано»', () => {
  const home = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
  expect(home).toContain('<WelcomeGate />');
  const gate = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding/WelcomeGate.tsx'), 'utf8');
  expect(gate).toContain('readRankGateUserVerdict()');
  expect(gate).toContain('AsyncStorage.setItem(WELCOME_B3_SHOWN_KEY');
});

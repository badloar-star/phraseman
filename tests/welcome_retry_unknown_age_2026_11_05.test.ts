// Приветствие B-3 не теряется, если время создания аккаунта ещё неизвестно (риск Ревизора, координатор 04.11): до 3 перепроверок, без фиксации «не новый».
import fs from 'node:fs';
import path from 'node:path';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: () => undefined }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => undefined } }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../hooks/use_active_account_owner', () => ({ useActiveAccountOwner: () => 'u1' }));
jest.mock('../components/OverlayArbiter', () => ({ useOverlayVisible: () => false }));
jest.mock('../components/onboarding/ApprovedWelcome', () => ({ ApprovedWelcome: () => null }));
jest.mock('../app/rank_gates_new_user', () => ({ readRankGateUserVerdict: async () => ({ isNew: false, reason: 'no_owner' }) }));

import { nextWelcomeRetryDelayMs, WELCOME_RETRY_DELAYS_MS } from '../components/onboarding/WelcomeGate';

describe('nextWelcomeRetryDelayMs', () => {
  it('account_age_unknown: три перепроверки (3, 8, 20 с), потом хватит', () => {
    expect(WELCOME_RETRY_DELAYS_MS).toEqual([3000, 8000, 20000]);
    expect(nextWelcomeRetryDelayMs('account_age_unknown', 0)).toBe(3000);
    expect(nextWelcomeRetryDelayMs('account_age_unknown', 1)).toBe(8000);
    expect(nextWelcomeRetryDelayMs('account_age_unknown', 2)).toBe(20000);
    expect(nextWelcomeRetryDelayMs('account_age_unknown', 3)).toBeNull();
  });
  it('устойчивые причины (старый аккаунт, прогресс, до релиза, липкое решение) не перепроверяются', () => {
    for (const reason of ['old_account', 'prior_progress', 'before_release', 'sticky_old', 'sticky_new', 'new']) {
      expect(nextWelcomeRetryDelayMs(reason, 0)).toBeNull();
    }
  });
});

describe('подключение', () => {
  it('шлюз перепроверяет по таймеру, чистит его при уходе и не пишет «показано» без показа', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding/WelcomeGate.tsx'), 'utf8');
    expect(src).toContain('nextWelcomeRetryDelayMs(verdict.reason, attempt)');
    expect(src).toContain('if (retryTimer) clearTimeout(retryTimer)');
    expect(src.indexOf('welcomeB3ShownKey(owner), String(Date.now())')).toBeGreaterThan(src.indexOf('const close = useCallback'));
    // зачем (владелец 11.11: «только история! ничего поверх главной!»): при включённых историях показом считается записанная история —
    // второе место записи «показано» стоит строго ПОСЛЕ проверки, что история записалась; других мест записи нет
    const storyMark = src.indexOf('AsyncStorage.setItem(shownKey, String(Date.now()))');
    expect(storyMark).toBeGreaterThan(src.indexOf('if (!insteadStoryLanded(record)) {'));
    expect(storyMark).toBeLessThan(src.indexOf('const close = useCallback'));
    expect(src.match(/AsyncStorage\.setItem\(/g)).toHaveLength(2);
  });
});

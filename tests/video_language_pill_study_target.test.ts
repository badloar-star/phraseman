// Баг владельца 11.10 (TG-A30B81C181C4): пилюля языка в шапке вкладки «Видео» вела на /settings_language —
// экран языка ИНТЕРФЕЙСА. Канал Видео задаётся языком ОБУЧЕНИЯ, поэтому пилюля обязана открывать шторку
// «Язык изучения» (PRF-23), выбор — менять studyTarget общим путём, а лента — пересчитывать канал под язык.
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { resolvePreferredYoutubeChannel } from '../app/youtube_channel_preference';
import type { YoutubeCatalogManifest } from '../shared/youtube_catalog_contract';

(globalThis as { __DEV__?: boolean }).__DEV__ = true;

const mockPush = jest.fn();
const mockApply = jest.fn(async (_code: string, _lang: string) => undefined);
const mockEmit = jest.fn();
const mockHaptic = jest.fn();

jest.mock('react-native', () => ({
  Image: 'Image',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'test' }) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => ({}) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: () => mockHaptic() }));
jest.mock('../app/events', () => ({
  emitAppEvent: (...args: unknown[]) => mockEmit(...args),
  actionToastTri: (type: string, copy: unknown) => ({ type, copy }),
}));
jest.mock('../app/study_languages', () => ({
  applyStudyLanguageSelection: (code: string, lang: string) => mockApply(code, lang),
  getStartedStudyLanguages: jest.fn(async () => ['en', 'es']),
  peekStartedStudyLanguages: () => ['en', 'es'],
}));

// eslint-disable-next-line import/first
import { useStudyLanguageSelection } from '../components/settings/StudyLanguagePicker';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function renderSelection(extra: { onBeforeNavigate?: () => void; onSwitchStart?: (code: string) => void; switchNewLanguagesDirectly?: boolean } = {}) {
  return renderHook(() => useStudyLanguageSelection({ lang: 'ru', activeTarget: 'en', logTag: '[VIDEO-LANG-PILL]', ...extra }));
}

beforeEach(() => {
  mockPush.mockClear();
  mockApply.mockReset();
  mockApply.mockImplementation(async () => undefined);
  mockEmit.mockClear();
  mockHaptic.mockClear();
});

describe('пилюля языка на вкладке «Видео» — source-контракт', () => {
  const video = read('app/lingman_videos.tsx');
  const onOpen = video.slice(video.indexOf('onOpenLanguage={'), video.indexOf('{savedOnly ? null : <YoutubeChannelTabs'));

  it('не ведёт на язык интерфейса, а открывает шторку «Язык изучения»', () => {
    expect(onOpen).toContain('setStudyLanguageSheetVisible(true)');
    expect(onOpen).not.toContain("'/settings_language'");
    expect(video).not.toMatch(/router\.push\(['"]\/settings_language/);
    expect(video).toContain('<StudyLanguageSheet');
    expect(video).toContain('activeTarget={studyTarget}');
    expect(video).toContain('logTag="[VIDEO-LANG-PILL]"');
  });

  it('канал ленты пересчитывается от studyTarget (loadCatalog зависит от языка обучения)', () => {
    expect(video).toContain('resolvePreferredYoutubeChannel(manifest, studyTarget, currentPreference)');
    expect(video).toMatch(/\[deepLinkedChannelId, loadLegacyFallback, renderAccountScope, studyTarget\]\);/);
    expect(video).toContain('[VIDEO-LANG-PILL] channel_resolved');
  });

  it('шторка переиспользует общую логику выбора и каркас шторки кита', () => {
    const sheet = read('components/settings/StudyLanguageSheet.tsx');
    expect(sheet).toContain('useStudyLanguageSelection(');
    expect(sheet).toContain('FriendsAddSheetShell');
    expect(sheet).not.toContain("'/settings_language'");
    expect(sheet).not.toContain('adjustsFontSizeToFit');
  });

  // зачем (решение владельца 11.10, Сверка profile-001): строка «Язык изучения» в Настройках стала живой и открывает
  // ТУ ЖЕ шторку, что пилюля «Видео», — а не язык интерфейса. Раньше тест закреплял «без тапа» (PRF-23).
  it('строка «Язык изучения» в Настройках открывает ту же шторку изучаемого языка, а не язык интерфейса', () => {
    const settings = read('app/(tabs)/settings.tsx');
    const row = settings.slice(settings.indexOf('testID="settings-study-language-row"'), settings.indexOf('</SettingsGlassGroup>', settings.indexOf('testID="settings-study-language-row"')));
    expect(row).toContain('onPress={() => setStudySheetVisible(true)}');
    expect(row).not.toContain("'/settings_language'");
    expect(settings).toContain('StudyLanguageSheet');
  });
});

describe('useStudyLanguageSelection — выбор изучаемого языка', () => {
  it('уже начатый язык: мгновенный отклик, studyTarget меняется общим путём, без навигации', async () => {
    const onSwitchStart = jest.fn();
    const { result } = await renderSelection({ onSwitchStart });
    let outcome: string | undefined;
    await act(async () => { outcome = result.current.select('es'); });
    expect(outcome).toBe('switch');
    expect(onSwitchStart).toHaveBeenCalledWith('es');
    expect(mockApply).toHaveBeenCalledWith('es', 'ru');
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => expect(mockEmit).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'success' })));
  });

  it('новый язык: шторка закрывается до перехода, открывается /language_welcome, а не язык интерфейса', async () => {
    const onBeforeNavigate = jest.fn();
    const { result } = await renderSelection({ onBeforeNavigate });
    let outcome: string | undefined;
    await act(async () => { outcome = result.current.select('fr'); });
    expect(outcome).toBe('welcome');
    expect(onBeforeNavigate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/language_welcome', params: { target: 'fr' } });
    expect(mockApply).not.toHaveBeenCalled();
  });

  it('D188: с switchNewLanguagesDirectly новый язык сразу включается тем же путём, без приветствия', async () => {
    const onSwitchStart = jest.fn();
    const onBeforeNavigate = jest.fn();
    const { result } = await renderSelection({ onSwitchStart, onBeforeNavigate, switchNewLanguagesDirectly: true });
    let outcome: string | undefined;
    await act(async () => { outcome = result.current.select('fr'); });
    expect(outcome).toBe('switch');
    expect(onSwitchStart).toHaveBeenCalledWith('fr');
    expect(onBeforeNavigate).not.toHaveBeenCalled();
    expect(mockApply).toHaveBeenCalledWith('fr', 'ru');
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => expect(mockEmit).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'success' })));
  });

  it('тап по текущему языку ничего не делает', async () => {
    const { result } = await renderSelection();
    let outcome: string | undefined;
    await act(async () => { outcome = result.current.select('en'); });
    expect(outcome).toBe('ignored_same');
    expect(mockApply).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('двойной тап в одном кадре переключает один раз', async () => {
    const { result } = await renderSelection();
    const outcomes: string[] = [];
    await act(async () => {
      outcomes.push(result.current.select('es'));
      outcomes.push(result.current.select('es'));
    });
    expect(outcomes).toEqual(['switch', 'ignored_busy']);
    expect(mockApply).toHaveBeenCalledTimes(1);
  });

  it('отказ записи — понятное сообщение вместо немого отказа', async () => {
    mockApply.mockImplementation(async () => { throw new Error('disk_full'); });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderSelection();
    await act(async () => { result.current.select('es'); });
    await waitFor(() => expect(mockEmit).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'error' })));
    expect(warn.mock.calls.some(([line]) => String(line).includes('[VIDEO-LANG-PILL] switch_failed to=es step=unknown reason=disk_full'))).toBe(true);
    warn.mockRestore();
  });

  it('сбой только на отметке «начат» — язык уже сменён, ложного тоста ошибки нет (R4)', async () => {
    mockApply.mockImplementation(async () => { throw Object.assign(new Error('mark_failed'), { step: 'mark_started' }); });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = await renderSelection();
    await act(async () => { result.current.select('es'); });
    await waitFor(() => expect(mockEmit).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'success' })));
    expect(mockEmit).not.toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'error' }));
    expect(warn.mock.calls.some(([line]) => String(line).includes('switch_partial to=es step=mark_started'))).toBe(true);
    warn.mockRestore();
  });
});

describe('шторка «Язык изучения» — по макету PRF-23, D188 (все языки открыты)', () => {
  const sheet = read('components/settings/StudyLanguageSheet.tsx');

  it('D188: новый язык открыт — без замка и подписи, тап идёт в общий select (приветствие языка)', () => {
    expect(sheet).not.toContain('<KitLockFilledIcon');
    expect(sheet).not.toContain('not_started_locked');
    expect(sheet).toContain('const route = select(code);');
    expect(sheet).toContain('switchNewLanguagesDirectly: true');
    expect(read('components/settings/StudyLanguagePicker.tsx')).toContain("router.push({ pathname: '/language_welcome', params: { target: code } } as any);");
  });

  it('замок на время выезда (R3) и тап по выбранному закрывает шторку (R6)', () => {
    expect(sheet).toContain('select_ignored reason=sheet_dismissing');
    expect(sheet).toContain("closeAnimated('already_selected')");
  });

  it('шапка — `.flex` макета (по центру, зазор 10, подзаголовок +7), значок галочки кита', () => {
    expect(sheet).toContain('headerLayout="kit"');
    const shell = read('components/friends/FriendsAddSheetShell.tsx');
    expect(shell).toContain("headerKit: { alignItems: 'center', gap: 10 }");
    expect(shell).toContain('marginTop: kitHeader ? 7 : 4');
    expect(shell).toContain("headerLayout = 'friends'");
    expect(sheet).toContain('M5 12.5l4.5 4.5L19 7.5');
  });

  it('порядок: выбранный первым, остальные en, es, fr, de, it (О8)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.isolateModules(() => {
      jest.doMock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path', Rect: 'Rect' }));
      jest.doMock('expo-image', () => ({ Image: 'Image' }));
      jest.doMock('../components/friends/FriendsAddSheetShell', () => 'FriendsAddSheetShell');
      jest.doMock('../components/settings/SettingsGlassRows', () => ({ SettingsGlassRow: 'SettingsGlassRow' }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { orderStudyLanguageSheetOptions } = require('../components/settings/StudyLanguageSheet');
      expect(orderStudyLanguageSheetOptions(['en', 'es', 'fr', 'de', 'it'], 'fr')).toEqual(['fr', 'en', 'es', 'de', 'it']);
      expect(orderStudyLanguageSheetOptions(['it', 'de', 'en'], 'en')).toEqual(['en', 'de', 'it']);
    });
  });
});

describe('канал ленты следует за языком обучения', () => {
  const manifest = {
    channels: [
      { id: 'phraseman-en', order: 0 },
      { id: 'phraseman-es', order: 1 },
    ],
    localeDefaults: { en: 'phraseman-en', es: 'phraseman-es' },
    defaultChannelId: 'phraseman-en',
  } as unknown as YoutubeCatalogManifest;

  it('после выбора es авто-канал — испанский, после en — английский', () => {
    expect(resolvePreferredYoutubeChannel(manifest, 'es', { mode: 'auto' }).channelId).toBe('phraseman-es');
    expect(resolvePreferredYoutubeChannel(manifest, 'en', { mode: 'auto' }).channelId).toBe('phraseman-en');
  });
});

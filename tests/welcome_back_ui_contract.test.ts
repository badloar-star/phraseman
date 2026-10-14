// зачем (D193, координатор 14.10): окно «С возвращением» — строго по одобренному образцу m21. Сторож держит:
// тексты образца дословно (RU), строка цифр только из настоящих частей (нет фраз/ранга/полной энергии — часть опускается),
// 9 языков, без «живых» формулировок о монете, без карточек — только «На Главную»; гейт: флаг → снимок возвращения → отметка → показ.
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
      __store: store,
    },
  };
});
let mockConfigRaw: string | null = JSON.stringify({ bools: { moments_v3: true } });
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: jest.fn(async () => mockConfigRaw) }));
let mockStats: unknown = { phrasesLearned: 500, flashcardsSaved: 40, byTarget: { en: { phrasesLearned: 412, flashcardsSaved: 9, wordsLearned: 0 } } };
jest.mock('../app/lifetime_profile_stats', () => ({ readLifetimeProfileStatsCache: jest.fn(async () => mockStats) }));
jest.mock('../components/spire/moments/moments_flag', () => ({ isMomentsV3Enabled: (b: Record<string, unknown> | null) => b?.moments_v3 === true }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { welcomeBackCardsLabel, welcomeBackHomeLabel, welcomeBackStatsLine, welcomeBackTitle } from '../modules/welcome_back/welcome_back_strings';
import { WELCOME_BACK_SHOWN_AT_KEY, markWelcomeBackShown, resolveWelcomeBack } from '../modules/welcome_back/welcome_back_gate';
import { clearWelcomeBackReturnGap, noteWelcomeBackReturnGap, peekWelcomeBackReturnGap } from '../modules/welcome_back/welcome_back_signal';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  (AsyncStorage as unknown as { __store: Map<string, string> }).__store.clear();
  clearWelcomeBackReturnGap('test_reset');
  mockConfigRaw = JSON.stringify({ bools: { moments_v3: true } });
  mockStats = { phrasesLearned: 500, flashcardsSaved: 40, byTarget: { en: { phrasesLearned: 412, flashcardsSaved: 9, wordsLearned: 0 } } };
});

describe('welcome back texts follow the approved m21 mockup', () => {
  it('RU is the mockup word for word', () => {
    expect(welcomeBackTitle('ru')).toBe('С возвращением');
    expect(welcomeBackStatsLine('ru', { awayDays: 9, phrasesLearned: 412, coinRank: 5, energyFull: true })).toBe('9 дней — ничего не сгорело: 412 фраз, ранг 5, энергия полная.');
    expect(welcomeBackCardsLabel('ru', 5)).toBe('5 карточек — 1 минута');
    expect(welcomeBackHomeLabel('ru')).toBe('На Главную');
  });

  it('only real parts: missing phrases / rank / full energy are omitted, not invented', () => {
    expect(welcomeBackStatsLine('ru', { awayDays: 12, phrasesLearned: 0, coinRank: null, energyFull: false })).toBe('12 дней — ничего не сгорело.');
    expect(welcomeBackStatsLine('ru', { awayDays: 21, phrasesLearned: 3, coinRank: null, energyFull: null })).toBe('21 день — ничего не сгорело: 3 фразы.');
    expect(welcomeBackCardsLabel('ru', 2)).toBe('2 карточки — 1 минута');
  });

  it.each(LANGS)('%s has every string', (lang) => {
    expect(welcomeBackTitle(lang).length).toBeGreaterThan(3);
    expect(welcomeBackHomeLabel(lang).length).toBeGreaterThan(2);
    expect(welcomeBackCardsLabel(lang, 5)).toMatch(/5 .+ — 1 /);
    expect(welcomeBackStatsLine(lang, { awayDays: 9, phrasesLearned: 412, coinRank: 5, energyFull: true })).toMatch(/^9 .+ — .+: 412 .+, .+5, .+\.$/);
  });

  it('never describes the coin as a living being (owner 14.10)', () => {
    for (const rel of ['modules/welcome_back/welcome_back_strings.ts', 'components/moments/WelcomeBackMoment.tsx']) {
      expect(read(rel)).not.toMatch(/задрема|проснул|разбуд|будит/i);
    }
  });

  it('screen: the cards button only when there are cards; «На Главную» always', () => {
    const screen = read('components/moments/WelcomeBackMoment.tsx');
    expect(screen).toMatch(/\{cardsCount > 0 \? \(\s*<V2Button label=\{welcomeBackCardsLabel\(lang, cardsCount\)\}/);
    expect(screen).toContain('<V2Button label={welcomeBackHomeLabel(lang)} variant="secondary" onPress={onHome}');
    expect(screen).toContain("mood={mood}");
    expect(screen).toMatch(/peekMs: 1000, cheerMs: 1800, beatStepMs: 300, beatMs: 500/);
  });
});

describe('welcome back gate', () => {
  const input = { studyTarget: 'en', coinRank: 5, energy: { current: 5, max: 5 }, nowMs: NOW };

  it('flag off → hidden', async () => {
    mockConfigRaw = JSON.stringify({ bools: { moments_v3: false } });
    noteWelcomeBackReturnGap(NOW - 9 * DAY, NOW);
    await expect(resolveWelcomeBack(input)).resolves.toEqual({ show: false, reason: 'flag_off' });
  });

  it('no long absence in this run → hidden', async () => {
    noteWelcomeBackReturnGap(NOW - 2 * DAY, NOW);
    expect(peekWelcomeBackReturnGap()).toBeNull();
    await expect(resolveWelcomeBack(input)).resolves.toEqual({ show: false, reason: 'no_return_gap' });
  });

  it('long absence → shown with real numbers of the study language', async () => {
    noteWelcomeBackReturnGap(NOW - 9 * DAY, NOW);
    const r = await resolveWelcomeBack(input);
    if (!r.show) throw new Error(`expected show, got ${r.reason}`);
    expect(r.decision.stats).toMatchObject({ awayDays: 9, phrasesLearned: 412, coinRank: 5, energyFull: true });
    expect(r.decision.primary).toEqual({ kind: 'cards', count: 5, source: 'recent_saved' });
  });

  it('no saved cards → no cards button (home only)', async () => {
    mockStats = { phrasesLearned: 1, flashcardsSaved: 0, byTarget: { en: { phrasesLearned: 1, flashcardsSaved: 0, wordsLearned: 0 } } };
    noteWelcomeBackReturnGap(NOW - 9 * DAY, NOW);
    const r = await resolveWelcomeBack(input);
    if (!r.show) throw new Error('expected show');
    expect(r.decision.primary).toEqual({ kind: 'home' });
  });

  it('once per return: shown after the last activity → hidden', async () => {
    noteWelcomeBackReturnGap(NOW - 9 * DAY, NOW);
    await markWelcomeBackShown(NOW - 1000);
    expect(await AsyncStorage.getItem(WELCOME_BACK_SHOWN_AT_KEY)).toBe(String(NOW - 1000));
    await expect(resolveWelcomeBack(input)).resolves.toEqual({ show: false, reason: 'already_shown' });
  });

  it('broken stats cache → shown without numbers, never invented', async () => {
    mockStats = null;
    noteWelcomeBackReturnGap(NOW - 9 * DAY, NOW);
    const r = await resolveWelcomeBack(input);
    if (!r.show) throw new Error('expected show');
    expect(r.decision.stats.phrasesLearned).toBe(0);
    expect(r.decision.primary).toEqual({ kind: 'home' });
  });
});

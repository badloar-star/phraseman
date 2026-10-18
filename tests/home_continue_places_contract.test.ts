// зачем (слово владельца 17.10 через координатора): над плитками Главной — карточка «последнее место»: урок, занятие V2, диалог или набор карточек, что свежее;
// метка только локальная; нет меток — «Начать урок 1»; устаревшая метка тихо отпадает с журналом [HOME-CONTINUE] stale; тап ведёт на экран-вход раздела.
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null])),
    setItem: (k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); },
    multiRemove: (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); return Promise.resolve(); },
  },
}));
let mockOwnerReset: (() => void) | null = null;
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (_n: string, reset: () => void) => { mockOwnerReset = reset; } }));
// каталог сценариев большой — подменяем: «coffee» существует, остальных нет
jest.mock('../app/ai_dialog_scenarios', () => ({
  getScenarioById: (id: string) => (id === 'coffee' ? { id: 'coffee' } : undefined),
  dialogScenarioTitle: () => 'Закажи кофе',
}));

import { lastOpenedLessonKey } from '../app/target_storage_keys';
import {
  homeContinuePlaceBadge,
  homeContinueStartTitle,
  loadHomeContinueMarks,
  peekHomeContinueMarks,
  pickHomeContinue,
  recordHomeContinuePlace,
  resetHomeContinueMarksForTests,
  resolveHomeContinuePlaces,
  type HomeContinuePlaceMark,
  type HomeContinueV2Mark,
} from '../app/home_continue_mark';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const v2 = (atMs: number): HomeContinueV2Mark => ({ lessonOrdinal: 1, sessionOrdinal: 4, sessionId: 'lesson-01:session:04', route: { id: 'lesson-01:session:04' }, atMs });
const dialog = (atMs: number, id = 'coffee'): HomeContinuePlaceMark => ({ id, title: 'Coffee', subtitle: null, route: { pathname: '/ai_dialog_briefing', params: { scenarioId: id } }, atMs });
const cards = (atMs: number): HomeContinuePlaceMark => ({ id: 'saved', title: 'Сохранённые', subtitle: null, route: { pathname: '/flashcards_training_setup', params: { mode: 'swipe' } }, atMs });

describe('выбор «последнего места»: самое свежее из четырёх', () => {
  it('одно место — оно', () => {
    expect(pickHomeContinue({ hasLegacyLesson: false, legacyAtMs: null, v2: null, dialog: dialog(10) })).toEqual({ kind: 'dialog', reason: 'dialog_only' });
    expect(pickHomeContinue({ hasLegacyLesson: false, legacyAtMs: null, v2: null, cards: cards(10) })).toEqual({ kind: 'cards', reason: 'cards_only' });
  });
  it('побеждает свежее по времени; старый урок без метки времени проигрывает всем', () => {
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 100, v2: v2(200), dialog: dialog(300), cards: cards(250) }).kind).toBe('dialog');
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 100, v2: v2(200), dialog: dialog(150), cards: cards(250) }).kind).toBe('cards');
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 900, v2: v2(200), dialog: dialog(150), cards: cards(250) }).kind).toBe('legacy');
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: null, v2: null, cards: cards(1) }).kind).toBe('cards');
  });
  it('прежнее поведение «урок против V2» не изменилось (без диалога и карточек)', () => {
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 1000, v2: v2(2000) })).toEqual({ kind: 'v2', reason: 'v2_newer' });
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 3000, v2: v2(2000) })).toEqual({ kind: 'legacy', reason: 'legacy_newer' });
  });
  it('ничего нет — «none» (Главная покажет «Начать урок 1»)', () => {
    expect(pickHomeContinue({ hasLegacyLesson: false, legacyAtMs: null, v2: null })).toEqual({ kind: 'none', reason: 'none' });
  });
});

describe('метки диалога и карточек: локально, с диска, смена аккаунта', () => {
  beforeEach(() => { mockStore.clear(); resetHomeContinueMarksForTests(); jest.restoreAllMocks(); });
  it('запись — в памяти сразу и на диске; перезапуск читает с диска', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    recordHomeContinuePlace('dialog', 'en', dialog(500));
    recordHomeContinuePlace('cards', 'en', cards(600));
    expect(peekHomeContinueMarks('en')?.dialog?.id).toBe('coffee');
    await Promise.resolve();
    resetHomeContinueMarksForTests();
    const marks = await loadHomeContinueMarks('en');
    expect(marks.dialog).toEqual(dialog(500));
    expect(marks.cards).toEqual(cards(600));
  });
  it('запись диалога не стирает метку V2 и время урока', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    recordHomeContinuePlace('cards', 'en', cards(5));
    expect(peekHomeContinueMarks('en')?.v2).toBeNull();
    recordHomeContinuePlace('dialog', 'en', dialog(6));
    expect(peekHomeContinueMarks('en')?.cards).toEqual(cards(5));
  });
  it('пустое название / маршрут без слэша — не записывается, причина в журнале', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    recordHomeContinuePlace('cards', 'en', { ...cards(1), title: '' });
    recordHomeContinuePlace('dialog', 'en', { ...dialog(1), route: { pathname: 'ai_dialog_briefing' } });
    expect(peekHomeContinueMarks('en')).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]![0])).toContain('[HOME-CONTINUE]');
  });
  it('битая метка с диска игнорируется, а не роняет Главную', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockStore.set(`${lastOpenedLessonKey('en')}__continue_dialog`, '{"id":"coffee"}');
    mockStore.set(`${lastOpenedLessonKey('en')}__continue_cards`, 'не json');
    const marks = await loadHomeContinueMarks('en');
    expect(marks.dialog).toBeNull();
    expect(marks.cards).toBeNull();
  });
  it('смена владельца аккаунта чистит и новые ключи', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    recordHomeContinuePlace('dialog', 'en', dialog(1));
    recordHomeContinuePlace('cards', 'en', cards(2));
    await Promise.resolve();
    expect(mockStore.size).toBe(2);
    mockOwnerReset?.();
    await Promise.resolve();
    expect(mockStore.size).toBe(0);
    expect(peekHomeContinueMarks('en')).toBeNull();
  });
});

describe('устаревшая метка тихо отпадает, причина — в журнале [HOME-CONTINUE] stale', () => {
  const marks = (d: HomeContinuePlaceMark | null, c: HomeContinuePlaceMark | null) => ({ v2: null, legacyAtMs: null, dialog: d, cards: c });
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { log.mockRestore(); });
  const logged = () => log.mock.calls.map((c) => String(c[0])).join('\n');

  it('живая метка проходит; название диалога — свежее по языку', () => {
    const res = resolveHomeContinuePlaces({ marks: marks(dialog(1), cards(2)), dialoguesVisible: true, flashcardsVisible: true, lang: 'ru' });
    expect(res.dialog?.title).toBe('Закажи кофе');
    expect(res.cards?.id).toBe('saved');
    expect(logged()).not.toContain('stale');
  });
  it('сценарий удалён — диалог отпал', () => {
    const res = resolveHomeContinuePlaces({ marks: marks(dialog(1, 'gone'), null), dialoguesVisible: true, flashcardsVisible: true, lang: 'ru' });
    expect(res.dialog).toBeNull();
    expect(logged()).toContain('[HOME-CONTINUE] stale: диалог id=gone — сценария больше нет');
  });
  it('раздел закрыт для языка обучения — метка отпала', () => {
    const res = resolveHomeContinuePlaces({ marks: marks(dialog(1), cards(2)), dialoguesVisible: false, flashcardsVisible: false, lang: 'ru' });
    expect(res).toEqual({ dialog: null, cards: null });
    expect(logged()).toContain('раздел диалогов закрыт');
    expect(logged()).toContain('раздел карточек закрыт');
  });
});

describe('подписи', () => {
  it('плашка и заголовок «Начать урок 1» — на всех 9 языках, непустые', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(homeContinuePlaceBadge(lang, 'dialog').length).toBeGreaterThan(0);
      expect(homeContinuePlaceBadge(lang, 'cards').length).toBeGreaterThan(0);
      expect(homeContinueStartTitle(lang)).toContain('1');
    }
    expect(homeContinueStartTitle('ru')).toBe('Начать урок 1');
  });
});

describe('подключение: точки входа пишут метку, Главная рисует карточку', () => {
  it('старт диалога и старт тренировки карточек пишут метку; тап ведёт на экран-вход', () => {
    const dlg = read('app/ai_dialog_session.tsx');
    expect(dlg).toContain("recordHomeContinuePlace('dialog', studyTarget, {");
    expect(dlg).toContain("route: { pathname: '/ai_dialog_briefing', params: { scenarioId: scenario.id } }");
    const fc = read('app/flashcards_training_setup.tsx');
    expect(fc).toContain("recordHomeContinuePlace('cards', studyTarget, {");
    // не прямой запуск сессии (он обошёл бы проверку квоты), а экран настройки с предвыбором последнего набора
    expect(fc).toContain("route: { pathname: '/flashcards_training_setup', params: { mode } }");
    expect(fc).toContain('if (viewLang === studyTarget) {\n      const pickedDecks');
  });

  it('Главная: свежее из четырёх, проверка устаревания до выбора, «Начать урок 1» без меток, прежняя ветка урока/V2 нетронута', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('resolveHomeContinuePlaces({ marks: continueMarks, dialoguesVisible: homeDialoguesVisible, flashcardsVisible: homeFlashcardsVisible, lang })');
    expect(home).toContain('dialog: continuePlaces.dialog, cards: continuePlaces.cards };');
    expect(home).toContain("const continueStart = continueChoice.kind === 'none' && continueResolved && homeLearnVisible;");
    expect(home).toContain('{continuePlace === null && !continueStart ? (');
    expect(home).toContain('{continuePlace !== null || continueStart ? (');
    expect(home).toContain('hideProgress');
    expect(home).toContain("go('/learning-v2/course');");
    expect(home).toContain("nav.push({ pathname: '/lesson_menu', params: { id: '1' } } as never);");
    // прежняя карточка урока и V2 — как была (строки закреплены другими сторожами)
    expect(home).toContain('{priorityCardVisible || continueCardPending ? (');
  });

  // зачем (владелец 18.10 «вариант Г»): полосы и стрелки больше нет — прогресс в кольце; у диалога/набора (hideProgress) дуги и «done / total» нет, высота та же
  it('карточка места без прогресса: та же высота, кольцо без дуги и счётчика, заготовка загрузки прежняя', () => {
    const card = read('components/home/v2/HomeV2ContinueCard.tsx');
    expect(card).toContain('hideProgress?: boolean;');
    expect(card).toContain('const showRing = !hideProgress;');
    expect(card).toContain("const subLine = [showRing ? `${done} / ${total}` : null, badge ?? null].filter(Boolean).join(' · ');");
    expect(card).toMatch(/\{showRing && ratio > 0 \? \(/);
    expect(card).toMatch(/minHeight: CARD_HEIGHT/);
    expect(card).toContain('style={[s.ring, pending ? s.artPending : null]}');
  });

  it('ничего из этого не ходит в Firestore', () => {
    for (const rel of ['app/home_continue_mark.ts']) {
      const src = read(rel);
      expect(src).not.toMatch(/^import .*(firebase|firestore).*$/im);
      expect(src).not.toMatch(/require\(['"][^'"]*(firebase|firestore)/i);
    }
  });
});

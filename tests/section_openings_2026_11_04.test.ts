// section_openings_2026_11_04.test.ts — праздничные окна «Открытие разделов»: правила, отметки, старые пользователи, тексты, подключение.
// зачем (владелец одобрил макет, координатор 04.11): один показ на раздел; СТАРЫЕ и неизвестные пользователи не получают поток окон за
// уже открытое (первый запуск молча помечает всё «показано»); окна — только после реального открытия; флаг по умолчанию ВЫКЛ.
import fs from 'node:fs';
import path from 'node:path';

const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    removeItem: jest.fn(async (key: string) => void store.delete(key)),
  },
}));
let mockOwner: string | null = 'owner-aaaaaaaa';
const mockGenListeners: (() => void)[] = [];
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: mockOwner ? 'active' : 'idle', stableId: mockOwner, generation: 1 }),
  subscribeAccountGeneration: (listener: () => void) => { mockGenListeners.push(listener); return { remove: () => undefined }; },
}));

/* eslint-disable import/first -- моки подняты выше */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import {
  EMPTY_MARKS, SECTION_OPENING_IDS, SECTION_OPENING_ROUTES, SECTION_OPENING_STATE_COUNT, SURFACE_TO_OPENING,
  decideSectionOpenings, deservedOpenings, markShown, parseMarks, sectionOpeningFreezeAt, serializeMarks, type SectionOpeningFacts,
} from '../modules/section_openings/section_opening_core';
import {
  __resetSectionOpeningForTests, dismissSectionOpening, noteSectionOpeningShown, peekSectionOpening, reconcileSectionOpenings, sectionOpeningKey,
} from '../modules/section_openings/section_opening_store';
import { sectionOpeningCopy, sectionOpeningSkip } from '../modules/section_openings/section_opening_strings';
/* eslint-enable import/first */

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const facts = (over: Partial<SectionOpeningFacts> = {}): SectionOpeningFacts => ({ resolved: true, isNew: true, open: [], plusActive: false, ...over });

beforeEach(() => {
  store.clear();
  mockOwner = 'owner-aaaaaaaa';
  __resetSectionOpeningForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('макет: состав окон', () => {
  it('26 состояний = 5 разделов × 4 фазы + «Ранг 1» + 5 «уменьшенное движение»', () => {
    expect(SECTION_OPENING_STATE_COUNT).toBe(26);
    expect(SECTION_OPENING_IDS).toEqual(['rank', 'video', 'dialogs', 'peak', 'cards', 'plus']);
  });
  it('раздел ведёт тем же маршрутом, что плитка Главной; rank и plus только закрывают окно', () => {
    expect(SECTION_OPENING_ROUTES).toEqual({
      rank: null, video: '/flashcards_video_packs', dialogs: '/ai_dialog_home', peak: '/(tabs)/community?section=spire', cards: '/flashcards', plus: null,
    });
    expect(SURFACE_TO_OPENING).toEqual({ video: 'video', dialogues: 'dialogs', peak: 'peak', cards_hub: 'cards' });
  });
});

describe('правила: что заслужено и что показывать', () => {
  it('ранг 1 открыл видео и диалоги → «Ранг», «Видео», «Диалоги» по порядку; Пик (ранг 2) добавляет своё окно', () => {
    expect(deservedOpenings({ open: ['video', 'dialogues'], plusActive: false })).toEqual(['rank', 'video', 'dialogs']);
    expect(deservedOpenings({ open: ['video', 'dialogues', 'peak'], plusActive: false })).toEqual(['rank', 'video', 'dialogs', 'peak']);
    expect(deservedOpenings({ open: ['peak'], plusActive: false })).toEqual(['peak']);
  });
  it('Plus открывает всё сразу — одно окно «Plus», а не пять', () => {
    expect(deservedOpenings({ open: ['video', 'dialogues', 'peak', 'cards_hub'], plusActive: true })).toEqual(['plus']);
  });
  it('новый пользователь: первый запуск ставит seeded, окна за открытое показываем; показанное не повторяется', () => {
    const first = decideSectionOpenings(EMPTY_MARKS, facts({ open: ['video', 'dialogues'] }));
    expect(first.nextMarks).toEqual({ seeded: true, seen: [] });
    expect(first.queue).toEqual(['rank', 'video', 'dialogs']);
    const after = decideSectionOpenings(markShown(markShown({ seeded: true, seen: [] }, 'rank'), 'video'), facts({ open: ['video', 'dialogues'] }));
    expect(after.queue).toEqual(['dialogs']);
    expect(after.nextMarks).toBeNull();
  });
  it('показ Plus помечает и окна разделов — после него четыре окна подряд не приходят', () => {
    const marks = markShown({ seeded: true, seen: [] }, 'plus');
    expect(decideSectionOpenings(marks, facts({ open: ['video', 'dialogues'], plusActive: true })).queue).toEqual([]);
    expect(decideSectionOpenings(marks, facts({ open: ['video', 'dialogues'] })).queue).toEqual([]);
  });
  it('СТАРЫЙ и НЕИЗВЕСТНЫЙ пользователь (isNew = false): первый запуск молча помечает всё открытое «показано», окон нет', () => {
    const decision = decideSectionOpenings(EMPTY_MARKS, facts({ isNew: false, open: ['video', 'dialogues', 'peak', 'cards_hub'] }));
    expect(decision.queue).toEqual([]);
    expect(decision.nextMarks).toEqual({ seeded: true, seen: ['rank', 'video', 'dialogs', 'peak', 'cards'] });
    expect(decision.reason).toBe('seeded_silently_not_new');
    const plus = decideSectionOpenings(EMPTY_MARKS, facts({ isNew: false, plusActive: true, open: ['video'] }));
    expect(plus.queue).toEqual([]);
    expect(plus.nextMarks?.seen).toEqual([...SECTION_OPENING_IDS]);
  });
  it('после тихой отметки у старого пользователя окна не приходят и дальше (всё открыто, ничего не меняется)', () => {
    const seeded = decideSectionOpenings(EMPTY_MARKS, facts({ isNew: false, open: ['video', 'dialogues'] })).nextMarks ?? EMPTY_MARKS;
    expect(decideSectionOpenings(seeded, facts({ isNew: false, open: ['video', 'dialogues'] })).queue).toEqual([]);
  });
  it('реальное открытие после первого запуска: новый пользователь получает окно только на новый раздел', () => {
    const seeded = decideSectionOpenings(EMPTY_MARKS, facts({ open: [] })).nextMarks ?? EMPTY_MARKS;
    expect(decideSectionOpenings(seeded, facts({ open: [] })).queue).toEqual([]);
    expect(decideSectionOpenings(seeded, facts({ open: ['video', 'dialogues'] })).queue).toEqual(['rank', 'video', 'dialogs']);
  });
  it('факты не готовы (pending / вердикт не прочитан) → решения нет, ничего не помечаем', () => {
    expect(decideSectionOpenings(EMPTY_MARKS, facts({ resolved: false, isNew: false, open: ['video'] }))).toEqual({ nextMarks: null, queue: [], reason: 'not_resolved' });
  });
  it('отметки: круг сериализации; битая строка = нет отметок', () => {
    const marks = markShown({ seeded: true, seen: [] }, 'peak');
    expect(parseMarks(serializeMarks(marks))).toEqual(marks);
    for (const bad of ['{', '[]', '{"v":2,"seeded":true,"seen":[]}', '{"v":1,"seeded":"yes","seen":[]}', '']) expect(parseMarks(bad)).toBeNull();
    expect(parseMarks('{"v":1,"seeded":true,"seen":["peak","bogus"]}')?.seen).toEqual(['peak']);
  });
});

describe('хранилище: память + телефон', () => {
  it('новый пользователь: очередь идёт по одному, «показано» пишется при появлении окна, а не при решении', async () => {
    await reconcileSectionOpenings(facts({ open: ['video', 'dialogues'] }));
    expect(peekSectionOpening().current).toBe('rank');
    expect(JSON.parse(store.get(sectionOpeningKey('owner-aaaaaaaa')) ?? '{}').seen).toEqual([]);
    noteSectionOpeningShown('rank');
    expect(JSON.parse(store.get(sectionOpeningKey('owner-aaaaaaaa')) ?? '{}').seen).toEqual(['rank']);
    expect(dismissSectionOpening()).toBe('rank');
    expect(peekSectionOpening().current).toBe('video');
    noteSectionOpeningShown('video');
    dismissSectionOpening();
    noteSectionOpeningShown('dialogs');
    expect(peekSectionOpening().current).toBe('dialogs');
    dismissSectionOpening();
    expect(peekSectionOpening().current).toBeNull();
  });
  it('«Пропустить» закрывает окно сразу и навсегда для этого раздела; журнал называет раздел, источник, пропуск и отметку', async () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    await reconcileSectionOpenings(facts({ open: ['video'] }));
    expect(peekSectionOpening().current).toBe('rank');
    noteSectionOpeningShown('rank');
    expect(dismissSectionOpening('skip')).toBe('rank');
    // те же факты ещё раз (хост пересчитывает при любой смене) — пропущенный раздел не возвращается
    await reconcileSectionOpenings(facts({ open: ['video'] }));
    expect(peekSectionOpening().current).not.toBe('rank');
    const row = lines.find((l) => l.includes('"event":"dismissed"'));
    spy.mockRestore();
    expect(row).toBeDefined();
    const json = JSON.parse(row!.slice(row!.indexOf('{')));
    expect(json).toMatchObject({ event: 'dismissed', section: 'rank', source: 'skip', skipped: true, persisted: true });
  });
  it('убили приложение посреди очереди: непоказанное вернётся на следующем запуске, показанное — нет', async () => {
    await reconcileSectionOpenings(facts({ open: ['video', 'dialogues'] }));
    noteSectionOpeningShown('rank');
    __resetSectionOpeningForTests(); // «перезапуск»: память пуста, диск остался
    await reconcileSectionOpenings(facts({ open: ['video', 'dialogues'] }));
    expect(peekSectionOpening().current).toBe('video');
  });
  it('старый пользователь: окон нет, отметки записаны; следующий запуск тоже без окон', async () => {
    await reconcileSectionOpenings(facts({ isNew: false, open: ['video', 'dialogues', 'peak', 'cards_hub'] }));
    expect(peekSectionOpening().current).toBeNull();
    expect(JSON.parse(store.get(sectionOpeningKey('owner-aaaaaaaa')) ?? '{}')).toEqual({ v: 1, seeded: true, seen: ['rank', 'video', 'dialogs', 'peak', 'cards'] });
    __resetSectionOpeningForTests();
    await reconcileSectionOpenings(facts({ isNew: false, open: ['video', 'dialogues', 'peak', 'cards_hub'] }));
    expect(peekSectionOpening().current).toBeNull();
  });
  it('отметки не прочли — окон нет (лучше пропустить, чем дать поток); отметку не записали — показ идёт, ошибка в журнале', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => { throw new Error('disk'); });
    await reconcileSectionOpenings(facts({ isNew: false, open: ['video'] }));
    expect(peekSectionOpening().current).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[SECTION-OPENING]', expect.stringContaining('marks_read_failed'), 'Error: disk');
    __resetSectionOpeningForTests();
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async () => { throw new Error('full'); });
    await reconcileSectionOpenings(facts({ open: ['peak'] }));
    noteSectionOpeningShown('peak');
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalledWith('[SECTION-OPENING]', expect.stringContaining('marks_write_failed'), 'Error: full');
  });
  it('нет владельца (выход из аккаунта) — окон нет; чужие отметки не берутся', async () => {
    mockOwner = null;
    await reconcileSectionOpenings(facts({ open: ['video'] }));
    expect(peekSectionOpening().current).toBeNull();
    mockOwner = 'owner-aaaaaaaa';
    await reconcileSectionOpenings(facts({ open: ['video'] }));
    noteSectionOpeningShown('video');
    mockOwner = 'owner-bbbbbbbb';
    __resetSectionOpeningForTests();
    await reconcileSectionOpenings(facts({ open: ['video'] }));
    expect(peekSectionOpening().current).toBe('rank');
  });
  it('ключ отметки лежит в стираемом семействе story_events_v1: (выход и удаление аккаунта)', () => {
    expect(sectionOpeningKey('u1').startsWith('story_events_v1:')).toBe(true);
    expect(read('app/cloud_sync.ts')).toContain("const STORY_EVENTS_PREFIX = 'story_events_v1';");
  });
});

describe('тексты: 9 языков, 6 окон', () => {
  it.each(LANGS)('%s: у каждого окна подпись, заголовок, текст и CTA; без «{…}»', (lang) => {
    for (const id of SECTION_OPENING_IDS) {
      const copy = sectionOpeningCopy(lang, id);
      for (const value of Object.values(copy)) expect({ lang, id, ok: value.trim().length > 0 && !/[{}]/u.test(value) }).toEqual({ lang, id, ok: true });
    }
    expect(sectionOpeningSkip(lang).trim().length).toBeGreaterThan(0);
  });
  it('ru — слово в слово из макета', () => {
    expect(sectionOpeningCopy('ru', 'video')).toEqual({ label: 'ВИДЕО', title: 'Открылось видео', body: 'Смотри видео на изучаемом языке и сохраняй фразы.', cta: 'Открыть видео' });
    expect(sectionOpeningCopy('ru', 'plus').title).toBe('Больше способов учиться');
    expect(sectionOpeningCopy('ru', 'rank').cta).toBe('Посмотреть открытия');
  });
});

describe('подключение и запреты', () => {
  it('флаг section_openings_enabled: объявлен, по умолчанию ВКЛ (слово владельца 05.11 ~15:00), принимается из снимка Пульта', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain("| 'section_openings_enabled'");
    expect(flags).toMatch(/section_openings_enabled: true,/u);
    expect(flags.match(/'section_openings_enabled'/gu)?.length).toBeGreaterThanOrEqual(2);
  });
  it('хост пишет решение в журнал [SECTION-OPENING] с причиной (показан/не показан)', () => {
    const host = read('modules/section_openings/use_section_opening_host.ts');
    expect(host).toContain("console.log(LOG, 'decision', line)");
    for (const reason of ['flag_off', 'rank_gates_off', 'verdict_pending', 'access_pending', 'nothing_queued', 'overlay_blocked', 'shown']) {
      expect(host).toContain(`'${reason}'`);
    }
  });
  it('хост: пока флаг или ранговые гейты выключены — ничего не решает и не помечает; вердикт «новый» из readRankGateUserVerdict', () => {
    const host = read('modules/section_openings/use_section_opening_host.ts');
    expect(host).toContain("getRemoteBool('section_openings_enabled') === true");
    expect(host).toContain("getRemoteBool('rank_gates_enabled') !== false");
    expect(host).toContain('if (!enabled || !gatesOn || !verdict || anyPending || !premium.accessResolved) return null;');
    expect(host).toContain("useOverlayVisible('sectionOpening', wanted)");
    expect(host).toContain('verdict_read_failed');
  });
  it('Главная: слот стоит в очереди окон арбитра (Modal, ключ sectionOpening) и ведёт по маршруту раздела', () => {
    expect(read('app/(tabs)/home.tsx')).toContain('<HomeSectionOpeningSlot lang={lang} active={homeRuntimeActive} onNavigate={homeOpenSectionRoute} />');
    expect(read('components/home/home_moment_slots.tsx')).toContain("onRequestClose={() => sectionOpening.dismiss('back')}");
    expect(read('components/overlay_arbiter_core.ts')).toContain("'sectionOpening'");
  });
  it('окно: таймлайн на UI-потоке (Reanimated), без setState в кадрах, без обводок, без обрезки строк и ужатия шрифта; уменьшенное движение — сразу финал', () => {
    const src = read('components/section_openings/SectionOpeningCeremony.tsx');
    expect(src).toContain('useSharedValue(reduced ? 1');
    expect(src).toContain('useAnimatedStyle');
    // зачем (владелец 05.11 «В ТОЧНОСТИ 1 К 1 как макет»): рамки мотивов апертуры (2 px) и веера (1 px) — часть одобренного макета openings.css; обводок вокруг остальных блоков по-прежнему нет
    expect(src.match(/numberOfLines|adjustsFontSizeToFit|requestAnimationFrame|setInterval/gu) ?? []).toEqual([]);
    expect((src.match(/borderWidth/gu) ?? []).length).toBeLessThanOrEqual(5); // апертура, веер + два кольца-орбиты окна «Ранг» (эталон rev6)
    expect(src).not.toMatch(/haloStyle|styles.halo|halo:/u); // макет: круга за героем НЕТ (.opening-halo{background:none})
    expect(src).toContain("pointerEvents={ready ? 'auto' : 'none'}"); // кнопка оживает внутри CtaBlock на 82 % (без перерисовки картинок)
  });
});

describe('dev-вход для Сверки и память', () => {
  it('phase 1…4 = якоря макета 15 / 43 / 60 / 100 %; без phase или с мусором — живой проигрыш', () => {
    expect([1, 2, 3, 4].map((n) => sectionOpeningFreezeAt(String(n)))).toEqual([0.15, 0.43, 0.6, 1]);
    for (const bad of [undefined, '', '0', '5', 'x', '1.5']) expect(sectionOpeningFreezeAt(bad)).toBeUndefined();
  });
  it('dev_moments_preview: state=openings&section&phase&reduce; ничего не пишет и не трогает хост, хранилище и арбитр', () => {
    const route = read('app/dev_moments_preview.tsx');
    expect(route).toContain("'announcements', 'openings'] as const;");
    expect(route).toContain("{state === 'openings' ? <SectionOpeningStudio key={key} lang={lang} section={params.section} phase={params.phase} reduce={params.reduce} /> : null}");
    expect(route).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;');
    const studio = read('components/section_openings/SectionOpeningStudio.tsx');
    expect(studio).not.toMatch(/section_opening_store|use_section_opening_host|OverlayArbiter|AsyncStorage|noteSectionOpeningShown/u);
    expect(studio).toContain('forceReduced={forceReduced}');
  });
  it('память: окно монтируется только по показу (слот без окна = null), картинки не копятся в кэше, Reduce Motion можно форсировать', () => {
    const slots = read('components/home/home_moment_slots.tsx');
    expect(slots).toContain('if (!sectionOpening.current) { totalRef.current = 0; return null; }'); // слот без окна = null (+ сброс счётчика кадров истории)
    expect(slots).toContain("lazy(() => import('../section_openings/SectionOpeningCeremony')");
    const ceremony = read('components/section_openings/SectionOpeningCeremony.tsx');
    expect(ceremony.match(/cachePolicy="none"/gu)?.length).toBe(3); // герой + его свечение + арт раздела
    expect(ceremony).toContain('useReducedMotion() || forceReduced === true');
  });
  it('мотивы макета: апертура «Видео», пузыри «Диалогов», ступени «Пика», веер «Карточек»', () => {
    const ceremony = read('components/section_openings/SectionOpeningCeremony.tsx');
    for (const marker of ["id === 'video'", "id === 'dialogs'", "id === 'peak'", "id === 'cards'", 'apertureA', 'bubbleTwo', 'step3', 'fan3']) expect(ceremony).toContain(marker);
  });
});

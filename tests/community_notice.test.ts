// зачем (макет плашки «Сообщество» утверждён владельцем 04.11; слово владельца: крестик — НАВСЕГДА, даже на новой неделе):
// сторож выбора текста по ISO-неделе, «закрыл → не возвращается ни на следующей неделе, ни после перезапуска», стираемого ключа и размеров крестика.
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));

import {
  COMMUNITY_NOTICE_COUNT,
  closeCommunityNoticeForever,
  communityNoticeFlagKey,
  communityNoticeIndex,
  isoWeekNumber,
  readCommunityNoticeClosed,
  type CommunityNoticeStore,
} from '../app/community_notice';
import { COMMUNITY_NOTICE_TEXTS } from '../app/community_notice_copy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const memoryStore = (): CommunityNoticeStore & { data: Map<string, boolean> } => {
  const data = new Map<string, boolean>();
  return { data, read: async (owner) => data.get(owner) === true, write: async (owner) => { data.set(owner, true); } };
};

describe('плашка «Сообщество»: выбор текста по неделе', () => {
  it('номер ISO-недели на границах года', () => {
    expect(isoWeekNumber(new Date(2026, 0, 1))).toBe(1); // четверг
    expect(isoWeekNumber(new Date(2025, 11, 29))).toBe(1); // понедельник → неделя 1 следующего года
    expect(isoWeekNumber(new Date(2026, 11, 31))).toBe(53);
    expect(isoWeekNumber(new Date(2026, 10, 4))).toBe(45);
  });
  it('текст = неделя mod 5; за пять подряд недель появляются все пять', () => {
    expect(communityNoticeIndex(new Date(2026, 10, 4))).toBe(0); // неделя 45
    const seen = new Set<number>();
    for (let week = 0; week < 5; week += 1) seen.add(communityNoticeIndex(new Date(2026, 10, 4 + 7 * week)));
    expect(seen.size).toBe(COMMUNITY_NOTICE_COUNT);
  });
  it('пять текстов на девяти языках, ни одна строка не пуста', () => {
    expect(COMMUNITY_NOTICE_TEXTS).toHaveLength(COMMUNITY_NOTICE_COUNT);
    for (const row of COMMUNITY_NOTICE_TEXTS) {
      expect(Object.keys(row).sort()).toEqual(['en', 'es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi']);
      for (const value of Object.values(row)) expect(value.trim().length).toBeGreaterThan(10);
    }
    expect(COMMUNITY_NOTICE_TEXTS[0].ru).toBe('Наборы от пользователей. Если выглядит странно — так и есть.');
    expect(COMMUNITY_NOTICE_TEXTS[4].ru).toBe('Эти наборы мы даже не открывали. Честно.');
  });
});

describe('плашка «Сообщество»: закрыл — навсегда', () => {
  it('до крестика читается «не закрыта», после — «закрыта» и не зависит от недели', async () => {
    const store = memoryStore();
    expect(await readCommunityNoticeClosed('u1', store)).toBe(false);
    expect(await closeCommunityNoticeForever('u1', store)).toBe(true);
    // «перезапуск» и «новая неделя»: флаг без даты, читается тем же ключом
    expect(await readCommunityNoticeClosed('u1', store)).toBe(true);
  });
  it('флаг на владельца: у другого аккаунта плашка остаётся', async () => {
    const store = memoryStore();
    await closeCommunityNoticeForever('u1', store);
    expect(await readCommunityNoticeClosed('u2', store)).toBe(false);
  });
  it('ключ в стираемой семье story_events_v1 и привязан к владельцу', () => {
    expect(communityNoticeFlagKey('abc')).toBe('story_events_v1:community_notice_closed:abc');
  });
  it('ошибка записи не роняет: возвращает false (плашка исчезла мгновенно, причина в журнале)', async () => {
    const failing: CommunityNoticeStore = { read: async () => false, write: async () => { throw new Error('disk'); } };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await closeCommunityNoticeForever('u1', failing)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('ошибка чтения: плашка покажется, причина в журнале', async () => {
    const failing: CommunityNoticeStore = { read: async () => { throw new Error('disk'); }, write: async () => undefined };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await readCommunityNoticeClosed('u1', failing)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('плашка «Сообщество»: компонент и место', () => {
  const component = read('components/packs/CommunityNotice.tsx');
  it('крестик ≥44 px через KitTouchable, текст 15 px, без красной иконки, скрытие мгновенное', () => {
    expect(component).toContain('KitTouchable');
    expect(component).toMatch(/close: \{[^}]*width: 44, height: 44/);
    expect(component).not.toMatch(/close: \{[^}]*position: 'absolute'/); // крестик по центру высоты плашки (вердикт Макетов 04.11), не прижат к верху
    expect(component).toMatch(/text: \{[^}]*fontSize: 15/);
    expect(component).toContain("setPhase('closing');"); // интерфейс реагирует до записи флага
    expect(component).toContain('closeCommunityNoticeForever');
    expect(component).toContain("if (phase !== 'shown') return;"); // защита от двойного тапа
  });
  it('reduce-motion — без анимации ухода; пока флаг читается, плашка не рисуется', () => {
    expect(component).toContain("if (reduceMotion) { setPhase('hidden'); return; }");
    expect(component).toContain("if (phase === 'loading' || phase === 'hidden') return null;");
  });
  it('плашка стоит во вкладке «Наборы» (сцена Сообщества) над списком', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).toContain('{sceneMode ? <View style={{ paddingTop: 10 }}><CommunityNotice lang={lang} /></View> : null}');
    expect(hub.indexOf('<CommunityNotice')).toBeLessThan(hub.indexOf("sceneMode ? { width: '100%', gap: 10, paddingTop: 10 }"));
  });
  it('логика без сети и Firebase', () => {
    const logic = read('app/community_notice.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(logic).not.toMatch(/firebase|firestore|fetch\(/i);
  });
});

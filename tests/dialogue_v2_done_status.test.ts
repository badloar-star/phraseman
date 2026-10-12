// зачем (координатор 12.10, dialogs-003): в хабе «Диалоги» «пройдено ✓» и «N / всего» берутся из ЛОКАЛЬНОЙ записи прохождений (app/dialogue_v2_done_store.ts) — без Firestore.
// Проверяем: проекция даёт 'done', запись мгновенная и переживает перезапуск, отметка до чтения диска не затирает прежние прохождения, выход стирает, чужой аккаунт не читает.
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';

const disk: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in disk ? disk[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { disk[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete disk[k]; }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => { delete disk[k]; }); }),
    getAllKeys: jest.fn(async () => Object.keys(disk)),
  },
}));
let token: { phase: string; generation: number; stableId: string | null } = { phase: 'active', generation: 1, stableId: 'uid-a' };
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => token }));

import { projectAuthorizedDialogueV2Catalogue } from '../app/dialogue_v2_authorized_catalogue_projection';
import {
  clearAllDialogueV2DoneStore, getDialogueV2DoneVersion, hydrateDialogueV2DoneIds, markDialogueV2Done,
  peekDialogueV2DoneIds, resetDialogueV2DoneStoreForTests, subscribeDialogueV2Done,
} from '../app/dialogue_v2_done_store';

const WORLD_HEADINGS = [
  { id: 'social', title: 'Общение' }, { id: 'work', title: 'Работа' }, { id: 'travel', title: 'Поездки' }, { id: 'everyday', title: 'Каждый день' },
] as const;

function packets() {
  return DIALOGUE_V2_CATALOGUE_INDEX.map((entry) => ({
    studyTarget: 'de',
    scenario: {
      id: entry.id, worldId: entry.worldId, rankRequired: entry.rankRequired, cefr: entry.cefr,
      personas: [{ id: 'host', replyStyle: 'warm', voiceMode: 'text_only', displayName: 'Taylor', styleNote: 'Keeps the conversation moving with care.', mood: 'open', correctionStyle: 'gentle' }],
      objectives: Array.from({ length: 6 }, (_, index) => ({ id: `goal_${index + 1}`, label: `Complete conversation objective ${index + 1}.` })),
      groupReplyPolicy: { maxDirectReplies: 1, maxUsefulFollowUps: 0, silenceAllowed: true },
    },
    content: { title: `Released ${entry.id}`, briefing: 'Continue the chat naturally until the shared goal is complete.', completionTone: 'warm and specific' },
  }));
}

const flush = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

describe('dialogs hub: «пройдено» из локальной записи', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const k of Object.keys(disk)) delete disk[k];
    token = { phase: 'active', generation: 1, stableId: 'uid-a' };
    resetDialogueV2DoneStoreForTests();
  });
  afterEach(() => jest.restoreAllMocks());

  it('проекция: пройденный сценарий получает done, остальные — по рангу; без набора done нет', () => {
    const base = { packets: packets(), studyTarget: 'de', localCoinRank: 3, worldHeadings: WORLD_HEADINGS };
    const without = projectAuthorizedDialogueV2Catalogue(base);
    expect(without?.items.filter((item) => item.status === 'done')).toHaveLength(0);
    const withDone = projectAuthorizedDialogueV2Catalogue({ ...base, doneScenarioIds: new Set(['social_01', 'work_04']) });
    expect(withDone?.items.find((item) => item.id === 'social_01')?.status).toBe('done');
    expect(withDone?.items.find((item) => item.id === 'work_04')?.status).toBe('done'); // был закрыт по рангу в этой проверке, но раз пройден — done
    expect(withDone?.items.find((item) => item.id === 'social_02')?.status).toBe('available');
    expect(withDone?.items.filter((item) => item.status === 'done')).toHaveLength(2);
  });

  it('отметка мгновенная: память и версия меняются в тот же вызов, подписчик разбужен, диск догоняет фоном', async () => {
    const seen: number[] = [];
    const unsubscribe = subscribeDialogueV2Done(() => seen.push(getDialogueV2DoneVersion()));
    expect(markDialogueV2Done('de', 'social_01')).toBe(true);
    expect(peekDialogueV2DoneIds('de').has('social_01')).toBe(true); // до записи на диск
    expect(seen).toEqual([1]);
    expect(markDialogueV2Done('de', 'social_01')).toBe(true); // повтор безвреден
    expect(seen).toEqual([1]);
    await flush();
    const keys = Object.keys(disk);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain('dialogue_v2_done_v1:generation:1:uid:uid-a:de');
    expect(JSON.parse(disk[keys[0]!]!)).toEqual(['social_01']);
    unsubscribe();
  });

  it('после перезапуска запись читается с диска; отметка ДО чтения диска не затирает прежние прохождения', async () => {
    markDialogueV2Done('de', 'social_01');
    await flush();
    resetDialogueV2DoneStoreForTests(); // «перезапуск»: память пуста, диск остался
    expect(peekDialogueV2DoneIds('de').size).toBe(0);
    markDialogueV2Done('de', 'work_01'); // новое прохождение раньше, чем хаб прочитал диск
    await flush();
    const key = Object.keys(disk)[0]!;
    expect(JSON.parse(disk[key]!).sort()).toEqual(['social_01', 'work_01']);
    const ids = await hydrateDialogueV2DoneIds('de');
    expect([...ids].sort()).toEqual(['social_01', 'work_01']);
  });

  it('языки и аккаунты разделены; переходное состояние аккаунта отметку не принимает', async () => {
    markDialogueV2Done('de', 'social_01');
    expect(peekDialogueV2DoneIds('en').size).toBe(0);
    token = { phase: 'active', generation: 2, stableId: 'uid-b' };
    expect(peekDialogueV2DoneIds('de').size).toBe(0);
    token = { phase: 'switching', generation: 3, stableId: null };
    expect(markDialogueV2Done('de', 'social_02')).toBe(false);
    expect(peekDialogueV2DoneIds('de').size).toBe(0);
    expect(markDialogueV2Done('de', 'Not Valid')).toBe(false);
    await flush();
  });

  it('выход/смена аккаунта стирает записи всех аккаунтов', async () => {
    markDialogueV2Done('de', 'social_01');
    await flush();
    expect(Object.keys(disk)).toHaveLength(1);
    await clearAllDialogueV2DoneStore();
    expect(Object.keys(disk)).toHaveLength(0);
    expect(peekDialogueV2DoneIds('de').size).toBe(0);
  });

  it('проводка: итог диалога отмечает пройденным только при endedBy=bot с репликой ученика, чистка при выходе вызывается, Firestore не используется', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    const session = read('app/dialogue_v2_session.tsx');
    expect(session).toMatch(/endedBy === 'bot' && learnerTurns > 0 && supportedTarget\(studyTarget\)\) \{\s*markDialogueV2Done\(studyTarget, scenarioId\)/);
    expect(read('app/dialogue_v2_memory_disk_cache.ts')).toMatch(/await clearAllDialogueV2DoneStore\(\)/);
    expect(read('components/dialogs/DialogueV2CatalogueContainer.tsx')).toMatch(/doneScenarioIds: peekDialogueV2DoneIds\(studyTarget\)/);
    expect(read('app/dialogue_v2_done_store.ts')).not.toMatch(/firebase|firestore|httpsCallable|fetch\(/);
  });
});

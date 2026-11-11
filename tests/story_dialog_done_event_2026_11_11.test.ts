// story_dialog_done_event_2026_11_11.test.ts — событие истории «диалог пройден».
// зачем (владелец 11.11: «заводи события недели и диалога»): шаблон кадра был, а события никто не создавал. Сторож держит ключ повтора,
// формат реплик (его читает кадр), ограничения на длину и то, что запись стоит рядом с отметкой «пройден» и ничего не задерживает.
import fs from 'node:fs';
import path from 'node:path';
import { addStoryEvent, storyEventKey } from '../modules/story_events/story_events_core';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const payload = { scenarioId: 'social_02', title: 'В кафе', dayKey: '2026-11-11', goalsDone: 6, goalsTotal: 6, turns: 14, minutes: 4, noHints: false, doneCount: 2, bubbles: 'them:Hola|me:Buenas' };

describe('dialog_done — ключ и запись в журнал историй', () => {
  it('ключ: сценарий и день; без сценария или дня событие негодно', () => {
    expect(storyEventKey('dialog_done', payload)).toBe('dialog_done:social_02:2026-11-11');
    expect(storyEventKey('dialog_done', { ...payload, scenarioId: '' })).toBe('');
    expect(storyEventKey('dialog_done', { ...payload, dayKey: '' })).toBe('');
  });

  it('событие пишется; тот же сценарий в тот же день второй истории не даёт, в другой день — даёт', () => {
    const first = addStoryEvent([], { type: 'dialog_done', payload, atMs: NOW }, NOW);
    expect(first.added).toBe(true);
    const again = addStoryEvent(first.list, { type: 'dialog_done', payload, atMs: NOW + 60_000 }, NOW + 60_000);
    expect(again).toMatchObject({ added: false, reason: 'duplicate' });
    const nextDay = addStoryEvent(first.list, { type: 'dialog_done', payload: { ...payload, dayKey: '2026-11-12' }, atMs: NOW + 86_400_000 }, NOW + 86_400_000);
    expect(nextDay.added).toBe(true);
  });
});

describe('dialog_done — переходник «факт → история»', () => {
  const sources = read('modules/story_events/story_event_sources.ts');
  const helper = sources.slice(sources.indexOf('export function dialogStoryBubbles('), sources.indexOf('export function recordCoinRankStory('));

  it('реплики: не больше трёх, не длиннее 80 знаков, разделитель в тексте заменяется пробелом', () => {
    expect(sources).toContain('export const DIALOG_STORY_BUBBLES_MAX = 3;');
    expect(sources).toContain('export const DIALOG_STORY_BUBBLE_CHARS = 80;');
    expect(helper).toContain(".replace(/[|\\r\\n]+/g, ' ')");
    expect(helper).toContain('.slice(0, DIALOG_STORY_BUBBLES_MAX)');
    expect(helper).toContain("`${b.me ? 'me' : 'them'}:");
  });

  it('без сценария, названия или дня событие не пишется — и причина уходит в журнал', () => {
    expect(helper).toContain('if (!fact.scenarioId || !fact.title.trim() || !fact.dayKey) {');
    expect(helper).toContain("DebugLogger.info('[STORY-EVENTS]', `dialog_done: не пишем");
    // тексты реплик и название в журнал не попадают — только длина названия
    expect(helper).not.toMatch(/DebugLogger\.info\([^)]*fact\.title(?!\.trim\(\)\.length)/u);
    expect(helper).not.toMatch(/DebugLogger\.info\([^)]*bubbles/u);
  });

  it('«без подсказок» не утверждается, пока у сессии нет такого признака', () => {
    expect(helper).toContain('noHints: false,');
  });
});

describe('dialog_done — место записи', () => {
  const session = read('app/dialogue_v2_session.tsx');

  it('запись стоит сразу после отметки «пройден» и идёт фоном', () => {
    const mark = session.indexOf('markDialogueV2Done(studyTarget, scenarioId);');
    const record = session.indexOf('void recordDialogDoneStory({');
    const dayMark = session.indexOf('markDialogueV2DoneToday();');
    expect(mark).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(mark);
    expect(dayMark).toBeGreaterThan(record);
    expect(session).not.toMatch(/await recordDialogDoneStory/u);
  });

  it('номер пройденного диалога берётся после отметки, реплики — последние три без «не на том языке»', () => {
    expect(session).toContain('doneCount: peekDialogueV2DoneIds(studyTarget).size,');
    expect(session).toContain(".slice(-3).map((message) => ({ me: message.author === 'learner', text: message.text })),");
  });
});

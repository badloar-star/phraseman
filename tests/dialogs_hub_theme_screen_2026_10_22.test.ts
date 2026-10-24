// Хаб Диалогов v4 (владелец 22.10, «Да, переносить», макет dialogs-hub-v4.html): модель плиток тем и экран темы.
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGS_HUB_ALL, dialogsHubItemsOf, dialogsHubProgress, dialogsHubTotals, dialogsHubWorldCounts } from '../components/dialogs/hub/dialogs_hub_model';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const worlds = [{ id: 'social', title: 'Общение' }, { id: 'work', title: 'Дела' }, { id: 'travel', title: 'Поездки' }, { id: 'ghost', title: 'Пусто' }] as const;
const item = (id: string, worldId: string, status: 'available' | 'done' | 'locked', rank = 1) => ({ id, worldId, title: id, cefr: 'A1', rankRequired: rank, status });
const items = [
  item('social_01', 'social', 'done', 0), item('social_02', 'social', 'available'), item('work_01', 'work', 'done'),
  item('work_02', 'work', 'done'), item('work_03', 'work', 'locked', 3), item('travel_01', 'travel', 'locked', 2),
];

describe('Модель хаба: счётчики и выбор темы', () => {
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «Да, переносить» (хаб Диалогов v4) — счётчики «k из n» по темам, пустая тема не рисуется
  it('счётчики «k из n» по темам; тема без диалогов не рисуется', () => {
    expect(dialogsHubWorldCounts(worlds, items)).toEqual([
      { id: 'social', title: 'Общение', done: 1, total: 2 },
      { id: 'work', title: 'Дела', done: 2, total: 3 },
      { id: 'travel', title: 'Поездки', done: 0, total: 1 },
    ]);
  });
  it('итого «Все диалоги»: пройдено из всех', () => {
    expect(dialogsHubTotals(items)).toEqual({ done: 3, total: 6 });
  });
  it('строки темы: all — всё, мир — свои, неизвестный мир — пусто (не молчаливая подмена «всем»)', () => {
    expect(dialogsHubItemsOf(items, DIALOGS_HUB_ALL)).toHaveLength(6);
    expect(dialogsHubItemsOf(items, 'work').map((i) => i.id)).toEqual(['work_01', 'work_02', 'work_03']);
    expect(dialogsHubItemsOf(items, 'nope')).toEqual([]);
  });
  it('дорожка: доля пройденных 0…1, без деления на ноль', () => {
    expect(dialogsHubProgress(1, 4)).toBe(0.25);
    expect(dialogsHubProgress(0, 0)).toBe(0);
    expect(dialogsHubProgress(9, 4)).toBe(1);
  });
});

describe('Экран темы: отдельный экран, компактные строки, ранг дословно, без сети', () => {
  const screen = read('components/dialogs/hub/DialogueV2ThemeScreen.tsx');
  const hook = read('components/dialogs/hub/use_dialogue_v2_hub_catalogue.ts');
  const route = read('app/dialogue_v2_theme.tsx');

  it('маршрут /dialogue_v2_theme отдаёт экран темы', () => {
    expect(route).toContain("import DialogueV2ThemeScreen from '../components/dialogs/hub/DialogueV2ThemeScreen';");
    expect(route).toContain('export default DialogueV2ThemeScreen;');
  });
  it('закрытая строка: замок, серое название, монета ранга и «Откроется на ранге N» (число из таблицы приложения)', () => {
    expect(screen).toContain("name={locked ? 'lock-closed'");
    expect(screen).toContain('coinRankRowForDisplay(item.rankRequired).source');
    expect(screen).toContain('glueRankNumber(lockedLabel, item.rankRequired)');
    expect(screen).toContain('cat.lockedAtRank(item.rankRequired)');
  });
  it('любая строка нажимается и ведёт на брифинг; прогрев сессии — только у доступной', () => {
    expect(screen).toContain("pathname: '/dialogue_v2_briefing'");
    expect(screen).toContain("const prestart = item.status === 'available' && supported;");
  });
  it('первый кадр из локального: сети и Firestore нет; список — FlatList', () => {
    // комментарии не в счёт: в шапках файлов слово «Firestore» стоит как «чтений нет»
    const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const src of [screen, hook]) expect(code(src)).not.toMatch(/fetchReleasedDialogueV2Catalogue|httpsCallable|getDoc|firestore/i);
    expect(hook).toContain('peekDialogueV2Catalogue(target)');
    expect(hook).toContain('getEmbeddedDialogueV2Catalogue(target)');
    expect(screen).toContain('<FlatList');
  });
  it('цвета — токены dialogs_hub_tokens; без обводок, без hex, без ужатия шрифта', () => {
    expect(screen).toContain('dialogsHubTokens(g)');
    expect(screen).not.toMatch(/#[0-9A-Fa-f]{3,8}|borderWidth|borderColor|adjustsFontSizeToFit/);
  });
  it('хук темы повторяет проекцию контейнера хаба (та же функция, тот же источник статусов)', () => {
    const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    for (const needle of ['projectAuthorizedDialogueV2Catalogue(', 'peekDialogueV2DoneIds(', 'dialogueV2UiCopy(lang, item.id)']) {
      expect(container).toContain(needle);
      expect(hook).toContain(needle);
    }
  });
});

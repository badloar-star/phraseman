/**
 * «Собери диалог»: урок без диалога не открывается пустой игрой «0 / 0» с активной «Готово» (обход экранов 12.11, 🔴).
 * Сработал — чинить экран или правило входа, а не ослаблять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';

import { GAME_BANKS } from '../modules/games/bank';
import type { OrderTask } from '../modules/games/dialogue_core';
import { firstOrderLesson, orderEntry } from '../modules/games/order_entry';

const dialog = (id: string): OrderTask => ({ id, lines: ['a', 'b', 'c', 'd'] });

describe('вход в «Собери диалог»', () => {
  it('диалоги урока есть — берётся диалог дня, стабильный внутри дня', () => {
    const tasks = [dialog('x1'), dialog('x2')];
    const bank = { 4: tasks };
    expect(orderEntry(tasks, bank, 10).task?.id).toBe(orderEntry(tasks, bank, 10).task?.id);
    expect(orderEntry(tasks, bank, 10).firstLesson).toBe(4);
    expect(new Set([orderEntry(tasks, bank, 10).task?.id, orderEntry(tasks, bank, 11).task?.id])).toEqual(new Set(['x1', 'x2']));
  });

  it('диалогов урока нет — задания нет, но известен урок, с которого они появятся', () => {
    expect(orderEntry([], { 4: [dialog('x1')], 6: [dialog('x2')] }, 3)).toEqual({ task: null, firstLesson: 4 });
    expect(orderEntry([], { 2: [], 5: [dialog('x1')] }, 3).firstLesson).toBe(5);
    expect(orderEntry([], undefined, 3)).toEqual({ task: null, firstLesson: null });
    expect(firstOrderLesson({})).toBeNull();
  });

  it('у каждого языка из реестра есть урок с диалогами — пустое состояние называет настоящий номер', () => {
    const first = Object.fromEntries(Object.entries(GAME_BANKS).map(([lang, bank]) => [lang, firstOrderLesson(bank.order)]));
    // зачем: немецкий урок 1 из обхода экранов — диалоги с урока 4 (решение владельца 11.11)
    expect(first.de).toBe(4);
    for (const [lang, lesson] of Object.entries(first)) expect([lang, typeof lesson === 'number' && lesson >= 1]).toEqual([lang, true]);
  });
});

describe('экран «Собери диалог» без диалога', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'game_order.tsx'), 'utf8');

  it('нет диалога — не «Готово» и не «0 / 0», а строка с номером урока и «Закрыть»', () => {
    expect(src).toContain('const empty = !task;');
    // «Готово» показывается только после собранного диалога, а не при его отсутствии
    expect(src).toContain('const finished = total > 0 && game.placed >= total;');
    expect(src).not.toContain('const finished = !task ||');
    expect(src).toMatch(/\{empty \? \(\s*<V2Button testID="game-order-close-empty" label=\{triLang\(lang, COPY\.close\)\}/);
    expect(src).toMatch(/\{empty \? <View style=\{s\.pillSpacer\} \/> : \(/);
    expect(src).toContain('testID="game-order-none"');
    expect(src).toContain('entry.firstLesson ?');
  });

  it('пустой вход пишет причину в журнал и не засчитывает игру сыгранной', () => {
    expect(src).toContain('[GAME-ORDER] entry:none');
    expect(src).toContain('if (!finished || !task) return;');
  });
});

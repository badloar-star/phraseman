/**
 * Контракт вкладки «Турниры» в живой админке (admin/v2/legacy.html).
 *
 * зачем: админка — один HTML на 2 МБ, её нельзя открыть локально (грузит
 * конфиг Firebase с боевого хостинга), поэтому визуальной проверки нет.
 * Здесь мы вырезаем блок вкладки, исполняем его на заглушках и убеждаемся,
 * что: функции регистрируются, нужные callable вызываются, задания
 * отрисовываются, и — главное — ничего не публикуется без явного действия.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ADMIN = path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html');
const html = readFileSync(ADMIN, 'utf8');

function tournamentBlock(): string {
  const marker = html.indexOf('  // ТУРНИРЫ — генерация заданий');
  const start = html.lastIndexOf('  // ═══', marker);
  const end = html.indexOf('  // init: onAuthStateChanged + startAdminApp');
  expect(marker).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

type Call = { name?: string; payload?: Record<string, unknown>; toast?: string };

function runTab() {
  const calls: Call[] = [];
  const elements: Record<string, Record<string, unknown>> = {};
  const checkboxes: Array<{ value: string; checked: boolean; getAttribute: (k: string) => string }> = [];

  const sandbox: Record<string, unknown> = {
    httpsCallable: (_fns: unknown, name: string) => async (payload: Record<string, unknown>) => {
      calls.push({ name, payload });
      if (name === 'adminListTournamentTasks') {
        return { data: { items: [{
          taskId: 't1', mode: 'guess_phrase', difficulty: 1, verified: false, valid: true,
          payload: { phrase: 'I am here', options: ['Я здесь', 'Как дела', 'Спасибо', 'Пока'], correctIndex: 0 },
        }], nextCursor: '' } };
      }
      if (name === 'adminTournamentPoolStats') {
        return { data: { published: 120, drafts: 40, poolReady: true, rounds: [
          { round: 1, available: 120, ready: true }, { round: 2, available: 120, ready: true },
          { round: 3, available: 80, ready: true }, { round: 4, available: 90, ready: true },
        ] } };
      }
      if (name === 'adminGetTournamentSchedule') {
        return { data: { slots: [{ slotId: 'noon', hour: 12, minute: 0, enabled: false }] } };
      }
      if (name === 'adminGenerateTournamentTasks') {
        return { data: { stats: { produced: 10, phrasesSeen: 5 }, written: 10, keptPublished: 3, samples: [] } };
      }
      return { data: { affected: 1, rejected: [] } };
    },
    functionsUs: {},
    showToast: (message: string) => { calls.push({ toast: message }); },
    escapeHtml: (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    confirm: () => true,
  };

  sandbox.document = {
    getElementById: (id: string) => (elements[id] ||= {
      id, innerHTML: '', textContent: '',
      value: id === 'tn-status' ? 'draft' : '0',
    }),
    querySelectorAll: (selector: string) => (selector.includes('tn-pick') || selector.includes('tn-slot') ? checkboxes : []),
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(tournamentBlock(), context);

  return { sandbox, calls, elements, checkboxes };
}

describe('вкладка «Турниры» в админке', () => {
  it('зарегистрирована в навигации, разметке и списке вкладок', () => {
    expect(html).toContain("switchTab('tournaments')");
    expect(html).toContain('id="tab-tournaments"');
    // Без записи в ADMIN_TAB_KEYS вкладка не откроется вообще.
    expect(html).toContain("'clubs','tournaments'");
    // Автозагрузка при открытии, чтобы владелец сразу видел состояние.
    expect(html).toContain("tab === 'tournaments'");
  });

  it('все функции вкладки объявлены и доступны из разметки', () => {
    const { sandbox } = runTab();
    for (const name of ['tnGenerate', 'tnLoadTasks', 'tnPublishVisible', 'tnLoadStats', 'tnLoadSchedule', 'tnSaveSchedule', 'tnOpenTab']) {
      expect(typeof sandbox[name]).toBe('function');
      expect(html).toContain(`${name}(`);
    }
  });

  it('открытие вкладки тянет ровно три запроса — статистику, список, расписание', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnOpenTab as () => Promise<void>)();

    const names = calls.filter((call) => call.name).map((call) => call.name);
    expect(names).toContain('adminTournamentPoolStats');
    expect(names).toContain('adminListTournamentTasks');
    expect(names).toContain('adminGetTournamentSchedule');
    // Лишних обращений быть не должно — это деньги на чтениях.
    expect(names).toHaveLength(3);
  });

  it('список запрашивается страницами, а не целиком', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnLoadTasks as (reset: boolean) => Promise<void>)(true);

    const list = calls.find((call) => call.name === 'adminListTournamentTasks');
    expect(list?.payload?.limit).toBe(25);
  });

  it('задание показывается с правильным ответом — это экран проверки', async () => {
    const { sandbox, elements } = runTab();
    await (sandbox.tnLoadTasks as (reset: boolean) => Promise<void>)(true);

    const rendered = String(elements['tn-list']?.innerHTML ?? '');
    expect(rendered).toContain('I am here');
    expect(rendered).toContain('Я здесь');
    expect(rendered).toContain('Угадай перевод');
    expect(rendered).toContain('На проверке');
  });

  it('предпросмотр генерации ничего не сохраняет', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnGenerate as (dryRun: boolean) => Promise<void>)(true);

    const generate = calls.find((call) => call.name === 'adminGenerateTournamentTasks');
    expect(generate?.payload?.dryRun).toBe(true);
    // Предпросмотр не должен дёргать список и статистику — записи не было.
    expect(calls.filter((call) => call.name === 'adminListTournamentTasks')).toHaveLength(0);
  });

  it('без отмеченных заданий публикация не уходит на сервер', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnPublishVisible as () => Promise<void>)();

    expect(calls.some((call) => call.name === 'adminMutateTournamentTasks')).toBe(false);
    expect(calls.some((call) => String(call.toast ?? '').includes('Нечего публиковать'))).toBe(true);
  });

  it('публикация уходит только по явному действию и только с отмеченными', async () => {
    const { sandbox, calls, checkboxes } = runTab();
    checkboxes.push({ value: 't1', checked: true, getAttribute: () => '' });

    await (sandbox.tnPublishVisible as () => Promise<void>)();

    const mutate = calls.find((call) => call.name === 'adminMutateTournamentTasks');
    expect(mutate?.payload?.action).toBe('publish');
    expect(mutate?.payload?.taskIds).toEqual(['t1']);
  });

  it('статистика показывает готовность каждого раунда', async () => {
    const { sandbox, elements } = runTab();
    await (sandbox.tnLoadStats as () => Promise<void>)();

    const rendered = String(elements['tn-stats']?.innerHTML ?? '');
    expect(rendered).toContain('Раунд 1');
    expect(rendered).toContain('Раунд 4');
    expect(rendered).toContain('Можно запускать');
  });

  it('понятно объясняет отказ включить слоты при малом пуле', () => {
    // Серверный код ошибки не должен показываться владельцу как есть.
    expect(html).toContain('tournament_pool_too_small');
    expect(html).toContain('Опубликуй хотя бы 50');
  });

  it('разметка вкладки следует правилам владельца', () => {
    const start = html.indexOf('<div id="tab-tournaments"');
    const end = html.indexOf('<!-- REFERRALS TAB -->');
    const section = html.slice(start, end);

    // Баланс тегов: незакрытый div развалил бы всю страницу админки.
    expect((section.match(/<div/g) ?? []).length).toBe((section.match(/<\/div>/g) ?? []).length);
    // Контейнеры разделяются тоном, а не обводками (правило владельца).
    expect(section).not.toMatch(/border:1px solid[^"]*"\s*>\s*<div style="font-size:15px;font-weight:800/);
  });
});

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
          lifecycle: 'awaiting_approval', aiVerdict: 'approved',
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
        return { data: { slots: [{ slotId: 'daily_1200', localTime: '12:00', timezone: 'Europe/Moscow', ticketsRequired: 1, enabled: false }] } };
      }
      if (name === 'adminGenerateTournamentTasks') {
        return { data: { stats: { produced: 10, phrasesSeen: 5 }, written: 10, keptPublished: 3, samples: [] } };
      }
      if (name === 'adminGenerateTournamentAi') {
        return { data: {
          planned: 24, produced: 24, written: 24,
          byMode: { guess_phrase: 4, fill_gap: 4, find_oddity: 8, translate_build: 8 },
          rejected: [], samples: [],
        } };
      }
      if (name === 'adminGenerateTournamentAi') {
        return { data: { accepted: 10, written: 10, rejectedBatches: [], requests: 1, samples: [] } };
      }
      if (name === 'adminGetTournamentCurated') {
        return { data: { exists: false, rounds: [] } };
      }
      return { data: { affected: 1, rejected: [] } };
    },
    functionsUs: {},
    showToast: (message: string) => { calls.push({ toast: message }); },
    escapeHtml: (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    confirm: () => true,
    open: (url: string) => { calls.push({ name: 'window.open', payload: { url } }); },
  };

  sandbox.document = {
    getElementById: (id: string) => (elements[id] ||= {
      id, innerHTML: '', textContent: '',
      value: id === 'tn-status' ? 'draft' : (id === 'tn-source' || id === 'tn-ai-topic' || id === 'tn-cur-date' ? '' : '0'),
      querySelector: () => null,
    }),
    querySelectorAll: (selector: string) => (selector.includes('tn-pick') || selector.includes('tn-slot') ? checkboxes : []),
    querySelector: () => null,
  };
  sandbox.window = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(tournamentBlock(), context);

  return { sandbox, calls, elements, checkboxes };
}

describe('вкладка «Турниры» в админке', () => {
  it('показывает двухступенчатый вход в пул и не предлагает retired audio modes', () => {
    const start = html.indexOf('<div id="tab-tournaments"');
    const end = html.indexOf('<!-- REFERRALS TAB -->', start);
    const section = html.slice(start, end);
    const liveTournament = `${section}\n${tournamentBlock()}`;

    expect(liveTournament).toContain('Автопроверка');
    expect(liveTournament).toContain('решение человека');
    expect(liveTournament).toContain('Одобрить и добавить в игру');
    for (const retiredLabel of ['Выбор на слух', 'Звуковой контраст', 'Сборка на слух']) {
      expect(liveTournament).not.toContain(retiredLabel);
    }
    expect(liveTournament).not.toContain('и на слух');
    expect(liveTournament).not.toContain('Озвучка записывается при публикации');
    expect(liveTournament).not.toContain('Озвучка появится при публикации');
  });

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
    for (const name of ['tnAiTournament', 'tnLoadTasks', 'tnPublishVisible', 'tnLoadStats', 'tnLoadSchedule', 'tnSaveSchedule', 'tnOpenTab']) {
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
    expect(rendered).toContain('Живая ситуация');
    expect(rendered).toContain('На проверке');
  });

  it('предпросмотр ИИ-генерации ничего не сохраняет', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnAiTournament as (dryRun: boolean) => Promise<void>)(true);

    const generate = calls.find((call) => call.name === 'adminGenerateTournamentAi');
    expect(generate?.payload?.dryRun).toBe(true);
    // Предпросмотр не должен дёргать список и статистику — записи не было.
    expect(calls.filter((call) => call.name === 'adminListTournamentTasks')).toHaveLength(0);
  });

  it('генератор из планов удалён: только ИИ создаёт турнирные задания', () => {
    // Решение владельца 2026-07-26: фразы уроков негодны для соревнования —
    // дистракторы не конкурировали, ответ угадывался без знания языка.
    expect(html).not.toContain('tnGenerate(');
    expect(html).not.toContain('adminGenerateTournamentTasks\'');
    expect(html).toContain('tnAiTournament(');
  });

  it('без отмеченных заданий публикация не уходит на сервер', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnPublishVisible as () => Promise<void>)();

    expect(calls.some((call) => call.name === 'adminMutateTournamentTasks')).toBe(false);
    expect(calls.some((call) => String(call.toast ?? '').includes('Нечего публиковать'))).toBe(true);
  });

  it('публикация уходит только по явному действию и только с отмеченными', async () => {
    const { sandbox, calls, checkboxes } = runTab();
    await (sandbox.tnLoadTasks as (reset: boolean) => Promise<void>)(true);
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

  it('switchTab переживает вкладки без onclick — иначе падает вся админка', () => {
    // Регрессия: среди .tab есть ссылки-кнопки без onclick (например «V2 →» —
    // обычный <a href>). Код брал getAttribute('onclick').match(...) напрямую,
    // получал null и ронял switchTab — переставали открываться ВСЕ разделы,
    // не только «Турниры».
    // Ни одно обращение к onclick не должно вызывать .match() напрямую:
    // у ссылок-вкладок (<a href>) атрибута нет, там null.
    expect(html).not.toMatch(/getAttribute\(['"]onclick['"]\)\.match/);

    // Конкретно в switchTab — защита обязана быть на месте.
    const switchTabStart = html.indexOf('window.switchTab = function');
    expect(switchTabStart).toBeGreaterThan(0);
    const switchTabBody = html.slice(switchTabStart, switchTabStart + 1500);
    expect(switchTabBody).toContain("(t.getAttribute('onclick') || '')");
  });

  it('раздел отнесён к соревновательной группе, а не к диагностике', () => {
    const start = html.indexOf('const ADMIN_TAB_GROUPS');
    const groups = html.slice(start, start + 2600);
    expect(groups).toMatch(/tournaments:\s*'arena'/);
  });

  it('расписание шлёт слоты в формате сервера, а не hour/minute', () => {
    // Регрессия: писали hour+minute, сервер такие слоты молча отбрасывал —
    // в UI было «undefined:undefined», а расписание не запускало турниры.
    const start = html.indexOf('window.tnSaveSchedule');
    expect(start).toBeGreaterThan(0);
    const scheduleBlock = html.slice(start, start + 2000);

    expect(scheduleBlock).toContain('localTime');
    expect(scheduleBlock).toContain("timezone: 'Europe/Moscow'");
    expect(scheduleBlock).toContain('ticketsRequired');
    // Старый формат не должен вернуться ни в отправке, ни в отрисовке.
    expect(scheduleBlock).not.toMatch(/hour:\s*Number/);
    expect(scheduleBlock).not.toMatch(/minute:\s*Number/);
    expect(html).not.toContain('data-hour=');
  });

  it('ИИ-генератор: функции объявлены, разметка на месте', () => {
    const { sandbox } = runTab();
    for (const name of ['tnAiTournament', 'tnEditStart', 'tnEditSave', 'tnDeleteTask',
      'tnCuratedLoad', 'tnCuratedAdd', 'tnCuratedSave', 'tnCuratedClear']) {
      expect(typeof sandbox[name]).toBe('function');
      expect(html).toContain(`${name}(`);
    }
    for (const id of ['tn-fill-level', 'tn-cur-slot', 'tn-cur-date', 'tn-cur-round']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('новые типы вопросов рисуются, а не выходят пустой карточкой', () => {
    // Регрессия 2026-07-26: рендер знал только три старых режима, поэтому
    // fill_gap и find_oddity показывались голым заголовком без вопроса.
    const { sandbox } = runTab();
    const render = sandbox.tnRenderTask as (task: unknown) => string;

    const gap = render({
      taskId: 'g1', mode: 'fill_gap', difficulty: 3, verified: false, valid: true,
      payload: { phrase: 'I am looking ___ my keys', options: ['for', 'at', 'after', 'to'], correctIndex: 0 },
    });
    expect(gap).toContain('Пропущенное слово');
    expect(gap).toContain('I am looking ___ my keys');
    expect(gap).toContain('for');

    const oddity = render({
      taskId: 'o1', mode: 'find_oddity', difficulty: 2, verified: false, valid: true,
      payload: { phrase: 'Какая фраза звучит неправильно?', options: ['I feel good', 'I feel myself good', 'I am fine', 'I feel tired'], correctIndex: 1 },
    });
    expect(oddity).toContain('Так не говорят');
    expect(oddity).toContain('I feel myself good');
    // У «так не говорят» верный ответ — ОШИБОЧНАЯ фраза, помечается иначе.
    expect(oddity).toContain('✗');
  });

  it('папки по типам: переключение шлёт фильтр режима на сервер', async () => {
    // Владелец просил раздел, где вопросы сгруппированы по типам, чтобы зайти
    // и решить что заменить/удалить. Папка = режим пула.
    const { sandbox, calls } = runTab();
    await (sandbox.tnOpenFolder as (mode: string) => void)('fill_gap');
    const opened = calls.find((call) => call.name === 'window.open');
    expect(opened?.payload?.url).toBe('tournament_pool.html?mode=fill_gap');
  });

  it('папка «Все» фильтр не шлёт', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnOpenFolder as (mode: string) => void)('');
    const opened = calls.find((call) => call.name === 'window.open');
    expect(opened?.payload?.url).toBe('tournament_pool.html');
  });

  it('перегенерация одного вопроса и массовые действия объявлены', () => {
    const { sandbox } = runTab();
    for (const name of ['tnOpenFolder', 'tnFolderBulk', 'tnRegenTask']) {
      expect(typeof sandbox[name]).toBe('function');
    }
    // Кнопка замены есть на карточке задания.
    expect(html).toContain('tnRegenTask(');
  });

  it('генерация собирает ЦЕЛЫЙ турнир одним вызовом', async () => {
    // Требование владельца: «1 фулл готовый турнир, все раунды», а не пачка
    // однотипных вопросов. Кнопка зовёт adminGenerateTournamentAi.
    const { sandbox, calls } = runTab();
    await (sandbox.tnAiTournament as (dryRun: boolean) => Promise<void>)(true);

    const call = calls.find((c) => c.name === 'adminGenerateTournamentAi');
    expect(call).toBeDefined();
    expect(call?.payload?.dryRun).toBe(true);
    // Количество вопросов больше не задаётся руками — его определяет турнир.
    expect(call?.payload).not.toHaveProperty('batches');
  });

  it('ИИ-предпросмотр ничего не сохраняет и не перезагружает список', async () => {
    const { sandbox, calls, elements } = runTab();
    elements['tn-ai-level'] = { id: 'tn-ai-level', value: 'B1', innerHTML: '', textContent: '', querySelector: () => null };
    await (sandbox.tnAiTournament as (dryRun: boolean) => Promise<void>)(true);

    const generate = calls.find((call) => call.name === 'adminGenerateTournamentAi');
    expect(generate?.payload?.dryRun).toBe(true);
    expect(generate?.payload?.level).toBe('B1');
    expect(calls.filter((call) => call.name === 'adminListTournamentTasks')).toHaveLength(0);
  });

  it('ИИ-генерация без dryRun кладёт черновики и обновляет список со статистикой', async () => {
    const { sandbox, calls, elements } = runTab();
    elements['tn-ai-level'] = { id: 'tn-ai-level', value: 'A2', innerHTML: '', textContent: '', querySelector: () => null };
    await (sandbox.tnAiTournament as (dryRun: boolean) => Promise<void>)(false);

    const names = calls.filter((call) => call.name).map((call) => call.name);
    expect(names).toContain('adminGenerateTournamentAi');
    expect(names).toContain('adminListTournamentTasks');
    expect(names).toContain('adminTournamentPoolStats');
  });

  it('фильтр пулов убран — источник на сервер не уходит', () => {
    // 2026-07-26: турниры играют только на вопросах ИИ, выбирать не из чего.
    // Раньше выбор «Пул ИИ» падал с tournament_list_invalid.
    expect(html).not.toContain('id="tn-source"');
    expect(html).not.toContain('payload.source');
  });

  it('удаление вопроса требует подтверждение и шлёт action=delete', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnDeleteTask as (id: string) => Promise<void>)('t1');

    const mutate = calls.find((call) => call.name === 'adminMutateTournamentTasks');
    expect(mutate?.payload?.action).toBe('delete');
    expect(mutate?.payload?.taskIds).toEqual(['t1']);
  });

  it('кураторский набор: отбор галочками → раунд → сохранение в формате сервера', async () => {
    const { sandbox, calls, elements, checkboxes } = runTab();
    checkboxes.push({ value: 't1', checked: true, getAttribute: () => '' });
    elements['tn-cur-date'] = { id: 'tn-cur-date', value: '2026-07-27', innerHTML: '', textContent: '', querySelector: () => null };
    elements['tn-cur-round'] = { id: 'tn-cur-round', value: '2', innerHTML: '', textContent: '', querySelector: () => null };
    elements['tn-cur-slot'] = { id: 'tn-cur-slot', value: 'daily_1900', innerHTML: '', textContent: '', querySelector: () => null };

    (sandbox.tnCuratedAdd as () => void)();
    await (sandbox.tnCuratedSave as () => Promise<void>)();

    const save = calls.find((call) => call.name === 'adminSetTournamentCurated');
    expect(save?.payload?.slotId).toBe('daily_1900');
    expect(save?.payload?.dateKey).toBe('2026-07-27');
    expect(save?.payload?.timezone).toBe('Europe/Moscow');
    expect(save?.payload?.rounds).toEqual([{ roundNo: 2, taskIds: ['t1'] }]);
  });

  it('публикация и кураторский отбор берут галочки ТОЛЬКО из списка ревью', () => {
    // Регрессия аудита 2026-07-25: глобальный селектор захватывал чекбоксы из
    // карточек-примеров панелей генерации — после dry-run публикация пыталась
    // отправить id, которых нет в базе.
    const publishStart = html.indexOf('window.tnPublishVisible');
    expect(html.slice(publishStart, publishStart + 800)).toContain("'#tn-list .tn-pick:checked'");
    const curatedStart = html.indexOf('window.tnCuratedAdd');
    expect(html.slice(curatedStart, curatedStart + 800)).toContain("'#tn-list .tn-pick:checked'");
  });

  it('кураторский набор без даты не уходит на сервер', async () => {
    const { sandbox, calls } = runTab();
    await (sandbox.tnCuratedSave as () => Promise<void>)();
    expect(calls.some((call) => call.name === 'adminSetTournamentCurated')).toBe(false);
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

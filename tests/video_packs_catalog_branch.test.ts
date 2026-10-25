// зачем (владелец, журнал п.85(2)): «Из видео» различает ТРИ исхода — загрузка, настоящая ошибка, пусто. Пустой ответ больше не скелет и не «Сейчас недоступно».
import fs from 'node:fs';
import path from 'node:path';
import {
  initialVideoCatalogLoadState,
  videoCatalogBranch,
  videoCatalogWaiting,
} from '../app/video_packs_catalog_branch';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const base = { packsCount: 0, visibleCount: 0, searching: false, exhausted: false } as const;

describe('«Из видео»: ветка экрана выбирается явно', () => {
  it('ответ получен, наборов из видео ноль → «Пока пусто» (не скелет, не «Сейчас недоступно»)', () => {
    expect(videoCatalogBranch({ ...base, loadState: 'ready' })).toEqual({ branch: 'empty', reason: 'answer_zero_packs' });
    // даже если тихие повторы когда-то были исчерпаны — пустой ответ остаётся пустым ответом
    expect(videoCatalogBranch({ ...base, loadState: 'ready', exhausted: true })).toEqual({ branch: 'empty', reason: 'answer_zero_packs' });
  });

  it('наборы есть, но на выбранном языке ноль → «Пока пусто», а не пустой экран', () => {
    expect(videoCatalogBranch({ ...base, loadState: 'ready', packsCount: 4 })).toEqual({ branch: 'empty', reason: 'answer_zero_for_language' });
  });

  it('первая загрузка без кэша → скелет; потолок исчерпан → «Сейчас недоступно»', () => {
    expect(videoCatalogBranch({ ...base, loadState: 'loading' })).toEqual({ branch: 'loading', reason: 'first_load_no_cache' });
    expect(videoCatalogBranch({ ...base, loadState: 'loading', exhausted: true })).toEqual({ branch: 'error', reason: 'ceiling_exhausted' });
  });

  it('настоящий сбой: тихие повторы со скелетом, затем «Сейчас недоступно»', () => {
    expect(videoCatalogBranch({ ...base, loadState: 'error' })).toEqual({ branch: 'loading', reason: 'load_failed_retrying' });
    expect(videoCatalogBranch({ ...base, loadState: 'error', exhausted: true })).toEqual({ branch: 'error', reason: 'load_failed_exhausted' });
  });

  it('есть строки → список, в любом состоянии загрузки (повтор не стирает показанное)', () => {
    for (const loadState of ['loading', 'ready', 'error'] as const) {
      expect(videoCatalogBranch({ ...base, loadState, packsCount: 3, visibleCount: 3 })).toEqual({ branch: 'list', reason: 'rows_visible' });
    }
  });

  it('поиск без совпадений → «Ничего не нашли», остальное — только для не-поиска', () => {
    expect(videoCatalogBranch({ ...base, loadState: 'ready', packsCount: 3, searching: true })).toEqual({ branch: 'not_found', reason: 'search_no_match' });
    expect(videoCatalogBranch({ ...base, loadState: 'loading', searching: true })).toEqual({ branch: 'not_found', reason: 'search_no_match' });
  });
});

describe('«Из видео»: тихие повторы и сеть', () => {
  it('повторы нужны только пока ждём загрузку или после сбоя; пустой ответ повторов не запускает (0 лишних чтений Firestore)', () => {
    expect(videoCatalogWaiting('loading', 0, false)).toBe(true);
    expect(videoCatalogWaiting('error', 0, false)).toBe(true);
    expect(videoCatalogWaiting('ready', 0, false)).toBe(false);
    expect(videoCatalogWaiting('error', 2, false)).toBe(false);
    expect(videoCatalogWaiting('loading', 0, true)).toBe(false);
  });

  it('первый кадр: ответ в памяти (даже пустой) → «готово» сразу, без сети; ответа не было → загрузка', () => {
    expect(initialVideoCatalogLoadState([])).toEqual({ loadState: 'ready', source: 'memory_cache' });
    expect(initialVideoCatalogLoadState([{ id: 'video:abc' }])).toEqual({ loadState: 'ready', source: 'memory_cache' });
    expect(initialVideoCatalogLoadState(null)).toEqual({ loadState: 'loading', source: 'none' });
  });
});

describe('«Из видео»: экран подключён к веткам', () => {
  const screen = read('app/flashcards_video_packs.tsx');

  it('рисует четыре ветки по результату чистой функции; «Пока пусто» без кнопки, тексты на 9 языках', () => {
    // 25.10 (Ревизор, прогон 05:00): правило владельца «экранов-ошибок нигде» (01.10 и 18.10, 49630f40e) — ветка 'error' больше не отдельный экран, она рисуется тем же спокойным «Пока пусто»,
    // а причина уходит в журнал [NO-ERROR-SCREEN]. Проверка строже прежней: отдельного экрана ошибки в разметке быть не должно.
    expect(screen).toContain("{branch === 'loading' ? (");
    expect(screen).toContain(") : branch === 'empty' || branch === 'error' ? (");
    expect(screen).toContain(") : branch === 'not_found' ? (");
    expect(screen).not.toContain("{branch === 'error' ? (");
    expect(screen).toContain("logNoErrorScreen('flashcards_video_packs', branchReason, 'quiet_empty'");
    const start = screen.indexOf("branch === 'empty' || branch === 'error' ? (");
    const block = screen.slice(start, screen.indexOf("branch === 'not_found'", start));
    expect(block).toContain('title={copy.emptyTitle}');
    expect(block).toContain('detail={copy.emptyBody}');
    expect(block).toContain('hideAction');
    for (const text of ['Пока пусто', 'Поки порожньо', 'Nothing here yet', 'Aún no hay nada', 'Ainda vazio', 'Chưa có gì', 'Belum ada', 'Henüz boş', 'Na razie pusto']) {
      expect(screen).toContain(text);
    }
  });

  it('первый кадр берёт ответ из памяти модуля (в том числе пустой), а не «всегда загрузка»', () => {
    expect(screen).toContain('const initial = initialVideoCatalogLoadState(peeked);');
    expect(screen).not.toContain("loadState: packs.length > 0 ? 'ready' : 'loading'");
  });

  it('тихие повторы считаются через videoCatalogWaiting, а не «любое состояние без строк»', () => {
    expect(screen).toContain('const waitingForCatalog = videoCatalogWaiting(loadState, packs.length, searching);');
    expect(screen).not.toContain("(loadState === 'error' || loadState === 'ready' || loadState === 'loading')");
  });

  it('журнал [VIDEO-EMPTY]: ветка, причина и значения, которые её решили; на старте — откуда пришёл ответ', () => {
    expect(screen).toContain("const VIDEO_EMPTY_LOG = '[VIDEO-EMPTY]';");
    expect(screen).toContain('ветка=${branch} причина=${branchReason} loadState=${loadState} наборов=${packs.length} видимых=${visible.length}');
    expect(screen).toContain('(источник=${initial.source})');
  });
});

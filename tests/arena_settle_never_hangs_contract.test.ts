/**
 * Сторож: сцена «Сверяем результат…» не имеет права зависнуть.
 *
 * Инцидент (владелец, 2026-09-03 → 2026-09-04): экран Арены после последнего
 * задания замирал навсегда. Первая попытка починки показывала окно «результат
 * не пришёл» с кнопкой выхода — владелец отверг это прямо: «должен быть
 * ПРАВИЛЬНЫЙ ЭКРАН РЕЗУЛЬТАТА КАК БЫЛ, просто ничего не должно зависать».
 *
 * Правило, которое сторожим: когда сервер молчит, экран открывает НАСТОЯЩИЙ
 * экран результата по локальному итогу — тот же `/arena_results`, — а не
 * предлагает человеку уйти на хаб.
 *
 * Почему проверка по исходнику, а не рендером: экран матча тянет за собой
 * навигацию, звук, аккаунт и живой канал; поднимать это в тесте дороже и
 * хрупче, чем закрепить сам контракт. Поведение автосброса попыток при этом
 * покрыто настоящим рендер-тестом
 * (tests/session_attempts_auto_reset_unblocks_screen.test.ts).
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

describe('Арена: сцена сверки не зависает', () => {
  const match = read('app/arena_match.tsx');

  test('страховка есть и не превращается в ожидание', () => {
    const threshold = match.match(/const ARENA_SETTLE_STUCK_MS = ([\d_]+);/);
    expect(threshold).not.toBeNull();
    const ms = Number((threshold?.[1] ?? '').replace(/_/g, ''));
    // Это НЕ ожидание сервера (владелец: «кто кого будет ждать 8 секунд?»), а
    // защита от двойного открытия результата: один-два кадра, не больше.
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(1_000);
  });

  test('предохранитель открывает экран результата, а не окно с выходом', () => {
    expect(match).toContain('openResultFallback');
    // Костыль с окном «результат не пришёл» отменён владельцем и не должен
    // вернуться ни под этим именем, ни через тексты словаря.
    expect(match).not.toContain('settleStuck:');
    expect(match).not.toContain("kind: 'settleStuck'");
    const copy = read('modules/arena/copy.ts');
    expect(copy).not.toMatch(/^\s*settleStuck:/m);
    expect(copy).not.toMatch(/^\s*settleStuckHint:/m);
  });

  test('запасной путь ведёт на /arena_results, как обычный переход', () => {
    const start = match.indexOf('const openResultFallback');
    expect(start).toBeGreaterThan(-1);
    const body = match.slice(start, match.indexOf('}, [match, matchId, plan, planScope, router]);', start));
    expect(body).toContain("pathname: '/arena_results'");
    // Снимок обязан лечь ДО перехода: без него экран результата откроется пустым.
    expect(body).toContain('arenaRememberResultHandoff');
    // Повторное открытие исключено — иначе результат мог бы открыться дважды.
    expect(body).toContain('resultOpenedRef.current = true');
  });

  test('ретраи доставки не сбрасывают отсчёт предохранителя', () => {
    const effectStart = match.indexOf('openResultFallback();');
    const deps = match.slice(effectStart, effectStart + 400);
    // finishQueued и sent меняются именно при ретраях. Их присутствие в
    // зависимостях перезаводило таймер, и предохранитель мог не сработать.
    const depsLine = deps.slice(deps.indexOf('}, ['));
    expect(depsLine).not.toContain('finishQueued');
    expect(depsLine).not.toContain('sent,');
  });

  test('каждый ранний выход обеих веток называет причину', () => {
    for (const marker of ['const openPreviewResult', 'const openResultFallback']) {
      const start = match.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const body = match.slice(start, start + 2_600);
      const earlyReturns = body.match(/\n\s+return;/g) ?? [];
      const logs = body.match(/DebugLogger\.(warn|info|error)\('\[ARENA-SETTLE\]'/g) ?? [];
      // Немой выход — это ровно то, из-за чего причина зависания была невидима.
      expect(logs.length).toBeGreaterThanOrEqual(earlyReturns.length);
    }
  });

  test('переход на результат не отменяется перехватчиком ухода', () => {
    // КОРЕНЬ мёртвого экрана: beforeRemove отменяет любую навигацию, пока не
    // взведён leavingRef. Переходы на результат его не взводили — router.replace
    // молча отменялся, экран матча висел, кнопка назад тоже не работала.
    const navigations = match.split("pathname: '/arena_results'").length - 1;
    expect(navigations).toBeGreaterThanOrEqual(3);
    for (const chunk of match.split("pathname: '/arena_results'").slice(0, navigations)) {
      const tail = chunk.slice(-700);
      expect(tail).toContain('leavingRef.current = true');
    }
  });

  test('законченный матч не удерживается вопросом о сдаче', () => {
    // Сдавать нечего: матч уже сыгран. Удержание = мёртвый экран без выхода.
    const start = match.indexOf("navigation.addListener('beforeRemove'");
    expect(start).toBeGreaterThan(-1);
    const body = match.slice(start, start + 1_600);
    expect(body).toContain("match?.state.phase === 'finished'");
    // Проверка обязана стоять ДО preventDefault, иначе она бесполезна.
    expect(body.indexOf("match?.state.phase === 'finished'"))
      .toBeLessThan(body.indexOf('event.preventDefault()'));
  });
});

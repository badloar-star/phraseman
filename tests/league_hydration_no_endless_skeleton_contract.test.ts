/**
 * Контракт: экран Лиги НИКОГДА не залипает в скелетоне.
 *
 * зачем: 2026-07-27 владелец сообщил про «бесконечный скелет и загрузку» при
 * входе в Лиги на iPhone. Причина была в коммите 4017dd072: скелетон показывается
 * при localLeagueHydrated === false, но флаг поднимался ТОЛЬКО в кэшевой ветке
 * загрузки. При первом входе без локального кэша данные приезжали из Firestore
 * через applyLeagueOpen(..., fromRemote=true), где флага не было вовсе — скелетон
 * висел вечно. Вторая половина бага: ветка else звала setLocalLeagueHydrated(false)
 * и при повторном входе гасила уже показанный подиум обратно в скелетон.
 *
 * Требование владельца жёсткое: открытие лиги обязано быть мгновенным, скелет
 * недопустим даже на секунду. Тест сторожит инварианты:
 *   1) флаг поднимается в applyLeagueOpen — общей точке кэша, сети и таймаута;
 *   2) флаг НИГДЕ не опускается в false после инициализации useState;
 *   3) первый кадр берётся из синхронного снапшота (getCachedLeagueStateSync).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const clubScreen = readFileSync(join(__dirname, '..', 'app', 'club_screen.tsx'), 'utf8');

/**
 * Исходник без комментариев. Рядом с фиксом лежат подробные объяснения, где
 * дословно упоминаются и setLocalLeagueHydrated(true), и setLocalLeagueHydrated(false).
 * Без вырезания комментариев тест зеленел на СЛОМАННОМ коде — читал объяснение
 * вместо вызова. Проверяем только исполняемый текст.
 */
const clubScreenCode = clubScreen
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

describe('лига: гидратация без бесконечного скелетона', () => {
  it('флаг гидратации поднимается внутри applyLeagueOpen (общая точка кэша и сети)', () => {
    // Тело applyLeagueOpen вырезаем по балансу фигурных скобок: срез «до
    // следующего try» ломался, если разметка вокруг менялась, и тест молча
    // проверял весь остаток файла (то есть не проверял ничего).
    const start = clubScreenCode.indexOf('const applyLeagueOpen = (');
    expect(start).toBeGreaterThan(-1);
    const bodyStart = clubScreenCode.indexOf('{', clubScreenCode.indexOf(') => {', start));
    let depth = 0;
    let end = bodyStart;
    for (let i = bodyStart; i < clubScreenCode.length; i += 1) {
      if (clubScreenCode[i] === '{') depth += 1;
      else if (clubScreenCode[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    expect(end).toBeGreaterThan(bodyStart);
    const body = clubScreenCode.slice(bodyStart, end);
    expect(body).toContain('setLocalLeagueHydrated(true)');
  });

  it('НИГДЕ нет setLocalLeagueHydrated(false) — показанные данные не разгидратируются', () => {
    // Именно этот вызов возвращал экран в скелетон при повторном входе.
    expect(clubScreenCode).not.toContain('setLocalLeagueHydrated(false)');
  });

  it('первый кадр берётся из синхронного снапшота, а не из await-загрузки', () => {
    expect(clubScreenCode).toContain('getCachedLeagueStateSync()');
    // useState инициализируется снапшотом: вернувшийся пользователь видит подиум
    // в первом же кадре, без единого прохода через скелетон.
    expect(clubScreenCode).toContain('useState(initialLeagueState != null)');
  });

  it('скелетон рисуется только как ветка отсутствия данных, а не поверх контента', () => {
    // Тернарник: либо сцена, либо скелетон — они не могут показаться одновременно.
    expect(clubScreenCode).toContain('localLeagueHydrated ? (');
    expect(clubScreenCode).toContain('<LeagueHubSkeleton');
  });
});

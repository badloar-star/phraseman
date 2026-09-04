/**
 * Сцена «Дуэль» на экране результатов Арены.
 *
 * Владелец выбрал этот вариант из трёх макетов
 * (`.motion-mockups/phraseman-arena-results.html`, 2026-09-04): оба счёта
 * растут одновременно и гонятся друг за другом, полоса делит экран
 * пропорционально набранному, исход объявляется ПОСЛЕ гонки.
 *
 * Сторожим то, что легко сломать не заметив: честность прочерка, момент
 * объявления исхода, отсутствие дублирующих плиток и запреты владельца.
 */
import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(
  path.join(process.cwd(), relativePath),
  'utf8',
);

/*
 * Зеркало `arenaDuelShare` из компонента.
 *
 * зачем копия, а не импорт: jest в этом проекте работает в среде `node` и не
 * парсит .tsx. Сторож всё равно проверяет ОБА — формулу здесь и её текст в
 * компоненте ниже, поэтому разойтись незаметно они не могут.
 */
function arenaDuelShare(viewerScore: number, opponentScore: number | null): number {
  const mine = Math.max(0, viewerScore);
  const theirs = Math.max(0, opponentScore ?? 0);
  const total = mine + theirs;
  if (total <= 0) return 0.5;
  return mine / total;
}

describe('Арена: сцена результата «Дуэль»', () => {
  const duel = read('components/arena/ArenaResultDuel.tsx');
  const screen = read('app/arena_results.tsx');

  test('полоса делит экран пропорционально счёту', () => {
    expect(arenaDuelShare(26, 18)).toBeCloseTo(26 / 44, 5);
    expect(arenaDuelShare(10, 0)).toBe(1);
    expect(arenaDuelShare(0, 10)).toBe(0);
  });

  test('формула в компоненте совпадает с проверяемой здесь', () => {
    // Если формулу в компоненте изменят, копия выше устареет молча — ловим это.
    expect(duel).toContain('if (total <= 0) return 0.5;');
    expect(duel).toContain('return mine / total;');
  });

  test('нулевой матч делит полосу пополам, а не падает', () => {
    // Оба по нулю — деления на ноль быть не должно ни при каких данных.
    expect(arenaDuelShare(0, 0)).toBe(0.5);
    expect(arenaDuelShare(0, null)).toBe(0.5);
  });

  test('неизвестный счёт соперника не превращается в ноль', () => {
    // null означает «живой соперник ещё молчит». Ноль был бы утверждением
    // «он не набрал ничего» — это враньё, которое сервер потом опровергнет.
    expect(duel).toContain("opponentShown === null ? '—'");
    expect(screen).toContain('duel.opponentScore === null ? null : duelOpponentShown');
  });

  test('исход не объявляется, пока счёт соперника неизвестен', () => {
    const start = screen.indexOf('const duel = useMemo');
    expect(start).toBeGreaterThan(-1);
    const body = screen.slice(start, screen.indexOf('}, [effectiveViewerSeat', start));
    expect(body).toContain('opponentScore === null ? null');
    // Метка рисуется только при наличии подписи — иначе её нет вовсе.
    expect(duel).toContain('outcomeLabel ?');
  });

  test('оба счёта докручиваются одновременно — это и есть гонка', () => {
    expect(screen).toContain('const duelViewerShown = useCountUp');
    expect(screen).toContain('const duelOpponentShown = useCountUp');
  });

  test('плитки со счётом не дублируют сцену', () => {
    // Те же два числа дважды на одном экране разбавляют главный кадр.
    expect(screen).toContain('duel ? null : (');
  });

  test('движение уважает Reduced Motion и премаунт', () => {
    expect(duel).toContain('if (reduceMotion || !active)');
    // Финальный кадр обязан быть виден без анимации, а не остаться пустым.
    expect(duel).toContain('fill.value = share');
    expect(duel).toContain('tag.value = 1');
  });

  test('у каждого исхода свой характер движения, а не только цвет', () => {
    // Владелец 2026-09-04: победа, поражение и ничья не должны ощущаться
    // одинаково. Язык движения общий со звёздным тактом: бьёт / выдыхает / дышит.
    expect(duel).toContain("outcome === 'win'");
    expect(duel).toContain("outcome === 'loss'");
    expect(duel).toContain("outcome === 'draw'");
    expect(duel).toContain('avatarDip');
  });

  test('разрыв в счёте проговаривается словами во всех трёх исходах', () => {
    const copy = read('modules/arena/copy.ts');
    for (const key of ['duelLeadBy', 'duelShortBy', 'duelEven']) {
      const line = copy.split(/\r?\n/).find((row) => row.trim().startsWith(`${key}:`));
      expect(line).toBeDefined();
      // Девять локалей — иначе часть игроков увидит русский текст.
      expect((line ?? '').split("', '").length).toBe(9);
    }
    expect(screen).toContain('duelLeadBy');
    expect(screen).toContain('duelShortBy');
    expect(screen).toContain('duelEven');
  });

  test('без счёта соперника разрыв не выдумывается', () => {
    expect(screen).toContain('outcome === null || opponentScore === null ? null');
  });

  test('запреты владельца соблюдены', () => {
    // Обводки контейнеров запрещены: разделяем тоном и скруглением.
    expect(duel).not.toMatch(/borderWidth|borderColor/);
    // adjustsFontSizeToFit — известный класс бага, ужимать текст нельзя.
    expect(duel).not.toContain('adjustsFontSizeToFit');
  });
});

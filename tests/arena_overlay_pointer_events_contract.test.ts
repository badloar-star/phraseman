/**
 * Сторож: глобальные оверлеи Арены не перехватывают касания.
 *
 * Повод (владелец 2026-09-20, «ни 1 кнопка на этом экране не работает»):
 * контейнер тоста находки растянут на всю ширину и лежит поверх экрана. Без
 * `pointerEvents` он ловил касания по всей полосе — кнопки Арены, включая
 * «На арену», переставали нажиматься.
 *
 * Именно `box-none`, а не `none`: `none` убил бы и кнопки самого тоста.
 *
 * Сработал — вернуть pointerEvents, а не удалять сторожа.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(file: string): string {
  return readFileSync(join(__dirname, '..', 'components', 'arena', file), 'utf8')
    .replace(/\r\n/g, '\n');
}

function code(file: string): string {
  // Комментарии не считаются: сторож проверяет РАЗМЕТКУ, а не объяснения.
  return source(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('глобальные оверлеи Арены пропускают касания', () => {
  test('тост находки объявляет pointerEvents="box-none" на контейнере', () => {
    expect(code('ArenaOpponentFoundToast.tsx')).toContain('pointerEvents="box-none"');
  });

  test('тост НЕ выключает касания целиком — иначе его кнопки мертвы', () => {
    expect(code('ArenaOpponentFoundToast.tsx')).not.toContain('pointerEvents="none"');
  });

  test('индикатор поиска не перехватывает касания вовсе', () => {
    // У индикатора нет кнопок, поэтому ему положен полный none.
    expect(code('ArenaSearchIndicator.tsx')).toContain('pointerEvents="none"');
  });
});

/**
 * Экономика приёма матча (аудит 2026-09-20, раунд 2).
 *
 * Обе защиты потерялись при переписи экрана поиска и стоили владельцу
 * реальных поломок:
 *  • без подтверждения старта трата остаётся открытой для возврата — человек
 *    сыграл матч, а энергия могла вернуться;
 *  • мёртвый матч вёл на экран «Этого матча больше нет» с уже списанными 25⚡.
 */
describe('приём матча закрывает экономику', () => {
  const host = (): string => source('ArenaOpponentFoundHost.tsx');

  test('подтверждает старт после успешного входа в матч', () => {
    expect(host()).toContain('acknowledgeSessionStart(energyIntent.operationId)');
  });

  test('возвращает энергию, когда матч оказался мёртв', () => {
    const src = host();
    expect(src).toContain("failure === 'rejected'");
    expect(src).toContain('refundActivityStart(energyIntent.operationId');
  });

  test('не ведёт на экран матча при мёртвом матче', () => {
    // После возврата обязателен ранний выход, иначе человек всё равно уйдёт
    // на «Этого матча больше нет».
    expect(host()).toContain("arenaBackgroundSearch.stop('no_opponent');");
  });
});

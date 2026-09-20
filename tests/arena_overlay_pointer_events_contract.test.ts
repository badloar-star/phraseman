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

  test('плашка отказа входа тоже пропускает касания насквозь', () => {
    expect(code('ArenaEntryFailureToast.tsx')).toContain('pointerEvents="box-none"');
    expect(code('ArenaEntryFailureToast.tsx')).not.toContain('pointerEvents="none"');
  });
});

/**
 * Ширина кнопок в ряду задаётся ОБЁРТКЕ, а не поверхности.
 *
 * Повод (владелец 2026-09-20): «кнопки смещены вправо». `DuoPressable` отдаёт
 * `style` внутренней поверхности, а ширину в ряду делит внешний `Pressable`.
 * `flex: 1` на поверхности тянул её шире собственной обёртки — кнопки съезжали
 * и вылезали за карточку.
 *
 * Сработал — вернуть `wrapStyle`, а не удалять сторожа.
 */
describe('кнопки тоста делят ширину честно', () => {
  test('обе кнопки получают ширину через wrapStyle', () => {
    const src = code('ArenaOpponentFoundToast.tsx');
    expect(src.match(/wrapStyle=\{styles\.half\}/g) ?? []).toHaveLength(2);
    expect(src).toContain('half: { flex: 1 }');
  });

  test('flex не остаётся на стиле поверхности кнопки', () => {
    const src = code('ArenaOpponentFoundToast.tsx');
    const button = src.slice(src.indexOf('button: {'), src.indexOf('buttonText:'));
    expect(button).not.toContain('flex: 1');
  });
});

/**
 * У ПРИНЯТОГО матча ровно два исхода: переход или объяснение.
 *
 * Повод (владелец 2026-09-20): «при нажатии ПРИНЯТЬ пару секунд ничего не
 * происходит, затем тупо выкидывает назад в хаб Арены». Ветки мёртвого матча
 * гасили поиск и возвращали энергию, не сказав ни слова, — матч исчезал сам
 * по себе.
 *
 * Сработал — вернуть показ причины, а не удалять сторожа.
 */
describe('принятый матч не исчезает молча', () => {
  test('каждая мёртвая ветка называет причину', () => {
    const src = code('ArenaOpponentFoundHost.tsx');
    /*
     * Шесть точек: сброс при новой находке, неизвестный контур, отказ
     * энергии ('cancelled'), мёртвый матч, сбой списания и закрытие плашки.
     */
    expect(src.match(/setEntryFailure\(/g) ?? []).toHaveLength(6);
    expect(src).toContain('<ArenaEntryFailureToast');
  });

  test('объяснение показывается ВЫШЕ проверок находки', () => {
    /*
     * К этому моменту stop() уже обнулил находку, и любая проверка `!found`
     * ниже вернула бы null — плашка не отрисовалась бы никогда. Ровно так и
     * выглядел молчаливый возврат в хаб.
     */
    const src = code('ArenaOpponentFoundHost.tsx');
    expect(src.indexOf('if (entryFailure)')).toBeGreaterThan(-1);
    expect(src.indexOf('if (entryFailure)')).toBeLessThan(src.indexOf('if (!found)'));
  });

  test('новая находка стирает прошлое объяснение', () => {
    expect(code('ArenaOpponentFoundHost.tsx')).toContain('setEntryFailure(null)');
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

  /*
   * зачем (владелец 2026-09-20): у безлимитной энергии леджер намеренно НЕ
   * списывает и отвечает 'unlimited'. Проверка `result !== 'spent'` считала
   * это отказом — подписчик не мог принять матч вообще, поиск гас, и человек
   * молча возвращался в хаб. Сработал — вернуть признание 'unlimited'
   * успехом, а не удалять сторожа.
   */
  test('безлимитная энергия — это успех, а не отказ', () => {
    const src = host();
    expect(src).toContain("result !== 'spent' && result !== 'unlimited'");
  });

  test('не ведёт на экран матча при мёртвом матче', () => {
    /*
     * После возврата обязателен ранний выход, иначе человек всё равно уйдёт
     * на «Этого матча больше нет» — с уже списанными 25⚡.
     *
     * зачем правка 2026-09-20: причина остановки теперь зависит от вида
     * отказа (смена аккаунта — это не «соперник не нашёлся»), поэтому голой
     * строки `stop('no_opponent')` в коде больше нет. Сторожим САМО
     * требование: гасим поиск и выходим, не открывая матч.
     */
    const src = host();
    expect(src).toContain("arenaBackgroundSearch.stop(");
    expect(src).toContain("? 'account_changed' : 'no_opponent',");
    // Ранний выход стоит ДО перехода на экран матча в этой же ветке.
    const deadBranch = src.slice(src.indexOf("if (failure === 'rejected'"));
    expect(deadBranch.indexOf('return;'))
      .toBeLessThan(deadBranch.indexOf('router.push('));
  });
});

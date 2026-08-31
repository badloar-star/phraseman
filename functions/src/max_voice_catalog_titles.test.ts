// Сторож витрины заголовков раздела «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): в каталоге человек обязан читать «Заказать в
// кафе», а не технический id a1_greet. Заголовки живут на сервере (78×9 строк
// в бандле — ~40 КБ, бандл-диета запрещает), поэтому шов «сервер отдал ровно
// то, что клиент нарисует» нужно сторожить: молчаливая потеря заголовков
// выглядит как «раздел сломался», хотя ошибки нигде нет.

import { catalogTitles } from './max_voice_tutor_preview';
import { CAN_DO_GOALS } from './max_voice_can_do_goals';

describe('заголовки каталога уроков', () => {
  it('отдаёт заголовок для КАЖДОГО урока', () => {
    const titles = catalogTitles('ru');
    expect(Object.keys(titles)).toHaveLength(CAN_DO_GOALS.length);
    for (const goal of CAN_DO_GOALS) {
      expect(titles[goal.id]).toBeTruthy();
    }
  });

  it('русскому интерфейсу — русские названия, а не английские', () => {
    const titles = catalogTitles('ru');
    expect(titles.a1_greet).toBe('Поздороваться и попрощаться');
    expect(titles.a1_order_cafe).toBe('Заказать в кафе');
  });

  it('английскому интерфейсу — английские', () => {
    expect(catalogTitles('en').a1_order_cafe).toBe('Order in a café');
  });

  it('каждая поддерживаемая локаль получает непустые названия', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en']) {
      const titles = catalogTitles(lang);
      expect(Object.keys(titles)).toHaveLength(CAN_DO_GOALS.length);
      for (const value of Object.values(titles)) expect(value.trim()).not.toBe('');
    }
  });

  it('неизвестный язык падает в английский, а не в пустоту', () => {
    const titles = catalogTitles('xx');
    expect(titles.a1_greet).toBe(catalogTitles('en').a1_greet);
  });

  it('ответ остаётся лёгким: один язык укладывается в 8 КБ', () => {
    // Список едет в ответе preflight; раздувать его нельзя — раздел
    // открывается на каждый заход в каталог.
    const bytes = Buffer.byteLength(JSON.stringify(catalogTitles('ru')), 'utf8');
    expect(bytes).toBeLessThan(8 * 1024);
  });
});

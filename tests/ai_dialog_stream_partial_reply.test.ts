/**
 * Стриминг диалога: инкрементальный разбор поля `reply` из НЕДОПИСАННОГО JSON.
 *
 * В игровом режиме модель отдаёт JSON-конверт. Сервер умеет вынимать reply из
 * частичного JSON на provider-boundary, но после anti-repeat аудита публикует
 * пользователю только проверенный полный кандидат. Чанки OpenAI всё ещё режут
 * JSON в произвольных местах, поэтому парсер остаётся под регрессией.
 */

import { extractPartialReply } from '../functions/src/premium_dialog_stream_parse';

describe('extractPartialReply', () => {
  it('возвращает пустую строку, пока поле reply ещё не началось', () => {
    expect(extractPartialReply('')).toBe('');
    expect(extractPartialReply('{')).toBe('');
    expect(extractPartialReply('{"re')).toBe('');
    expect(extractPartialReply('{"reply"')).toBe('');
    expect(extractPartialReply('{"reply":')).toBe('');
  });

  it('отдаёт текст по мере набора строки reply', () => {
    expect(extractPartialReply('{"reply": "Hel')).toBe('Hel');
    expect(extractPartialReply('{"reply": "Hello the')).toBe('Hello the');
  });

  it('останавливается на закрывающей кавычке и не захватывает остальной конверт', () => {
    const full = '{"reply": "Hello there!", "mood": 70, "outcome": "ongoing"}';
    expect(extractPartialReply(full)).toBe('Hello there!');
  });

  it('разворачивает экранированные последовательности', () => {
    expect(extractPartialReply('{"reply": "line\\nnext"')).toBe('line\nnext');
    expect(extractPartialReply('{"reply": "say \\"hi\\" now"')).toBe('say "hi" now');
    expect(extractPartialReply('{"reply": "back\\\\slash"')).toBe('back\\slash');
  });

  it('не ломается, когда чанк оборвался прямо на обратном слэше', () => {
    // Классический стык чанков: пришло "abc\", продолжение ещё в пути.
    expect(extractPartialReply('{"reply": "abc\\')).toBe('abc');
  });

  it('не ломается на оборванном \\u-эскейпе', () => {
    expect(extractPartialReply('{"reply": "abc\\u00')).toBe('abc');
    expect(extractPartialReply('{"reply": "abc\\u0041')).toBe('abcA');
  });

  it('монотонен: добавление символов только удлиняет видимый текст', () => {
    // На этом свойстве держится отправка дельт: сервер шлёт только «хвост»,
    // сравнивая длину с уже отправленным. Если бы функция могла УКОРОТИТЬ
    // результат, клиент получил бы рассыпанный текст.
    const source = '{"reply": "Good morning, what can I get you?", "mood": 65}';
    let previous = '';
    for (let i = 0; i <= source.length; i++) {
      const current = extractPartialReply(source.slice(0, i));
      expect(current.startsWith(previous) || previous.startsWith(current)).toBe(true);
      if (current.length >= previous.length) previous = current;
    }
    expect(previous).toBe('Good morning, what can I get you?');
  });

  it('переживает маркеры ключевых фраз внутри reply', () => {
    expect(extractPartialReply('{"reply": "We are [[running late]] now"')).toBe(
      'We are [[running late]] now',
    );
  });
});

// Переводчик 24.10 (docs/work/tasks/spire-oddity-cloud-text-scan-2026-10-24.md): в 13 облачных заданиях «Найди ошибку» ошибочный
// вариант начинался со строчной — ответ угадывался по форме. Показ на телефоне делает заглавной первую букву каждого варианта.
import { capitalizeSpireOddityOptions, isKnownSpireOddityTemplate } from '../components/spire/spire_oddity_prompt';

const WRONG = [
  'it are Max, right?', 'they am stuck on this part.', 'he am working on the new screen.', 'she am happy to be here.',
  'she am sorry, maybe another time.', 'she am based in Spain.', 'he am blocked right now.', 'we am really sorry for the change.',
  'he am fixing a small bug.', 'they am good, thank you.', 'we am working on the new task.', 'they am almost done with it.',
  'he am writing emails to my clients',
];

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('spire find_oddity: the answer is not given away by a lowercase letter', () => {
  it.each(WRONG)('«%s» cannot be told apart by its first letter', (wrong) => {
    const shown = capitalizeSpireOddityOptions('t', ['I am ready.', wrong, 'You are late.', 'We are here.']);
    expect(shown.every((option) => option.charAt(0) === option.charAt(0).toUpperCase())).toBe(true);
    // только первая буква, остальное как есть
    expect(shown[1].slice(1)).toBe(wrong.slice(1));
  });

  it("leaves capitalised options untouched, including «I'm…», and logs only when something changed", () => {
    const log = jest.spyOn(console, 'log');
    const options = ["I'm fine.", 'He is here.', '"Yes," she said.', '42 people came.'];
    expect(capitalizeSpireOddityOptions('t2', options)).toEqual(options);
    expect(log).not.toHaveBeenCalled();
    capitalizeSpireOddityOptions('t3', ['he am here.']);
    expect(log).toHaveBeenCalledWith('[SPIRE-ODDITY-CASE]', JSON.stringify({ taskId: 't3', fixed: 1, total: 1 }));
  });

  it('the cloud pool template is known (no warning on every launch)', () => {
    expect(isKnownSpireOddityTemplate('Найдите фразу, которую нужно исправить.')).toBe(true);
  });
});

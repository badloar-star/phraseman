import {
  logSessionSizeSetup,
  parseBlitzDurationSec,
  parseRecallDirection,
} from '../app/flashcards/practice_setup_params';

describe('настройка тренировки из маршрута [PRACTICE-SETUP]', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  test('Блиц: 30/60/90 из маршрута, без параметра и с мусором — прежние 60 с', () => {
    expect(parseBlitzDurationSec('30')).toBe(30);
    expect(parseBlitzDurationSec(['90'])).toBe(90);
    expect(parseBlitzDurationSec(undefined)).toBe(60);
    expect(parseBlitzDurationSec('45')).toBe(60);
    expect(log).toHaveBeenCalledWith('[PRACTICE-SETUP]', expect.stringContaining('"applied":60'));
    expect(log).toHaveBeenCalledWith('[PRACTICE-SETUP]', expect.stringContaining('invalid_fallback_default'));
  });

  test('«Вспомни и напиши»: to_source из маршрута, по умолчанию как раньше (to_target)', () => {
    expect(parseRecallDirection('to_source')).toBe('to_source');
    expect(parseRecallDirection('to_target')).toBe('to_target');
    expect(parseRecallDirection(undefined)).toBe('to_target');
    expect(parseRecallDirection('ru_en')).toBe('to_target');
  });

  test('«Правда/ложь»: лог размера — что пришло и что применено', () => {
    logSessionSizeSetup('truefalse', '20', 20);
    logSessionSizeSetup('truefalse', 'all', 0);
    expect(log).toHaveBeenCalledWith('[PRACTICE-SETUP]', expect.stringContaining('"applied":20'));
    expect(log).toHaveBeenCalledWith('[PRACTICE-SETUP]', expect.stringContaining('"applied":"all"'));
  });
});

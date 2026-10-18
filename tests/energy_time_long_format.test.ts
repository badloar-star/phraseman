// зачем (Макеты c0cd6e2ae, energy-modes-004; координатор 18.10): окно остановки показывает время как в образце — «через 9 мин 41 с», а не сжатое «9м 39с».
// Один форматтер на 9 языков; сжатый formatTimeUntilRecovery (пилюля энергии, окно «Нет энергии») не меняется.
import { formatTimeUntilRecovery, formatTimeUntilRecoveryLong } from '../app/energy_system';

describe('formatTimeUntilRecoveryLong', () => {
  it('ru — как в образце: «9 мин 41 с»', () => {
    expect(formatTimeUntilRecoveryLong((9 * 60 + 41) * 1000, 'ru')).toBe('9 мин 41 с');
  });

  it('часы, минуты, секунды; ноль в старшем разряде не печатается', () => {
    expect(formatTimeUntilRecoveryLong((3600 + 30 * 60) * 1000, 'ru')).toBe('1 ч 30 мин 0 с');
    expect(formatTimeUntilRecoveryLong(45 * 1000, 'ru')).toBe('45 с');
    expect(formatTimeUntilRecoveryLong(-5, 'ru')).toBe('0 с');
  });

  it('утверждённые языки (ru/uk/tr) — длинный формат; остальные (сокращения ещё не утверждены Переводчиком) — сжатый', () => {
    const ms = (2 * 60 + 5) * 1000;
    expect(formatTimeUntilRecoveryLong(ms, 'ru')).toBe('2 мин 5 с');
    expect(formatTimeUntilRecoveryLong(ms, 'uk')).toBe('2 хв 5 с');
    expect(formatTimeUntilRecoveryLong(ms, 'tr')).toBe('2 dk 5 sn');
    for (const lang of ['en', 'es', 'pt-BR', 'pl', 'vi', 'id', 'xx']) {
      expect(formatTimeUntilRecoveryLong(ms, lang)).toBe(formatTimeUntilRecovery(ms, lang));
    }
  });

  it('сжатая запись пилюли не изменилась', () => {
    expect(formatTimeUntilRecovery((9 * 60 + 41) * 1000, 'ru')).toBe('9м 41с');
  });
});

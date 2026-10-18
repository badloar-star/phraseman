// зачем (Макеты c0cd6e2ae, energy-modes-004; координатор 18.10): окно остановки показывает время как в образце — «через 9 мин 41 с», а не сжатое «9м 39с».
// Один форматтер на 9 языков; сжатый formatTimeUntilRecovery (пилюля энергии, окно «Нет энергии») не меняется.
import { formatTimeUntilRecovery, formatTimeUntilRecoveryLong } from '../app/energy_system';

// число и единица склеены неразрывным пробелом (U+00A0) — сравниваем с учётом него
const nb = (s: string): string => s.replace(/(\d) /g, '$1\u00A0');

describe('formatTimeUntilRecoveryLong', () => {
  it('ru — как в образце: «9 мин 41 с»', () => {
    expect(formatTimeUntilRecoveryLong((9 * 60 + 41) * 1000, 'ru')).toBe(nb('9 мин 41 с'));
  });

  it('часы, минуты, секунды; ноль в старшем разряде не печатается', () => {
    expect(formatTimeUntilRecoveryLong((3600 + 30 * 60) * 1000, 'ru')).toBe(nb('1 ч 30 мин 0 с'));
    expect(formatTimeUntilRecoveryLong(45 * 1000, 'ru')).toBe(nb('45 с'));
    expect(formatTimeUntilRecoveryLong(-5, 'ru')).toBe(nb('0 с'));
  });

  it('все 9 языков — длинный формат с утверждёнными Переводчиком единицами; неизвестный язык — сжатый', () => {
    const ms = (2 * 60 + 5) * 1000;
    const expected: Record<string, string> = {
      ru: '2 мин 5 с', uk: '2 хв 5 с', en: '2 min 5 s', es: '2 min 5 s', 'pt-BR': '2 min 5 s',
      pl: '2 min 5 s', vi: '2 phút 5 giây', id: '2 mnt 5 dtk', tr: '2 dk 5 sn',
    };
    for (const [lang, out] of Object.entries(expected)) expect(formatTimeUntilRecoveryLong(ms, lang)).toBe(nb(out));
    expect(formatTimeUntilRecoveryLong(ms, 'xx')).toBe(formatTimeUntilRecovery(ms, 'xx'));
  });

  it('часы: pl «godz.», vi «giờ»', () => {
    const ms = (3600 + 90) * 1000;
    expect(formatTimeUntilRecoveryLong(ms, 'pl')).toBe(nb('1 godz. 1 min 30 s'));
    expect(formatTimeUntilRecoveryLong(ms, 'vi')).toBe(nb('1 giờ 1 phút 30 giây'));
  });

  it('сжатая запись пилюли не изменилась', () => {
    expect(formatTimeUntilRecovery((9 * 60 + 41) * 1000, 'ru')).toBe('9м 41с');
  });
});

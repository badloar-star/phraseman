import { getBoonActiveStatusText } from '../app/boons/boon_active_status_copy';

describe('daily boon active-status copy', () => {
  test.each([
    ['ru', 'Действует до 22:00', 'Действует 48 часов', 'Действует до конца дня'],
    ['uk', 'Діє до 22:00', 'Діє 48 годин', 'Діє до кінця дня'],
    ['es', 'Activo hasta las 22:00', 'Activo durante 48 horas', 'Activo hasta el final del día'],
    ['pt-BR', 'Ativo até às 22:00', 'Ativo por 48 horas', 'Ativo até o fim do dia'],
    ['vi', 'Có hiệu lực đến 22:00', 'Có hiệu lực trong 48 giờ', 'Có hiệu lực đến hết hôm nay'],
    ['id', 'Aktif hingga pukul 22.00', 'Aktif selama 48 jam', 'Aktif hingga akhir hari'],
    ['tr', 'Saat 22.00’ye kadar etkin', '48 saat boyunca etkin', 'Gün sonuna kadar etkin'],
    ['pl', 'Aktywny do 22:00', 'Aktywny przez 48 godzin', 'Aktywny do końca dnia'],
  ] as const)('is truthful for %s', (lang, energy, flashcards, daily) => {
    expect(getBoonActiveStatusText('energy_free_window', lang)).toBe(energy);
    expect(getBoonActiveStatusText('flashcard_friday', lang)).toBe(flashcards);
    expect(getBoonActiveStatusText('double_xp', lang)).toBe(daily);
  });
});

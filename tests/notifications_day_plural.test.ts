// зачем (Ревизор P19 → координатор 15.10): пуши писали «Серия 1 дней», «Серия 21 дней», «racha de 1 días», pl «serię 1 dni».
// Сторож формы слова под число и падежа (_gen — после «из/з/seria», _acc — после «выучил/dodaj»).
import { notifWord } from '../app/notifications';

describe('уведомления: склонение дней и фраз', () => {
  it('ru: 1 день / 2 дня / 5 дней / 11 дней / 21 день / 22 дня; «из 21 дня»', () => {
    expect([1, 2, 5, 11, 21, 22].map((n) => notifWord('ru_day', n))).toEqual(['день', 'дня', 'дней', 'дней', 'день', 'дня']);
    expect([1, 2, 21].map((n) => notifWord('ru_day_gen', n))).toEqual(['дня', 'дней', 'дня']);
  });

  it('uk: 1 день / 2 дні / 5 днів / 21 день; «з 21 дня»', () => {
    expect([1, 2, 5, 21].map((n) => notifWord('uk_day', n))).toEqual(['день', 'дні', 'днів', 'день']);
    expect([1, 5].map((n) => notifWord('uk_day_gen', n))).toEqual(['дня', 'днів']);
  });

  it('pl: «1 dzień z rzędu», «serię 1 dnia», «serię 21 dni»', () => {
    expect([1, 2, 5, 21].map((n) => notifWord('pl_day', n))).toEqual(['dzień', 'dni', 'dni', 'dni']);
    expect([1, 2, 21].map((n) => notifWord('pl_day_gen', n))).toEqual(['dnia', 'dni', 'dni']);
  });

  it('en/es/pt-BR: единственное число только для 1', () => {
    expect([1, 21].map((n) => notifWord('en_day', n))).toEqual(['day', 'days']);
    expect([1, 2].map((n) => notifWord('es_day', n))).toEqual(['día', 'días']);
    expect([1, 2].map((n) => notifWord('pt_day', n))).toEqual(['dia', 'dias']);
  });

  it('фразы: «выучил 1 фразу / 22 фразы», uk «1 вислів», pl «1 zwrot / 22 zwroty / 25 zwrotów», es «1 frase nueva»', () => {
    expect([1, 22, 25].map((n) => notifWord('ru_phrase_acc', n))).toEqual(['фразу', 'фразы', 'фраз']);
    expect(notifWord('uk_phrase_acc', 1)).toBe('вислів');
    expect([1, 22, 25].map((n) => notifWord('pl_phrase_acc', n))).toEqual(['zwrot', 'zwroty', 'zwrotów']);
    expect(notifWord('es_phrase_new', 1)).toBe('frase nueva');
  });

  it('неизвестный ключ — пустое слово с журналом, а не падение', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(notifWord('nope', 3)).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[NOTIF-PLURAL]'));
    warn.mockRestore();
  });
});

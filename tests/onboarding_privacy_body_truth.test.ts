// зачем (5 · ВХОД 3f2d83b85, координатор 26.10): экран «Твои данные — только твои» говорил «никому не передаём» и «данные нужны
// только чтобы сохранить прогресс» — это неправда (политика §16: Firebase/Google, Apple, RevenueCat, OpenAI…). Сторож держит
// правду на всех 9 языках: прежних ложных оборотов нет, «не продаём» и отсылка к Политике есть.
import { readSource } from './helpers/read_source';

const FORBIDDEN = [
  'никому не передаём', 'только чтобы сохранить', // ru
  'нікому не передаємо', 'лише для того, щоб зберегти', // uk
  'share it with anyone', 'only need it to save your progress', // en
  'ni los compartimos con nadie', 'Solo los necesitamos', // es
  'nem os compartilhamos com ninguém', 'Só precisamos deles', // pt-BR
  'hay chia sẻ dữ liệu của bạn với ai', 'Chỉ dùng để lưu tiến độ', // vi
  'membagikan datamu ke siapa pun', 'Data hanya dipakai untuk menyimpan', // id
  'kimseyle paylaşmıyoruz', 'Yalnızca ilerlemeni kaydetmek', // tr
  'nikomu ich nie udostępniamy', 'Potrzebujemy ich tylko', // pl
];

describe('онбординг: privacyBody — правда о данных', () => {
  const src = readSource('components/onboarding/clean_onboarding_copy_core.ts');
  const line = src.split('\n').find((l) => l.trimStart().startsWith('privacyBody: T(')) ?? '';

  it('строка найдена', () => {
    expect(line.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('нет ложного оборота «%s»', (phrase) => {
    expect(line).not.toContain(phrase);
  });

  it('«не продаём» и отсылка к Политике — на всех 9 языках', () => {
    for (const phrase of [
      'Мы не продаём', 'Ми не продаємо', 'We don’t sell your data', 'No vendemos tus datos', 'Não vendemos seus dados',
      'không bán dữ liệu', 'Kami tidak menjual datamu', 'Verilerini satmıyoruz', 'Nie sprzedajemy',
      'Политике конфиденциальности', 'Політиці конфіденційності', 'Privacy Policy', 'Política de privacidad',
      'Política de Privacidade', 'Chính sách quyền riêng tư', 'Kebijakan Privasi', 'Gizlilik Politikası', 'Polityce prywatności',
    ]) expect(line).toContain(phrase);
  });
});

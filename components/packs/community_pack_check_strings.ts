// community_pack_check_strings.ts — тексты экрана «Проверка» набора перед публикацией (CommunityPackCheckScene) на 9 языках.
// зачем (координатор 29.10, Переводчик): экран говорил LP(ru, en) = { ru, uk: en, en, es: en } — украинец, испанец и ещё 5 языков видели
// английский, а «N карточек» склонялось только по-русски. Ключ — русская строка из вызова LP(…), поэтому вызовы на экране не меняются.
// Слова как везде в приложении: tarjetas / cartões / thẻ / kartu / kart / karty.
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';

type Nine = Readonly<{ uk: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }>;

const BY_RU: Readonly<Record<string, Nine>> = {
  'Набор готов к публикации': { uk: 'Набір готовий до публікації', es: 'Listo para publicar', ptBr: 'Pronto para publicar', vi: 'Sẵn sàng đăng', id: 'Siap diterbitkan', tr: 'Yayınlamaya hazır', pl: 'Gotowy do publikacji' },
  'Проверка': { uk: 'Перевірка', es: 'Revisión', ptBr: 'Revisão', vi: 'Kiểm tra', id: 'Pemeriksaan', tr: 'Kontrol', pl: 'Sprawdzenie' },
  'Карточки': { uk: 'Картки', es: 'Tarjetas', ptBr: 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' },
  'Исправлено': { uk: 'Виправлено', es: 'Corregido', ptBr: 'Corrigido', vi: 'Đã sửa', id: 'Sudah diperbaiki', tr: 'Düzeltildi', pl: 'Poprawione' },
  'Исправить': { uk: 'Виправити', es: 'Corregir', ptBr: 'Corrigir', vi: 'Sửa', id: 'Perbaiki', tr: 'Düzelt', pl: 'Popraw' },
  'Отправляем…': { uk: 'Надсилаємо…', es: 'Enviando…', ptBr: 'Enviando…', vi: 'Đang gửi…', id: 'Mengirim…', tr: 'Gönderiliyor…', pl: 'Wysyłamy…' },
  'Повторить публикацию': { uk: 'Повторити публікацію', es: 'Reintentar publicación', ptBr: 'Tentar publicar de novo', vi: 'Đăng lại', id: 'Coba terbitkan lagi', tr: 'Yeniden yayınla', pl: 'Ponów publikację' },
  'Отправить на проверку': { uk: 'Надіслати на перевірку', es: 'Enviar a revisión', ptBr: 'Enviar para revisão', vi: 'Gửi để kiểm duyệt', id: 'Kirim untuk ditinjau', tr: 'İncelemeye gönder', pl: 'Wyślij do weryfikacji' },
  'Добавь слово или фразу': { uk: 'Додай слово або фразу', es: 'Añade una palabra o frase', ptBr: 'Adicione uma palavra ou frase', vi: 'Thêm từ hoặc cụm từ', id: 'Tambahkan kata atau frasa', tr: 'Kelime veya ifade ekle', pl: 'Dodaj słowo lub zwrot' },
};

/** Текст экрана по русскому ключу и английскому варианту из вызова LP(ru, en). Нет перевода — en для всех, кроме ru (как было). */
export function communityCheckText(lang: Lang, ru: string, en: string): string {
  const t = BY_RU[ru];
  if (!t) {
    // голый __DEV__ в тестах — ReferenceError, поэтому через typeof
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[COMMUNITY-CHECK-I18N] нет перевода для «${ru}» — показываю английский`);
    return triLang(lang, { ru, uk: en, en, es: en });
  }
  return triLang(lang, { ru, uk: t.uk, en, es: t.es, 'pt-BR': t.ptBr, vi: t.vi, id: t.id, tr: t.tr, pl: t.pl });
}

/** «Осталось исправить 1 карточку» / «Нужно исправить 5 карточек» — с формой слова для каждого языка. */
export function communityCardsToFix(lang: Lang, n: number): string {
  const f = (one: string, few: string, many: string) => pluralWord(lang, n, { one, few, many }).replace('{n}', String(n));
  return triLang(lang, {
    ru: f('Осталось исправить {n} карточку', 'Нужно исправить {n} карточки', 'Нужно исправить {n} карточек'),
    uk: f('Залишилося виправити {n} картку', 'Потрібно виправити {n} картки', 'Потрібно виправити {n} карток'),
    en: f('{n} card to fix', '{n} cards to fix', '{n} cards to fix'),
    es: f('Falta corregir {n} tarjeta', 'Faltan por corregir {n} tarjetas', 'Faltan por corregir {n} tarjetas'),
    'pt-BR': f('Falta corrigir {n} cartão', 'Faltam corrigir {n} cartões', 'Faltam corrigir {n} cartões'),
    vi: f('Cần sửa {n} thẻ', 'Cần sửa {n} thẻ', 'Cần sửa {n} thẻ'),
    id: f('Perlu diperbaiki: {n} kartu', 'Perlu diperbaiki: {n} kartu', 'Perlu diperbaiki: {n} kartu'),
    tr: f('Düzeltilecek {n} kart', 'Düzeltilecek {n} kart', 'Düzeltilecek {n} kart'),
    pl: f('Do poprawienia: {n} karta', 'Do poprawienia: {n} karty', 'Do poprawienia: {n} kart'),
  });
}

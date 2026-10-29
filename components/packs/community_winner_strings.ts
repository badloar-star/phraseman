// community_winner_strings.ts — тексты окна победителя конкурса «Набор месяца» на 9 языках.
// зачем (владелец 29.10, места 1/2/3 = Plus на 3/2/1 месяца): раньше окно говорило по-русски и по-английски (остальные языки получали английский);
// теперь все 9 языков, срок Plus — тремя готовыми фразами (1, 2, 3 месяца — других сроков у конкурса нет), без склонений по числу.
// Русский и английский — как в выпущенных версиях; остальные — черновик, финальная вычитка — Переводчик.
import { triLang, type Lang } from '../../constants/i18n';

type Nine = Readonly<{ ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string }>;

const T = {
  place: { ru: '{n} МЕСТО', uk: '{n} МІСЦЕ', en: 'PLACE {n}', es: 'PUESTO {n}', ptBr: '{n}º LUGAR', vi: 'HẠNG {n}', id: 'PERINGKAT {n}', tr: '{n}. SIRA', pl: 'MIEJSCE {n}' },
  packOfMonth: { ru: 'Набор месяца', uk: 'Набір місяця', en: 'Pack of the month', es: 'Paquete del mes', ptBr: 'Pacote do mês', vi: 'Bộ thẻ của tháng', id: 'Paket bulan ini', tr: 'Ayın paketi', pl: 'Zestaw miesiąca' },
  received: { ru: 'Награда получена!', uk: 'Нагороду отримано!', en: 'Reward received!', es: '¡Premio recibido!', ptBr: 'Prêmio recebido!', vi: 'Đã nhận thưởng!', id: 'Hadiah diterima!', tr: 'Ödül alındı!', pl: 'Nagroda odebrana!' },
  congrats: { ru: 'Поздравляем!', uk: 'Вітаємо!', en: 'Congratulations!', es: '¡Felicidades!', ptBr: 'Parabéns!', vi: 'Chúc mừng!', id: 'Selamat!', tr: 'Tebrikler!', pl: 'Gratulacje!' },
  yourPack: { ru: 'Твой набор «{title}»', uk: 'Твій набір «{title}»', en: 'Your pack “{title}”', es: 'Tu paquete «{title}»', ptBr: 'Seu pacote “{title}”', vi: 'Bộ thẻ “{title}” của bạn', id: 'Paketmu “{title}”', tr: '“{title}” paketin', pl: 'Twój zestaw „{title}”' },
  won: { ru: 'победил в конкурсе!', uk: 'переміг у конкурсі!', en: 'won the contest!', es: '¡ganó el concurso!', ptBr: 'venceu o concurso!', vi: 'đã thắng cuộc thi!', id: 'memenangkan kontes!', tr: 'yarışmayı kazandı!', pl: 'wygrał konkurs!' },
  finishedPlace: { ru: 'занял {n}-е место!', uk: 'посів {n}-е місце!', en: 'finished in place {n}!', es: '¡quedó en el puesto {n}!', ptBr: 'ficou em {n}º lugar!', vi: 'đạt hạng {n}!', id: 'meraih peringkat {n}!', tr: '{n}. oldu!', pl: 'zajął {n}. miejsce!' },
  plus1: { ru: 'Plus на 1 месяц', uk: 'Plus на 1 місяць', en: 'Plus for 1 month', es: 'Plus por 1 mes', ptBr: 'Plus por 1 mês', vi: 'Plus 1 tháng', id: 'Plus 1 bulan', tr: '1 ay Plus', pl: 'Plus na 1 miesiąc' },
  plus2: { ru: 'Plus на 2 месяца', uk: 'Plus на 2 місяці', en: 'Plus for 2 months', es: 'Plus por 2 meses', ptBr: 'Plus por 2 meses', vi: 'Plus 2 tháng', id: 'Plus 2 bulan', tr: '2 ay Plus', pl: 'Plus na 2 miesiące' },
  plus3: { ru: 'Plus на 3 месяца', uk: 'Plus на 3 місяці', en: 'Plus for 3 months', es: 'Plus por 3 meses', ptBr: 'Plus por 3 meses', vi: 'Plus 3 tháng', id: 'Plus 3 bulan', tr: '3 ay Plus', pl: 'Plus na 3 miesiące' },
  coins: { ru: '{n} монет', uk: '{n} монет', en: '{n} coins', es: '{n} monedas', ptBr: '{n} moedas', vi: '{n} xu', id: '{n} koin', tr: '{n} jeton', pl: '{n} monet' },
  saved: { ru: 'Приз сохранён. Не удалось получить подтверждение — попробуй ещё раз.', uk: 'Приз збережено. Не вдалося отримати підтвердження — спробуй ще раз.', en: 'Your prize is saved. Confirmation failed — please try again.', es: 'Tu premio está guardado. No se pudo confirmar: inténtalo de nuevo.', ptBr: 'Seu prêmio está salvo. Não foi possível confirmar — tente novamente.', vi: 'Phần thưởng đã được lưu. Không xác nhận được — hãy thử lại.', id: 'Hadiahmu tersimpan. Konfirmasi gagal — coba lagi.', tr: 'Ödülün kaydedildi. Onay alınamadı — tekrar dene.', pl: 'Nagroda jest zapisana. Nie udało się potwierdzić — spróbuj ponownie.' },
  great: { ru: 'Отлично!', uk: 'Чудово!', en: 'Great!', es: '¡Genial!', ptBr: 'Ótimo!', vi: 'Tuyệt!', id: 'Mantap!', tr: 'Harika!', pl: 'Świetnie!' },
  claiming: { ru: 'Получаем награду…', uk: 'Отримуємо нагороду…', en: 'Claiming reward…', es: 'Recibiendo el premio…', ptBr: 'Recebendo o prêmio…', vi: 'Đang nhận thưởng…', id: 'Mengambil hadiah…', tr: 'Ödül alınıyor…', pl: 'Odbieramy nagrodę…' },
  retry: { ru: 'Повторить', uk: 'Повторити', en: 'Try again', es: 'Reintentar', ptBr: 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' },
  claim: { ru: 'Забрать приз', uk: 'Забрати приз', en: 'Claim prize', es: 'Recibir premio', ptBr: 'Receber prêmio', vi: 'Nhận quà', id: 'Ambil hadiah', tr: 'Ödülü al', pl: 'Odbierz nagrodę' },
  later: { ru: 'Позже', uk: 'Пізніше', en: 'Later', es: 'Más tarde', ptBr: 'Depois', vi: 'Để sau', id: 'Nanti', tr: 'Sonra', pl: 'Później' },
} satisfies Record<string, Nine>;

export type CommunityWinnerTextKey = keyof typeof T;

export function winnerText(lang: Lang, key: CommunityWinnerTextKey, vars: Readonly<Record<string, number | string>> = {}): string {
  const v = T[key];
  const text = triLang(lang, { ru: v.ru, uk: v.uk, en: v.en, es: v.es, 'pt-BR': v.ptBr, vi: v.vi, id: v.id, tr: v.tr, pl: v.pl });
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''));
}

/** Для сторожа: все ключи и все 9 языков заполнены. */
export const COMMUNITY_WINNER_TEXTS = T;

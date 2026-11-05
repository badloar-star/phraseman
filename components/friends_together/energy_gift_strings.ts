// energy_gift_strings.ts — тексты «Подарка энергии» (идея 9 «Друзей», владелец 05.11: разрешить с лимитом) на 9 языков.
// Источник: docs/work/gift_energy_strings_9lang.md (Переводчик, d4ed7e543); порядок языков: ru, uk, en, es, pt-BR, vi, id, tr, pl. Стиль «ты», без рода, плейсхолдеров нет.
// Клиент за флагом energy_gift_enabled (по умолчанию выключен): см. docs/work/tasks/energy-gift-design-2026-11-05.md.
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const GIFT_STRINGS = {
  giftSend: ['Подарить +1', 'Подарувати +1', 'Gift +1', 'Regalar +1', 'Presentear +1', 'Tặng +1', 'Hadiahkan +1', '+1 hediye et', 'Podaruj +1'],
  giftSent: ['Отправлено', 'Надіслано', 'Sent', 'Enviado', 'Enviado', 'Đã gửi', 'Terkirim', 'Gönderildi', 'Wysłano'],
  giftIncoming: ['Друг прислал +1 энергии', 'Друг надіслав +1 енергії', 'A friend sent you +1 energy', 'Un amigo te envió +1 de energía', 'Um amigo enviou +1 de energia', 'Bạn đã gửi cho bạn +1 năng lượng', 'Temanmu mengirim +1 energi', 'Bir arkadaşın +1 enerji gönderdi', 'Przyjaciel przysłał +1 energii'],
  giftClaim: ['Забрать', 'Забрати', 'Claim', 'Recoger', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz'],
  giftErrSender: ['Сегодня подарок уже отправлен — завтра снова', 'Сьогодні подарунок уже надіслано — завтра знову', 'Already gifted today — try tomorrow', 'Ya enviaste hoy — mañana de nuevo', 'Já enviado hoje — amanhã de novo', 'Hôm nay đã tặng rồi — mai lại được', 'Sudah memberi hari ini — besok lagi', 'Bugün zaten gönderildi — yarın yine', 'Dzisiaj już wysłano — jutro znowu'],
  giftErrReceiver: ['Другу сегодня уже подарили три раза', 'Другу сьогодні вже подарували тричі', 'Your friend already got three gifts today', 'Tu amigo ya recibió tres regalos hoy', 'Seu amigo já recebeu três presentes hoje', 'Bạn ấy hôm nay đã nhận đủ ba lần tặng', 'Temanmu sudah menerima tiga hadiah hari ini', 'Arkadaşın bugün zaten üç hediye aldı', 'Przyjaciel dziś dostał już trzy prezenty'],
  giftErrPoolFull: ['Копилка полна — подарок подождёт 7 дней', 'Скарбничка повна — подарунок почекає 7 днів', 'Energy jar is full — the gift waits 7 days', 'El bote está lleno — el regalo espera 7 días', 'O cofrinho está cheio — o presente espera 7 dias', 'Hũ đã đầy — quà sẽ chờ 7 ngày', 'Celengan penuh — hadiah menunggu 7 hari', 'Kumbara dolu — hediye 7 gün bekler', 'Skarbonka pełna — prezent poczeka 7 dni'],
  giftErrPlus: ['У друга Plus — энергия не тратится', 'У друга Plus — енергія не витрачається', 'Your friend has Plus — no energy is spent', 'Tu amigo tiene Plus — no se gasta energía', 'Seu amigo tem Plus — nenhuma energia é gasta', 'Bạn có Plus — không tốn năng lượng', 'Temanmu punya Plus — energi tidak terpakai', 'Arkadaşında Plus var — enerji harcanmaz', 'Przyjaciel ma Plus — energia się nie zużywa'],
  giftErrNotFriends: ['Дарить можно только друзьям', 'Дарувати можна лише друзям', 'You can only gift friends', 'Solo puedes regalar a amigos', 'Você só pode presentear amigos', 'Chỉ tặng được bạn bè', 'Kamu hanya bisa memberi hadiah ke teman', 'Yalnızca arkadaşlarına hediye verebilirsin', 'Prezenty można dawać tylko przyjaciołom'],
  giftErrTooNew: ['Дружба меньше суток — подарок откроется завтра', 'Дружба менше доби — подарунок відкриється завтра', 'Friends for under a day — the gift opens tomorrow', 'Amigos desde hace menos de un día — el regalo se abre mañana', 'Amigos há menos de um dia — o presente abre amanhã', 'Mới kết bạn chưa đầy một ngày — quà mở vào ngày mai', 'Baru berteman kurang dari sehari — hadiah dibuka besok', 'Arkadaş olalı bir gün bile olmadı — hediye yarın açılır', 'Znajomość krótsza niż dzień — prezent otworzy się jutro'],
  giftErrGeneric: ['Не получилось. Попробуй ещё раз', 'Не вдалося. Спробуй ще раз', "Didn't work. Try again", 'No funcionó. Inténtalo de nuevo', 'Não deu certo. Tente de novo', 'Không thành công. Thử lại nhé', 'Gagal. Coba lagi', 'Olmadı. Tekrar dene', 'Nie udało się. Spróbuj ponownie'],
} as const satisfies Readonly<Record<string, Nine>>;

export type EnergyGiftStringKey = keyof typeof GIFT_STRINGS;
export const ENERGY_GIFT_STRING_KEYS = Object.keys(GIFT_STRINGS) as readonly EnergyGiftStringKey[];

/** Текст на языке интерфейса; неизвестный язык — английский (как в остальных строках Пика). */
export function energyGiftText(lang: Lang | string, key: EnergyGiftStringKey): string {
  const i = LANG_INDEX[lang as string] ?? LANG_INDEX.en;
  return GIFT_STRINGS[key][i];
}

/** Причина отказа сервера (`reason` из energyGiftSend) → ключ сообщения; незнакомая причина — общая ошибка. */
export function energyGiftErrorKey(reason: string | null | undefined): EnergyGiftStringKey {
  switch (reason) {
    case 'limit_sender': return 'giftErrSender';
    case 'limit_receiver': return 'giftErrReceiver';
    case 'recipient_plus': return 'giftErrPlus';
    case 'not_friends': return 'giftErrNotFriends';
    case 'too_new': return 'giftErrTooNew';
    case 'pool_full': return 'giftErrPoolFull';
    default: return 'giftErrGeneric';
  }
}

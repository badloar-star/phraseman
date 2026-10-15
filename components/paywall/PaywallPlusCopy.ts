// ════════════════════════════════════════════════════════════════════════════
// PaywallPlusCopy.ts — все тексты единственного пейвола Plus на 9 языках.
//
// зачем (владелец 2026-09-30, макет paywall-v3.html «Честный пробный период»):
// один пейвол вместо A–G. Длительность пробного и цены сюда ПРИХОДЯТ из магазина
// (usePaywallPurchase) — ни одной захардкоженной длительности или цены здесь нет.
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

export type L9 = Readonly<{
  ru: string; uk: string; en: string; es: string; 'pt-BR': string;
  vi: string; id: string; tr: string; pl: string;
}>;

/** Позиционный хелпер: ru, uk, en, es, pt-BR, vi, id, tr, pl. */
export const LP = (
  ru: string, uk: string, en: string, es: string, ptBR: string,
  vi: string, id: string, tr: string, pl: string,
): L9 => ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

export const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

/** «N дней» с правильной формой слова на каждом языке. */
export function daysWord(lang: Lang, n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const slavicFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20);
  switch (lang) {
    case 'ru': return mod10 === 1 && mod100 !== 11 ? 'день' : slavicFew ? 'дня' : 'дней';
    case 'uk': return mod10 === 1 && mod100 !== 11 ? 'день' : slavicFew ? 'дні' : 'днів';
    case 'pl': return n === 1 ? 'dzień' : 'dni';
    case 'es': return n === 1 ? 'día' : 'días';
    case 'pt-BR': return n === 1 ? 'dia' : 'dias';
    case 'vi': return 'ngày';
    case 'id': return 'hari';
    case 'tr': return 'gün';
    default: return n === 1 ? 'day' : 'days';
  }
}

const withDays = (lang: Lang, n: number, template: L9): string =>
  pick(lang, template).replace('{n}', String(n)).replace('{days}', daysWord(lang, n));

export const heroTrialTitle = (lang: Lang, n: number): string => withDays(lang, n, LP(
  'Plus бесплатно на {n} {days}', 'Plus безкоштовно на {n} {days}', 'Plus free for {n} {days}',
  'Plus gratis durante {n} {days}', 'Plus grátis por {n} {days}', 'Plus miễn phí {n} {days}',
  'Plus gratis {n} {days}', '{n} {days} ücretsiz Plus', 'Plus za darmo przez {n} {days}',
));

export const trialFreeLabel = (lang: Lang, n: number): string => withDays(lang, n, LP(
  '{n} {days} бесплатно', '{n} {days} безкоштовно', '{n} {days} free', '{n} {days} gratis', '{n} {days} grátis',
  '{n} {days} miễn phí', '{n} {days} gratis', '{n} {days} ücretsiz', '{n} {days} za darmo',
));

export const ctaStartTrial = (lang: Lang, n: number): string => withDays(lang, n, LP(
  'Начать {n} {days} бесплатно', 'Почати {n} {days} безкоштовно', 'Start {n} {days} free',
  'Empezar {n} {days} gratis', 'Começar {n} {days} grátis', 'Bắt đầu {n} {days} miễn phí',
  'Mulai {n} {days} gratis', '{n} {days} ücretsiz başla', 'Zacznij {n} {days} za darmo',
));

const withValue = (lang: Lang, value: string | number, template: L9): string =>
  pick(lang, template).replace('{v}', String(value));

export const ctaBuyYear = (lang: Lang, price: string): string => withValue(lang, price, LP(
  'Оформить за {v} в год', 'Оформити за {v} на рік', 'Subscribe for {v} a year', 'Suscribirse por {v} al año',
  'Assinar por {v} por ano', 'Đăng ký {v} mỗi năm', 'Berlangganan {v} per tahun', 'Yıllık {v} ile abone ol',
  'Subskrybuj za {v} rocznie',
));

export const ctaBuyMonth = (lang: Lang, price: string): string => withValue(lang, price, LP(
  'Оформить за {v} в месяц', 'Оформити за {v} на місяць', 'Subscribe for {v} a month', 'Suscribirse por {v} al mes',
  'Assinar por {v} por mês', 'Đăng ký {v} mỗi tháng', 'Berlangganan {v} per bulan', 'Aylık {v} ile abone ol',
  'Subskrybuj za {v} miesięcznie',
));

export const fineAfterTrial = (lang: Lang, price: string): string => withValue(lang, price, LP(
  'Затем {v} в год · Отмена в любой момент', 'Потім {v} на рік · Скасування будь-коли',
  'Then {v} a year · Cancel anytime', 'Después {v} al año · Cancela cuando quieras',
  'Depois {v} por ano · Cancele quando quiser', 'Sau đó {v} mỗi năm · Hủy bất cứ lúc nào',
  'Lalu {v} per tahun · Batalkan kapan saja', 'Sonra yıllık {v} · İstediğin zaman iptal',
  'Potem {v} rocznie · Anuluj w każdej chwili',
));

export const fineThenMonth = (lang: Lang, price: string): string => withValue(lang, price, LP(
  'Затем {v} в месяц · Отмена в любой момент', 'Потім {v} на місяць · Скасування будь-коли',
  'Then {v} a month · Cancel anytime', 'Después {v} al mes · Cancela cuando quieras',
  'Depois {v} por mês · Cancele quando quiser', 'Sau đó {v} mỗi tháng · Hủy bất cứ lúc nào',
  'Lalu {v} per bulan · Batalkan kapan saja', 'Sonra aylık {v} · İstediğin zaman iptal',
  'Potem {v} miesięcznie · Anuluj w każdej chwili',
));

export const yearPerMonthApprox = (lang: Lang, perMonth: string): string => withValue(lang, perMonth, LP(
  '≈ {v} в месяц', '≈ {v} на місяць', '≈ {v} a month', '≈ {v} al mes', '≈ {v} por mês',
  '≈ {v} mỗi tháng', '≈ {v} per bulan', 'Aylık ≈ {v}', '≈ {v} miesięcznie',
));

export const reminderDayTitle = (lang: Lang, day: number): string => withValue(lang, day, LP(
  'День {v}', 'День {v}', 'Day {v}', 'Día {v}', 'Dia {v}', 'Ngày {v}', 'Hari ke-{v}', '{v}. gün', 'Dzień {v}',
));

export const chargeLine = (lang: Lang, price: string): string => withValue(lang, price, LP(
  'Списание {v}. Отменить можно в любой момент до этого',
  'Списання {v}. Скасувати можна будь-коли до цього',
  'You are charged {v}. Cancel anytime before that',
  'Se cobra {v}. Puedes cancelar en cualquier momento antes',
  'Cobrança de {v}. Cancele a qualquer momento antes disso',
  'Tính phí {v}. Bạn có thể hủy bất cứ lúc nào trước đó',
  'Tagihan {v}. Batalkan kapan saja sebelum itu',
  '{v} tahsil edilir. Öncesinde istediğin zaman iptal edebilirsin',
  'Pobierzemy {v}. Do tego czasu możesz anulować w każdej chwili',
));

export const compareMore = (lang: Lang, count: number): string => withValue(lang, count, LP(
  'Все {v} возможностей', 'Усі {v} можливостей', 'All {v} features', 'Las {v} funciones', 'Todos os {v} recursos',
  'Cả {v} tính năng', 'Semua {v} fitur', '{v} özelliğin tümü', 'Wszystkie {v} funkcji',
));

export const COPY = {
  kicker: LP('PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS', 'PHRASEMAN PLUS'),
  close: LP('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'),
  heroTrialSub: LP(
    'Напомним за 2 дня до списания. Отмена в один тап.',
    'Нагадаємо за 2 дні до списання. Скасування в один тап.',
    "We'll remind you 2 days before the charge. Cancel in one tap.",
    'Te avisaremos 2 días antes del cobro. Cancela con un toque.',
    'Avisaremos 2 dias antes da cobrança. Cancele com um toque.',
    'Chúng tôi nhắc bạn 2 ngày trước khi tính phí. Hủy chỉ với một chạm.',
    'Kami ingatkan 2 hari sebelum penagihan. Batalkan dengan satu ketukan.',
    'Ödemeden 2 gün önce hatırlatırız. Tek dokunuşla iptal.',
    'Przypomnimy 2 dni przed opłatą. Anulujesz jednym dotknięciem.',
  ),
  heroNoTrial: LP(
    'Всё в PhraseMan — без ограничений', 'Усе в PhraseMan — без обмежень', 'All of PhraseMan, without limits',
    'Todo PhraseMan, sin límites', 'Todo o PhraseMan, sem limites', 'Toàn bộ PhraseMan, không giới hạn',
    'Semua PhraseMan tanpa batas', "PhraseMan'in tamamı, sınırsız", 'Cały PhraseMan bez ograniczeń',
  ),
  today: LP('Сегодня', 'Сьогодні', 'Today', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dziś'),
  todayDetail: LP(
    'Открывается всё, что есть в Plus', 'Відкривається все, що є в Plus', 'Everything in Plus unlocks',
    'Se desbloquea todo lo de Plus', 'Tudo do Plus é liberado', 'Mở toàn bộ tính năng Plus',
    'Semua fitur Plus terbuka', "Plus'taki her şey açılır", 'Odblokowujesz wszystko z Plus',
  ),
  reminderDetail: LP(
    'Пришлём напоминание, что пробный период заканчивается', 'Надішлемо нагадування, що пробний період закінчується',
    "We'll remind you that the trial is ending", 'Te recordaremos que la prueba está por terminar',
    'Enviaremos um lembrete de que o teste está acabando', 'Chúng tôi sẽ nhắc rằng thời gian dùng thử sắp hết',
    'Kami kirim pengingat bahwa uji coba akan berakhir', 'Denemenin bittiğini hatırlatırız',
    'Przypomnimy, że okres próbny się kończy',
  ),
  year: LP('Год', 'Рік', 'Year', 'Año', 'Ano', 'Năm', 'Tahun', 'Yıllık', 'Rok'),
  month: LP('Месяц', 'Місяць', 'Month', 'Mes', 'Mês', 'Tháng', 'Bulan', 'Aylık', 'Miesiąc'),
  bestValue: LP('Выгоднее всего', 'Найвигідніше', 'Best value', 'Mejor precio', 'Melhor valor', 'Tiết kiệm nhất', 'Paling hemat', 'En avantajlı', 'Najlepsza oferta'),
  // зачем (решение владельца 05.10, overlays-more.html OM-PROMO-PRESENT): плашка скидки стора над тарифами.
  promoNow: LP('Скидка действует сейчас', 'Знижка діє зараз', 'Discount active now', 'Descuento activo ahora', 'Desconto ativo agora', 'Đang giảm giá', 'Diskon berlaku sekarang', 'İndirim şu an geçerli', 'Zniżka obowiązuje teraz'),
  promoThen: LP('далее', 'далі', 'then', 'después', 'depois', 'sau đó', 'lalu', 'sonra', 'potem'),
  perYear: LP('в год', 'на рік', 'a year', 'al año', 'por ano', 'mỗi năm', 'per tahun', 'yıllık', 'rocznie'),
  perMonth: LP('в месяц', 'на місяць', 'a month', 'al mes', 'por mês', 'mỗi tháng', 'per bulan', 'aylık', 'miesięcznie'),
  noTrial: LP('Без пробного периода', 'Без пробного періоду', 'No free trial', 'Sin prueba gratis', 'Sem teste grátis', 'Không có dùng thử', 'Tanpa uji coba', 'Deneme süresi yok', 'Bez okresu próbnego'),
  fineYear: LP(
    'Продлевается каждый год · Отмена в любой момент', 'Подовжується щороку · Скасування будь-коли',
    'Renews every year · Cancel anytime', 'Se renueva cada año · Cancela cuando quieras',
    'Renova todo ano · Cancele quando quiser', 'Tự gia hạn mỗi năm · Hủy bất cứ lúc nào',
    'Diperpanjang tiap tahun · Batalkan kapan saja', 'Her yıl yenilenir · İstediğin zaman iptal',
    'Odnawia się co rok · Anuluj w każdej chwili',
  ),
  fineMonth: LP(
    'Продлевается каждый месяц · Отмена в любой момент', 'Подовжується щомісяця · Скасування будь-коли',
    'Renews every month · Cancel anytime', 'Se renueva cada mes · Cancela cuando quieras',
    'Renova todo mês · Cancele quando quiser', 'Tự gia hạn mỗi tháng · Hủy bất cứ lúc nào',
    'Diperpanjang tiap bulan · Batalkan kapan saja', 'Her ay yenilenir · İstediğin zaman iptal',
    'Odnawia się co miesiąc · Anuluj w każdej chwili',
  ),
  wait: LP('Подожди…', 'Зачекай…', 'Please wait…', 'Espera…', 'Aguarde…', 'Vui lòng chờ…', 'Mohon tunggu…', 'Lütfen bekle…', 'Chwileczkę…'),
  // зачем (D158): тихие строки без красного и без иконки ошибки — цены недоступны, кнопка всё равно жива.
  tryInMinute: LP('Попробуй через минуту', 'Спробуй за хвилину', 'Try again in a minute', 'Inténtalo en un minuto', 'Tente de novo em um minuto', 'Hãy thử lại sau một phút', 'Coba lagi dalam semenit', 'Bir dakika sonra tekrar dene', 'Spróbuj za minutę'),
  getPlus: LP('Оформить Plus', 'Оформити Plus', 'Get Plus', 'Obtener Plus', 'Assinar o Plus', 'Đăng ký Plus', 'Dapatkan Plus', "Plus'a geç", 'Wykup Plus'),
  // зачем (владелец 11.10, пейволы): на месте цен — «Цены сейчас недоступны» + «Повторить» (раньше общее «Сейчас недоступно» и тихий повтор)
  // зачем (владелец 11.10: «цены должны показываться всё равно, везде»; Ядро a0a910e9d): на плитке стоит справочная цена, а не живая из магазина.
  // Честно говорим об этом: перед ценой «≈», под плитками — короткая тихая строка. Живая цена и последняя настоящая из кэша — без «≈».
  priceWillConfirm: LP('Цена уточнится в магазине', 'Ціна уточниться в магазині', 'The price will be confirmed in the store', 'El precio se confirmará en la tienda', 'O preço será confirmado na loja', 'Giá sẽ được xác nhận trong cửa hàng', 'Harga akan dikonfirmasi di toko', 'Fiyat mağazada kesinleşecek', 'Cena zostanie potwierdzona w sklepie'),
  fineNoPrices: LP('Кнопка работает и без цен — цена покажется в магазине.', 'Кнопка працює і без цін — ціна з’явиться в магазині.', 'The button works without prices — the price shows in the store.', 'El botón funciona sin precios: el precio se muestra en la tienda.', 'O botão funciona sem preços — o preço aparece na loja.', 'Nút vẫn hoạt động khi chưa có giá — giá hiện trong cửa hàng.', 'Tombol tetap berfungsi tanpa harga — harga tampil di toko.', 'Düğme fiyat olmadan da çalışır — fiyat mağazada görünür.', 'Przycisk działa także bez cen — cena pojawi się w sklepie.'),
  // зачем (Ядро a56214453, координатор 11.10): магазин недоступен на устройстве (эмулятор без Google Play) — своя строка вместо «Проверь интернет»;
  // «Предпросмотр цен» — подпись кнопки в dev-сборке, когда цены подставлены для вёрстки и магазин на тапе не зовётся.
  storeUnavailable: LP('Магазин недоступен на этом устройстве', 'Магазин недоступний на цьому пристрої', 'The store isn’t available on this device', 'La tienda no está disponible en este dispositivo', 'A loja não está disponível neste dispositivo', 'Cửa hàng không khả dụng trên thiết bị này', 'Toko tidak tersedia di perangkat ini', 'Mağaza bu cihazda kullanılamıyor', 'Sklep jest niedostępny na tym urządzeniu'),
  pricesPreview: LP('Предпросмотр цен', 'Попередній перегляд цін', 'Price preview', 'Vista previa de precios', 'Prévia dos preços', 'Xem trước giá', 'Pratinjau harga', 'Fiyat önizlemesi', 'Podgląd cen'),
  whatsIncluded: LP('ЧТО ВХОДИТ', 'ЩО ВХОДИТЬ', "WHAT'S INCLUDED", 'QUÉ INCLUYE', 'O QUE ESTÁ INCLUÍDO', 'BAO GỒM', 'YANG KAMU DAPAT', 'NELER DAHİL', 'CO ZAWIERA'),
  freeVsPlus: LP('FREE И PLUS', 'FREE І PLUS', 'FREE VS PLUS', 'FREE Y PLUS', 'FREE E PLUS', 'FREE VÀ PLUS', 'FREE DAN PLUS', 'FREE VE PLUS', 'FREE I PLUS'),
  free: LP('FREE', 'FREE', 'FREE', 'FREE', 'FREE', 'FREE', 'FREE', 'FREE', 'FREE'),
  plus: LP('PLUS', 'PLUS', 'PLUS', 'PLUS', 'PLUS', 'PLUS', 'PLUS', 'PLUS', 'PLUS'),
  collapse: LP('Свернуть', 'Згорнути', 'Show less', 'Mostrar menos', 'Mostrar menos', 'Thu gọn', 'Ciutkan', 'Daha az', 'Zwiń'),
  restore: LP('Восстановить', 'Відновити', 'Restore', 'Restaurar', 'Restaurar', 'Khôi phục', 'Pulihkan', 'Geri yükle', 'Przywróć'),
  restoring: LP('Восстанавливаем…', 'Відновлюємо…', 'Restoring…', 'Restaurando…', 'Restaurando…', 'Đang khôi phục…', 'Memulihkan…', 'Geri yükleniyor…', 'Przywracamy…'),
  terms: LP('Условия', 'Умови', 'Terms', 'Términos', 'Termos', 'Điều khoản', 'Ketentuan', 'Koşullar', 'Warunki'),
  privacy: LP('Конфиденциальность', 'Конфіденційність', 'Privacy', 'Privacidad', 'Privacidade', 'Quyền riêng tư', 'Privasi', 'Gizlilik', 'Prywatność'),
  // Экран после покупки (макет AB).
  afterTitle: LP(
    'Plus твой. Напомнить о конце пробного периода?', 'Plus твій. Нагадати про кінець пробного періоду?',
    'Plus is yours. Remind you before the trial ends?', 'Plus es tuyo. ¿Te avisamos antes de que acabe la prueba?',
    'O Plus é seu. Quer um lembrete antes do fim do teste?', 'Plus là của bạn. Nhắc bạn trước khi hết dùng thử?',
    'Plus milikmu. Mau diingatkan sebelum uji coba berakhir?', 'Plus artık senin. Deneme bitmeden hatırlatalım mı?',
    'Plus jest twój. Przypomnieć przed końcem okresu próbnego?',
  ),
  afterBody: LP(
    'Пришлём одно уведомление за 2 дня до списания — чтобы ты спокойно решил(а), оставлять ли подписку.',
    'Надішлемо одне сповіщення за 2 дні до списання — щоб ти спокійно вирішив(ла), чи залишати підписку.',
    "We'll send one notification 2 days before the charge so you can decide calmly whether to keep the subscription.",
    'Te enviaremos un aviso 2 días antes del cobro para que decidas con calma si mantienes la suscripción.',
    'Enviaremos uma notificação 2 dias antes da cobrança para você decidir com calma se mantém a assinatura.',
    'Chúng tôi gửi một thông báo 2 ngày trước khi tính phí để bạn thong thả quyết định có giữ gói hay không.',
    'Kami kirim satu notifikasi 2 hari sebelum penagihan agar kamu bisa tenang memutuskan lanjut atau tidak.',
    'Ödemeden 2 gün önce tek bir bildirim göndeririz; aboneliği sürdürüp sürdürmeyeceğine rahatça karar verirsin.',
    'Wyślemy jedno powiadomienie 2 dni przed opłatą, żeby spokojnie zdecydować, czy zostać przy subskrypcji.',
  ),
  afterAllow: LP('Разрешить напоминание', 'Дозволити нагадування', 'Allow reminder', 'Permitir aviso', 'Permitir lembrete', 'Cho phép nhắc', 'Izinkan pengingat', 'Hatırlatmaya izin ver', 'Zezwól na przypomnienie'),
  afterNotNow: LP('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Để sau', 'Nanti saja', 'Şimdi değil', 'Nie teraz'),
} as const;

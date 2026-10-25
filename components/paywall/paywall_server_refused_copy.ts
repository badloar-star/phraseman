// ═══════════════════════════════════════════════════════════════════════════
// paywall_server_refused_copy.ts — тексты кнопок окна «Не видим твой Plus» (вход «сервер отказал») на 9 языках.
//
// зачем (координатор 25.10; Ядро c161d894a дало контекст и заголовок/подзаголовок): три кнопки и состояния восстановления.
// Порядок как везде: ru, uk, en, es, pt-BR, vi, id, tr, pl. «Восстановить покупки» в строках Ядра переведено так же (paywall_copy).
// ⚠ ЖДУТ УТВЕРЖДЕНИЯ ПЕРЕВОДЧИКА (10): ru — по макету Макетов (paywalls-context-real.html, раздел 4); остальные — черновики.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  /** Первая кнопка. */
  restore: ['Восстановить покупки', 'Відновити покупки', 'Restore purchases', 'Restaurar compras', 'Restaurar compras', 'Khôi phục giao dịch', 'Pulihkan pembelian', 'Satın alımları geri yükle', 'Przywróć zakupy'],
  /** Пока идёт восстановление. */
  restoring: ['Ищем покупки…', 'Шукаємо покупки…', 'Looking for purchases…', 'Buscando compras…', 'Procurando compras…', 'Đang tìm giao dịch…', 'Mencari pembelian…', 'Satın alımlar aranıyor…', 'Szukamy zakupów…'],
  /** Plus вернулся (окно закроется само). */
  restored: ['Plus вернулся', 'Plus повернувся', 'Plus is back', 'Plus de vuelta', 'O Plus voltou', 'Plus đã trở lại', 'Plus kembali', 'Plus geri geldi', 'Plus wrócił'],
  /** Восстановление закончилось, покупок нет. */
  notFound: ['Покупок не нашли', 'Покупок не знайшли', 'No purchases found', 'No encontramos compras', 'Nenhuma compra encontrada', 'Không tìm thấy giao dịch', 'Pembelian tidak ditemukan', 'Satın alım bulunamadı', 'Nie znaleźliśmy zakupów'],
  /** Вторая кнопка без цены (когда цены ещё не пришли). */
  getPlus: ['Оформить Plus', 'Оформити Plus', 'Get Plus', 'Obtener Plus', 'Assinar o Plus', 'Đăng ký Plus', 'Dapatkan Plus', "Plus'a geç", 'Wykup Plus'],
  /** Третья ссылка. */
  notNow: ['Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Để sau', 'Nanti saja', 'Şimdi değil', 'Nie teraz'],
} as const satisfies Record<string, Nine>;

export type PaywallServerRefusedKey = keyof typeof S;

export function paywallServerRefusedText(lang: Lang, key: PaywallServerRefusedKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

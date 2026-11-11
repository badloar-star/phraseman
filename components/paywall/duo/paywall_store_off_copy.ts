// paywall_store_off_copy.ts — тексты и правило выхода для окна Plus «магазин недоступен» (без React Native: модуль читает и тест).
// зачем (владелец 11.11, макет docs/work/mockups/paywall-store-unavailable-2026-11-11/index.html): тексты на 9 языках, ссылка на бота и
// выбор выхода по платформе лежат отдельно от разметки (PaywallDuoStoreOff.tsx), чтобы сторож проверял их без подмен экрана.
import { LP } from '../PaywallPlusCopy';

/** Бот оплаты Plus. В адресе нет ни uid, ни других данных человека — только имя бота. */
export const PREMIUM_TELEGRAM_BOT_URL = 'https://t.me/PhrasemanPremiumBot';

/**
 * Какой выход показываем: Telegram — только Android; на остальных платформах — поддержка.
 * зачем: Google с 02.08.2022 не требует своего биллинга для платежей пользователей из России; у Apple упоминание стороннего
 * способа оплаты в приложении вне США — нарушение 3.1.1, поэтому на iPhone бота в окне нет.
 */
export type StoreOffRoute = 'telegram' | 'support';
export function storeOffRoute(platform: string): StoreOffRoute {
  return platform === 'android' ? 'telegram' : 'support';
}

export const STORE_OFF_COPY = {
  telegramTitle: LP('Оплатить через Telegram', 'Оплатити через Telegram', 'Pay via Telegram', 'Pagar por Telegram', 'Pagar pelo Telegram', 'Thanh toán qua Telegram', 'Bayar lewat Telegram', 'Telegram ile öde', 'Zapłać przez Telegram'),
  telegramSub: LP('Способы оплаты и код — в боте', 'Способи оплати і код — у боті', 'Payment options and your code are in the bot', 'Formas de pago y código, en el bot', 'Formas de pagamento e código no bot', 'Cách thanh toán và mã nằm trong bot', 'Cara bayar dan kode ada di bot', 'Ödeme yolları ve kod botta', 'Sposoby płatności i kod — w bocie'),
  supportTitle: LP('Написать в поддержку', 'Написати в підтримку', 'Contact support', 'Escribir a soporte', 'Falar com o suporte', 'Liên hệ hỗ trợ', 'Hubungi dukungan', 'Desteğe yaz', 'Napisz do wsparcia'),
  supportSub: LP('Подскажем, как оформить Plus', 'Підкажемо, як оформити Plus', 'We’ll tell you how to get Plus', 'Te diremos cómo obtener Plus', 'Vamos explicar como assinar o Plus', 'Chúng tôi sẽ chỉ cách đăng ký Plus', 'Kami bantu cara mendapatkan Plus', 'Plus’ı nasıl alacağını anlatırız', 'Podpowiemy, jak włączyć Plus'),
  codeTitle: LP('У меня есть код', 'У мене є код', 'I have a code', 'Tengo un código', 'Tenho um código', 'Tôi có mã', 'Saya punya kode', 'Kodum var', 'Mam kod'),
  codeSub: LP('Plus включится сразу', 'Plus увімкнеться одразу', 'Plus turns on right away', 'Plus se activa al instante', 'O Plus ativa na hora', 'Plus bật ngay', 'Plus langsung aktif', 'Plus hemen açılır', 'Plus włączy się od razu'),
  fine: LP('Магазин на этом устройстве недоступен', 'Магазин на цьому пристрої недоступний', 'The store isn’t available on this device', 'La tienda no está disponible en este dispositivo', 'A loja não está disponível neste dispositivo', 'Cửa hàng không khả dụng trên thiết bị này', 'Toko tidak tersedia di perangkat ini', 'Mağaza bu cihazda kullanılamıyor', 'Sklep jest niedostępny na tym urządzeniu'),
} as const;

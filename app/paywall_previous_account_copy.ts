// ═════════════════════════════════════════════════════════════════════
// paywall_previous_account_copy.ts — текст окна «покупка на предыдущем аккаунте» (ревью fa6648f02, пункт 1: честность текста про деньги).
//
// зачем: окно звали из трёх мест, но утверждало одно и то же («Покупка оформлена на предыдущий аккаунт… Платить заново не нужно»). Это верно только когда магазин ПОДТВЕРДИЛ оплату
// (доступ не записан локально). После stale вокруг вызова магазина и в общем catch оплата НЕИЗВЕСТНА — могла быть отмена или отказ карты, и «платить заново не нужно» там ложь.
// Поэтому два вида: confirmed — утверждает; unknown — условный текст «если оплата прошла…» без обещаний про повторную оплату. Чистый модуль, чтобы текст проверялся тестом.
// ═════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../constants/i18n';

/** Насколько известно, что оплата прошла: confirmed — магазин подтвердил доступ; unknown — исход оплаты неизвестен. */
export type PurchaseCertainty = 'confirmed' | 'unknown';

export function previousAccountPurchaseCopy(lang: Lang, certainty: PurchaseCertainty): { title: string; message: string } {
  if (certainty === 'confirmed') {
    return {
      title: triLang(lang, {
        ru: 'Покупка на другом аккаунте', uk: 'Покупка на іншому акаунті', en: 'Purchase is on another account', es: 'La compra está en otra cuenta',
        'pt-BR': 'A compra está em outra conta', vi: 'Giao dịch nằm ở tài khoản khác', id: 'Pembelian ada di akun lain', tr: 'Satın alma başka bir hesapta', pl: 'Zakup jest na innym koncie',
      }),
      message: triLang(lang, {
        ru: 'Покупка оформлена на предыдущий аккаунт — войди в него, и доступ Plus будет там. Платить заново не нужно.',
        uk: 'Покупку оформлено на попередній акаунт — увійди в нього, і доступ Plus буде там. Платити заново не потрібно.',
        en: 'The purchase went to your previous account. Sign in to it and Plus will be there. No need to pay again.',
        es: 'La compra se hizo en tu cuenta anterior. Inicia sesión en ella y Plus estará allí. No hace falta pagar de nuevo.',
        'pt-BR': 'A compra foi feita na sua conta anterior. Entre nela e o Plus estará lá. Não é preciso pagar de novo.',
        vi: 'Giao dịch được thực hiện ở tài khoản trước đó. Hãy đăng nhập vào đó, Plus sẽ có ở đấy. Không cần trả tiền lại.',
        id: 'Pembelian tercatat di akun sebelumnya. Masuk ke akun itu dan Plus ada di sana. Tidak perlu membayar lagi.',
        tr: 'Satın alma önceki hesabına yapıldı. O hesaba gir, Plus orada olacak. Yeniden ödemene gerek yok.',
        pl: 'Zakup trafił na poprzednie konto. Zaloguj się na nie, a Plus będzie tam. Nie trzeba płacić ponownie.',
      }),
    };
  }
  return {
    title: triLang(lang, {
      ru: 'Аккаунт сменился во время покупки', uk: 'Акаунт змінився під час покупки', en: 'Account changed during purchase', es: 'La cuenta cambió durante la compra',
      'pt-BR': 'A conta mudou durante a compra', vi: 'Tài khoản đã đổi trong lúc mua', id: 'Akun berubah saat pembelian', tr: 'Satın alma sırasında hesap değişti', pl: 'Konto zmieniło się podczas zakupu',
    }),
    message: triLang(lang, {
      ru: 'Если оплата прошла, она на предыдущем аккаунте — войди в него, Plus будет там.',
      uk: 'Якщо оплата пройшла, вона на попередньому акаунті — увійди в нього, Plus буде там.',
      en: 'If the payment went through, it’s on your previous account. Sign in to it and Plus will be there.',
      es: 'Si el pago se realizó, está en tu cuenta anterior. Inicia sesión en ella y Plus estará allí.',
      'pt-BR': 'Se o pagamento foi concluído, ele está na sua conta anterior. Entre nela e o Plus estará lá.',
      vi: 'Nếu thanh toán đã hoàn tất, giao dịch nằm ở tài khoản trước đó. Hãy đăng nhập vào đó, Plus sẽ có ở đấy.',
      id: 'Jika pembayaran berhasil, pembayaran itu ada di akun sebelumnya. Masuk ke akun itu dan Plus ada di sana.',
      tr: 'Ödeme geçtiyse önceki hesabındadır. O hesaba gir, Plus orada olacak.',
      pl: 'Jeśli płatność przeszła, jest na poprzednim koncie. Zaloguj się na nie, a Plus będzie tam.',
    }),
  };
}

/**
 * Третье ревью 0d76a9528 (🟡2): магазин ПОДТВЕРДИЛ доступ, а локально он не записался (замок не взят, сбой записи), аккаунт тот же.
 * Общее «неизвестно, прошла ли оплата» здесь неправда и пугает: оплата прошла, нужно только «Восстановить». Для unknown — null (остаётся прежний текст).
 */
export function unverifiedSameAccountCopy(lang: Lang, certainty: PurchaseCertainty): { title: string; message: string } | null {
  if (certainty !== 'confirmed') return null;
  return {
    title: triLang(lang, {
      ru: 'Оплата прошла', uk: 'Оплата пройшла', en: 'Payment went through', es: 'El pago se realizó',
      'pt-BR': 'O pagamento foi concluído', vi: 'Thanh toán đã hoàn tất', id: 'Pembayaran berhasil', tr: 'Ödeme alındı', pl: 'Płatność przeszła',
    }),
    message: triLang(lang, {
      ru: 'Оплата прошла, но доступ не записался — нажми «Восстановить». Платить заново не нужно.',
      uk: 'Оплата пройшла, але доступ не записався — натисни «Відновити». Платити заново не потрібно.',
      en: 'Payment went through, but access wasn’t saved. Tap Restore. No need to pay again.',
      es: 'El pago se realizó, pero el acceso no se guardó. Toca Restaurar. No hace falta pagar de nuevo.',
      'pt-BR': 'O pagamento foi concluído, mas o acesso não foi salvo. Toque em Restaurar. Não é preciso pagar de novo.',
      vi: 'Thanh toán đã hoàn tất nhưng quyền truy cập chưa được lưu. Hãy chọn Khôi phục. Không cần trả tiền lại.',
      id: 'Pembayaran berhasil, tetapi akses belum tersimpan. Ketuk Pulihkan. Tidak perlu membayar lagi.',
      tr: 'Ödeme alındı ama erişim kaydedilmedi. Geri Yükle’ye dokun. Yeniden ödemene gerek yok.',
      pl: 'Płatność przeszła, ale dostęp się nie zapisał. Wybierz Przywróć. Nie trzeba płacić ponownie.',
    }),
  };
}

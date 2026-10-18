// auth_code_copy.ts — тексты кода входа и единственное сообщение «нет интернета» при входе и выходе, 9 языков.
//
// зачем (координатор 18.10, эталон docs/design/v2-app/auth-states.html, блок 7, 2a53f1783): человек видит, сколько ещё
// действует код и когда можно запросить новый, — простыми словами, без кодов ошибок. Правило «только успех»: при входе и
// выходе из всех сбоев человеку показывается одно сообщение — про интернет, остальное уходит в журнал.
// Время приходит готовой строкой «m:ss»; перед ним неразрывный пробел, чтобы время не уезжало на другую строку.
import { triLang, type Lang } from '../../constants/i18n';

const NBSP = ' ';

/** «Код действует ещё 4:59». */
export function authCodeValidForText(lang: Lang, mmss: string): string {
  return triLang(lang, {
    ru: `Код действует ещё${NBSP}${mmss}`,
    uk: `Код дійсний ще${NBSP}${mmss}`,
    en: `Code is valid for another${NBSP}${mmss}`,
    es: `El código vale${NBSP}${mmss} más`,
    'pt-BR': `O código vale por mais${NBSP}${mmss}`,
    vi: `Mã còn hiệu lực${NBSP}${mmss}`,
    id: `Kode berlaku${NBSP}${mmss} lagi`,
    tr: `Kod${NBSP}${mmss} daha geçerli`,
    pl: `Kod jest ważny jeszcze${NBSP}${mmss}`,
  });
}

/** «Отправили новый код». */
export function authCodeResentText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Отправили новый код', uk: 'Надіслали новий код', en: 'We sent a new code', es: 'Enviamos un código nuevo',
    'pt-BR': 'Enviamos um novo código', vi: 'Đã gửi mã mới', id: 'Kode baru sudah dikirim', tr: 'Yeni kod gönderdik',
    pl: 'Wysłaliśmy nowy kod',
  });
}

/** «Код не подошёл. Проверь все 6 цифр.» */
export function authCodeWrongText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Код не подошёл. Проверь все 6 цифр.',
    uk: 'Код не підійшов. Перевір усі 6 цифр.',
    en: "That code didn't work. Check all 6 digits.",
    es: 'El código no es correcto. Revisa los 6 dígitos.',
    'pt-BR': 'O código não confere. Confira os 6 dígitos.',
    vi: 'Mã chưa đúng. Hãy kiểm tra lại cả 6 chữ số.',
    id: 'Kodenya belum cocok. Periksa ke-6 angkanya.',
    tr: 'Kod uymadı. 6 rakamın hepsini kontrol et.',
    pl: 'Kod się nie zgadza. Sprawdź wszystkie 6 cyfr.',
  });
}

/** «Повторная отправка через 0:42». */
export function authCodeResendInText(lang: Lang, mmss: string): string {
  return triLang(lang, {
    ru: `Повторная отправка через${NBSP}${mmss}`,
    uk: `Повторне надсилання через${NBSP}${mmss}`,
    en: `Resend in${NBSP}${mmss}`,
    es: `Reenviar en${NBSP}${mmss}`,
    'pt-BR': `Reenviar em${NBSP}${mmss}`,
    vi: `Gửi lại sau${NBSP}${mmss}`,
    id: `Kirim ulang dalam${NBSP}${mmss}`,
    tr: `${mmss}${NBSP}sonra yeniden gönder`,
    pl: `Ponowna wysyłka za${NBSP}${mmss}`,
  });
}

/** Единственное сообщение при входе и выходе (правило «только успех»): «Нет интернета — сохраним, как только он появится». */
export function authOfflineSaveLaterText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Нет интернета — сохраним, как только он появится',
    uk: 'Немає інтернету — збережемо, щойно він з’явиться',
    en: "No internet — we'll save as soon as you're back online",
    es: 'Sin internet: lo guardaremos en cuanto vuelva la conexión',
    'pt-BR': 'Sem internet — vamos salvar assim que a conexão voltar',
    vi: 'Không có mạng — sẽ lưu ngay khi có mạng lại',
    id: 'Tidak ada internet — akan kami simpan begitu koneksi kembali',
    tr: 'İnternet yok — bağlantı gelir gelmez kaydedeceğiz',
    pl: 'Brak internetu — zapiszemy, gdy tylko wróci połączenie',
  });
}

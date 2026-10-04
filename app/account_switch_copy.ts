/*
 * Тексты смены аккаунта (§127, координатор 04.10) — простым языком, без жаргона, 9 языков.
 *
 * зачем: прежний текст отказа account_switch_required говорил «подтверди безопасное сохранение
 * или очистку данных» — человек не понимал, что делать. Теперь: что случилось, что данные целы,
 * и одна кнопка, которая сразу открывает окно «Сменить аккаунт?» в Настройках.
 */
import { triLang, type Lang } from '../constants/i18n';

/**
 * зачем (§127): строку «Plus перейдёт на новый аккаунт» показываем ТОЛЬКО вместе с тихим
 * восстановлением покупок AccountV2 (app/plus_transfer.ts, режим RevenueCat «Transfer») —
 * одной поставкой. Пока перенос не выпущен, флаг выключен: иначе пообещаем то, чего нет.
 * AccountV2 включает флаг тем же коммитом, которым выпускает перенос.
 */
export const PLUS_TRANSFER_SWITCH_NOTICE_ENABLED = false;

export function plusTransferSwitchNotice(lang: Lang): string {
  return triLang(lang, {
    ru: 'У тебя активен Plus. После смены он перейдёт на новый аккаунт на этом телефоне.',
    uk: 'У тебе активний Plus. Після зміни він перейде на новий акаунт на цьому телефоні.',
    en: 'You have Plus. After switching, it will move to the new account on this phone.',
    es: 'Tienes Plus. Al cambiar, pasará a la nueva cuenta en este teléfono.',
    'pt-BR': 'Você tem o Plus. Ao trocar, ele passará para a nova conta neste celular.',
    vi: 'Bạn đang có Plus. Sau khi đổi, Plus sẽ chuyển sang tài khoản mới trên điện thoại này.',
    id: 'Kamu punya Plus. Setelah ganti, Plus akan pindah ke akun baru di ponsel ini.',
    tr: "Plus'ın aktif. Hesap değiştirince Plus bu telefondaki yeni hesaba geçer.",
    pl: 'Masz Plus. Po zmianie przejdzie on na nowe konto na tym telefonie.',
  });
}

export interface AccountSwitchRequiredCopy {
  readonly title: string;
  readonly body: string;
  readonly action: string;
}

export function accountSwitchRequiredCopy(lang: Lang): AccountSwitchRequiredCopy {
  return {
    title: triLang(lang, {
      ru: 'Телефон уже связан с другим аккаунтом',
      uk: 'Телефон уже пов’язаний з іншим акаунтом',
      en: 'This phone is already linked to another account',
      es: 'Este teléfono ya está vinculado a otra cuenta',
      'pt-BR': 'Este celular já está vinculado a outra conta',
      vi: 'Điện thoại này đã liên kết với tài khoản khác',
      id: 'Ponsel ini sudah terhubung ke akun lain',
      tr: 'Bu telefon zaten başka bir hesaba bağlı',
      pl: 'Ten telefon jest już połączony z innym kontem',
    }),
    body: triLang(lang, {
      ru: 'Твой прогресс на месте. Чтобы войти в другой аккаунт, сначала смени аккаунт.',
      uk: 'Твій прогрес на місці. Щоб увійти в інший акаунт, спочатку зміни акаунт.',
      en: 'Your progress is safe. To sign in to another account, switch accounts first.',
      es: 'Tu progreso está a salvo. Para entrar en otra cuenta, primero cambia de cuenta.',
      'pt-BR': 'Seu progresso está salvo. Para entrar em outra conta, troque de conta primeiro.',
      vi: 'Tiến độ của bạn vẫn còn nguyên. Để đăng nhập tài khoản khác, hãy đổi tài khoản trước.',
      id: 'Progresmu aman. Untuk masuk ke akun lain, ganti akun dulu.',
      tr: 'İlerlemen yerinde. Başka bir hesaba girmek için önce hesap değiştir.',
      pl: 'Twój postęp jest bezpieczny. Aby zalogować się na inne konto, najpierw zmień konto.',
    }),
    action: triLang(lang, {
      ru: 'Сменить аккаунт',
      uk: 'Змінити акаунт',
      en: 'Switch account',
      es: 'Cambiar de cuenta',
      'pt-BR': 'Trocar de conta',
      vi: 'Đổi tài khoản',
      id: 'Ganti akun',
      tr: 'Hesap değiştir',
      pl: 'Zmień konto',
    }),
  };
}

/** Параметр маршрута Настроек: открыть окно «Сменить аккаунт?» сразу (кнопка из окна входа). */
export const SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM = 'switchAccount';

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

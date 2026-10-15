/*
 * Тексты смены аккаунта (§127, координатор 04.10) — простым языком, без жаргона, 9 языков.
 *
 * зачем: прежний текст отказа account_switch_required говорил «подтверди безопасное сохранение
 * или очистку данных» — человек не понимал, что делать. Теперь: что случилось, что данные целы,
 * и одна кнопка, которая сразу открывает окно «Сменить аккаунт?» в Настройках.
 */
import { triLang, type Lang } from '../constants/i18n';
import { getPlusTransferSwitchWarning } from './plus_transfer_hold';

/**
 * зачем (§127): строку «Plus перейдёт на новый аккаунт» показываем ТОЛЬКО вместе с тихим
 * восстановлением покупок AccountV2 (app/plus_transfer.ts, режим RevenueCat «Transfer») —
 * одной поставкой. Пока перенос не выпущен, флаг выключен: иначе пообещаем то, чего нет.
 * AccountV2 включает флаг тем же коммитом, которым выпускает перенос.
 */
// зачем (AA S2d раунд 2): включено тем же изменением, что выпускает тихий перенос Plus
// (app/plus_transfer.ts: syncPurchases после любой смены аккаунта).
export const PLUS_TRANSFER_SWITCH_NOTICE_ENABLED = true;

/**
 * Показывать ли строку о переносе Plus в окне «Сменить аккаунт?».
 *
 * зачем (AA S2d раунд 2, координатор): только при РЕАЛЬНОМ переносе store-Plus —
 * VIP/промо-Plus без покупки в сторе через RevenueCat не переносится, им строка
 * пообещала бы неправду. Проверка store-Plus — по последнему решению premium_guard
 * (память, без сети). Условия идут по порядку: при выключенном флаге или без Plus
 * точка предупреждения (и её лог [PLUS-TRANSFER]) не вызывается вовсе.
 */
export function shouldShowPlusTransferSwitchNotice(
  isPremium: boolean,
  currentStableId: string | null,
  enabled: boolean = PLUS_TRANSFER_SWITCH_NOTICE_ENABLED,
): boolean {
  return enabled && isPremium && getPlusTransferSwitchWarning(currentStableId).show;
}

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

/**
 * Тот же случай для ГОСТЯ в онбординге («У меня уже есть аккаунт» → Google, который уже есть в Phraseman).
 * зачем (прогон 11.10): общий заголовок «Телефон уже связан с другим аккаунтом» гостю неверен и пугает —
 * телефон ни с чем не связан, просто выбранный Google уже существует (credential-already-in-use — это
 * «пользователь есть», а не «есть прогресс», ревью 12.10). Честно говорим, что начатое без входа не
 * перенесётся (смена стирает гостевые данные телефона; войти обратно гостю нечем).
 */
export function accountSwitchRequiredGuestCopy(lang: Lang): AccountSwitchRequiredCopy {
  return {
    title: triLang(lang, {
      // зачем (ревью M-1): ветка срабатывает по credential-already-in-use — аккаунт существует,
      // а прогресса у него может не быть. Заголовок говорит только правду: аккаунт уже есть.
      ru: 'Этот аккаунт уже есть в Phraseman',
      uk: 'Цей акаунт уже є в Phraseman',
      en: 'This account already exists in Phraseman',
      es: 'Esta cuenta ya existe en Phraseman',
      'pt-BR': 'Esta conta já existe no Phraseman',
      vi: 'Tài khoản này đã có trong Phraseman',
      id: 'Akun ini sudah ada di Phraseman',
      tr: "Bu hesap zaten Phraseman'de var",
      pl: 'To konto już istnieje w Phraseman',
    }),
    body: triLang(lang, {
      ru: 'Чтобы войти в него, начатое на этом телефоне без входа придётся оставить — оно не перенесётся.',
      uk: 'Щоб увійти в нього, розпочате на цьому телефоні без входу доведеться залишити — воно не перенесеться.',
      en: "To sign in to it, what you started on this phone without signing in stays behind — it won't carry over.",
      es: 'Para entrar en ella, lo que empezaste en este teléfono sin iniciar sesión se queda atrás: no se transfiere.',
      'pt-BR': 'Para entrar nela, o que você começou neste celular sem entrar fica para trás — não será transferido.',
      vi: 'Để đăng nhập, phần bạn đã bắt đầu trên điện thoại này khi chưa đăng nhập sẽ không được chuyển sang.',
      id: 'Untuk masuk ke akun ini, yang kamu mulai di ponsel ini tanpa masuk tidak akan ikut pindah.',
      tr: 'Bu hesaba girmek için bu telefonda giriş yapmadan başladıkların geride kalır — aktarılmaz.',
      pl: 'Aby się zalogować, postęp z tego telefonu sprzed logowania zostanie tutaj — nie przeniesie się.',
    }),
    action: triLang(lang, {
      ru: 'Войти в этот аккаунт',
      uk: 'Увійти в цей акаунт',
      en: 'Sign in to this account',
      es: 'Entrar en esta cuenta',
      'pt-BR': 'Entrar nesta conta',
      vi: 'Đăng nhập tài khoản này',
      id: 'Masuk ke akun ini',
      tr: 'Bu hesaba gir',
      pl: 'Zaloguj się na to konto',
    }),
  };
}

/** Параметр маршрута Настроек: открыть окно «Сменить аккаунт?» сразу (кнопка из окна входа). */
export const SETTINGS_OPEN_ACCOUNT_SWITCH_PARAM = 'switchAccount';
/** Параметр маршрута Настроек: открыть окно входа сразу (приглашение гостю в итоге урока 1). */
export const SETTINGS_OPEN_SIGN_IN_PARAM = 'signIn';

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

// sign_in_progress_copy.ts — тексты состояний входа (строка «Входим…», карточка сбоя) на 9 языках.
//
// зачем (координатор 18.10, макет auth-states.html): человек во время входа видит живой отклик и по-человечески описанный сбой; коды ошибок на экран не попадают.
// «Связь пропала» и «слишком много попыток» берутся из app/auth_error_copy.ts (единый словарь окна входа и онбординга) — здесь только новое.
// ЧЕРНОВИК ДЛЯ ПЕРЕВОДЧИКА: ru — по макету Макетов, остальные языки проверить.
import { triLang, type Lang } from '../../constants/i18n';
import { authErrorTextForKind } from '../../app/auth_error_copy';

/** Вид сбоя входа для карточки: сеть, слишком много попыток, окно закрыли без выбора аккаунта, всё остальное. */
export type SignInFailureKind = 'network' | 'too_many' | 'cancelled' | 'other';

/** Вход идёт дольше 3 секунд — спокойная строка. */
export function signInCalmText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Входим…', uk: 'Входимо…', en: 'Signing in…', es: 'Entrando…', 'pt-BR': 'Entrando…',
    vi: 'Đang đăng nhập…', id: 'Sedang masuk…', tr: 'Giriş yapılıyor…', pl: 'Logowanie…',
  });
}

/** Вход идёт дольше 8 секунд — честная строка вместо точек. */
export function signInLongText(lang: Lang): string {
  return triLang(lang, {
    ru: 'Вход занимает больше времени. Можно закрыть это окно — вход продолжится.',
    uk: 'Вхід триває довше. Можна закрити це вікно — вхід триватиме.',
    en: 'Signing in is taking longer. You can close this window — it will keep going.',
    es: 'Entrar está tardando más. Puedes cerrar esta ventana: el acceso continuará.',
    'pt-BR': 'A entrada está demorando. Você pode fechar esta janela — ela continuará.',
    vi: 'Đăng nhập đang lâu hơn bình thường. Bạn có thể đóng cửa sổ này — quá trình vẫn tiếp tục.',
    id: 'Masuk memakan waktu lebih lama. Kamu bisa menutup jendela ini — prosesnya tetap berjalan.',
    tr: 'Giriş normalden uzun sürüyor. Bu pencereyi kapatabilirsin — giriş devam eder.',
    pl: 'Logowanie trwa dłużej. Możesz zamknąć to okno — logowanie będzie trwać dalej.',
  });
}

export function signInFailureTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Не получилось войти', uk: 'Не вдалося увійти', en: "Couldn't sign in", es: 'No se pudo entrar', 'pt-BR': 'Não foi possível entrar',
    vi: 'Chưa đăng nhập được', id: 'Gagal masuk', tr: 'Giriş yapılamadı', pl: 'Nie udało się zalogować',
  });
}

export function signInRetryLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Попробовать ещё раз', uk: 'Спробувати ще раз', en: 'Try again', es: 'Intentarlo de nuevo', 'pt-BR': 'Tentar de novo',
    vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
  });
}

/** Человеческая причина сбоя; для «сеть» и «много попыток» — словарь окна входа. */
export function signInFailureBody(kind: SignInFailureKind, lang: Lang): string {
  if (kind === 'network' || kind === 'too_many') {
    const fromDictionary = authErrorTextForKind(kind, lang);
    if (fromDictionary) return fromDictionary;
  }
  if (kind === 'cancelled') {
    return triLang(lang, {
      ru: 'Окно входа закрылось без выбора аккаунта. Нажми кнопку ещё раз или выбери другой способ.',
      uk: 'Вікно входу закрилося без вибору акаунта. Натисни кнопку ще раз або обери інший спосіб.',
      en: 'The sign-in window closed before an account was chosen. Tap the button again or pick another way.',
      es: 'La ventana se cerró sin elegir una cuenta. Toca el botón otra vez o elige otra forma.',
      'pt-BR': 'A janela fechou sem escolher uma conta. Toque no botão de novo ou escolha outra forma.',
      vi: 'Cửa sổ đăng nhập đã đóng khi chưa chọn tài khoản. Hãy bấm nút lần nữa hoặc chọn cách khác.',
      id: 'Jendela masuk tertutup sebelum memilih akun. Ketuk tombolnya lagi atau pilih cara lain.',
      tr: 'Giriş penceresi hesap seçilmeden kapandı. Düğmeye tekrar dokun veya başka bir yol seç.',
      pl: 'Okno logowania zamknęło się bez wyboru konta. Dotknij przycisku jeszcze raz albo wybierz inny sposób.',
    });
  }
  return triLang(lang, {
    ru: 'Вход не завершился. Попробуй ещё раз или выбери другой способ.',
    uk: 'Вхід не завершився. Спробуй ще раз або обери інший спосіб.',
    en: "Sign-in didn't finish. Try again or pick another way.",
    es: 'El acceso no se completó. Inténtalo de nuevo o elige otra forma.',
    'pt-BR': 'A entrada não terminou. Tente de novo ou escolha outra forma.',
    vi: 'Đăng nhập chưa hoàn tất. Hãy thử lại hoặc chọn cách khác.',
    id: 'Proses masuk belum selesai. Coba lagi atau pilih cara lain.',
    tr: 'Giriş tamamlanmadı. Tekrar dene veya başka bir yol seç.',
    pl: 'Logowanie się nie zakończyło. Spróbuj ponownie albo wybierz inny sposób.',
  });
}

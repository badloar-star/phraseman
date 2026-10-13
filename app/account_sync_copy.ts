/*
 * Тексты отказа local_progress_not_uploaded (AccountV2 S2d, координатор 04.10) — спокойно, 9 языков.
 *
 * зачем: при входе в аккаунт приложение сначала обязано выгрузить прогресс этого телефона в облако;
 * если выгрузка не подтвердилась (плохая связь, таймаут), вход отменяется БЕЗ стирания данных
 * (app/auth_provider.ts, ветка presync). Человеку важно услышать три вещи: прогресс цел,
 * что именно не получилось, и что делать — повторить при хорошем интернете. Без слов
 * «синхронизация», «выгрузка», «сервер».
 * Отдельный файл, потому что account_switch_copy.ts сейчас правит AccountV2 (перенос Plus).
 */
import { triLang, type Lang } from '../constants/i18n';
import { localProgressBackupBlockedCopy, localProgressBackupBlockedGuestCopy } from './account_backup_blocked_copy';

export interface LocalProgressNotUploadedCopy {
  readonly title: string;
  readonly body: string;
  readonly action: string;
}

export function localProgressNotUploadedCopy(lang: Lang): LocalProgressNotUploadedCopy {
  return {
    title: triLang(lang, {
      ru: 'Прогресс на месте',
      uk: 'Прогрес на місці',
      en: 'Your progress is safe',
      es: 'Tu progreso está a salvo',
      'pt-BR': 'Seu progresso está salvo',
      vi: 'Tiến độ của bạn vẫn còn nguyên',
      id: 'Progresmu aman',
      tr: 'İlerlemen yerinde',
      pl: 'Twój postęp jest bezpieczny',
    }),
    body: triLang(lang, {
      ru: 'Не получилось сохранить его в облако перед входом, поэтому вход отменён. Попробуй ещё раз, когда интернет будет стабильнее.',
      uk: 'Не вдалося зберегти його в хмару перед входом, тому вхід скасовано. Спробуй ще раз, коли інтернет буде стабільнішим.',
      en: 'We couldn’t save it to the cloud before signing in, so sign-in was canceled. Try again when your connection is more stable.',
      es: 'No pudimos guardarlo en la nube antes de entrar, así que el acceso se canceló. Inténtalo de nuevo cuando la conexión sea más estable.',
      'pt-BR': 'Não conseguimos salvá-lo na nuvem antes de entrar, então o acesso foi cancelado. Tente de novo quando a conexão estiver mais estável.',
      vi: 'Chưa lưu được lên đám mây trước khi đăng nhập nên việc đăng nhập đã bị hủy. Hãy thử lại khi mạng ổn định hơn.',
      id: 'Belum bisa disimpan ke cloud sebelum masuk, jadi proses masuk dibatalkan. Coba lagi saat koneksi lebih stabil.',
      tr: 'Girişten önce buluta kaydedilemedi, bu yüzden giriş iptal edildi. Bağlantın daha sağlam olduğunda tekrar dene.',
      pl: 'Nie udało się zapisać go w chmurze przed logowaniem, więc logowanie anulowano. Spróbuj ponownie, gdy połączenie będzie stabilniejsze.',
    }),
    action: triLang(lang, {
      ru: 'Попробовать снова',
      uk: 'Спробувати ще',
      en: 'Try again',
      es: 'Intentar de nuevo',
      'pt-BR': 'Tentar de novo',
      vi: 'Thử lại',
      id: 'Coba lagi',
      tr: 'Tekrar dene',
      pl: 'Spróbuj ponownie',
    }),
  };
}

/**
 * Текст для кода отказа входа (или null, если код не наш).
 *
 * зачем (AA S2d раунд 2, §134 (б)): одна чистая точка выбора текста для модалки
 * регистрации и онбординга — по ней тест проверяет путь «код → текст». После
 * аварийной копии код приходит только когда копию сделать нельзя.
 */
export type SignInRefusalCopy = LocalProgressNotUploadedCopy & Readonly<{
  /** true — показать кнопку «Сменить аккаунт» и снять «Повторить» (повтор не поможет). */
  offersAccountSwitch: boolean;
}>;

/** Где показан отказ: окно входа в приложении (есть кнопка «Сменить аккаунт») или онбординг гостя (Настроек нет). */
export type SignInRefusalSurface = 'modal' | 'onboarding';

export function signInRefusalCopyFor(code: string, lang: Lang, surface: SignInRefusalSurface = 'modal'): SignInRefusalCopy | null {
  if (code === 'local_progress_not_uploaded') {
    return { ...localProgressNotUploadedCopy(lang), offersAccountSwitch: false };
  }
  // зачем (AA S2d раунд 3, §135 ❓1): копию прогресса сделать нельзя по состоянию
  // устройства — тексты «Дизайна» (6eb7937ec), поведение как у account_switch_required.
  if (code === 'local_progress_backup_blocked') {
    // зачем (аудит Онбординга 12.10): в онбординге гость не попадёт в Настройки — свой текст без них и без кнопки.
    if (surface === 'onboarding') {
      // зачем (координатор 12.10, R1): видно, что гостю ушёл вариант без «Настроек», куда ему не попасть.
      console.log(`[AUTH-REFUSAL] code=${code} surface=onboarding variant=guest_no_settings lang=${lang}`);
      return { ...localProgressBackupBlockedGuestCopy(lang), offersAccountSwitch: false };
    }
    console.log(`[AUTH-REFUSAL] code=${code} surface=${surface} variant=switch_account lang=${lang}`);
    return { ...localProgressBackupBlockedCopy(lang), offersAccountSwitch: true };
  }
  return null;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

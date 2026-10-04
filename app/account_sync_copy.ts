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
      en: 'We couldn’t save it to the cloud before signing in, so sign-in was cancelled. Try again when your connection is more stable.',
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

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

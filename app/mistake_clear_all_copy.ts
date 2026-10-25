/**
 * Тексты «Очистить все ошибки» на 9 языках (владелец 22.10). Переводчик вычитывает отдельно.
 *
 * зачем: пункт меню, подтверждение, тост «Ошибки удалены» с «Вернуть» и сообщения о сбое живут в одном месте — их читают и экран
 * списка, и сквозной тост, который переживает уход с экрана. Подпись под названием не нужна: название самодостаточно.
 */
import type { Lang } from '../constants/i18n';
import { pluralWithCount, type PluralForms } from '../constants/plural';

export type MistakeClearAllCopy = Readonly<{
  /** Пункт меню экрана. */
  menu: string;
  /** Заголовок подтверждения; `{N}` — «12 ошибок» в нужной форме. */
  confirmTitle: string;
  confirm: string;
  cancel: string;
  /** Тост после очистки. */
  done: string;
  /** Пункт удаления одной ошибки (долгое нажатие на строку) и тост после него (владелец 24.10: «ошибки можно удалять»). */
  deleteOne: string;
  doneOne: string;
  /** Сбой удаления одной ошибки и «ещё сохраняется предыдущее» (аудит Дизайна 0936a7510: busy не молчит). */
  failedOne: string;
  busy: string;
  undo: string;
  failed: string;
  undoFailed: string;
  mistakes: PluralForms;
}>;

export const MISTAKE_CLEAR_ALL_COPY: Readonly<Record<Lang, MistakeClearAllCopy>> = {
  ru: {
    failedOne: 'Не удалось удалить ошибку. Попробуй ещё раз', busy: 'Подожди секунду — предыдущее удаление ещё сохраняется',
    deleteOne: 'Удалить', doneOne: 'Ошибка удалена',
    menu: 'Очистить все ошибки', confirmTitle: 'Удалить {N} из разбора?', confirm: 'Удалить', cancel: 'Отмена', done: 'Ошибки удалены', undo: 'Вернуть',
    failed: 'Не удалось удалить ошибки. Попробуй ещё раз', undoFailed: 'Не удалось вернуть ошибки', mistakes: { one: 'ошибку', few: 'ошибки', many: 'ошибок' },
  },
  uk: {
    failedOne: 'Не вдалося видалити помилку. Спробуй ще раз', busy: 'Зачекай секунду — попереднє видалення ще зберігається',
    deleteOne: 'Видалити', doneOne: 'Помилку видалено',
    menu: 'Очистити всі помилки', confirmTitle: 'Видалити {N} з розбору?', confirm: 'Видалити', cancel: 'Скасувати', done: 'Помилки видалено', undo: 'Повернути',
    failed: 'Не вдалося видалити помилки. Спробуй ще раз', undoFailed: 'Не вдалося повернути помилки', mistakes: { one: 'помилку', few: 'помилки', many: 'помилок' },
  },
  en: {
    failedOne: "Couldn't remove the mistake. Try again", busy: 'One moment — the previous removal is still saving',
    deleteOne: 'Remove', doneOne: 'Mistake removed',
    menu: 'Clear all mistakes', confirmTitle: 'Remove {N} from review?', confirm: 'Remove', cancel: 'Cancel', done: 'Mistakes removed', undo: 'Undo',
    failed: "Couldn't remove the mistakes. Try again", undoFailed: "Couldn't restore the mistakes", mistakes: { one: 'mistake', few: 'mistakes', many: 'mistakes' },
  },
  es: {
    failedOne: 'No se pudo borrar el error. Inténtalo de nuevo', busy: 'Un momento: el borrado anterior aún se está guardando',
    deleteOne: 'Borrar', doneOne: 'Error borrado',
    menu: 'Borrar todos los errores', confirmTitle: '¿Borrar {N} del repaso?', confirm: 'Borrar', cancel: 'Cancelar', done: 'Errores borrados', undo: 'Deshacer',
    failed: 'No se pudieron borrar los errores. Inténtalo de nuevo', undoFailed: 'No se pudieron recuperar los errores', mistakes: { one: 'error', few: 'errores', many: 'errores' },
  },
  'pt-BR': {
    failedOne: 'Não foi possível remover o erro. Tente de novo', busy: 'Um momento: a remoção anterior ainda está sendo salva',
    deleteOne: 'Remover', doneOne: 'Erro removido',
    menu: 'Limpar todos os erros', confirmTitle: 'Remover {N} da revisão?', confirm: 'Remover', cancel: 'Cancelar', done: 'Erros removidos', undo: 'Desfazer',
    failed: 'Não foi possível remover os erros. Tente de novo', undoFailed: 'Não foi possível restaurar os erros', mistakes: { one: 'erro', few: 'erros', many: 'erros' },
  },
  vi: {
    failedOne: 'Không xóa được lỗi. Hãy thử lại', busy: 'Chờ một chút — lần xóa trước vẫn đang được lưu',
    deleteOne: 'Xóa', doneOne: 'Đã xóa lỗi',
    menu: 'Xóa tất cả lỗi', confirmTitle: 'Xóa {N} khỏi phần ôn?', confirm: 'Xóa', cancel: 'Hủy', done: 'Đã xóa các lỗi', undo: 'Hoàn tác',
    failed: 'Không xóa được các lỗi. Hãy thử lại', undoFailed: 'Không khôi phục được các lỗi', mistakes: { one: 'lỗi', few: 'lỗi', many: 'lỗi' },
  },
  id: {
    failedOne: 'Gagal menghapus kesalahan. Coba lagi', busy: 'Sebentar — penghapusan sebelumnya masih disimpan',
    deleteOne: 'Hapus', doneOne: 'Kesalahan dihapus',
    menu: 'Hapus semua kesalahan', confirmTitle: 'Hapus {N} dari latihan?', confirm: 'Hapus', cancel: 'Batal', done: 'Kesalahan dihapus', undo: 'Urungkan',
    failed: 'Gagal menghapus kesalahan. Coba lagi', undoFailed: 'Gagal memulihkan kesalahan', mistakes: { one: 'kesalahan', few: 'kesalahan', many: 'kesalahan' },
  },
  tr: {
    failedOne: 'Hata kaldırılamadı. Tekrar dene', busy: 'Bir saniye — önceki kaldırma hâlâ kaydediliyor',
    deleteOne: 'Kaldır', doneOne: 'Hata kaldırıldı',
    menu: 'Tüm hataları temizle', confirmTitle: '{N} listeden kaldırılsın mı?', confirm: 'Kaldır', cancel: 'İptal', done: 'Hatalar kaldırıldı', undo: 'Geri al',
    failed: 'Hatalar kaldırılamadı. Tekrar dene', undoFailed: 'Hatalar geri getirilemedi', mistakes: { one: 'hata', few: 'hata', many: 'hata' },
  },
  pl: {
    failedOne: 'Nie udało się usunąć błędu. Spróbuj ponownie', busy: 'Chwila — poprzednie usuwanie wciąż się zapisuje',
    deleteOne: 'Usuń', doneOne: 'Błąd usunięty',
    menu: 'Wyczyść wszystkie błędy', confirmTitle: 'Usunąć {N} z powtórek?', confirm: 'Usuń', cancel: 'Anuluj', done: 'Błędy usunięte', undo: 'Cofnij',
    failed: 'Nie udało się usunąć błędów. Spróbuj ponownie', undoFailed: 'Nie udało się przywrócić błędów', mistakes: { one: 'błąd', few: 'błędy', many: 'błędów' },
  },
};

export function mistakeClearAllCopy(lang: Lang): MistakeClearAllCopy {
  return MISTAKE_CLEAR_ALL_COPY[lang] ?? MISTAKE_CLEAR_ALL_COPY.en;
}

/** «Удалить 12 ошибок из разбора?» — число и слово в нужной форме подставляются в шаблон языка. */
export function mistakeClearAllConfirmTitle(lang: Lang, count: number): string {
  const copy = mistakeClearAllCopy(lang);
  return copy.confirmTitle.replace('{N}', pluralWithCount(lang, count, copy.mistakes));
}

/* expo-router: утилита, не экран */
export default function __MistakeClearAllCopyRouteShim() {
  return null;
}

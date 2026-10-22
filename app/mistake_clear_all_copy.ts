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
  undo: string;
  failed: string;
  undoFailed: string;
  mistakes: PluralForms;
}>;

export const MISTAKE_CLEAR_ALL_COPY: Readonly<Record<Lang, MistakeClearAllCopy>> = {
  ru: {
    menu: 'Очистить все ошибки', confirmTitle: 'Удалить {N} из разбора?', confirm: 'Удалить', cancel: 'Отмена', done: 'Ошибки удалены', undo: 'Вернуть',
    failed: 'Не удалось удалить ошибки. Попробуй ещё раз', undoFailed: 'Не удалось вернуть ошибки', mistakes: { one: 'ошибку', few: 'ошибки', many: 'ошибок' },
  },
  uk: {
    menu: 'Очистити всі помилки', confirmTitle: 'Видалити {N} з розбору?', confirm: 'Видалити', cancel: 'Скасувати', done: 'Помилки видалено', undo: 'Повернути',
    failed: 'Не вдалося видалити помилки. Спробуй ще раз', undoFailed: 'Не вдалося повернути помилки', mistakes: { one: 'помилку', few: 'помилки', many: 'помилок' },
  },
  en: {
    menu: 'Clear all mistakes', confirmTitle: 'Remove {N} from review?', confirm: 'Remove', cancel: 'Cancel', done: 'Mistakes removed', undo: 'Undo',
    failed: "Couldn't remove the mistakes. Try again", undoFailed: "Couldn't restore the mistakes", mistakes: { one: 'mistake', few: 'mistakes', many: 'mistakes' },
  },
  es: {
    menu: 'Borrar todos los errores', confirmTitle: '¿Quitar {N} del repaso?', confirm: 'Quitar', cancel: 'Cancelar', done: 'Errores eliminados', undo: 'Deshacer',
    failed: 'No se pudieron eliminar los errores. Inténtalo de nuevo', undoFailed: 'No se pudieron recuperar los errores', mistakes: { one: 'error', few: 'errores', many: 'errores' },
  },
  'pt-BR': {
    menu: 'Limpar todos os erros', confirmTitle: 'Remover {N} da revisão?', confirm: 'Remover', cancel: 'Cancelar', done: 'Erros removidos', undo: 'Desfazer',
    failed: 'Não foi possível remover os erros. Tente de novo', undoFailed: 'Não foi possível restaurar os erros', mistakes: { one: 'erro', few: 'erros', many: 'erros' },
  },
  vi: {
    menu: 'Xóa tất cả lỗi', confirmTitle: 'Xóa {N} khỏi phần ôn?', confirm: 'Xóa', cancel: 'Hủy', done: 'Đã xóa các lỗi', undo: 'Hoàn tác',
    failed: 'Không xóa được các lỗi. Hãy thử lại', undoFailed: 'Không khôi phục được các lỗi', mistakes: { one: 'lỗi', few: 'lỗi', many: 'lỗi' },
  },
  id: {
    menu: 'Hapus semua kesalahan', confirmTitle: 'Hapus {N} dari latihan?', confirm: 'Hapus', cancel: 'Batal', done: 'Kesalahan dihapus', undo: 'Urungkan',
    failed: 'Gagal menghapus kesalahan. Coba lagi', undoFailed: 'Gagal memulihkan kesalahan', mistakes: { one: 'kesalahan', few: 'kesalahan', many: 'kesalahan' },
  },
  tr: {
    menu: 'Tüm hataları temizle', confirmTitle: '{N} tekrardan kaldırılsın mı?', confirm: 'Kaldır', cancel: 'İptal', done: 'Hatalar kaldırıldı', undo: 'Geri al',
    failed: 'Hatalar kaldırılamadı. Tekrar dene', undoFailed: 'Hatalar geri getirilemedi', mistakes: { one: 'hata', few: 'hata', many: 'hata' },
  },
  pl: {
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

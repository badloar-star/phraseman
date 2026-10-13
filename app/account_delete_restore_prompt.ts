/**
 * «Восстановить аккаунт?» в течение 14 дней после удаления — общий для всех
 * окон входа.
 *
 * зачем (релизный пол 10.10, сессия Авторизации): онбординг уже предлагал
 * восстановление (CleanOnboarding.offerAccountRestore), а окно входа из
 * Настроек / после урока / после «Выйти» на тот же отказ `account_delete_pending`
 * показывало общее «Не получилось войти». Человек, передумавший удалять аккаунт,
 * упирался в тупик, хотя сервер держит данные 14 дней (account_delete_grace) и
 * политика обещает предложить восстановление. Текст и кнопки — те же, что в
 * онбординге (утверждённый поток), новое — только место показа.
 */
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';
import { fetchAccountDeleteStatus, restoreDeletedAccount } from './account_delete_restore_client';
import { getDevAccountRestoreMode } from './dev_account_state';
import {
  THEMED_ALERT_DISMISSED,
  enqueueThemedBlockingChoiceAlert,
  enqueueThemedBlockingInfoAlert,
  type ThemedBlockingAlertSlotWait,
} from './themed_blocking_alert_queue';

/** Потолок ожидания слота арбитра для «Восстановить аккаунт?»: лог через 2 с, окно поверх через 8 с. */
export const ACCOUNT_RESTORE_SLOT_WAIT: ThemedBlockingAlertSlotWait = { logPrefix: '[ACCOUNT-RESTORE]', warnAfterMs: 2_000, forceAfterMs: 8_000 };

/**
 * Текст окна «Восстановить аккаунт?»: сколько дней до удаления — с правильной формой слова «день».
 * зачем (координатор 12.10): было «Осталось 3 дн.» / «3 day(s)» / «3 día(s)». Фраза перестроена на «удалится через N …»,
 * чтобы не согласовывать глагол с числом («остался 1 день / осталось 5 дней»): после «через» нужна только форма слова.
 * Один источник для онбординга и окна входа (паритет — tests/aa_release_registration_restore_prompt.test.ts).
 */
export function accountRestorePromptMessage(lang: Lang, rawDays: number): string {
  const n = Math.max(1, Math.trunc(Number.isFinite(rawDays) ? rawDays : 1));
  return triLang(lang, {
    ru: `Этот аккаунт удалится через ${n} ${pluralWord('ru', n, { one: 'день', few: 'дня', many: 'дней' })} — весь прогресс ещё на месте и вернётся полностью.`,
    uk: `Цей акаунт видалиться через ${n} ${pluralWord('uk', n, { one: 'день', few: 'дні', many: 'днів' })} — увесь прогрес ще на місці й повернеться повністю.`,
    en: `This account will be deleted in ${n} ${pluralWord('en', n, { one: 'day', few: 'days', many: 'days' })} — all your progress is still here and will come back in full.`,
    es: `Esta cuenta se eliminará en ${n} ${pluralWord('es', n, { one: 'día', few: 'días', many: 'días' })}: todo tu progreso sigue intacto y vuelve completo.`,
    'pt-BR': `Esta conta será excluída em ${n} ${pluralWord('pt-BR', n, { one: 'dia', few: 'dias', many: 'dias' })}: todo o seu progresso está intacto e volta completo.`,
    vi: `Tài khoản này sẽ bị xóa sau ${n} ngày — toàn bộ tiến trình vẫn nguyên và sẽ trở lại đầy đủ.`,
    id: `Akun ini akan dihapus dalam ${n} hari — seluruh progresmu utuh dan kembali sepenuhnya.`,
    tr: `Bu hesap ${n} gün sonra silinecek — tüm ilerlemen duruyor ve eksiksiz geri gelir.`,
    pl: `To konto zostanie usunięte za ${n} ${pluralWord('pl', n, { one: 'dzień', few: 'dni', many: 'dni' })} — cały postęp jest nienaruszony i wróci w całości.`,
  });
}

/**
 * зачем (релизный пол 10.10, решение координатора): вход в ОКОНЧАТЕЛЬНО удалённый
 * аккаунт (`identity_retired`, 14 дней прошли) раньше молча закрывал окно входа
 * или возвращал на приветствие — человек не понимал, что случилось. Теперь —
 * стандартное инфо-окно очереди (без системного Alert). Не ждём закрытия.
 */
export function noticeAccountDeletedForever(lang: Lang, surface: string): void {
  console.log(`[ACCOUNT-RESTORE] retired_notice surface=${surface}`);
  void enqueueThemedBlockingInfoAlert(
    triLang(lang, {
      ru: 'Аккаунт удалён', uk: 'Акаунт видалено', en: 'Account deleted', es: 'Cuenta eliminada',
      'pt-BR': 'Conta excluída', vi: 'Tài khoản đã bị xóa', id: 'Akun dihapus', tr: 'Hesap silindi', pl: 'Konto usunięte',
    }),
    triLang(lang, {
      ru: 'Этот аккаунт удалён безвозвратно. Войди другим способом или начни заново.',
      uk: 'Цей акаунт видалено безповоротно. Увійди іншим способом або почни заново.',
      en: 'This account was deleted permanently. Sign in another way or start over.',
      es: 'Esta cuenta se eliminó de forma permanente. Entra de otra manera o empieza de nuevo.',
      'pt-BR': 'Esta conta foi excluída de forma permanente. Entre de outro jeito ou comece de novo.',
      vi: 'Tài khoản này đã bị xóa vĩnh viễn. Hãy đăng nhập cách khác hoặc bắt đầu lại.',
      id: 'Akun ini sudah dihapus permanen. Masuk dengan cara lain atau mulai dari awal.',
      tr: 'Bu hesap kalıcı olarak silindi. Başka bir yolla giriş yap ya da yeniden başla.',
      pl: 'To konto zostało trwale usunięte. Zaloguj się w inny sposób lub zacznij od nowa.',
    }),
    triLang(lang, {
      ru: 'Понятно', uk: 'Зрозуміло', en: 'Got it', es: 'Entendido', 'pt-BR': 'Entendi',
      vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem',
    }),
    { icon: 'lock-closed' },
  );
}

export type AccountRestorePromptOutcome = 'restored' | 'declined' | 'not_restorable' | 'restore_failed';

/**
 * Восстановление не удалось (сеть/сервер). зачем (аудит Optimistic UI 12.10): прежде этот исход сливался с текстом
 * «аккаунт ещё удаляется» — человек не понимал, что его «Восстановить» не сработало. Заявка на удаление при этом
 * остаётся (14 дней идут), так что повтор безопасен.
 */
export function accountRestoreFailedCopy(lang: Lang): { title: string; body: string } {
  return {
    title: triLang(lang, {
      ru: 'Аккаунт не восстановлен', uk: 'Акаунт не відновлено', en: 'Account not restored', es: 'La cuenta no se restauró',
      'pt-BR': 'A conta não foi restaurada', vi: 'Chưa khôi phục được tài khoản', id: 'Akun belum dipulihkan', tr: 'Hesap geri yüklenmedi', pl: 'Konto nie zostało przywrócone',
    }),
    body: triLang(lang, {
      ru: 'Проверь интернет и попробуй ещё раз.', uk: 'Перевір інтернет і спробуй ще раз.', en: 'Check your connection and try again.',
      es: 'Revisa tu conexión e inténtalo de nuevo.', 'pt-BR': 'Verifique a conexão e tente de novo.', vi: 'Hãy kiểm tra kết nối và thử lại.',
      id: 'Periksa koneksi lalu coba lagi.', tr: 'Bağlantını kontrol et ve tekrar dene.', pl: 'Sprawdź połączenie i spróbuj ponownie.',
    }),
  };
}

export async function promptAccountRestoreAfterSignInRefusal(lang: Lang): Promise<AccountRestorePromptOutcome> {
  console.log('[ACCOUNT-RESTORE] prompt start');
  // зачем (координатор 12.10, съёмка auth-gap-006/007): dev `restore=offer|restored` — подставной статус без сервера;
  // настоящее восстановление при подмене недостижимо (см. ниже). Вне dev / в стор-сборке — всегда null.
  const devRestoreMode = getDevAccountRestoreMode();
  let status: Awaited<ReturnType<typeof fetchAccountDeleteStatus>>;
  try {
    status = devRestoreMode
      ? { pending: true, restorable: true, daysLeft: 13 }
      : await fetchAccountDeleteStatus();
    if (devRestoreMode) console.log(`[ACCOUNT-RESTORE] dev restore=${devRestoreMode}: статус подставлен (13 дней), сервер не вызван`); // guard-ok: dev-ветка
  } catch (error) {
    console.warn(`[ACCOUNT-RESTORE] status_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`);
    return 'not_restorable';
  }
  if (!status?.pending || !status.restorable) {
    console.log(`[ACCOUNT-RESTORE] not_restorable pending=${status?.pending === true ? 'yes' : 'no'} restorable=${status?.restorable === true ? 'yes' : 'no'}`);
    return 'not_restorable';
  }
  const days = Math.max(1, Number(status.daysLeft ?? 1));
  // зачем (координатор 13.10, auth-gap-007): в образце тёмная карточка, а нативный Alert Android рисовал светлое
  // системное окно поверх тёмного приложения. Та же очередь, что у подтверждения смены аккаунта
  // (onboarding_account_switch_confirm.ts); тексты, кнопки и исходы прежние. Системная «назад» = «Не восстанавливать».
  const choice = await enqueueThemedBlockingChoiceAlert<'decline' | 'restore'>(
    triLang(lang, {
      ru: 'Восстановить аккаунт?',
      uk: 'Відновити акаунт?',
      en: 'Restore your account?',
      es: '¿Restaurar la cuenta?',
      'pt-BR': 'Restaurar a conta?',
      vi: 'Khôi phục tài khoản?',
      id: 'Pulihkan akun?',
      tr: 'Hesap geri yüklensin mi?',
      pl: 'Przywrócić konto?',
    }),
    accountRestorePromptMessage(lang, days),
    [
      {
        label: triLang(lang, {
          ru: 'Не восстанавливать', uk: 'Не відновлювати', en: "Don't restore",
          es: 'No restaurar', 'pt-BR': 'Não restaurar', vi: 'Không khôi phục',
          id: 'Jangan pulihkan', tr: 'Geri yükleme', pl: 'Nie przywracaj',
        }),
        value: 'decline',
        ghost: true,
      },
      {
        label: triLang(lang, {
          ru: 'Восстановить', uk: 'Відновити', en: 'Restore',
          es: 'Restaurar', 'pt-BR': 'Restaurar', vi: 'Khôi phục',
          id: 'Pulihkan', tr: 'Geri yükle', pl: 'Przywróć',
        }),
        value: 'restore',
      },
    ],
    // зачем (ревью Ядра 2dba22af6, координатор 13.10): окно ждёт слот арбитра; держит его чужая модалка — вход ждал молча.
    // 2 с — лог «кто держит слот», 8 с — окно поверх. Кнопки и «назад» прежние.
    { slotWait: ACCOUNT_RESTORE_SLOT_WAIT },
  );
  console.log(`[ACCOUNT-RESTORE] choice=${String(choice)} daysLeft=${days}`);
  if (choice !== 'restore') {
    console.log(`[ACCOUNT-RESTORE] declined via=${choice === THEMED_ALERT_DISMISSED ? 'back' : 'button'}`);
    return 'declined';
  }
  if (devRestoreMode) {
    const devOutcome: AccountRestorePromptOutcome = devRestoreMode === 'restored' ? 'restored' : 'restore_failed';
    console.log(`[ACCOUNT-RESTORE] dev restore=${devRestoreMode}: «Восстановить» → ${devOutcome}, restoreDeletedAccount не вызван`); // guard-ok: dev-ветка
    return devOutcome;
  }
  const outcome = await restoreDeletedAccount();
  console.log(`[ACCOUNT-RESTORE] restore ok=${outcome.ok ? 'yes' : 'no'}`);
  return outcome.ok ? 'restored' : 'restore_failed';
}

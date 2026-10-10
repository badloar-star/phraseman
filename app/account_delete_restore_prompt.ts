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
import { Alert } from 'react-native';
import { triLang, type Lang } from '../constants/i18n';
import { fetchAccountDeleteStatus, restoreDeletedAccount } from './account_delete_restore_client';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';

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

export async function promptAccountRestoreAfterSignInRefusal(lang: Lang): Promise<AccountRestorePromptOutcome> {
  console.log('[ACCOUNT-RESTORE] prompt start');
  let status: Awaited<ReturnType<typeof fetchAccountDeleteStatus>>;
  try {
    status = await fetchAccountDeleteStatus();
  } catch (error) {
    console.warn(`[ACCOUNT-RESTORE] status_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`);
    return 'not_restorable';
  }
  if (!status?.pending || !status.restorable) {
    console.log(`[ACCOUNT-RESTORE] not_restorable pending=${status?.pending === true ? 'yes' : 'no'} restorable=${status?.restorable === true ? 'yes' : 'no'}`);
    return 'not_restorable';
  }
  const days = Math.max(1, Number(status.daysLeft ?? 1));
  const agreed = await new Promise<boolean>((resolve) => {
    Alert.alert(
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
      triLang(lang, {
        ru: `Этот аккаунт помечен на удаление. Осталось ${days} дн. — весь прогресс ещё на месте и вернётся полностью.`,
        uk: `Цей акаунт позначено на видалення. Лишилося ${days} дн. — увесь прогрес на місці й повернеться повністю.`,
        en: `This account is scheduled for deletion. ${days} day(s) left — all your progress is intact and comes back in full.`,
        es: `Esta cuenta está marcada para eliminarse. Quedan ${days} día(s): todo tu progreso sigue intacto y vuelve completo.`,
        'pt-BR': `Esta conta está marcada para exclusão. Faltam ${days} dia(s): todo o seu progresso está intacto e volta completo.`,
        vi: `Tài khoản này đang chờ xóa. Còn ${days} ngày — toàn bộ tiến trình vẫn nguyên và sẽ trở lại đầy đủ.`,
        id: `Akun ini dijadwalkan untuk dihapus. Sisa ${days} hari — seluruh progresmu utuh dan kembali sepenuhnya.`,
        tr: `Bu hesap silinmek üzere işaretli. ${days} gün kaldı — tüm ilerlemen duruyor ve eksiksiz geri gelir.`,
        pl: `To konto jest oznaczone do usunięcia. Zostało ${days} dni — cały postęp jest nienaruszony i wróci w całości.`,
      }),
      [
        {
          text: triLang(lang, {
            ru: 'Не восстанавливать', uk: 'Не відновлювати', en: "Don't restore",
            es: 'No restaurar', 'pt-BR': 'Não restaurar', vi: 'Không khôi phục',
            id: 'Jangan pulihkan', tr: 'Geri yükleme', pl: 'Nie przywracaj',
          }),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: triLang(lang, {
            ru: 'Восстановить', uk: 'Відновити', en: 'Restore',
            es: 'Restaurar', 'pt-BR': 'Restaurar', vi: 'Khôi phục',
            id: 'Pulihkan', tr: 'Geri yükle', pl: 'Przywróć',
          }),
          onPress: () => resolve(true),
        },
      ],
      { cancelable: false },
    );
  });
  if (!agreed) {
    console.log('[ACCOUNT-RESTORE] declined');
    return 'declined';
  }
  const outcome = await restoreDeletedAccount();
  console.log(`[ACCOUNT-RESTORE] restore ok=${outcome.ok ? 'yes' : 'no'}`);
  return outcome.ok ? 'restored' : 'restore_failed';
}

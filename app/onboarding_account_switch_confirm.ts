/**
 * Подтверждение смены аккаунта прямо в онбординге.
 *
 * зачем (релизный пол 10.10, решение координатора): онбординг на отказ
 * `account_switch_required` писал «Сначала подтверди смену аккаунта», но кнопки
 * подтверждения в нём не было — тупик. Окно входа ведёт в Настройки, но онбординг
 * рисуется поверх всего приложения, и переход туда не виден. Поэтому здесь —
 * стандартное окно выбора кита (очередь окон) с той же копией, что у окна входа,
 * а смена — тем же `signOutAndWipeForAccountSwitch`, что «Сохранить и сменить»
 * в Настройках (аварийная копия прогресса сохраняется до стирания).
 */
import { triLang, type Lang } from '../constants/i18n';
import { accountSwitchRequiredCopy } from './account_switch_copy';
import { signOutAndWipeForAccountSwitch } from './auth_provider';
import { THEMED_ALERT_DISMISSED, enqueueThemedBlockingChoiceAlert } from './themed_blocking_alert_queue';

export type OnboardingAccountSwitchOutcome =
  | Readonly<{ kind: 'switched' }>
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'failed'; reason: string }>;

/**
 * зачем (security-ревью L-1): при сбое смены онбординг снова показывал «подтверди смену» —
 * тот же тупик. Теперь — причина простыми словами; данные при сбое не тронуты.
 */
export function onboardingAccountSwitchFailureText(lang: Lang, reason: string): string {
  if (reason === 'sync_failed') {
    return triLang(lang, {
      ru: 'Не получилось сохранить прогресс перед сменой — нет связи. Проверь интернет и попробуй снова. Прогресс на месте.',
      uk: 'Не вдалося зберегти прогрес перед зміною — немає зв’язку. Перевір інтернет і спробуй знову. Прогрес на місці.',
      en: 'Couldn’t save your progress before switching — no connection. Check the internet and try again. Your progress is safe.',
      es: 'No se pudo guardar el progreso antes del cambio: no hay conexión. Revisa internet e inténtalo de nuevo. Tu progreso sigue ahí.',
      'pt-BR': 'Não deu para salvar o progresso antes da troca: sem conexão. Verifique a internet e tente de novo. Seu progresso está salvo.',
      vi: 'Chưa lưu được tiến trình trước khi đổi — không có kết nối. Hãy kiểm tra mạng và thử lại. Tiến trình vẫn còn nguyên.',
      id: 'Progres belum bisa disimpan sebelum ganti — tidak ada koneksi. Periksa internet lalu coba lagi. Progresmu aman.',
      tr: 'Değişiklikten önce ilerleme kaydedilemedi — bağlantı yok. İnterneti kontrol edip tekrar dene. İlerlemen yerinde.',
      pl: 'Nie udało się zapisać postępu przed zmianą — brak połączenia. Sprawdź internet i spróbuj ponownie. Postęp jest bezpieczny.',
    });
  }
  if (reason === 'pending_shard_spend' || reason === 'shard_queue_quarantined' || reason === 'clean_recovery_transition_active') {
    return triLang(lang, {
      ru: 'Сейчас завершается другая операция. Попробуй через минуту. Прогресс на месте.',
      uk: 'Зараз завершується інша операція. Спробуй за хвилину. Прогрес на місці.',
      en: 'Another operation is finishing right now. Try again in a minute. Your progress is safe.',
      es: 'Ahora se está terminando otra operación. Inténtalo en un minuto. Tu progreso sigue ahí.',
      'pt-BR': 'Outra operação está terminando agora. Tente daqui a um minuto. Seu progresso está salvo.',
      vi: 'Một thao tác khác đang hoàn tất. Hãy thử lại sau một phút. Tiến trình vẫn còn nguyên.',
      id: 'Operasi lain sedang diselesaikan. Coba lagi semenit lagi. Progresmu aman.',
      tr: 'Şu an başka bir işlem tamamlanıyor. Bir dakika sonra tekrar dene. İlerlemen yerinde.',
      pl: 'Właśnie kończy się inna operacja. Spróbuj za minutę. Postęp jest bezpieczny.',
    });
  }
  return triLang(lang, {
    ru: 'Не получилось сменить аккаунт. Прогресс на месте — попробуй ещё раз.',
    uk: 'Не вдалося змінити акаунт. Прогрес на місці — спробуй ще раз.',
    en: 'Couldn’t switch accounts. Your progress is safe — try again.',
    es: 'No se pudo cambiar de cuenta. Tu progreso sigue ahí; inténtalo de nuevo.',
    'pt-BR': 'Não deu para trocar de conta. Seu progresso está salvo — tente de novo.',
    vi: 'Chưa đổi được tài khoản. Tiến trình vẫn còn nguyên — hãy thử lại.',
    id: 'Akun belum bisa diganti. Progresmu aman — coba lagi.',
    tr: 'Hesap değiştirilemedi. İlerlemen yerinde — tekrar dene.',
    pl: 'Nie udało się zmienić konta. Postęp jest bezpieczny — spróbuj ponownie.',
  });
}

export async function confirmAndSwitchAccountInOnboarding(lang: Lang): Promise<OnboardingAccountSwitchOutcome> {
  const copy = accountSwitchRequiredCopy(lang);
  console.log('[AUTH-SWITCH-OFFER] onboarding confirm shown');
  const choice = await enqueueThemedBlockingChoiceAlert<'cancel' | 'switch'>(copy.title, copy.body, [
    {
      label: triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' }),
      value: 'cancel',
      ghost: true,
    },
    { label: copy.action, value: 'switch' },
  ]);
  if (choice !== 'switch') {
    console.log(`[AUTH-SWITCH-OFFER] onboarding cancelled choice=${choice === THEMED_ALERT_DISMISSED ? 'dismiss' : choice}`);
    return { kind: 'cancelled' };
  }
  try {
    const result = await signOutAndWipeForAccountSwitch();
    if (result.ok) {
      console.log(`[AUTH-SWITCH-OFFER] onboarding switched synced=${result.synced ? 'yes' : 'no'}`);
      return { kind: 'switched' };
    }
    console.warn(`[AUTH-SWITCH-OFFER] onboarding switch_failed reason=${result.reason}`);
    return { kind: 'failed', reason: result.reason };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 80) : typeof error;
    console.warn(`[AUTH-SWITCH-OFFER] onboarding switch_threw reason=${reason}`);
    return { kind: 'failed', reason };
  }
}

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
import { accountSwitchRequiredGuestCopy } from './account_switch_copy';
import { readAccountSwitchUnsavedCardsDecision } from './account_switch_unsaved_cards';
import { signOutAndWipeForAccountSwitch } from './auth_provider';
import { prewarmAccountWipeModules } from './cloud_sync';
import { identityErrorCode } from './identity_trace';
import { THEMED_ALERT_DISMISSED, enqueueThemedBlockingChoiceAlert } from './themed_blocking_alert_queue';
import { releaseReason } from './release_reason';

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
      en: 'Couldn’t save your progress before switching — no connection. Check your connection and try again. Your progress is safe.',
      es: 'No se pudo guardar el progreso antes del cambio: no hay conexión. Revisa internet e inténtalo de nuevo. Tu progreso sigue ahí.',
      'pt-BR': 'Não deu para salvar o progresso antes da troca: sem conexão. Verifique a internet e tente de novo. Seu progresso está salvo.',
      vi: 'Chưa lưu được tiến trình trước khi đổi — không có kết nối. Hãy kiểm tra mạng và thử lại. Tiến trình vẫn còn nguyên.',
      id: 'Progres belum bisa disimpan sebelum ganti — tidak ada koneksi. Periksa internet lalu coba lagi. Progresmu aman.',
      tr: 'Değişiklikten önce ilerleme kaydedilemedi — bağlantı yok. İnterneti kontrol edip tekrar dene. İlerlemen yerinde.',
      pl: 'Nie udało się zapisać postępu przed zmianą — brak połączenia. Sprawdź internet i spróbuj ponownie. Postęp jest bezpieczny.',
    });
  }
  // зачем (решение координатора 06:20 п.5): после 8186fd68a чужая копия в слоте отказа больше не даёт;
  // backup_failed теперь значит «копию не удалось записать на телефоне» (место/проверка). Повтор
  // обычно не помогает, а «Сменить без сохранения» тоже требует копию — говорим причину честно.
  if (reason === 'backup_failed') {
    return triLang(lang, {
      ru: 'Не получилось сохранить копию прогресса на этом телефоне. Ничего не удалено — попробуй позже.',
      uk: 'Не вдалося зберегти копію прогресу на цьому телефоні. Нічого не видалено — спробуй пізніше.',
      en: 'Couldn’t save a copy of your progress on this phone. Nothing was deleted — try again later.',
      es: 'No se pudo guardar una copia de tu progreso en este teléfono. No se borró nada: inténtalo más tarde.',
      'pt-BR': 'Não deu para salvar uma cópia do progresso neste telefone. Nada foi apagado — tente mais tarde.',
      vi: 'Chưa lưu được bản sao tiến trình trên điện thoại này. Không có gì bị xóa — hãy thử lại sau.',
      id: 'Salinan progres belum bisa disimpan di ponsel ini. Tidak ada yang dihapus — coba lagi nanti.',
      tr: 'İlerlemenin kopyası bu telefona kaydedilemedi. Hiçbir şey silinmedi — daha sonra tekrar dene.',
      pl: 'Nie udało się zapisać kopii postępu na tym telefonie. Nic nie zostało usunięte — spróbuj później.',
    });
  }
  // зачем (то же решение): сбой ПОСЛЕ защитного маркера — «Прогресс на месте» было бы неправдой;
  // как в Настройках: перезапуск продолжит восстановление.
  if (reason === 'recovery_required' || reason === 'wipe_failed') {
    return triLang(lang, {
      ru: 'Смена аккаунта началась, но не завершилась. Перезапусти приложение — восстановление продолжится.',
      uk: 'Зміна акаунта почалася, але не завершилася. Перезапусти застосунок — відновлення продовжиться.',
      en: 'The account switch started but didn’t finish. Restart the app to continue the recovery.',
      es: 'El cambio de cuenta empezó, pero no terminó. Reinicia la app para continuar la recuperación.',
      'pt-BR': 'A troca de conta começou, mas não terminou. Reinicie o app para continuar a recuperação.',
      vi: 'Việc đổi tài khoản đã bắt đầu nhưng chưa xong. Hãy khởi động lại ứng dụng để tiếp tục khôi phục.',
      id: 'Pergantian akun sudah dimulai tapi belum selesai. Mulai ulang aplikasi untuk melanjutkan pemulihan.',
      tr: 'Hesap değişimi başladı ama tamamlanmadı. Kurtarmaya devam etmek için uygulamayı yeniden başlat.',
      pl: 'Zmiana konta się zaczęła, ale nie skończyła. Uruchom aplikację ponownie, aby dokończyć przywracanie.',
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

/** Крючки экрана: окно решения ждёт ответа / ответ получен (до самой смены). */
export type OnboardingSwitchDecisionHooks = Readonly<{
  onDecisionPending?: () => void;
  onDecisionMade?: (choice: string) => void;
}>;

export async function confirmAndSwitchAccountInOnboarding(
  lang: Lang,
  hooks?: OnboardingSwitchDecisionHooks,
): Promise<OnboardingAccountSwitchOutcome> {
  // зачем (прогон 11.10): в онбординге это всегда гость — свой честный текст вместо «Телефон уже связан…».
  const copy = accountSwitchRequiredGuestCopy(lang);
  // зачем (прогон Сверки 11.10): пока человек читает окно, модули стирания уже подгружаются.
  prewarmAccountWipeModules('onboarding_switch_confirm');
  // зачем (прогон Сверки 11.10, 🔴 «окно не видно, busy висит»): прежняя строка «confirm shown» писалась ДО показа —
  // окно лишь ставится в очередь, показывает его хост по решению арбитра. Пишем факт постановки и время до ответа.
  const confirmEnqueuedAtMs = Date.now();
  console.log('[AUTH-SWITCH-OFFER] onboarding confirm enqueued (waiting for ThemedBlockingAlertHost)');
  // зачем (Сверка 11.10): пока окно ждёт решения, экран под ним — «ждём тебя», а не «ждём провайдера».
  hooks?.onDecisionPending?.();
  const choice = await enqueueThemedBlockingChoiceAlert<'cancel' | 'switch'>(copy.title, copy.body, [
    {
      label: triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' }),
      value: 'cancel',
      ghost: true,
    },
    { label: copy.action, value: 'switch' },
  ]);
  console.log(`[AUTH-SWITCH-OFFER] onboarding confirm answered choice=${String(choice)} waitedMs=${Date.now() - confirmEnqueuedAtMs}`);
  hooks?.onDecisionMade?.(String(choice));
  if (choice !== 'switch') {
    console.log(`[AUTH-SWITCH-OFFER] onboarding cancelled choice=${choice === THEMED_ALERT_DISMISSED ? 'dismiss' : choice}`);
    releaseReason('account_switch', 'declined', 'blocked');
    return { kind: 'cancelled' };
  }
  const attemptStartedAtMs = Date.now();
  try {
    // зачем ((а), координатор 12.10, реестр п.73; прогон Сверки: синхронизация гостя при смене 3,7 с без потолка): облако ждём не
    // дольше ONBOARDING_SWITCH_SYNC_DEADLINE_MS, как при выходе (вариант Б). Потолок — ТОЛЬКО вместе с allowWipeWithoutSync: иначе на
    // медленной сети отказ sync_failed выводил бы окно «Сменить без сохранения»; аварийная копия гостя пишется под замком до стирания.
    const result = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: ONBOARDING_SWITCH_SYNC_DEADLINE_MS, allowWipeWithoutSync: true });
    if (result.ok) {
      console.log(`[AUTH-SWITCH-OFFER] onboarding switched synced=${result.synced ? 'yes' : 'no'} tookMs=${Date.now() - attemptStartedAtMs}`);
      releaseReason('account_switch', 'confirmed', 'info');
      return { kind: 'switched' };
    }
    console.warn(`[AUTH-SWITCH-OFFER] onboarding switch_failed reason=${result.reason}`);
    releaseReason('account_switch', 'switch_failed', 'error');
    if (FORCEABLE_SWITCH_REASONS.has(result.reason)) {
      // зачем (ревью LOW-1): await — чтобы сбой развилки попал в catch с логом ниже.
      return await offerSwitchWithoutSaving(lang, result.reason, attemptStartedAtMs);
    }
    return { kind: 'failed', reason: result.reason };
  } catch (error) {
    // зачем (TG-0AE4918142EE): в логе только код — в тексте ошибки бывает почта.
    const reason = identityErrorCode(error);
    console.warn(`[AUTH-SWITCH-OFFER] onboarding switch_threw reason=${reason}`);
    releaseReason('account_switch', 'switch_threw', 'error');
    return { kind: 'failed', reason };
  }
}

/**
 * зачем (решение координатора 10.10, LOW-1 ревью): при затяжной операции с монетами,
 * повреждённой очереди или без сети онбординг повторял «попробуй позже» — человек
 * застревал. Как в Настройках: «Остаться здесь» / «Сменить без сохранения». Аварийная
 * копия (включая очередь монет) пишется внутри signOutAndWipeForAccountSwitch, поэтому
 * данные остаются восстановимыми; несохранённые карточки — отдельное предупреждение.
 */
const FORCEABLE_SWITCH_REASONS: ReadonlySet<string> = new Set(['sync_failed', 'pending_shard_spend', 'shard_queue_quarantined']);
/** Потолок ожидания облака при смене аккаунта из онбординга — тот же, что у выхода (LOGOUT_SYNC_DEADLINE_MS, вариант Б). */
export const ONBOARDING_SWITCH_SYNC_DEADLINE_MS = 3000;

const STAY_LABEL = { ru: 'Остаться здесь', uk: 'Залишитися тут', en: 'Stay here', es: 'Quedarme aquí', 'pt-BR': 'Ficar aqui', vi: 'Ở lại đây', id: 'Tetap di sini', tr: 'Burada kal', pl: 'Zostań tutaj' } as const;
const FORCE_LABEL = { ru: 'Сменить без сохранения', uk: 'Змінити без збереження', en: 'Switch without saving', es: 'Cambiar sin guardar', 'pt-BR': 'Trocar sem salvar', vi: 'Đổi mà không lưu', id: 'Ganti tanpa menyimpan', tr: 'Kaydetmeden değiştir', pl: 'Zmień bez zapisywania' } as const;

function forcedSwitchTitle(lang: Lang, reason: string): string {
  if (reason === 'sync_failed') {
    return triLang(lang, { ru: 'Прогресс не сохранён', uk: 'Прогрес не збережено', en: 'Progress not saved', es: 'Progreso no guardado', 'pt-BR': 'Progresso não salvo', vi: 'Chưa lưu tiến độ', id: 'Progres belum disimpan', tr: 'İlerleme kaydedilmedi', pl: 'Postęp nie został zapisany' });
  }
  if (reason === 'pending_shard_spend') {
    return triLang(lang, { ru: 'Покупка ещё синхронизируется', uk: 'Покупка ще синхронізується', en: 'The purchase is still syncing', es: 'La compra aún se está sincronizando', 'pt-BR': 'A compra ainda está sincronizando', vi: 'Giao dịch mua vẫn đang đồng bộ', id: 'Pembelian masih disinkronkan', tr: 'Satın alma hâlâ eşitleniyor', pl: 'Zakup nadal się synchronizuje' });
  }
  return triLang(lang, { ru: 'Нужна проверка монет', uk: 'Потрібна перевірка монет', en: 'Coins need to be checked', es: 'Se deben revisar las monedas', 'pt-BR': 'É preciso verificar as moedas', vi: 'Cần kiểm tra xu', id: 'Koin perlu diperiksa', tr: 'Jetonların kontrol edilmesi gerekiyor', pl: 'Monety wymagają sprawdzenia' });
}

/** зачем (ревью LOW-2): рядом с «Сменить без сохранения» честно сказать, что будет потеряно. */
function forcedSwitchConsequence(lang: Lang): string {
  return triLang(lang, {
    ru: 'Если сменить без сохранения, то, что не успело сохраниться, исчезнет с этого телефона.',
    uk: 'Якщо змінити без збереження, те, що не встигло зберегтися, зникне з цього телефона.',
    en: 'If you switch without saving, anything not yet saved will be removed from this phone.',
    es: 'Si cambias sin guardar, lo que no se guardó desaparecerá de este teléfono.',
    'pt-BR': 'Se trocar sem salvar, o que ainda não foi salvo some deste telefone.',
    vi: 'Nếu đổi mà không lưu, phần chưa kịp lưu sẽ biến mất khỏi điện thoại này.',
    id: 'Jika ganti tanpa menyimpan, yang belum tersimpan akan hilang dari ponsel ini.',
    tr: 'Kaydetmeden değiştirirsen, henüz kaydedilmeyenler bu telefondan silinir.',
    pl: 'Jeśli zmienisz bez zapisywania, to, co nie zostało zapisane, zniknie z tego telefonu.',
  });
}

async function askStayOrForce(title: string, body: string, lang: Lang): Promise<boolean> {
  const choice = await enqueueThemedBlockingChoiceAlert<'stay' | 'force'>(title, body, [
    { label: triLang(lang, STAY_LABEL), value: 'stay', ghost: true },
    { label: triLang(lang, FORCE_LABEL), value: 'force' },
  ]);
  return choice === 'force';
}

async function offerSwitchWithoutSaving(lang: Lang, reason: string, attemptStartedAtMs: number): Promise<OnboardingAccountSwitchOutcome> {
  console.log(`[AUTH-SWITCH-OFFER] onboarding force_offer shown reason=${reason}`);
  const body = [onboardingAccountSwitchFailureText(lang, reason), forcedSwitchConsequence(lang)].join('\n\n');
  if (!(await askStayOrForce(forcedSwitchTitle(lang, reason), body, lang))) {
    console.log(`[AUTH-SWITCH-OFFER] onboarding force_offer stay reason=${reason}`);
    releaseReason('account_switch', 'force_offer_declined', 'blocked');
    return { kind: 'cancelled' };
  }
  const cards = await readAccountSwitchUnsavedCardsDecision(attemptStartedAtMs);
  if (cards.kind === 'confirm_unsaved_cards') {
    console.log(`[AUTH-SWITCH-OFFER] onboarding unsaved_cards_confirm shown reason=${cards.reason}`);
    const title = triLang(lang, { ru: 'Несохранённые карточки будут удалены с этого телефона', uk: 'Незбережені картки буде видалено з цього телефона', en: 'Unsaved cards will be deleted from this phone', es: 'Las tarjetas sin guardar se eliminarán de este teléfono', 'pt-BR': 'Os cartões não salvos serão apagados deste telefone', vi: 'Các thẻ chưa lưu sẽ bị xóa khỏi điện thoại này', id: 'Kartu yang belum disimpan akan dihapus dari ponsel ini', tr: 'Kaydedilmemiş kartlar bu telefondan silinecek', pl: 'Niezapisane fiszki zostaną usunięte z tego telefonu' });
    if (!(await askStayOrForce(title, '', lang))) {
      console.log('[AUTH-SWITCH-OFFER] onboarding unsaved_cards_confirm stay');
      releaseReason('account_switch', 'unsaved_cards_declined', 'blocked');
      return { kind: 'cancelled' };
    }
  }
  const forced = await signOutAndWipeForAccountSwitch({ allowWipeWithoutSync: true, allowPendingShardSpendDiscard: true });
  if (forced.ok) {
    console.log(`[AUTH-SWITCH-OFFER] onboarding forced_switched synced=${forced.synced ? 'yes' : 'no'}`);
    releaseReason('account_switch', 'forced_confirmed', 'info');
    return { kind: 'switched' };
  }
  console.warn(`[AUTH-SWITCH-OFFER] onboarding forced_switch_failed reason=${forced.reason}`);
  releaseReason('account_switch', 'forced_switch_failed', 'error');
  return { kind: 'failed', reason: forced.reason };
}

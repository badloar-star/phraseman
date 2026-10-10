// ════════════════════════════════════════════════════════════════════════════
// startup_recovery_link_copy.ts — честный текст окна восстановления после
// переустановки (context 'startup_recovery' в RegistrationPromptModal).
//
// зачем (TG-AA6EC9A6D998, решение координатора 00:50): окно показывалось на любой
// отказ provider_reauth_required и обещало «Всё в безопасности — войди в тот же
// Google/Apple, вернём прогресс». Гостю (входа не было) это ложь: сервер намеренно
// не перепривязывает анонимный профиль после переустановки
// (tests/auth_identity_anon_relink.test.ts), вернуть такой прогресс нельзя.
//
// Правило выбора:
//   • привязка была достоверно      → прежний текст и заголовок «Всё в безопасности»;
//   • привязки достоверно не было   → «вернуть нельзя, дальше привяжи Google/Apple»;
//   • неизвестно                    → нейтральный текст без обещания «вернём».
//
// Откуда «достоверно»:
//   • 'linked' — текущая сессия Firebase уже Google/Apple (peekLinkedAuthFromCurrentUser),
//     либо серверная подсказка ответила linked:true.
//   • 'not_linked' — ТОЛЬКО по прямому подтверждению сервера о прежнем владельце
//     (ownerLinkedConfirmedByServer === false). Сегодня такого источника нет:
//     отказ stable_id_mismatch приходит без подробностей, подсказка authRecoveryHint
//     мертва (app_check_required), а её linked:false относится к ТЕКУЩЕЙ привязке
//     (после ротации stableId это новый пустой профиль) — опираться на неё нельзя,
//     иначе пользователю с Google сказали бы «вернуть нельзя». Поэтому на практике
//     гость сейчас видит нейтральный текст; честная ветка готова к серверному признаку.
// ════════════════════════════════════════════════════════════════════════════

import { triLang, type Lang } from '../constants/i18n';

export type StartupRecoveryLinkState = 'linked' | 'not_linked' | 'unknown';

export type StartupRecoveryLinkInput = Readonly<{
  /** Провайдер ТЕКУЩЕЙ сессии Firebase (null — сессия анонимная или ещё не поднялась). */
  sessionProvider: 'google' | 'apple' | null;
  /** Серверная подсказка ответила linked:true (сегодня подсказка мертва — всегда false). */
  hintLinked: boolean;
  /**
   * Прямое подтверждение сервера о прежнем владельце профиля: true — у него был
   * Google/Apple, false — не было, null/undefined — сервер не сказал.
   */
  ownerLinkedConfirmedByServer?: boolean | null;
}>;

export type StartupRecoveryLinkDecision = Readonly<{
  state: StartupRecoveryLinkState;
  /** Какое значение решило — для лога [AUTH-RECOVERY-COPY]. */
  decidedBy: 'session_provider' | 'recovery_hint' | 'server_owner_linked' | 'server_owner_not_linked' | 'no_reliable_signal';
}>;

export function resolveStartupRecoveryLinkState(input: StartupRecoveryLinkInput): StartupRecoveryLinkDecision {
  if (input.sessionProvider === 'google' || input.sessionProvider === 'apple') {
    return { state: 'linked', decidedBy: 'session_provider' };
  }
  if (input.hintLinked) return { state: 'linked', decidedBy: 'recovery_hint' };
  if (input.ownerLinkedConfirmedByServer === true) return { state: 'linked', decidedBy: 'server_owner_linked' };
  if (input.ownerLinkedConfirmedByServer === false) return { state: 'not_linked', decidedBy: 'server_owner_not_linked' };
  return { state: 'unknown', decidedBy: 'no_reliable_signal' };
}

export type StartupRecoveryHonestCopy = Readonly<{ title: string; subtitle: string }>;

/**
 * Текст окна для состояний без доказанной привязки. null — привязка была:
 * окно оставляет прежние «Всё в безопасности» и «войди в тот же аккаунт».
 */
export function getStartupRecoveryHonestCopy(
  lang: Lang,
  state: StartupRecoveryLinkState,
): StartupRecoveryHonestCopy | null {
  if (state === 'linked') return null;
  if (state === 'not_linked') {
    return {
      title: triLang(lang, {
        ru: 'Прошлый прогресс не сохранился',
        uk: 'Минулий прогрес не зберігся',
        en: 'Earlier progress wasn’t saved',
        es: 'El progreso anterior no se guardó',
        'pt-BR': 'O progresso anterior não foi salvo',
        vi: 'Tiến độ trước đây chưa được lưu',
        id: 'Progres sebelumnya tidak tersimpan',
        tr: 'Önceki ilerleme kaydedilmedi',
        pl: 'Wcześniejszy postęp nie został zapisany',
      }),
      subtitle: triLang(lang, {
        ru: 'Этот прогресс был без входа — вернуть его нельзя. Дальше привяжи Google или Apple, чтобы он сохранялся.',
        uk: 'Цей прогрес був без входу — повернути його не можна. Далі прив’яжи Google або Apple, щоб він зберігався.',
        en: 'This progress was made without signing in — it can’t be restored. Link Google or Apple from now on to keep it saved.',
        es: 'Este progreso se hizo sin iniciar sesión, así que no se puede recuperar. Vincula Google o Apple para que se guarde a partir de ahora.',
        'pt-BR': 'Este progresso foi feito sem entrar na conta — não dá para recuperá-lo. Vincule Google ou Apple para salvá-lo daqui para frente.',
        vi: 'Tiến độ này được tạo khi chưa đăng nhập nên không thể khôi phục. Từ giờ hãy liên kết Google hoặc Apple để tiến độ được lưu.',
        id: 'Progres ini dibuat tanpa masuk, jadi tidak bisa dipulihkan. Mulai sekarang tautkan Google atau Apple agar progres tersimpan.',
        tr: 'Bu ilerleme giriş yapmadan kazanıldı, geri getirilemez. Bundan sonra kaydedilmesi için Google veya Apple bağla.',
        pl: 'Ten postęp powstał bez logowania — nie da się go przywrócić. Od teraz połącz Google lub Apple, żeby się zapisywał.',
      }),
    };
  }
  return {
    title: triLang(lang, {
      ru: 'Был ли вход раньше?',
      uk: 'Чи був вхід раніше?',
      en: 'Did you sign in before?',
      es: '¿Iniciaste sesión antes?',
      'pt-BR': 'Você já entrou antes?',
      vi: 'Trước đây bạn đã đăng nhập chưa?',
      id: 'Pernah masuk sebelumnya?',
      tr: 'Daha önce giriş yaptın mı?',
      pl: 'Czy było wcześniej logowanie?',
    }),
    subtitle: triLang(lang, {
      ru: 'Войди тем способом, которым входил раньше. Если входа не было, этот прогресс вернуть нельзя.',
      uk: 'Увійди тим способом, яким входив раніше. Якщо входу не було, цей прогрес повернути не вийде.',
      en: 'Sign in the way you did before. If you never signed in, this progress can’t be restored.',
      es: 'Inicia sesión como lo hacías antes. Si nunca iniciaste sesión, este progreso no se puede recuperar.',
      'pt-BR': 'Entre do mesmo jeito que antes. Se você nunca entrou, este progresso não pode ser recuperado.',
      vi: 'Hãy đăng nhập theo cách bạn đã dùng trước đây. Nếu trước đây chưa đăng nhập, tiến độ này không thể khôi phục.',
      id: 'Masuk dengan cara yang sama seperti sebelumnya. Jika dulu belum pernah masuk, progres ini tidak bisa dipulihkan.',
      tr: 'Daha önce nasıl giriş yaptıysan öyle giriş yap. Hiç giriş yapmadıysan bu ilerleme geri getirilemez.',
      pl: 'Zaloguj się tak jak wcześniej. Jeśli nie było logowania, tego postępu nie da się przywrócić.',
    }),
  };
}

/**
 * Строка под заголовком («N дней твоего пути уже сохранены» / «Твой путь сохранится»)
 * — это обещание сохранности. В окне восстановления без доказанной привязки её не
 * показываем: обещать нечего.
 */
export function shouldShowSavedJourneyLine(
  context: string,
  state: StartupRecoveryLinkState,
): boolean {
  return context !== 'startup_recovery' || state === 'linked';
}

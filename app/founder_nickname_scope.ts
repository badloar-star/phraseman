/**
 * Ник «Пропуска основателя» с владельцем (область аккаунта).
 *
 * зачем (координатор 15.10, изоляция аккаунтов): во вкладке «Обучение» ник жил в useState без владельца, а эффект ставил его
 * только при непустом имени — после смены аккаунта новый человек видел «＠ник» прошлого гостя/аккаунта (вкладка остаётся
 * смонтированной). Теперь ник хранится вместе с областью аккаунта (accountScopeHash) и показывается только ей; смена области
 * при пустом имени сбрасывает ник. Чистые функции — тестируются без экрана.
 * Лог [FOUNDER-NICK] {source, scope (8 знаков хэша), present} — сам ник не пишется (персональные данные).
 */

export type FounderNickState = Readonly<{ scope: string | null; value: string | null }>;
export type FounderNickSource = 'snapshot' | 'storage_user_name' | 'none';

/** Ник к показу: только если он принадлежит текущей области аккаунта. */
export function visibleFounderNickname(state: FounderNickState, currentScope: string | null): string | null {
  return currentScope !== null && state.scope === currentScope ? state.value : null;
}

/**
 * Новое состояние ника для области `scope`. Пустое имя в ТОЙ ЖЕ области не стирает известный ник (снимок мог ещё не прийти);
 * в другой области — сброс (чужой ник не переносится). Без области — ник не запоминаем.
 */
export function nextFounderNickState(
  previous: FounderNickState,
  scope: string | null,
  nickname: string | null,
): FounderNickState {
  if (scope === null) return previous.scope === null && previous.value === null ? previous : { scope: null, value: null };
  if (nickname === null) {
    if (previous.scope === scope) return previous;
    return { scope, value: null };
  }
  return previous.scope === scope && previous.value === nickname ? previous : { scope, value: nickname };
}

export type FounderPassNicknameSource = 'pending' | 'confirmed' | 'none';

/**
 * Ник, который печатает «Пропуск основателя».
 *
 * зачем (координатор 15.10, Сверка: «＠Neon 39486» у свежего гостя через ~20 с сменился другим): пока сервер не подтвердил
 * сгенерированный ник (висит GENERATED_NICKNAME_PENDING_KEY — app/nickname_guard.ts), имя в профиле может оказаться временным.
 * Пропуск «персональный», поэтому временное имя не печатаем: окно показывается сразу (правило владельца 20.09 «1 раз каждый
 * юзер при входе», имя — украшение), строка ника появляется после подтверждения. Флаг ещё не прочитан (null) — тоже не печатаем:
 * лучше без имени кадр, чем мелькнувшее чужое.
 */
export function founderPassNicknameForModal(
  nickname: string | null,
  generatedPending: boolean | null,
): Readonly<{ nickname: string | null; source: FounderPassNicknameSource }> {
  if (nickname === null) return { nickname: null, source: 'none' };
  if (generatedPending !== false) return { nickname: null, source: 'pending' };
  return { nickname, source: 'confirmed' };
}

export function logFounderPassNickname(source: FounderPassNicknameSource, generatedPending: boolean | null): void {
  console.log('[FOUNDER-PASS]', JSON.stringify({ nickname_source: source, generatedPending })); // guard-ok: без самого ника
}

export function logFounderNick(source: FounderNickSource, scope: string | null, nickname: string | null): void {
  console.log('[FOUNDER-NICK]', JSON.stringify({ source, scope: scope ? scope.slice(0, 8) : null, present: nickname !== null })); // guard-ok: без самого ника
}

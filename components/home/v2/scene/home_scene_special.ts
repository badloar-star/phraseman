// ═══════════════════════════════════════════════════════════════════════════
// home_scene_special.ts — «особые» сцены Главной поверх обычного героя (pickHomeSceneState).
//
// зачем (владелец 25.10 утвердил все 12 новых состояний, макет a5618fcc4; спецификация
// docs/work/tasks/home-scene-new-states-spec-2026-10-25.md): чистая функция без React, хранилища и сети — всё из данных
// телефона (0 новых чтений Firestore). Правила:
//   - срочные (newbie, streak_risk, no_energy, welcome_back, streak_lost, exam_ready) всегда главнее — особой сцены нет;
//   - особая сцена — не чаще одной в день: уже показанная сегодня остаётся до конца дня (повторный вход не «скачет»),
//     другая сегодня не показывается;
//   - одна и та же — не два дня подряд (праздник — исключение: он и есть «в сам день»);
//   - у каждой — своя частота (дни между показами) и, где нужно, частота по ключу (та же ошибка, тот же друг, рубеж);
//   - порядок — из таблицы: milestone → holiday → (all_done) → mistakes_pile → words_due → peak_overtaken → friend_nudge →
//     mistake_poke → phrase_of_day_unseen → personal_best → mistake_mastered → weekly_recap → fun_stats.
//   - «вместо»: personal_best — только вместо «Продолжить»; mistake_mastered и fun_stats — только вместо «День засчитан».
// Причина решения (значения, не голое true/false) возвращается в reason — её пишет журнал [HOME-SCENE].
// ═══════════════════════════════════════════════════════════════════════════

import type { HomeSceneDecision, HomeSceneState } from './home_scene_state';

export const HOME_SCENE_SPECIAL_STATES = [
  'milestone', 'holiday', 'mistakes_pile', 'words_due', 'peak_overtaken', 'friend_nudge', 'mistake_poke',
  'phrase_of_day_unseen', 'personal_best', 'mistake_mastered', 'weekly_recap', 'fun_stats',
] as const;
export type HomeSceneSpecialState = typeof HOME_SCENE_SPECIAL_STATES[number];

/** Обычные герои, которые особая сцена не перебивает (таблица: «срочные всегда главнее»). */
export const HOME_SCENE_URGENT: ReadonlySet<HomeSceneState> = new Set<HomeSceneState>([
  'newbie', 'streak_risk', 'no_energy', 'welcome_back', 'streak_lost', 'exam_ready',
]);

/** Пороги из таблицы. */
export const HOME_SCENE_SPECIAL_LIMITS = Object.freeze({
  mistakesPile: 15,
  mistakeRepeats: 2,
  wordsDue: 12,
  personalBestGap: 10,
  funStatsMinDays: 7,
  phraseOfDayUntilHour: 20,
});

/** Дней между показами одной и той же сцены (1 — можно каждый день; Infinity — один раз на ключ). */
export const HOME_SCENE_SPECIAL_EVERY_DAYS: Readonly<Record<HomeSceneSpecialState, number>> = Object.freeze({
  milestone: 1, holiday: 1, mistakes_pile: 3, words_due: 2, peak_overtaken: 1, friend_nudge: 3, mistake_poke: 2,
  phrase_of_day_unseen: 1, personal_best: 5, mistake_mastered: 1, weekly_recap: 7, fun_stats: 3,
});

/** Дней между показами по одному ключу (та же ошибка, тот же друг); Infinity — один раз на ключ (рубеж, исправленная ошибка). */
const KEY_EVERY_DAYS: Partial<Record<HomeSceneSpecialState, number>> = Object.freeze({
  milestone: Infinity, mistake_mastered: Infinity, mistake_poke: 7, friend_nudge: 7,
});

/** Праздники по календарю телефона ('MM-DD'). Расширять здесь — вместе с картинкой и строками Переводчика. */
export const HOME_SCENE_HOLIDAYS: Readonly<Record<string, string>> = Object.freeze({
  '10-31': 'halloween',
  '12-31': 'new_year',
  '01-01': 'new_year',
});

/** Всё, что Главная уже знает локально; null — неизвестно (сцену не показываем вслепую). */
export type HomeSceneSpecialInput = Readonly<{
  now: Date;
  /** Неразобранных ошибок в локальном журнале «Мои ошибки». */
  mistakesOpen: number | null;
  /** Ошибка, повторённая ≥ 2 раз (та же фраза): id и сколько раз. */
  repeatedMistake: Readonly<{ id: string; times: number }> | null;
  /**
   * Ошибка, исправленная СЕГОДНЯ (журнал «Мои ошибки»: status corrected, correctedAtMs — сегодня).
   * зачем (координатор 25.10, замена данных): счётчика «5 раз подряд» на телефоне нет — сцена про исправление сегодня.
   */
  masteredMistake: Readonly<{ id: string }> | null;
  /** Фраза дня сегодня уже открыта (локальная отметка). */
  phraseOfDaySeen: boolean | null;
  /** Слов ждут повтора по графику карточек. */
  wordsDue: number | null;
  /** Дней с прогрессом всего (для «интересной статистики»). */
  progressDays: number | null;
  /** Заданий сегодня и рекорд дня (локальная история дней). */
  today: Readonly<{ tasks: number; bestDay: number }> | null;
  /** Была активность на прошлой неделе (для итогов недели в понедельник). */
  activeLastWeek: boolean | null;
  /** Сегодня пересечён рубеж: ключ ('phrases_100', 'lessons_10', 'rank_3'). */
  milestoneKey: string | null;
  /**
   * Взаимный друг, который сегодня уже занимался (дни друга из уже загруженного снимка «Вместе»).
   * зачем (координатор 25.10, замена данных): числа уроков друга за сегодня на телефоне нет.
   */
  friendAhead: Readonly<{ uid: string }> | null;
  /** В кэше комнаты недели тебя обогнали с прошлого входа: место было → стало. */
  peakOvertaken: Readonly<{ from: number; to: number }> | null;
}>;

/** Журнал показов — локально (AsyncStorage), на сервер не уходит. Дни — ключи 'YYYY-MM-DD' по часам телефона. */
export type HomeSceneSpecialJournal = Readonly<{
  /** Последняя показанная особая сцена и её день. */
  last: Readonly<{ state: HomeSceneSpecialState; day: string; key: string | null }> | null;
  /** Последний день показа каждой сцены. */
  byState: Readonly<Partial<Record<HomeSceneSpecialState, string>>>;
  /** Последний день показа по ключу: `${state}:${key}`. */
  byKey: Readonly<Record<string, string>>;
}>;

export const HOME_SCENE_SPECIAL_EMPTY_JOURNAL: HomeSceneSpecialJournal = Object.freeze({ last: null, byState: Object.freeze({}), byKey: Object.freeze({}) });

export type HomeSceneSpecialDecision = Readonly<{
  /** Особая сцена или null — остаётся обычный герой (base). */
  special: HomeSceneSpecialState | null;
  /** Ключ показа (id ошибки, uid друга, рубеж, праздник) — для журнала и экрана. */
  key: string | null;
  /** Что решило выбор, для [HOME-SCENE]. */
  reason: string;
}>;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function homeSceneDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Полных календарных дней от a до b ('YYYY-MM-DD'); плохая дата — Infinity (как «давно не показывали»). */
function daysBetween(a: string | undefined, b: string): number {
  const ma = a ? DAY_KEY.exec(a) : null;
  const mb = DAY_KEY.exec(b);
  if (!ma || !mb) return Infinity;
  const ta = Date.UTC(Number(ma[1]), Number(ma[2]) - 1, Number(ma[3]));
  const tb = Date.UTC(Number(mb[1]), Number(mb[2]) - 1, Number(mb[3]));
  return Math.round((tb - ta) / 86_400_000);
}

/** Тон «Продолжить» по времени суток: утро до 9:00, поздний вечер с 22:00 (не отдельная сцена). */
export function homeSceneTimeTone(hour: number): 'morning' | 'late' | null {
  if (hour < 9) return 'morning';
  if (hour >= 22) return 'late';
  return null;
}

export function homeSceneHolidayOn(now: Date): string | null {
  const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return HOME_SCENE_HOLIDAYS[md] ?? null;
}

type Candidate = Readonly<{ state: HomeSceneSpecialState; key: string | null; why: string }>;

/** Подходящие по данным сцены в порядке приоритета — без частот (их проверяет pickHomeSceneSpecial). */
export function homeSceneSpecialCandidates(input: HomeSceneSpecialInput, base: HomeSceneState): Candidate[] {
  const L = HOME_SCENE_SPECIAL_LIMITS;
  const hour = input.now.getHours();
  const out: Candidate[] = [];
  const push = (state: HomeSceneSpecialState, key: string | null, why: string): void => { out.push({ state, key, why }); };
  if (input.milestoneKey) push('milestone', input.milestoneKey, `milestone=${input.milestoneKey}`);
  const holiday = homeSceneHolidayOn(input.now);
  if (holiday) push('holiday', holiday, `holiday=${holiday}`);
  // «Всё пройдено» стоит в таблице между праздником и ошибками: ниже него — только рубеж и праздник.
  if (base === 'all_done') return out;
  if (input.mistakesOpen !== null && input.mistakesOpen >= L.mistakesPile) push('mistakes_pile', null, `mistakesOpen=${input.mistakesOpen}`);
  if (input.wordsDue !== null && input.wordsDue >= L.wordsDue) push('words_due', null, `wordsDue=${input.wordsDue}`);
  if (input.peakOvertaken && input.peakOvertaken.to > input.peakOvertaken.from) {
    push('peak_overtaken', null, `peak ${input.peakOvertaken.from}→${input.peakOvertaken.to}`);
  }
  if (input.friendAhead) push('friend_nudge', input.friendAhead.uid, 'friendActiveToday=true');
  if (input.repeatedMistake && input.repeatedMistake.times >= L.mistakeRepeats) {
    push('mistake_poke', input.repeatedMistake.id, `mistakeTimes=${input.repeatedMistake.times}`);
  }
  if (input.phraseOfDaySeen === false && hour < L.phraseOfDayUntilHour) push('phrase_of_day_unseen', null, `phraseSeen=false hour=${hour}`);
  if (base === 'continue' && input.today && input.today.bestDay > 0) {
    const gap = input.today.bestDay - input.today.tasks;
    if (gap > 0 && gap <= L.personalBestGap) push('personal_best', null, `tasks=${input.today.tasks} best=${input.today.bestDay}`);
  }
  if (base === 'day_done' && input.masteredMistake) push('mistake_mastered', input.masteredMistake.id, 'correctedToday=true');
  if (input.now.getDay() === 1 && input.activeLastWeek === true) push('weekly_recap', null, 'monday activeLastWeek=true');
  if (base === 'day_done' && input.progressDays !== null && input.progressDays >= L.funStatsMinDays) {
    push('fun_stats', null, `progressDays=${input.progressDays}`);
  }
  return out;
}

/** Особая сцена поверх обычного героя: base — решение pickHomeSceneState. */
export function pickHomeSceneSpecial(
  input: HomeSceneSpecialInput,
  base: HomeSceneDecision,
  journal: HomeSceneSpecialJournal,
): HomeSceneSpecialDecision {
  const none = (reason: string): HomeSceneSpecialDecision => Object.freeze({ special: null, key: null, reason });
  if (HOME_SCENE_URGENT.has(base.state)) return none(`urgent base=${base.state}`);
  const today = homeSceneDayKey(input.now);
  const candidates = homeSceneSpecialCandidates(input, base.state);
  if (candidates.length === 0) return none(`no candidates base=${base.state}`);
  // Сегодня особая сцена уже была: та же остаётся (если ещё подходит), другая — нет.
  if (journal.last && journal.last.day === today) {
    const same = candidates.find((c) => c.state === journal.last?.state);
    return same
      ? Object.freeze({ special: same.state, key: same.key, reason: `same as earlier today: ${same.why}` })
      : none(`already shown today: ${journal.last.state}; candidates=${candidates.map((c) => c.state).join(',')}`);
  }
  const skipped: string[] = [];
  for (const c of candidates) {
    if (c.state !== 'holiday' && journal.last?.state === c.state && daysBetween(journal.last.day, today) === 1) {
      skipped.push(`${c.state}:yesterday`);
      continue;
    }
    const every = HOME_SCENE_SPECIAL_EVERY_DAYS[c.state];
    const sinceState = daysBetween(journal.byState[c.state], today);
    if (sinceState < every) { skipped.push(`${c.state}:every${every}d since=${sinceState}`); continue; }
    const keyEvery = KEY_EVERY_DAYS[c.state];
    if (keyEvery !== undefined && c.key !== null) {
      const seenDay = journal.byKey[`${c.state}:${c.key}`];
      const sinceKey = daysBetween(seenDay, today);
      if (seenDay !== undefined && (keyEvery === Infinity || sinceKey < keyEvery)) {
        skipped.push(`${c.state}:key=${c.key} since=${sinceKey}`);
        continue;
      }
    }
    return Object.freeze({ special: c.state, key: c.key, reason: `${c.why}${skipped.length ? ` (skipped ${skipped.join(' ')})` : ''}` });
  }
  return none(`all skipped base=${base.state}: ${skipped.join(' ')}`);
}

/**
 * Ключ показа для журнала [HOME-SCENE]: uid друга не печатаем.
 * зачем (Ревизор 25.10 по 3a42a7e8f, приватность): в журнал — только «друг», как в Пике; id ошибок и рубежи — не личные данные.
 */
export function homeSceneSpecialLogKey(state: HomeSceneSpecialState | null | undefined, key: string | null | undefined): string | null {
  if (key === null || key === undefined) return null;
  return state === 'friend_nudge' ? 'friend' : key;
}

/** Новый журнал после показа (неизменяемо). Повторный показ в тот же день журнал не меняет. */
export function recordHomeSceneSpecialShown(
  journal: HomeSceneSpecialJournal,
  state: HomeSceneSpecialState,
  key: string | null,
  now: Date,
): HomeSceneSpecialJournal {
  const day = homeSceneDayKey(now);
  if (journal.last && journal.last.day === day && journal.last.state === state) return journal;
  return Object.freeze({
    last: Object.freeze({ state, day, key }),
    byState: Object.freeze({ ...journal.byState, [state]: day }),
    byKey: key === null ? journal.byKey : Object.freeze({ ...journal.byKey, [`${state}:${key}`]: day }),
  });
}

/** Разбор журнала из хранилища: мусор → пустой журнал (не падаем на старом формате). */
export function parseHomeSceneSpecialJournal(raw: unknown): HomeSceneSpecialJournal {
  if (!raw || typeof raw !== 'object') return HOME_SCENE_SPECIAL_EMPTY_JOURNAL;
  const r = raw as { last?: unknown; byState?: unknown; byKey?: unknown };
  const states = new Set<string>(HOME_SCENE_SPECIAL_STATES);
  const strMap = (v: unknown, keyOk: (k: string) => boolean): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v === 'object') for (const [k, d] of Object.entries(v as Record<string, unknown>)) if (keyOk(k) && typeof d === 'string' && DAY_KEY.test(d)) out[k] = d;
    return out;
  };
  const l = r.last as { state?: unknown; day?: unknown; key?: unknown } | null | undefined;
  const last = l && typeof l.state === 'string' && states.has(l.state) && typeof l.day === 'string' && DAY_KEY.test(l.day)
    ? Object.freeze({ state: l.state as HomeSceneSpecialState, day: l.day, key: typeof l.key === 'string' ? l.key : null })
    : null;
  return Object.freeze({
    last,
    byState: Object.freeze(strMap(r.byState, (k) => states.has(k))),
    byKey: Object.freeze(strMap(r.byKey, (k) => states.has(k.split(':')[0] ?? ''))),
  });
}

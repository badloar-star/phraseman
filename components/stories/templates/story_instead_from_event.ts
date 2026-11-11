// ═══════════════════════════════════════════════════════════════════════════
// story_instead_from_event.ts — событие `instead` → данные кадра «истории вместо окон».
//
// зачем (владелец 11.11, шаг 2): кадр показывает только то, что лежит в событии, и только если данные целы. Битое событие
// (нет числа, отрицательное, ранг вне таблицы) кадра не даёт — лучше пропустить историю, чем показать «0 дней перерыва».
// Подключены четыре вида: `back` («С возвращением»), `rank_enough` («Хватает на ранг»), `legacy` («Бонусы стали монетами»),
// `plus_expired` («Plus закончился»), `ref_ended` («Доступ можно открыть снова»),
// `ref_welcome` («Тебя пригласили»), `first_dialog` («Первый разговор»), `rate` («Оцените приложение»),
// `perfect` («Идеальный урок»), `lesson_open` («Открыт урок N»),
// `medal` («Медаль урока»), `level_exam` и `lingman_exam` (открытие экзаменов),
// `update` («Вышло обновление»), `nudge` («Включить напоминания»), `hello` («Добро пожаловать»),
// `message` («Сообщение» команды), `plus_on` («Plus подключён»), `peak_rise` / `peak_overtake` / `peak_last` (окна позиции Пика).
// Без источника остаётся кадр приза набора: его событие уже показывает история Сообщества.
// Числа проверяются строго: строка '6' и дробное 6.9 не превращаются в 6 — так уже маскировался битый payload у ранга монеты.
// ═══════════════════════════════════════════════════════════════════════════
import { isValidCoinRank } from '../../../app/coin_rank_table_v1';
import type { StoryInsteadTemplate } from './story_instead_registry';

// зачем (release-gate 11.11, TS2345): данные события приходят из журнала как «неизвестно что» (StoryEventLike: Record<string, unknown>) —
// так их и принимаем; каждое поле ниже проверяется по типу перед использованием, поэтому сужать тип на входе незачем и нечестно.
type Payload = Readonly<Record<string, unknown>>;

/** Целое неотрицательное число как есть; иначе null. */
function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Виды событий `instead`, у которых уже есть источник. */
export const STORY_INSTEAD_EVENT_KINDS = ['back', 'rank_enough', 'legacy', 'plus_expired', 'ref_ended', 'ref_welcome', 'first_dialog', 'rate', 'perfect', 'lesson_open', 'medal', 'level_exam', 'lingman_exam', 'update', 'nudge', 'hello', 'message', 'plus_on', 'peak_rise', 'peak_overtake', 'peak_last'] as const;

const RATE_CONTEXTS = ['perfect_lesson', 'level_exam_pass', 'streak_milestone'] as const;
const RATE_STREAK_DAYS = [7, 14, 30] as const;
const MEDAL_STEPS = ['bronze', 'silver', 'gold'] as const;

/** Оценка урока 0…5 (бывает дробной: 4.7); иначе null. */
function lessonScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5 ? value : null;
}

export function insteadTemplateFromPayload(p: Payload): StoryInsteadTemplate | null {
  switch (p.kind) {
    case 'back': {
      const daysAway = count(p.daysAway);
      const dueCards = count(p.dueCards);
      const phrasesLearned = count(p.phrasesLearned);
      if (daysAway === null || daysAway < 1 || dueCards === null || phrasesLearned === null) return null;
      const coinRank = isValidCoinRank(p.coinRank) ? p.coinRank : null;
      return { id: 'instead_back', coinRank, daysAway, dueCards, phrasesLearned };
    }
    case 'rank_enough': {
      const balance = count(p.balance);
      const price = count(p.price);
      if (!isValidCoinRank(p.rank) || !isValidCoinRank(p.nextRank) || p.nextRank !== p.rank + 1) return null;
      // зачем: кадр обещает «хватает» — если в событии баланс меньше цены, это битые данные, а не повод показать неправду
      if (balance === null || price === null || price < 1 || balance < price) return null;
      return { id: 'instead_rank', rank: p.rank, nextRank: p.nextRank, balance, price };
    }
    case 'legacy': {
      const coins = count(p.coins);
      const xpBefore = count(p.xpBefore);
      const pearlsBefore = count(p.pearlsBefore);
      const spinsBefore = count(p.spinsBefore);
      // зачем (владелец 15.10): окно показывалось и при нулевом итоге — человек должен узнать, что пересчёт был; кадр ведёт себя так же
      if (coins === null || xpBefore === null || pearlsBefore === null || spinsBefore === null) return null;
      return { id: 'instead_legacy', coins, xpBefore, pearlsBefore, spinsBefore };
    }
    case 'plus_expired': {
      const freezesPerMonth = count(p.freezesPerMonth);
      if (freezesPerMonth === null || freezesPerMonth < 1) return null;
      // дату окончания хост истёкшей подписки не знает — кадр идёт без строки с датой
      return { id: 'instead_plus_expired', untilLabel: null, freezesPerMonth };
    }
    case 'ref_ended': {
      const windowEndMs = count(p.windowEndMs);
      if (windowEndMs === null || windowEndMs < 1) return null;
      return { id: 'instead_ref_ended', windowEndMs };
    }
    case 'ref_welcome':
      return { id: 'instead_ref_welcome', needsCodeEntry: p.needsCodeEntry === true };
    case 'first_dialog': {
      const turns = count(p.turns);
      const goalsDone = count(p.goalsDone);
      const goalsTotal = count(p.goalsTotal);
      if (typeof p.studyTarget !== 'string' || p.studyTarget.length === 0) return null;
      if (turns === null || turns < 1 || goalsDone === null || goalsTotal === null || goalsDone > goalsTotal) return null;
      return { id: 'instead_first_dialog', studyTarget: p.studyTarget, turns, goalsDone, goalsTotal };
    }
    case 'rate': {
      const context = RATE_CONTEXTS.find((c) => c === p.context);
      if (!context) return null;
      // длина серии — только три рубежа окна; иное (0 = «нет») кадр показывает без строки серии, как окно без карточки
      const streakDays = RATE_STREAK_DAYS.find((d) => d === p.streakDays) ?? null;
      return { id: 'instead_rate', context, streakDays: context === 'streak_milestone' ? streakDays : null };
    }
    case 'perfect': {
      const lessonNo = count(p.lessonNo);
      const total = count(p.total);
      const coins = count(p.coins);
      if (lessonNo === null || lessonNo < 1 || total === null || total < 1 || coins === null) return null;
      // идеальный проход: верных столько же, сколько заданий — другого счёта у этого события не бывает
      return { id: 'instead_perfect', lessonNo, correct: total, total, coins };
    }
    case 'lesson_open': {
      const lessonNo = count(p.lessonNo);
      const nextLessonNo = count(p.nextLessonNo);
      if (lessonNo === null || lessonNo < 1 || nextLessonNo !== lessonNo + 1) return null;
      // темы следующего урока уведомление не знало — кадр идёт без строки «Тема: …»
      return { id: 'instead_lesson_open', lessonNo, nextLessonNo, topic: null };
    }
    case 'medal': {
      const lessonNo = count(p.lessonNo);
      const tier = MEDAL_STEPS.find((t) => t === p.tier);
      const score = lessonScore(p.score);
      if (lessonNo === null || lessonNo < 1 || !tier || score === null) return null;
      return { id: 'instead_medal', lessonNo, tier, score };
    }
    case 'level_exam': {
      const lessonNo = count(p.lessonNo);
      const score = lessonScore(p.score);
      if (typeof p.cefrLevel !== 'string' || p.cefrLevel.length === 0) return null;
      if (lessonNo === null || lessonNo < 1 || score === null) return null;
      return { id: 'instead_level_exam', cefrLevel: p.cefrLevel, lessonNo, score };
    }
    case 'lingman_exam': {
      const lessonNo = count(p.lessonNo);
      const score = lessonScore(p.score);
      if (lessonNo === null || lessonNo < 1 || score === null) return null;
      return { id: 'instead_lingman_exam', lessonNo, score };
    }
    case 'update': {
      // текст из настроек необязателен: нет строки или она пустая — кадр покажет стандартный текст окна
      const message = typeof p.message === 'string' && p.message.trim().length > 0 ? p.message : null;
      return { id: 'instead_update', message };
    }
    case 'nudge': {
      const missedDays = count(p.missedDays);
      // окно показывалось только при пропущенных днях — ноль дней кадра не даёт
      if (missedDays === null || missedDays < 1) return null;
      return { id: 'instead_nudge', missedDays };
    }
    case 'hello':
      if (!isValidCoinRank(p.coinRank)) return null;
      return { id: 'instead_hello', coinRank: p.coinRank };
    case 'message': {
      // письмо без текста кадра не даёт; заголовка может не быть — тогда кадр, как окно, пишет «Сообщение»
      if (typeof p.body !== 'string' || p.body.trim().length === 0) return null;
      return { id: 'instead_message', title: typeof p.title === 'string' ? p.title.trim() : '', body: p.body };
    }
    case 'plus_on':
      // уровень подписки; в старых событиях (до 11.11) его нет — тогда Plus: Ultra по догадке не показываем
      return { id: 'instead_plus_on', tier: p.tier === 'ultra' ? 'ultra' : 'plus' };
    case 'peak_rise': {
      const fromIndex = count(p.fromIndex);
      const toIndex = count(p.toIndex);
      const coinsGained = count(p.coinsGained);
      // место выросло — «стало» выше «было»; иначе это не подъём
      if (fromIndex === null || toIndex === null || toIndex >= fromIndex || coinsGained === null) return null;
      return { id: 'instead_peak_rise', fromIndex, toIndex, coinsGained };
    }
    case 'peak_overtake': {
      const gapCoins = count(p.gapCoins);
      if (typeof p.rivalName !== 'string' || p.rivalName.trim().length === 0 || gapCoins === null) return null;
      return {
        id: 'instead_peak_overtake', rivalName: p.rivalName.trim(),
        rivalCoinRank: isValidCoinRank(p.rivalCoinRank) ? p.rivalCoinRank : null,
        gapCoins, gapSteps: count(p.gapSteps),
      };
    }
    case 'peak_last': {
      const weekEndsAtMs = count(p.weekEndsAtMs);
      const energyReadyAtMs = count(p.energyReadyAtMs);
      if (weekEndsAtMs === null || weekEndsAtMs < 1 || energyReadyAtMs === null) return null;
      // зачем (владелец 11.11: «Считать при открытии»): неделя уже закончилась — «последнего шанса» больше нет, кадр не строим
      if (Date.now() >= weekEndsAtMs) return null;
      return { id: 'instead_peak_last', weekEndsAtMs, energyReadyAtMs, gapCoins: count(p.gapCoins), gapSteps: count(p.gapSteps) };
    }
    default:
      return null;
  }
}

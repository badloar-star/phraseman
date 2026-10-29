// ═══════════════════════════════════════════════════════════════════════════
// story_template_from_event.ts — событие историй → шаблон кадра с данными (что кадр берёт из payload).
//
// зачем (опись макета stories-templates-v1.html: «Данные — что кадр берёт из payload; ничего сверх этого кадр не выдумывает»): одна чистая
// функция на все 23 кадра. Шесть типов событий уже есть (spire_week, streak_milestone, coin_rank_up, achievement, theme_unlock, announcement);
// для 16 новых типов разбор готов заранее по плоскому контракту payload (строки, числа, флаги; списки — строкой через «|» или «,»), чтобы
// подключение источника события было одной строкой. Объявление пока идёт прежним кадром (AnnouncementSlide) — шаблон праздника позже.
// Фотостудия (dev-маршрут, просмотр со studio): payload.studioTemplate = id шаблона → примерные данные макета.
// ═══════════════════════════════════════════════════════════════════════════
import { ALL_ACHIEVEMENTS } from '../../../app/achievements';
import { coinRankRowForDisplay, isValidCoinRank } from '../../../app/coin_rank_table_v1';
import { isPremiumThemeId } from '../../../app/premium_theme_catalog';
import { nextStreakMilestone } from '../../streak/moments/streak_milestones';
import { DAY_MS, dayKeyToMs } from './story_template_dates';
import {
  isStoryTemplateId, STORY_CONTEST_RULES, STORY_TEMPLATE_SAMPLES,
  type StoryBubble, type StoryCardSample, type StoryPodiumEntry, type StoryTemplate,
} from './story_template_registry';

export type StoryEventLike = Readonly<{ type: string; payload: Readonly<Record<string, unknown>>; atMs: number }>;

/** Большие рубежи серии — кадр «100 клеток» (макет: «большой рубеж серии (100, 365, 1000)»). */
export const STORY_BIG_STREAKS: ReadonlySet<number> = new Set([100, 365, 1000]);

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown, fallback = 0): number => Math.trunc(num(v) ?? fallback);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const flag = (v: unknown): boolean => v === true || v === 1 || v === 'true';
const textList = (v: unknown): string[] => str(v).split('|').map((s) => s.trim()).filter(Boolean);
const numList = (v: unknown): number[] => str(v).split(',').map((s) => num(s)).filter((n): n is number => n !== null);
const rankOf = (v: unknown): number | null => { const n = num(v); return n === null ? null : Math.max(0, Math.min(19, Math.trunc(n))); };

/** Следующая ачивка серии по каталогу (streak_7 → 30): «Следующая — 30 дней». */
export function nextStreakAchievementDays(id: string): number | null {
  const own = /^streak_(\d+)$/.exec(id);
  if (!own) return null;
  const cur = Number(own[1]);
  const later = ALL_ACHIEVEMENTS.map((a) => /^streak_(\d+)$/.exec(a.id)).filter((r): r is RegExpExecArray => r !== null).map((r) => Number(r[1])).filter((d) => d > cur).sort((a, b) => a - b);
  return later[0] ?? null;
}

/** Тройка недели из плоских полей p1Name/p1Rank/p1Coins/p1Me … p3*; нет ни одного места — null (кадр без выдуманных соседей). */
function podiumOf(p: Readonly<Record<string, unknown>>): StoryPodiumEntry[] | null {
  const out: StoryPodiumEntry[] = [];
  for (const place of [1, 2, 3] as const) {
    const coins = num(p[`p${place}Coins`]);
    const me = flag(p[`p${place}Me`]);
    const name = str(p[`p${place}Name`]);
    if (coins === null || (!me && !name)) continue;
    out.push({ place, name, rank: rankOf(p[`p${place}Rank`]), coins, me });
  }
  return out.length > 0 ? out : null;
}

/** «term=meaning|term=meaning» → карточки веера. */
function cardsOf(v: unknown): StoryCardSample[] {
  return textList(v).map((pair) => { const [term = '', meaning = ''] = pair.split('='); return { term: term.trim(), meaning: meaning.trim() }; }).filter((c) => c.term !== '');
}

/** «me:текст|them:текст» → реплики диалога. */
function bubblesOf(v: unknown): StoryBubble[] {
  return textList(v).map((item) => { const me = item.startsWith('me:'); return { me, text: item.replace(/^(me|them):/, '').trim() }; }).filter((b) => b.text !== '');
}

/**
 * Событие → шаблон кадра; null — у события нет шаблона (кадр рисует прежний StorySlides) или данных не хватает.
 * `studio` — просмотр открыт фотостудией: метка payload.studioTemplate даёт примерные данные макета (в обычном просмотре метка не действует).
 */
export function storyTemplateFromEvent(event: StoryEventLike, studio = false): StoryTemplate | null {
  const p = event.payload;
  if (studio && isStoryTemplateId(p.studioTemplate)) return STORY_TEMPLATE_SAMPLES[p.studioTemplate];
  switch (event.type) {
    case 'streak_milestone': {
      const days = int(p.days);
      if (days < 1) return null;
      const endMs = dayKeyToMs(p.dayKey) ?? event.atMs;
      const next = nextStreakMilestone(days);
      const startMs = endMs - (days - 1) * DAY_MS; // guard-ok: дата начала серии для подписи «Начало 20 июля», серия не меняется
      return STORY_BIG_STREAKS.has(days) ? { id: 'streak100', days, next, startMs } : { id: 'streak7', days, next, endMs };
    }
    case 'achievement': {
      const achievementId = str(p.achievementId);
      if (!achievementId) return null;
      return {
        id: 'ach', achievementId, opened: num(p.opened), total: num(p.total), nextDays: nextStreakAchievementDays(achievementId),
        // зачем: «улучшенная» ачивка вершины (stage upgraded, spireUpgradeLabel) — незакоммиченная работа другой сессии; подключить вместе с ней
      };
    }
    case 'spire_week': {
      const outcome = p.outcome === 'up' || p.outcome === 'down' ? p.outcome : 'stay';
      // зачем: в payload итога недели поле floor хранит лигу (tier 0…11) — так его читает и прежний кадр
      return { id: 'peakweek', tier: int(p.floor), outcome, place: int(p.place), total: int(p.total), weekCoins: int(p.weekCoins), promotionCoins: int(p.promotionCoins), podium: podiumOf(p) };
    }
    case 'coin_rank_up': {
      const toRank = int(p.toRank, -1);
      if (toRank < 0) return null;
      const price = isValidCoinRank(toRank) ? coinRankRowForDisplay(toRank).priceToReach : toRank * 1000;
      const nextPrice = isValidCoinRank(toRank + 1) ? coinRankRowForDisplay(toRank + 1).priceToReach : null;
      return { id: 'rank', toRank, price, nextPrice };
    }
    case 'theme_unlock': {
      const themeId = str(p.themeId);
      return isPremiumThemeId(themeId) ? { id: 'theme', themeId, opened: num(p.opened), total: num(p.total) } : null;
    }
    // ── новые события (типы добавляет Ядро/Codex; контракт payload — плоский) ──
    case 'level_up':
      return str(p.toLevel) ? { id: 'level', fromLevel: str(p.fromLevel), toLevel: str(p.toLevel), chapters: int(p.chapters), lessons: int(p.lessons) } : null;
    case 'lesson_done':
      return int(p.total) > 0 ? { id: 'lesson', lessonNo: int(p.lessonNo), correct: int(p.correct), total: int(p.total), coins: int(p.coins), minutes: int(p.minutes), noHints: flag(p.noHints) } : null;
    case 'chapter_exam_passed':
      return int(p.total) > 0 ? { id: 'exam', chapter: int(p.chapter), correct: int(p.correct), total: int(p.total), nextChapter: num(p.nextChapter), firstTry: flag(p.firstTry) } : null;
    case 'spire_summit':
      return { id: 'summit', tier: int(p.tier), floor: int(p.floor, 15), floors: int(p.floors, 15), weekCoins: int(p.weekCoins) };
    case 'duel_won':
      return str(p.friendName) ? { id: 'duel', friend: { name: str(p.friendName), rank: rankOf(p.friendRank) }, myScore: int(p.myScore), theirScore: int(p.theirScore), rounds: int(p.rounds, 5), seconds: int(p.seconds) } : null;
    case 'friend_passed':
      return str(p.friendName) ? { id: 'overtaken', friend: { name: str(p.friendName), rank: rankOf(p.friendRank) }, friendCoins: int(p.friendCoins), myCoins: int(p.myCoins), daysLeft: int(p.daysLeft) } : null;
    case 'friend_joined':
      return str(p.friendName) ? { id: 'friend', friend: { name: str(p.friendName), rank: rankOf(p.friendRank) } } : null;
    case 'pack_learned':
      return str(p.packTitle) ? { id: 'pack', packTitle: str(p.packTitle), cards: int(p.cards), knownPct: int(p.knownPct), days: int(p.days), samples: cardsOf(p.samples) } : null;
    case 'pack_added_by_others':
      return str(p.packTitle) ? { id: 'packpop', packTitle: str(p.packTitle), cards: int(p.cards), count: int(p.addedCount), ranks: numList(p.ranks) } : null;
    case 'phrase_of_day':
      return str(p.phrase) ? { id: 'phrase', phrase: str(p.phrase), meaning: str(p.meaning), audioSec: num(p.audioSec) } : null;
    case 'week_recap': {
      const startMs = dayKeyToMs(p.startDayKey);
      return startMs === null ? null : { id: 'week', startMs, endMs: startMs + 6 * DAY_MS, dailyMinutes: numList(p.dailyMinutes), lessons: int(p.lessons), coins: int(p.coins), minutes: int(p.minutes), streak: int(p.streak) };
    }
    case 'month_recap': {
      const monthMs = dayKeyToMs(`${str(p.monthKey)}-01`);
      return monthMs === null ? null : { id: 'month', monthMs, daysInMonth: int(p.daysInMonth, 30), activeDays: numList(p.activeDays), lessons: int(p.lessons), exams: int(p.exams), best: flag(p.best) };
    }
    case 'invite_prompt':
      return str(p.inviteCode) ? { id: 'invite', code: str(p.inviteCode) } : null;
    case 'coins_milestone':
      return int(p.milestone) > 0 ? { id: 'coins', milestone: int(p.milestone), days: int(p.days), rank: num(p.rank) } : null;
    case 'mistakes_cleared':
      return { id: 'mistakes', cleared: int(p.cleared), left: int(p.left), noNew: flag(p.noNew), samples: textList(p.samples) };
    case 'dialog_done':
      return str(p.title) ? { id: 'dialog', title: str(p.title), goalsDone: int(p.goalsDone), goalsTotal: int(p.goalsTotal), turns: int(p.turns), minutes: int(p.minutes), noHints: flag(p.noHints), bubbles: bubblesOf(p.bubbles) } : null;
    case 'contest_intro':
      return contestIntroOf(p, event.atMs);
    default:
      return null;
  }
}

/**
 * Анонс конкурса «Набор месяца»: событие на каждый кадр, payload.step — start | vote | prizes | invite (владелец 29.10, макет v2).
 * Числа — правила владельца (STORY_CONTEST_RULES); событие может прислать свои (сервер конкурса знает действующие правила), неверные — правила.
 * Неизвестный step — кадра нет (null), как у прочих событий без данных.
 */
export function contestIntroOf(p: Readonly<Record<string, unknown>>, atMs: number): StoryTemplate | null {
  const pos = (v: unknown, fallback: number): number => { const n = num(v); return n !== null && n > 0 ? Math.trunc(n) : fallback; };
  const r = STORY_CONTEST_RULES;
  switch (str(p.step)) {
    case 'start': return { id: 'contest_start', startMs: num(p.startMs) ?? atMs };
    case 'vote': return { id: 'contest_vote', minDays: pos(p.minDays, r.minDays), minLessons: pos(p.minLessons, r.minLessons), votesPerMonth: pos(p.votesPerMonth, r.votesPerMonth) };
    case 'prizes': {
      const given = numList(p.plusMonths).map((n) => Math.trunc(n)).filter((n) => n > 0);
      const plusMonths: readonly [number, number, number] = given.length === 3 ? [given[0]!, given[1]!, given[2]!] : r.plusMonths;
      return { id: 'contest_prizes', plusMonths };
    }
    case 'invite': return { id: 'contest_invite', coins: pos(p.coins, r.inviteCoins), friends: pos(p.friends, r.inviteFriends), plusDays: pos(p.plusDays, r.invitePlusDays) };
    default: return null;
  }
}

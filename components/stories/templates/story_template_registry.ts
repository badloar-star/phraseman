// ═══════════════════════════════════════════════════════════════════════════
// story_template_registry.ts — 23 шаблона кадров историй: порядок макета, кнопки действия, данные кадра и примерные данные фотостудии.
//
// зачем (владелец 28.10: «эти все прекрасные шаблоны, их надо добавить и проверить, что они именно так выглядят в приложении через дев»):
// порядок и id — как в TPL макета docs/design/v2-app/stories-templates-v1.html; у шести кадров кнопка действия (у макета их 6). Данные кадра —
// только то, что событие знает (payload); примерные данные — ровно числа и имена макета, чтобы Сверка сравнила снимки с макетом 1:1.
// ═══════════════════════════════════════════════════════════════════════════
import type Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import type { Lang } from '../../../constants/i18n';
import type { StoryEventList } from '../../../modules/story_events/story_events_core';
import type { StoryTemplateStringKey } from './story_template_strings';

export const STORY_TEMPLATE_IDS = [
  'streak7', 'streak100', 'ach', 'level', 'lesson', 'exam', 'summit', 'peakweek', 'duel', 'overtaken', 'friend', 'pack',
  'packpop', 'phrase', 'week', 'month', 'invite', 'holiday', 'rank', 'theme', 'coins', 'mistakes', 'dialog',
] as const;
export type StoryTemplateId = (typeof STORY_TEMPLATE_IDS)[number];

export function isStoryTemplateId(value: unknown): value is StoryTemplateId {
  return typeof value === 'string' && (STORY_TEMPLATE_IDS as readonly string[]).includes(value);
}

export type StoryIconName = React.ComponentProps<typeof Ionicons>['name'];
export type StoryTemplateCtaAction = 'catch_up' | 'duel' | 'open_pack' | 'add_cards' | 'share_link' | 'use_theme';
export type StoryTemplateCta = Readonly<{ action: StoryTemplateCtaAction; label: StoryTemplateStringKey; icon: StoryIconName }>;

/** Кнопки действия макета (`cta`): подпись и глиф Ionicons — те же, что в макете (arrowR, flash, layers, bookmark, share, palette). */
export const STORY_TEMPLATE_CTA: Readonly<Partial<Record<StoryTemplateId, StoryTemplateCta>>> = {
  overtaken: { action: 'catch_up', label: 'ctaCatchUp', icon: 'arrow-forward' },
  friend: { action: 'duel', label: 'ctaDuel', icon: 'flash' },
  packpop: { action: 'open_pack', label: 'ctaOpenPack', icon: 'layers' },
  phrase: { action: 'add_cards', label: 'ctaAddToCards', icon: 'bookmark' },
  invite: { action: 'share_link', label: 'ctaShareLink', icon: 'share-social' },
  theme: { action: 'use_theme', label: 'ctaUseTheme', icon: 'color-palette' },
};

/** Человек в кадре: имя и ранг монеты (монета = аватар). */
export type StoryPerson = Readonly<{ name: string; rank: number | null }>;
/** Столбик пьедестала: место 1–3, монеты недели; `me` — свой столбик (акцент). */
export type StoryPodiumEntry = Readonly<{ place: 1 | 2 | 3; name: string; rank: number | null; coins: number; me: boolean }>;
export type StoryCardSample = Readonly<{ term: string; meaning: string }>;
export type StoryBubble = Readonly<{ text: string; me: boolean }>;

type T<I extends StoryTemplateId, D> = Readonly<{ id: I } & D>;

/** Данные кадра: что кадр берёт из события. Ничего сверх этого кадр не выдумывает (опись макета). */
export type StoryTemplate =
  | T<'streak7', { days: number; next: number | null; endMs: number }>
  | T<'streak100', { days: number; next: number | null; startMs: number }>
  | T<'ach', { achievementId: string; opened: number | null; total: number | null; nextDays: number | null }>
  | T<'level', { fromLevel: string; toLevel: string; chapters: number; lessons: number }>
  | T<'lesson', { lessonNo: number; correct: number; total: number; coins: number; minutes: number; noHints: boolean }>
  | T<'exam', { chapter: number; correct: number; total: number; nextChapter: number | null; firstTry: boolean }>
  | T<'summit', { tier: number; floor: number; floors: number; weekCoins: number }>
  | T<'peakweek', { tier: number; outcome: 'up' | 'stay' | 'down'; place: number; total: number; weekCoins: number; promotionCoins: number; podium: readonly StoryPodiumEntry[] | null }>
  | T<'duel', { friend: StoryPerson; myScore: number; theirScore: number; rounds: number; seconds: number }>
  | T<'overtaken', { friend: StoryPerson; friendCoins: number; myCoins: number; daysLeft: number }>
  | T<'friend', { friend: StoryPerson }>
  | T<'pack', { packTitle: string; cards: number; knownPct: number; days: number; samples: readonly StoryCardSample[] }>
  | T<'packpop', { packTitle: string; cards: number; count: number; ranks: readonly number[] }>
  | T<'phrase', { phrase: string; meaning: string; audioSec: number | null }>
  | T<'week', { startMs: number; endMs: number; dailyMinutes: readonly number[]; lessons: number; coins: number; minutes: number; streak: number }>
  | T<'month', { monthMs: number; daysInMonth: number; activeDays: readonly number[]; lessons: number; exams: number; best: boolean }>
  | T<'invite', { code: string }>
  | T<'holiday', { year: string; dateLabel: string; title: string; text: string }>
  | T<'rank', { toRank: number; price: number; nextPrice: number | null }>
  | T<'theme', { themeId: string; opened: number | null; total: number | null }>
  | T<'coins', { milestone: number; days: number; rank: number | null }>
  | T<'mistakes', { cleared: number; left: number; noNew: boolean; samples: readonly string[] }>
  | T<'dialog', { title: string; goalsDone: number; goalsTotal: number; turns: number; minutes: number; noHints: boolean; bubbles: readonly StoryBubble[] }>;

export type StoryTemplateOf<I extends StoryTemplateId> = Extract<StoryTemplate, { id: I }>;

/** Пропсы кадра: данные шаблона, язык и свой ранг монеты (монета = аватар «ты»). */
export type StoryFrameProps<I extends StoryTemplateId> = Readonly<{ tpl: StoryTemplateOf<I>; lang: Lang; myRank: number | null }>;

/** Свой ранг монеты в примерах макета (`coin(5)` — «ты» во всех кадрах). */
export const STORY_SAMPLE_MY_RANK = 5;

// зачем: даты примеров — локальное время устройства, как у событий (20 июля, 20–26 октября, октябрь 2026)
const day = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();

/** Примерные данные — числа, имена и тексты макета 1:1 (фотостудия и тест снимков). */
export const STORY_TEMPLATE_SAMPLES: Readonly<{ [I in StoryTemplateId]: StoryTemplateOf<I> }> = {
  streak7: { id: 'streak7', days: 7, next: 14, endMs: day(2026, 10, 25) },
  streak100: { id: 'streak100', days: 100, next: 150, startMs: day(2026, 7, 20) },
  ach: { id: 'ach', achievementId: 'streak_7', opened: 3, total: 24, nextDays: 30 },
  level: { id: 'level', fromLevel: 'A1', toLevel: 'A2', chapters: 8, lessons: 96 },
  lesson: { id: 'lesson', lessonNo: 12, correct: 18, total: 20, coins: 40, minutes: 6, noHints: true },
  exam: { id: 'exam', chapter: 2, correct: 11, total: 12, nextChapter: 3, firstTry: true },
  summit: { id: 'summit', tier: 0, floor: 15, floors: 15, weekCoins: 980 },
  peakweek: {
    id: 'peakweek', tier: 1, outcome: 'stay', place: 2, total: 30, weekCoins: 1420, promotionCoins: 0,
    podium: [
      { place: 2, name: '', rank: STORY_SAMPLE_MY_RANK, coins: 1420, me: true },
      { place: 1, name: 'Марина', rank: 9, coins: 1610, me: false },
      { place: 3, name: 'Олег', rank: 3, coins: 1180, me: false },
    ],
  },
  duel: { id: 'duel', friend: { name: 'Тимур', rank: 8 }, myScore: 4, theirScore: 2, rounds: 5, seconds: 100 },
  overtaken: { id: 'overtaken', friend: { name: 'Марина', rank: 9 }, friendCoins: 1260, myCoins: 1180, daysLeft: 2 },
  friend: { id: 'friend', friend: { name: 'Тимур', rank: 2 } },
  pack: {
    id: 'pack', packTitle: 'B2 глаголы', cards: 126, knownPct: 92, days: 11,
    samples: [{ term: 'hire', meaning: 'нанимать' }, { term: 'fire', meaning: 'увольнять' }, { term: 'quit', meaning: 'уйти с работы' }],
  },
  packpop: { id: 'packpop', packTitle: 'Еда и кафе', cards: 48, count: 14, ranks: [1, 7, 12, 4, 15, 9] },
  phrase: { id: 'phrase', phrase: 'Pitch in', meaning: 'внести свою лепту, подключиться к общему делу', audioSec: 2 },
  week: { id: 'week', startMs: day(2026, 10, 20), endMs: day(2026, 10, 26), dailyMinutes: [42, 70, 55, 90, 30, 80, 100], lessons: 5, coins: 1240, minutes: 200, streak: 7 },
  month: {
    id: 'month', monthMs: day(2026, 10, 1), daysInMonth: 31, lessons: 18, exams: 2, best: true,
    activeDays: [1, 2, 3, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28],
  },
  invite: { id: 'invite', code: 'PM-7K2Q' },
  holiday: { id: 'holiday', year: '2027', dateLabel: '31 декабря', title: 'С Новым годом!', text: 'Серия 48 дней идёт с тобой в новый год' },
  rank: { id: 'rank', toRank: 6, price: 6000, nextPrice: 7000 },
  theme: { id: 'theme', themeId: 'grad_full_titanium', opened: 7, total: 29 },
  coins: { id: 'coins', milestone: 10000, days: 94, rank: 8 },
  mistakes: { id: 'mistakes', cleared: 12, left: 3, noNew: true, samples: ['to look forward to', 'would rather', 'get used to', 'in spite of'] },
  dialog: {
    id: 'dialog', title: 'В кафе', goalsDone: 6, goalsTotal: 6, turns: 14, minutes: 4, noHints: true,
    bubbles: [{ text: '¿Me pones un café con leche?', me: false }, { text: 'Claro. ¿Para llevar?', me: true }, { text: 'Sí, gracias. ¿Cuánto es?', me: false }],
  },
};

// ── фотостудия (dev-маршрут) ─────────────────────────────────────────────────────────────────────────────────────────

/** Номер кадра из параметра фотостудии: id шаблона («duel») или номер 1…23; иначе — первый кадр. */
export function studioStartIndex(raw: string | undefined): number {
  if (isStoryTemplateId(raw)) return STORY_TEMPLATE_IDS.indexOf(raw);
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n >= 1 && n <= STORY_TEMPLATE_IDS.length ? n - 1 : 0;
}

/** 23 события фотостудии: тип «ачивка» (без особой обработки в просмотре), метка шаблона в payload. */
export function studioEvents(nowMs: number): StoryEventList {
  return STORY_TEMPLATE_IDS.map((id) => ({ id: `studio-${id}`, type: 'achievement' as const, payload: { studioTemplate: id }, atMs: nowMs, seen: false }));
}

// ═══════════════════════════════════════════════════════════════════════════
// story_instead_registry.ts — 17 кадров «истории вместо окон»: порядок макета, данные кадра, примеры фотостудии и кнопки действия.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», на макет — «Да, в приложение»):
// порядок и примеры — как в TPL макета docs/design/v2-app/stories-instead-of-modals.html. Отдельный файл, а не общий реестр:
// общий story_template_registry.ts одновременно правят соседние сессии (U36, три кадра Plus), поэтому туда уходит только
// подключение этого списка. В фотостудии кадры идут после 31 прежнего — номера 32…48.
// Кнопки: подпись — готовая строка (в ней бывают числа события: номер урока, сумма приза), поэтому не ключ общего файла строк.
// Действия шести новых кнопок назначаются на шаге 2 (вместе с событиями); до него кадры к игроку не попадают.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import type { AppUpdateStory, HelloNewStory, LegacyCoinsStory, NotifNudgeStory, PlusStateStory, RankEnoughStory, TeamMessageStory, WelcomeBackStory } from './frames_instead_a';
import type { FirstDialogStory, LessonOpenStory, PackPrizeStory, PeakOvertakeStory, PerfectLessonStory, RateAppStory, ReferralEndedStory, ReferralWelcomeStory } from './frames_instead_b';
import type { LessonMedalStory, LevelExamOpenStory, LingmanExamOpenStory } from './frames_instead_c';
import { insteadText } from './story_instead_strings';
import { celebrationShareLabel } from '../../lesson_moments/lesson_notif_copy';
import { reviewStoreCta } from '../../review_prompt_copy';
import { notifNudgeCopy } from '../../../app/notif_nudge_copy';

/** Порядок — как в макете (кадры 1…17). */
export const STORY_INSTEAD_TEMPLATE_IDS = [
  'instead_hello', 'instead_back', 'instead_legacy', 'instead_rank', 'instead_update', 'instead_message', 'instead_nudge', 'instead_plus_expired',
  'instead_ref_welcome', 'instead_ref_ended', 'instead_perfect', 'instead_lesson_open', 'instead_rate', 'instead_pack_prize', 'instead_first_dialog',
  'instead_plus_on', 'instead_peak_overtake',
  // зачем (владелец 11.11, макет stories-lesson-notifs — «Да, в приложение»): три уведомления итога урока; строго в конце — номера прежних 17 не сдвигаются
  'instead_medal', 'instead_level_exam', 'instead_lingman_exam',
] as const;
export type StoryInsteadTemplateId = (typeof STORY_INSTEAD_TEMPLATE_IDS)[number];

type T<I extends StoryInsteadTemplateId, D> = Readonly<{ id: I } & D>;

/** Данные кадров: только то, что событие уже знает. */
export type StoryInsteadTemplate =
  | T<'instead_hello', HelloNewStory>
  | T<'instead_back', WelcomeBackStory>
  | T<'instead_legacy', LegacyCoinsStory>
  | T<'instead_rank', RankEnoughStory>
  | T<'instead_update', AppUpdateStory>
  | T<'instead_message', TeamMessageStory>
  | T<'instead_nudge', NotifNudgeStory>
  | T<'instead_plus_expired', PlusStateStory>
  | T<'instead_ref_welcome', ReferralWelcomeStory>
  | T<'instead_ref_ended', ReferralEndedStory>
  | T<'instead_perfect', PerfectLessonStory>
  | T<'instead_lesson_open', LessonOpenStory>
  | T<'instead_rate', RateAppStory>
  | T<'instead_pack_prize', PackPrizeStory>
  | T<'instead_first_dialog', FirstDialogStory>
  | T<'instead_plus_on', PlusStateStory>
  | T<'instead_peak_overtake', PeakOvertakeStory>
  | T<'instead_medal', LessonMedalStory>
  | T<'instead_level_exam', LevelExamOpenStory>
  | T<'instead_lingman_exam', LingmanExamOpenStory>;

// зачем: даты примеров — локальное время устройства, как у событий
const day = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();
/** Свой ранг монеты в примерах макета — тот же, что STORY_SAMPLE_MY_RANK общего реестра (`coin(5)` — «ты»). */
const MY_RANK = 5;

/** Примерные данные — числа, имена и тексты макета 1:1 (фотостудия и тест снимков). */
export const STORY_INSTEAD_TEMPLATE_SAMPLES: Readonly<{ [I in StoryInsteadTemplateId]: Extract<StoryInsteadTemplate, { id: I }> }> = {
  instead_hello: { id: 'instead_hello', coinRank: 0 },
  instead_back: { id: 'instead_back', coinRank: 6, daysAway: 9, dueCards: 24, phrasesLearned: 186 },
  instead_legacy: { id: 'instead_legacy', coins: 1240, xpBefore: 3100, pearlsBefore: 4, spinsBefore: 0 },
  instead_rank: { id: 'instead_rank', rank: 4, nextRank: 5, balance: 2400, price: 2000 },
  // пример — без текста из настроек: кадр показывает стандартный текст окна
  instead_update: { id: 'instead_update', message: null },
  instead_message: { id: 'instead_message', text: 'Plus на 30 дней уже на аккаунте. Спасибо, что написали про ошибку в уроке 14.', whenLabel: 'Сегодня, 14:20' },
  // пример окна: «Без практики: 3 дня»
  instead_nudge: { id: 'instead_nudge', missedDays: 3 },
  instead_plus_expired: { id: 'instead_plus_expired', untilLabel: '10 ноября', freezesPerMonth: 3 },
  instead_ref_welcome: { id: 'instead_ref_welcome', needsCodeEntry: true },
  instead_ref_ended: { id: 'instead_ref_ended', windowEndMs: day(2026, 11, 10) },
  instead_perfect: { id: 'instead_perfect', lessonNo: 12, correct: 45, total: 45, coins: 120 },
  instead_lesson_open: { id: 'instead_lesson_open', lessonNo: 12, nextLessonNo: 13, topic: 'планы на выходные' },
  // пример — просьба после идеального урока (самый частый повод окна)
  instead_rate: { id: 'instead_rate', context: 'perfect_lesson', streakDays: null },
  instead_pack_prize: {
    id: 'instead_pack_prize', place: 2, month: 10, packName: 'Фразы для кафе', saves: 214, coins: 500,
    podium: [
      { place: 2, name: '', rank: 3, coins: 0, me: true },
      { place: 1, name: 'Лена', rank: 8, coins: 0, me: false },
      { place: 3, name: 'Олег', rank: 2, coins: 0, me: false },
    ],
  },
  // пример окна «Первый разговор»: «6 реплик · 5 заданий из 5»
  instead_first_dialog: { id: 'instead_first_dialog', studyTarget: 'en', turns: 6, goalsDone: 5, goalsTotal: 5 },
  instead_plus_on: { id: 'instead_plus_on', untilLabel: '11 декабря', freezesPerMonth: 3 },
  instead_peak_overtake: { id: 'instead_peak_overtake', tier: 0, rivalName: 'Марк', rivalRank: 8, rivalScore: 1240, myScore: 1200, daysLeft: 3 },
  // макет stories-lesson-notifs: золотая медаль за урок 12, экзамен уровня A1, экзамен Lingman
  instead_medal: { id: 'instead_medal', lessonNo: 12, tier: 'gold', score: 5 },
  instead_level_exam: { id: 'instead_level_exam', cefrLevel: 'A1', lessonNo: 8, score: 4.7 },
  instead_lingman_exam: { id: 'instead_lingman_exam', lessonNo: 32, score: 5 },
};

export function isStoryInsteadTemplate(tpl: Readonly<{ id: string }>): tpl is StoryInsteadTemplate {
  return (STORY_INSTEAD_TEMPLATE_IDS as readonly string[]).includes(tpl.id);
}

/** Данные для кнопки «Поделиться» кадров медали и экзаменов — те же, что уходили в «Поделиться» уведомления. */
export type StoryCelebrationShare = Readonly<{ kind: 'medal' | 'level_exam_unlock' | 'lingman_exam_unlock'; lessonId: number; score: number; medalTier?: 'bronze' | 'silver' | 'gold'; cefrLevel?: string }>;

/** Что отдать в «Поделиться» для кадра; null — у кадра такой кнопки нет. */
export function storyCelebrationShare(tpl: Readonly<{ id: string }>): StoryCelebrationShare | null {
  if (!isStoryInsteadTemplate(tpl)) return null;
  if (tpl.id === 'instead_medal') return { kind: 'medal', lessonId: tpl.lessonNo, score: tpl.score, medalTier: tpl.tier };
  if (tpl.id === 'instead_level_exam') return { kind: 'level_exam_unlock', lessonId: tpl.lessonNo, score: tpl.score, cefrLevel: tpl.cefrLevel };
  if (tpl.id === 'instead_lingman_exam') return { kind: 'lingman_exam_unlock', lessonId: tpl.lessonNo, score: tpl.score };
  return null;
}

/** Действия кнопок кадров «вместо окон». `open_plus` — готовое действие; остальные получают переходы на шаге 2. */
export type StoryInsteadCtaAction =
  | 'open_plus' | 'start_first_lesson' | 'review_cards' | 'upgrade_coin' | 'update_app' | 'reply_team' | 'enable_reminder'
  | 'enter_referral_code' | 'share_link' | 'start_lesson' | 'rate_app' | 'claim_pack_prize' | 'play_peak' | 'share_celebration';

/** Кнопка кадра: действие, готовая подпись на языке интерфейса и глиф Ionicons (те же, что в макете). */
export type StoryInsteadCta = Readonly<{ action: StoryInsteadCtaAction; text: string; icon: 'play' | 'layers' | 'trending-up' | 'refresh' | 'chatbubble' | 'time' | 'sparkles' | 'key' | 'person-add' | 'star' | 'wallet' | 'flash' | 'share-social' }>;

/** Кнопка кадра по его данным; `null` — у кадра кнопки нет (бонусы стали монетами, идеальный урок, первый разговор, Plus подключён). */
export function storyInsteadCta(tpl: StoryInsteadTemplate, lang: Lang): StoryInsteadCta | null {
  switch (tpl.id) {
    case 'instead_hello': return { action: 'start_first_lesson', text: insteadText(lang, 'ctaFirstLesson'), icon: 'play' };
    case 'instead_back': return { action: 'review_cards', text: insteadText(lang, 'ctaReviewCards'), icon: 'layers' };
    case 'instead_rank': return { action: 'upgrade_coin', text: insteadText(lang, 'ctaUpgradeCoin'), icon: 'trending-up' };
    case 'instead_update': return { action: 'update_app', text: insteadText(lang, 'ctaUpdate'), icon: 'refresh' };
    case 'instead_message': return { action: 'reply_team', text: insteadText(lang, 'ctaReply'), icon: 'chatbubble' };
    // подпись — та же, что у главной кнопки окна: «Включить напоминания»
    case 'instead_nudge': return { action: 'enable_reminder', text: notifNudgeCopy(lang, tpl.missedDays).confirmLabel, icon: 'time' };
    case 'instead_plus_expired': return { action: 'open_plus', text: insteadText(lang, 'ctaRestorePlus'), icon: 'sparkles' };
    // кнопка — только когда код ещё не введён; у окна это была вторая кнопка «У меня есть код приглашения»
    case 'instead_ref_welcome': return tpl.needsCodeEntry ? { action: 'enter_referral_code', text: insteadText(lang, 'ctaEnterCode'), icon: 'key' } : null;
    // зачем: «Пригласить друга» в окне открывала отправку приглашения — у историй это готовое действие share_link (use_story_cta_action)
    case 'instead_ref_ended': return { action: 'share_link', text: insteadText(lang, 'ctaInviteFriend'), icon: 'person-add' };
    case 'instead_lesson_open': return { action: 'start_lesson', text: insteadText(lang, 'ctaStartLesson', { lessonNo: tpl.nextLessonNo }), icon: 'play' };
    // подпись — та же, что у главной кнопки окна: «Оценить в App Store / Google Play»
    case 'instead_rate': return { action: 'rate_app', text: reviewStoreCta(lang), icon: 'star' };
    case 'instead_pack_prize': return { action: 'claim_pack_prize', text: insteadText(lang, 'ctaClaim', { coins: tpl.coins }), icon: 'wallet' };
    case 'instead_peak_overtake': return { action: 'play_peak', text: insteadText(lang, 'ctaPlayPeak'), icon: 'flash' };
    // «Поделиться» — единственная кнопка, как у уведомления
    case 'instead_medal':
    case 'instead_level_exam':
    case 'instead_lingman_exam':
      return { action: 'share_celebration', text: celebrationShareLabel(lang), icon: 'share-social' };
    case 'instead_legacy':
    case 'instead_perfect':
    case 'instead_first_dialog':
    case 'instead_plus_on':
      return null;
    default: {
      const never: never = tpl;
      return never;
    }
  }
}

/** Свой ранг в примерах (для тестов и подписи примеров). */
export const STORY_INSTEAD_SAMPLE_MY_RANK = MY_RANK;

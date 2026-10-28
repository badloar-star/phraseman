// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_registry.ts — 36 шаблонов объявлений (макет docs/design/v2-app/stories-announcements-v1.html, v2.1): порядок и id макета,
// группы описи, арт и кнопка по design, размер заголовка по длине, примерные данные макета 1:1 для фотостудии и гейта.
//
// зачем (владелец 28.10: «все должны быть добавлены в админку и работать корректно в приложении точно так же, как на макете… гейт на точное
// соответствие макетам»): id, порядок и тексты примеров — ровно TPL макета, чтобы Сверка сравнивала снимки «эмулятор | макет» кадр в кадр.
// Источник истины по полям — общий контракт modules/story_events/story_announcements_contract.ts (Моменты, 159fb12cd / 06ac3cd89): design,
// eventAtMs, art, videoId, cta, themeId; кнопка строго как в макете — только у plus / invite / theme с действием шаблона (решение
// координатора 28.10). Здесь — только то, что нужно кадрам и редактору сверх контракта.
// ═══════════════════════════════════════════════════════════════════════════
import type Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';
import {
  ANNOUNCEMENT_ART_DEFAULTS, ANNOUNCEMENT_ARTS, ANNOUNCEMENT_CTA_BY_DESIGN, ANNOUNCEMENT_DESIGNS,
  type AnnouncementArt, type AnnouncementBlock, type AnnouncementContent, type AnnouncementCtaAction, type AnnouncementDesign,
} from '../../../modules/story_events/story_announcements_contract';
import type { StoryEventList } from '../../../modules/story_events/story_events_core';
import type { AnnouncementV2StringKey } from './announcement_v2_strings';

/** 36 id в порядке макета (контракт Моментов хранит тот же порядок — тест сверяет). */
export const ANNOUNCEMENT_V2_DESIGNS = ANNOUNCEMENT_DESIGNS;
export type AnnouncementV2Design = AnnouncementDesign;

/** Известен ли design этой сборке — иначе просмотр рисует запасной вид по templateId (StoryViewer, Моменты). */
export function isAnnouncementV2Design(value: unknown): value is AnnouncementV2Design {
  return typeof value === 'string' && (ANNOUNCEMENT_V2_DESIGNS as readonly string[]).includes(value);
}

export type AnnouncementV2Group = 'text' | 'time' | 'sections' | 'promo' | 'community' | 'holiday' | 'service';
/** Группы описи макета (редактор: разделы списка шаблонов). */
export const ANNOUNCEMENT_V2_GROUP: Readonly<Record<AnnouncementV2Design, AnnouncementV2Group>> = {
  manifest: 'text', editorial: 'text', quote: 'text', list3: 'text', qa: 'text', number: 'text',
  countdown: 'time', date: 'time', schedule: 'time', soon: 'time', today24: 'time',
  lessons: 'sections', dialogs: 'sections', cards: 'sections', peak: 'sections', duels: 'sections', phrase: 'sections', mistakes: 'sections', video: 'sections', exam: 'sections', ai: 'sections',
  plus: 'promo', contest: 'promo', challenge: 'promo', invite: 'promo',
  thanks: 'community', poll: 'community', author: 'community',
  newyear: 'holiday', holiday: 'holiday', birthday: 'holiday', theme: 'holiday', version: 'holiday',
  maintenance: 'service', feedback: 'service', tip: 'service',
};

// ── арт ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export type AnnouncementV2Art = AnnouncementArt;
export const ANNOUNCEMENT_V2_ART_NAMES = ANNOUNCEMENT_ARTS;

export function isAnnouncementV2Art(value: unknown): value is AnnouncementV2Art {
  return typeof value === 'string' && (ANNOUNCEMENT_ARTS as readonly string[]).includes(value);
}

/** Арт кадра: выбранный в редакторе (если разрешён и известен) или арт макета; design без арта — null. */
export function announcementArt(design: AnnouncementV2Design, chosen: unknown): AnnouncementV2Art | null {
  const fallback = ANNOUNCEMENT_ART_DEFAULTS[design] ?? null;
  if (!fallback) return null;
  return isAnnouncementV2Art(chosen) ? chosen : fallback;
}

// ── кнопка действия (строго как в макете: plus / invite / theme) ──────────────────────────────────────────────────

export type AnnouncementV2CtaAction = AnnouncementCtaAction;
export type StoryIconName = React.ComponentProps<typeof Ionicons>['name'];
export type AnnouncementV2Cta = Readonly<{ action: AnnouncementV2CtaAction; label: AnnouncementV2StringKey; icon: StoryIconName }>;

/** Подпись и глиф кнопки по действию (макет: sparkles / share / palette). */
export const ANNOUNCEMENT_V2_CTA: Readonly<Record<AnnouncementV2CtaAction, AnnouncementV2Cta>> = {
  open_plus: { action: 'open_plus', label: 'ctaOpenPlus', icon: 'sparkles' },
  share_invite: { action: 'share_invite', label: 'ctaShareInvite', icon: 'share-social' },
  use_theme: { action: 'use_theme', label: 'ctaUseTheme', icon: 'color-palette' },
};

/** Кнопка кадра: только у design из ANNOUNCEMENT_CTA_BY_DESIGN и только если редактор её включил (cta в содержимом). */
export function announcementCta(content: Pick<AnnouncementV2Content, 'design' | 'cta'>): AnnouncementV2Cta | null {
  const action = (ANNOUNCEMENT_CTA_BY_DESIGN as Readonly<Partial<Record<AnnouncementV2Design, AnnouncementV2CtaAction>>>)[content.design];
  return action && content.cta ? ANNOUNCEMENT_V2_CTA[action] : null;
}

// ── содержимое кадра ───────────────────────────────────────────────────────────────────────────────────────────────

export type AnnouncementV2Block = AnnouncementBlock;

/** Содержимое кадра: поля контракта, у которых design известен, плюс дата публикации (месяц на панели «Редакция»). */
export type AnnouncementV2Content = Readonly<
  Pick<AnnouncementContent, 'badge' | 'title' | 'blocks' | 'durationMs' | 'eventAtMs' | 'art' | 'videoId' | 'cta' | 'themeId'> & { design: AnnouncementV2Design; publishedAtMs?: number | null }
>;

/** Размер заголовка по длине (макет `hcls`): ≤ 28 знаков — 40/44, ≤ 60 — 34/40, иначе 28/34; в узкой колонке на ступень меньше (24/29). */
export type AnnouncementTitleSize = 40 | 34 | 28 | 24;
export function announcementTitleSize(title: string, narrow = false): AnnouncementTitleSize {
  const k = title.length <= 28 ? 0 : title.length <= 60 ? 1 : 2;
  return ([40, 34, 28, 24] as const)[Math.min(3, k + (narrow ? 1 : 0))]!;
}

// ── примерные данные макета (TPL.s) — тексты, числа и арты 1:1 ─────────────────────────────────────────────────────

export type AnnouncementV2Sample = Readonly<{ badge: string; short: string; long: string; blocks: readonly AnnouncementV2Block[]; cta?: boolean; eventAtMs?: number; themeId?: string }>;
const B = (text: string, size: 14 | 16 | 20 = 16, style: 'normal' | 'accent' | 'quote' = 'normal'): AnnouncementV2Block => ({ text, size, style });
// зачем: дата примера — вторник 10 ноября 2026 по часам устройства (кадр считает число, месяц и день недели сам)
const day = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12).getTime();

export const ANNOUNCEMENT_V2_SAMPLES: Readonly<Record<AnnouncementV2Design, AnnouncementV2Sample>> = {
  manifest: { badge: 'От команды', short: 'Больше практики', long: 'Больше живой практики и меньше барьеров: говорите с первого дня, ошибки не страшны', blocks: [B('Новая версия уже у вас')] },
  editorial: { badge: 'Письмо от PhraseMan', short: 'Что мы сделали за октябрь', long: 'Что мы сделали за октябрь и почему уроки теперь открываются быстрее даже без сети', blocks: [B('Исправили 16 ошибок из ваших писем, добавили удаление ошибок и подсказки в диалогах.'), B('Спасибо, что пишете нам', 14)] },
  quote: { badge: '', short: 'Язык — это привычка', long: 'Язык учится не за один вечер, а по десять минут каждый день: именно так появляются ваши 30 дней подряд', blocks: [B('Ирина, учитель испанского · 2 года в PhraseMan', 14)] },
  list3: { badge: 'Что нового', short: 'Версия 2.0.2', long: 'Версия 2.0.2 уже в App Store и Google Play: вот три вещи, которые вы заметите сразу', blocks: [B('Ошибки можно удалять'), B('Подсказки в диалогах'), B('Истории по 10 секунд')] },
  qa: { badge: 'Как не терять серию?', short: 'Любое занятие от 2 минут', long: 'Любое занятие от 2 минут засчитывает день: фраза дня тоже считается, а серия остаётся с вами', blocks: [B('Вопрос недели от Олега', 14)] },
  number: { badge: 'За неделю вместе', short: '12 400', long: '12 400', blocks: [B('уроков прошли ученики PhraseMan', 20), B('Рекорд с запуска 2.0', 14)] },
  countdown: { badge: 'До конца акции', short: 'Plus за полцены', long: 'Plus за полцены: годовая подписка со скидкой 50 % до конца воскресенья', blocks: [B('Включите в разделе Plus')] },
  date: { badge: '10 ноября', short: 'Открываем французский', long: 'Открываем французский: первые 8 уроков, диалоги и фразы дня появятся у всех в один день', blocks: [B('Вторник, 10:00 по Москве', 14)], eventAtMs: day(2026, 11, 10) },
  schedule: { badge: 'Суббота', short: 'День дуэлей', long: 'День дуэлей: три раунда с друзьями и двойные монеты за каждую победу', blocks: [B('12:00 · Раунд 1'), B('15:00 · Раунд 2'), B('18:00 · Финал')] },
  soon: { badge: 'Скоро', short: 'Уроки вместе', long: 'Уроки вместе: один урок на двоих, общий таймер и монеты обоим за каждый верный ответ', blocks: [B('Уже в следующем обновлении')] },
  today24: { badge: 'Только сегодня', short: 'Двойные монеты', long: 'Двойные монеты за каждый урок до полуночи: успейте пройти хотя бы два', blocks: [B('Серия тоже считается', 14)] },
  lessons: { badge: 'Уроки', short: '8 новых уроков', long: '8 новых уроков уровня B1: работа, поездки и разговор с врачом', blocks: [B('Глава 7 открыта всем')] },
  dialogs: { badge: 'Диалоги', short: 'Подсказки «Можно сказать…»', long: 'Над полем ввода теперь подсказки «Можно сказать…»: три фразы с переводом в каждом диалоге', blocks: [B('Could you repeat?'), B('I mean…'), B('No way!')] },
  cards: { badge: 'Карточки', short: 'Наборы из видео', long: 'Наборы из видео: фразы из ролика собираются в набор одним нажатием', blocks: [B('Раздел «Видео» на Главной')] },
  peak: { badge: 'Пик', short: 'Новая неделя', long: 'Новая неделя Пика: 15 ступеней, комната из 30 человек и лига выше для первых пяти', blocks: [B('Первая ступень — бесплатно')] },
  duels: { badge: 'Друзья', short: 'Дуэль на 5 фраз', long: 'Дуэль на 5 фраз: вызовите друга, у кого тот же язык, и узнайте, кто быстрее', blocks: [B('Кнопка в карточке друга')] },
  phrase: { badge: 'Фраза дня', short: 'Pitch in', long: 'It is not rocket science', blocks: [B('«это не так уж сложно» — так говорят, когда задача проще, чем кажется')] },
  mistakes: { badge: 'Мои ошибки', short: 'Ошибки можно удалять', long: 'Ошибки теперь можно удалять: одну долгим нажатием или весь список сразу, с кнопкой «Вернуть»', blocks: [B('Раздел «Мои ошибки» на Главной')] },
  video: { badge: 'Видео', short: 'Новый плейлист', long: 'Новый плейлист: 12 коротких роликов про работу и собеседование с готовыми наборами фраз', blocks: [B('Раздел «Видео» на Главной')] },
  exam: { badge: 'Экзамен главы', short: 'Экзамен открыт', long: 'Экзамен главы открыт всем: 12 вопросов, сдать от 10, пересдача через час', blocks: [B('Кнопка на карте главы')] },
  ai: { badge: 'Свободный разговор', short: 'Отвечает быстрее', long: 'Свободный разговор отвечает в два раза быстрее и не зависает без сети', blocks: [B('Включите в разделе «Диалоги»')] },
  plus: { badge: 'Phraseman Plus', short: 'Без лимитов на энергию', long: 'Без лимитов на энергию, все диалоги и свободный разговор: месяц Plus дешевле двух кофе', blocks: [B('Первые 7 дней бесплатно', 16, 'accent')], cta: true },
  contest: { badge: 'Конкурс', short: 'Набор месяца', long: 'Набор месяца: три набора сообщества, которые добавили чаще всего в октябре', blocks: [B('«Еда и кафе» · Марина', 14), B('«B2 глаголы» · Олег', 14), B('«Поездка» · Тимур', 14)] },
  challenge: { badge: 'Челлендж недели', short: '5 уроков за неделю', long: '5 уроков за неделю: все, кто дойдёт до пятого, получат 500 монет в понедельник', blocks: [B('Уже прошли 2 из 5', 16, 'accent')] },
  invite: { badge: 'Друзья', short: 'Пригласи друга', long: 'Пригласи друга: вы увидите серии друг друга и сможете играть дуэли на 5 фраз', blocks: [B('Код действует 30 дней', 14)], cta: true },
  thanks: { badge: 'Нас уже', short: '50 000', long: '50 000', blocks: [B('учеников в PhraseMan', 20), B('Спасибо, что учитесь с нами каждый день', 14)] },
  poll: { badge: 'Опрос', short: 'Какой язык добавить?', long: 'Какой язык добавить следующим? Мы начнём с того, за который проголосует больше всего людей', blocks: [B('Итальянский'), B('Немецкий'), B('Португальский')] },
  author: { badge: 'Автор недели', short: 'Марина', long: 'Марина собрала набор, который за неделю добавили себе 214 человек', blocks: [B('«Еда и кафе» · 48 карточек'), B('214 добавлений за неделю', 14)] },
  newyear: { badge: '31 декабря', short: 'С Новым годом!', long: 'С Новым годом! Пусть серия не прервётся, а новые слова приходят сами', blocks: [B('Команда PhraseMan', 14)] },
  holiday: { badge: '8 марта', short: 'С праздником!', long: 'С праздником! Сегодня все диалоги открыты без энергии, а фраза дня — про цветы', blocks: [B('Подарок действует до полуночи', 14)] },
  birthday: { badge: 'PhraseMan', short: '3 года', long: '3 года', blocks: [B('Нам три года. Спасибо, что растёте вместе с нами', 20), B('Весь день — двойные монеты', 14, 'accent')] },
  theme: { badge: 'Темы', short: 'Тема «Полночь»', long: 'Тема «Полночь» открыта всем на неделю: включите её в настройках и посмотрите, как выглядит ночной Пик', blocks: [B('Настройки → Темы', 14)], cta: true, themeId: 'grad_full_titanium' },
  version: { badge: 'Обновление', short: '2.0.2', long: '2.0.2', blocks: [B('Подсказки в диалогах'), B('Удаление ошибок'), B('Экзамен главы')] },
  maintenance: { badge: 'Обслуживание', short: 'Ночью сервер отдыхает', long: 'Ночью с 02:00 до 03:00 сервер отдыхает: уроки работают, а Пик и дуэли подождут час', blocks: [B('Прогресс сохранится')] },
  feedback: { badge: 'Ваши письма', short: 'Мы вас услышали', long: 'Мы вас услышали: 16 жалоб за неделю разобраны, вот что исправили', blocks: [B('«Мои ошибки» грузились бесконечно', 14, 'quote'), B('Пик тормозил после седьмой ступени', 14, 'quote'), B('Звёзды за проверочное не засчитались', 14, 'quote')] },
  tip: { badge: 'Совет', short: 'Учите фразами', long: 'Учите фразами, а не словами: одна карточка в день с фразой дня даёт больше, чем десять слов', blocks: [B('Добавляйте фразу дня в карточки одним нажатием на закладку', 14)] },
};

/** Содержимое кадра из примера макета (короткий или длинный заголовок) — фотостудия и гейт. */
export function sampleAnnouncement(design: AnnouncementV2Design, long: boolean, publishedAtMs: number): AnnouncementV2Content {
  const s = ANNOUNCEMENT_V2_SAMPLES[design];
  const action = (ANNOUNCEMENT_CTA_BY_DESIGN as Readonly<Partial<Record<AnnouncementV2Design, AnnouncementV2CtaAction>>>)[design];
  return {
    // зачем (гейт): контракт не знает 10 с, кадр фотостудии — 12 с; заморозку просмотр делает по времени (6000 мс = 6000 / durationMs полосы), как ST.freeze макета
    design, badge: s.badge, title: long ? s.long : s.short, blocks: s.blocks, durationMs: 12000, publishedAtMs,
    eventAtMs: s.eventAtMs, art: ANNOUNCEMENT_ART_DEFAULTS[design], videoId: undefined, cta: s.cta && action ? { action } : undefined, themeId: s.themeId,
  };
}

// ── фотостудия (dev-маршрут: state=announcements&frame=…&long=1) ──────────────────────────────────────────────────

/** Номер кадра из параметра: design («poll») или номер 1…36; иначе — первый. */
export function announcementStudioStartIndex(raw: string | undefined): number {
  if (isAnnouncementV2Design(raw)) return ANNOUNCEMENT_V2_DESIGNS.indexOf(raw);
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n >= 1 && n <= ANNOUNCEMENT_V2_DESIGNS.length ? n - 1 : 0;
}

/** 36 объявлений фотостудии — события просмотра того же вида, что боевые (payload.contentJson с design и полями кадра). */
export function announcementStudioEvents(nowMs: number, long: boolean): StoryEventList {
  return ANNOUNCEMENT_V2_DESIGNS.map((design, i) => {
    const content = sampleAnnouncement(design, long, nowMs);
    const published = {
      templateId: 'focus', titleSize: 34, align: 'center', decoration: false, lifetime: 7, unit: 'days',
      ...content, id: `studio-ann-${design}`, revision: 1, status: 'published', publishedAtMs: nowMs - 60_000, expiresAtMs: nowMs + 7 * 86_400_000,
    };
    return { id: `studio-ann-${design}`, type: 'announcement' as const, payload: { contentJson: JSON.stringify(published), durationMs: content.durationMs, studioAnnouncement: design, studioIndex: i }, atMs: nowMs, seen: false };
  });
}

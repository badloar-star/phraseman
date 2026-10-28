// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_bridge.ts — объявление из события просмотра и его кнопка (36 шаблонов stories-announcements-v1; кадры рисует Сайт).
//
// зачем (владелец 28.10: «в приложении точно как на макете»): событие announcement несёт объявление целиком строкой payload.contentJson.
// Здесь оно проходит тот же общий контракт, что и на сервере (liveAnnouncements): битое или просроченное — null, и просмотр показывает
// прежний AnnouncementSlide. Кнопка — строго как в макете (координатор 28.10): только plus / invite / theme. Логи [STORY-TPL].
// ═══════════════════════════════════════════════════════════════════════════
import { DebugLogger } from '../../../app/debug-logger';
import { ANNOUNCEMENT_CTA_BY_DESIGN, liveAnnouncements, type PublishedAnnouncement } from '../../../modules/story_events/story_announcements_contract';
import type { StoryTemplateCta } from './story_template_registry';

const LOG = '[STORY-TPL]';

type EventLike = Readonly<{ id: string; type: string; payload: Readonly<Record<string, unknown>> }>;

/** Объявление из события (payload.contentJson), проверенное общим контрактом; не объявление, битое или просроченное — null. */
export function announcementFromEvent(event: EventLike, nowMs: number): PublishedAnnouncement | null {
  if (event.type !== 'announcement') return null;
  const raw = event.payload.contentJson;
  if (typeof raw !== 'string') {
    DebugLogger.info(LOG, `объявление ${event.id.slice(0, 8)}: нет contentJson — прежний кадр`);
    return null;
  }
  try {
    const [announcement] = liveAnnouncements([JSON.parse(raw)], nowMs);
    if (!announcement) DebugLogger.info(LOG, `объявление ${event.id.slice(0, 8)}: не прошло контракт или срок вышел — прежний кадр`);
    return announcement ?? null;
  } catch (error: unknown) {
    DebugLogger.info(LOG, `объявление ${event.id.slice(0, 8)}: contentJson не JSON (${String(error).slice(0, 60)}) — прежний кадр`);
    return null;
  }
}

/** Кнопки макета: plus — «Открыть Plus» (sparkles), invite — «Поделиться ссылкой» (share), theme — «Включить тему» (palette). */
const ANNOUNCEMENT_CTA: Readonly<Record<keyof typeof ANNOUNCEMENT_CTA_BY_DESIGN, StoryTemplateCta>> = {
  plus: { action: 'open_plus', label: 'ctaOpenPlus', icon: 'sparkles' },
  invite: { action: 'share_link', label: 'ctaShareLink', icon: 'share-social' },
  theme: { action: 'use_theme', label: 'ctaUseTheme', icon: 'color-palette' },
};

/** Кнопка объявления: только если редактор её включил (поле cta) и шаблон — один из трёх макета. */
export function announcementCta(announcement: PublishedAnnouncement): StoryTemplateCta | null {
  const design = announcement.design;
  if (!announcement.cta || design === undefined || !(design in ANNOUNCEMENT_CTA)) return null;
  return ANNOUNCEMENT_CTA[design as keyof typeof ANNOUNCEMENT_CTA];
}

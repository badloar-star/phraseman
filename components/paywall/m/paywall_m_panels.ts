// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_panels.ts — окна по месту входа пейвола «Вариант М»: какая панель нужна и из чего она считается.
//
// зачем (владелец «Да, так», макет 6dkmYjjEX3kCv2s1nuFT9B, координатор 25.10): по месту входа сначала короткая панель про человека (энергия, серия, замок урока), по тапу —
// общий экран М с шапкой этого места. Новых context/source нет: панель выбирается из существующего контекста (paywallMHeadKindForContext). Нет числа, которое панель должна
// показать (серии нет, курс пройден) — панели нет, сразу общий экран, без выдуманных цифр. Чистый модуль — tests/paywall_m_panels_2026_10_25.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import type { PaywallMHeadFacts, PaywallMHeadKind } from './paywall_m_head';
import { PAYWALL_M_TOTAL_LESSONS, type PaywallMPerson } from './paywall_m_model';

export type PaywallMPanelKind = 'energy' | 'streak' | 'lock' | 'workshop' | 'refused' | 'dialog';

/** Какая панель открывается первой для этого места входа; null — сразу общий экран М. */
export function paywallMPanelKindFor(place: PaywallMHeadKind, person: Pick<PaywallMPerson, 'streakDays' | 'lessonsDone'>, facts: PaywallMHeadFacts = {}): PaywallMPanelKind | null {
  if (place === 'energy') return 'energy';
  if (place === 'refused') return 'refused';
  // Разговор с ИИ: панель про первый бесплатный разговор — только когда он записан на телефоне (минуты и реплики из app/dialog_first_free_summary.ts); иначе сразу общий экран
  if (place === 'dialog') return finitePositive(facts.dialogMinutes) && finitePositive(facts.dialogPhrases) ? 'dialog' : null;
  // Мастерская: урок и число фраз приходят от кнопки урока (параметры входа); нет любого из них — панели нет, сразу общий экран
  if (place === 'workshop') return finitePositive(facts.lockedLesson) && finitePositive(facts.workshopPhrases) ? 'workshop' : null;
  if (place === 'streak') return person.streakDays > 0 ? 'streak' : null;
  if (place === 'lock') return person.lessonsDone >= 0 && person.lessonsDone < PAYWALL_M_TOTAL_LESSONS ? 'lock' : null;
  return null;
}

const finitePositive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export type PaywallMWeekDay = Readonly<{ key: string; date: Date; done: boolean; today: boolean }>;

const pad = (n: number): string => String(n).padStart(2, '0');
/** Ключ дня по часам телефона: ГГГГ-ММ-ДД. */
export function paywallMDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Семь дней, заканчивая сегодняшним: был ли в день занятие (даты активности из снимка прогресса; берём первые 10 знаков «ГГГГ-ММ-ДД»).
 * Сегодняшний день без занятия показывается как «ещё нет», а не как пропуск — пропуском считаем только прошлые дни.
 */
export function paywallMWeekDays(activityDates: readonly string[], now: Date): readonly PaywallMWeekDay[] {
  const active = new Set(activityDates.map((s) => String(s).slice(0, 10)));
  const days: PaywallMWeekDay[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = paywallMDayKey(d);
    days.push({ key, date: d, done: active.has(key), today: back === 0 });
  }
  return days;
}

/** Пропущенный прошлый день (для подписи «пропуск» и значка щита): не сегодня и без занятия. */
export function paywallMIsMissedDay(day: PaywallMWeekDay): boolean {
  return !day.done && !day.today;
}

/** Доля полосы «3 из 32»: 0…1, не выходит за края. */
export function paywallMLessonProgress(lessonsDone: number): number {
  return Math.max(0, Math.min(1, lessonsDone / PAYWALL_M_TOTAL_LESSONS));
}

export type PaywallMCorrectionPart = Readonly<{ text: string; changed: boolean }>;

const wordKey = (w: string): string => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

/**
 * Фраза «как стало» кусками: слова, которых не было в «как было», помечены changed — их красим цветом «верно».
 * зачем (макет 6dkmYjjEX3kCv2s1nuFT9B, окно «Разговор с ИИ»): исправленное слово в фразе человека видно сразу. Порядок слов и пробелы сохраняются; нет «как было» — всё как есть.
 */
export function paywallMCorrectionParts(was: string | null | undefined, now: string): readonly PaywallMCorrectionPart[] {
  const have = new Set((was ?? '').split(/\s+/).map(wordKey).filter(Boolean));
  const parts: PaywallMCorrectionPart[] = [];
  for (const piece of now.split(/(\s+)/)) {
    if (piece === '') continue;
    const isSpace = /^\s+$/.test(piece);
    const key = isSpace ? '' : wordKey(piece);
    const changed = !isSpace && key !== '' && have.size > 0 && !have.has(key);
    const last = parts[parts.length - 1];
    if (last && last.changed === changed) parts[parts.length - 1] = { text: last.text + piece, changed };
    else parts.push({ text: piece, changed });
  }
  return parts;
}

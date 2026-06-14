/**
 * paywall_testimonials.ts — отзывы для пейвола (план #6).
 *
 * Research: trial-пейвол с social proof конвертит 64.5% vs 44.4% text-only (Airbridge);
 * goal-matched отзывы >> generic. Топ-игроки (Duolingo/Babbel/Speak) показывают реальные
 * отзывы + точные числа.
 *
 * ░░ ANTI-FAKE GUARD (App Store Review 5.1.1 / Google deceptive content) ░░
 * Каждый отзыв имеет `verified`:
 *   - verified:true  — РЕАЛЬНЫЙ отзыв (App Store / собранный у пользователя). Показывается в проде.
 *   - verified:false — черновик/плейсхолдер. Показывается ТОЛЬКО в dev/preview, НИКОГДА в проде.
 * pickTestimonials в проде вызывается с includeUnverified=false → фейк физически не попадает
 * к пользователю. Если verified-отзывов нет → блок отзывов просто не рендерится (безопасно).
 *
 * CI-гейт: tests/paywall_testimonials.test.ts падает, если verified-отзыв содержит маркер
 * плейсхолдера (DRAFT_MARKER) — нельзя случайно «пометить черновик верифицированным».
 *
 * Ротация детерминирована по dayHash — стабильна в рамках дня, не «прыгает» в сессии.
 */
import type { PremiumContext } from './premium_context';
import type { Lang } from '../constants/i18n';

/** Маркер-невидимка в черновиках. CI проверяет, что его НЕТ в verified-отзывах. */
export const DRAFT_MARKER = '[[draft]]';

export interface Testimonial {
  text: string;
  author: string;
  /** РЕАЛЬНЫЙ ли отзыв. false = черновик, прод его не показывает. */
  verified: boolean;
  /** Если задан — отзыв всплывает первым в подходящем контексте (goal-matched). */
  goalTag?: PremiumContext;
}

// ────────────────────────────────────────────────────────────────────────────
// ЧЕРНОВИКИ (verified:false). Стиль Библии (Стиль 5 Человек, gain-framing).
// Помечены DRAFT_MARKER в author, чтобы их нельзя было «втихую» зарелизить.
// TODO(before release): заменить на РЕАЛЬНЫЕ отзывы и выставить verified:true.
// ────────────────────────────────────────────────────────────────────────────
const D = DRAFT_MARKER;
// РЕАЛЬНЫЕ отзывы Google Play (verified:true) — те же, что на лендинге knowlyapps.com
// (commit 0338417a). Атрибуция «Отзыв в Google Play» честная: на витрине отзывы
// показаны без имён. Текст — сжатые цитаты из реальных отзывов, без искажения смысла.
const GP = 'Отзыв в Google Play';
export const TESTIMONIALS: Record<Lang, Testimonial[]> = {
  ru: [
    { text: 'Пробовал Duolingo, Puzzle English, Anki — только это приложение реально мотивирует и учит понимать живой английский.', author: GP, verified: true, goalTag: 'course_after_lesson3' },
    { text: 'Учишь не отдельные слова, а целые фразы носителей. За месяц заметно улучшилось понимание на слух.', author: GP, verified: true },
    { text: 'С первого урока увлекает и хочется продолжать. Короткие, очень понятные подсказки при ошибках. Рекомендую 👍', author: GP, verified: true },
    { text: 'Фразы хорошо запоминаются, грамматика чётко и кратко, а значения слов — с комментарием, часто с юмором.', author: GP, verified: true },
    // Черновики (verified:false) — только для dev/preview, в прод не попадают.
    { text: '15 минут утром — и словарь растёт сам.', author: `Мария ${D}`, verified: false },
    { text: 'Серия держит меня в тонусе каждый день.', author: `Дмитрий ${D}`, verified: false, goalTag: 'streak' },
  ],
  uk: [
    { text: 'За місяць зрозуміла перший серіал без субтитрів.', author: `Анна ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Нарешті заговорив на зустрічах з іноземцями.', author: `Ігор ${D}`, verified: false },
    { text: '15 хвилин зранку — і словник росте сам.', author: `Марія ${D}`, verified: false },
    { text: 'Серія тримає мене в тонусі щодня.', author: `Дмитро ${D}`, verified: false, goalTag: 'streak' },
  ],
  es: [
    { text: 'En un mes entendí mi primera serie sin subtítulos.', author: `Ana ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Por fin hablé en reuniones con extranjeros.', author: `Igor ${D}`, verified: false },
    { text: '15 minutos por la mañana y mi vocabulario crece solo.', author: `María ${D}`, verified: false },
    { text: 'La racha me mantiene activo cada día.', author: `Dmitri ${D}`, verified: false, goalTag: 'streak' },
  ],
  'pt-BR': [
    { text: 'Em um mês entendi minha primeira série sem legendas.', author: `Ana ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Finalmente falei em reuniões com estrangeiros.', author: `Igor ${D}`, verified: false },
    { text: '15 minutos de manhã e meu vocabulário cresce sozinho.', author: `Maria ${D}`, verified: false },
  ],
  vi: [
    { text: 'Sau một tháng tôi hiểu bộ phim đầu tiên không cần phụ đề.', author: `Anna ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Cuối cùng tôi đã nói được trong cuộc họp với người nước ngoài.', author: `Igor ${D}`, verified: false },
    { text: '15 phút mỗi sáng và vốn từ tự tăng lên.', author: `Maria ${D}`, verified: false },
  ],
  id: [
    { text: 'Dalam sebulan aku paham serial pertama tanpa subtitle.', author: `Anna ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Akhirnya bisa bicara di rapat dengan orang asing.', author: `Igor ${D}`, verified: false },
    { text: '15 menit tiap pagi dan kosakataku tumbuh sendiri.', author: `Maria ${D}`, verified: false },
  ],
  tr: [
    { text: 'Bir ayda ilk diziyi altyazısız anladım.', author: `Anna ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'Sonunda yabancılarla toplantıda konuştum.', author: `Igor ${D}`, verified: false },
    { text: 'Sabah 15 dakika ve kelime dağarcığım kendiliğinden büyüyor.', author: `Maria ${D}`, verified: false },
  ],
  pl: [
    { text: 'W miesiąc zrozumiałam pierwszy serial bez napisów.', author: `Anna ${D}`, verified: false, goalTag: 'course_after_lesson3' },
    { text: 'W końcu odezwałem się na spotkaniach z obcokrajowcami.', author: `Igor ${D}`, verified: false },
    { text: '15 minut rano i słownictwo rośnie samo.', author: `Maria ${D}`, verified: false },
  ],
};

/**
 * Подбирает `count` отзывов: goal-matched первым, остальные — детерминированной ротацией.
 *
 * @param includeUnverified — показывать ли черновики. В ПРОДЕ всегда false → черновики
 *   не попадают к пользователю. true только в dev/preview.
 */
export function pickTestimonials(
  lang: Lang,
  ctx: PremiumContext,
  dayHash: number,
  count = 2,
  includeUnverified = false,
): Testimonial[] {
  const all = TESTIMONIALS[lang] ?? TESTIMONIALS.ru;
  const pool = includeUnverified ? all : all.filter(t => t.verified);
  if (pool.length === 0) return [];

  const matched = pool.filter(t => t.goalTag === ctx);
  const rest = pool.filter(t => t.goalTag !== ctx);

  // детерминированная ротация «остальных» по dayHash
  const rotated: Testimonial[] = [];
  const n = rest.length;
  const start = n > 0 ? ((dayHash % n) + n) % n : 0;
  for (let i = 0; i < n; i++) {
    rotated.push(rest[(start + i) % n]!);
  }

  const ordered = [...matched, ...rotated];
  return ordered.slice(0, Math.min(count, ordered.length));
}

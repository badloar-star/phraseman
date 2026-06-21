/**
 * Единый словарь акцентов модалок «по смыслу» (Волна 0 редизайна модалок).
 * Источник правды по цвету: любая модалка задаёт свою «личность» одним
 * контекстом, а ВСЁ остальное (кольцо, кикер, вуаль, лучи, искры, CTA-градиент)
 * прокрашивается этим accent. См. docs/reports/ALL_MODALS_AUDIT_2026-06-21.md §3.2.
 *
 * Чистый модуль без React — можно импортировать где угодно. Сам «дорогой»
 * материал слоёв строится в RewardModalBackdrop.rewardModalGlowLayers(accent).
 */

/** Регистр движения модалки (см. §3.6 аудита). */
export type ModalMotionRegister = 'calm' | 'celebrate' | 'alarm';

/** Семантический контекст модалки. */
export type ModalContext =
  | 'sale'          // продажа / подписка / celebration
  | 'gift'          // подарок (intro/loyalty/referral)
  | 'limit'         // лимит энергии / арены (НЕ красный)
  | 'shards'        // осколки / наборы
  | 'streak'        // стрик / возрождение
  | 'social'        // ачивка / реферал / жалоба-юзер
  | 'win'           // повышение / победа / трон
  | 'lose'          // понижение / поражение
  | 'trust'         // доверие / безопасность (registration)
  | 'moderation'    // модерация (жалоба-набор / ошибка)
  | 'warning'       // тревога (warning / billing)
  | 'destructive'   // деструктив (удаление аккаунта)
  | 'neutral';      // нейтральная утилитарная модалка

export interface ModalAccent {
  /** Основной акцент — прокрашивает кольцо, кикер, вуаль, лучи, искры, CTA. */
  accent: string;
  /** Вторая «горячая» нота для двухцветных переливов кольца (опц.). */
  warmShift?: string;
  /** Градиент первичной кнопки (объёмная CTA). */
  cta: [string, string];
  /** Цвет текста на первичной кнопке. */
  ctaInk: string;
  /** Регистр движения по умолчанию для этого контекста. */
  register: ModalMotionRegister;
}

const ACCENTS: Record<ModalContext, ModalAccent> = {
  sale:        { accent: '#E8C36C', warmShift: '#B9852E', cta: ['#FFE7A6', '#E0A124'], ctaInk: '#3A2606', register: 'celebrate' },
  gift:        { accent: '#F0B47A', warmShift: '#34C77A', cta: ['#FFE3C2', '#E89A4E'], ctaInk: '#3A2206', register: 'celebrate' },
  limit:       { accent: '#F4D889', cta: ['#FBE6A4', '#E0A124'], ctaInk: '#3A2C06', register: 'calm' },
  shards:      { accent: '#6FB1FF', cta: ['#BFE9FF', '#38BDF8'], ctaInk: '#0A3550', register: 'celebrate' },
  streak:      { accent: '#FF7A1A', warmShift: '#7A3A0A', cta: ['#FFC178', '#F2660A'], ctaInk: '#3A1A06', register: 'celebrate' },
  social:      { accent: '#D8A6FF', warmShift: '#F0A35E', cta: ['#E7CCFF', '#A86FE0'], ctaInk: '#2A1448', register: 'calm' },
  win:         { accent: '#34C759', warmShift: '#FFD24A', cta: ['#7DEFA6', '#34C759'], ctaInk: '#08351C', register: 'celebrate' },
  lose:        { accent: '#FF6B6B', warmShift: '#7A1A1A', cta: ['#FF9E9E', '#C0392B'], ctaInk: '#FFFFFF', register: 'alarm' },
  trust:       { accent: '#6EA8FF', cta: ['#BFD8FF', '#3F6FC4'], ctaInk: '#0B1B3A', register: 'calm' },
  moderation:  { accent: '#6EA8FF', cta: ['#BFD8FF', '#3F6FC4'], ctaInk: '#0B1B3A', register: 'calm' },
  warning:     { accent: '#F2A03D', cta: ['#FBD08A', '#E0822A'], ctaInk: '#3A2206', register: 'alarm' },
  destructive: { accent: '#FF6B6B', warmShift: '#7A1A1A', cta: ['#FF8A8A', '#C0392B'], ctaInk: '#FFFFFF', register: 'alarm' },
  neutral:     { accent: '#6EA8FF', cta: ['#BFD8FF', '#3F6FC4'], ctaInk: '#0B1B3A', register: 'calm' },
};

export function modalAccentFor(context: ModalContext): ModalAccent {
  return ACCENTS[context] ?? ACCENTS.neutral;
}

/** Палитра частиц для энергошардов/искр — по accent (без бумажного конфетти). */
export function shardColorsFor(accent: ModalAccent): readonly string[] {
  return accent.warmShift
    ? [accent.cta[0], accent.accent, accent.warmShift]
    : [accent.cta[0], accent.accent, accent.cta[1]];
}

/** Добавляет alpha к 6-значному hex (#RRGGBB → #RRGGBBAA); иначе возвращает как есть. */
export function withModalAlpha(hex: string, alphaHex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}

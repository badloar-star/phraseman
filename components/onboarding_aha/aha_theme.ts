// Визуальные токены АХ-сцены — тот же язык, что у CleanOnboarding.tsx
// (инлайн-палитра «Полночь»/liquid glass), чтобы сцена не выбивалась из флоу.
// НЕ импортируем из CleanOnboarding.tsx (файл занят другой сессией) — копия токенов.

export const AHA_THEME = {
  /** Фоновый градиент экрана (диагональ 0,0 → 1,1). */
  bgGradient: ['#050711', '#080914', '#02030A'] as const,
  /** Градиент primary CTA. */
  ctaGradient: ['#E3ECFF', '#7B8CFF', '#C95CFF'] as const,
  /** Псевдо-3D подошва CTA. */
  ctaShadow: '#3549E8',
  ctaTextColor: '#07111F',
  ctaDisabled: '#293044',
  /** Прогресс/акцентный градиент. */
  accentGradient: ['#8AB9FF', '#9B7CFF', '#E36EFF'] as const,

  textPrimary: '#F4F6FF',
  textSecondary: 'rgba(244,246,255,0.72)',
  textMuted: 'rgba(244,246,255,0.45)',

  bubbleBg: 'rgba(255,255,255,0.08)',
  bubbleBorder: 'rgba(255,255,255,0.14)',
  bubblePointerBg: '#121525',

  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.14)',
  secondaryBg: 'rgba(255,255,255,0.04)',
  secondaryBorder: 'rgba(255,255,255,0.20)',

  chipBg: 'rgba(255,255,255,0.08)',
  chipBorder: 'rgba(255,255,255,0.18)',
  chipSelectedBg: 'rgba(133,143,255,0.18)',
  chipSelectedBorder: '#AAB5FF',
  /** Подсветка «следующее правильное слово» после отпружинившего дистрактора. */
  chipHintBorder: 'rgba(227,110,255,0.65)',

  /** Караоке: слово ещё не прозвучало / уже прозвучало. */
  karaokeIdle: 'rgba(244,246,255,0.40)',
  karaokeLit: '#F4F6FF',
  karaokeAccent: '#B9A8FF',

  /** Пословная карта речи (бит 3). */
  wordClean: '#4ADE80',
  wordFuzzy: '#FBBF24',
  wordMissed: 'rgba(244,246,255,0.35)',

  /** Liquid blobs фона. */
  blobBlue: 'rgba(62,98,255,0.18)',
  blobViolet: 'rgba(198,92,255,0.14)',

  /** Виньетка поверх фоновой иллюстрации (читаемость текста). */
  vignetteTop: 'rgba(2,3,10,0.88)',
  vignetteMid: 'rgba(2,3,10,0.30)',
  vignetteBottom: 'rgba(2,3,10,0.92)',

  micRing: '#9B7CFF',
  micRingActive: '#E36EFF',

  confettiColors: ['#E3ECFF', '#7B8CFF', '#C95CFF', '#8AB9FF', '#E36EFF', '#4ADE80'] as const,

  radiusCard: 14,
  radiusChip: 12,
  radiusBubble: 18,
} as const;

export type AhaTheme = typeof AHA_THEME;

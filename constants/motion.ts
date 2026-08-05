export const MOTION_DURATION = {
  fast: 180,
  normal: 240,
  slow: 320,
  celebrate: 420,
  // Telegram source exact values:
  navPush: 400,       // NavigationController.swift:187 — push/pop
  modalSnap: 500,     // NavigationModalContainer.swift:188 — snap-back
  modalDismiss: 300,  // NavigationModalContainer.swift — max, velocity-capped
  blurFade: 50,       // SizeNotifierFrameLayout.java — blur crossfade
  scrollAdapt: 320,   // ActionBar.java — blur alpha on scroll
  bottomSheetOpen: 400,  // BottomSheet.java — open
  bottomSheetClose: 250, // BottomSheet.java — dismiss
  iconCross: 150,     // AndroidUtilities.java — icon crossfade
  shake: 300,         // AndroidUtilities.java — error shake
  actionMode: 200,    // ActionBar.java — action mode show/hide
} as const;

/**
 * Reanimated v3+ withSpring params (damping/stiffness/mass).
 * НЕ используй эти значения с Animated.spring (там friction/tension — другая шкала).
 *
 * Источник: CAAnimationUtils.swift, ContainedViewLayoutTransition.swift (Telegram-iOS)
 */
export const MOTION_SPRING = {
  // Telegram navigation push/pop: damping=88, stiffness=900, mass=5
  nav: { damping: 88, stiffness: 900, mass: 5 },
  // Gesture-driven (minimize/maximize): damping=124
  gesture: { damping: 124, stiffness: 900, mass: 5 },
  // UI элементы (кнопки, карточки) — чуть более упругие
  ui: { damping: 20, stiffness: 300, mass: 1 },
  // Микро-анимации (scale на press) — быстрые, почти без bounce
  micro: { damping: 25, stiffness: 400, mass: 1 },
  // Toast / banner появление
  toast: { damping: 18, stiffness: 250, mass: 1 },
  // Error shake
  shake: { damping: 10, stiffness: 600, mass: 1 },
} as const;

/**
 * Те же spring параметры в формате friction/tension для Animated.spring (старый API).
 * Используй только там, где ещё нет Reanimated.
 */
export const MOTION_SPRING_LEGACY = {
  micro: { tension: 400, friction: 30 },
  ui: { tension: 300, friction: 28 },
  panel: { tension: 250, friction: 25 },
  toast: { tension: 250, friction: 22 },
  /**
   * зачем: отклик на нажатие кнопки. Владелец жаловался, что нажатие ощущается
   * с «микрозадержкой». `micro` (tension 400 / friction 30) — сильно
   * передемпфированная пружина: она доползает до цели за ~300мс, и глаз читает
   * это как задержку, хотя обработчик уже отработал. Норматив отклика на
   * нажатие — 100–160мс, поэтому здесь пружина жёстче и заметно слабее
   * задемпфирована: то же отсутствие отскока, но втрое быстрее.
   * Отдельный токен, а не правка `micro`, потому что `micro` живёт ещё и в
   * NoEnergyModal (анимация молнии) — там текущий характер менять не просили.
   */
  press: { tension: 620, friction: 22 },
} as const;

/**
 * Easing bezier кривые из исходников Telegram.
 * Используй с withTiming({ easing: Easing.bezier(...) }).
 *
 * Источник: ContainedViewLayoutTransition.swift, CubicBezierInterpolator.java
 */
export const MOTION_EASING = {
  // "slide" — главная кривая Telegram для панелей: fast-in, very slow-out
  slide: [0.33, 0.52, 0.25, 0.99] as const,
  // Spring fallback bezier (когда spring недоступен)
  springFallback: [0.38, 0.70, 0.125, 1.0] as const,
  // EASE_OUT_QUINT — Android open/show анимации
  easeOutQuint: [0.23, 1, 0.32, 1] as const,
} as const;

/** Subtle scale peaks — keep UI motion premium, not "bouncy toy" */
export const MOTION_SCALE = {
  hint: 1.02,
  nudge: 1.06,
  celebrate: 1.12,
  streakPop: 1.28,
  multBadge: 1.18,
  energyPulse: 1.08,
  /** Мягкое «подтверждение» иконки энергии при восстановлении (без 1.5×) */
  energyRefill: 1.14,
} as const;

/** Главный экран: каскад секций (home) — плавные пружины, не «дёрганая» детская кукла */
export const HOME_ENTRANCE = {
  sectionStaggerMs: 58,
  quickStaggerMs: 46,
  bgDriftPx: 9,
  bgDriftMs: 1500,
  initialOpacity: 0.9,
  initialTranslateY: 20,
  initialScale: 0.95,
  quickTranslateY: 12,
  quickScale: 0.93,
} as const;


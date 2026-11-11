// plus_mark_colors.ts — цвета знака Plus (шестиугольник ✦) для мест вне окна покупки. Чистый модуль: без React Native и анимаций.
// зачем (сосед U36, 11.11: сторож tests/stories_ring_viewer_contract.test.tsx перестал загружаться): кадры-предложения Plus в «Историях»
// брали цвета из components/paywall/duo/PaywallDuoHero, а тот на уровне модуля зовёт Easing.bezier — просмотр историй потянул за собой
// анимации окна покупки. Цвета — те же, что DUO_TIER_COLORS.ultra и DUO_TIER_INK.ultra; равенство держит
// tests/story_plus_offer_frames_2026_11_11.test.ts (менять только вместе с PaywallDuoHero).
// theme-exempt: градиент и чернила уровня из утверждённого макета пейвола «Два пути» — смысловой цвет подписки, темой не красится.
export const PLUS_MARK_GRADIENT = ['#FF7A59', '#FF5F8F', '#FF4FD0'] as const; // theme-exempt: макет --c1/--c2/--c3 Ultra
export const PLUS_MARK_INK = '#2B0717'; // theme-exempt: чернила глифа на градиенте уровня

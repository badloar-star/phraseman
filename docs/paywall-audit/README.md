# Аудит пейволов Phraseman — галерея мокапов

**Файл:** `docs/paywall-audit/paywall-mockups.html` — автономный (двойной клик, без сервера, сети, веб-шрифтов и картинок; глифы и иконки — inline SVG). Открывается в десктопном браузере.

## Что внутри

1. **A. Текущие пейволы (точные мокапы)** — телефонные рамки 390×844 со скроллом, тёмная тема:
   - Вариант A «Компакт»;
   - Вариант B «Стори»;
   - Вариант C «Атриум».
2. **B. Мягкие монетизационные поверхности**:
   - NoEnergyModal («Энергия закончилась», молния, золотая кнопка с shine — единственная анимация, которая уже есть в коде);
   - AiLimitUpsellCard («Бесплатные объяснения закончились» → «Получить фулл доступ»);
   - CardPackShardPaywallModal в двух состояниях: «Открыть за 120 осколков» и «Недостаточно осколков»;
   - IntroFullAccessModal, вариант welcome («Подарок на старт — три дня всё открыто»).
3. **C. Улучшенные версии** — A+ «Компакт+», B+ «Стори+», C+ «Атриум+», «Энергия+», «AI-лимит+». Та же структура и копирайт + премиальные анимации.
4. **D. Сводная таблица** — что изменено в каждой «+» версии и ожидаемый UX-эффект.
5. **E. Дизайн-концепты пейвола (6 архетипов)** — genuinely different информационные архитектуры, а не рескины A/B/C. Каждый концепт: полноэкранный мокап + replay-кнопка + карточка с идеей, исследовательской базой, ожидаемым эффектом и главным риском:
   1. **«Колонна»** — развитие текущей вертикали: доминирующий yearly-дефолт, monthly якорь-строкой, Pro текст-ссылкой (дефолт + якорение: Tversky & Kahneman 1974; Thaler & Sunstein).
   2. **«Плитки»** — три квадратные плитки в ряд (мес / год / Pro), цена в день под каждой, выбранная крупнее и светится (Iyengar & Lepper 2000; Patall/Cooper: оптимум 2–4; Ariely 2008).
   3. **«Один план»** — Calm-style: выбора нет, один герой + одна цена + CTA, остальное за ссылкой «Другие варианты» (choice overload: Iyengar & Lepper 2000; Sethi-Iyengar/Huberman/Jiang 2004).
   4. **«Free vs Plus»** — таблица сравнения Duolingo-стиля (7 строк ✓/✗), планы под таблицей (Ariely 2008; teardown Duolingo Super).
   5. **«Честный триал»** — таймлайн триала как герой первого экрана, планы вторичны, крупный trust-блок (кейс Blinkist × Purchasely — vendor; снижение реактанса).
   6. **«Якорь и приманка»** — decoy «6 месяцев за €29,99» делает год очевидным выбором (Huber et al. 1982; Ariely, эксперимент The Economist: 84% vs 32%, $8 012→$11 444; Thomas & Morwitz 2005).
6. **F. База исследований** — два списка: (a) академические источники (JPSP, JCR, книги), (b) вендорские агрегаты/кейсы (Adapty, Superwall, Blinkist × Purchasely, RevenueCat, 60fps.design) — помечены как vendor data с меньшим уровнем доверия.

## Механика replay (кнопка «▶ Проиграть анимацию»)

- У каждого анимированного мокапа (A+/B+/C+/Энергия+/AI-лимит+ и все 6 концептов) под рамкой есть кнопка replay.
- Все one-shot анимации (каскад входа `.rise`, pop-появления `.pop`, прорисовка линий `.draw`, вход карточек/молнии, pop бейджей и флага) заведены под класс `.play` на `.phone.imp`: базовые состояния скрыты (`.imp .rise{opacity:0}` и т.п.), сами keyframes запускаются только при `.imp.play`.
- Рестарт: JS снимает `.play`, форсирует reflow (`void phone.offsetWidth`), возвращает `.play` — входные анимации играют заново.
- Бесконечные циклы (shine CTA, float/glow глифа, aurora-фон, marquee, ping точки, halo) заведены под `.imp` без `.play` и replay-ем **не** перезапускаются — крутятся постоянно.
- Автоплей при загрузке: класс `.play` стоит в разметке изначально, поэтому вход играет один раз сам (и работает даже с выключенным JS).
- `prefers-reduced-motion: reduce`: все анимации отключены глобальным kill-switch'ом, replay-кнопки скрыты, контент виден статично.

## Соответствие мокапов исходникам

| Мокап | Исходники |
|---|---|
| Вариант A | `app/paywall_a.tsx`; порядок: glyph → title → PlanCards → Urgency(compact) → CTA → SocialRow → PersonalizationProofCard → TrialTimeline → benefits → отзывы → Legal |
| Вариант B | `app/paywall_b.tsx`; как A + PersonalizationProofCard (с перцентилем) → CompareCard → отзывы → FaqCard → TrialTimeline → Legal; без списка бенефитов |
| Вариант C | `app/paywall_c.tsx`; первый экран без SocialRow, ниже фолда: разделитель «для сомневающихся» → CompareCard → отзывы → FaqCard → повторный CTA → Legal |
| Общий хром | `components/paywall/paywallShared.tsx` (фон, капсула глифа, соцстрока, кнопка ✕, sticky-бар — в мокапах не показан: он только для онбординга) |
| Карточки планов | `components/paywall/PaywallPlanCards.tsx` (годовая выбрана по умолчанию, бейдж −N%, «Дополнительное предложение» → Phraseman Pro) |
| CTA-блок | `components/paywall/PaywallCtaBlock.tsx` + `components/paywall/paywallScreenCopy.ts` |
| Таймлайн триала | `components/paywall/PaywallTrialTimeline.tsx` |
| Блок срочности цены | `components/paywall/PaywallPriceUrgency.tsx` (compact-режим) |
| Доказательные карточки | `components/paywall/PaywallProofCards.tsx` (PersonalizationProofCard, CompareCard, FaqCard) |
| Юр-плашка | `components/paywall/PaywallLegalDisclosure.tsx` |
| Цвета | `components/paywallThemeConfig.ts` (dark: акцент/CTA `#58CC89`, текст CTA `#042010`, бейдж `#FFC800` на `#07100A`, panelBg/panelBgStrong) + `constants/screenBackground.ts` (градиент `#07120B → #030805 → #010201`) |
| Копирайт контекстов | `app/paywall_copy.ts` (generic: «Учись быстрее с Plus»; также выписаны no_energy, streak, dialog_limit) |
| NoEnergyModal | `components/NoEnergyModal.tsx` + `components/PremiumGoldButton.tsx` (золотой градиент, shine 5,6 с) |
| AiLimitUpsellCard | `components/AiLimitUpsellCard.tsx` (заголовок из `ExplainSheet.tsx`) |
| Пак за осколки | `app/flashcards/CardPackShardPaywallModal.tsx` (режимы confirm / insufficient) |
| Подарок на старт | `components/IntroFullAccessModal.tsx` (COPY.ru, вариант welcome) |

## Применённые техники анимации (в «+» версиях)

Всё GPU-дёшево: только `transform` / `opacity` / `filter`, CSS `@keyframes` + transitions, без JS и rAF-циклов; при `prefers-reduced-motion: reduce` все анимации отключены.

- каскадный вход блоков (staggered rise: opacity + translateY, шаг ~60–80 мс);
- idle-float глифа + пульс свечения (translateY, box-shadow), hover-tilt (perspective, только десктоп-демо);
- pop бейджа экономии с пружинным overshoot (`cubic-bezier(.34,1.56,.64,1)`);
- shine-перелив CTA (skew+translateX, цикл 5,6 с — как у существующей золотой кнопки);
- aurora-меш фон (два blur-блоба, медленный transform-дрейф, низкий контраст);
- пульс активной точки триал-таймлайна (scale+opacity «ping»);
- тик цифр таймера (opacity steps, 1 с);
- marquee отзывов (transform-only, ~26 с, пауза при наведении);
- пружинный вход модалки + pop/тряска молнии + halo-пульс (NoEnergy+);
- бегущий градиент топ-линии (background-position) у AI-лимит+;
- glow-пульс повторного CTA в C+;
- pop-in плиток и ✓-иконок (scale + overshoot) в концептах «Плитки» и «Free vs Plus»;
- прорисовка коннекторов таймлайна (scaleY 0→1) в «Честный триал»;
- «дыхание» большого героя (scale 1↔1.045) в «Один план»;
- pop флага «Лучший выбор» с сохранением центровки (translateX(-50%) во всех кадрах) в «Якорь и приманка».

## Оговорки (что является плейсхолдером)

- Цены €34,99/год, €5,99/мес, €99 Pro, таймер `76:00:00`, будущая цена €69,98 — DEV-плейсхолдеры; в проде приходят из стора / `paywall_urgency`.
- Бейдж `−51%` посчитан из DEV-цен (5,99×12 vs 34,99); в проде считает код из цен стора.
- Рейтинг `4,8 · Google Play · 1 248 оценок` — плейсхолдер из конфига соцдоказательства.
- Имя/статы персонализации («Мария, 128 фраз, 12 дн. серии», перцентиль «78%») — примеры; в проде подставляются реальные данные пользователя.
- Отзывы — плейсхолдеры; в проде блок рендерится только при verified-отзывах (анти-фейк гард).
- Название/описание пака карточек («Аэропорт и перелёты», 24 карточки, 120 осколков) — пример.
- В экранах A/B/C рендерится только заголовок контекста; подзаголовок из `paywall_copy.ts` кодом сейчас не выводится (в мокапах — как в коде).

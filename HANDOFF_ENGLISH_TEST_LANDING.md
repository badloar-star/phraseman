# HANDOFF: English Level Test → Selling Landing Page

## 1. Что это

**English Level Test** — standalone веб-страница (`knowlyapps.com/english-level-test/`), куда пользователи приходят из рекламных видеороликов TikTok/Reels/Shorts. Цель: пользователь проходит тест → получает именной сертификат → **скачивает приложение Phraseman**.

## 2. Файлы и архитектура

```
knowly-www/english-level-test/
├── index.html          # корневой HTML, подключает 3 скрипта + 1 стиль
├── app.js              # UI: landing → test → result → certificate modal → CTA screen
├── engine.js           # Адаптивный движок теста (IRT, 18–24 вопроса, A1–C2)
├── certificate.js      # SVG-сертификат: 5 переключаемых тем, PNG export, печать
├── styles.css          # Тёмная тема Phraseman + анимации
└── data/
    └── questions.en.json   # Банк из 240 вопросов A1–C2
```

**Нет фреймворка.** Чистый vanilla JS, CSS animations, SVG. Не подключать React/Vue/etc — это static hosting (Firebase).

## 3. Что уже работает

- ✅ Адаптивный тест A1–C2 (engine.js) — 18–24 вопроса, калибровка, стабильность
- ✅ Тёмная тема Phraseman (фон `#0c0c0e`, акцент `#2a9d5c`)
- ✅ Базовые CSS-анимации (fadeInUp, slideInRight, pulseGlow, shimmer)
- ✅ Сертификат: 5 тем (Gold, Midnight, Emerald, Rose, Royal), переключение, конфетти
- ✅ Экспорт PNG 2×, печать/PDF
- ✅ Firebase Hosting деплой: `npm run hosting:knowlywww` или `firebase deploy --only hosting:knowlywww`

## 4. Что НУЖНО сделать (приоритеты по убыванию)

### P0 — Landing page, который ПРОДАЁТ

**Сейчас:** скучная карточка "Узнай свой уровень английского" — не цепляет.

**Нужно:** Лендинг, который за 3 секунды объясняет пользователю из TikTok, что он получит:

```
Заголовок:    "Узнай свой уровень английского за 5 минут"
Подзаголовок: "Получи именной сертификат + персональный план развития"
Social proof: "124 000+ человек уже прошли тест" (можно захардкодить)
CTO:          "Начать бесплатно"
```

**Элементы landing:**
1. Hero section — большой заголовок, анимированный счётчик ("124 000+ сертификатов выдано"), кнопка
2. Как это работает — 3 шага с иконками (иконки можно SVG inline):
   - "Отвечаешь на 18–24 вопроса" → "Получаешь уровень A1–C2" → "Скачиваешь сертификат"
3. Пример сертификата — мини-preview (можно статичный SVG), чтобы люди видели что получат
4. Trust badges: "Бесплатно", "Без регистрации", "Результат сразу"
5. Финальный CTA — повтор кнопки "Начать тест"

**Дизайн landing:** должен выглядеть как часть phraseman.app — тот же зелёный, тот же шрифт, те же скругления.

### P1 — Экран после сертификата: CTA "Скачать Phraseman"

**Сейчас:** после сертификата пользователь видит только "Поделиться" и "Пройти ещё раз". **Нет конверсии в установку приложения.**

**Нужно:** После закрытия сертификата (или вместо него) показать fullscreen CTA:

```
Если уровень A1–A2:
  "Ты только начинаешь — это круто! Phraseman поможет дойти до B2 за 3 месяца"
  Кнопка: "Начать обучение" → ссылка на App Store / Google Play

Если уровень B1–B2:
  "У тебя уже хорошая база! Phraseman поможет закрыть пробелы и выйти на C1"
  Кнопка: "Прокачать английский"

Если уровень C1–C2:
  "Впечатляющий результат! Поддерживай уровень с Phraseman — разговорная практика каждый день"
  Кнопка: "Продолжить совершенствоваться"
```

**Ссылки для кнопок:**
- iOS: `https://apps.apple.com/app/phraseman/id...` (уточнить у заказчика)
- Android: `https://play.google.com/store/apps/details?id=...`

### P2 — Анимации "вкусные"

**Сейчас:** базовые CSS keyframes (fadeInUp, scaleIn).

**Нужно:**
- Переходы между экранами — не просто замена innerHTML, а **cross-fade** или **slide**
- Варианты ответов при появлении — **stagger animation** (по одному выезжают)
- Прогресс-бар — **elastic animation** при заполнении
- Результат — **count-up animation** для цифр (index, confidence, correct)
- Кнопки — **magnetic hover** (подтягиваются к курсору, можно на CSS или чуть JS)
- Сертификат — **3D flip** или **scale reveal** при открытии

**Инструмент:** Web Animations API (`element.animate()`) + CSS transitions. Не подключать библиотеки типа GSAP — лишний вес.

### P3 — Дизайн = основной сайт Phraseman

**Проблема:** сейчас тест выглядит как отдельный проект, а не как часть phraseman.app.

**Нужно:**
- Добавить **логотип Phraseman** сверху (SVG, можно взять с основного сайта)
- Footer с ссылками: "О приложении", "Privacy Policy", "support@knowlyapps.com"
- Шрифты: использовать те же, что на phraseman.app (если известны)
- Цвета: строго из палитры Phraseman:
  - Фон: `#0c0c0e`
  - Карточки: `#141416`
  - Акцент: `#2a9d5c`
  - Акцент светлый: `#4ade80`
  - Текст: `#e6e6e6`
  - Вторичный текст: `#999`
  - Бордер: `#222`

## 5. Технические ограничения

- **Нет React/Vue/Angular.** Чистый JS.
- **Нет бандлера.** Файлы подключаются напрямую в index.html.
- **Firebase Hosting.** Путь: `knowly-www/english-level-test/`. Деплой: `firebase deploy --only hosting:knowlywww`
- **Cloud Functions** для аналитики уже есть (`englishTestApi`), трогать не нужно.
- **Admin V2** — раздел аналитики уже встроен (`#english-test` в admin router).

## 6. Готовые компоненты (не ломать)

- `engine.js` — движок теста. Интерфейс: `new EnglishTestEngine.Engine(questions, seed)`.
  - `.pickNextQuestion()` → question object
  - `.recordAnswer(q, idx, skipped, time)`
  - `.shouldFinish()` → boolean
  - `.computeResult()` → `{ estimatedLevel, borderline, index, confidence, correct, answered }`
- `certificate.js` — `EnglishTestCertificate.show({ name, result })`.
  - 5 тем в `EnglishTestCertificate.themes`
  - PNG export: `downloadPng()`, печать: `printCert()`

## 7. Acceptance Criteria

- [ ] Landing page содержит: hero, 3 шага, preview сертификата, trust badges, CTA
- [ ] После результата — CTA экран с продающим текстом (разный по уровню) + кнопки App Store / Play Market
- [ ] Все переходы между экранами анимированы (fade/slide, не резкая смена)
- [ ] Варианты ответов появляются stagger'ом
- [ ] Цифры на результате — count-up анимация
- [ ] Дизайн соответствует тёмной теме Phraseman (цвета, скругления, тени)
- [ ] Нет горизонтального скролла, нет обрезки контента
- [ ] Мобильная адаптивность (320px–1920px)

## 8. Команды

```bash
# Деплой теста
firebase deploy --only hosting:knowlywww

# Деплой админки (если менял)
firebase deploy --only hosting:admin

# Проверить локально
# Открыть knowly-www/english-level-test/index.html через Live Server
```

---

**Контекст для модели:** Заказчик — владелец приложения Phraseman. Он хочет, чтобы тест был **продающим лендингом**, а не просто тестом. Пользователи приходят из TikTok-рекламы, у них короткая attention span. Нужно схватить внимание за 3 секунды и довести до установки приложения.

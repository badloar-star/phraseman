# Phraseman: продуктовый, рыночный и игровой аудит

Дата: 2026-06-12  
Фокус: приложение Phraseman, игровые разделы, Arena, Personal Plan, AI-dialog, speaking, удержание и монетизация.

## 1. Короткий вывод

Phraseman уже имеет сильную основу: уроки, тренажеры, персональные планы, Arena/PvP, карточки, осколки, энергия, лиги, подарки, premium, AI-диалоги, companion-память, on-device speech recognition и OpenAI-прокси через Firebase Functions. Главная проблема сейчас не в отсутствии возможностей, а в том, что они выглядят как несколько отдельных продуктов внутри одного приложения.

Лучшее направление развития: собрать все вокруг одного понятного цикла:

1. Пользователь учит фразы.
2. Приложение видит ошибки и слабые места.
3. Theo/AI превращает слабые места в живую практику.
4. Arena и мини-игры проверяют скорость и автоматизм.
5. Награды открывают статус, коллекции и новые сценарии.

Главная рыночная ставка: не конкурировать с Duolingo количеством уроков, а занять нишу "говорить живыми фразами без страха": короткие реальные сценарии, мягкий AI-собеседник, персональная память, voice-петля, честная проверка прогресса.

## 2. Что происходит на рынке

### Куда двигается категория

Рынок онлайн-изучения языков растет быстро: Mordor Intelligence оценивает его в USD 24.39B в 2026 и USD 50.82B к 2031, CAGR 15.83%. Mobile apps занимают крупнейший технологический сегмент, а AI-персонализация и immersive tools названы ключевыми факторами роста.

Duolingo в Q1 2026 показал 56.5M DAU, 12.5M paid subscribers и USD 292.0M revenue. В письме акционерам компания прямо говорит, что speaking practice стал core-частью опыта, а фокус 2026 - лучшее обучение, intermediate/advanced levels и mastery перед прогрессом.

Конкуренты ушли в "говорение":

- Babbel Speak: AI voice-led practice, реальные сценарии, безопасная среда, scaffolded learning.
- Busuu Conversations: adaptive conversations, встроенный партнер, персональный feedback после беседы.
- Speak: позиционируется как AI language tutor, главный promise - говорить вслух и получать instant feedback.
- ELSA: сильная специализация на pronunciation, workplace/interview/presentation coaches, персональный feedback.
- Memrise: вернул Mems в мае 2026, то есть делает ставку на visual memory hooks и запоминание через образы.
- Mondly by Pearson: AI-powered conversations, role plays, speech recognition, 500+ minutes speaking practice.

### Вывод для Phraseman

Рынок уже считает AI-разговор и speaking не "вау-фичей", а новой нормой. Но у больших игроков есть слабое место: они часто универсальны и холодны. Phraseman может выиграть через более личный, игровой и "свой" опыт: Theo знает мои ошибки, дает короткую живую сцену, возвращает мои слабые фразы в Arena/тренажер и показывает, что я реально начинаю говорить.

## 3. Аудит текущего приложения

### Сильные стороны

- Большая игровая экономика уже есть: XP, энергия, осколки, подарки, ауры, темы, лиги, достижения, коллекции.
- Personal Plan уже имеет runtime-слой, canonical week, режимы phrase build / missing word / recall / pronunciation scoring.
- Arena уже имеет ранги, matchmaking, private rooms, scoring, speed/streak bonuses и реакции.
- AI-dialog уже не идея на бумаге: есть `ai_dialog_home`, `ai_dialog_session`, `ai_companion_session`, `ai_companion_memory`, `premiumDialogSend`, лимиты и billing.
- Голосовой прототип `spike_voice.tsx` уже проверяет цикл: hold-to-talk -> on-device ASR -> premium dialog -> TTS.
- Есть богатые QA/аудит-скрипты и контентные гейты.

### Главные риски

1. Раздробленность.
   Фич много, но пользователю нужен один ясный ежедневный маршрут: "что мне сделать сейчас, зачем и что это прокачает".

2. AI пока выглядит как отдельный раздел.
   Theo должен быть не отдельной игрушкой, а нервной системой приложения: объясняет ошибки, запускает сценарии, возвращает слабые слова, готовит к Arena.

3. Arena пока больше quiz PvP, чем "я реально быстрее говорю".
   Скоринг сильный, но вопросы и режимы можно развить в speech/phrase fluency, rematch, сезонные события и командные цели.

4. Existing audits уже нашли базовые долги.
   В приоритете остаются a11y в Pressable/TapScale/Switch, error states, i18n, hardcoded colors, контентные дубликаты и качество Arena-вопросов.

5. Контентная надежность важнее новых паков.
   В Arena-аудите были дубликаты, wrong answer mismatch и педагогические ошибки. Для соревновательного режима это критично: игрок простит сложный вопрос, но не простит неправильный правильный ответ.

## 4. Лучшие направления улучшения

### A. Собрать "Ежедневную миссию" вместо набора карточек

Каждый день должен быть один компактный маршрут:

1. Разогрев: 3 старые фразы.
2. Новая сцена: 5-7 фраз.
3. Голос: произнести 2 фразы.
4. Ошибка дня: один персональный weak spot.
5. Финал: мини-duel или blitz.

Это связывает Home, Personal Plan, Trainer, Voice и Arena в один цикл. Пользователь не выбирает из десяти входов, а идет по понятному "сегодняшнему раунду".

### B. Theo как персональный игровой тренер

Не просто чат. Theo должен:

- видеть weak words из SRS;
- после ошибки давать 1 короткую фразу для исправления;
- предлагать "сыграть сцену" с этой фразой;
- после AI-диалога возвращать 1-3 фразы в карточки/тренажер;
- перед Arena предлагать "подготовить тебя за 60 секунд".

Ключевой принцип UX: AI не должен выглядеть как бесконечный пустой чат. Он должен закрывать конкретные задачи: подготовиться, исправить, потренировать, проверить.

### C. Arena 2.0: от квиза к языковому спорту

Идеи:

- Blitz Arena: 10 фраз, 3-5 секунд на ответ, личный рекорд скорости.
- Voice Duel: оба игрока произносят одну фразу; сравнение по transcript score, без фонетической претензии уровня ELSA.
- Weak Spot Duel: матч подбирается по общей теме ошибок, например articles/prepositions/phrasal verbs.
- Comeback Round: проигрывающий получает шанс на 2x очки в последнем вопросе, если ответит быстро и правильно.
- Rematch story: после матча показать "ты проиграл на prepositions, хочешь 90-секундный revenge drill?"
- Arena Seasons: не только ранг, но и сезонная цель: "100 правильных фраз в поездках", "Coffee Week", "Airport Sprint".

### D. AI-сценарии как premium-killer

Уже есть сценарии coffee, grocery, clothes, pharmacy, restaurant, travel, social. Их можно усилить:

- Scenario scorecard: цель достигнута / фразы использованы / грамматика / смелость ответа.
- "Try again, but shorter": Theo просит повторить ответ проще и естественнее.
- "Steal this phrase": после ответа Theo выделяет одну фразу и добавляет ее в карточки.
- Scenario ladder: Coffee A1 -> Restaurant A2 -> Hotel A2 -> Doctor B1.
- Voice-first scenario: текст остается fallback, но главный CTA - держи кнопку и говори.

### E. Контент как преимущество

Phraseman может отличаться не объемом, а качеством фраз:

- меньше абстрактных quiz questions;
- больше бытовых сцен, фраз-чанков и коротких ответов;
- каждая новая фраза имеет "где я это скажу";
- ошибки не исчезают, а возвращаются в тренажер, Theo и Arena.

## 5. Креативные идеи

### 1. "Фразовый паспорт"

Профиль показывает не просто XP, а реальные can-do умения:

- могу заказать кофе;
- могу объяснить проблему в аптеке;
- могу поддержать small talk;
- могу спросить дорогу;
- могу пройти check-in.

Каждый can-do открывается после мини-сцены + voice-проверки + короткой Arena/Blitz-проверки.

### 2. "60 секунд перед жизнью"

Быстрый режим под ситуацию:

- "через 10 минут звонок";
- "я в аэропорту";
- "мне надо заказать еду";
- "я забыл фразу".

Приложение дает 5 фраз, одну voice-проверку и мини-диалог с Theo.

### 3. "Ошибки превращаются в задания"

После 3 ошибок одного типа приложение не пишет скучно "у вас проблема с articles". Оно открывает маленький personalized challenge:

- 6 вопросов;
- 2 фразы вслух;
- 1 AI-сцена;
- награда за закрытие weak spot.

### 4. "Живая коллекция фраз"

Коллекции/карточки можно сделать не просто наборами, а трофеями сценариев:

- Coffee phrases;
- Travel rescue;
- Work call survival;
- Small talk starter pack.

Карточка считается "живой", если пользователь не только увидел ее, но и произнес/использовал в Theo.

### 5. "Replay после диалога"

После AI-сцены показать:

- 1 фраза, которую пользователь сказал хорошо;
- 1 фраза, которую Theo улучшил;
- 1 фраза на завтра;
- кнопка "в Arena с этой темой".

### 6. "Personal Plan как сериал"

Не "день 1, день 2", а недельные story packs:

- Gavan: базовая уверенность;
- Airport: выжить в поездке;
- Coffee City: everyday speaking;
- Work Call: работа и созвоны.

Серийность дает мотивацию вернуться, а не просто закрыть список упражнений.

### 7. "Командные лиги"

Лиги можно усилить кооперацией:

- группа закрывает общую цель "1000 spoken phrases this week";
- буст включается, когда 3 участника сделали дневную миссию;
- weekly recap показывает вклад каждого.

Это хорошо монетизируется через клубные бусты, но не ломает одиночный режим.

## 6. Приоритетный план

### P0: 1-2 недели

- Закрыть критические UX-долги из существующих аудитов: a11y wrappers, loading/error states, самые опасные i18n и контентные ошибки Arena.
- Явно оформить AI-dialog как beta/premium feature: понятный entry point, лимит, fallback errors, tracking funnel.
- Добавить после AI-диалога простой scorecard: used phrases, useful phrase, next practice.
- Свести Home к одному главному daily CTA: "Сегодняшняя миссия", а остальные входы оставить как вторичные.

### P1: 3-6 недель

- Voice-first AI scenario: использовать уже проверенную связку ASR -> premiumDialogSend -> TTS.
- Добавить "weak words into Theo": сейчас memory уже берет weakWords; нужно сделать это видимым в UX.
- Blitz Arena MVP: speed round без новых серверных сложностей, на существующих вопросах/фразах.
- Content QA gate для Arena: no duplicate question, correct in options, no two correct answers, no pseudo-words.

### P2: 2-3 месяца

- Arena Seasons + can-do passport.
- Voice Duel MVP на transcript score.
- Scenario ladder и story packs.
- AI-generated but gated micro-drills: генерация только через dry-run, human/automated QA, затем публикация.

### P3: большие ставки

- On-device TTS quality upgrade, если Kokoro/executorch станет стабильным в приложении.
- Adaptive curriculum: Theo выбирает завтрашние задания из реальных ошибок.
- Community scenario packs: пользователи/команда создают наборы сцен, но публикация идет через строгий content gate.

## 7. Метрики

Основные:

- D1/D7/D30 retention.
- Daily mission completion.
- First voice attempt rate.
- AI first message -> second message conversion.
- AI dialog completion.
- Arena first match, rematch rate, rage quit/abandon rate.
- Weak spot resolved rate.
- Premium conversion after AI-dialog limit.

Качество:

- Wrong answer reports per 1000 Arena questions.
- Speech recognition fail rate.
- AI provider fail rate.
- Average AI roundtrip latency.
- % tasks with clear error state.
- % interactive controls with accessibilityRole/Label/State.

## 8. Самый сильный следующий шаг

Сделать не новую большую фичу, а вертикальный "говорящий" slice:

1. Home показывает "Сегодня: заказать кофе".
2. Пользователь проходит 3 фразы.
3. Произносит одну фразу.
4. Играет короткую сцену с Theo.
5. Получает scorecard и одну фразу в карточки.
6. Может нажать "Blitz" или "Arena по этой теме".

Это объединит рынок, AI, игру и текущий код в один опыт, который легко показать, протестировать и монетизировать.

## Источники рынка

- Duolingo Investor Relations, Q1 2026 results: https://investors.duolingo.com/investor-relations
- Duolingo Q1 FY2026 shareholder letter: https://investors.duolingo.com/static-files/aab30d54-eb91-422e-b365-c03859fea85c
- Mordor Intelligence, Online Language Learning Market 2026-2031: https://www.mordorintelligence.com/industry-reports/online-language-learning-market
- Babbel Speak launch: https://www.babbel.com/press/en-us/releases/babbel-speak
- Busuu Conversations: https://www.busuu.com/en/languages/language-learning-with-busuu-conversations
- Speak official site: https://www.speak.com/
- ELSA Speak official site: https://elsaspeak.com/en
- Memrise May 2026 Mems update: https://www.memrise.com/blog/changes-to-the-memrise-app
- Mondly by Pearson: https://www.pearson.com/languages/educators/mondly-by-pearson.html


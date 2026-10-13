# Длинные строки 9 языков в зонах Тем (2026-10-13)

Поручение координатора: проверка длинных строк в зонах Тем (кампании, «Мои ошибки», монеты, онбординг — только тексты). Статический анализ: в файлах зон найдены переводы в двух видах — объект `{ ru, uk, en, es, 'pt-BR', vi, id, tr, pl }` и вызов с 9 строками подряд в порядке `ru, uk, en, es, pt-BR, vi, id, tr, pl`; длина каждого перевода сравнена с `max(ru, en)`. **Кандидат** — самый длинный из 7 остальных переводов ≥ 22 знаков и ≥ 1,35 × `max(ru, en)`. Реальную ширину контейнера анализ не видит: подтверждает только кадр на языке (lang_pass Сверки, `DEV_LINKS_LANG_PASS.md`; для es/pt-BR/tr/pl/vi/id/uk нужно расширить `uiLang` у Ядра).

**Правило владельца:** `adjustsFontSizeToFit` для ужатия запрещено — длинное лечится переносом, вёрсткой или более коротким текстом, а не сжатием.

| Зона | файлов | наборов переводов | кандидатов |
|---|---|---|---|
| Кампании (промокод, код друга) | 3 | 61 | 1 |
| Мои ошибки | 11 | 6 | 0 |
| Монеты | 3 | 12 | 0 |
| Онбординг (только тексты) | 7 | 225 | 21 |

## Кампании (промокод, код друга)

| файл:строка | ru | самый длинный (язык, длина, отношение) | текст |
|---|---|---|---|
| app/referrals.tsx:422 | Награды временно недоступны | es, 50, ×1.43 | Las recompensas no están disponibles temporalmente |

## Мои ошибки

Кандидатов нет.

## Монеты

Кандидатов нет.

## Онбординг (только тексты)

| файл:строка | ru | самый длинный (язык, длина, отношение) | текст |
|---|---|---|---|
| components/onboarding/clean_onboarding_copy_language.ts:21 | Начать {lang} | tr, 22, ×1.69 | {lang} öğrenmeye başla |
| components/onboarding/clean_onboarding_copy_paywall.ts:66 | Промокоды сейчас выключены. Попробуй позже. | es, 72, ×1.67 | Los códigos promocionales están desactivados ahora. Inténtalo más tarde. |
| components/onboarding/clean_onboarding_copy_paywall.ts:54 | Закрыть ввод кода | es, 28, ×1.65 | Cerrar la entrada del código |
| components/onboarding/clean_onboarding_copy_core.ts:51 | Подробнее — в  | es, 23, ×1.64 | Más información en los  |
| components/onboarding/clean_onboarding_copy_paywall.ts:72 | Код выглядит неверно. Проверь опечатки. | uk, 64, ×1.64 | Код виглядає неправильно. Перевір, чи немає друкарських помилок. |
| components/onboarding/clean_onboarding_copy_language.ts:41 | Учиться для себя | id, 26, ×1.63 | Belajar untuk diri sendiri |
| components/onboarding/clean_onboarding_copy_core.ts:141 | Тебе есть {age}? | id, 37, ×1.61 | Apakah usiamu {age} tahun atau lebih? |
| components/onboarding/clean_onboarding_copy_core.ts:142 | Приложение доступно с {age} лет. | es, 57, ×1.58 | La aplicación está disponible a partir de los {age} años. |
| components/onboarding/clean_onboarding_copy_paywall.ts:79 | Безлимит энергии | vi, 25, ×1.56 | Năng lượng không giới hạn |
| components/onboarding/clean_onboarding_copy_paywall.ts:85 | Тренер слабых мест | es, 28, ×1.56 | Entrenador de puntos débiles |
| components/onboarding/clean_onboarding_copy_language.ts:38 | Говорить в обычной жизни | id, 37, ×1.54 | Berbicara dalam kehidupan sehari-hari |
| components/onboarding/clean_onboarding_copy_paywall.ts:16 | Открыть навсегда | es, 24, ×1.50 | Desbloquear para siempre |
| components/onboarding/clean_onboarding_copy_language.ts:18 | Зачем тебе {lang}? | es, 34, ×1.48 | ¿Para qué quieres aprender {lang}? |
| components/onboarding/clean_onboarding_copy_paywall.ts:23 | Попробуй через минуту | es, 31, ×1.48 | Inténtalo de nuevo en un minuto |
| components/onboarding/clean_onboarding_copy_paywall.ts:61 | Такого кода нет. Проверь опечатки. | pt-BR, 59, ×1.44 | Esse código não existe. Verifique se há erros de digitação. |
| components/onboarding/clean_onboarding_copy_core.ts:131 | Напомним до конца пробного | id, 54, ×1.42 | Kami akan mengingatkan sebelum masa percobaan berakhir |
| components/CleanOnboarding.tsx:485 | Вход не подтвердился. Попробуй ещё раз. | es, 55, ×1.41 | No se confirmó el inicio de sesión. Inténtalo de nuevo. |
| components/onboarding/clean_onboarding_copy_paywall.ts:75 | Приглашения сейчас выключены. Попробуй позже. | es, 63, ×1.40 | Las invitaciones están desactivadas ahora. Inténtalo más tarde. |
| components/onboarding/clean_onboarding_copy_paywall.ts:26 | Загружаем точную цену и условия магазина… | es, 57, ×1.39 | Cargando el precio exacto y las condiciones de la tienda… |
| components/onboarding/clean_onboarding_copy_core.ts:126 | Напоминание не включилось | pl, 34, ×1.36 | Przypomnienie nie zostało włączone |
| components/onboarding/clean_onboarding_copy_paywall.ts:84 | Понятно, почему так, а не иначе | tr, 50, ×1.35 | Neden böyle olduğunu ve başka türlü olmadığını gör |

## Выводы
- **Кампании** (промокод, код друга): найдено 61 набор переводов, кандидат один — `app/referrals.tsx:422` («Награды временно недоступны», es 50 знаков ×1,43): сообщение о состоянии, переносится на вторую строку, риска нет. Кнопки промокода («Активировать», «Применить код») укладываются в запас.
- **«Мои ошибки» и монеты:** в найденных наборах (6 и 12) кандидатов нет. Покрытие неполное: часть текстов этих экранов лежит в других файлах и строится иначе — дорешить кадрами `lang_pass` (экраны `mistakes`, `coins` в `DEV_LINKS_LANG_PASS.md`).
- **Онбординг (только тексты; вид заморожен владельцем 11.10):** 21 кандидат из 225 наборов, почти все — es/id/tr с отношением 1,35–1,69. Опасные места — однострочные: кнопка «Начать {lang}» (tr, 22 знака), «Открыть навсегда» (es, 24), пункты «Тренер слабых мест» (es, 28) и «Безлимит энергии» (vi, 25) на плашках преимуществ; остальное — предложения и заголовки, которые переносятся. Если на кадре языка текст не влезает — сокращать ТЕКСТ (не вёрстку и не ужимать шрифт); сейчас правок не вношу.
- Для кадров нужны ссылки `uiLang` на es/pt-BR/tr/pl/vi/id/uk — ждёт расширения параметра у Ядра.

## Дополнение: украинский и английский против русского (порог ≥ 22 знаков и ≥ 1,25×)

Языков интерфейса девять (в сторе включены 8, английский — вопрос 4 владельца), поэтому основной анализ выше — по всем девяти; здесь отдельно строки, где uk или en заметно длиннее русского (базовая вёрстка — русская).

### Кампании (промокод, код друга)

| файл:строка | ru | самый длинный (язык, длина, отношение) | текст |
|---|---|---|---|
| app/referrals.tsx:574 | Ждём покупку Plus | en, 27, ×1.59 | Waiting for a Plus purchase |
| app/referrals.tsx:512 | Код ещё готовится — проверь сеть и попробуй через пару секун | en, 89, ×1.44 | Your code is still being prepared — check your connection and try again in a few seconds. |
| app/promo_code_entry.tsx:107 | Промокоды сейчас временно выключены. | en, 47, ×1.31 | Promo codes are temporarily disabled right now. |
| app/referrals.tsx:422 | Награды временно недоступны | en, 35, ×1.30 | Rewards are temporarily unavailable |
| components/referral_code_sheet.tsx:53 | Код уже привязан к твоему аккаунту. | en, 44, ×1.26 | This code is already linked to your account. |

### Мои ошибки

| файл:строка | ru | самый длинный (язык, длина, отношение) | текст |
|---|---|---|---|
| app/mistake_practice_session.tsx:1466 | Повторим эту фразу завтра: три попытки подряд утомляют, а не | en, 93, ×1.41 | We'll come back to this phrase tomorrow: three tries in a row tire you out rather than tea |

### Монеты

Кандидатов нет.

### Онбординг (только тексты)

| файл:строка | ru | самый длинный (язык, длина, отношение) | текст |
|---|---|---|---|
| components/onboarding/clean_onboarding_copy_core.ts:79 | Какой язык учим? | en, 31, ×1.94 | Which language are we learning? |
| components/onboarding/clean_onboarding_copy_core.ts:141 | Тебе есть {age}? | uk, 27, ×1.69 | Тобі вже виповнилося {age}? |
| components/onboarding/clean_onboarding_copy_paywall.ts:61 | Такого кода нет. Проверь опечатки. | uk, 57, ×1.68 | Такого коду немає. Перевір, чи немає друкарських помилок. |
| components/onboarding/clean_onboarding_copy_paywall.ts:72 | Код выглядит неверно. Проверь опечатки. | uk, 64, ×1.64 | Код виглядає неправильно. Перевір, чи немає друкарських помилок. |
| components/onboarding/clean_onboarding_copy_core.ts:97 | Обсуждаю почти всё | en, 29, ×1.61 | I can discuss almost anything |
| components/onboarding/clean_onboarding_copy_language.ts:48 | Обсуждаю почти всё | en, 29, ×1.61 | I can discuss almost anything |
| components/onboarding/clean_onboarding_copy_core.ts:118 | Напомним, когда пора | en, 31, ×1.55 | We’ll remind you when it’s time |
| components/onboarding/clean_onboarding_copy_core.ts:123 | 5 фраз ждут — 3 минуты | en, 33, ×1.50 | 5 phrases are waiting — 3 minutes |
| components/onboarding/clean_onboarding_copy_core.ts:131 | Напомним до конца пробного | en, 38, ×1.46 | We’ll remind you before the trial ends |
| components/onboarding/clean_onboarding_copy_core.ts:102 | Тут важны не азы, а точность и темп. Держим взрослую сложнос | en, 89, ×1.41 | Here it’s not the basics that matter but accuracy and pace. We keep the difficulty adult. |
| components/onboarding/clean_onboarding_copy_core.ts:31 | Вернём твой прогресс | en, 28, ×1.40 | Let’s get your progress back |
| components/onboarding/clean_onboarding_copy_core.ts:96 | Говорю на знакомые темы | en, 32, ×1.39 | I can talk about familiar topics |
| components/onboarding/clean_onboarding_copy_language.ts:47 | Говорю на знакомые темы | en, 32, ×1.39 | I can talk about familiar topics |
| components/onboarding/clean_onboarding_copy_core.ts:93 | Я начинаю с нуля | en, 22, ×1.38 | I’m starting from zero |
| components/onboarding/clean_onboarding_copy_core.ts:105 | Так готовые фразы переходят в речь. | en, 48, ×1.37 | This is how ready-made phrases turn into speech. |
| components/onboarding/clean_onboarding_copy_core.ts:33 | Аккаунта {email} у нас нет. | en, 37, ×1.37 | We don’t have an account for {email}. |
| components/onboarding/clean_onboarding_copy_language.ts:19 | Сколько ты уже знаешь? | en, 29, ×1.32 | How much do you already know? |
| components/CleanOnboarding.tsx:205 | Аккаунт сменён. Войди ещё раз нужным способом. | en, 59, ×1.28 | Account switched. Sign in again with the method you prefer. |
| components/onboarding/clean_onboarding_copy_language.ts:18 | Зачем тебе {lang}? | en, 23, ×1.28 | Why do you need {lang}? |
| components/onboarding/clean_onboarding_copy_paywall.ts:71 | Этот аккаунт уже привязан к другу. | en, 43, ×1.26 | This account is already linked to a friend. |
| components/CleanOnboarding.tsx:3090 | Подожди — идёт вход | en, 24, ×1.26 | Hold on — signing you in |
| components/onboarding/clean_onboarding_copy_language.ts:55 | План под тебя готов. Пара минут в день — и первые фразы зазв | en, 106, ×1.26 | Your plan is ready. A couple of minutes a day, and your first phrases will start to sound  |
| components/CleanOnboarding.tsx:442 | Этот аккаунт ещё удаляется. Попробуй войти через пару минут. | en, 75, ×1.25 | This account is still being deleted. Try signing in again in a few minutes. |
| components/CleanOnboarding.tsx:483 | Этот способ входа сейчас недоступен. | en, 45, ×1.25 | This sign-in method is unavailable right now. |
| components/onboarding/clean_onboarding_copy_language.ts:38 | Говорить в обычной жизни | uk, 30, ×1.25 | Говорити в повсякденному житті |

### Выводы (uk и en)
Языков интерфейса три (ru/uk/en); базовый размер вёрстки — русский. Кандидат — перевод ≥ 22 знаков и ≥ 1,25 × русского.
- **Кампании:** 5 кандидатов из 61. Однострочная плашка — `app/referrals.tsx:574` («Waiting for a Plus purchase», 27 знаков, ×1,59): проверить кадром `uiLang=en`. Остальное — сообщения-предложения (промокод выключен, награды недоступны, «Код уже привязан…»), они переносятся.
- **«Мои ошибки»:** 1 кандидат — `mistake_practice_session.tsx:1466` (подсказка «We'll come back to this phrase tomorrow…», 93 знака): многострочный блок, переносится. Монеты: кандидатов нет.
- **Онбординг (только тексты; вид заморожен владельцем 11.10):** 25 кандидатов из 225. Однострочные плитки выбора уровня/языка — главный риск на en: «I can discuss almost anything» (×1,61), «I can talk about familiar topics» (×1,39), «Which language are we learning?» (заголовок, ×1,94, переносится), uk «Тобі вже виповнилося {age}?» (×1,69). Остальное — заголовки и пояснения, они переносятся. Проверять кадром `uiLang=en` и переключением на uk в «Interface language»; если плитка не влезает — сокращать ТЕКСТ, шрифт не ужимать (`adjustsFontSizeToFit` запрещён владельцем).
- Покрытие: найдены наборы переводов в двух видах (объект и 9 строк подряд); часть текстов «Мои ошибок»/монет лежит в других файлах — дорешать кадрами.

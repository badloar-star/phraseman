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

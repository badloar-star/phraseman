# Task packet: теория уроков показывала РУССКИЙ английскому интерфейсу и pt-BR/vi/id/tr/pl — выбор языка свой ключ → en → es → ru

Governance-ID: TG-21523405E9BA
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10: «ДА, делай hint.tsx и lesson_theory_v2.tsx»; 🔴 для английского в R1)
Related epic/enabler: английский интерфейс в R1; I18N_FALLBACK_5LANG_R1.md (раздел «Достижимость»)

## Outcome

Уроки → меню урока → «Правила и объяснения» открывает теорию (`app/hint.tsx`, `app/lesson_theory_v2.tsx`). Язык теории выбирался только
из ru/uk/es (`es ? es : legacyRuUk(lang) === 'uk' ? uk : ru`) — английский интерфейс и pt-BR/vi/id/tr/pl видели кириллицу во всех 903
словарях теории, хотя `en` есть в 563. Теперь для языков интерфейса кроме ru/uk/es: свой ключ → en → es → ru последним; ru/uk/es —
без изменений. Журнал `[I18N-FALLBACK] screen=theory lang→выбранный` раз на экран (dev). Пункт меню не скрывается (решение владельца).
Попутно: исправить STORE_PRIVACY_FORMS_R1 §4.5 — ключи iOS фото/Face ID/движение НЕ ничьи (ITMS-90683, плагин secure-store, view-shot).

## Scope

In scope: `app/hint.tsx` (theoryContentLang/buildTheorySections), `app/lesson_theory_v2.tsx` (contentKey/adaptLesson1Theory), при
необходимости общий помощник выбора ключа теории; тест; правка §4.5 в docs/phraseman-2.0/STORE_PRIVACY_FORMS_R1.md.

Out of scope: перевод теории на 5 языков, скрытие пункта меню, правка самих theory_content_lesson*.ts.

## Architecture

Выбор поля словаря теории по языку интерфейса: функция «ключ с запасным путём». Инвариант: для ru/uk/es результат прежний.

## Security and privacy

Тексты интерфейса; данные не затрагиваются.

## Technical debt

- Contain: 340 словарей теории без en — для en/5 языков уходят в es, затем ru; кандидаты на перевод (отчёт).

## Verification

- jest (runInBand): en видит en, где есть; pt-BR видит en; ru/uk/es без изменений; словарь без en → es.
- Контракты экранов hint/lesson_theory_v2, проверка синтаксиса.

## Rollback

`git revert`; выбор языка теории возвращается к ru/uk/es.

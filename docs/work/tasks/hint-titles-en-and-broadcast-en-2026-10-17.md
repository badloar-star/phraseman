# Task packet: английские заголовки шпаргалок и английская рамка глобальной рассылки (координатор 17.10)

Governance-ID: TG-9645C6AE7121
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07 — English как язык интерфейса

## Outcome

1. Шпаргалка классического урока (`app/hint.tsx`) при английском интерфейсе показывает английский заголовок («To be — negatives and questions»), а не русский. Тело шпаргалки уже на 9 языках через `L(...)`.
2. Глобальная рассылка (`components/GlobalBroadcastModal.tsx`) при английском интерфейсе:
   - не показывает русский текст рассылки;
   - кнопка отзыва — английская по клиентскому запасному тексту.
   Что делать с самим текстом рассылки, сервер которой не хранит en, — описать координатору (решение утром).

## Scope

In scope:
- `app/hint.tsx`: поле `titleEn` у 32 шпаргалок, `en: hint.titleEn`. Чужие незакоммиченные хунки (BackGlyph) не трогаю и в коммит не беру.
- `components/GlobalBroadcastModal.tsx`: запасной английский для кнопки отзыва и правило для заголовка и текста.

Out of scope: сервер `functions/src/admin_global_broadcast.ts`, админка, данные в проде.

## Architecture

No architecture change. Новое поле в локальной таблице строк; в модалке — выбор строки.

## Security and privacy

Не применимо: только тексты, данные не собираются.

## Technical debt

- Сервер рассылки не хранит en — Accept temporarily: координатор решит утром (поле En в `admin_global_broadcast.ts` и в админке).

## Verification

- сторожа i18n;
- тесты шпаргалки и модалки рассылки через slot.sh.

## Rollback

`git revert` коммита.

## Дополнение (координатор 17.10: «шпаргалки на английском — ДА»)

In scope:
- `constants/i18n.ts`, `theoryEntryForMode`: при `THEORY_FALLBACK = 'hide'` English идёт на `'hint'` вместо `'hidden'`.
- `app/hint.tsx`: для языка без своей теории (English в режиме hide) экран показывает 9-язычную шпаргалку `HINTS`, а не испанскую теорию `LessonTheoryNew`.
- `tests/i18n_five_lang_fallback.test.ts`: ожидание для English.

pt-BR / vi / id / tr / pl остаются на `lesson_help`: там их собственные вступительные экраны урока на родном языке, это полнее шпаргалки.

Риск: в `lesson_menu` и `lesson1` у English снова появится пункт «Theory» (раньше скрыт), и подсказка урока будет на него ссылаться — так и задумано.

## Дополнение 2: ночная вычитка вечерних строк (координатор 17.10)

- `app/notifications.ts` — 13 английских пушей по-носительски. Убрана калька «confidence for life» и обещание «keep access … for good»: Plus — подписка, «навсегда» вводит в заблуждение. Плейсхолдеры не тронуты.
- `app/learning_v2_new_word_encounter_copy.ts` — карточка нового слова V2:
  - en: «Didn’t save. Try again.»;
  - pl: «fiszki» по глоссарию вместо «karty»;
  - vi: «thẻ học».
- Проверено без правок:
  - задание «Посмотреть видео» без подписи (715073062);
  - поле пар Пика (8ab7d49e0, своих подписей нет);
  - BackGlyph «Назад» (37f546656).

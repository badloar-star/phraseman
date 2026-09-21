# AI-проверка наборов сообщества + исправление и публикация

Governance-ID: TG-6078BC385FB6
Дата: 2026-09-21
Запрос владельца: «проверка не запускается. исправь проверку и сделай кнопку чтобы
с помощью ИИ исправить ошибки и опубликовать — запускаем, ИИ находит все
грамматические или смысловые ошибки и показывает что исправить, мы исправляем
и нажимаем опубликовать».

## Outcome

В карточке заявки UGC-набора (админка → Наборы сообщества → Проверка) работает
серверная AI-проверка:

1. «Запустить AI» — OpenAI читает карточки и находит грамматические,
   орфографические, смысловые ошибки и неестественные формулировки.
2. Каждая находка показывает **было → стало** с галочкой (по умолчанию
   включены ошибки, выключены «info»).
3. «Применить и опубликовать» — отмеченные правки уходят в `payload` заявки,
   затем заявка публикуется существующим `communityModerateSubmission`.

Владелец видит правки ДО публикации и снимает галочки с ненужных.

## Диагноз (почему не запускалось)

Кнопка «Запустить AI» есть в вёрстке (`admin/v2/legacy.html:56206`), клиент
зовёт callable `adminCommunityPackQaReview` (`:56237`). **Этой функции не
существует ни в одном файле `functions/src`.** Заплатка
`phase6StrictBrowserRemediation` (`:57334`) прячет кнопку и пишет «AI-проверка
скрыта до появления защищённого adminCommunityPackQaReview» — то есть
намеренно прикрывала вызов в пустоту. Пользователь видел только неактивный блок.

## Scope

### Новое
- `functions/src/admin_community_pack_qa.ts` — callable `adminCommunityPackQaReview`
  (admin-only, secret `OPENAI_API_KEY`, модель `gpt-4.1-mini`, json_object).
- `functions/src/admin_community_pack_qa.test.ts` — контракт.
- `functions/src/community_pack_qa_apply.ts` — чистая функция применения правок
  к payload (без Firestore, тестируемая).
- `functions/src/community_pack_qa_apply.test.ts`.
- Callable `adminCommunityPackApplyQaFixes` — пишет правки в `payload` заявки.

### Правится
- `functions/src/index.ts` — экспорт двух новых callable.
- `admin/v2/legacy.html`:
  - снять сокрытие кнопки в `hideUnsupported()` (`:57334`) — функция появилась;
  - рендер находок с «было → стало» и галочками;
  - кнопка «Применить и опубликовать».

### Вне scope
- Автоправка без просмотра (владелец выбрал вариант с предпросмотром).
- Правка уже опубликованных наборов (`communityAdminModeratePack`).

## Architecture

Правки НИКОГДА не применяются в браузере к боевым данным. Поток:

```
браузер: payload заявки (уже загружен) ──► adminCommunityPackQaReview
                                            (OpenAI, только чтение)
                                          ◄── findings[] с before/after
владелец снимает лишние галочки
браузер: submissionId + принятые fixes ──► adminCommunityPackApplyQaFixes
                                            (транзакция: пишет payload заявки)
браузер ──────────────────────────────► communityModerateSubmission(approve)
```

Почему два вызова, а не один: публикация уже существует и протестирована
(реестр дублей, seller inbox, editTargetPackId). Дублировать её ради «одной
кнопки» — риск разойтись с оригиналом. Кнопка одна для владельца, внутри — два
проверенных шага.

`adminCommunityPackApplyQaFixes` не доверяет клиентскому `after`: применяет
правку только если текущее значение поля совпадает с `before` (защита от гонки
и от правки поверх изменившейся заявки). Расхождение → поле пропускается,
ответ перечисляет пропущенные.

## Security and privacy

- Оба callable требуют `request.auth.token.admin === true`.
- `OPENAI_API_KEY` только на сервере, в браузер не попадает.
- В OpenAI уходит **только текст карточек и заголовки**. НЕ уходят:
  `authorStableId`, uid, submissionId, e-mail — ничего, что идентифицирует
  автора (правило CLAUDE.md «во внешние каналы не уходят ни имена, ни uid»).
- App Check: `ENFORCE_APP_CHECK_OPENAI` из `callable_options.ts` — то же, чем
  пользуется `adminTranslateMessage`. Пломба App Check не трогается.
- Privacy policy: изменений не требует. Новых данных не собираем, новых
  получателей нет — OpenAI уже обрабатывает пользовательский контент в этом
  проекте (`admin_translate`, `explain`), карточки UGC уже публичны в каталоге.

## Technical debt

- `hideUnsupported()` больше не прячет AI-кнопку; остальные её функции
  (скрытие «Управление доступом», блокировка удаления отчётов) не трогаются.
- Заметка «скрыта до появления adminCommunityPackQaReview» удаляется — она
  стала ложью после появления функции.

## Verification

- `npx jest functions/src/admin_community_pack_qa.test.ts --runInBand --watchman=false`
- `npx jest functions/src/community_pack_qa_apply.test.ts --runInBand --watchman=false`
- `npx tsc --noEmit` точечно по functions.
- Ручная: заявка «Phrasal verbs from lesson N 16» (16 карточек) — запустить AI,
  увидеть находки, снять галочку, применить, проверить payload в Firestore.

## Rollback

- `git revert` коммита. Новые файлы самостоятельны, ничего не переписывают.
- Функции новые — старые callable не менялись, откат не ломает публикацию.
- Если откатить только сервер: клиент снова получит `not-found`, и ветка
  `catch` в `runAi()` уже переводит это как «серверная функция ещё не
  развернута» (`legacy.html:56344`) — экран не ломается.

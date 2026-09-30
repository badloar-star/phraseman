# Task packet: PM-086/PM-116/PM-163/PM-191 — убрать 4 мелких элемента геймификации

Governance-ID: TG-4B0FEC6CAE8C
Status: In progress
Owner: Claude session 4d383908-ab44-41cd-bfc2-d3b41c4348a8
Related epic/enabler: PhraseMan 2.0 — E08, E10, E16, E19 (docs/phraseman-2.0/)

## Outcome

Владелец PhraseMan 2.0 убирает лишнюю геймификацию (docs/phraseman-2.0/01_BIBLE.md).
Четыре независимые точечные задачи из docs/phraseman-2.0/tasks/PM-086.md,
PM-116.md, PM-163.md, PM-191.md:

- PM-086: убрать ценники энергии (значок «−N ⚡») со ВСЕХ кнопок старта занятий.
  Сама логика расхода энергии не меняется.
- PM-116: убрать тексты/бейджи-обещания наград (руны/энергия) за просмотр видео
  в плеере. Начисление (логика) не трогаем — это отдельная задача PM-115.
- PM-163: убрать заголовок «Список друзей» и длинное пустое-состояние
  «Добавьте друзей по коду…» на вкладке «Друзья»; действие добавления друга
  остаётся доступным и заметным.
- PM-191: убрать карточку «Закреплено фраз» (CefrLine/MemoryGauge) со экрана
  статистики — непонятная метрика, не команда удалить пользовательские карточки.

Успех: элементы не видны в UI, нет осиротевших импортов/типов/переменных,
относящихся ИСКЛЮЧИТЕЛЬНО к удалённому, общие модули (loadMistakePracticeInsights,
video_watch_runes_client, energy_video_watch_credit, activityEnergyCost) не
тронуты — они используются другими экранами/задачами.

## Scope

In scope (файлы):
- PM-086: `components/EnergyCostBadge.tsx` и все JSX-вызовы `<EnergyCostBadge ...>`
  по экранам приложения (кроме файлов из чужих незакоммиченных сессий — см. ниже),
  плюс дополнительный видимый текст цены в `app/diagnostic_test.tsx`.
- PM-116: `components/youtube/YoutubeInlinePlayer.tsx`,
  `components/youtube/VideoEnergyBoostBadge.tsx` (удаление файла),
  `components/youtube/VideoRunesBadge.tsx` (удаление файла).
- PM-163: `app/(tabs)/friends.tsx` (заголовок списка и пустое состояние).
- PM-191: `app/streak_stats.tsx` (JournalMemorySnapshot/эффект/рендер CefrLine),
  `components/journal/CefrLine.tsx` (удаление файла),
  `components/journal/progress_status.ts` (удаление файла),
  `tests/phrase_progress_status.test.ts` (удаление — сторожил отменённый код).

Out of scope: сам расход/начисление энергии и рун (числа, cron, Firestore),
`app/(tabs)/home.tsx` (правит параллельная сессия — иконки спинов/колокольчик/
статистика на Главной), любые файлы, уже отмеченные `M`/`??` в `git status` от
других сессий (app/flashcards/*, app/community_packs/*, app/flashcards_video_packs.tsx,
app/flashcards_collection.tsx, app/learning-v2/lesson/[id].tsx,
app/learning-v2/session/[id].tsx, components/DeleteAccountConfirmModal.tsx,
components/modal_fx/HybridAlertShell.tsx, functions/src/video_phrases*.ts,
functions/src/index.ts, admin/v2/legacy.html) — трогать их запрещено правилом
проекта, они описываются в отчёте как «не сделано, занято другой сессией».
Редизайн/новый визуальный язык — отдельная сессия интерфейса (D31), не эта задача.

## Architecture

Текущая граница: `EnergyCostBadge` — общий презентационный компонент без
собственного состояния (читает `useEnergy`/`usePremium`/`useLang`), рендерится
JSX-тегом в ~35 экранах. `VideoEnergyBoostBadge`/`VideoRunesBadge` — два таких же
презентационных компонента, единственный потребитель — `YoutubeInlinePlayer.tsx`.
`CefrLine`/`progress_status.ts` — презентационная карточка, единственный
потребитель — `app/streak_stats.tsx` через эксклюзивный `JournalMemorySnapshot`.

Целевая граница: файлы компонентов удаляются полностью (PM-116, PM-191); их
JSX-вызовы и теперь-неиспользуемые импорты/state/effect убираются у каждого
потребителя. `EnergyCostBadge` (PM-086) используется в ~35 файлах — JSX и импорт
убираются точечно по каждому файлу, сам файл компонента удаляется, когда не
останется ни одного потребителя. Контракт цены энергии (`energy_contract.ts`,
`activityEnergyCost`) не меняется — он остаётся источником истины для логики
списания и для текста «недостаточно энергии» (`energy_activity_titles.ts`),
который явно СОХРАНЯЕТСЯ по формулировке задачи (это не ценник на кнопке).

Данные/потоки не меняются: не расход, не начисление, не Firestore reads/writes,
не Functions, не Storage. Это чисто клиентская UI-правка (React Native/Expo).
«Нет архитектурных изменений» — верно, т.к. меняется только presentation layer,
контракты (`EnergyActivityKey`, `activityEnergyCost`, `mistake_practice_insights`)
остаются нетронутыми.

## Security and privacy

Не затрагивается: нет новых полей профиля, нет новых сторонних сервисов, нет
новых permissions, нет изменения авторизации/аутентификации. Текст на экране
убирается, PII не логируется и не передаётся. Соответствует владельческому
правилу «Privacy Policy» — эта задача не расширяет сбор/хранение/передачу данных,
поэтому обновление политики не требуется.

## Technical debt

- `EnergyCostBadge.tsx`, `VideoEnergyBoostBadge.tsx`, `VideoRunesBadge.tsx`,
  `CefrLine.tsx`, `progress_status.ts` — **Pay now**: удаляются полностью в
  рамках этой задачи (не остаются как мёртвый код).
- `mistake_practice_insights.ts` (`correctedPhrases` и др. поля) — **Accept
  temporarily / не долг**: остаётся, используется другими потребителями
  (`ai_companion_memory.ts`, `max_call_mint_request.ts`); выходит за границы
  этой задачи, трогать нельзя.
- `app/energy_video_watch_credit.ts`, `app/video_watch_runes_client.ts`,
  `hooks/use_video_watch_energy_boost.ts` — **Accept temporarily**: логика
  начисления руны/энергии за просмотр остаётся живой (это PM-115, не PM-116);
  хук продолжает вызываться в `YoutubeInlinePlayer.tsx` ради `setPlaying`/
  `reportPlaybackSample`, которые нужны мосту плеера независимо от бейджей.
  Owner: следующая сессия по PM-115. Exit condition: явное решение владельца
  об удалении/сохранении начисления.
- `app/(tabs)/home.tsx` текст «энергия втрое быстрее при просмотре видео»
  (строка ~5830) — **Accept temporarily**: не тронут, т.к. файл правит другая
  параллельная сессия (главный экран). Owner: следующая свободная сессия после
  освобождения home.tsx. Exit condition: PM-116 закрывается полностью только
  после этой правки — фиксируется как остаток в отчёте.

## Verification

- Точечный grep после правок: `<EnergyCostBadge` должен остаться только в
  файлах, которые я не трогал (чужие сессии) — фиксирую список в отчёте.
- `grep -rn "VideoEnergyBoostBadge\|VideoRunesBadge" components app` — только
  исторические `docs/superpowers/*` (не код).
  `grep -rn "CefrLine\|masteredPhraseCount\|phraseProgressStatusForCount" app components tests` — 0 совпадений в коде.
- `bash .claude/semaphore/slot.sh acquire "PM-086/116/163/191 проверки"`, затем
  точечные `npm run test:one -- tests/<файл>.test.ts` для затронутых контрактных
  тестов (grep по удалённым текстам/testID/ключам), затем `npm run typecheck`
  (полный, с поднятым лимитом памяти — так уже настроен в package.json), затем
  `bash .claude/semaphore/slot.sh release`.
- Ручная проверка: нет пустых мест/невидимых кнопок на затронутых экранах —
  через чтение итогового JSX (эмулятор недоступен в этой сессии, визуальная
  проверка на устройстве — задача владельца/следующего ревью).

## Rollback

Все правки — чистое удаление UI-элементов внутри общей ветки
`feature/referral-roulette`, без миграций данных, без изменения Firestore/
Functions/Storage. Откат — `git revert` соответствующих коммитов (каждая
PM-задача коммитится отдельно поимённым списком файлов). Никаких прав
пользователей, балансов или начисленных сущностей не теряется — расход/
начисление энергии и рун не менялись, только их отображение на кнопках/бейджах.

# Широкий аудит целостности релиза — 2026-07-15

## Итог

Релиз `1.5.61 (101)` действительно собран не из актуального состояния приложения.

- Android build `7fe54749-795c-4cdd-beb5-34a6826177c0` и iOS build `4cad6d76-93b8-44d7-b455-fa6f65e51b7a` завершены.
- Оба собраны из commit `8546630053096431f406e03f71fc2ebf8a4ff503`, ветка `codex/release-app-current-20260714`.
- Эта ветка основана на старом срезе `9b5f1c0bd` и получила только четыре release/auth/customization-коммита. Она не содержит актуальное рабочее дерево мобильного приложения.
- Рабочая release-card прямо требовала публиковать «current dirty mobile workspace directly to production». Создание отдельной чистой ветки из старой базы нарушило этот контракт.
- Относительно отправленной ветки актуальное рабочее дерево отличается в 483 отслеживаемых файлах и содержит ещё 664 неотслеживаемых файла.

Вывод: `1.5.61 (101)` нельзя считать релизом всех текущих наработок. Следующий корректный store build должен быть не ниже `1.5.62 (102)` и строиться только после фиксации и проверки нового канонического интеграционного среза.

## Масштаб расхождения

### Git-состояние

- 69 локальных веток и 16 remote refs.
- 46 локальных веток обновлялись с 2026-07-01.
- 59 worktree, из них 31 с незакоммиченными изменениями.
- Основной workspace: ветка `codex/workspace-snapshot-20260712`, HEAD `96d2568fb`.
- В основном workspace: 471 изменённый/удалённый отслеживаемый файл и 594 верхнеуровневых неотслеживаемых записи по `git status`.
- Несколько `.claude/worktrees/*` показывают тот же набор 471/594 и являются копиями/зеркалами состояния, а не независимыми источниками правды.
- `codex/all-development-integration` не является готовой заменой: относительно активной ветки у неё 284 неэквивалентных patch-коммита, а собственный worktree также грязный (32 tracked + 83 untracked).

### Что не попало в `1.5.61`

Среди наиболее крупных мобильных расхождений:

- новый Today/tab runtime и маршрутизация вкладок;
- Active Recall;
- диалоги и AI companion/session;
- review и семантические объяснения;
- обновлённый onboarding;
- paywall-варианты и soft upsell;
- weekly review;
- студия аватара;
- домашний экран;
- задания дня;
- персональный план и аудио-реестр;
- trainer и отчёт сессии;
- referrals;
- league/club UI;
- flashcards и community packs;
- новые значения theme/cinema gradients;
- обновлённые подарки, модалки и визуальные assets.

Только в мобильных корнях `app/components/constants/hooks/lib/modules/assets/plugins` найдено:

- 246 файлов, где актуальное рабочее дерево отличается, а release и `all-development` совпадают;
- 110 файлов с тремя разными версиями в release, `all-development` и текущем workspace;
- только 3 файла, где текущий workspace дословно совпадает с `all-development`, но отличается от release.

Это доказывает, что ни release-ветку, ни `all-development` нельзя брать целиком как «самую новую».

## Проверка заявленных проблем

| Проблема | Фактическое состояние | Классификация |
|---|---|---|
| Ошибки входа после удаления аккаунта | В `1.5.61` присутствуют auth/account-delete исправления; 119 узких auth/security тестов проходят и на release-ветке, и в текущем workspace. Эти исправления обязательно сохранить. Но это не компенсирует старый состав остальных экранов. | Исправление есть в 1.5.61, требуется устройство/production smoke |
| «Студия образа» → «Студия», убрать предпросмотр | В текущем `app/avatar_select.tsx:122` заголовок уже `Студия`; контракт запрещает `previewLabel` и старое название. В отправленной ветке осталось `Студия образа` и отображение preview. | Исправлено в текущем workspace, потеряно при сборке |
| Сделать все аватары и ауры платными | Текущий каталог всё ещё допускает `owned`, `level`, `plus`, `reward`, `none` и только затем `shards`. То же поведение в release. | Не реализовано ни в одной готовой версии |
| Новые градиенты | Новые глобальные theme/cinema значения есть в текущих `constants/theme.ts` и `constants/cinemaThemes.ts`, но отсутствуют в release. При этом новых элементов именно в `CUSTOM_AVATAR_GRADIENTS` ни в ветках, worktree, ни в stash не найдено. | Глобальные градиенты потеряны при сборке; новые avatar-gradient позиции не были сохранены |
| Пропали Help Board уведомления | Продакшен-производитель работает: в выборке есть свежие help-board like/reply/comment notification docs. Release и current используют одинаковые серверные producer-файлы. Клиент читает `users/{canonicalUid}/notifications`, но ошибки identity/permission скрывает и возвращает пустой cache. | Не проблема merge; вероятная canonical UID/permission ошибка, замаскированная UI |
| Видео сразу показывает snapshot/no internet | Активный production override канала ведёт на RSS, который сейчас отвечает HTTP 404; встроенный fallback-канал отвечает HTTP 200, но override отключает fallback. Pinned videos отсутствуют. UI любую такую ошибку рисует cloud-offline и текст про сохранённый список. | Подтверждённая runtime/config ошибка, есть во всех ветках |
| Задания дня: первое нажатие ничего не делает | В release первый tap только раскрывает карточку, переход выполняется позднее. В current handler сразу вызывает `handleTaskNav(task)`; контракт проходит. | Исправлено в current, потеряно при сборке |
| Задания дня: высота не адаптивна | Карточка использует `minHeight: 92`, свободный текст без `numberOfLines`; контракт текста проходит. Однако визуальный runtime-тест на длинных локалях не выполнен, а жалоба пользователя остаётся воспроизводимой на release. | Не доказано исправленным; нужен device/UI тест и при необходимости layout fix |
| Лига не открывается на новом аккаунте | Найден конкретный state bug: `club_remote_refresh_at_v2` не account-scoped и не очищается `wipeLocalAccountData()`. Если у нового аккаунта нет `league_state_v3`, но остался свежий TTL предыдущего аккаунта, `club_screen` ставит `localLeagueHydrated=false`, затем делает ранний `return` и не загружает лигу. Поведение есть и в release, и в current. | Подтверждённая account-switch ошибка, ещё не исправлена |

## Help Board: полный путь данных

Проверенный путь:

1. Cloud Functions `helpBoardAddComment` / `helpBoardVote` создают документы уведомлений.
2. В production есть свежие документы типов like/reply/comment; значит producer не остановлен.
3. Клиент вызывает `ensureStableAuthLink()`, затем `getCanonicalUserId()`.
4. Чтение идёт из `users/{canonicalUid}/notifications`.
5. Firestore rules требуют, чтобы canonical user совпадал с auth identity.
6. Исключение query перехватывается без пользовательской диагностики; UI видит пустой список.

Наиболее вероятная причина — рассинхрон stable/canonical UID после auth/account transition или `permission-denied`. Для окончательного доказательства нужен один диагностический App Health event с кодом ошибки и обоими безопасно хешированными identity scopes; сейчас ошибка намеренно скрыта.

## Видео: подтверждённая причина

- Production `youtube_channel_id` содержит канал `UCIr8fwZjbDtcUlQ-IKIbndg`.
- `https://www.youtube.com/feeds/videos.xml?channel_id=UCIr8fwZjbDtcUlQ-IKIbndg` отвечает 404.
- Встроенный fallback `UCNNVZbMkh4jrW6uluaaJTwA` отвечает 200.
- При наличии override приложение не пробует fallback.
- При пустом cache и отсутствии pinned videos пользователь сразу получает ошибочный offline-визуал.

Нужно отдельно исправить конфиг канала и сделать кодовый fallback при 404/empty feed; сетевую ошибку, invalid-channel и stale snapshot показывать разными состояниями.

## Реестр веток и источников

### Канонические/обязательные

| Источник | Что делать |
|---|---|
| `codex/workspace-snapshot-20260712` + текущее dirty tree | Брать как первичный пользовательский срез после отдельного safety snapshot всех tracked/untracked файлов. |
| Auth commits `e56122f35` / `96d2568fb` и их release cherry-picks | Обязательно сохранить; тесты зелёные. |
| Текущие незакоммиченные mobile изменения | Не терять; именно здесь находятся студия, первое нажатие daily tasks, новые theme gradients и большая часть актуального UX. |

### Нужна выборочная интеграция, не merge целиком

| Ветка | Аудит |
|---|---|
| `codex/all-development-integration` | Содержит YouTube analytics, verified stats insights, premium soft-upsell и историю интеграций, но 110 критичных mobile-файлов разошлись трёхсторонне. Использовать как donor по функции/коммиту. |
| `codex/weekly-review-v2-integration-20260713` | В выбранном weekly-review хвосте 24 файла: 11 совпадают с current, 13 отличаются, отсутствующих нет. Current weekly tests проходят; требуется семантическое сравнение 13 файлов. |
| `codex/lessons-1-32-integration-result` | Merge результата меняет 22 файла; в current 10 файлов отсутствуют и 12 отличаются. Лингвистическую remediation нельзя считать интегрированной. |
| `codex/soft-upsell-premium-integration` | 66 файлов: только 4 совпадают, 48 отличаются, 14 отсутствуют в current. Нужен перенос законченных модулей с сохранением более нового paywall/analytics кода. |
| `codex/league-club-hub` | 15 файлов: 2 совпадают, 9 отличаются, 4 отсутствуют. Часть hub уже вручную перенесена, но ветка не поглощена полностью. |
| `codex/content-factory-canary-20260713` | 174 backend-файла; 139 совпадают, 26 отличаются, 9 отсутствуют. Интегрировать отдельно от mobile store release и только по `functions/src`, затем пересобрать `functions/lib`. |
| `codex/restore-admin-v2-full-shell-20260714` | 108 файлов; 62 совпадают, 32 отличаются, 14 отсутствуют. Это отдельный admin/hosting/functions релизный контур. Перед правками читать Admin UI Bible. |
| `master` | Хвост относительно active затрагивает 796 файлов из-за старой линии истории. Целиком не сливать; отдельно извлечь только подтверждённые последние исправления league chest/home и другие уникальные коммиты. |

### Уже учтённые/исторические

Branches `youtube-final-integration`, `youtube-analytics-integration-result`, `soft-upsell-premium-integration`, `social-learning-cards`, `admin2-integration`, `xp-integrity-audit`, `borderless-premium-surfaces`, auth branches и несколько старых feature branches уже входят в историю `all-development`. Это не означает, что их финальные файлы совпадают с current; их надо сверять по функции, а не повторно merge-ить.

### Исключить из автоматического merge

- `codex/release-app-current-20260714`: устаревший release-срез.
- `codex/remove-constellations`: намеренно удаляет существующую функцию в 125 файлах. Проект запрещает такое удаление без отдельного прямого запроса пользователя.
- Старые `release/*`, backup, detached build worktrees и апрель–июньские agent branches: только исторические доказательства, не источник нового release.
- Сгенерированные/грязные `functions/lib`, hosting cache, test-results и зеркальные `.claude/worktrees`: не сливать как исходный код.

## Stash-аудит

Найдено 9 stash.

- `codex-pre-instant-ui-integration-20260711` содержит исторические правки notifications/Help Board/daily tasks/video, но большая часть уже эволюционировала в current; применять целиком нельзя.
- Старые master/multilang stash содержат прежние avatar/multilang состояния.
- Новых определений `CUSTOM_AVATAR_GRADIENTS` ни в одном stash нет.
- Пять свежих stash admin-language-factory в основном относятся к generated functions diagnostics/build output и требуют отдельного backend/admin разбора.

Ни один stash не применялся и не удалялся.

## Проверки

Успешно:

- 5 продуктовых suite по studio/daily tasks/video/notification cache: 26 тестов.
- 5 auth/account-delete/security suite в current: 119 тестов.
- Те же 5 auth/account-delete/security suite на ветке `1.5.61`: 119 тестов.
- Weekly review: 3 suite, 23 теста.

Неуспешно:

- Общий `tsc --noEmit` — 26 diagnostics.
- App-level ошибки: слишком сложные union types в `app/(tabs)/_layout.tsx` и `hooks/use-global-bottom-overlay-offset.ts`.
- E2E-конфиг импортирует отсутствующий `@playwright/test`, после чего идут связанные implicit-any/type ошибки.
- Есть type ошибки в survey render/behavior tests.
- Первый запуск Jest без `--roots tests` обнаружил множество duplicate mocks/module collisions из вложенных `.worktrees`; конфиг тестов должен игнорировать worktree-каталоги.
- Jest завершает узкие прогоны с открытыми handles; причину нужно локализовать перед полным gate.

## Ошибка релизного процесса

Корневая причина не только в выборе ветки. Отсутствует обязательный доказуемый release manifest:

- какой commit/worktree является источником;
- какие dirty tracked/untracked файлы включены;
- хеш архива EAS;
- сравнение архива с ожидаемым mobile manifest;
- зелёный TypeScript/test gate;
- список исключённых backend/admin файлов;
- smoke именно установленного IPA/AAB, а не Metro dev source.

Из-за этого чистая ветка выглядела «безопасной», хотя фактически выкинула основную часть продукта.

## Безопасный порядок подготовки нового релиза

1. Сделать неизменяемый safety snapshot текущего workspace, включая все нужные untracked mobile/source/assets файлы. Не включать caches, generated build output, env и test-results.
2. Создать новую каноническую release-интеграцию из этого snapshot, а не из `1.5.61`, `master` или `all-development` целиком.
3. По таблице выше выборочно перенести уникальные weekly review, lessons 1–32, premium upsell, league hub, YouTube analytics и другие подтверждённые изменения.
4. Не смешивать mobile release с Admin V2/Content Factory deployment. Код можно согласовать, но deploy контуры и gates должны быть отдельными.
5. Исправить четыре нерешённых пользовательских дефекта до сборки: все avatars/auras paid, Help Board identity/error handling, YouTube feed fallback/config, league account-scoped refresh TTL. Отдельно воспроизвести адаптивную высоту daily cards.
6. Довести `tsc` до нуля, убрать Jest worktree collisions и открытые handles, затем выполнить focused + release gates.
7. Сформировать archive manifest и доказать, что studio, gradients, daily first tap, weekly/lessons/league/paywall assets реально попали в EAS archive.
8. Поднять version/build до `1.5.62 (102)`, запустить Android+iOS одновременно; iOS autosubmit выполнять только из проверенного build ID.

## Безопасность

- `functions/.env.phraseman-ea0b3` отслеживается Git и сейчас изменён. Секреты не должны находиться в tracked env-файле; содержимое в этот отчёт не копировалось.
- Firebase CLI во время аудита вернул plaintext environment values авторизованному разработчику. Значения не сохраняются в отчёте, но соответствующие чувствительные credentials следует ротировать и переносить в Secret Manager/защищённый runtime config.
- Перед release обязательно проверить `.easignore`, чтобы `functions/.env*`, worktrees, reports, caches и служебные артефакты не попадали в мобильный архив.
- Ожидаемый глобальный файл правил `C:/Users/badlo/.Codex/rules/common/security.md` в текущем окружении отсутствует; применялись правила безопасности из project `AGENTS.md`.

## Находки и предложения

- Добавить обязательный `release-source-manifest.json` с commit, dirty-file manifest и archive hash; gate должен падать при расхождении.
- Запретить EAS production build из веток `release-*`, если они не являются потомком утверждённого integration snapshot.
- Account-local TTL/cache keys хранить с canonical UID или очищать централизованно при account switch; текущая league ошибка показывает системный риск.
- Не маскировать `permission-denied` и invalid-remote-config как «пусто»/«нет интернета»; давать разные безопасные App Health коды.
- Сократить число живых worktree и исключить `.worktrees/**` из Jest/TypeScript discovery.
- Generated `functions/lib` пересобирать из проверенного `functions/src`, а не использовать как независимый merge-источник.

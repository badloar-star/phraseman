# Task packet: красные сторожа корневых полей users/{id} — три новых законных поля

Governance-ID: TG-E04DBC3F936A
Status: В работе (координатор 22.10: «разбери: новые законные поля или кто-то пишет мимо правил; без ослабления сторожей»).
Owner: Ядро (сессия 1).

## Outcome

`root_fields_census_guard` и `root_fields_dry_run` в functions снова зелёные, и ни один сторож не ослаблен.

## Разбор (факты)

| Поле | Кто пишет | Коммит | Вывод |
|---|---|---|---|
| `inboxRev` | сервер: `admin_app_messages.ts`, `report_replies.ts` (каждая запись в user_messages) | f3e4462fe, 22.10, вопрос 27 | законное служебное поле: ревизия почты, чтобы телефон не перечитывал входящие |
| `legacyBonusConvertedV1` | сервер: `legacy_bonus_convert.ts` | ddde39503, 15.10, D195 | законная метка разовой конвертации, не баланс |
| `flashcardPagesRev_<язык>` | телефон: `cloud_sync.ts` → `buildFlashcardPagesRevPatch` (`app/flashcard_pages_rev.ts`) | 5755b2f94, 22.10, вопрос 27 | законное поле: ревизия страниц карточек. Перепись не видит имя, потому что поле собирается функцией из другого файла |

Записи «мимо правил» нет. Корень `users/{id}` закрыт списком запретов: клиент может писать любое поле вне запретного списка, и поле карточек это поле телефона по замыслу. Серверные `inboxRev` и `legacyBonusConvertedV1` телефон технически может переписать у себя. Денежной дыры это не даёт: повтор конвертации ловит журнал монет по постоянным ключам `legacy_bonus:v1.<валюта>` (already_applied). Ревизия почты влияет только на собственную почту человека.

## Scope

- `functions/src/accounts_v2_migration/inventory.ts`:
  - `legacyBonusConvertedV1` добавить в `r.currency_counters` (info, метка не баланс);
  - `inboxRev` добавить в `r.service_metadata` (keep_in_place, OD20);
  - новое правило `r.flashcard_pages_rev` с образцом `/^flashcardPagesRev_/` (keep_in_place: ревизия кэша страниц остаётся рядом со страницами).
- `scripts/accounts_v2_root_fields_code_census.cjs`: явная таблица «сборщиков патча корня», то есть имя функции → файл → имена/префиксы полей. Перепись разворачивает их вызовы в поля. Протухание проверяется так же строго, как у подсказок: функция и каждый префикс обязаны встречаться в своём файле, иначе staleHints (красный).
- НЕ в объёме: правила Firestore (запрет записи серверных полей телефоном — отдельное решение, предложу координатору), клиентский код.

## Architecture

Сторож остаётся слепым к неизвестному. Новый вызов сборщика без записи в таблице по-прежнему даёт unresolved (красный). Новое поле без правила инвентаря по-прежнему даёт uncovered / hold unknown_field.

## Security and privacy

Новых данных нет: поля уже пишутся в проде, меняется только их классификация в плане переноса Account V2. Политика не затронута.

## Technical debt

Серверные служебные поля корня (`inboxRev`, `legacyBonusConvertedV1`, а также `coinWalletLimitsV1`, `coinReconcileV1`) не входят в `serverOwnedUserIdentityFields` правил. Это кандидат на отдельное решение.

## Verification

- `functions`: root_fields_census_guard, root_fields_dry_run, inventory.test — точечно через светофор.
- `scripts/accounts_v2_root_fields_code_census.test.mjs` — точечно.

## Rollback

Откат коммита. Прод не затронут: это сторожа и таблица плана переноса.

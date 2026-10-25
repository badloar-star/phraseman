# Task packet: ключ отписки — убрать из env content-функций и сменить

Governance-ID: TG-1CE7C1DE55C8
Status: Planned (выполнять только после «сборка ушла» координатора и кнопки владельца на выкладку)
Owner: Learning V2 session; решение владельца 25.10 «сегодня после отправки сборки»
Related epic/enabler: выкладка learningV2CourseReleasedSessionGetV4 (deploy_from_clean_head для functions:content)

## Outcome

Ни одна боевая функция не держит `EMAIL_UNSUBSCRIBE_SECRET` / `EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET` открытой переменной
окружения; подписывает новый ключ, ссылки из уже отправленных писем (подписаны текущим ключом) продолжают работать.

## Факты (25.10, только чтение; значения не печатались, файл описания сервиса удалён)

- Secret Manager: оба секрета есть с 24.08, по одной версии (v1, enabled).
- Код уже на `defineSecret` (`functions/src/email_unsubscribe.ts`). Потребители — 5 функций default, у всех `secretKeyRef`:
  `emailUnsubscribe` (проверяет), `webLeadCapture`, `webLeadNudgeCron`, `adminEmailBroadcast`,
  `adminEmailContactsBackfill` (подписывают ссылки).
- Открытым текстом (plain env) оба секрета лежат у ВСЕХ 9 content-функций:
  `adminConfirmV2OwnerEpisode`, `adminGetV2OwnerGeneratorSetupCatalog`, `adminImportV2OwnerEpisodeStage`,
  `adminPublishAuthoredLearningV2Course`, `learningV2ActivityAuxiliarySessionGetV1`,
  `learningV2ActivityReleasedSessionGetV1`, `learningV2CourseActiveCatalogGetV1`,
  `learningV2CourseReleasedSessionGetV2`, `learningV2CourseReleasedSessionGetV3`.
  Источник — локальный `functions-content/.env` (в .gitignore), выкладка content шла из рабочего дерева.
- Код content объявляет ровно один параметр — `LEARNING_V2_ROOT_OWNER_UID_SHA256` (defineString, default "", на бою пустой,
  V3/V4 его не читают). Секретов и почтовых модулей в content нет.

## Scope

In scope: `scripts/deploy_from_clean_head.sh` (для `functions:content:*` копировать ТОЛЬКО
`functions-content/.env.<project>`; `functions-content/.env` — никогда; сторож на SECRET остаётся), удаление двух строк
EMAIL_UNSUBSCRIBE_* из локального `functions-content/.env`, ротация в Secret Manager, перевыкладка 5 default + 9 content.

Out of scope: V4 (создаётся только по отдельному «да» владельца), включение владельческих инструментов (значение
LEARNING_V2_ROOT_OWNER_UID_SHA256), прочие ключи.

## Architecture

Подпись — всегда текущим ключом (`EMAIL_UNSUBSCRIBE_SECRET`), проверка — текущим, затем прошлым (`..._PREVIOUS_SECRET`).
Firebase закрепляет номер версии секрета в момент выкладки → после добавления версий потребителей обязательно перевыложить.
Выкладка content-функции перезаписывает её env содержимым dotenv → без `functions-content/.env` секреты уходят из env.

## План (по шагам, порядок важен)

0. После «сборка ушла»: коммит правки скрипта (отдельный, Ревизор), сухой прогон
   `--only functions:content:<одна функция>` → PASS.
1. Локально удалить из `functions-content/.env` строки `EMAIL_UNSUBSCRIBE_SECRET=` и `EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET=`
   (файл не в git; скрипт его и так не копирует — это вторая защита от ручной выкладки из дерева).
2. Ротация (значения не выводятся на экран, временный файл в %TEMP% удаляется):
   ```
   # 2a. текущий ключ → новая версия PREVIOUS (труба, без печати)
   gcloud secrets versions access latest --secret=EMAIL_UNSUBSCRIBE_SECRET --project phraseman-ea0b3 \
     | gcloud secrets versions add EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET --data-file=- --project phraseman-ea0b3
   # 2b. новый ключ (48 байт → 96 hex, как сейчас) → новая версия SECRET
   node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "$TMP/eu_new"
   gcloud secrets versions add EMAIL_UNSUBSCRIBE_SECRET --data-file="$TMP/eu_new" --project phraseman-ea0b3
   rm -f "$TMP/eu_new"
   ```
   Сначала 2a, потом 2b: в окне между шагами старые функции работают на закреплённых v1.
3. Перевыкладка 5 потребителей одной адресной выкладкой (emailUnsubscribe в том же пакете, чтобы проверка знала оба ключа):
   `bash scripts/deploy_from_clean_head.sh --only "functions:default:emailUnsubscribe,functions:default:webLeadCapture,functions:default:webLeadNudgeCron,functions:default:adminEmailBroadcast,functions:default:adminEmailContactsBackfill"`
   → сухой прогон PASS → то же с `--execute` по кнопке владельца.
4. Перевыкладка 9 content-функций без секретов:
   `bash scripts/deploy_from_clean_head.sh --only "functions:content:adminConfirmV2OwnerEpisode,functions:content:adminGetV2OwnerGeneratorSetupCatalog,functions:content:adminImportV2OwnerEpisodeStage,functions:content:adminPublishAuthoredLearningV2Course,functions:content:learningV2ActivityAuxiliarySessionGetV1,functions:content:learningV2ActivityReleasedSessionGetV1,functions:content:learningV2CourseActiveCatalogGetV1,functions:content:learningV2CourseReleasedSessionGetV2,functions:content:learningV2CourseReleasedSessionGetV3"`
   (+ `functions:content:learningV2CourseReleasedSessionGetV4` — только если владелец отдельно сказал «да» на V4).
5. После подтверждённых проверок шагов 3–4: выключить старые версии
   `gcloud secrets versions disable 1 --secret=EMAIL_UNSUBSCRIBE_SECRET` и `... 1 --secret=EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET`
   (значение SECRET v1 уже живёт в PREVIOUS v2). Раньше нельзя: выключенная закреплённая версия ломает холодный старт.

## Security and privacy

Значения секретов не печатаются, не попадают в журналы, коммиты и сообщения; трубы и временный файл. Старый ключ после
шага 5 перестаёт что-либо подписывать и проверять ссылки дальше одного поколения. Ссылки, подписанные ключом ДО v1
(PREVIOUS v1), перестанут работать — подписей им нет с 24.08, риск минимальный.

## Technical debt

Pay now: секреты из env content-функций; скрипт выкладки content. Contain: сторож на SECRET в скрипте остаётся;
проверка шага «бой» (ниже) — повторяемая команда.

## Verification

1. Инвентаризация env (только имена, ничего на диск):
   `gcloud run services list --project phraseman-ea0b3 --region us-central1 --format=json | node <счётчик>` →
   PLAIN = 0, SECRETREF = 5 (у каждой из 5 — новые номера версий: SECRET v2, PREVIOUS v2).
2. `check_callable_invoker` (скрипт выкладки зовёт сам) — права вызова не изменились.
3. emailUnsubscribe: GET с заведомо неверным токеном → страница «ссылка недействительна», не 500.
4. Журналы 30 мин после выкладки: нет `EMAIL_UNSUBSCRIBE_SECRET is not configured`, нет 5xx у 5 функций,
   content-функции отвечают (learningV2CourseReleasedSessionGetV3 — открытие занятия на эмуляторе).
5. (по желанию владельца) живая проверка старой ссылки: токен для служебного адреса, подписанный прошлым ключом через
   скрипт, читающий секрет трубой → POST → 200. Пишет документ подавления — адрес служебный, документ удалить.

## Rollback

Ротация (до шага 5, пока v1 включена): вернуть прежний ключ новой версией трубой
`gcloud secrets versions access 1 --secret=EMAIL_UNSUBSCRIBE_SECRET | gcloud secrets versions add EMAIL_UNSUBSCRIBE_SECRET --data-file=-`
и перевыложить 5 потребителей — закрепят новую версию с прежним значением (без расчёта на то, как «latest» ведёт себя
с выключенными версиями).
Content: перевыкладка из прошлого коммита тем же скриптом; секреты в env вернуть нельзя и не нужно.

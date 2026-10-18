# Task packet: потолки на uid и IP у дорогих функций (ИИ Диалогов, разбор, вход)

Governance-ID: TG-FD82C63BE579
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 18.10 — «защита от накрутки счёта: ответы ИИ в Диалогах, озвучка, анонимные аккаунты/ensure link — потолок на uid и IP, где нет — поставь, дёшево; всё в полную выкладку». Ревизор параллельно делает аудит всех функций.

## Outcome

Ни одна функция, которая платит OpenAI или создаёт или связывает аккаунт, не принимает бесконечный поток вызовов. Ферма анонимных аккаунтов с одного адреса упирается в потолок на IP, скрипт одного аккаунта — в потолок на uid.

Аудит чтением (18.10):

| Функция | uid | IP |
|---|---|---|
| dialogueV2TextTurn | 60/ч (premium_dialog) + месячная квота | нет |
| dialogueV2FreeformSessionTurn | НЕТ | нет |
| dialogueV2FreeformSessionStart | НЕТ | нет |
| dialogueV2SessionComplete (разбор OpenAI) | НЕТ | нет |
| dialogueV2SessionStart | 60/ч | нет |
| premiumDialogSend/Translate/Review | 60/ч | нет |
| mistakeHubAdvice | дневной потолок | нет |
| mistakeExplain | 40/окно | нет |
| authEnsureStableLink | НЕТ | нет |

Озвучка TTS для пользователя вызовом не доступна: card_tts_worker — воркер и admin, клиентских вызовов нет.

## Scope

В работе:
- новый functions/src/caller_rate_window.ts — окно на uid и на IP одной транзакцией, документы по sha256 в закрытой коллекции `callable_rate_windows`;
- вызов в перечисленных функциях;
- правило firestore.rules для коллекции;
- тест;
- контракт Джарвиса, если коллекцию кто-то читает (нет).

Вне работы:
- App Check (пломба);
- изменение существующих квот.

## Architecture

`enforceCallerRateWindow({ scope, authUid, rawRequest, maxPerUid, maxPerIp, windowMs })`:
- IP берётся из первого адреса x-forwarded-for, иначе rawRequest.ip, как у восстановления (40ad95e86);
- IP не определён — проверяется только uid;
- превышение — `HttpsError('resource-exhausted', '<scope>_rate_limited')` и лог `[ABUSE-LIMIT]`;
- сбой Firestore — пропуск с логом (fail-open): лимит не должен ронять честный вызов, а без Firestore функция и так не работает.

Потолки щедрые к честным людям за общим NAT, например в школе:
- ход Диалога: IP 600/ч;
- ход свободного разговора: uid 120/ч и IP 600/ч;
- старт свободного разговора: uid 60/ч и IP 300/ч;
- разбор итога: uid 60/ч и IP 300/ч;
- старт сессии: IP 300/ч;
- premiumDialog*: IP 600/ч;
- mistakeHubAdvice и mistakeExplain: IP 300/ч;
- authEnsureStableLink: uid 120/ч и IP 240/ч.

## Security and privacy

IP не хранится: в документе только sha256 от `scope:ip`, uid — тоже хеш, плюс счётчик и начало окна. Документы старше окна перезаписываются, TTL-поле `expiresAt`. Коллекция закрыта правилами для клиента. Политика конфиденциальности: IP и так обрабатывается сервером для защиты от злоупотреблений, раздел «Безопасность» это покрывает — проверить текст при ревью.

## Technical debt

Contain: потолки — константы в коде. Пересмотр по логам `[ABUSE-LIMIT]` через неделю после выкладки, владелец — Ядро.

## Verification

- Тест помощника на фейковом Firestore: счёт, окно, IP-хеш, fail-open.
- Тесты затронутых функций.
- Выкладка — вместе с полной выкладкой, по слову владельца.

## Rollback

Ревертнуть коммит и выложить функции заново.

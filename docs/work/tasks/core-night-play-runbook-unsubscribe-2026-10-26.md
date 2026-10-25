# Ядро · ночь 26.10: runbook «в Play 142» и кнопка ротации ключа отписки

Governance-ID: TG-8DCB1356A853
Status: In progress
Owner: 1 · ЯДРО (координатор, NIGHT_BACKLOG v2 77edb3d7e, два 🔴)

## Outcome
1. RELEASE_25_10_RUNBOOK.md больше не пишет «в Play 142». Факт: 142 (автоотправка 21.10) ERRORED, 2.0.2/144 не
   загружен — 403 PERMISSION_DENIED у ключа отправки. В утреннем списке владельца — «дать права сервисному ключу в Play
   Console». Сам в Play Console ничего не трогаю.
2. Ротация EMAIL_UNSUBSCRIBE_*:
   - код уже на `defineSecret`;
   - скрипт выкладки уже не берёт `functions-content/.env` (b0b425334);
   - добавляю сторож на это правило;
   - в server-deploy-pack-2026-10-26.md — отдельная кнопка владельца с порядком шагов.

   Создание версий секрета, выкладка и любые записи в прод — только по утреннему «да» владельца.

## Scope
In scope:
- docs/work/release/RELEASE_25_10_RUNBOOK.md (2 строки);
- docs/work/release/server-deploy-pack-2026-10-26.md (раздел кнопки);
- утренний список: та же страница, раздел «до кнопок»;
- tests/deploy_content_env_secret_contract.test.mjs.

Out of scope:
- Play Console;
- Secret Manager;
- выкладка;
- локальный functions-content/.env (шаг 1 утреннего порядка);
- admin_staff_contract* (чужая незакоммиченная работа, координатор ставит владельцу).

## Architecture
Изменений архитектуры нет: правило «секреты — только Secret Manager, content-выкладка берёт только `.env.<проект>`» уже
в коде, сторож его закрепляет.

## Security and privacy
Значения секретов не читаются и не печатаются. Команды ротации в странице идут трубой, без вывода значения.

## Technical debt
Accept temporarily — номер версии, которая сейчас в Play, неизвестен. Владелец, срок — утро 26.10, смотрит его в Play
Console вместе с выдачей прав ключу. Влияния на сборку нет: 144 больше любой версии в Play. Новый долг не создаётся.

## Verification
`node --test tests/deploy_content_env_secret_contract.test.mjs`; email_unsubscribe.test.ts уже покрывает defineSecret и
ротацию.

## Rollback
Откат коммита.

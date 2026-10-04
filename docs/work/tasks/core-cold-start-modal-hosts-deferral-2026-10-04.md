# Task packet: холодный старт — ленивые модальные хосты и вынос работы до готовности (пункты 1–2)

Governance-ID: TG-5B7549060534
Status: In progress (шаг 1 — логи; правка после цифр)
Owner: сессия 1 · ЯДРО (координатор 04.10: пункты 1 и 2 разрешены, «сначала логи, потом правка»; пункт 3 — нет)

## Outcome

Шаг 1: [COLD-START] показывает, сколько от старта процесса занимает исполнение статических импортов
_layout.tsx и сколько идут фоновые работы, запущенные ДО setReady (иконочные шрифты, картинки вкладок,
посев озвучки Learning V2, миграция доставки контента). Шаг 2 (по цифрам): модальные хосты
(UpdateModal, ReleaseNotes*, GlobalBroadcast, PersonalAdminMessage, AppMessageAnnouncement,
NotificationPermission, RegistrationPrompt) грузятся лениво; посев озвучки и миграция — через
runAfterHomeFirstFrame. Картинки вкладок — только если цифры покажут, что они не нужны первому кадру.

## Scope

app/_layout.tsx. Вне: премонтирование вкладок (пункт 3), сами модалки (вёрстка — сессия 2).

## Architecture

Временная трасса через coldStartMark/coldStartStep (app/cold_start_trace.ts), одна строка на шаг.

## Security and privacy

Логи — только имена шагов и миллисекунды.

## Technical debt

Трассу убрать после выноса; логи ошибок оставить.

## Verification

Сверка снимает [COLD-START] и [COLD-START-IO] на эмуляторе до и после правки.

## Rollback

git revert.

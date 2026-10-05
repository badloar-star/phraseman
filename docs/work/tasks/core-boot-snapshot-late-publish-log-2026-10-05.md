# Task packet: HOME-COLD — снимок публикуется позже первого кадра на тёплом запуске (сперва лог)

Governance-ID: TG-37C7BEA04DE1
Status: In progress (координатор 05.10, пакет 09:26 прогон 2: [BOOT-SNAPSHOT] published ms=8246 при preReadMs=334 →
first_frame lessonCard=empty; video:cache_read 3303/8682 мс, video:import_done 2547/4847 мс)
Owner: сессия 1 · ЯДРО

## Outcome

Между preRead и published ~7,9 с уходит внутри одной параллельной пачки: AsyncStorage.multiGet,
hydrateUserSettingsFromStorage и ленивый import('./level_spin_star_grants') + peek рун. Гипотеза: в dev-сборке
ленивый import грузит чанк с Metro (так же video:import_done 2,5–4,8 с), и публикация снимка ждёт самую медленную
часть. Сперва лог: время каждой части пачки и момент её завершения.

## Scope

app/app_snapshot_bootstrap.ts — [BOOT-SNAPSHOT] parts {multiGetMs, settingsMs, runesImportMs, runesPeekMs}.
Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Только миллисекунды.

## Technical debt

Починка по логу: вероятно, публиковать снимок без ожидания рун (руны досыпать отдельным патчем) и/или читать кэш ленты
без ленивого импорта.

## Verification

Синтаксис; пакет замера.

## Rollback

git revert коммита.

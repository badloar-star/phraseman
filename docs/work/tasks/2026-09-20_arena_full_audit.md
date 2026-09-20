# Task packet: полный аудит всех правок Арены за 2026-09-20 и починка цепочки target_mismatch

Governance-ID: TG-E50385B8E660
Status: In progress
Owner: сессия Claude Opus 5 (2026-09-20)

## Outcome

Арена работает: кнопки нажимаются, «Играть» открывает режимы, надпись
«Арена ещё не включена на сервере» с кодом `arena_response_target_mismatch`
исчезает. Владелец: «нельзя ничего начать… это ты сломал».

## Scope

In scope: все файлы, изменённые мной сегодня (коммиты b3fe5ef75, ead0e5100,
1ab072e71) — цепочка разрешения языка обучения, оверлеи, экран поиска.

Out of scope: сервер, конфиг Firestore, чужие правки других сессий.

## Architecture

**КОРЕНЬ ВСЕЙ ЦЕПОЧКИ.** `arenaRouteStudyTarget(route, current)` возвращает
`null`, когда язык из маршрута НЕ совпадает с текущим языком обучения — это
защита от утечки контента между языковыми контурами.

Все соседние экраны Арены при `null` уходят на хаб:
```
const studyTarget = arenaRouteStudyTarget(params.studyTarget, currentStudyTarget);
useEffect(() => { if (!studyTarget) router.replace('/arena'); }, [...]);
```

Я в переписанном экране поиска написал `?? currentStudyTarget` — то есть
ОБОШЁЛ защиту и полез на сервер с языком, который сервер не подтверждал.
Ответ приходил с другим `studyTarget`, клиентская проверка
`requireArenaTargetIdentity` бросала `arena_response_target_mismatch`, и эта
ошибка растекалась по всей Арене: хаб показывал «не включена на сервере»,
режимы в листе «Играть» получали ту же подпись вместо своих описаний.

**Целевое состояние.** Экран поиска ведёт себя как соседи: `null` → уход на
хаб, без подстановки. Защита контуров восстановлена.

**Инвариант.** Ни один экран Арены не подставляет текущий язык вместо
результата `arenaRouteStudyTarget`. `null` означает «уходи», а не «возьми
какой есть».

## Полный список моих правок за день и их статус

1. `modules/arena/background_search.ts` — ядро фонового поиска. ЧИСТО,
   18 тестов, сети не касается напрямую.
2. `app/arena_background_search.ts` — адаптер. ЧИСТО.
3. `components/arena/ArenaOpponentFoundToast.tsx` — тост. БЫЛ ДЕФЕКТ:
   перехватывал касания (нет pointerEvents). Исправлено в 1ab072e71.
4. `components/arena/ArenaOpponentFoundHost.tsx` — хост. ЧИСТО.
5. `components/arena/ArenaSearchIndicator.tsx` — индикатор. ЧИСТО.
6. `components/overlay_arbiter_core.ts` — +1 ключ. ЧИСТО.
7. `modules/arena/copy.ts` — +4 ключа × 9 локалей. ЧИСТО.
8. `app/_layout.tsx` — монтаж хоста. ЧИСТО.
9. `components/arena/ArenaHubSurface.tsx` — трассировка. ЧИСТО.
10. `app/arena_matchmaking.tsx` — ТРИ ДЕФЕКТА:
    - лишний гейт `targetGate` (исправлено ead0e5100);
    - отказ воскрешал поиск (исправлено аудитом);
    - **`?? currentStudyTarget`** — ЭТОТ ПАКЕТ.

## Security and privacy

Правка ВОССТАНАВЛИВАЕТ защиту: обход `arenaRouteStudyTarget` позволял
запрашивать контур чужого языка. Новых данных не собирается.

## Technical debt

- **Pay now.** Обход защиты убирается, поведение выравнивается с соседями.
- **Contain.** Сторож `arena_matchmaking_no_duplicate_gate.test.ts`
  расширяется: запрещает `?? currentStudyTarget` на этом экране.

## Verification

1. Сторож запрещает подстановку языка.
2. Типы затронутых файлов.
3. Все сторожа Арены зелёные.
4. Владелец: Арена открывается, «Играть» показывает режимы.

## Rollback

Возврат `?? currentStudyTarget` вернёт поломку — смысла нет.

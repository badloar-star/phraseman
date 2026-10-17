# Task packet: после свапа входа не звать authEnsureStableLink повторно — подтверждение сервера переносится в новое поколение

Governance-ID: TG-F21AA3BB81F1
Status: В работе (координатор 17.10 ~18:50: «фикс самого длинного шага входа; authEnsureStableLink — главная статья CPU
функций, 113 тыс. с/нед»)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

После входа Google фоновое восстановление (swap_restore) не делает второй вызов authEnsureStableLink для той же пары
stableUid:authUid, которую сервер подтвердил миллисекунды назад. Минус 4,3 с фона после входа и минус 1 callable
на каждый вход (💸 CPU функций).

## Факты (лог Сверки r15_2_1015/signin/all.txt, вход №2)

- 14.00 → 17.76: ensure_link remote (callable, 3,75 с) — ok, stableUid de10a251;
- 17.76: `swap stage authoritative_link_reused source=callable ageMs=4` — свап использует свежее подтверждение;
- 18.4: wipe → setStableId → generation 5. Wipe стирает `stable_auth_link_cache_v1` (cloud_sync.ts:950 — ключ в списке
  стирания аккаунта), а память `authoritativeLinkMemo` привязана к поколению (было до свапа);
- 18.6 → ~23.0: три `[BOOT-RESTORE-STEP]` stable_link 4384/4384/4309 мс — один общий сетевой вызов (дедуп по ключу),
  без строки `authoritative_memo miss` → это путь промаха кэша (не requireAuthoritative): кэш стёрт свапом;
- 28.487 `[ENSURE-LINK] authoritative_memo hit ageMs=5467 generation=5` — память заполнилась уже этим лишним вызовом.

## Scope

- app/cloud_sync.ts: `rememberSwapConfirmedStableAuthLink(proof, canonicalStableId, reason)` — при строгих условиях
  (proof.ok, source=callable, stableUid === canonical, authUid === текущий Firebase uid, поколение active с тем же stableId)
  кладёт подтверждение в память поколения и в кэш `stable_auth_link_cache_v1`; иначе лог `swap_seed skipped reason=…`.
- app/auth_provider.ts: в ветке свапа без слияния (подтверждение получено этим же входом) после `generation_begun` под тем
  же замком вызвать помощник. Ветку со слиянием (merge.ok) не трогаем — там подтверждения привязки нет.
- Тест-контракт.

## Architecture

Ключ кэша = `${stableId}:${authUid}` — ровно та пара, которую подтвердил сервер; поколение проверяется в момент записи под
замком смены аккаунта. Ничего не ослабляем для другого аккаунта: промах при любом расхождении.

## Security and privacy

Подтверждение то же, что сервер только что дал этому входу; запись в чужую пару невозможна (сверка uid и stableId). Логи
без идентификаторов, кроме номера поколения.

## Technical debt

Предложения A (склейка параллельных восстановлений) и C (mistake_events параллельно) — следующими шагами по фактам.

## Verification

Тест: помощник пишет кэш/память только при совпадении всех условий, иначе skipped с причиной; auth_provider зовёт его после
generation_begun в ветке без слияния. Прогон Сверки «вход №2»: `[ENSURE-LINK] swap_seed done`, у `[BOOT-RESTORE-STEP]`
stable_link ≈ 0.

## Rollback

Обратный собственный патч.

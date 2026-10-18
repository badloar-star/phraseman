# Task packet: замечания Ревизора — ложное «не понимаю» на «No, thanks», двойной тап в Диалогах и на ✕ пейвола

Governance-ID: TG-C9D27AE2B097
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: Ревизор/координатор 18.10 по b61e4b714, 26e633d39, 246b50f73.

## Outcome

1. «No, thanks», «No, no, no, thanks», «Yes, I do» при изучении английского не получают ложное «не понимаю». Двусмысленные короткие слова (no/a/de/la/un/in/…) не считаются признаком чужого языка, считаются только РАЗНЫЕ слова, нужно ≥2.
2. Двойной тап по «отправить» с репликой на чужом языке не даёт двух пузырей. Голосовое вложение и ошибка голоса очищаются, как в обычной отправке.
3. Двойной тап по ✕ пейвола не закрывает экран под ним: защёлка на 900 мс, второй вызов пишет причину и ничего не делает.

## Scope

В работе:
- app/dialogue_v2_off_language.ts;
- app/dialogue_v2_session.tsx;
- app/dialogue_v2_freeform.tsx;
- app/navigation_back.ts;
- тесты.

Вне работы: остальное.

## Architecture

Архитектура не меняется. Защёлки — модульная метка времени и ref, без setTimeout.

## Security and privacy

Не затрагивает.

## Technical debt

Pay now: ложные срабатывания и двойные тапы закрываются в этой правке; определитель остаётся эвристикой, журнал [DIALOG-OFF-LANG] покажет пограничные случаи.

## Verification

Через слот:
- dialogue_v2_off_language — добавлены «No, thanks», «Yes, I do», «No, no, no, thanks»;
- paywall_close_keeps_underlying_screen — двойной вызов;
- тесты navigation_back*;
- dialogue_v2_session*;
- dialogue_v2_freeform*.

## Rollback

Ревертнуть коммит.

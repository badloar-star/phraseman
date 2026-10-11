# Task packet: замок Шпиля при неизвестном языке интерфейса (null ≠ «нет»)

Governance-ID: TG-F2E5C095C230
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10, 🔴 по 4b5162622).

## Outcome
`[SPIRE-GATE] {"lang":null,"allowed":false,"reason":"ui_lang_unknown","where":"isSpireTabEnabled"}` на кадре community-001
(интерфейс ru) — Шпиля нет. Причина: замок читал `peekAppLang()` — СЫРОЕ сохранённое значение `app_lang`. Кто ни разу не
выбирал язык вручную, у того `app_lang` нет, peek навсегда null, а интерфейс идёт по языку устройства. Гидрация
LangContext события не шлёт — подписчики не пересчитываются. Перечит при фокусе считал `ui_lang_unknown` окончательным
отказом.

## Scope
In: `app/ui_lang_resolved.ts` (новый, крошечный), `components/LangContext.tsx` (публикация фактического языка),
`app/spire_tab_flag.ts`, `app/spire_gate_refresh.ts`, `tests/spire_ui_lang_gate.test.ts`.
Out: пуши Шпиля (сервер), список языков.

## Architecture
LangContext публикует ФАКТИЧЕСКИЙ язык интерфейса (initial/state/hydrated) в модуль `ui_lang_resolved` с подписчиками.
Замок берёт его, при отсутствии — сохранённый peek. null = «ещё не знаем»: подписка на публикацию пересчитывает замок;
перечит рубильников пропускается только при `ui_lang_not_supported`.

## Security and privacy
Без данных.

## Technical debt
Другие модули, читающие `peekAppLang()` как язык интерфейса, страдают тем же — помечено в отчёте.

## Verification
Тест null → ru открывает Шпиль; тесты замка; срез типов; пересъёмка community-001 — Сверка.

## Rollback
`git revert`.

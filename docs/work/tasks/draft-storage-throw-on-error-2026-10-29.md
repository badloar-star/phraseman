# Task packet: saveCommunityPackCreateDraft — параметр throwOnError

Governance-ID: TG-52FDE91ED321
Status: Done
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: none

## Outcome

Ревизор: вторая половина правки 12dfe807f не была закоммичена, из-за чего кандидат fb28e7feb не проходил проверку типов (TS2554: `community_pack_create.tsx` передаёт 4-й аргумент). Функция сохранения черновика набора принимает `options?: { throwOnError?: boolean }`; при `throwOnError` ошибка сохранения пробрасывается, чтобы выход из редактора не закрывал его без подтверждённого сохранения. Фоновые автосохранения по-прежнему не бросают.

## Scope

In scope: `app/community_packs/communityPackDraftStorage.ts` (параметр и проброс ошибки). Out of scope: вызывающий код и навигация (уже в HEAD).

## Architecture

No architecture change: опциональный параметр с прежним поведением по умолчанию.

## Security and privacy

Данные и права не меняются; ошибка по-прежнему только в журнал. Политика конфиденциальности не затрагивается.

## Technical debt

Pay now: без параметра типы кандидата красные.

## Verification

Проверка типов целиком; `tests/community_draft_leave.test.ts`.

## Rollback

Откатить коммит: параметр исчезнет, но вызывающий код снова не пройдёт типы, поэтому откатывать вместе с `12dfe807f`.

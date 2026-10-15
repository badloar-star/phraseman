# Моменты v3 — m01 вариант B «Короткая» (повторные повышения) и guard-ok в гейтах (15.10)

Governance-ID: TG-2382D53B16B9

## Outcome
Вариант B момента m01 (лист CHECKLIST_m01.md → «Вариант B», утверждён владельцем вместе с v3-all) показывается вместо трёх актов, когда решение окна недели несёт `isRepeatPromotion === true` (Ядро 4d5fefbcf: promoted && prevTier ≥ 1). Экран: монета cheer + искры, надпись «Топ-5 · {Лига}», «Поднимаешься», строка «5 место · 470 монет за неделю · +100», «Играть» и «Поделиться» (системное окно «Поделиться»). Заодно строки-причины журнала в `first_dialog_gate.ts` и `perfect_moment_gate.ts` помечаются `guard-ok` (сторож переводов зоны).

## Scope
Только показ. Ничего не начисляется и не пишется (монеты за повышение — ночной крон). «Поделиться» отдаёт текст без имени и без идентификаторов; на наш сервер ничего не уходит.

## Architecture
Новый ленивый компонент `MomentPromotionShort`, выбор варианта в `SpireWeekMomentHost` по `decision.isRepeatPromotion`; строки на 9 языков в `moments_strings.ts`; шаринг — `Share.share` из React Native на стороне хоста; `useFireOnce` гасит двойной тап. Dev-кадр `/dev_moments_preview?state=promoshort`. Применение после сообщения «№7 снят» (Metro).

## Security and privacy
Текст шаринга — лига, место и монеты недели; без имени и uid. Новых разрешений и сетевых вызовов нет.

## Technical debt
Геометрию и тайминги варианта B подтверждает Сверка по кадрам.

## Verification
Контрактные тесты хоста и компонента, `spire_week_moment_host_contract`, `scan_i18n_design_zone`, typecheck.

## Rollback
Флаг `moments_v3` выключен — поведение прежнее; откат — revert коммита.

Governance-ID: TG-4723C719E125

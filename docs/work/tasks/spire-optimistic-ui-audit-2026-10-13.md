# Task packet: аудит Optimistic UI клиента Шпиля (R1) и дешёвые правки

Governance-ID: TG-71C649E647D4
Status: Done
Owner: сессия «2 · ДИЗАЙН» по команде координатора 13.10

## Outcome

Таблица мгновенного отклика клиента Шпиля по критериям а–д правила №10 (вход, старт ступени, ответы, засчёт этажа/камня, итог недели, тур, переходы) и исправления дешёвого и безопасного: первый кадр входа из памяти процесса, плавная вставка блоков над башней.

## Scope

In scope: `docs/phraseman-2.0/OPTIMISTIC_UI_SPIRE_R1_2026-10-13.md`; `app/spire_config_client.ts` (peekSpireConfig), `components/spire/SpireHomeScreen.tsx` (начальное состояние), `app/spire/use_spire_game.ts` (layout-переходы), контрактный тест.

Out of scope: энергия и деньги (Ядро), синхронная идентичность (Ядро/Авторизация), пауза таймера на форме жалобы и реакция на `rejected` (решение владельца).

## Architecture

Память процесса для конфига — тот же приём, что peek комнаты/тура; сеть и кэш 6 ч не менялись. LayoutAnimation — общий помощник `app/smooth_layout.ts`.

## Security and privacy

Данные не добавляются, права не меняются, Privacy Policy не затронута.

## Technical debt

Contain: первый заход за процесс всё ещё читает кэш (мс); неделя и «Подняться» активны через 1–3 кадра до синхронной идентичности.

## Verification

Запуск `tests/spire_entry_instant_contract.test.ts` и прежних Spire-тестов через `npm run test:one`; `node --test` для `spire_game_source_contract` и `spire_design_layer_contract`; разбор изменённых файлов babel-парсером.

## Rollback

git revert коммита.

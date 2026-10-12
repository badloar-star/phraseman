# Превью Шпиля: поля игры, которых не хватало (pending), из-за них «Подняться» была неактивна при живой комнате (spire-005)

Governance-ID: TG-A6A53E49AD3A
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
Модель игры в dev-превью Шпиля повторяет форму настоящего useSpireGame: есть pending (null) и cancelPendingStep. Тогда climbReady в превью истинно, как в живой комнате (кнопка «Подняться» светлая), а неактивной остаётся только там, где модель этого хочет (нет уровня).

## Scope
components/spire/spire_preview_fixtures.ts (game()), тест. Боевой путь и Ядро не затрагиваются.

## Architecture
В боевом хуке pending: null, пока нет ожидающего шага; в превью поля не было → undefined !== null → климб «не готов» во всех состояниях превью. Добавление полей по форме хука.

## Security and privacy
Не применимо; только dev-превью.

## Technical debt
Фильтр журнала кадра робота (FRAME_LOG_RX в scripts/parity_batch_shoot.mjs) не знает [SPIRE-DOCK]/[SPIRE-SCROLL] — файл Дизайна с чужой незакоммиченной правкой, строка передана им.

## Verification
Тест: для всех состояний превью готовность кнопки истинна там, где tier не null и нет сессии.

## Rollback
git revert коммита.

# Волна «На слух» неподвижна во время звука (12.11)

Governance-ID: TG-2FEC954E3194
Governance-ID: TG-B2F47FB6B5D0

## Outcome

Обход экранов (заход 3, e94eaf298): во время звука столбики волны не двигаются (6 кадров по 0,25 с — одна смена при
нажатии). Макет: столбики ходят 2200 мс, потом гаснут. Плюс `[WORD-AUDIO] speak:enter` пишется `console.warn` со стеком
на каждую фразу — копит дев-плашку; это не ошибка → обычный `console.log`.

## Scope

`components/games/GameListenWave.tsx` (сперва временный журнал `[LISTEN-WAVE]`, по фактам — правка), `hooks/use-audio.ts`
(одна строка: warn → log для speak:enter).

## Architecture

Сперва журнал: active (useRuntimeActive), reduceMotion, cycleMs, ход часов анимации на JS через 300/1000 мс. Чинить только по фактам.

## Security and privacy

Не касается данных.

## Technical debt

Временный журнал убрать после починки; логи в catch и ранних выходах остаются.

## Verification

Кадры с эмулятора (через замок) до/после, склейка с макетом, проверка типов файла.

## Rollback

`git revert`.

## Ход работ

- speak:enter: `console.warn` → `console.log` (hooks/use-audio.ts) — рядовое событие, не ошибка.
- Волна: журнал [LISTEN-WAVE] — после окна эмулятора (очередь: Экзамены → games-fixes → обход → эта задача).

# Пик и Главная: шпиль целиком в окнах, подсказка уроков и карточка «Продолжить» над капсулой (R02, R03, 15.10)

Governance-ID: TG-8CF3503B4A10
Governance-ID: TG-CD8854E6FAC6

## Outcome
Продолжение срочной задачи владельца (R01–R03 реестра, коммит таббара — отдельно): верх башни со шпилем и ореолом не режется в окне момента «Этаж пройден» (13–15 этаж) и при тапе по этажу 14–15; подсказка «Урок ещё в работе» в «Обучении» не наезжает на капсулу таб-бара; карточка «Продолжить» на Главной не режет текст при крупном системном шрифте.

## Scope
`components/spire/moments/SpireFloorMoment.tsx` + новый `floor_moment_frame.ts`, `components/spire/SpireTower.tsx` (один эффект), `app/(tabs)/lessons.tsx` (один ханк: нижний отступ подсказки), `components/home/v2/HomeV2ContinueCard.tsx` (minHeight). Тесты: `spire_floor_moment_frame`, `spire_tower_select_top_scroll`, правка заглушек `spire_floor_moment_contract`.

## Architecture
Кадр башни момента — чистая функция `floorMomentFrame(skin, nextFloor, W, H)`: на верхних этажах масштаб вписывает запас над верхним этажом и низ этажа в окно (те же `spireTowerFitScale/spireWindowScrollY`, что у окна Пика), нижние этажи — прежняя центровка. Подсказка уроков берёт отступ из `useTabContentBottomPad` (верх капсулы + дыхание).

## Security and privacy
Данные не затрагиваются.

## Technical debt
MomentPromotion на низких экранах и аватар на пьедестале Пика — без снимка не правлю вслепую; вопрос координатору.

## Verification
Числовой сторож для 12 лиг × этажи 13–15; существующие тесты момента и башни; снимки малого экрана и шрифта 1.3 — Сверка.

## Rollback
Откат коммита.

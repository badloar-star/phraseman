# Task packet: шторка «Режим тренировки» по Сверке cards-section-032

Governance-ID: TG-ED08BE9BC98F
Status: Done (2026-10-05)
Owner: сессия «2 · Дизайн» (поручение координатора; файл — участок сессии 3, у неё чисто)
Related epic/enabler: гейт паритета «приложение = макет», cards-section (зафиксирован 04.10)

## Outcome

Шторка app/flashcards/FlashcardsTrainingModeSheet.tsx совпадает с cards-section.html `modeSheet` + cards-glass.css:
плотная заливка (хаб не просвечивает), затемнение как в макете, плитки режимов — градиент цвета темы по формуле `.tile`,
значок «Вспомни и напиши» — карандаш в квадрате.

## Scope

In scope: только вид шторки (заливка, затемнение, плитки, значок). Out of scope: логика выбора режима, квота, переходы.

## Architecture

Без изменения архитектуры — правка стилей одного компонента.

## Security and privacy

Не затрагивает данные.

## Technical debt

Нет новых долгов.

## Verification

Сторожа шторки (motion_hybrid, flashcards mode sheet contracts) через test:one; d145_guard; склейка — Сверка (переснять cards-section-032).

## Rollback

git revert коммита.

# Task packet: «Обучение» (вариант B) — расхождения из склейки learn_header_B, отклонённой координатором

Governance-ID: TG-B42B23100139
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2)
Related epic/enabler: гейт «приложение = макет», redesign-round-2.html кадр 02

## Outcome

Карточки уроков совпадают с `.lrow`/`.nc` макета, включая форму замка (контур, а не заливка). Пять замечаний
координатора разобраны по CSS макета: что исправлено и что оказалось артефактом масштаба склейки или данных.

## Scope

In scope: `components/lessons/LessonsListGlassCard.tsx` — значки замка.
Out of scope: таббар (общий компонент, другая сессия), данные прогресса, съёмка (сессия «6 · Сверка»).

## Architecture

No architecture change.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: пункты 2–4 (высота строк, таббар, кружок) по CSS совпадают; подтверждение — пересъёмка
  сессией 6 на родном Pixel 8 при шрифте «Средний» (на эмуляторе сейчас «Большой», он раздувает текст).

## Verification

Сторожа `lessons_list_*`, ratchet типографики; склейка сессии 6.

## Rollback

`git revert` коммита.

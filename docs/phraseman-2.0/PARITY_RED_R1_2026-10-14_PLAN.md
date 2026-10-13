# Паритет R1 — что ещё красное (сводка на 14.10)

Источник: `node scripts/visual_parity_gate.mjs --release=r1 --defer-triage` (13.10 ~17:35, HEAD после 9e56605e0) — 222 нарушения + 262 отложенных по корзинам + 41 совпадение, отвергнутое как устаревшее (кадр старше кода). Без повторов строк — 484.
Разбор: сессия «Макеты». Классы: **старый кадр / переснять** (образец и код уже сходятся или кадр снят не в том состоянии/языке — нужна только пересъёмка Сверкой на ru), **старый кадр (код новее)** (было совпадение, но код менялся после кадра), **образец отстаёт** (правят Макеты), **расхождение кода** (правит владелец зоны), **решение владельца/координатора**, **нет кадра**, **разобрать** (смешанные пометки — смотреть глазами).

## Что делать 14.10

1. **Сверка** — главный объём: ~380 строк «старый кадр / переснять» + «код новее» + 21 «нет кадра». Пересъёмка на ru после сборки дня; кадры Диалогов — в теме «Аврора» (как образцы), Пика — в тёмной (шапка) и в светлой (окно по теме, D180/D183).
2. **Макеты** — «образец отстаёт» (28): часть строк Карточек уже приведена 13.10 и требует только пересъёмки (cards-008, cards-076, cards-section-038/040/041/043/046, cards-v2-037; auth-gap-006/007 — образец верен) — пометки обновлены в реестре; реально отстают: cards-020 (жалоба на набор — окно по центру), cards-028 / cards-v2-018 (обложки роликов — решение владельца), cards-gap-001/002/004/005/006 (вёрстка блока «Наборы» и «Назад» на подложке), paywall-gap-002/003/005 (пробный период и ₽ — по D117/D158), settings-gap-013/029 (переключатели, «Сохранено», текст «Что нового» → «Пик», значки панели вкладок), community-006 (кнопка «+» без подписи).
3. **Владельцы кода** — «расхождение кода» (6) и «разобрать» (14): cards-section-056 «30/30» (Темы, D174), перенос «В моих наборах» на 2 строки (Дизайн: cards-section-014, cards-v2-016, cards-gap-033), меню фильтра (cards-gap-023), фикстура итога (cards-v2-051/052), остальное — по строкам ниже.
4. **Координатор/владелец** — 16 «решение» (корзина c_owner_decides в реестре).

## Сводка

```
всего красных строк: 484

по причине:
  338 — старый кадр / переснять
  41 — старый кадр (код новее)
  28 — образец отстаёт
  21 — нет кадра
  17 — нет вердикта / переснять
  16 — решение владельца/координатора
  14 — расхождение (разобрать)
  6 — расхождение кода
  2 — заблокирован: делается по решению владельца п.81 (12.10): состояние добавл
  1 — заблокирован: нужен привязанный аккаунт: строки Email/«Способ входа»/«Выйт

по владельцу:
  217 — Макеты+Темы (Карточки/Сообщество)
  97 — Авторизация
  62 — Дизайн (Диалоги)
  42 — прочее
  38 — Ядро+Дизайн (Пик)
  24 — Ядро+Дизайн (энергия/пейволы)
  4 — Ядро/Дизайн (уроки, главная, окна)

Авторизация :: accounts-gaps-states
   9 · старый кадр / переснять: auth-gap-001, auth-gap-003, auth-gap-004, auth-gap-005, auth-gap-008, auth-gap-009, auth-gap-010, auth-gap-012, auth-gap-016
   1 · нет кадра: auth-gap-002
   2 · образец отстаёт: auth-gap-006, auth-gap-007
   6 · старый кадр (код новее): auth-gap-011, auth-gap-013, auth-gap-014, auth-gap-015, auth-gap-017, auth-gap-018
Авторизация :: onboarding-states
   7 · старый кадр (код новее): onboarding-paywall-001, onboarding-002, onboarding-006, onboarding-007, onboarding-008, onboarding-010, onboarding-025
   14 · старый кадр / переснять: onboarding-003, onboarding-018, onboarding-paywall-002, onboarding-001, onboarding-009, onboarding-011, onboarding-012, onboarding-013, onboarding-014, onboarding-015, onboarding-019, onboarding-020, onboarding-021, onboarding-022
   2 · нет вердикта / переснять: onboarding-004, onboarding-005
Авторизация :: profile
   1 · заблокирован: нужен привязанный аккаунт: строки Email/«Способ входа»/«Выйт: profile-002
   16 · старый кадр / переснять: profile-003, profile-004, profile-005, profile-006, profile-008, profile-009, profile-010, profile-011, profile-012, profile-013, profile-015, profile-025, profile-028, profile-029, profile-030, overlays-runtime-018
Авторизация :: settings-gaps-states
   2 · нет кадра: settings-gap-001, settings-gap-023
   4 · старый кадр (код новее): settings-gap-006, settings-gap-009, settings-gap-020, settings-gap-021
   26 · старый кадр / переснять: settings-gap-007, settings-gap-012, settings-gap-035, profile-001, profile-007, profile-014, settings-gap-002, settings-gap-003, settings-gap-004, settings-gap-005, settings-gap-008, settings-gap-011, settings-gap-014, settings-gap-015, settings-gap-016, settings-gap-018, settings-gap-019, settings-gap-022, settings-gap-024, settings-gap-025, settings-gap-026, settings-gap-028, settings-gap-030, settings-gap-031, settings-gap-032, settings-gap-033
   3 · нет вердикта / переснять: settings-gap-010, settings-gap-017, settings-gap-027
   1 · расхождение кода: settings-gap-034
   2 · образец отстаёт: settings-gap-013, settings-gap-029
   1 · решение владельца/координатора: settings-gap-036
Дизайн (Диалоги) :: dialogs
   38 · старый кадр / переснять: dialogs-009, dialogs-010, dialogs-021, dialogs-024, dialogs-040, dialogs-042, dialogs-043, dialogs-044, dialogs-046, dialogs-001, dialogs-002, dialogs-003, dialogs-004, dialogs-005, dialogs-006, dialogs-007, dialogs-008, dialogs-011, dialogs-012, dialogs-013, dialogs-014, dialogs-015, dialogs-016, dialogs-018, dialogs-019, dialogs-020, dialogs-022, dialogs-023, dialogs-029, dialogs-030, dialogs-031, dialogs-032, dialogs-034, dialogs-036, dialogs-038, dialogs-039, dialogs-041, dialogs-045
   3 · нет кадра: dialogs-025, dialogs-026, dialogs-027
   1 · заблокирован: делается по решению владельца п.81 (12.10): состояние добавл: dialogs-028
   2 · расхождение (разобрать): dialogs-033, dialogs-037
   1 · образец отстаёт: dialogs-035
Дизайн (Диалоги) :: dialogs-gaps-states
   16 · старый кадр / переснять: dialogs-gap-001, dialogs-gap-004, dialogs-gap-005, dialogs-gap-006, dialogs-gap-007, dialogs-gap-009, dialogs-gap-011, dialogs-gap-014, dialogs-gap-016, dialogs-gap-002, dialogs-gap-003, dialogs-gap-010, dialogs-gap-012, dialogs-gap-013, dialogs-gap-015, dialogs-gap-017
   1 · расхождение (разобрать): dialogs-gap-008
Макеты+Темы (Карточки/Сообщество) :: cards-gaps-states
   3 · старый кадр (код новее): cards-gap-007, cards-gap-010, cards-gap-016
   16 · старый кадр / переснять: cards-gap-011, cards-gap-024, cards-gap-027, cards-gap-028, cards-gap-029, cards-gap-031, cards-gap-032, cards-gap-033, cards-gap-036, cards-gap-038, cards-gap-039, cards-gap-003, cards-gap-020, cards-gap-026, cards-gap-030, cards-gap-034
   1 · нет вердикта / переснять: cards-gap-012
   4 · расхождение (разобрать): cards-gap-014, cards-gap-015, cards-gap-017, cards-gap-023
   1 · нет кадра: cards-gap-021
   5 · образец отстаёт: cards-gap-001, cards-gap-002, cards-gap-004, cards-gap-005, cards-gap-006
   3 · решение владельца/координатора: cards-gap-008, cards-gap-018, cards-gap-022
Макеты+Темы (Карточки/Сообщество) :: cards-section.shadow
   1 · старый кадр / переснять: cards-v2-001
Макеты+Темы (Карточки/Сообщество) :: cards-states
   11 · старый кадр / переснять: cards-051, cards-052, cards-053, cards-054, cards-055, cards-056, cards-057, cards-058, cards-059, cards-079, cards-078
   1 · образец отстаёт: cards-020
Макеты+Темы (Карточки/Сообщество) :: cards-v2
   11 · образец отстаёт: cards-008, cards-076, cards-section-038, cards-section-040, cards-section-041, cards-section-043, cards-section-046, cards-v2-037, cards-002, cards-028, cards-v2-018
   100 · старый кадр / переснять: cards-018, cards-019, cards-022, cards-026, cards-035, cards-044, cards-046, cards-047, cards-050, cards-061, cards-064, cards-065, cards-066, cards-069, cards-071, cards-072, cards-073, cards-074, cards-082, cards-section-013, cards-section-016, cards-section-018, cards-section-021, cards-section-029, cards-section-039, cards-section-052, cards-section-053, cards-section-054, cards-section-055, cards-v2-006, cards-v2-010, cards-v2-025, cards-v2-027, cards-v2-028, cards-v2-032, cards-v2-035, cards-v2-036, cards-v2-040, cards-v2-041, cards-v2-042, cards-v2-046, cards-v2-047, cards-v2-049, cards-005, cards-006, cards-007, cards-009, cards-010, cards-014, cards-015, cards-016, cards-017, cards-021, cards-023, cards-024, cards-025, cards-032, cards-034, cards-039, cards-048, cards-062, cards-070, cards-075, cards-section-005, cards-section-006, cards-section-007, cards-section-008, cards-section-009, cards-section-010, cards-section-012, cards-section-015, cards-section-017, cards-section-020, cards-section-022, cards-section-023, cards-section-024, cards-section-028, cards-section-032, cards-section-033, cards-section-034, cards-section-035, cards-section-036, cards-section-044, cards-section-045, packs-simple-003, packs-simple-004, cards-v2-005, cards-v2-008, cards-v2-009, cards-v2-011, cards-v2-013, cards-v2-014, cards-v2-017, cards-v2-022, cards-v2-023, cards-v2-024, cards-v2-029, cards-v2-030, cards-v2-031, cards-v2-048
   2 · расхождение (разобрать): cards-027, cards-v2-016
   18 · старый кадр (код новее): cards-030, cards-031, cards-036, cards-041, cards-042, cards-063, cards-067, cards-068, cards-077, cards-080, cards-081, cards-section-030, cards-v2-007, cards-v2-015, cards-v2-019, cards-v2-026, cards-v2-044, cards-v2-045
   5 · нет вердикта / переснять: cards-033, cards-040, cards-043, cards-section-019, cards-v2-053
   5 · расхождение кода: cards-section-014, cards-section-031, cards-section-056, cards-v2-051, cards-v2-052
   6 · нет кадра: cards-section-049, cards-section-050, cards-v2-038, cards-v2-039, cards-v2-088, cards-v2-089
   3 · решение владельца/координатора: community-025, cards-v2-021, cards-v2-034
Макеты+Темы (Карточки/Сообщество) :: community
   7 · нет кадра: community-002, community-008, community-009, community-012, community-015, community-017, community-024
   8 · старый кадр / переснять: community-011, community-018, community-019, community-021, community-022, community-003, community-005, community-007
   3 · старый кадр (код новее): community-013, community-014, community-016
   1 · образец отстаёт: community-006
   1 · решение владельца/координатора: community-020
Макеты+Темы (Карточки/Сообщество) :: packs-simple.shadow
   1 · старый кадр / переснять: packs-simple-001
Ядро+Дизайн (Пик) :: spire
   17 · старый кадр / переснять: spire-001, spire-002, spire-003, spire-004, spire-005, spire-006, spire-007, spire-008, spire-009, spire-010, spire-011, spire-012, spire-013, spire-014, spire-015, spire-016, spire-017
   1 · образец отстаёт: community-001
Ядро+Дизайн (Пик) :: spire-gaps-states
   1 · расхождение (разобрать): spire-gap-016
   19 · старый кадр / переснять: spire-gap-021, spire-gap-022, spire-gap-001, spire-gap-002, spire-gap-003, spire-gap-004, spire-gap-005, spire-gap-006, spire-gap-007, spire-gap-008, spire-gap-009, spire-gap-010, spire-gap-011, spire-gap-012, spire-gap-013, spire-gap-014, spire-gap-015, spire-gap-017, spire-gap-020
Ядро+Дизайн (энергия/пейволы) :: energy-modes-states
   2 · нет вердикта / переснять: energy-modes-013, energy-modes-014
   3 · старый кадр / переснять: energy-modes-015, energy-modes-001, energy-modes-017
Ядро+Дизайн (энергия/пейволы) :: paywall-gaps-states
   9 · старый кадр / переснять: paywall-gap-012, paywall-gap-001, paywall-gap-004, paywall-gap-006, paywall-gap-007, paywall-gap-008, paywall-gap-009, paywall-gap-010, paywall-gap-011
   4 · образец отстаёт: paywall-gap-002, paywall-gap-003, paywall-gap-005, paywall-gap-013
Ядро+Дизайн (энергия/пейволы) :: paywall-price-states
   1 · нет вердикта / переснять: paywalls-015
   5 · решение владельца/координатора: paywalls-011, paywalls-012, paywalls-013, paywalls-016, paywalls-018
Ядро/Дизайн (уроки, главная, окна) :: home-by-language-mockup
   3 · старый кадр / переснять: home-004, home-005, home-006
Ядро/Дизайн (уроки, главная, окна) :: learn
   1 · старый кадр / переснять: energy-modes-016
прочее :: embedded-plus-states
   3 · расхождение (разобрать): paywalls-008, paywalls-009, paywalls-010
прочее :: manage-subscription-states
   12 · старый кадр / переснять: profile-018, profile-019, profile-023, profile-016, profile-017, profile-020, profile-021, profile-022, profile-024, paywalls-022, paywalls-023, paywalls-024
   2 · нет вердикта / переснять: paywalls-020, paywalls-021
   1 · расхождение (разобрать): paywalls-025
   1 · решение владельца/координатора: paywalls-019
прочее :: promo-code-states
   8 · старый кадр / переснять: overlays-campaigns-004, overlays-campaigns-014, overlays-campaigns-005, overlays-campaigns-009, overlays-campaigns-010, overlays-campaigns-011, overlays-campaigns-012, overlays-campaigns-015
   1 · нет кадра: overlays-campaigns-006
   1 · нет вердикта / переснять: overlays-campaigns-013
   2 · решение владельца/координатора: overlays-campaigns-007, overlays-campaigns-008
прочее :: referral-code-states
   10 · старый кадр / переснять: overlays-campaigns-016, overlays-campaigns-017, overlays-campaigns-018, overlays-campaigns-019, overlays-campaigns-020, overlays-campaigns-022, overlays-campaigns-023, overlays-campaigns-024, overlays-campaigns-025, overlays-campaigns-026
   1 · заблокирован: делается по решению владельца п.81 (12.10): состояние добавл: overlays-campaigns-021
```

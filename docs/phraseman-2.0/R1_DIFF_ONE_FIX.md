# Разбор diff r1: честный счёт кодовых правок (Макеты, 12.10)

Прежний разбор считал «кодовым» любой пункт без меток «данные / dev / вопрос» и раздавал исполнителей по ключевым словам — так в «Темы» попали строки, где кода нет. Теперь каждая строка diff размечена по разбору исполнителей: Темы (`7fcb58e46`, INBOX_COORDINATOR_FROM_THEMES.md), Дизайн (коммиты `ada33c4c4`…`9db022010`), решениям координатора и метке пункта. Метка хранится в `triage.final_bucket` (+ `final_who`, `final_group`).

Всего diff: **258**.

| Корзина | Строк | Что это |
|---|---|---|
| `a_code_defect` | 5 | есть кодовый дефект (метка «дефект кода» / решение координатора / разбор исполнителя) — **3 уникальных правок** |
| `a2_layout_candidate` | 52 | только «вёрстка, мелко» (±px) к утверждённому образцу, причина не доказана (прокрутка, клавиатура, данные) — **не гонять в код до пересъёмки свежим кодом** |
| `b_reshoot` | 137 | только пересъёмка (кадр старый / состояние / шаг робота / уже исправлено) |
| `c_owner_decides` | 35 | решает владелец (утренний лист): значок «В набор», шапка Шпиля, цвет кнопки, срок промокода… |
| `d_mockup_stale` | 29 | образец устарел или неточен — правят Макеты (страницы под замком — после ответа владельца) |

## Осталось кодовых правок по исполнителям

| Исполнитель | Уникальных правок | Строк |
|---|---|---|
| Дизайн | 0 | 0 |
| Темы | 2 | 2 |
| Ядро | 1 | 3 |
| Авторизация | 0 | 0 |
| **Итого** | **3** | **5** |

Кандидатов «мелкая вёрстка» (Дизайн): **52** строк — отдельно, см. ниже.

### Дизайн — 0

Нет.

### Темы — 2

| Строки | Что исправить | Файл |
|---|---|---|
| cards-024 | [дефект кода — кандидат, Темы] Шторка полупрозрачная: сквозь неё просвечивают строки списка карточек под ней (слова «занимать», «Admit», «Afford» видны поверх полей «Слово или фраза», «Пример» и между кнопками) — в образце шторка  | `app/community_pack_create.tsx` |
| spire-010 | [дефект кода — кандидат] Под панелью башня показана от вершины («НАД ОБЛАКАМИ», этажи 15, 14), маркер не на своём этаже; в образце окно башни стоит на этаже 4 с рамкой выделения и маркером. На spire-005 и spire-012 башня уже прокр | `components/spire/SpireResultPanel.tsx` |

### Ядро — 1

| Строки | Что исправить | Файл |
|---|---|---|
| dialogs-005, dialogs-038, dialogs-041 | [логика Ядра] Категории 0/19 при пройденном «Перенести встречу»: итог не загрузился (completion_unavailable) — зона Ядра. | `components/dialogs/DialogueV2CatalogueContainer.tsx` |

### Авторизация — 0

Нет.

## Кандидаты: мелкая вёрстка (Дизайн) — после пересъёмки

`cards-007 cards-047 cards-078 cards-gap-007 cards-gap-009 cards-gap-010 cards-gap-011 cards-gap-012 cards-gap-016 cards-gap-035 cards-section-008 cards-section-012 cards-section-023 cards-v2-006 cards-v2-010 cards-v2-012 cards-v2-020 cards-v2-025 cards-v2-026 cards-v2-029 cards-v2-045 cards-v2-046 dialogs-011 dialogs-gap-003 dialogs-gap-010 dialogs-gap-012 dialogs-gap-013 overlays-campaigns-004 overlays-campaigns-009 overlays-campaigns-010 overlays-campaigns-011 overlays-campaigns-012 overlays-campaigns-014 overlays-campaigns-015 paywall-gap-012 profile-016 settings-gap-014 settings-gap-015 settings-gap-016 settings-gap-018 settings-gap-022 settings-gap-035 spire-002 spire-005 spire-009 spire-012 spire-015 spire-gap-007 spire-gap-009 spire-gap-010 spire-gap-012 spire-gap-013`

## Корзина a2 «вёрстка ±px»: проверено (Дизайн, 12.10)

Из 52 строк корзины `a2_layout_candidate` кадр снят ПОСЛЕ последней правки файлов экрана у **34** (остальные 18 — кадр старше кода, разбирать нечего, ждут пересъёмки). Правило: без доказанной причины код не трогаем.

### Причина доказана — исправлено (1 правка, 3 строки)

| Строки | Что на склейке | Причина в коде | Правка |
|---|---|---|---|
| cards-section-023, cards-v2-025, cards-v2-026 (и cards-section-022 из устаревших) | «назад» в каталоге — голая стрелка, в макете (`.rb` из cards-v2.html, phone 25/26) круглая плашка | `app/flashcards_packs.tsx`: `TouchableOpacity` + `Ionicons arrow-back` без подложки | `PackRoundButton` (плашка 42, стиль «Тень») — тот же компонент, что в шапках наборов |

### Причины в коде нет — не трогал

| Строки | Что показала склейка | Почему не код |
|---|---|---|
| cards-section-023, cards-v2-025, cards-v2-026 | чип «EN ⌄» в шапке, линия под верхней строкой | вопрос владельцу (рекомендация листа: оставить и дорисовать в образец) |
| cards-v2-026, overlays-campaigns-009…015 | открыта клавиатура ОС, введён другой текст, не та плашка | состояние кадра — пересъёмка |
| cards-047, cards-v2-029, cards-v2-046, cards-gap-007, cards-gap-016, paywall-gap-012 | не то состояние / данные / кадр в момент анимации | состояние или данные кадра — пересъёмка |
| cards-078 | образец «старой подачи» (пятна, мятная «Назад») | образец устарел (Макеты) |
| cards-gap-009, cards-gap-010, cards-gap-011, cards-gap-035 | значок «стопка слоёв» против «баночки»; монеты «0» против «1 240»; кнопка 58 против 54 px; блок на 4–40 px | значок — вопрос владельцу; монеты — данные; px кадра не dp (макет 430 css, приложение 411 dp: коэффициенты 1,286 и 1,314), опоры для вывода «в коде на столько-то dp» нет |
| cards-v2-046, dialogs-gap-003 | сдвиг 15 и 95 px, перенос пояснения на 4 строки | перенос — шкала шрифтов D145 (не делю); сдвиг без замера стартовой точки области — причина не доказана |
| cards-gap-010 | панель состояния ниже на ~40 px | центр по формуле макета сходится с расчётом приложения; начало области в приложении не замерено → нужен лог раскладки, не правка |
| settings-gap-014, -015, -018 | вид переключателя; лишняя строка «English» с замком | общий вопрос про переключатели; решение владельца по строке |
| spire-002, -012, -015, spire-gap-007, -010, -012, -013 | шапка с капсулой «⚡», арт тура, данные, прокрутка | зона Тем / решение Тем и владельца / данные / состояние |
| spire-005, spire-gap-009, overlays-campaigns-004 | «исправлено в коде — подтверждено кадром» | уже закрыто, остаются только мелочи в зонах Тем |

Итог: **доказанных кодовых причин — 1 (три строки реестра)**, остальные 31 — состояние кадра / данные / вопрос владельцу / зона Тем / устаревший образец / px без доказанной причины. Пересъёмка после этой правки: cards-section-022, cards-section-023, cards-v2-025, cards-v2-026.

## Остальные diff-строки Дизайна без разбора (80 строк, Дизайн, 12.10)

Строки `status=diff` без `triage.final_bucket` (корзины a2/b/c/d их не покрыли). Метод тот же: кадр снят ПОСЛЕ последней правки файлов экрана (evidence_at позже последнего коммита по `code`) — разбирал; кадр старше кода — пересъёмка, кода не трогал. Порядок — по убыванию числа строк на экран.

### Кадр свежий (9 строк) — что сделал

| id | Что на склейке | Что сделал |
|---|---|---|
| learn-059 (Теория) | «4 примеров» в заголовке раздела (в образце «3 примера») | **Исправлено** (`fix(theory)`): счётчик склоняется по числу через `pluralWithCount` (ru 1 пример/4 примера/5 примеров, uk, pl, en/es/pt-BR единственное при 1), тест `theory_example_plural_contract`. Остальное по строке (подпись «Теория», кнопка-список, «Просмотрено 1 из 15 · 7%», чипы «Кто / am / is / are», красный флажок) — структура теории и вопрос владельца, не правка в одну строку |
| spire-gap-001/002/004 (+005) | красного флажка нет | флажок в боевом экране ЕСТЬ (SpireTaskReportButton, icon-flag); на кадрах превью его не было, потому что `/dev_spire_preview` передавал `reportSlot={null}` — **исправлено** (`fix(spire-preview)`: тот же ReportErrorButton с пустым транспортом, testID `spire-task-report-0`). Капсула у «⚡ 5» — приказ владельца 01.10 (иконка без капсулы), перенос подзаголовка «Поверх 7 · Нефрит» и кадр на украинском — состояние, зона Темы |
| paywall-gap-002/003/005 | пробный период и цены в ₽ в образце, «Начать 3 дня бесплатно» мятная | образец устарел (D117/D158: пробный только из магазина, цены справочные в €, белая главная кнопка) — вопрос владельца из листа; прокрутка/фон — состояние кадра. Кода не трогал |
| video-001 | вкладок «Все видео», селектора канала «PE Phraseman» нет; «Премьера сейчас» вместо «Скоро» | функции/данные (в приложении один канал и живая премьера), не вёрстка — вопрос владельцу |
| cards-v2-027/028 | «0/30», «Безлимит с Plus» вместо активной «Начать» | состояние кадра (лимит Free исчерпан) — пересъёмка после `quota=reset`; данные плиток другие |
| settings-gap-005 | нет второй строки «Полный доступ на 3 дня» | состояние (нужен второй источник доступа в подмене) — не код |

### Кадр старше кода (71 строка) — только пересъёмка

Код после снимка правили, судить по кадру нельзя:
`practice-001/002/003`, `video-004/007/008/009/011`, `learn-001/002/003/004/007/008/011/012/013/014/016/017/018/020/024/028/029/031/032`, `learning-v2-010/018`, `profile-020/021/022`, `results-007/009`, `coins-001…005`, `paywalls-023/024`, `system-010/012/015`, `overlays-041`, `mistakes-panel-004/005/007/010/014/015/016/017/021`, `cards-section-004/035`, `onboarding-paywall-002`, `onboarding-001/009/011/012/013/014/015/018/022`, `settings-gap-008`, `home-001/002`.

Из них по запросам Макетов закрыто отдельно: `onboarding-009` (dev `greet=` читается и при прямом открытии шага), `onboarding-011` (ось «Прогресс» повёрнута: transform анимации затирал rotate), `profile-022` (шаг остаётся на шторке удержания, `offerProgress=on`), `settings-gap-008` (сид опроса). `onboarding-001` (позиции на 13–17 px, вес ссылки) — причина в коде не доказана (стиль ссылки совпадает с `.osb` макета), пересъёмка.

## Список для ROBOT10 (одна строка)

```
cards-005 cards-006 cards-009 cards-010 cards-021 cards-025 cards-032 cards-034 cards-039 cards-062 cards-075 cards-081 cards-gap-003 cards-gap-020 cards-gap-021 cards-gap-026 cards-gap-030 cards-gap-034 cards-section-006 cards-section-007 cards-section-009 cards-section-010 cards-section-015 cards-section-019 cards-section-024 cards-section-028 cards-section-032 cards-section-033 cards-section-034 cards-section-035 cards-section-036 cards-v2-001 cards-v2-005 cards-v2-008 cards-v2-009 cards-v2-011 cards-v2-013 cards-v2-014 cards-v2-017 cards-v2-022 cards-v2-023 cards-v2-024 cards-v2-027 cards-v2-028 cards-v2-030 cards-v2-031 cards-v2-033 cards-v2-048 community-003 community-004 community-005 dialogs-001 dialogs-007 dialogs-015 dialogs-016 dialogs-017 dialogs-018 dialogs-019 dialogs-020 dialogs-022 dialogs-023 dialogs-031 dialogs-032 dialogs-034 dialogs-036 dialogs-gap-002 dialogs-gap-009 dialogs-gap-015 dialogs-gap-017 energy-modes-001 energy-modes-017 onboarding-019 onboarding-020 onboarding-021 overlays-campaigns-005 overlays-campaigns-016 overlays-campaigns-018 overlays-campaigns-019 overlays-campaigns-020 overlays-campaigns-022 overlays-campaigns-023 overlays-campaigns-024 overlays-campaigns-025 overlays-campaigns-026 overlays-runtime-018 packs-simple-003 packs-simple-004 paywall-gap-001 paywall-gap-002 paywall-gap-003 paywall-gap-004 paywall-gap-005 paywall-gap-007 paywall-gap-008 paywall-gap-009 paywall-gap-010 paywall-gap-011 paywalls-022 paywalls-023 paywalls-024 profile-001 profile-003 profile-004 profile-005 profile-006 profile-007 profile-008 profile-009 profile-010 profile-011 profile-012 profile-013 profile-014 profile-015 profile-020 profile-021 profile-022 profile-024 profile-025 profile-028 profile-029 profile-030 settings-gap-002 settings-gap-003 settings-gap-004 settings-gap-005 settings-gap-008 settings-gap-009 settings-gap-011 settings-gap-019 settings-gap-024 settings-gap-025 settings-gap-026 settings-gap-028 settings-gap-030 settings-gap-031 settings-gap-032 settings-gap-033 spire-001 spire-004 spire-006 spire-007 spire-008 spire-011 spire-013 spire-014 spire-016 spire-017 spire-gap-003 spire-gap-006 spire-gap-011 spire-gap-014 spire-gap-015 spire-gap-018 spire-gap-020
```

Всего 155 (diff с корзиной `b_reshoot` + pending с coverage=ready).

## Решает владелец

`cards-014 cards-015 cards-016 cards-017 cards-048 cards-gap-008 cards-gap-018 cards-gap-022 cards-section-017 cards-section-020 cards-section-022 cards-section-044 cards-section-045 cards-v2-021 cards-v2-034 community-020 community-025 dialogs-002 dialogs-045 overlays-campaigns-007 overlays-campaigns-008 overlays-campaigns-017 packs-simple-001 paywall-gap-006 paywalls-011 paywalls-012 paywalls-013 paywalls-016 paywalls-018 paywalls-019 profile-017 settings-gap-036 spire-003 spire-gap-008 spire-gap-017`

## Образец устарел — Макеты

`cards-002 cards-020 cards-028 cards-070 cards-gap-001 cards-gap-002 cards-gap-004 cards-gap-005 cards-gap-006 cards-section-005 cards-v2-018 community-001 community-006 community-007 dialogs-003 dialogs-004 dialogs-006 dialogs-008 dialogs-012 dialogs-013 dialogs-014 dialogs-029 dialogs-030 dialogs-035 dialogs-039 paywall-gap-013 profile-026 settings-gap-013 settings-gap-029`

## Арт Главной меняется на S2 «Глина» (владелец, п.79) — не отличие кода

Образцы Главной (`home-001`…`home-006`, страницы `home-by-language-mockup.html`, `home-concepts.html`, `home-tiles-variants.html`, `home-mistakes-entry.html`) рисуют трёхмерные картинки плиток (блокнот, кружка с цитатой, арт плиток, монета) старого стиля. Владелец выбрал стиль картинок S2 «Глина», поэтому расхождение «картинка плитки не та» на этих строках — это смена арта, а не дефект кода: в вердиктах помечать «арт меняется на S2» и не отправлять в правки кода. Составы, положения и размеры плиток сверяются как обычно. (Координатор 12.10.)

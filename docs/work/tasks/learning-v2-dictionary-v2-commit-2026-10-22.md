# Task packet: словарь Learning V2 (вариант A) — сторожа оформления и коммит

Governance-ID: TG-D79447C14904
Status: In progress
Owner: сессия «Learning V2 сессии: анализ и переписывание»
Related epic/enabler: план docs/work/tasks/learning-v2-dictionary-v2-plan-2026-10-22.md

## Outcome

Новый словарь Learning V2 (dev-маршрут для «Сверки») проходит сторожа оформления — шрифты D145, стиль «Тень» без обводок,
цвета из темы — и уходит отдельным коммитом. Тренировка слов словаря работает режимами «Карточек», монеты за ней выключены
флагом до решения владельца.

## Scope

In scope: components/learning-v2/LearningV2DictionaryV2.tsx, learning_v2_dictionary_v2_copy.ts,
hooks/use_learning_v2_dictionary_save_v1.ts, app/learning_v2_dictionary_training_deck_v1.ts, app/dev_learning_v2_dictionary_v2.tsx,
app/flashcards/deck_sources.ts, app/flashcards/deck_selection.ts, app/flashcards_{blitz,speaking,recall}_session.tsx,
app/flashcards_swipe.tsx, app/flashcards_swipe_session.ts, router.ctx.js, тесты словаря.

Out of scope: подключение к app/(tabs)/lessons.tsx (чужая правка, решение утром), старый LearningV2LessonDictionaryOverlayV1,
экран старта «что повторяем / время» из макета, итог тренировки.

## Architecture

Слова приходят пропсом от хоста. Выбранные слова кладутся в реестр колоды (память + копия на телефоне) и передаются
экранам «Карточек» токеном `lv2:<id>` через существующий `?deck=`. Сеть и Firebase не участвуют.

## Security and privacy

Новых данных не собирается: слова уже на телефоне, колода — временная локальная копия. Ключи колоды и срока «Не могу
говорить» внесены в стирание аккаунта (286a45bc7). Сторонних сервисов и разрешений нет.

## Technical debt

- Contain: сторож tests/learning_v2_dictionary_v2_contract.test.ts держит проводку; выход — подключение к вкладке «Уроки».
- Accept temporarily: нет экрана старта из макета (настройки «Карточек» по умолчанию). Владелец решения — координатор, срок — утро 22.10.

## Verification

Тесты: learning_v2_dictionary_training_deck_v1, learning_v2_dictionary_v2_contract, fc_deck_*, flashcards_swipe_session,
training_entry — 104/104 зелёные. Проверка типов: в новых файлах ошибок нет. Сторожа: typography_two_sizes,
shadow_style_no_container_borders, theme_hardcoded_colors — без строк словаря. Сверка экрана — «Сверка» по dev-маршруту.

## Rollback

Откат коммита: словарь — новый экран за dev-маршрутом, колода `lv2:` используется только им. Данные пользователя не затрагиваются.

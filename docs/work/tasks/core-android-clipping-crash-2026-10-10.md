# Task packet: списки FlatList — removeClippedSubviews={false} (сторож краша Android ReactClippingViewManager)

Governance-ID: TG-0FA8172545AB
Status: In progress (полный прогон 10.10: android_clipping_crash_guard красный — 11 списков без защиты)
Owner: сессия 1 · ЯДРО

## Outcome

Сторож (июнь) требует у каждого FlatList приложения removeClippedSubviews={false}: включённое отсечение на Android
роняет приложение в ReactClippingViewManager. Нарушителей 11:
- 9 без пропа → добавляем {false};
- 2 включили отсечение ради скорости — CommunityPackPreview (89ae62ffb, 05.10) и flashcards_video_packs
  (8688eca0b, 30.09). Решено по рекомендации: краш важнее экономии. Виртуализация (windowSize,
  initialNumToRender) остаётся, отключается только отсечение невидимых view.
LearningV2Horizons.tsx — чужие незакоммиченные правки, не трогаю, отдельной строкой в отчёте.

## Scope

app/ai_companion_session.tsx, app/ai_dialog_session.tsx (v1, недоступны из интерфейса, но собираются),
app/community_packs/PackCommentsSheet.tsx, app/flashcards/CommunityPackPreview.tsx, app/flashcards_video_packs.tsx,
app/_learning_v2_authoring_preview.tsx, components/AppMessagesInbox.tsx,
components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx, components/learning-v2/LearningV2WordPocketOverlayV1.tsx,
components/NotificationCenterButton.tsx.

## Scope (часть 2 — квадраты вокруг скруглённых плашек, сторож android_no_square_outline)

elevation без непрозрачного фона рисует на Android квадрат по рамке. Пять мест вне зоны Codex переведены на
...noAndroidOutline (на iOS тень остаётся): app/(tabs)/lessons.tsx (кнопка над картой), app/achievements_screen.tsx
(плашка галереи на градиенте), app/flashcards/CollectionHeader.tsx (меню сохранённых), app/flashcards_swipe.tsx
(тост «правильный перевод» — порядок держит zIndex), app/shop.tsx (капсула дока).
Зона Codex/витрины разработчика (learning_v2_direct_session_player_v1, _learning_v2_modes_showcase, _motion_showcase)
и components/achievements/AchievementCategoryDock.tsx — отдельной строкой в отчёте.

## Architecture

Не меняется — один проп у списков.

## Security and privacy

Не затрагивает.

## Technical debt

Длинные списки с картинками (превью набора, наборы из видео) держат за кадром чуть больше view. Если Сверка
увидит просадку прокрутки, смотреть windowSize, а не возвращать отсечение.

## Verification

android_clipping_crash_guard зелёный; синтаксис; узкая проверка типов изменённых файлов.

## Rollback

git revert коммита.

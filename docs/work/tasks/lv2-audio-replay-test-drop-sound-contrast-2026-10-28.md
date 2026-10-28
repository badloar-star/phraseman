# Task packet: тест кнопок озвучки — убрать удалённый режим sound_contrast

Governance-ID: TG-882EB9B867C8
Status: In progress
Owner: Learning V2 session; просьба 4 · ТЕМЫ по решению координатора 28.10

## Outcome

tests/learning_v2_audio_replay_buttons.test.tsx больше не импортирует SoundContrastModeV1 и не мокает components/ui/v2_theme и v2_ui,
чтобы ТЕМЫ смогли удалить кластер components/ui и файл режима. Проверка «у каждой кнопки озвучки значок динамика»
(правило владельца 22.10) сохранена — теперь на живом режиме listen_choose.

## Scope

Только этот тест. Чужой незакоммиченный хунк (моки i18n и LearningV2TaskChrome, «задания №23, 22.10») не трогаю и не коммичу.

## Architecture

Режим sound_contrast выведен из роутера (tests/sound_contrast_retired_2026_10_26.test.ts); тест на него больше ничего не охраняет.

## Security and privacy

Не затрагивается.

## Technical debt

Отдельного теста на две кнопки вариантов (ipaA/ipaB) больше нет — его режим удалён.

## Verification

Точечный прогон этого теста через слот; коммит только моих хунков через --patch.

## Rollback

Revert коммита.

# Task packet: контраст новых элементов 18.10 во всех 138 сочетаниях тем

Governance-ID: TG-86EDE363CABA
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: координатор 18.10, правило «кнопки нигде не сливаются» (тон ≥ 1,5, графика ≥ 3, текст ≥ 4,5)

## Outcome

Новые сегодня элементы читаются во всех темах × оформление × насыщенность: строка премьеры и кнопки премьеры (c3c420861/78af5a002), мета и закладка видео-карточки, круг-заглушка монеты (bc2acd1b7), приглушённая «Получить приз» (74d0c65fe), «Сохранить» на карточках из видео (4d65c8be5), каркас «Настроек». Где ниже порога — исправлено токенами.

## Scope

In scope: tests/blend_new_elements_1018b.test.ts (замер), исправления токенов в YoutubeVideoGridCard, VideoSetView, FlashcardListItem и др. — только цвет.

Out of scope: «ИИ отдохнёт до завтра» — после Ядра; раскладка элементов.

## Architecture

No architecture change: замена токенов цвета на гарантированные пары (buttonFill / ctaFill / ctaFillInk и т. п.).

## Security and privacy

Не затрагивает.

## Technical debt

- Pay now: элементы ниже порога.

## Verification

Тест-замер по 138 сочетаниям; таблица координатору.

## Rollback

`git revert`.

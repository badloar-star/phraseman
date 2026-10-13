# Task packet: главная кнопка Пика «Подняться» → «Играть» (решение владельца, D177)

Governance-ID: TG-ECCB7B62EE65
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора

## Outcome

Главная кнопка экрана Пика называется «Играть» на 9 языках (ru Играть, uk Грати, en Play, es Jugar, pt-BR Jogar, vi Chơi, id Main, tr Oyna, pl Graj); метка для диктора берёт тот же текст. Подпись-предложение Plus под кнопкой без энергии — «Играй без ожидания с Plus» (раньше «Поднимайся…»), чтобы кнопка и подпись говорили одним глаголом. Образцы spire.html и spire-gaps-states.html — та же надпись. Запись D177 в журнал.

## Scope

In scope: components/spire/spire_strings.ts (climb), components/spire/spire_game_strings.ts (climbNoWait), docs/design/v2-app/spire.html, spire-gaps-states.html, 03_DECISIONS.md.

Out of scope: ключ climb и имена компонентов (SpireClimbDock) не меняются; тур «Поднимайся выше всех за неделю» — это суть режима, не кнопка.

## Architecture

No architecture change.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: ключ остаётся climb ради совместимости тестов и логов; в коде комментарий «зачем».

## Verification

syncheck, сторожа переводов (0/0), playwright-кадр кнопки в образцах.

## Rollback

Откат коммита.

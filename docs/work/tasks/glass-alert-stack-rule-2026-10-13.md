# Task packet: GlassAlertDialog — кнопки столбиком при крупном шрифте или длинном слове (находка Макетов №30, координатор 13.10 ~18:15)

Governance-ID: TG-81E0CB2A0179
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`components/v2/GlassAlertDialog.tsx` — окно очереди: «Восстановить аккаунт?», «Сменить аккаунт?», инфо-окна. Сейчас кнопки в ряд, если все подписи ≤18 знаков.

Проблема: «Не восстанавливать» (17 знаков) на экране 360 dp не влезает в половину ряда уже при обычном шрифте, а при ×1,3 рвётся по середине слова или режется.

Правило координатора: столбиком, если
- `fontScale > 1,15`, ИЛИ
- самое длинное СЛОВО любой подписи длиннее 10 знаков, ИЛИ
- как раньше: подпись длиннее 18 знаков.

Иначе — в ряд, как сейчас. Лог `[GLASS-ALERT-LAYOUT] fontScale=… longestWord=… layout=row|stack reason=…`, один раз на показ карточки (только dev).

Вид онбординга не меняется, кроме раскладки кнопок этого окна.

## Scope

In scope: `components/v2/GlassAlertDialog.tsx` — вычисление `stack` и лог.
Out of scope: тексты кнопок, размеры, цвета, другие окна.

## Architecture

- `const { fontScale } = useWindowDimensions()` — реактивно к системному масштабу.
- `longestWord = max(len(word))` по всем подписям, разбиение по пробелам.
- `stack = labelTooLong || fontScale > 1.15 || longestWord > 10`.
- Лог в эффекте по ключу `layout+reason`.

## Security and privacy

Только вёрстка.

## Technical debt

- Пороги (10 знаков, ×1,15) — эмпирика под 360 dp; для узких экранов меньше 360 могут понадобиться другие.

## Verification

Сторожа окон очереди:
- `overlays_runtime_liquid_glass_source_contract`;
- `themed_blocking_alert_queue`;
- `settings_switch_confirm_card_contract`;
- `aa_release_registration_restore_prompt`;
- `aa_release_floor_auth_ui`;
- `aa_dev_robot_no_cloud_and_restore`.

## Rollback

`git revert` коммита.

# Task packet: экзамен главы v2 по умолчанию выключен в OTA (нет склейки с макетом)

Governance-ID: TG-30DAA12477D5
Status: In progress
Owner: Learning V2 session; решение координатора + Ревизора 26.10 (d34be664d)

## Outcome

В сборке OTA экзамен главы v2 по умолчанию выключен: DEFAULT_FLAGS.learning_chapter_exam_v2_enabled = false, главы идут прежним
экзаменом. После склейки Сверки «экран | макет» владелец включает его из Пульта без новой OTA (ключ в allowedBools остаётся).

## Scope

app/remote_flags.ts — одна строка значения по умолчанию с комментарием; тесты, которые ждали true: перезакреп на «по умолчанию выкл,
включается удалённо» без ослабления проверок маршрута. Эталон флагов docs/work/release/ota_flag_baseline_2026-10-25.json и флаг в Пульте
не трогаю.

## Architecture

isChapterExamV2EnabledFor: getRemoteBool(...) !== false — без значения из Пульта берётся DEFAULT_FLAGS (теперь false) → прежний экзамен.

## Security and privacy

Нет данных.

## Technical debt

Включение — после склейки Сверки, решением владельца в Пульте.

## Verification

learning_v2_chapter_exam_v2_app, learning_v2_exam_chapter_credit_parity, chapter_exam_v2_ui_lang_gate, learning_v2_visibility_switch_contract,
dev-превью экзамена; проверка типов приложения.

## Rollback

Revert коммита или включение в Пульте.

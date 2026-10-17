# Task packet: вычитка новых строк 17.10 на 9 языках (координатор 17.10)

Governance-ID: TG-BB3780E8BC7A
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07 (переводы), D194 (голос на старте занятия)

## Outcome

Новые строки за 17.10 звучат естественно и укладываются по длине на всех 9 языках интерфейса:
- «Классический курс»;
- экран «Сегодня» и «Смотреть все»;
- «Пока не выходит — попробуй через минуту»;
- окно о голосовом лимите.

Тексты окна по макету D194 — таблица на 9 языков в `docs/work/tasks/translations-from-design-2026-10-15.md`. Сайт сейчас перекладывает это окно в шторку, поэтому сам компонент я не трогаю.

## Scope

In scope:
- `app/dialogue_v2_completion.tsx` — строка `retryPaused`, только id: «coba lagi semenit lagi» → «coba lagi dalam semenit», чтобы не повторять «lagi»;
- документ с переводами макета голосового окна.

Out of scope:
- `components/learning-v2/LearningV2VoiceHeadsupSheet.tsx` — его сейчас правит Сайт;
- русский текст.

## Architecture

No architecture change. Меняется только словарная строка.

## Security and privacy

Не применимо: меняются только тексты.

## Technical debt

- Тексты окна живут в компоненте, а не в общей таблице строк — Accept temporarily: Сайт переносит окно по макету и сам решит, где держать строки. Мою таблицу переводов он берёт из документа.
- Склонение слова «попытка» в тексте макета нужно делать через `pluralWithCount` (ru/uk/pl/en/es/pt-BR), а не цифрой в строке. Передаю Сайту.

## Verification

- `scan_untranslated_ui.mjs`;
- `scan_i18n_design_zone.mjs`;
- `tests/dialogue_v2_completion_repeat_feedback_contract.test.ts` через slot.sh.

## Rollback

`git revert` коммита.

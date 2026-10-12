# Task packet: бейдж PLUS на микрофоне Диалогов — размер по шкале D145 (16/13)

Governance-ID: TG-F3D0CB77589A
Governance-ID: TG-EF7E4DF60D64
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора
Related epic/enabler: D145/D139 (два размера текста), храповик typography_two_sizes_ratchet

## Outcome

Нестандартный размер 10 у надписи «PLUS» на кнопке микрофона заменён на 13; храповик размеров зелёный. Бейдж остаётся читаемым и не наезжает на значок микрофона.

## Scope

In scope: components/dialogs/DialogueV2SessionScreen.tsx (только стиль бейджа `dialogue-v2-voice-plus-badge`: размер текста, высота, минимальная ширина).

Out of scope: логика появления бейджа, остальные тексты экрана, список исключений храповика (config/файл теста — за координатором).

## Architecture

No architecture change: меняются числа стиля одного элемента.

## Security and privacy

Не затрагивает данные и права.

## Technical debt

Pay now. Расхождение с макетом (в dialogs.html `.rbtn .plus` = 10px) вынесено координатору: альтернатива — исключение «d145-micro» для бейджей на углу кнопки (§129).

## Verification

`node --test tests/typography_two_sizes_ratchet.test.mjs` зелёный; кадр экрана с бейджем на эмуляторе по команде координатора.

## Rollback

git revert коммита.

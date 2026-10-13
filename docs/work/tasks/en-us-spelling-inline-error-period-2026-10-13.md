# Task packet: английский по-американски в зоне Авторизации и точка между заголовком и текстом ошибки входа (LANG_PASS_REVIEW_R1 п.4, п.6)

Governance-ID: TG-CD613AC7127B
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10 ~08:45)

## Outcome

1. auth-gap-003 (и все ошибки окна входа). `showInlineError` склеивал заголовок и текст через перенос строки, а заголовки — без точки.
   В английском «This phone is already linked to another account / Your progress is safe…» читается как одно предложение.
   Теперь после заголовка ставится точка, если заголовок не кончается знаком конца фразы. Правило одно, для всех 9 языков и всех причин.
2. Британское написание в видимых английских текстах зоны → американское (даты в приложении американские, 10/12/2026):
   - «cancelled» → «canceled» — 4 строки отмены смены аккаунта в `app/(tabs)/settings.tsx` и строка отмены входа в `app/account_sync_copy.ts`;
   - «Practise» → «Practice» — согласие на ИИ-диалоги, `components/AiDialogConsentModal.tsx`.
   - Список мест в зоне Ядра — в отчёт координатору.

## Scope

In scope:
- одна функция `showInlineError` в `components/RegistrationPromptModal.tsx`;
- 6 английских строк.

Out of scope:
- внутренние коды и журналы (`'cancelled'` в `auth_*.ts` — это не текст для человека);
- отладочное окно DEBUG в `RegistrationPromptModal`;
- «dialogue / Dialogues» — название раздела, решение за Ядром;
- остальные языки.

## Architecture

Точка добавляется при сборке строки ошибки (`/[.!?…:]$/`), тексты-заголовки в таблицах переводов не меняются.

## Security and privacy

Тексты без данных.

## Technical debt

- Contain: точка ставится при показе, а не в исходном тексте. Если у заголовков появится своё оформление (жирный, отдельная строка), правило уберём.

## Verification

- Контракт-тест: `showInlineError` ставит точку только при её отсутствии.
- В зоне не осталось видимых «cancelled» / «Practise».
- Тесты окна входа зелёные.

## Rollback

git revert коммита.

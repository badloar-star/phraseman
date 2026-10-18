# Патчи 5 и 6: восстановление аккаунта и `account_delete_pending` без общей карточки

Governance-ID: TG-E6D1DAA0A4BE

## Готовое (`git apply 05_06_restore_prompt.patch`)

`app/account_delete_restore_prompt.ts`:
- статус удаления и «Восстановить» повторяются тихо при сбое сети: 3 попытки, паузы 0,7 с и 1,8 с;
- ответы сервера по существу (`not_restorable`, `missing`) не повторяются;
- новые исходы:
  - `lock_released` — статус получен, `pending=false`: удаления нет, замок снят;
  - `status_unavailable` — статус не получен и после повторов: это «нет сети».
- Проверка: `tests/account_delete_restore_prompt_retry.test.ts`.

Пока окно входа новые исходы не разбирает, они падают в прежнюю общую карточку — поведение не хуже текущего.

## Вставка в `components/RegistrationPromptModal.tsx` (Авторизация; после ветки `restore === 'declined'`)

```tsx
// зачем (владелец 18.10 «ни один вход без ошибки, кроме «нет сети»»): удаления больше нет — тихо повторяем вход.
if (restore === 'lock_released') {
  if (!autoContinueArmedRef.current) {
    autoContinueArmedRef.current = true;
    console.log(`[AUTH-RESTORE-CONTINUE] lock_released → sign-in continues provider=${provider}`); // guard-ok
    setAutoContinueProvider(provider);
    return;
  }
}
// Статус удаления не получен и после повторов — это «нет сети», тот же текст, что у остальных сетевых сбоев входа.
if (restore === 'status_unavailable') {
  setRetryProvider(provider);
  showFailureCopy(offlineTitle(lang), offlineBody(lang));
  return;
}
```

`offlineTitle` и `offlineBody` — уже существующие тексты «нет сети» окна входа: взять те, что показываются при `network`.

Онбординг (`CleanOnboarding`) — та же пара веток рядом с его `restoreOutcome === 'restore_failed'`.

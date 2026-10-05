# Прогон (Б) итог диалога — 03:02–03:04, НЕ ВЫПОЛНЕН: лимит реплик

Общение → «Поблагодарить за помощь» (social_04) → Начать диалог → реплика.

```
[ENERGY-RESTORE] spend SKIPPED (activity=ai_dialog, cost=1): unlimited, reason=dev_local_plus_override_granted
'[DIALOGUE-V2] start energy', { scenarioId: 'social_04',
'[DIALOGUE-V2] prestart', '{"event":"hit","key":"en:social_04","state":"ready","ageMs":4578}'
'[DIALOGUE-V2] session:opening → shown', { scenarioId: 'social_04', personaId: 'mila' }
'[DIALOGUE-V2] catalogue:serve', '{"studyTarget":"en","source":"cache","stale":false,"ageMs":14786272,"awaited":false}'
'[DIALOGUE-V2] start timing', '{"scenarioId":"social_04","source":"prestart_ready","ready":true,"sinceCallMs":46,"sinceTapMs":243}'
'[DIALOGUE-V2] coached:send → callable failed', { reason: 'quota_exhausted',
'[DIALOGUE-V2] turn:run → failed', { reason: 'quota_exhausted', scenarioId: 'social_04' }
```

## Вывод
- Итог диалога проверить нельзя: дневной лимит реплик исчерпан (в 00:10 было remaining 0). До completion:run не дошло. Повторить после сброса лимита (утро) или на другом dev-аккаунте.
- 🔴 НОВОЕ: при quota_exhausted отправленная реплика **молча пропадает** — поле очищается, своё сообщение не появляется, ошибки/окна «На сегодня всё» (dialogs-036) нет (DIALOGUE_quota_lost_0304.png). Человек думает, что приложение сломалось.
- 🟡 Диалог стартовал (энергия: dev override), хотя реплик 0 — лимит стоило проверить ДО старта и показать сразу.
- ✅ Раскрытая категория переделана: карточки-строки с плиткой и бейджем A1 (DIALOGUE_category_0302.png).

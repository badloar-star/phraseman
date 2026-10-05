# [MISTAKE-SESSION] counter + verdict:stage после 17be8d8c2 — 02:50–02:51 (бандл перезагружен в 02:49)

Бабуля → Wife (неверно) → Дальше → Племянница → Niece (верно) → Дальше.

```
'[MISTAKE-SESSION] counter', '{"shown":3,"initialCount":12,"cursor":7,"queueLength":16,"closedUnique":3,"answered":7,"pendingCursor":null,"pendingWouldShow":null,"feedbackShown":false}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"setState_done","sinceTapMs":3}'
'[MISTAKE-SESSION] counter', '{"shown":3,"initialCount":12,"cursor":7,"queueLength":16,"closedUnique":3,"answered":7,"pendingCursor":8,"pendingWouldShow":3,"feedbackShown":true}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":61,"correct":false,"chain":"null"}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"first_frame_after_commit","sinceTapMs":87}'
'[MISTAKE-SESSION] counter', '{"shown":3,"initialCount":12,"cursor":8,"queueLength":17,"closedUnique":3,"answered":8,"pendingCursor":null,"pendingWouldShow":null,"feedbackShown":false}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"setState_done","sinceTapMs":15}'
'[MISTAKE-SESSION] counter', '{"shown":3,"initialCount":12,"cursor":8,"queueLength":17,"closedUnique":3,"answered":8,"pendingCursor":9,"pendingWouldShow":4,"feedbackShown":true}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":57,"correct":true,"chain":"null"}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":183,"correct":true,"chain":"set"}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"first_frame_after_commit","sinceTapMs":286}'
'[MISTAKE-SESSION] counter', '{"shown":4,"initialCount":12,"cursor":9,"queueLength":17,"closedUnique":4,"answered":9,"pendingCursor":null,"pendingWouldShow":null,"feedbackShown":false}'
```

## Вывод
- ✅ Счётчик работает: после верного ответа shown 3→4 (closedUnique 3→4), после неверного остаётся 3. На входе показано 3/12 (верные ответы прошлых прогонов засчитаны).
- ✅ У «неверно» tray_committed теперь ОДИН раз (61 мс), first_frame 87 мс.
- 🟡 У «верно» tray_committed по-прежнему дважды: chain:"null" (57 мс) → chain:"set" (183 мс), first_frame 286 мс — второй коммит приходит с цепочкой. Если так задумано (цепочка дочитывается фоном) — ок.
- ✅ Точки 1·2·3 компактные, «3» больше НЕ обрезана (MISTAKE_COUNTER_right_0251.png).
- Точки все серые при верном ответе — у аккаунта цепочка дней 0, ожидаемо.
ВАЖНО: прогон 02:47 (до перезагрузки) шёл на старом бандле — его данные недействительны.

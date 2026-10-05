# [MISTAKE-SESSION] verdict:stage — 02:29–02:30

Вопрос 1 «Бабуля» → ответ Wife (неверно); вопрос 2 «Муж» → Husband (верно).

```
'[MISTAKE-SESSION] verdict:stage', '{"stage":"setState_done","sinceTapMs":3}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":51,"correct":false}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"first_frame_after_commit","sinceTapMs":75}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":373,"correct":false}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"first_frame_after_commit","sinceTapMs":379}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"setState_done","sinceTapMs":7}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":53,"correct":true}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"tray_committed","sinceTapMs":169,"correct":true}'
'[MISTAKE-SESSION] verdict:stage', '{"stage":"first_frame_after_commit","sinceTapMs":209}'
```

## Вывод
- ✅ Шторка вердикта теперь быстрая: первый кадр после коммита — 75 мс (неверно) и 209 мс (верно); setState_done 3–7 мс. Прежние 1.2–2.2 с ушли.
- 🟡 tray_committed срабатывает ДВАЖДЫ на каждый ответ (51+373 мс неверно; 53+169 мс верно), у «неверно» и first_frame дважды (75, 379) — шторка коммитится повторно (лишний ре-рендер/перемонтаж).
- 🔴 Счётчик 1/12 после верного ответа не сдвинулся (второй вопрос и шторка «Верно» показывают 1/12).
- 🟡 Точки-шаги 1·2·3 все серые после верного ответа, «3» обрезана правым краем (как в 22:36).
Снимки: MISTAKE_STAGES_wrong_0229.png, MISTAKE_STAGES_right_0230.png. Сырой файл: C:\Temp\claude\mistake_verdict_stages.txt.

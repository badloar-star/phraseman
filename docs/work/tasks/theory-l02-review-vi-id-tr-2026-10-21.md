# Теория урока 2 — вычитка vi, id, tr (Переводчик → 12 · ТЕОРИЯ)

Governance-ID: TG-3371923419EA
Status: Ready for 12 · ТЕОРИЯ
Owner: «10 · ПЕРЕВОДЧИК» (вычитка); правка файлов — 12 · ТЕОРИЯ
Источник: коммит 9c17667dc, `docs/work/theory_drafts/lesson_02_{vi,id,tr}.md`

## Общий вывод

Все три текста сильные: ловушки урока выбраны точно (vi — «…không?» в конце и вопросительное слово в конце;
id — «apakah» и «Dia di mana?»; tr — «mı/mi» и «değil» в конце). Ошибок носителя: vi — 1, id — 2, tr — 3.
Общая для всех трёх неуклюжая фраза — в tip §06 («короткое "да" не кончается краткой формой»).

---

## A. Ошибки носителя (обязательно исправить)

### vi
1. §06 tip: «Chữ «có» ngắn không kết thúc bằng dạng gọn» — «chữ» здесь не годится, фраза ломается.
   → **«Câu trả lời «có» ngắn không kết thúc bằng dạng rút gọn: …»**

### id
1. §08 заголовок: «**Dulu** «ya» atau «tidak», baru kenyataannya» — «dulu» читается как «раньше, когда-то» (то же было в уроке 1).
   → **«Pertama «ya» atau «tidak», baru kenyataannya»**
2. §06 tip: ««Ya» yang pendek tidak diakhiri bentuk singkat» — без существительного непонятно.
   → **«Jawaban «ya» yang pendek tidak diakhiri bentuk singkat: …»**

### tr
1. §06 «Is she carsick? — **Onu araba mı tuttu?**» — с «mı» после «araba» смысл «её укачало именно в машине?».
   → **«Onu araba tuttu mu?»**
2. §08 «Is it bent? — **Eğilmiş mi?**» — «eğilmiş» = наклонился/склонился. → **«Bükülmüş mü?»**
3. §06 tip: «Kısa «evet» kısa biçimle bitmez» — повтор «kısa» и неясно, о чём речь.
   → **«Kısa «evet» cevabı kısaltmayla bitmez: …»**

---

## B. Стоит улучшить

### vi
- «Am I welcome? — Ở đây có chào đón tôi không?» (§04, §05, §12) — дословно. → **«Tôi có được chào đón không?»**
- §05 «Is he energetic? — Anh ấy có **khỏe khoắn** không?» — «khỏe khoắn» = крепкий, здоровый. → **«Anh ấy có năng động không?»**
- §09/§10 «Who is missing? — Ai vắng?» и «Who is absent? — Ai không đến?» почти одинаковы. → **missing «Còn thiếu ai?»**, **absent «Ai vắng mặt?»**
- §03 «I'm not convinced. — Tôi chưa bị thuyết phục.» — калька пассива. → **«Tôi vẫn chưa tin lắm.»**

### id
- **«penjepit» (прищепка)** во всех местах (§02 body, подписи ячеек §04/§09, §05, §06, §13) — как и в уроке 1: → **«penghubung»**.
- «Am I welcome? — Apakah aku **disambut** di sini?» (§04, §05, §12) — «disambut» = «меня встречают». → **«Apakah aku diterima di sini?»**
- §05 «Are they extra? — Itu kelebihan?» — неясно. → **«Itu sisa?»** / «Itu lebihan?»
- §08 «cuma belum **dicolok**» — разговорно-джакартское. → **«belum dicolokkan»**

### tr
- «Am I welcome?» — §04/§12 «Beni burada istiyorlar mı?», §05 «Burada istenir miyim?» — два разных и оба тяжёлые.
  Одно идиоматичное для всех мест: **«Burada hoş karşılanır mıyım?»**
- §03 «I'm not confident. — Kendime güvenmiyorum.» — звучит сильнее («не доверяю себе»). → **«Kendimden emin değilim.»**

## Верно без правок

Вся структура, все drill и метки ячеек (кроме «penjepit» в id); vi/tr §09–§11; id §09–§11.
Во всех трёх правильно объяснено, что `It's / He's` нельзя ставить в начало вопроса (§11 tip).

## Scope / Architecture / Security and privacy

Только тексты черновиков. Без кода. Данные не затрагиваются.

## Technical debt

- Вычитка не заменяет носителя.

## Verification

Автор применяет правки в `lesson_02_{vi,id,tr}.md`; en/es/pt-BR/pl/uk — следующим файлом.

## Rollback

Удалить файл.

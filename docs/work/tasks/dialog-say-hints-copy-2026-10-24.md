# Диалоги · подсказки «что можно сказать» — интерфейсные строки на 9 языках (Переводчик → 2 · ДИЗАЙН)

Status: Черновик ключей — согласовать имена с 2 · ДИЗАЙН; тексты готовы
Owner: «10 · ПЕРЕВОДЧИК» (координатор 24.10, по слову владельца)

Подсказки в сессии диалога: несколько готовых реплик, которые можно вставить в поле ответа. Сами реплики — контент (сервер /
сценарий), здесь только оболочка. Стиль — как соседние подписи `app/dialogue_v2_session_coaching_labels.ts`
(«Подсказка», «Почему так», «Лучше так»). На «ты», без рода. Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl.

| ключ (предложение) | где | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|---|
| sayHintsTitle | заголовок блока | Что можно сказать | Що можна сказати | What you could say | Qué puedes decir | O que você pode dizer | Bạn có thể nói | Yang bisa kamu katakan | Söyleyebileceklerin | Co możesz powiedzieć |
| sayHintsTapToInsert | подпись под заголовком / подсказка первого раза | Нажми, чтобы вставить | Натисни, щоб вставити | Tap to insert | Toca para insertar | Toque para inserir | Chạm để chèn | Ketuk untuk menyisipkan | Eklemek için dokun | Dotknij, aby wstawić |
| sayHintsInsertA11y | чтец на кнопке реплики | Вставить: {phrase} | Вставити: {phrase} | Insert: {phrase} | Insertar: {phrase} | Inserir: {phrase} | Chèn: {phrase} | Sisipkan: {phrase} | Ekle: {phrase} | Wstaw: {phrase} |
| sayHintsShow | кнопка показать | Подсказать фразу | Підказати фразу | Suggest a phrase | Sugerir una frase | Sugerir uma frase | Gợi ý một câu | Sarankan kalimat | Cümle öner | Podpowiedz zdanie |
| sayHintsHide | кнопка скрыть | Скрыть подсказки | Сховати підказки | Hide suggestions | Ocultar sugerencias | Ocultar sugestões | Ẩn gợi ý | Sembunyikan saran | Önerileri gizle | Ukryj podpowiedzi |
| sayHintsMore | ещё варианты | Другие варианты | Інші варіанти | Other options | Otras opciones | Outras opções | Lựa chọn khác | Pilihan lain | Başka seçenekler | Inne warianty |
| sayHintsUnavailable | нет сети / сервер не дал | Подсказки сейчас недоступны | Підказки зараз недоступні | Suggestions aren’t available right now | Las sugerencias no están disponibles ahora | As sugestões não estão disponíveis agora | Hiện chưa có gợi ý | Saran belum tersedia saat ini | Öneriler şu an kullanılamıyor | Podpowiedzi są teraz niedostępne |
| sayHintsEditNote | после вставки (тихая строка) | Можно поменять перед отправкой | Можна змінити перед надсиланням | You can edit it before sending | Puedes cambiarla antes de enviar | Você pode mudar antes de enviar | Có thể sửa trước khi gửi | Bisa diubah sebelum dikirim | Göndermeden önce değiştirebilirsin | Możesz zmienić przed wysłaniem |

Примечания:
- «Подсказка» как слово уже есть (`coachingLabels.hint`). Для этого блока — «Что можно сказать» / «Подсказать фразу»,
  чтобы не путать с подсказкой о задаче («Подсказка: что сделать дальше»).
- Замер Inter на 360 dp: заголовок 16/700 — самое длинное en «What you could say» ≈ 150 dp, pt-BR «O que você pode dizer» ≈ 175 dp —
  влезает в строку. Кнопки 15/600 — максимум es «Ocultar sugerencias» ≈ 155 dp. `sayHintsUnavailable` и `sayHintsEditNote`
  переносятся.
- Если в макете Дизайна другие подписи — пришлите ru, переведу точно под них. Новые подписи к макету не добавляю.

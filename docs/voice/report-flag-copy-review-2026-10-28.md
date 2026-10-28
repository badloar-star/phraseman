# Флаг «Пожаловаться»: ревизия текстов на 9 языках (Переводчик, 28.10)

Для: координатор, Дизайн. Проверено: все места, где флаг уже есть, — `ReportErrorButton` (уроки, Шпиль, Диалоги, экзамен главы через `ContentReportFlag`),
`ExplainReportButton`, жалобы на набор, комментарий и игрока. Подписи флажка на месте (`label`) — экзамен главы и Диалоги.

**Итог:** тексты есть на всех 9 языках во всех местах. Пропусков нет. Ниже — что неестественно или расходится по смыслу.

## Внесено (чистые файлы)

| Файл | Язык | Было | Стало | Почему |
|---|---|---|---|---|
| ReportPackModal, ReportCommentModal, ReportUserModal | es | el reporte / Reporte enviado | la denuncia / Denuncia enviada | в тех же окнах «Denuncia enviada» — одно слово для жалобы |
| ReportPackModal | es | Spam | Spam o sin sentido | во всех языках «спам / бессмыслица» |
| ReportPackModal | es | Contenido sexual | Contenido explícito | по смыслу ru «Откровенный контент» |
| ReportPackModal, PackMoreMenu | en / es / id | Report the pack / Reportar el pack / Laporkan pack | Report this pack / Denunciar el pack / Laporkan paket | одинаково во всех 5 местах «Пожаловаться на набор» |
| ReportUserModal | tr | Takma adı şikayet et? / Oyuncuyu şikayet et? | Takma ad şikayet edilsin mi? / Oyuncu şikayet edilsin mi? | повелительное наклонение с вопросом звучит как ошибка |
| ReportPackModal, ReportCommentModal | uk | необов'язково | необов’язково | типографский апостроф, как во всём приложении |
| ReportCommentModal (голосовая подпись поля) | en / vi / id / tr | Report comment / Bình luận báo cáo / Komentar laporan / Şikayet yorumu | Comment for the report / Ghi chú cho báo cáo / Catatan untuk laporan / Şikayet notu | читалось как «пожаловаться на комментарий»; сторож `pm107` обновлён |

## Предложено (файлы держат другие сессии — не правил)

| Файл | Строка | Язык | Было | Стало | Почему |
|---|---|---|---|---|---|
| components/ReportErrorButton.tsx | заголовок формы (2 места) | ru / uk / pl | Нашёл ошибку? / Знайшов помилку? / Znalazłeś błąd? | Есть ошибка? / Є помилка? / Widzisz błąd? | мужской род — пол человека не знаем |
| components/ReportErrorButton.tsx | «подожди минуту» | ru / uk | Ты уже отправил репорт меньше минуты назад… / Ти вже надіслав(ла) репорт… | Сообщение уже ушло меньше минуты назад. Попробуй через минуту. / Повідомлення вже надіслано менше хвилини тому. Спробуй за хвилину. | мужской род, «(ла)», жаргон «репорт» |
| components/ReportErrorButton.tsx | кнопка во время отправки | ru / uk / все | Отправляю... / Надсилаю... | Отправляем… / Надсилаємо… (и «…» вместо «...» во всех 9) | рядом «Отправляем в фоне»; в ExplainReportButton уже так |
| components/ReportErrorButton.tsx | подзаголовок формы | vi | bọn mình sẽ sửa | chúng mình sẽ sửa | на соседней строке «Chúng mình» |
| app/flashcards/CollectionHeaderV2.tsx, app/flashcards_collection.tsx | «Пожаловаться на набор» | uk / tr | Поскаржитись / Seti bildir | Поскаржитися / Paketi şikayet et | одна форма во всех 5 местах |
| app/flashcards/FlashcardsCategoryHub.tsx | «Пожаловаться на набор» | en / es / tr | Report the pack / Reportar el pack / Paketi bildir | Report this pack / Denunciar el pack / Paketi şikayet et | то же |

## Стиль для новых строк Дизайна

- Кнопка-флажок без текста; голосовая подпись — «Сообщить об ошибке в …» (задании, диалоге): en «Report an error in the …», es «Informar de un error en …», pl «Zgłoś błąd w …».
- Жалоба на человека или контент — «Пожаловаться на …»: uk «Поскаржитися», en «Report this …», es «Denunciar», pt-BR «Denunciar», vi «Báo cáo», id «Laporkan», tr «… şikayet et», pl «Zgłoś».
- Слово для жалобы: es «denuncia», pt-BR «denúncia», tr «şikayet», pl «zgłoszenie». Без «репорта».
- Без рода: «Есть ошибка?», а не «Нашёл ошибку?». На «ты». Многоточие «…».

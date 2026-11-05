# Рекорд этажа (Пик): тексты для Переводчика — 29.10, сессия «4 · ТЕМЫ»

Файлы-сироты Codex: `components/spire/SpireFloorRecord.tsx` (37 строк с текстом), `components/spire/SpireRecordAttempt.tsx` (10 строк). Обе вне git. Тексты сейчас заданы как
`uk ? 'укр' : 'рус'`, поэтому en, es, pt-BR, vi, id, tr, pl показывают русский. Просьба Переводчику: перевести за один проход на все 9 языков интерфейса
(ru, uk — уже есть; en, es, pt-BR, vi, id, tr, pl — нужны). После перевода я заменяю тернарники на `triLang(lang, {…})` (как в остальном интерфейсе) и добавляю тест
«все 9 языков заданы, нет русского у не-ru/uk». В коммит файлы не идут до этого.

Ограничения: короткие строки — плашка карточки в одну строку (`maxLines=1`), подписи кнопок влезают в 52 dp высоты; «10/10» — число заданий, не менять; `{время}` формата `m:ss` подставляется кодом.

## Фразы (ключ → русский / украинский)

| № | Где | Русский | Украинский |
| --- | --- | --- | --- |
| 1 | заголовок карточки/шторки | Рекорд этажа | Рекорд поверху |
| 2 | сводка: загрузка | Загрузка… | Завантаження… |
| 3 | сводка: недоступно | Временно недоступен | Тимчасово недоступний |
| 4 | сводка: рекорд мой (перед временем) | Ваш | Ваш |
| 5 | сводка: рекорд чужой, без имени | Участник | Учасник |
| 6 | сводка: рекорда нет | Станьте первым | Станьте першим |
| 7 | итог: рекорд мой | Рекорд ваш! 10/10 верно. | Рекорд ваш! 10/10 правильно. |
| 8 | итог: рекорд не побит | 10/10 верно. Рекорд пока не побит. | 10/10 правильно. Рекорд поки не побито. |
| 9 | ошибка: попытка недействительна | Попытка больше не действительна. Начните новую. | Спроба більше не дійсна. Почніть нову. |
| 10 | ошибка: результат не подтверждён | Результат ещё не подтверждён. Повторите сохранение. | Результат ще не підтверджено. Повторіть збереження. |
| 11 | ошибка: старт недоступен | Попытка сейчас недоступна. Попробуйте позже. | Спроба зараз недоступна. Спробуйте пізніше. |
| 12 | кнопка закрыть шторку | Закрыть | Закрити |
| 13 | шторка: «10/10 верно» (строка рекорда) | 10/10 верно | 10/10 правильно |
| 14 | шторка: мой лучший (перед временем) | Ваш лучший: | Ваш найкращий: |
| 15 | шторка: правила | Эта комната · эта неделя. Одинаковые 10 заданий для всех. Побеждает меньшее время; ничья сохраняет владельца. Без наград и изменений прогресса. | Ця кімната · цей тиждень. Однакові 10 завдань для всіх. Перемагає менший час; нічия зберігає власника. Без нагород і змін прогресу. |
| 16 | шторка: пояснение таймера | После старта время идёт без пауз, даже в фоне. | Після старту час іде без пауз, навіть у фоні. |
| 17 | кнопка: сохранить | Сохранить результат | Зберегти результат |
| 18 | кнопка: старт | Попробовать | Спробувати |
| 19 | кнопка: обновить | Обновить | Оновити |
| 20 | попытка: выйти | Выйти | Вийти |
| 21 | попытка: заголовок | Попытка рекорда | Спроба рекорду |
| 22 | попытка: провал, заголовок | Для рекорда нужно 10/10 | Рекорд потребує 10/10 |
| 23 | попытка: провал, пояснение | Эта попытка завершена. Можно попробовать снова. | Цю спробу завершено. Можна спробувати знову. |
| 24 | попытка: к рекорду | К рекорду | До рекорду |

Все 24 строки сверены с исходниками дословно (29.10).
Нет ничего про данные: тексты не собирают и не передают персональных данных (Privacy Policy не затронута).

## Перевод — Переводчик, 29.10

Термины по словарю `docs/voice/glossary-9-languages.md`: этаж — floor / piso / andar / tầng / lantai / kat / piętro. Обращение — как везде в приложении для этих языков: es «tú», pt-BR «você», pl «ty», tr — повелительное без «siz»; ru/uk у вас на «вы» — оставил как есть. «10/10» и `{время}` не трогал. Короткие строки (1–6, 12, 17–21, 24) проверены на длину: не длиннее русских, кроме vi/pl — там +1–3 знака, в одну строку плашки влезает.

| № | en | es | pt-BR | vi | id | tr | pl |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Floor record | Récord del piso | Recorde do andar | Kỷ lục tầng | Rekor lantai | Kat rekoru | Rekord piętra |
| 2 | Loading… | Cargando… | Carregando… | Đang tải… | Memuat… | Yükleniyor… | Ładowanie… |
| 3 | Temporarily unavailable | No disponible por ahora | Indisponível no momento | Tạm thời không khả dụng | Sementara tidak tersedia | Geçici olarak kullanılamıyor | Chwilowo niedostępny |
| 4 | Yours | Tuyo | Seu | Của bạn | Milikmu | Senin | Twój |
| 5 | Player | Participante | Participante | Người chơi | Peserta | Katılımcı | Uczestnik |
| 6 | Be the first | Sé el primero | Seja o primeiro | Hãy là người đầu tiên | Jadilah yang pertama | İlk sen ol | Bądź pierwszy |
| 7 | The record is yours! 10/10 correct. | ¡El récord es tuyo! 10/10 correctas. | O recorde é seu! 10/10 certas. | Kỷ lục là của bạn! Đúng 10/10. | Rekor milikmu! 10/10 benar. | Rekor senin! 10/10 doğru. | Rekord należy do ciebie! 10/10 poprawnie. |
| 8 | 10/10 correct. The record still stands. | 10/10 correctas. El récord sigue en pie. | 10/10 certas. O recorde continua de pé. | Đúng 10/10. Kỷ lục vẫn chưa bị phá. | 10/10 benar. Rekor belum terpecahkan. | 10/10 doğru. Rekor henüz kırılmadı. | 10/10 poprawnie. Rekord nie został jeszcze pobity. |
| 9 | This attempt is no longer valid. Start a new one. | Este intento ya no es válido. Empieza uno nuevo. | Esta tentativa não vale mais. Comece uma nova. | Lượt thử này không còn hiệu lực. Hãy bắt đầu lượt mới. | Percobaan ini sudah tidak berlaku. Mulai yang baru. | Bu deneme artık geçerli değil. Yeni bir tane başlat. | Ta próba jest już nieważna. Zacznij nową. |
| 10 | Result not confirmed yet. Save again. | El resultado aún no está confirmado. Guárdalo de nuevo. | O resultado ainda não foi confirmado. Salve de novo. | Kết quả chưa được xác nhận. Hãy lưu lại. | Hasil belum dikonfirmasi. Simpan lagi. | Sonuç henüz onaylanmadı. Yeniden kaydet. | Wynik nie został jeszcze potwierdzony. Zapisz ponownie. |
| 11 | The attempt isn't available right now. Try again later. | El intento no está disponible ahora. Inténtalo más tarde. | A tentativa não está disponível agora. Tente mais tarde. | Lượt thử hiện không khả dụng. Hãy thử lại sau. | Percobaan belum tersedia. Coba lagi nanti. | Deneme şu an kullanılamıyor. Daha sonra tekrar dene. | Próba jest teraz niedostępna. Spróbuj później. |
| 12 | Close | Cerrar | Fechar | Đóng | Tutup | Kapat | Zamknij |
| 13 | 10/10 correct | 10/10 correctas | 10/10 certas | Đúng 10/10 | 10/10 benar | 10/10 doğru | 10/10 poprawnie |
| 14 | Your best: | Tu mejor: | Seu melhor: | Tốt nhất của bạn: | Terbaikmu: | En iyin: | Twój najlepszy: |
| 15 | This room · this week. The same 10 tasks for everyone. The shortest time wins; a tie keeps the current holder. No rewards and no change to your progress. | Esta sala · esta semana. Las mismas 10 tareas para todos. Gana el menor tiempo; en caso de empate, el récord sigue con quien lo tiene. Sin premios ni cambios en tu progreso. | Esta sala · esta semana. As mesmas 10 tarefas para todos. Vence o menor tempo; em caso de empate, o recorde fica com quem já o tem. Sem prêmios e sem mudar seu progresso. | Phòng này · tuần này. 10 câu hỏi như nhau cho mọi người. Ai nhanh nhất thì thắng; hòa thì người giữ kỷ lục vẫn giữ. Không có thưởng và không đổi tiến độ. | Ruangan ini · minggu ini. 10 tugas yang sama untuk semua. Waktu tercepat menang; jika seri, pemegang rekor tetap. Tanpa hadiah dan tanpa perubahan progres. | Bu oda · bu hafta. Herkes için aynı 10 görev. En kısa süre kazanır; eşitlikte rekor sahibinde kalır. Ödül yok, ilerlemen değişmez. | Ten pokój · ten tydzień. Te same 10 zadań dla wszystkich. Wygrywa najkrótszy czas; przy remisie rekord zostaje u obecnego właściciela. Bez nagród i bez zmian w postępach. |
| 16 | Once you start, the timer runs nonstop, even in the background. | Al empezar, el tiempo corre sin pausas, incluso en segundo plano. | Depois de começar, o tempo corre sem pausas, mesmo em segundo plano. | Sau khi bắt đầu, thời gian chạy liên tục, kể cả khi ở chế độ nền. | Setelah mulai, waktu terus berjalan tanpa jeda, bahkan di latar belakang. | Başladıktan sonra süre arka planda bile durmadan işler. | Po starcie czas biegnie bez przerw, nawet w tle. |
| 17 | Save result | Guardar resultado | Salvar resultado | Lưu kết quả | Simpan hasil | Sonucu kaydet | Zapisz wynik |
| 18 | Try it | Intentar | Tentar | Thử | Coba | Dene | Spróbuj |
| 19 | Refresh | Actualizar | Atualizar | Làm mới | Muat ulang | Yenile | Odśwież |
| 20 | Leave | Salir | Sair | Thoát | Keluar | Çık | Wyjdź |
| 21 | Record attempt | Intento de récord | Tentativa de recorde | Lượt thử kỷ lục | Percobaan rekor | Rekor denemesi | Próba rekordu |
| 22 | A record needs 10/10 | Para el récord hace falta 10/10 | Para o recorde é preciso 10/10 | Cần đúng 10/10 để lập kỷ lục | Rekor butuh 10/10 | Rekor için 10/10 gerekir | Do rekordu potrzeba 10/10 |
| 23 | This attempt is over. You can try again. | Este intento terminó. Puedes intentarlo de nuevo. | Esta tentativa terminou. Você pode tentar de novo. | Lượt thử này đã kết thúc. Bạn có thể thử lại. | Percobaan ini selesai. Kamu bisa mencoba lagi. | Bu deneme bitti. Tekrar deneyebilirsin. | Ta próba się zakończyła. Możesz spróbować ponownie. |
| 24 | Back to the record | Volver al récord | Voltar ao recorde | Về kỷ lục | Kembali ke rekor | Rekora dön | Wróć do rekordu |

Замечания:
- № 5 «Участник» — имя скрыто; en «Player» короче и понятнее, чем «Participant».
- № 6 es/pt/pl «Sé el primero / Seja o primeiro / Bądź pierwszy» — мужской род по норме языка (обращение к неизвестному). Если нужен совсем без рода: es «Pon el primer récord», pt «Faça o primeiro recorde», pl «Ustanów pierwszy rekord».
- № 8 «Рекорд пока не побит» понимаю как «вы прошли 10/10, но рекорд не побили» (время хуже). en «The record still stands» передаёт именно это. Если смысл другой — скажите, поправлю все языки.
- № 15 длинная, в шторке переносится — ограничения по длине у неё нет.
- Когда замените тернарники на triLang: ключ португальского — `'pt-BR'`. Сторож ключей (5f04a4f03) остановит `pt:` / `ptBr:` прямо в triLang.

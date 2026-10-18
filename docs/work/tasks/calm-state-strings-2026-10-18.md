# Task packet: спокойные строки вместо экранов-ошибок — общий набор на 9 языков (координатор 08:01)

Governance-ID: TG-74F0DF51BE36
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

Готовый набор коротких спокойных фраз на 9 языков для кэш- и пустых состояний — без слов «ошибка / недоступно / не удалось». Сайт, Дизайн, Моменты, Ядро и Авторизация берут строку отсюда целиком (или просят новую), а не пишут свою. Обращение на «ты», без системных слов.

## Scope

In scope: этот документ (набор строк); вычитка строк, которые пришлют сессии; плашка «Продолжить» вариант Г у Тем — после их коммита.

Out of scope: код экранов (вносят владельцы файлов).

## Architecture

No architecture change: документ-справочник строк.

## Security and privacy

Не применимо.

## Technical debt

- Строки не вынесены в общий модуль словаря — Accept temporarily: каждая сессия вставляет фразу в свой файл; общий модуль спокойных состояний — после релиза.

## Verification

- Каждая строка: 9 языков, без «ошибка/недоступно/не удалось/error/failed/unavailable», без системных слов, на «ты».
- Строки, которые внесут сессии, сверяю по их коммитам.

## Rollback

Удалить документ.

---

## Набор строк

Ключ — смысл; ru · uk · en · es · pt-BR · vi · id · tr · pl.

### A. Показываем сохранённое, обновится само (кэш есть, сети нет)
- ru «Показываем последнее сохранённое — обновим, когда появится связь»
- uk «Показуємо останнє збережене — оновимо, коли з’явиться зв’язок»
- en «Showing what you last saw — we’ll refresh when you’re back online»
- es «Te mostramos lo último guardado; lo actualizaremos cuando vuelva la conexión»
- pt-BR «Mostrando o que foi salvo por último — atualizamos quando a conexão voltar»
- vi «Đang hiện nội dung đã lưu — sẽ cập nhật khi có mạng lại»
- id «Menampilkan yang terakhir tersimpan — kami perbarui saat koneksi kembali»
- tr «Son kaydedilen gösteriliyor — bağlantı gelince güncelleriz»
- pl «Pokazujemy ostatnio zapisane — odświeżymy, gdy wróci połączenie»

### B. Короткая подпись «обновится позже» (для плашки)
- ru «Обновим чуть позже» · uk «Оновимо трохи пізніше» · en «We’ll update this shortly» · es «Lo actualizamos en un momento» · pt-BR «Atualizamos daqui a pouco» · vi «Sẽ cập nhật sau ít phút» · id «Sebentar lagi kami perbarui» · tr «Birazdan güncelleriz» · pl «Zaktualizujemy za chwilę»

### C. Пусто, первый вход без кэша (ещё ничего нет)
- ru «Здесь пока пусто» · uk «Тут поки порожньо» · en «Nothing here yet» · es «Aquí todavía no hay nada» · pt-BR «Ainda não tem nada aqui» · vi «Chưa có gì ở đây» · id «Belum ada apa-apa di sini» · tr «Burada henüz bir şey yok» · pl «Na razie nic tu nie ma»

### D. Нет связи, кэша нет — что делать
- ru «Нужен интернет — подключись, и всё появится» · uk «Потрібен інтернет — підключись, і все з’явиться» · en «Connect to the internet and it’ll show up» · es «Conéctate a internet y aparecerá» · pt-BR «Conecte-se à internet e tudo aparece» · vi «Hãy kết nối mạng, nội dung sẽ hiện ra» · id «Sambungkan ke internet, nanti semuanya muncul» · tr «İnternete bağlan, hepsi görünecek» · pl «Połącz się z internetem, a wszystko się pojawi»

### E. Кнопка повтора (вместо «Повторить / Попробовать снова» после сбоя)
- ru «Обновить» · uk «Оновити» · en «Refresh» · es «Actualizar» · pt-BR «Atualizar» · vi «Làm mới» · id «Muat ulang» · tr «Yenile» · pl «Odśwież»

### F. Действие ещё отправляется (оптимистичный показ)
- ru «Сохраним, как только появится связь» · uk «Збережемо, щойно з’явиться зв’язок» · en «We’ll save it as soon as you’re online» · es «Lo guardaremos en cuanto haya conexión» · pt-BR «Vamos salvar assim que a conexão voltar» · vi «Sẽ lưu ngay khi có mạng» · id «Akan kami simpan begitu ada koneksi» · tr «Bağlantı gelir gelmez kaydederiz» · pl «Zapiszemy, gdy tylko wróci połączenie»

### G. Раздел скоро откроется (вместо «недоступно» для закрытого/неготового)
- ru «Скоро появится» · uk «Незабаром з’явиться» · en «Coming soon» · es «Muy pronto» · pt-BR «Em breve» · vi «Sắp ra mắt» · id «Segera hadir» · tr «Yakında» · pl «Już wkrótce»

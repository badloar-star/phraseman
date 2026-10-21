# «Эпизод» вместо «Занятие/Сессия» в Learning V2 — готовые строки на 9 языках (Переводчик)

Governance-ID: TG-95BEED25B832
Status: Ready for Learning V2
Owner: сессия «10 · ПЕРЕВОДЧИК» (строки); вставка в код — сессия Learning V2 (файлы у неё в работе)

## Outcome

Готовые строки для `app/learning_v2_session_copy.ts`, `horizon_result_glass_copy.ts`,
`app/(tabs)/lessons.tsx`, `components/lesson_exit/lesson_exit_strings.ts`. Порядок языков:
ru · uk · en · es · pt-BR · vi · id · tr · pl.

Словарь: эпизод — Эпизод · Епізод · Episode · Episodio · Episódio · Tập · Episode · Bölüm · Odcinek.
Глава — Глава · Розділ · Chapter · Capítulo · Capítulo · Chương · Bab · Ünite · Rozdział.
Турецкий «Ünite» для главы естественен: так называются разделы в школьных программах и
в учебных приложениях; «Bölüm» при этом свободно для эпизода (так называют серию).

## Строки

| Смысл | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| Эпизод N | Эпизод N | Епізод N | Episode N | Episodio N | Episódio N | Tập N | Episode N | Bölüm N | Odcinek N |
| Глава N | Глава N | Розділ N | Chapter N | Capítulo N | Capítulo N | Chương N | Bab N | Ünite N | Rozdział N |
| Эпизод пройден | Эпизод пройден | Епізод пройдено | Episode complete | Episodio completado | Episódio concluído | Hoàn thành tập | Episode selesai | Bölüm tamamlandı | Odcinek ukończony |
| Глава закрыта | Глава закрыта | Розділ закрито | Chapter complete | Capítulo cerrado | Capítulo concluído | Đã xong chương | Bab selesai | **Ünite tamamlandı** | Rozdział zamknięty |
| Эпизод недоступен | Эпизод недоступен | Епізод недоступний | Episode unavailable | Episodio no disponible | Episódio indisponível | Không mở được tập này | Episode tidak tersedia | Bölüm açılamıyor | Odcinek jest niedostępny |
| Закрыть эпизод | Закрыть эпизод | Закрити епізод | Close episode | Cerrar episodio | Fechar episódio | Đóng tập | Tutup episode | Bölümü kapat | Zamknij odcinek |
| Завершить эпизод | Завершить эпизод | Завершити епізод | Finish episode | Terminar episodio | Concluir episódio | Kết thúc tập | Selesaikan episode | Bölümü bitir | Zakończ odcinek |
| …эпизод продолжится | Задание получит ноль звёзд, эпизод продолжится | Завдання отримає нуль зірок, епізод продовжиться | This task will get zero stars and the episode will continue | La tarea recibirá cero estrellas y el episodio continuará | A tarefa receberá zero estrelas e o episódio continuará | Bài tập nhận 0 sao và tập học tiếp tục | Tugas mendapat nol bintang dan episode berlanjut | Görev sıfır yıldız alır ve bölüm devam eder | Zadanie otrzyma zero gwiazdek, a odcinek będzie kontynuowany |
| Идеальный эпизод… | **Идеальный эпизод — все звёзды результата твои.** | Ідеальний епізод — усі зірки результату твої. | Perfect episode — you collected every star. | Episodio perfecto: conseguiste todas las estrellas. | Episódio perfeito: você ganhou todas as estrelas. | Tập học hoàn hảo — bạn đã nhận đủ sao. | Episode sempurna — semua bintang terkumpul. | Kusursuz bölüm — tüm yıldızları topladın. | Idealny odcinek — zdobyto wszystkie gwiazdki. |
| …в этом эпизоде | Собрано N из 36 звёзд в этом эпизоде | Зібрано N з 36 зірок у цьому епізоді | Collected N of 36 stars in this episode | N de 36 estrellas en este episodio | N de 36 estrelas neste episódio | Đã nhận N/36 sao trong tập này | N dari 36 bintang di episode ini | Bu bölümde 36 yıldızın N tanesi toplandı | Zdobyto N z 36 gwiazdek w tym odcinku |
| плашка 24+ звёзд | СИЛЬНЫЙ ЭПИЗОД | СИЛЬНИЙ ЕПІЗОД | STRONG EPISODE | EPISODIO SÓLIDO | EPISÓDIO FORTE | TẬP HỌC TỐT | EPISODE KUAT | GÜÇLÜ BÖLÜM | MOCNY ODCINEK |
| не подготовился | Эпизод не подготовился. Проверь связь и попробуй ещё раз | Епізод не підготувався. Перевір зв'язок і спробуй ще раз | The episode didn't load. Check your connection and try again | El episodio no se cargó. Revisa tu conexión e inténtalo de nuevo | O episódio não carregou. Verifique a conexão e tente de novo | Tập học chưa tải xong. Kiểm tra kết nối và thử lại | Episode gagal dimuat. Periksa koneksi lalu coba lagi | Bölüm yüklenmedi. Bağlantını kontrol edip tekrar dene | Odcinek się nie wczytał. Sprawdź połączenie i spróbuj ponownie |
| ещё в работе | Эпизод ещё в работе | Епізод ще в роботі | This episode is still in progress | Este episodio todavía está en preparación | Este episódio ainda está em preparação | Tập này vẫn đang được hoàn thiện | Episode ini masih dalam pengerjaan | Bu bölüm hâlâ hazırlanıyor | Ten odcinek jest jeszcze przygotowywany |

## Шторка выхода (`lesson_exit_strings.ts`) — сверено

- `titleEpisode`, `stay` — верны на всех 9 языках; форма кнопок совпадает с соседними `leave`
  (pl «Zostań»/«Wyjdź», tr «Kal»/«Çık», es «Quedarme»/«Salir»).
- `bodyEpisode` — одна правка, pl: «Postęp zostanie zapisany — wrócisz **do tego miejsca**.»
  (было «w to miejsce» — так не говорят о месте в уроке).

## Найденные ошибки

1. `horizon_result_glass_copy.ts` `chapterDone` tr «Bölüm kapandı» — теперь «Bölüm» значит эпизод;
   нужно «Ünite tamamlandı».
2. `learning_v2_session_copy.ts` ru `perfectBody` «ты собрал все звёзды» — мужской род (D188);
   предложено «Идеальный эпизод — все звёзды результата твои.».
3. `learning_v2_session_copy.ts` tr `repeatWithoutGrade` «Sesi değerlendirmeden devam et» —
   здесь «ses» = голос (не «сессия»), строка верна, менять не нужно.

## Scope / Architecture / Security and privacy

Только тексты. Без изменения логики. Данные не затрагиваются.

## Technical debt

- Переводы не проверены носителями — как и остальные строки файлов.

## Verification

Сессия Learning V2 после вставки прогоняет свои тесты текстов (`tests/*learning_v2*copy*`).

## Rollback

Удалить файл.

## Дополнение 21.10 (вечер): «Не могу говорить», шторка голоса, карточка «Продолжить»

### «Не могу говорить» — сверено, верно на 9 языках

`app/learning_v2_direct_session_player_v1.tsx:3831` и `LearningV2VoiceHeadsupSheet.tsx:98`:
Не могу говорить · Не можу говорити · Can't speak now · Ahora no puedo hablar · Não posso falar agora ·
Không thể nói lúc này · Tidak bisa bicara sekarang · Şu an konuşamam · Nie mogę teraz mówić — менять не нужно.

### Шторка «Голоса не хватит» (`LearningV2VoiceHeadsupSheet.tsx`, copyFor) — всё ещё «занятие/session»

В плеере нового курса это эпизод. Замена `title` и начала `lead`/`leadByForm` (окончания и остальное — как есть):

| | title | начало lead (дальше без изменений) |
|---|---|---|
| ru | Голоса на весь эпизод не хватит | В этом эпизоде есть задания с голосом, а на сегодня у тебя осталось / осталась |
| uk | Голосу на весь епізод не вистачить | У цьому епізоді є завдання з голосом, а на сьогодні в тебе залишилося / залишилася |
| en | Not enough voice attempts for this episode | This episode has voice tasks, and you have |
| es | Te faltan intentos de voz para este episodio | Este episodio tiene tareas de voz y hoy te quedan / queda |
| pt-BR | Faltam tentativas de voz para este episódio | Este episódio tem tarefas de voz e hoje você tem |
| vi | Không đủ lượt nói cho cả tập học | Tập học này có bài nói, nhưng hôm nay bạn chỉ còn |
| id | Percobaan suara tak cukup untuk episode ini | Episode ini punya tugas suara, dan hari ini kamu punya |
| tr | Ses hakkın bu bölüme yetmeyecek | Bu bölümde sesli görevler var, bugün ise |
| pl | Głosu nie starczy na cały odcinek | W tym odcinku są zadania głosowe, a na dziś zostało / została / zostały ci |

Важно для es: `tail` «no podrás terminar**la**» (sesión, ж. р.) → «no podrás terminar**lo**» (episodio, м. р.).

### Карточка «Продолжить с задания N из M» (ключа ещё нет — для `lesson_exit_strings.ts`)

Плейсхолдеры как в файле: `{n}` — номер задания, `{m}` — всего.

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Продолжить с задания {n} из {m} | Продовжити із завдання {n} з {m} | Continue from task {n} of {m} | Seguir desde la tarea {n} de {m} | Continuar da tarefa {n} de {m} | Tiếp tục từ bài {n}/{m} | Lanjutkan tugas {n} dari {m} | Görevlere devam et: {n}/{m} | Kontynuuj od zadania {n} z {m} |

id без двойного «dari … dari»; tr — порядковое «{n}. görevden» с «{m}» звучит громоздко, поэтому счёт вынесен после двоеточия.

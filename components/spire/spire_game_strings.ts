// ═══════════════════════════════════════════════════════════════════════════
// spire_game_strings.ts — тексты игровой части Шпиля на 9 языках (пакеты D, E).
//
// зачем: тексты взяты из макета spire.html «как есть» (RU) и идут через тот же
// triLang, что spire_strings.ts. Порядок в кортеже: ru, uk, en, es, pt-BR, vi, id,
// tr, pl. Подстановки — {name}. Глаголы в настоящем времени («поднимаешься»),
// чтобы не угадывать род игрока. Переводы кроме RU — предложение, носителем не
// проверены.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  // ── Тур первого входа (§1) ──
  skip: ['Пропустить', 'Пропустити', 'Skip', 'Omitir', 'Pular', 'Bỏ qua', 'Lewati', 'Geç', 'Pomiń'],
  next: ['Далее', 'Далі', 'Next', 'Siguiente', 'Próximo', 'Tiếp', 'Lanjut', 'İleri', 'Dalej'],
  start: ['Начать', 'Почати', 'Start', 'Empezar', 'Começar', 'Bắt đầu', 'Mulai', 'Başla', 'Zaczynamy'],
  tour1Title: ['Поднимайся выше всех за неделю', 'Піднімайся вище за всіх за тиждень', 'Climb higher than everyone this week', 'Sube más alto que nadie esta semana', 'Suba mais alto que todos nesta semana', 'Leo cao hơn mọi người trong tuần', 'Naik lebih tinggi dari semua minggu ini', 'Bu hafta herkesten yükseğe çık', 'Wespnij się najwyżej w tym tygodniu'],
  tour1Text: ['Каждую неделю — новый пик. 15 этажей из ступеней, комната на 30 человек, место считается по ступеням.', 'Щотижня — новий пік. 15 поверхів зі сходинок, кімната на 30 людей, місце рахується за сходинками.', 'A new peak every week. 15 floors made of steps, a room of 30 people, your place is counted in steps.', 'Cada semana, un pico nuevo. 15 pisos de escalones, una sala de 30 personas y el puesto se cuenta por escalones.', 'Toda semana, um pico novo. 15 andares de degraus, uma sala de 30 pessoas, e a posição conta pelos degraus.', 'Mỗi tuần một đỉnh mới. 15 tầng gồm các bậc, phòng 30 người, thứ hạng tính theo số bậc.', 'Setiap minggu puncak baru. 15 lantai dari anak tangga, ruang berisi 30 orang, peringkat dihitung dari anak tangga.', 'Her hafta yeni bir zirve. Basamaklardan 15 kat, 30 kişilik oda, sıra basamaklarla belirlenir.', 'Co tydzień nowy szczyt. 15 pięter ze stopni, pokój na 30 osób, miejsce liczy się stopniami.'],
  tour2Title: ['10 заданий, общее время, 3 сердца', '10 завдань, спільний час, 3 серця', '10 tasks, one timer, 3 hearts', '10 tareas, un tiempo, 3 corazones', '10 tarefas, um tempo, 3 corações', '10 bài, chung một đồng hồ, 3 trái tim', '10 tugas, satu waktu, 3 hati', '10 görev, tek süre, 3 kalp', '10 zadań, wspólny czas, 3 serca'],
  tour2Text: ['Один таймер на всю ступень. Ошибка — минус сердце и сразу правильный ответ. Провалил — остаёшься на месте.', 'Один таймер на всю сходинку. Помилка — мінус серце і одразу правильна відповідь. Не вийшло — лишаєшся на місці.', 'One timer for the whole step. A mistake costs a heart and shows the right answer. Fail and you stay where you are.', 'Un temporizador para todo el escalón. Un error quita un corazón y muestra la respuesta. Si fallas, te quedas donde estás.', 'Um cronômetro para o degrau inteiro. Um erro tira um coração e mostra a resposta. Falhou, você fica onde está.', 'Một đồng hồ cho cả bậc. Sai một câu mất một tim và thấy ngay đáp án. Trượt thì đứng yên tại chỗ.', 'Satu penghitung waktu untuk seluruh anak tangga. Salah berarti kehilangan hati dan langsung melihat jawabannya. Gagal berarti tetap di tempat.', 'Tüm basamak için tek zamanlayıcı. Hata bir kalp götürür ve doğru cevabı gösterir. Başaramazsan yerinde kalırsın.', 'Jeden licznik na cały stopień. Błąd zabiera serce i od razu pokazuje odpowiedź. Porażka — zostajesz na miejscu.'],
  // зачем (координатор 11.10): тур обещал «пятеро», а правило 5 и сервер (spire_residents.ts SPIRE_ZONE_RATIO = 0.15) — 15%.
  tour3Title: ['Верхние 15% переходят на пик выше', 'Верхні 15% переходять на пік вище', 'The top 15% move up to the next peak', 'El 15% superior sube al siguiente pico', 'Os 15% do topo sobem para o próximo pico', '15% đầu lên đỉnh tiếp theo', '15% teratas naik ke puncak berikutnya', 'İlk %15 bir üst zirveye geçer', 'Górne 15% przechodzi na wyższy szczyt'],
  tour3Text: ['{a}, {b}, {c}… до {z}. Нижние 15% и все без ступеней спускаются. В понедельник все снова с 1 этажа.', '{a}, {b}, {c}… до {z}. Нижні 15% і всі без сходинок спускаються. У понеділок усі знову з 1 поверху.', '{a}, {b}, {c}… up to {z}. The bottom 15% and everyone with no steps move down. On Monday everyone starts again from floor 1.', '{a}, {b}, {c}… hasta {z}. El 15% inferior y quien no tenga escalones bajan. El lunes todos vuelven al piso 1.', '{a}, {b}, {c}… até {z}. Os 15% de baixo e quem não tem degraus descem. Na segunda todos voltam ao andar 1.', '{a}, {b}, {c}… đến {z}. 15% cuối và ai chưa có bậc nào xuống đỉnh dưới. Thứ Hai mọi người lại bắt đầu từ tầng 1.', '{a}, {b}, {c}… sampai {z}. 15% terbawah dan yang tanpa anak tangga turun. Hari Senin semua mulai lagi dari lantai 1.', '{a}, {b}, {c}… {z} kadar. Son %15 ve hiç basamağı olmayanlar iner. Pazartesi herkes yeniden 1. kattan başlar.', '{a}, {b}, {c}… aż do {z}. Dolne 15% i wszyscy bez stopni spadają. W poniedziałek wszyscy znów od 1 piętra.'],
  // ── Ступень (§4–6) ──
  step: ['Ступень', 'Сходинка', 'Step', 'Escalón', 'Degrau', 'Bậc', 'Anak tangga', 'Basamak', 'Stopień'],
  timerPaused: ['таймер на паузе', 'таймер на паузі', 'timer paused', 'tiempo en pausa', 'tempo pausado', 'đồng hồ tạm dừng', 'waktu dijeda', 'süre durdu', 'licznik wstrzymany'],
  promptGuess: ['Выбери перевод', 'Обери переклад', 'Choose the translation', 'Elige la traducción', 'Escolha a tradução', 'Chọn bản dịch', 'Pilih terjemahan', 'Çeviriyi seç', 'Wybierz tłumaczenie'],
  promptGap: ['Вставь слово', 'Встав слово', 'Fill in the word', 'Completa la palabra', 'Complete a palavra', 'Điền từ', 'Isi kata', 'Kelimeyi yerleştir', 'Wstaw słowo'],
  promptOdd: ['Найди лишнее', 'Знайди зайве', 'Find the odd one out', 'Encuentra la intrusa', 'Encontre o intruso', 'Tìm từ khác loại', 'Temukan yang berbeda', 'Farklı olanı bul', 'Znajdź niepasujące'],
  promptBuild: ['Собери перевод', 'Склади переклад', 'Build the translation', 'Arma la traducción', 'Monte a tradução', 'Ghép bản dịch', 'Susun terjemahan', 'Çeviriyi oluştur', 'Ułóż tłumaczenie'],
  // зачем (Ядро 01.10, PM-286): задания на слух — своя подсказка, а не общая «Выбери перевод».
  promptListenChoose: ['Послушай и выбери', 'Послухай і обери', 'Listen and choose', 'Escucha y elige', 'Ouça e escolha', 'Nghe và chọn', 'Dengarkan dan pilih', 'Dinle ve seç', 'Posłuchaj i wybierz'],
  promptListenBuild: ['Послушай и собери', 'Послухай і склади', 'Listen and build', 'Escucha y arma', 'Ouça e monte', 'Nghe và ghép', 'Dengarkan dan susun', 'Dinle ve oluştur', 'Posłuchaj i ułóż'],
  promptMatch: ['Найди пары', 'Знайди пари', 'Match the pairs', 'Une las parejas', 'Ligue os pares', 'Nối các cặp', 'Cocokkan pasangan', 'Eşleri bul', 'Połącz pary'],
  onward: ['Дальше', 'Далі', 'Continue', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjut', 'Devam', 'Dalej'],
  correctIs: ['Правильно:', 'Правильно:', 'Correct:', 'Correcto:', 'Correto:', 'Đáp án:', 'Benar:', 'Doğrusu:', 'Poprawnie:'],
  mistakeSaved: ['Ошибка сохранена в «Мои ошибки»', 'Помилку збережено в «Мої помилки»', 'Saved to “My mistakes”', 'Guardado en «Mis errores»', 'Salvo em “Meus erros”', 'Đã lưu vào “Lỗi của tôi”', 'Disimpan di “Kesalahanku”', '“Hatalarım”a kaydedildi', 'Zapisano w „Moje błędy”'],
  // зачем (обзор R1 п.4): запись в «Мои ошибки» упала — тихая строка под правильным ответом.
  mistakeNotSaved: ['Не удалось сохранить в «Мои ошибки»', 'Не вдалося зберегти в «Мої помилки»', 'Couldn’t save to “My mistakes”', 'No se pudo guardar en «Mis errores»', 'Não foi possível salvar em “Meus erros”', 'Không lưu được vào “Lỗi của tôi”', 'Gagal menyimpan ke “Kesalahanku”', '“Hatalarım”a kaydedilemedi', 'Nie udało się zapisać w „Moje błędy”'],
  exitTitle: ['Выйти из ступени?', 'Вийти зі сходинки?', 'Leave the step?', '¿Salir del escalón?', 'Sair do degrau?', 'Rời bậc này?', 'Keluar dari anak tangga?', 'Basamaktan çıkılsın mı?', 'Opuścić stopień?'],
  exitText: ['Ступень будет провалена. Энергия не вернётся, ты остаёшься на {n} этаже.', 'Сходинку буде провалено. Енергія не повернеться, ти лишаєшся на {n} поверсі.', 'The step will count as failed. Energy won’t come back and you stay on floor {n}.', 'El escalón contará como fallido. La energía no vuelve y te quedas en el piso {n}.', 'O degrau conta como falho. A energia não volta e você fica no andar {n}.', 'Bậc này sẽ tính là trượt. Năng lượng không hoàn lại, bạn ở lại tầng {n}.', 'Anak tangga dihitung gagal. Energi tidak kembali dan kamu tetap di lantai {n}.', 'Basamak başarısız sayılır. Enerji geri gelmez, {n}. katta kalırsın.', 'Stopień przepadnie. Energia nie wróci, zostajesz na {n} piętrze.'],
  continueStep: ['Продолжить ступень', 'Продовжити сходинку', 'Keep going', 'Seguir', 'Continuar', 'Tiếp tục', 'Lanjutkan', 'Devam et', 'Graj dalej'],
  exit: ['Выйти', 'Вийти', 'Leave', 'Salir', 'Sair', 'Rời đi', 'Keluar', 'Çık', 'Wyjdź'],
  preparing: ['Готовим ступень…', 'Готуємо сходинку…', 'Preparing the step…', 'Preparando el escalón…', 'Preparando o degrau…', 'Đang chuẩn bị bậc…', 'Menyiapkan anak tangga…', 'Basamak hazırlanıyor…', 'Przygotowujemy stopień…'],
  packMissing: ['Задания этой недели ещё готовятся', 'Завдання цього тижня ще готуються', 'This week’s tasks are still being prepared', 'Las tareas de esta semana aún se preparan', 'As tarefas desta semana ainda estão sendo preparadas', 'Bài của tuần này vẫn đang được chuẩn bị', 'Tugas minggu ini masih disiapkan', 'Bu haftanın görevleri hâlâ hazırlanıyor', 'Zadania na ten tydzień jeszcze się przygotowują'],
  packOffline: ['Нет сети — задания недели не скачались', 'Немає мережі — завдання тижня не завантажились', 'No connection — this week’s tasks didn’t download', 'Sin conexión: no se descargaron las tareas', 'Sem conexão — as tarefas não baixaram', 'Không có mạng — chưa tải được bài của tuần', 'Tidak ada koneksi — tugas minggu ini belum terunduh', 'Bağlantı yok — haftanın görevleri inmedi', 'Brak sieci — zadania tygodnia się nie pobrały'],
  // зачем (аудит spire-gaps-states, кадр «Старт не удался»): два блока старта (нет аккаунта / комнаты недели) молчали — тап по «Подняться» ничего не делал
  noIdentity: ['Не удалось войти в аккаунт — попробуй ещё раз', 'Не вдалося увійти в акаунт — спробуй ще раз', 'Couldn’t sign in — try again', 'No se pudo iniciar sesión: inténtalo de nuevo', 'Não foi possível entrar na conta — tente de novo', 'Không đăng nhập được — thử lại nhé', 'Gagal masuk ke akun — coba lagi', 'Hesaba girilemedi — tekrar dene', 'Nie udało się zalogować — spróbuj ponownie'],
  noTier: ['Комната недели ещё не загрузилась', 'Кімната тижня ще не завантажилась', 'This week’s room hasn’t loaded yet', 'La sala de la semana aún no se ha cargado', 'A sala da semana ainda não carregou', 'Phòng của tuần chưa tải xong', 'Ruang minggu ini belum termuat', 'Haftanın odası henüz yüklenmedi', 'Pokój tygodnia jeszcze się nie załadował'],
  retry: ['Повторить', 'Повторити', 'Try again', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie'],
  hearts: ['Сердца: {n} из 3', 'Серця: {n} з 3', 'Hearts: {n} of 3', 'Corazones: {n} de 3', 'Corações: {n} de 3', 'Tim: {n}/3', 'Hati: {n} dari 3', 'Kalpler: {n}/3', 'Serca: {n} z 3'],
  timeLeft: ['Осталось {t}', 'Залишилось {t}', '{t} left', 'Quedan {t}', 'Faltam {t}', 'Còn {t}', 'Sisa {t}', '{t} kaldı', 'Zostało {t}'],
  // ── Итог ступени и этажа (§7–8) ──
  stepPassed: ['Ступень пройдена', 'Сходинку пройдено', 'Step cleared', 'Escalón superado', 'Degrau concluído', 'Đã qua bậc', 'Anak tangga selesai', 'Basamak geçildi', 'Stopień zaliczony'],
  oneHigher: ['Ещё одна выше', 'Ще одна вище', 'One more up', 'Uno más arriba', 'Mais um acima', 'Thêm một bậc', 'Satu lagi naik', 'Bir basamak daha', 'Jeszcze jeden wyżej'],
  noErrors: ['без ошибок', 'без помилок', 'no mistakes', 'sin errores', 'sem erros', 'không lỗi', 'tanpa salah', 'hatasız', 'bez błędów'],
  errorsN: ['ошибок: {n}', 'помилок: {n}', 'mistakes: {n}', 'errores: {n}', 'erros: {n}', 'lỗi: {n}', 'salah: {n}', 'hata: {n}', 'błędów: {n}'],
  onFloorProgress: ['{k} из {n} на этаже', '{k} з {n} на поверсі', '{k} of {n} on this floor', '{k} de {n} en el piso', '{k} de {n} no andar', '{k}/{n} trên tầng', '{k} dari {n} di lantai', 'katta {k}/{n}', '{k} z {n} na piętrze'],
  higher: ['Выше', 'Вище', 'Higher', 'Más arriba', 'Mais alto', 'Lên nữa', 'Naik lagi', 'Daha yukarı', 'Wyżej'],
  stepFailed: ['Ступень не пройдена', 'Сходинку не пройдено', 'Step not cleared', 'Escalón no superado', 'Degrau não concluído', 'Chưa qua bậc', 'Anak tangga gagal', 'Basamak geçilemedi', 'Stopień niezaliczony'],
  failHearts: ['Сердца закончились', 'Серця закінчились', 'Out of hearts', 'Sin corazones', 'Acabaram os corações', 'Hết tim', 'Hati habis', 'Kalpler bitti', 'Skończyły się serca'],
  failTimeout: ['Время вышло', 'Час вийшов', 'Time’s up', 'Se acabó el tiempo', 'O tempo acabou', 'Hết giờ', 'Waktu habis', 'Süre doldu', 'Czas minął'],
  failBack: ['Ступень прервана', 'Сходинку перервано', 'Step abandoned', 'Escalón interrumpido', 'Degrau interrompido', 'Đã bỏ bậc', 'Anak tangga dihentikan', 'Basamak yarıda kaldı', 'Stopień przerwany'],
  failSub: ['Остаёшься на {n} этаже. Новый набор из 10 заданий', 'Лишаєшся на {n} поверсі. Новий набір із 10 завдань', 'You stay on floor {n}. A new set of 10 tasks', 'Te quedas en el piso {n}. Nuevo set de 10 tareas', 'Você fica no andar {n}. Novo conjunto de 10 tarefas', 'Bạn ở lại tầng {n}. Bộ 10 bài mới', 'Kamu tetap di lantai {n}. Set baru 10 tugas', '{n}. katta kalıyorsun. Yeni 10 görev', 'Zostajesz na {n} piętrze. Nowy zestaw 10 zadań'],
  again: ['Ещё раз', 'Ще раз', 'Try again', 'Otra vez', 'De novo', 'Làm lại', 'Lagi', 'Tekrar', 'Jeszcze raz'],
  later: ['Позже', 'Пізніше', 'Later', 'Más tarde', 'Depois', 'Để sau', 'Nanti', 'Sonra', 'Później'],
  floorCleared: ['Этаж {n} пройден', 'Поверх {n} пройдено', 'Floor {n} cleared', 'Piso {n} superado', 'Andar {n} concluído', 'Đã qua tầng {n}', 'Lantai {n} selesai', '{n}. kat geçildi', 'Piętro {n} zaliczone'],
  guardAhead: ['Впереди Страж', 'Попереду Вартовий', 'The Guardian is next', 'Ahora, el Guardián', 'A seguir, o Guardião', 'Phía trước là Người canh', 'Berikutnya Penjaga', 'Sırada Muhafız var', 'Przed tobą Strażnik'],
  floorAhead: ['Впереди этаж {n}', 'Попереду поверх {n}', 'Floor {n} is next', 'Ahora, el piso {n}', 'A seguir, o andar {n}', 'Phía trước là tầng {n}', 'Berikutnya lantai {n}', 'Sırada {n}. kat', 'Przed tobą piętro {n}'],
  guardSub: ['{n} этаж — смешанный набор, монеты ×{m}', '{n} поверх — змішаний набір, монети ×{m}', 'Floor {n}: mixed set, coins ×{m}', 'Piso {n}: set mixto, monedas ×{m}', 'Andar {n}: conjunto misto, moedas ×{m}', 'Tầng {n}: bộ hỗn hợp, xu ×{m}', 'Lantai {n}: set campuran, koin ×{m}', '{n}. kat: karışık set, jeton ×{m}', 'Piętro {n}: zestaw mieszany, monety ×{m}'],
  onFloorN: ['Ты на {n} этаже', 'Ти на {n} поверсі', 'You are on floor {n}', 'Estás en el piso {n}', 'Você está no andar {n}', 'Bạn ở tầng {n}', 'Kamu di lantai {n}', '{n}. kattasın', 'Jesteś na {n} piętrze'],
  summitSub: ['{s} ступеней за неделю · {p} место в комнате', '{s} сходинок за тиждень · {p} місце в кімнаті', '{s} steps this week · place {p} in the room', '{s} escalones esta semana · puesto {p} en la sala', '{s} degraus na semana · {p}º lugar na sala', '{s} bậc trong tuần · hạng {p} trong phòng', '{s} anak tangga minggu ini · peringkat {p} di ruang', 'Bu hafta {s} basamak · odada {p}. sıra', '{s} stopni w tygodniu · {p}. miejsce w pokoju'],
  aboveCloudsCta: ['Выше — над облаками', 'Вище — над хмарами', 'Higher — above the clouds', 'Más arriba, sobre las nubes', 'Mais alto, acima das nuvens', 'Lên nữa — trên mây', 'Lebih tinggi — di atas awan', 'Daha yukarı — bulutların üstü', 'Wyżej — nad chmury'],
  saveFailed: ['Ступень не сохранилась. Попробуй ещё раз', 'Сходинка не збереглась. Спробуй ще раз', 'The step wasn’t saved. Try again', 'El escalón no se guardó. Inténtalo de nuevo', 'O degrau não foi salvo. Tente de novo', 'Chưa lưu được bậc. Thử lại nhé', 'Anak tangga tidak tersimpan. Coba lagi', 'Basamak kaydedilmedi. Tekrar dene', 'Stopień się nie zapisał. Spróbuj ponownie'],
  // зачем (координатор 13.10, Дизайн 497a2535d): сервер не засчитал ступень и маркер откатился — точная причина, а не общее «не сохранилась».
  stepNotCounted: ['Ступень не засчиталась. Пройди её ещё раз', 'Сходинку не зараховано. Пройди її ще раз', 'The step didn’t count. Play it again', 'El escalón no se contó. Vuelve a jugarlo', 'O degrau não contou. Jogue de novo', 'Bậc này chưa được tính. Hãy làm lại', 'Anak tangga tidak terhitung. Mainkan lagi', 'Basamak sayılmadı. Tekrar oyna', 'Stopień nie został zaliczony. Zagraj jeszcze raz'],
  coins: ['монет', 'монет', 'coins', 'monedas', 'moedas', 'xu', 'koin', 'jeton', 'monet'],
  // ── Итог недели (§9) ──
  weekResult: ['Итог недели', 'Підсумок тижня', 'Week result', 'Resultado de la semana', 'Resultado da semana', 'Kết quả tuần', 'Hasil minggu ini', 'Hafta sonucu', 'Wynik tygodnia'],
  weekUp: ['Ты поднимаешься в {stone}', 'Ти піднімаєшся в {stone}', 'You move up to {stone}', 'Subes a {stone}', 'Você sobe para {stone}', 'Bạn lên {stone}', 'Kamu naik ke {stone}', '{stone} zirvesine çıkıyorsun', 'Awansujesz do: {stone}'],
  weekDown: ['Ты спускаешься в {stone}', 'Ти спускаєшся в {stone}', 'You move down to {stone}', 'Bajas a {stone}', 'Você desce para {stone}', 'Bạn xuống {stone}', 'Kamu turun ke {stone}', '{stone} zirvesine iniyorsun', 'Spadasz do: {stone}'],
  weekStay: ['Остаёшься на пике {stone}', 'Лишаєшся на піку {stone}', 'You stay in {stone}', 'Te quedas en {stone}', 'Você continua em {stone}', 'Bạn ở lại {stone}', 'Kamu tetap di {stone}', '{stone} zirvesinde kalıyorsun', 'Zostajesz: {stone}'],
  placeN: ['{n} место', '{n} місце', 'place {n}', 'puesto {n}', '{n}º lugar', 'hạng {n}', 'peringkat {n}', '{n}. sıra', '{n}. miejsce'],
  newWeekFromOne: ['новая неделя, все с 1 этажа', 'новий тиждень, усі з 1 поверху', 'new week, everyone from floor 1', 'semana nueva, todos desde el piso 1', 'semana nova, todos do andar 1', 'tuần mới, mọi người từ tầng 1', 'minggu baru, semua dari lantai 1', 'yeni hafta, herkes 1. kattan', 'nowy tydzień, wszyscy od 1 piętra'],
  // ── Нет энергии / нет сети (§10–11) ──
  energyIn: ['Энергия через {t}', 'Енергія через {t}', 'Energy in {t}', 'Energía en {t}', 'Energia em {t}', 'Năng lượng sau {t}', 'Energi dalam {t}', '{t} sonra enerji', 'Energia za {t}'],
  climbNoWait: ['Поднимайся без ожидания', 'Піднімайся без очікування', 'Climb without waiting', 'Sube sin esperar', 'Suba sem esperar', 'Leo không cần chờ', 'Naik tanpa menunggu', 'Beklemeden çık', 'Wspinaj się bez czekania'],
  withPlus: ['с Plus', 'з Plus', 'with Plus', 'con Plus', 'com Plus', 'với Plus', 'dengan Plus', 'Plus ile', 'z Plus'],
  offline: ['Нет сети. Свой прогресс сохраняется, чужие цифры обновим при связи.', 'Немає мережі. Свій прогрес зберігається, чужі цифри оновимо, коли з’явиться зв’язок.', 'No connection. Your progress is saved; others’ numbers will update when you’re back online.', 'Sin conexión. Tu progreso se guarda; los datos de otros se actualizarán al volver la red.', 'Sem conexão. Seu progresso fica salvo; os números dos outros atualizam quando a rede voltar.', 'Không có mạng. Tiến độ của bạn vẫn được lưu, số liệu của người khác sẽ cập nhật khi có mạng.', 'Tidak ada koneksi. Progresmu tersimpan, angka orang lain diperbarui saat online.', 'Bağlantı yok. İlerlemen kaydediliyor, diğerlerinin sayıları bağlantı gelince güncellenecek.', 'Brak sieci. Twój postęp się zapisuje, cudze liczby odświeżymy po połączeniu.'],
  close: ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'],
  rankedBySteps: ['место по ступеням', 'місце за сходинками', 'ranked by steps', 'puesto por escalones', 'posição por degraus', 'xếp theo số bậc', 'peringkat dari anak tangga', 'basamağa göre sıra', 'miejsce wg stopni'],
} as const satisfies Record<string, Nine>;

// зачем (координатор 12.10): сторож полноты словаря (tests/spire_strings_completeness.test.ts) читает таблицу целиком — 9 языков в каждом ключе, одинаковые {подстановки}, числа как в константах.
export const SPIRE_GAME_STRINGS: Readonly<Record<string, Nine>> = S;

export type SpireGameStringKey = keyof typeof S;

/** Строка игровой части Шпиля с подстановкой {name} → vars[name]. */
export function spireGameText(lang: Lang, key: SpireGameStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  if (!vars) return raw;
  return raw.replace(/\{([a-z0-9]+)\}/giu, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** 1:42 — оставшееся время ступени. */
export function spireClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

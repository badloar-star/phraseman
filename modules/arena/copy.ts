import { triLang, type Lang } from '../../constants/i18n';
import { arenaSearchingCount, arenaSearchingCountForms } from './searching_copy';

const C = {
  title: ['Арена', 'Арена', 'Arena', 'Arena', 'Đấu trường', 'Arena', 'Arena', 'Arena'],
  subtitle: ['Дуэль на скорость', 'Дуель на швидкість', 'Duelo de velocidad', 'Duelo de velocidade', 'Đấu tốc độ', 'Duel kecepatan', 'Hız düellosu', 'Pojedynek na czas'],
  quick: ['Быстрый матч', 'Швидкий матч', 'Partida rápida', 'Partida rápida', 'Trận nhanh', 'Laga cepat', 'Hızlı maç', 'Szybki mecz'],
  quickHint: ['Соперник по уровню · без рейтинга', 'Суперник за рівнем · без рейтингу', 'Rival de tu nivel · sin rango', 'Adversário do seu nível · sem ranking', 'Đối thủ cùng trình độ · không xếp hạng', 'Lawan selevel · tanpa peringkat', 'Seviyene uygun rakip · derecesiz', 'Rywal na twoim poziomie · bez rankingu'],
  ranked: ['Рейтинг', 'Рейтинг', 'Clasificatoria', 'Ranqueada', 'Xếp hạng', 'Peringkat', 'Dereceli', 'Ranking'],
  rankedHint: ['Только игроки · ранг ±1', 'Лише гравці · ранг ±1', 'Solo jugadores · rango ±1', 'Só jogadores · rank ±1', 'Chỉ người chơi · hạng ±1', 'Hanya pemain · rank ±1', 'Sadece oyuncular · rank ±1', 'Tylko gracze · ranga ±1'],
  friend: ['Дуэль с другом', 'Дуель із другом', 'Duelo con amigo', 'Duelo com amigo', 'Đấu với bạn', 'Duel teman', 'Arkadaşla düello', 'Pojedynek ze znajomym'],
  ranks: ['Ранги', 'Ранги', 'Rangos', 'Ranks', 'Bậc hạng', 'Rank', 'Rütbeler', 'Rangi'],
  season: ['Сезон', 'Сезон', 'Temporada', 'Temporada', 'Mùa giải', 'Musim', 'Sezon', 'Sezon'],
  searching: ['Ищем соперника', 'Шукаємо суперника', 'Buscando rival', 'Buscando adversário', 'Đang tìm đối thủ', 'Mencari lawan', 'Rakip aranıyor', 'Szukamy rywala'],
  keepOpen: ['Можно свернуть — поиск продолжится после возврата', 'Можна згорнути — пошук продовжиться після повернення', 'Puedes salir; se reanudará al volver', 'Você pode sair; a busca volta ao retornar', 'Bạn có thể rời đi; tìm kiếm tiếp tục khi quay lại', 'Boleh keluar; pencarian lanjut saat kembali', 'Çıkabilirsin; dönünce arama sürer', 'Możesz wyjść; wyszukiwanie wznowi się po powrocie'],
  cancel: ['Отменить', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj'],
  accept: ['Принять дуэль', 'Прийняти дуель', 'Aceptar duelo', 'Aceitar duelo', 'Chấp nhận', 'Terima duel', 'Düelloyu kabul et', 'Przyjmij pojedynek'],
  decline: ['Отказаться', 'Відмовитися', 'Rechazar', 'Recusar', 'Từ chối', 'Tolak', 'Reddet', 'Odrzuć'],
  opponent: ['Соперник', 'Суперник', 'Rival', 'Adversário', 'Đối thủ', 'Lawan', 'Rakip', 'Rywal'],
  waiting: ['Ждём второго игрока', 'Чекаємо другого гравця', 'Esperando al otro jugador', 'Aguardando o outro jogador', 'Đang chờ người chơi kia', 'Menunggu pemain lain', 'Diğer oyuncu bekleniyor', 'Czekamy na drugiego gracza'],
  serverCheck: ['Сервер проверяет ответ…', 'Сервер перевіряє відповідь…', 'El servidor comprueba…', 'O servidor está verificando…', 'Máy chủ đang kiểm tra…', 'Server memeriksa…', 'Sunucu kontrol ediyor…', 'Serwer sprawdza…'],
  result: ['Результат', 'Результат', 'Resultado', 'Resultado', 'Kết quả', 'Hasil', 'Sonuç', 'Wynik'],
  victory: ['Победа', 'Перемога', 'Victoria', 'Vitória', 'Chiến thắng', 'Menang', 'Zafer', 'Zwycięstwo'],
  defeat: ['В этот раз не вышло', 'Цього разу не вийшло', 'Esta vez no pudo ser', 'Desta vez não deu', 'Lần này chưa được', 'Belum berhasil kali ini', 'Bu kez olmadı', 'Tym razem się nie udało'],
  draw: ['Ничья', 'Нічия', 'Empate', 'Empate', 'Hòa', 'Seri', 'Berabere', 'Remis'],
  cancelledMatch: ['Матч отменён без результата', 'Матч скасовано без результату', 'Partida cancelada sin resultado', 'Partida cancelada sem resultado', 'Trận đấu đã hủy, không có kết quả', 'Laga dibatalkan tanpa hasil', 'Maç sonuçsuz iptal edildi', 'Mecz anulowany bez wyniku'],
  playAgain: ['Играть ещё', 'Грати ще', 'Jugar otra vez', 'Jogar de novo', 'Chơi lại', 'Main lagi', 'Tekrar oyna', 'Zagraj ponownie'],
  home: ['На арену', 'На арену', 'Volver a Arena', 'Voltar à Arena', 'Về Đấu trường', 'Ke Arena', 'Arena’ya dön', 'Do Areny'],
  inviteTitle: ['Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar amigo', 'Mời bạn bè', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego'],
  friendId: ['ID друга', 'ID друга', 'ID del amigo', 'ID do amigo', 'ID bạn bè', 'ID teman', 'Arkadaş kimliği', 'ID znajomego'],
  createInvite: ['Создать приглашение', 'Створити запрошення', 'Crear invitación', 'Criar convite', 'Tạo lời mời', 'Buat undangan', 'Davet oluştur', 'Utwórz zaproszenie'],
  inviteReady: ['Приглашение готово', 'Запрошення готове', 'Invitación lista', 'Convite pronto', 'Lời mời đã sẵn sàng', 'Undangan siap', 'Davet hazır', 'Zaproszenie gotowe'],
  join: ['Войти в дуэль', 'Увійти в дуель', 'Entrar al duelo', 'Entrar no duelo', 'Tham gia đấu', 'Masuk duel', 'Düelloya katıl', 'Dołącz do pojedynku'],
  resultTierUp: ['Новый тир', 'Новий тир', 'Nuevo nivel', 'Novo tier', 'Hạng mới', 'Tier baru', 'Yeni seviye', 'Nowy tier'],
  resultTierDown: ['Тир потерян', 'Тир втрачено', 'Nivel perdido', 'Tier perdido', 'Mất hạng', 'Tier hilang', 'Seviye kaybedildi', 'Tier utracony'],
  resultRankUp: ['Деление выше', 'Поділ вище', 'Subiste de división', 'Subiu de divisão', 'Lên bậc', 'Naik divisi', 'Bölüm yükseldi', 'Wyższa dywizja'],
  resultRankDown: ['Деление ниже', 'Поділ нижче', 'Bajaste de división', 'Desceu de divisão', 'Xuống bậc', 'Turun divisi', 'Bölüm düştü', 'Niższa dywizja'],
  resultUnlocked: ['Открыто за тир', 'Відкрито за тир', 'Desbloqueado por el nivel', 'Desbloqueado pelo tier', 'Mở khoá theo hạng', 'Terbuka karena tier', 'Seviye ödülü açıldı', 'Odblokowane za tier'],
  loadFailed: ['Не удалось загрузить', 'Не вдалося завантажити', 'No se pudo cargar', 'Não foi possível carregar', 'Không tải được', 'Gagal memuat', 'Yüklenemedi', 'Nie udało się wczytać'],
  loadFailedHint: ['Проверь связь и попробуй снова', 'Перевір зв’язок і спробуй ще раз', 'Revisa la conexión e inténtalo otra vez', 'Verifique a conexão e tente de novo', 'Kiểm tra kết nối rồi thử lại', 'Periksa koneksi dan coba lagi', 'Bağlantını kontrol edip tekrar dene', 'Sprawdź połączenie i spróbuj ponownie'],
  entryOfflineHint: ['Матч начинается с плана, который присылает сервер. Появится сеть — повтори.', 'Матч починається з плану, який надсилає сервер. З’явиться мережа — повтори.', 'La partida empieza con un plan que envía el servidor. Cuando vuelva la conexión, reintenta.', 'A partida começa com um plano enviado pelo servidor. Quando a conexão voltar, tente de novo.', 'Trận đấu bắt đầu bằng kế hoạch do máy chủ gửi. Có mạng lại thì thử lại.', 'Laga dimulai dari rencana yang dikirim server. Begitu ada jaringan, coba lagi.', 'Maç, sunucunun gönderdiği planla başlar. Ağ gelince tekrar dene.', 'Mecz zaczyna się od planu z serwera. Wróci sieć — spróbuj ponownie.'],
  entryBusy: ['Сервер сейчас занят', 'Сервер зараз зайнятий', 'El servidor está ocupado', 'O servidor está ocupado', 'Máy chủ đang bận', 'Server sedang sibuk', 'Sunucu şu anda meşgul', 'Serwer jest teraz zajęty'],
  entryBusyHint: ['Это ненадолго. Повтори через минуту — матч ещё ждёт.', 'Це ненадовго. Повтори за хвилину — матч ще чекає.', 'Es temporal. Reintenta en un minuto: la partida sigue esperando.', 'É temporário. Tente em um minuto: a partida ainda espera.', 'Chỉ tạm thời. Thử lại sau một phút — trận vẫn đang chờ.', 'Hanya sebentar. Coba lagi semenit lagi — laga masih menunggu.', 'Kısa sürer. Bir dakika sonra dene — maç hâlâ bekliyor.', 'To chwilowe. Spróbuj za minutę — mecz wciąż czeka.'],
  entryGone: ['Этого матча больше нет', 'Цього матчу більше немає', 'Esta partida ya no existe', 'Esta partida não existe mais', 'Trận này không còn nữa', 'Laga ini sudah tidak ada', 'Bu maç artık yok', 'Tego meczu już nie ma'],
  entryGoneHint: ['Он закончился или был отменён. Начни новый — это займёт секунды.', 'Він закінчився або був скасований. Почни новий — це займе секунди.', 'Terminó o fue cancelada. Empieza otra: toma segundos.', 'Ela terminou ou foi cancelada. Comece outra: leva segundos.', 'Trận đã kết thúc hoặc bị huỷ. Bắt đầu trận mới chỉ mất vài giây.', 'Laga sudah selesai atau dibatalkan. Mulai yang baru — hanya butuh beberapa detik.', 'Maç bitti ya da iptal edildi. Yenisini başlat — saniyeler sürer.', 'Skończył się albo został anulowany. Zacznij nowy — to sekundy.'],
  entryNoOpponent: ['Соперник не принял вызов', 'Суперник не прийняв виклик', 'El rival no aceptó', 'O adversário não aceitou', 'Đối thủ không nhận lời', 'Lawan tidak menerima', 'Rakip daveti kabul etmedi', 'Rywal nie przyjął wyzwania'],
  entryNoOpponentHint: ['Так бывает: он вышел или потерял сеть. Поиск найдёт другого.', 'Так буває: він вийшов або втратив мережу. Пошук знайде іншого.', 'Pasa: se fue o perdió la conexión. La búsqueda encontrará a otro.', 'Acontece: saiu ou perdeu a conexão. A busca encontrará outro.', 'Chuyện thường: họ thoát hoặc mất mạng. Tìm trận sẽ có người khác.', 'Biasa terjadi: dia keluar atau kehilangan jaringan. Pencarian akan menemukan yang lain.', 'Olur böyle: çıktı ya da bağlantısı gitti. Arama başkasını bulur.', 'Bywa: wyszedł albo stracił sieć. Wyszukiwanie znajdzie innego.'],
  entryOffline: ['Нет сети — матч не начать', 'Немає мережі — матч не почати', 'Sin conexión: no se puede empezar', 'Sem conexão: não dá para começar', 'Không có mạng — không thể bắt đầu', 'Tidak ada jaringan — tidak bisa mulai', 'Ağ yok — maç başlatılamaz', 'Brak sieci — nie zaczniesz meczu'],
  hubLastMatch: ['Последний матч', 'Останній матч', 'Último duelo', 'Último duelo', 'Trận gần nhất', 'Duel terakhir', 'Son maç', 'Ostatni mecz'],
  hubNearYou: ['Рядом с тобой', 'Поруч із тобою', 'Cerca de ti', 'Perto de você', 'Gần bạn', 'Di dekatmu', 'Sana yakın', 'Blisko ciebie'],
  hubSearchingNow: ['Сейчас в поиске', 'Зараз у пошуку', 'Buscando ahora', 'Procurando agora', 'Đang tìm trận', 'Sedang mencari', 'Şu an arıyor', 'Teraz szuka'],
  hubInPromo: ['Идёт серия за новый тир', 'Триває серія за новий тир', 'Serie por el nuevo nivel', 'Série pelo novo tier', 'Đang loạt thăng hạng', 'Seri naik tier', 'Yeni seviye serisi', 'Trwa seria o nowy tier'],
  hubMore: ['Все разделы', 'Усі розділи', 'Todas las secciones', 'Todas as seções', 'Tất cả mục', 'Semua bagian', 'Tüm bölümler', 'Wszystkie sekcje'],
  goalPlay: ['Сыграть матчи', 'Зіграти матчі', 'Jugar duelos', 'Jogar duelos', 'Chơi trận', 'Main duel', 'Maç oyna', 'Zagraj mecze'],
  goalSpeed: ['Ответить первым', 'Відповісти першим', 'Responder primero', 'Responder primeiro', 'Trả lời trước', 'Jawab lebih dulu', 'İlk cevapla', 'Odpowiedz pierwszy'],
  goalAccuracy: ['Выиграть матч', 'Виграти матч', 'Ganar un duelo', 'Vencer um duelo', 'Thắng một trận', 'Menang duel', 'Bir maç kazan', 'Wygraj mecz'],
  goalsAllDone: ['Все цели дня выполнены', 'Усі цілі дня виконано', 'Todas las metas del día', 'Todas as metas do dia', 'Hoàn thành mục tiêu ngày', 'Semua target hari ini', 'Günün hedefleri tamam', 'Wszystkie cele dnia'],
  goalsTitle: ['Цели дня', 'Цілі дня', 'Metas del día', 'Metas do dia', 'Mục tiêu hôm nay', 'Target hari ini', 'Günün hedefleri', 'Cele dnia'],
  reviewTitle: ['Разбор матча', 'Розбір матчу', 'Análisis del duelo', 'Análise do duelo', 'Phân tích trận', 'Ulasan duel', 'Maç incelemesi', 'Analiza meczu'],
  reviewYourAnswer: ['Твой ответ', 'Твоя відповідь', 'Tu respuesta', 'Sua resposta', 'Câu trả lời của bạn', 'Jawabanmu', 'Cevabın', 'Twoja odpowiedź'],
  reviewCorrect: ['Правильно', 'Правильно', 'Correcto', 'Correto', 'Đáp án đúng', 'Yang benar', 'Doğrusu', 'Poprawnie'],
  reviewTimeout: ['Не успел', 'Не встиг', 'No llegaste a tiempo', 'Não deu tempo', 'Không kịp', 'Tidak sempat', 'Yetişemedin', 'Nie zdążyłeś'],
  reviewPartial: ['Собрано не всё', 'Зібрано не все', 'No completaste todo', 'Não completou tudo', 'Chưa ghép hết', 'Belum semua', 'Hepsi tamamlanmadı', 'Nie wszystko złożone'],
  reviewNoAnswer: ['Без ответа', 'Без відповіді', 'Sin respuesta', 'Sem resposta', 'Không trả lời', 'Tanpa jawaban', 'Cevapsız', 'Bez odpowiedzi'],
  reviewEmpty: ['Разбор пока не готов', 'Розбір ще не готовий', 'El análisis aún no está listo', 'A análise ainda não está pronta', 'Phân tích chưa sẵn sàng', 'Ulasan belum siap', 'İnceleme henüz hazır değil', 'Analiza jeszcze niegotowa'],
  streakLabel: ['Серия побед', 'Серія перемог', 'Racha de victorias', 'Sequência de vitórias', 'Chuỗi thắng', 'Rentetan menang', 'Galibiyet serisi', 'Seria zwycięstw'],
  todayTab: ['Сегодня', 'Сьогодні', 'Hoy', 'Hoje', 'Hôm nay', 'Hari ini', 'Bugün', 'Dzisiaj'],
  topsTab: ['Топы', 'Топи', 'Tops', 'Tops', 'Bảng đầu', 'Top', 'Zirve', 'Topki'],
  historyTab: ['История', 'Історія', 'Historial', 'Histórico', 'Lịch sử', 'Riwayat', 'Geçmiş', 'Historia'],
  matchCta: ['Начать матч', 'Почати матч', 'Empezar duelo', 'Começar duelo', 'Bắt đầu trận', 'Mulai duel', 'Maça başla', 'Zacznij mecz'],
  historyEmpty: ['Матчей пока нет', 'Матчів поки немає', 'Aún no hay duelos', 'Ainda não há duelos', 'Chưa có trận nào', 'Belum ada duel', 'Henüz maç yok', 'Nie ma jeszcze meczów'],
  rankProgress: ['До следующего деления', 'До наступного поділу', 'Hasta la siguiente división', 'Até a próxima divisão', 'Đến bậc tiếp theo', 'Ke divisi berikutnya', 'Sonraki bölüme', 'Do następnej dywizji'],
  rankTop: ['Вершина шкалы', 'Вершина шкали', 'Cima de la escala', 'Topo da escala', 'Đỉnh thang bậc', 'Puncak peringkat', 'Sıralamanın zirvesi', 'Szczyt skali'],
  rankShieldIntact: ['Щит цел: одно поражение не уронит тир', 'Щит цілий: одна поразка не скине тир', 'Escudo intacto: una derrota no baja de nivel', 'Escudo intacto: uma derrota não rebaixa', 'Khiên còn: một trận thua chưa rớt hạng', 'Perisai utuh: satu kekalahan tidak menurunkan tier', 'Kalkan sağlam: bir yenilgi seviye düşürmez', 'Tarcza cała: jedna porażka nie zrzuci z tieru'],
  rankShieldSpent: ['Щит израсходован: следующее поражение уронит тир', 'Щит витрачено: наступна поразка скине тир', 'Escudo gastado: la próxima derrota baja de nivel', 'Escudo gasto: a próxima derrota rebaixa', 'Đã dùng khiên: thua tiếp sẽ rớt hạng', 'Perisai terpakai: kekalahan berikutnya menurunkan tier', 'Kalkan tükendi: sonraki yenilgi seviye düşürür', 'Tarcza zużyta: kolejna porażka zrzuci z tieru'],
  rankBest: ['Лучший тир сезона', 'Найкращий тир сезону', 'Mejor nivel de la temporada', 'Melhor tier da temporada', 'Hạng cao nhất mùa', 'Tier terbaik musim', 'Sezonun en iyi seviyesi', 'Najlepszy tier sezonu'],
  rankPercentile: ['Ты выше', 'Ти вище', 'Estás por encima del', 'Você está acima de', 'Bạn cao hơn', 'Kamu di atas', 'Şunun üstündesin', 'Jesteś wyżej niż'],
  friendsBoard: ['Среди друзей', 'Серед друзів', 'Entre amigos', 'Entre amigos', 'Trong bạn bè', 'Di antara teman', 'Arkadaşlar arasında', 'Wśród znajomych'],
  rankLocked: ['Ещё не открыт', 'Ще не відкритий', 'Aún bloqueado', 'Ainda bloqueado', 'Chưa mở', 'Belum terbuka', 'Henüz kilitli', 'Jeszcze zablokowany'],
  loading: ['Загрузка…', 'Завантаження…', 'Cargando…', 'Carregando…', 'Đang tải…', 'Memuat…', 'Yükleniyor…', 'Ładowanie…'],
  retry: ['Повторить', 'Повторити', 'Reintentar', 'Tentar novamente', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie'],
  share: ['Поделиться', 'Поділитися', 'Compartir', 'Compartilhar', 'Chia sẻ', 'Bagikan', 'Paylaş', 'Udostępnij'],
  claim: ['Забрать', 'Забрати', 'Reclamar', 'Resgatar', 'Nhận', 'Ambil', 'Al', 'Odbierz'],
  free: ['Бесплатно', 'Безкоштовно', 'Gratis', 'Grátis', 'Miễn phí', 'Gratis', 'Ücretsiz', 'Bezpłatne'],
  plus: ['Plus-награда', 'Plus-нагорода', 'Premio Plus', 'Prêmio Plus', 'Phần thưởng Plus', 'Hadiah Plus', 'Plus ödülü', 'Nagroda Plus'],
  rewardPearls: ['{amount} жемчужин', '{amount} перлин', '{amount} perlas', '{amount} pérolas', '{amount} ngọc trai', '{amount} mutiara', '{amount} inci', '{amount} pereł'],
  rewardSpin: ['{amount} спин', '{amount} спін', '{amount} giro', '{amount} giro', '{amount} lượt quay', '{amount} putaran', '{amount} çevirme', '{amount} spin'],
  score: ['Счёт', 'Рахунок', 'Puntos', 'Pontos', 'Điểm', 'Skor', 'Skor', 'Wynik'],
  tier: ['Лига', 'Ліга', 'Liga', 'Liga', 'Giải', 'Liga', 'Lig', 'Liga'],
  tierBronze: ['Бронза', 'Бронза', 'Bronce', 'Bronze', 'Đồng', 'Perunggu', 'Bronz', 'Brąz'],
  tierSilver: ['Серебро', 'Срібло', 'Plata', 'Prata', 'Bạc', 'Perak', 'Gümüş', 'Srebro'],
  tierGold: ['Золото', 'Золото', 'Oro', 'Ouro', 'Vàng', 'Emas', 'Altın', 'Złoto'],
  tierPlatinum: ['Платина', 'Платина', 'Platino', 'Platina', 'Bạch kim', 'Platinum', 'Platin', 'Platyna'],
  tierDiamond: ['Алмаз', 'Діамант', 'Diamante', 'Diamante', 'Kim cương', 'Berlian', 'Elmas', 'Diament'],
  tierMaster: ['Мастер', 'Майстер', 'Maestro', 'Mestre', 'Bậc thầy', 'Master', 'Usta', 'Mistrz'],
  tierGrandmaster: ['Грандмастер', 'Грандмайстер', 'Gran maestro', 'Grão-mestre', 'Đại cao thủ', 'Grandmaster', 'Büyük Usta', 'Arcymistrz'],
  tierLegend: ['Легенда', 'Легенда', 'Leyenda', 'Lenda', 'Huyền thoại', 'Legenda', 'Efsane', 'Legenda'],
  back: ['Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz'],
  you: ['Ты', 'Ти', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'],
  submit: ['Ответить', 'Відповісти', 'Responder', 'Responder', 'Trả lời', 'Jawab', 'Yanıtla', 'Odpowiedz'],
  selectFriend: ['Выбери друга', 'Обери друга', 'Elige un amigo', 'Escolha um amigo', 'Chọn một người bạn', 'Pilih teman', 'Bir arkadaş seç', 'Wybierz znajomego'],
  noFriends: ['Здесь появятся твои друзья', 'Тут з’являться твої друзі', 'Aquí aparecerán tus amigos', 'Seus amigos aparecerão aqui', 'Bạn bè sẽ xuất hiện ở đây', 'Temanmu akan muncul di sini', 'Arkadaşların burada görünecek', 'Tutaj pojawią się znajomi'],
  friendHint: ['Без рейтинга и наград', 'Без рейтингу й нагород', 'Sin rango ni recompensas', 'Sem ranking nem recompensas', 'Không xếp hạng hay phần thưởng', 'Tanpa peringkat dan hadiah', 'Derece ve ödül yok', 'Bez rankingu i nagród'],
  correct: ['Верно', 'Правильно', 'Correcto', 'Correto', 'Đúng', 'Benar', 'Doğru', 'Dobrze'],
  wrong: ['Не совсем', 'Не зовсім', 'No del todo', 'Ainda não', 'Chưa đúng', 'Belum tepat', 'Tam değil', 'Nie tym razem'],
  inviteTtl: ['Действует 24 часа', 'Діє 24 години', 'Válida durante 24 horas', 'Válido por 24 horas', 'Có hiệu lực trong 24 giờ', 'Berlaku 24 jam', '24 saat geçerli', 'Ważne przez 24 godziny'],
  stars: ['Звёзды сезона', 'Зірки сезону', 'Estrellas de temporada', 'Estrelas da temporada', 'Sao mùa giải', 'Bintang musim', 'Sezon yıldızları', 'Gwiazdy sezonu'],
  spins: ['Спины', 'Спіни', 'Giros', 'Giros', 'Lượt quay', 'Putaran', 'Çevirmeler', 'Losowania'],
  spinNow: ['Крутить спин', 'Крутити спін', 'Girar', 'Girar', 'Quay ngay', 'Putar sekarang', 'Çevir', 'Losuj'],
  spinReward: ['+{amount} жемчужин', '+{amount} перлин', '+{amount} perlas', '+{amount} pérolas', '+{amount} ngọc trai', '+{amount} mutiara', '+{amount} inci', '+{amount} pereł'],
  rankedQuickOffer: ['Не хочется ждать?', 'Не хочеш чекати?', '¿No quieres esperar?', 'Não quer esperar?', 'Không muốn chờ?', 'Tidak ingin menunggu?', 'Beklemek istemiyor musun?', 'Nie chcesz czekać?'],
  switchToQuick: ['Перейти в быстрый матч', 'Перейти у швидкий матч', 'Ir a partida rápida', 'Ir para partida rápida', 'Chuyển sang trận nhanh', 'Beralih ke laga cepat', 'Hızlı maça geç', 'Przejdź do szybkiego meczu'],
  rankedEmpty: ['Подходящий соперник пока не найден', 'Відповідного суперника поки не знайдено', 'Aún no encontramos un rival adecuado', 'Ainda não encontramos um adversário adequado', 'Chưa tìm thấy đối thủ phù hợp', 'Lawan yang cocok belum ditemukan', 'Henüz uygun bir rakip bulunamadı', 'Nie znaleźliśmy jeszcze odpowiedniego rywala'],
  rankedEmptyHint: ['Можно продолжить поиск людей с рангом ±1 или перейти в быстрый матч.', 'Можна продовжити пошук людей із рангом ±1 або перейти у швидкий матч.', 'Puedes seguir buscando jugadores de rango ±1 o pasar a una partida rápida.', 'Você pode continuar buscando jogadores de rank ±1 ou ir para uma partida rápida.', 'Bạn có thể tiếp tục tìm người chơi hạng ±1 hoặc chuyển sang trận nhanh.', 'Kamu bisa terus mencari pemain rank ±1 atau beralih ke laga cepat.', '±1 rütbedeki oyuncuları aramaya devam edebilir veya hızlı maça geçebilirsin.', 'Możesz dalej szukać graczy z rangą ±1 albo przejść do szybkiego meczu.'],
  continueSearch: ['Продолжить поиск', 'Продовжити пошук', 'Seguir buscando', 'Continuar buscando', 'Tiếp tục tìm', 'Lanjut mencari', 'Aramaya devam et', 'Szukaj dalej'],
  leaveTitle: ['Выйти из дуэли?', 'Вийти з дуелі?', '¿Salir del duelo?', 'Sair do duelo?', 'Rời trận đấu?', 'Keluar dari duel?', 'Düellodan çıkılsın mı?', 'Opuścić pojedynek?'],
  leaveBody: ['После старта это засчитается как поражение.', 'Після старту це зарахується як поразка.', 'Después de empezar contará como derrota.', 'Depois do início contará como derrota.', 'Sau khi bắt đầu, đây sẽ tính là thua.', 'Setelah mulai, ini dihitung sebagai kalah.', 'Başladıktan sonra yenilgi sayılır.', 'Po rozpoczęciu zostanie to uznane za porażkę.'],
  stay: ['Остаться', 'Залишитися', 'Quedarme', 'Ficar', 'Ở lại', 'Tetap', 'Kal', 'Zostań'],
  leaveConfirm: ['Выйти', 'Вийти', 'Salir', 'Sair', 'Rời đi', 'Keluar', 'Çık', 'Wyjdź'],
  maintenanceHint: ['Матч, который уже идёт, можно спокойно доиграть. Новый начнётся, когда Арену включат.', 'Матч, який уже триває, можна спокійно дограти. Новий почнеться, коли Арену увімкнуть.', 'Puedes terminar la partida en curso. Podrás empezar otra cuando Arena vuelva.', 'Você pode terminar a partida em andamento. Outra começará quando a Arena voltar.', 'Trận đang diễn ra vẫn có thể chơi hết. Trận mới sẽ bắt đầu khi Đấu trường bật lại.', 'Laga yang sedang berjalan tetap bisa diselesaikan. Laga baru dimulai saat Arena dinyalakan.', 'Süren maçı bitirebilirsin. Yeni maç, Arena açıldığında başlar.', 'Trwający mecz dokończysz spokojnie. Nowy zacznie się, gdy Arena wróci.'],
  maintenance: ['Арена временно на паузе. Текущий матч можно спокойно завершить.', 'Арена тимчасово на паузі. Поточний матч можна спокійно завершити.', 'Arena está en pausa. Puedes terminar tu partida actual.', 'A Arena está em pausa. Você pode terminar a partida atual.', 'Đấu trường đang tạm dừng. Bạn vẫn có thể hoàn thành trận hiện tại.', 'Arena sedang dijeda. Kamu tetap bisa menyelesaikan laga saat ini.', 'Arena geçici olarak duraklatıldı. Mevcut maçı bitirebilirsin.', 'Arena jest chwilowo wstrzymana. Możesz dokończyć bieżący mecz.'],
} as const;

export const ARENA_RANKED_COPY_KEYS = [
  'rankedQuickOffer',
  'switchToQuick',
  'rankedEmpty',
  'rankedEmptyHint',
  'continueSearch',
] as const satisfies readonly (keyof typeof C)[];

export type ArenaCopyKey = keyof typeof C;

export function arenaText(lang: Lang, key: ArenaCopyKey): string {
  const [ru, uk, es, ptBR, vi, id, tr, pl] = C[key];
  return triLang(lang, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/**
 * Сколько живых игроков ищет сейчас.
 *
 * Сами строки и правило склонения лежат в `searching_copy.ts`: там их видно
 * тесту без запуска приложения. Здесь остаётся только выбор локали.
 */
export function arenaSearchingCountText(lang: Lang, count: number): string {
  const value = arenaSearchingCount(count);
  // Ноль — отдельная фраза, а не «0 игроков»: пустой рейтинг честнее назвать
  // пустым, чем показывать цифру, от которой игрок ждёт соперника.
  if (value === 0) return arenaText(lang, 'rankedEmptyHint');
  const forms = arenaSearchingCountForms(value);
  return triLang(lang, {
    ru: forms.ru, uk: forms.uk, es: forms.es, 'pt-BR': forms['pt-BR'],
    vi: forms.vi, id: forms.id, tr: forms.tr, pl: forms.pl,
  });
}

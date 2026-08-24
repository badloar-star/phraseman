import type { Lang } from "../constants/i18n";

export type HomeTheoAction =
  | "lesson"
  | "lessons"
  | "mistakes"
  | "stats"
  | "aiDialog"
  | "flashcards"
  | "none";

export type HomeTheoAdvice = {
  id: string;
  priority: number;
  action: HomeTheoAction;
  copy: Record<Lang, string>;
};

export type HomeTheoAdvisorContext = {
  lang: Lang;
  totalXP: number;
  level: number;
  streak: number;
  weekPoints: number;
  lessonsCompleted: number;
  lastLessonId: number | null;
  lastLessonProgress: number;
  dueCount: number;
  energyCount: number;
  energyMax: number;
  hasPremiumAccess: boolean;
  isPremium: boolean;
  isVip: boolean;
  hadPremiumEver: boolean;
  freezeActive: boolean;
  streakAtRisk: boolean;
  showRepairCard: boolean;
  repairProgress: number;
  homeXpPercentile: number | null;
  medalTotal: number;
  weekDone: readonly boolean[];
  totalXPMulti: number;
};

const fallbackCopy = (
  ru: string,
  uk: string,
  es: string,
  pt: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): Record<Lang, string> => ({
  ru,
  uk,
  es,
  "pt-BR": pt,
  vi,
  id,
  tr,
  pl,
});

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}

function stablePick<T>(items: readonly T[], salt: number): T {
  return items[Math.abs(salt) % items.length]!;
}

function matches(ctx: HomeTheoAdvisorContext, ruleId: string): boolean {
  const todayDoneCount = ctx.weekDone.filter(Boolean).length;
  switch (ruleId) {
    case "vip_welcome":
      return ctx.isVip;
    case "first_visit":
      return (
        ctx.totalXP <= 0 &&
        ctx.lessonsCompleted <= 0 &&
        ctx.lastLessonId == null
      );
    case "first_lesson_started":
      return (
        ctx.lessonsCompleted === 0 &&
        ctx.lastLessonId != null &&
        ctx.lastLessonProgress > 0 &&
        ctx.lastLessonProgress < 45
      );
    case "finish_near_lesson":
      return (
        ctx.lastLessonId != null &&
        ctx.lastLessonProgress >= 35 &&
        ctx.lastLessonProgress < 45
      );
    case "continue_lesson":
      return ctx.lastLessonId != null && ctx.lastLessonProgress > 0;
    case "no_lesson_yet":
      return (
        ctx.totalXP > 0 &&
        ctx.lastLessonId == null &&
        ctx.lessonsCompleted === 0
      );
    case "streak_at_risk":
      return ctx.streakAtRisk;
    case "freeze_active":
      return ctx.freezeActive;
    case "repair_available":
      return ctx.showRepairCard;
    case "mistakes_due_many":
      return ctx.dueCount >= 10;
    case "mistakes_due_some":
      return ctx.dueCount > 0;
    case "energy_low":
      return (
        !ctx.hasPremiumAccess &&
        ctx.energyCount <= Math.max(1, Math.floor(ctx.energyMax / 3))
      );
    case "premium_multiplier":
      return ctx.totalXPMulti > 1.01;
    case "new_premium":
      return ctx.isPremium && ctx.hadPremiumEver && ctx.totalXP < 1500;
    case "good_streak":
      return ctx.streak >= 7 && ctx.streak < 30;
    case "big_streak":
      return ctx.streak >= 30;
    case "new_week":
      return todayDoneCount <= 1 && ctx.weekPoints <= 80;
    case "week_active":
      return ctx.weekPoints >= 250 && todayDoneCount >= 3;
    case "percentile_visible":
      return ctx.homeXpPercentile !== null;
    case "medal_collector":
      return ctx.medalTotal >= 3;
    case "level_early":
      return ctx.level >= 2 && ctx.level < 5;
    case "level_mid":
      return ctx.level >= 5 && ctx.level < 10;
    case "level_high":
      return ctx.level >= 10;
    case "lessons_3_done":
      return ctx.lessonsCompleted >= 3 && ctx.lessonsCompleted < 8;
    case "lessons_8_done":
      return ctx.lessonsCompleted >= 8;
    case "ai_dialog_suggestion":
      return ctx.lessonsCompleted >= 1 && ctx.dueCount === 0;
    default:
      return true;
  }
}

const RULES: readonly HomeTheoAdvice[] = [
  {
    id: "vip_welcome",
    priority: 990,
    action: "stats",
    copy: fallbackCopy(
      "Всё открыто для тебя. Загляни в свои результаты: там видно, где ты уже силён, а где стоит добрать повторением.",
      "Усе відкрито для тебе. Зазирни у свої результати: там видно, де ти вже сильний, а де варто додати повторення.",
      "Lo tienes todo abierto. Mira tus resultados: verás dónde ya eres fuerte y qué conviene repasar.",
      "Você tem tudo liberado. Veja seus resultados: dá pra ver onde já está forte e o que vale repassar.",
      "Bạn đã mở mọi thứ. Xem kết quả của bạn: sẽ rõ chỗ nào đã mạnh, chỗ nào nên ôn thêm.",
      "Kamu punya akses penuh. Lihat hasilmu: kelihatan bagian yang sudah kuat dan yang perlu diulang.",
      "Her şey sana açık. Sonuçlarına bak: nerede güçlüsün, neyi tekrar etmek iyi olur, orada görünür.",
      "Masz wszystko otwarte. Zajrzyj do swoich wyników: zobaczysz, gdzie jesteś mocny, a co warto powtórzyć.",
    ),
  },
  {
    id: "first_visit",
    priority: 970,
    action: "lessons",
    copy: fallbackCopy(
      "Первый раз тут? Начни с первого раунда. 6-8 минут — и я уже пойму, что советовать дальше.",
      "Перший раз тут? Почни з першого раунду. 6-8 хвилин — і я вже зрозумію, що радити далі.",
      "¿Primera vez aquí? Empieza por la primera ronda. Con 6-8 minutos ya sé qué sugerirte después.",
      "Primeira vez aqui? Comece pela primeira rodada. Com 6-8 minutos já sei o que sugerir depois.",
      "Lần đầu ở đây? Bắt đầu vòng đầu tiên. 6-8 phút là mình biết gợi ý gì tiếp theo.",
      "Baru pertama di sini? Mulai dari ronde pertama. 6-8 menit dan aku sudah tahu langkah berikutnya.",
      "İlk gelişin mi? İlk turla başla. 6-8 dakika yeter, sonraki adımı önereyim.",
      "Pierwszy raz tutaj? Zacznij od pierwszej rundy. 6-8 minut i już wiem, co doradzić dalej.",
    ),
  },
  {
    id: "first_lesson_started",
    priority: 940,
    action: "lesson",
    copy: fallbackCopy(
      "Ты уже начал первый раунд. Закрой его сегодня — так фразы лучше осядут в памяти.",
      "Ти вже почав перший раунд. Закрий його сьогодні — так фрази краще осядуть у пам’яті.",
      "Ya empezaste la primera ronda. Termínala hoy: así las frases se quedan mejor en la memoria.",
      "Você já começou a primeira rodada. Termine hoje: as frases fixam melhor assim.",
      "Bạn đã bắt đầu vòng đầu. Hoàn tất hôm nay để câu chữ nhớ lâu hơn.",
      "Kamu sudah mulai ronde pertama. Selesaikan hari ini biar frasanya lebih nempel.",
      "İlk tura başladın bile. Bugün bitir: ifadeler böyle daha iyi yerleşir.",
      "Pierwsza runda już zaczęta. Dokończ ją dziś — frazy lepiej zapadną w pamięć.",
    ),
  },
  {
    id: "finish_near_lesson",
    priority: 930,
    action: "lesson",
    copy: fallbackCopy(
      "Ты почти закрыл раунд. Ещё один короткий заход полезнее, чем начинать новый режим.",
      "Ти майже закрив раунд. Ще один короткий захід корисніший, ніж починати новий режим.",
      "Casi terminas la ronda. Un empujón corto rinde más que abrir otro modo ahora.",
      "Você está quase terminando a rodada. Um empurrão curto rende mais que abrir outro modo agora.",
      "Bạn gần xong vòng rồi. Một lượt ngắn nữa tốt hơn mở chế độ mới.",
      "Rondenya hampir selesai. Satu dorongan pendek lebih baik daripada pindah mode.",
      "Tur bitmek üzere. Şimdi yeni moda geçmek yerine kısa bir hamle daha iyi.",
      "Runda prawie zamknięta. Krótki finisz da więcej niż przełączanie trybu.",
    ),
  },
  {
    id: "streak_at_risk",
    priority: 920,
    action: "lesson",
    copy: fallbackCopy(
      "Серию легко удержать. Сделай короткий шаг сейчас: раунд, тренажёр или вызов дня.",
      "Серію легко втримати. Зроби короткий крок зараз: раунд, тренажер або виклик дня.",
      "La racha es fácil de mantener. Da un paso corto ahora: una ronda, el entrenador o el reto del día.",
      "Manter a sequência é fácil. Dê um passo curto agora: uma rodada, o treino ou o desafio do dia.",
      "Giữ chuỗi rất dễ. Làm một bước ngắn ngay: một vòng, luyện tập hoặc thử thách hôm nay.",
      "Menjaga rangkaian itu mudah. Ambil langkah pendek sekarang: satu ronde, trainer, atau tantangan harian.",
      "Seriyi tutmak kolay. Şimdi kısa bir adım at: bir tur, antrenör veya günün görevi.",
      "Serię łatwo utrzymać. Zrób krótki krok teraz: runda, trener albo wyzwanie dnia.",
    ),
  },
  {
    id: "repair_available",
    priority: 910,
    action: "lesson",
    copy: fallbackCopy(
      "Хороший момент вернуться в ритм. Восстанови серию — привычка вернётся без чувства старта с нуля.",
      "Гарний момент повернутися в ритм. Віднови серію — звичка повернеться без відчуття старту з нуля.",
      "Buen momento para volver al ritmo. Recupera la racha y el hábito vuelve sin sensación de empezar de cero.",
      "Bom momento pra voltar ao ritmo. Recupere a sequência: o hábito volta sem aquela sensação de recomeço.",
      "Thời điểm tốt để vào lại nhịp. Khôi phục chuỗi để thói quen trở lại mà không thấy như bắt đầu lại.",
      "Saat yang pas untuk kembali ke ritme. Pulihkan rangkaian agar kebiasaan kembali tanpa rasa mulai dari nol.",
      "Ritme dönmek için iyi an. Seriyi onar; alışkanlık sıfırdan başlamadan döner.",
      "Dobry moment, by wrócić do rytmu. Odbuduj serię, a nawyk wróci bez startu od zera.",
    ),
  },
  {
    id: "mistakes_due_many",
    priority: 880,
    action: "mistakes",
    copy: fallbackCopy(
      "У тебя накопились слабые места. 10 минут тренажёра дадут больше роста, чем новый материал.",
      "У тебе накопичилися слабкі місця. 10 хвилин тренажера дадуть більше росту, ніж новий матеріал.",
      "Tienes puntos débiles acumulados. 10 minutos en el entrenador rinden más que material nuevo ahora.",
      "Você tem pontos fracos acumulados. 10 minutos no treino rendem mais que conteúdo novo agora.",
      "Bạn có những điểm yếu đang dồn lại. 10 phút luyện tập lúc này tốt hơn học bài mới.",
      "Ada titik lemah yang menumpuk. 10 menit di trainer lebih berguna daripada materi baru.",
      "Zayıf noktaların birikmiş. 10 dakika antrenör yeni konudan daha çok geliştirir.",
      "Masz nazbierane słabe miejsca. 10 minut trenera da więcej niż nowy materiał.",
    ),
  },
  {
    id: "energy_low",
    priority: 830,
    action: "mistakes",
    copy: fallbackCopy(
      "Энергии мало. Выбери короткий режим: тренажёр слабых мест или повторение лучше длинного раунда.",
      "Енергії мало. Обери короткий режим: тренажер слабких місць або повторення краще за довгий раунд.",
      "Tienes poca energía. Elige un modo corto: el entrenador de puntos débiles o un repaso valen más que una ronda larga.",
      "Está com pouca energia. Escolha um modo curto: o treino dos pontos fracos ou um repasso valem mais que uma rodada longa.",
      "Năng lượng thấp. Chọn chế độ ngắn: luyện điểm yếu hoặc ôn lại tốt hơn một vòng dài.",
      "Energi rendah. Pilih mode pendek: trainer titik lemah atau pengulangan lebih baik dari ronde panjang.",
      "Enerji az. Kısa mod seç: zayıf noktalar antrenörü ya da tekrar, uzun bir turdan iyi.",
      "Mało energii. Wybierz krótki tryb: trener słabych miejsc albo powtórka zamiast długiej rundy.",
    ),
  },
  {
    id: "ai_dialog_suggestion",
    priority: 480,
    action: "aiDialog",
    copy: fallbackCopy(
      "Раунды идут нормально — добавь разговор. Компас тренирует быстрый ответ, а не только узнавание фразы.",
      "Раунди йдуть нормально — додай розмову. Компас тренує швидку відповідь, а не лише впізнавання фрази.",
      "Las rondas van bien: añade conversación. La brújula entrena la respuesta rápida, no solo reconocer la frase.",
      "As rodadas vão bem: adicione conversa. A bússola treina a resposta rápida, não só reconhecer a frase.",
      "Các vòng đang ổn: thêm hội thoại. La bàn luyện phản xạ trả lời, không chỉ nhận ra câu.",
      "Ronde berjalan lancar: tambah percakapan. Kompas melatih jawaban cepat, bukan cuma mengenali frasa.",
      "Turlar yolunda: konuşma ekle. Pusula sadece ifadeyi tanımayı değil, hızlı cevabı çalıştırır.",
      "Rundy idą dobrze: dodaj rozmowę. Kompas ćwiczy szybką odpowiedź, nie tylko rozpoznanie frazy.",
    ),
  },
];

const ROTATION: readonly HomeTheoAdvice[] = [
  {
    id: "continue_lesson",
    priority: 500,
    action: "lesson",
    copy: fallbackCopy(
      "Лучший следующий шаг уже открыт: продолжи последний раунд, пока всё свежо.",
      "Найкращий наступний крок уже відкритий: продовж останній раунд, доки все свіже.",
      "El mejor paso siguiente ya está abierto: continúa la última ronda mientras todo está fresco.",
      "O melhor próximo passo já está aberto: continue a última rodada enquanto está tudo fresco.",
      "Bước tiếp theo tốt nhất đã mở sẵn: tiếp tục vòng gần nhất khi còn nhớ rõ.",
      "Langkah terbaik berikutnya sudah terbuka: lanjutkan ronde terakhir selagi masih segar.",
      "En iyi sonraki adım açık: her şey tazeyken son tura devam et.",
      "Najlepszy kolejny krok już czeka: kontynuuj ostatnią rundę, póki wszystko świeże.",
    ),
  },
  {
    id: "mistakes_due_some",
    priority: 490,
    action: "mistakes",
    copy: fallbackCopy(
      "Есть пара фраз на повторение. Закрой их до нового раунда — так новое лучше цепляется.",
      "Є кілька фраз на повторення. Закрий їх до нового раунду — так нове краще чіпляється.",
      "Hay un par de frases para repasar. Ciérralas antes de una ronda nueva: lo nuevo se queda mejor.",
      "Há algumas frases para repassar. Feche antes de uma rodada nova: o novo fixa melhor.",
      "Có vài câu cần ôn. Xử lý trước vòng mới để bài mới nhớ chắc hơn.",
      "Ada beberapa frasa untuk diulang. Selesaikan sebelum ronde baru biar yang baru lebih nempel.",
      "Tekrarlanacak birkaç ifade var. Yeni turdan önce bitir; yenisi daha iyi tutunur.",
      "Czeka kilka fraz do powtórki. Zrób je przed nową rundą, żeby nowe lepiej weszło.",
    ),
  },
  {
    id: "good_streak",
    priority: 430,
    action: "stats",
    copy: fallbackCopy(
      "Серия уже крепкая. Смотри не только на дни, а на качество: твои результаты покажут слабые места.",
      "Серія вже міцна. Дивись не лише на дні, а й на якість: твої результати покажуть слабкі місця.",
      "Tu racha ya es sólida. Mira no solo los días, sino la calidad: tus resultados muestran los puntos débiles.",
      "Sua sequência já está firme. Olhe não só os dias, mas a qualidade: seus resultados mostram os pontos fracos.",
      "Chuỗi của bạn đã chắc. Đừng chỉ nhìn số ngày, hãy nhìn chất lượng: kết quả sẽ chỉ ra điểm yếu.",
      "Rangkaianmu sudah kuat. Lihat bukan cuma harinya, tapi kualitasnya: hasilmu menunjukkan titik lemah.",
      "Serin sağlam artık. Sadece günlere değil kaliteye de bak: sonuçların zayıf noktaları gösterir.",
      "Twoja seria jest już mocna. Patrz nie tylko na dni, ale na jakość: twoje wyniki pokażą słabe miejsca.",
    ),
  },
  {
    id: "big_streak",
    priority: 420,
    action: "mistakes",
    copy: fallbackCopy(
      "Большая серия — это сила. Чтобы не уйти в автопилот, добавляй тренажёр слабых мест раз в пару дней.",
      "Велика серія — це сила. Щоб не перейти в автопілот, додавай тренажер слабких місць раз на кілька днів.",
      "Una racha grande es fuerza. Para no entrar en piloto automático, suma el entrenador de puntos débiles cada par de días.",
      "Uma sequência grande é força. Pra não entrar no piloto automático, some o treino dos pontos fracos a cada par de dias.",
      "Chuỗi dài là sức mạnh. Để khỏi rơi vào tự động, thêm luyện điểm yếu vài ngày một lần.",
      "Rangkaian panjang itu kekuatan. Biar tidak autopilot, tambah trainer titik lemah tiap beberapa hari.",
      "Büyük seri güçtür. Otomatiğe bağlanmamak için birkaç günde bir zayıf noktalar antrenörü ekle.",
      "Duża seria to siła. Żeby nie wejść w autopilota, dodaj trener słabych miejsc co kilka dni.",
    ),
  },
  {
    id: "new_week",
    priority: 410,
    action: "lesson",
    copy: fallbackCopy(
      "Неделя ещё пустая. Один маленький заход сегодня сделает завтра легче.",
      "Тиждень ще порожній. Один маленький захід сьогодні зробить завтра легшим.",
      "La semana aún está vacía. Un pequeño paso hoy hará el mañana más fácil.",
      "A semana ainda está vazia. Um passo pequeno hoje deixa o amanhã mais fácil.",
      "Tuần còn trống. Một lượt nhỏ hôm nay sẽ làm ngày mai dễ hơn.",
      "Minggu masih kosong. Satu langkah kecil hari ini bikin besok lebih mudah.",
      "Hafta daha boş. Bugün küçük bir adım yarını kolaylaştırır.",
      "Tydzień jest jeszcze pusty. Mały krok dziś ułatwi jutro.",
    ),
  },
  {
    id: "week_active",
    priority: 400,
    action: "aiDialog",
    copy: fallbackCopy(
      "Неделя уже активная. Добавь разговор: проверь, можешь ли доставать фразы без подсказки.",
      "Тиждень уже активний. Додай розмову: перевір, чи дістаєш фрази без підказки.",
      "La semana ya está activa. Añade conversación: comprueba si sacas las frases sin pistas.",
      "A semana já está ativa. Adicione conversa: veja se tira as frases sem dicas.",
      "Tuần này đã sôi nổi. Thêm hội thoại: thử xem bạn có nhớ câu mà không cần gợi ý.",
      "Minggu ini sudah aktif. Tambah percakapan: cek apakah kamu bisa keluarkan frasa tanpa petunjuk.",
      "Hafta zaten hareketli. Konuşma ekle: ipuçsuz ifadeleri çıkarabiliyor musun gör.",
      "Tydzień już aktywny. Dodaj rozmowę: sprawdź, czy wyciągasz frazy bez podpowiedzi.",
    ),
  },
  {
    id: "percentile_visible",
    priority: 390,
    action: "stats",
    copy: fallbackCopy(
      "Ты уже в сравнении по очкам. Это компас, но выбирай по слабым местам, а не по гонке.",
      "Ти вже у порівнянні за очками. Це компас, але обирай за слабкими місцями, а не за гонкою.",
      "Ya estás en la comparación por puntos. Úsalo de brújula, pero elige por tus puntos débiles, no por la carrera.",
      "Você já está na comparação por pontos. Use de bússola, mas escolha pelos pontos fracos, não pela corrida.",
      "Bạn đã có trong bảng so sánh điểm. Coi như la bàn, nhưng chọn theo điểm yếu, đừng chạy đua.",
      "Kamu sudah ada di perbandingan poin. Pakai sebagai kompas, tapi pilih dari titik lemah, bukan balapan.",
      "Puan karşılaştırmasındasın artık. Pusula olsun, ama yarışa değil zayıf noktalara göre seç.",
      "Jesteś już w porównaniu według punktów. Niech to będzie kompas, ale wybieraj po słabych miejscach, nie po wyścigu.",
    ),
  },
  {
    id: "medal_collector",
    priority: 370,
    action: "lessons",
    copy: fallbackCopy(
      "Медали уже копятся. Дальше рост не в наградах, а в повторе сложных мест.",
      "Медалі вже накопичуються. Далі ріст не в нагородах, а в повторі складних місць.",
      "Las medallas ya se acumulan. El próximo avance no está en premios, sino en repetir las partes difíciles.",
      "As medalhas já se acumulam. O próximo avanço não está nos prêmios, mas em repetir as partes difíceis.",
      "Huy chương đã gom được. Bước tiến tiếp theo không ở phần thưởng mà ở việc ôn lại chỗ khó.",
      "Medali sudah terkumpul. Pertumbuhan berikutnya bukan di hadiah, tapi di mengulang bagian sulit.",
      "Madalyalar birikiyor. Sıradaki gelişim ödüllerde değil, zor yerleri tekrarlamakta.",
      "Medale już się zbierają. Dalszy wzrost nie w nagrodach, lecz w powtórkach trudnych miejsc.",
    ),
  },
  {
    id: "level_early",
    priority: 360,
    action: "lessons",
    copy: fallbackCopy(
      "На ранних уровнях важнее частота, чем марафон. Один раунд плюс одно повторение — идеальная связка.",
      "На ранніх рівнях важливіша частота, ніж марафон. Один раунд плюс одне повторення — ідеальна зв’язка.",
      "En los niveles iniciales, la frecuencia gana al maratón. Una ronda más un repaso es la pareja ideal.",
      "Nos níveis iniciais, a frequência vence a maratona. Uma rodada mais um repasso é o par ideal.",
      "Ở mức đầu, đều đặn quan trọng hơn học dài. Một vòng cộng một lượt ôn là cặp đôi lý tưởng.",
      "Di level awal, frekuensi mengalahkan maraton. Satu ronde plus satu pengulangan itu pas.",
      "İlk seviyelerde sıklık maratonu yener. Bir tur artı bir tekrar, ideal ikili.",
      "Na wczesnych poziomach częstotliwość wygrywa z maratonem. Runda plus powtórka to idealny zestaw.",
    ),
  },
  {
    id: "level_mid",
    priority: 350,
    action: "mistakes",
    copy: fallbackCopy(
      "Уровень растёт. Самый быстрый рост теперь в слабых местах: это почти-готовые фразы, им нужен один шаг.",
      "Рівень росте. Найшвидший ріст тепер у слабких місцях: це майже-готові фрази, їм потрібен один крок.",
      "Tu nivel sube. El avance más rápido ahora está en los puntos débiles: son frases casi listas, les falta un paso.",
      "Seu nível sobe. O avanço mais rápido agora está nos pontos fracos: são frases quase prontas, falta um passo.",
      "Cấp độ đang lên. Tiến nhanh nhất giờ ở điểm yếu: đó là những câu gần thuộc, chỉ thiếu một bước.",
      "Levelmu naik. Pertumbuhan tercepat sekarang di titik lemah: itu frasa yang hampir bisa, tinggal satu langkah.",
      "Seviyen yükseliyor. En hızlı gelişim artık zayıf noktalarda: bunlar neredeyse hazır ifadeler, bir adım kaldı.",
      "Twój poziom rośnie. Najszybszy postęp jest teraz w słabych miejscach: to prawie gotowe frazy, brakuje im kroku.",
    ),
  },
  {
    id: "level_high",
    priority: 340,
    action: "aiDialog",
    copy: fallbackCopy(
      "На твоём уровне чаще доставай язык из памяти. Разговор лучше всего переносит знание в речь.",
      "На твоєму рівні частіше діставай мову з пам’яті. Розмова найкраще переносить знання в мовлення.",
      "A tu nivel, saca el idioma de la memoria más seguido. La conversación es lo que mejor lo lleva al habla.",
      "No seu nível, tire o idioma da memória com mais frequência. A conversa é o que melhor leva isso pra fala.",
      "Ở mức của bạn, hãy kéo ngôn ngữ từ trí nhớ ra nhiều hơn. Hội thoại chuyển kiến thức sang lời nói tốt nhất.",
      "Di levelmu, ambil bahasa dari memori lebih sering. Percakapan paling baik membawanya jadi ucapan.",
      "Senin seviyende dili hafızadan daha sık çağır. Konuşma, bilgiyi konuşmaya en iyi taşır.",
      "Na twoim poziomie częściej wyciągaj język z pamięci. Rozmowa najlepiej przenosi go w mowę.",
    ),
  },
  {
    id: "lessons_3_done",
    priority: 330,
    action: "mistakes",
    copy: fallbackCopy(
      "После нескольких раундов полезно притормозить и собрать слабые места. Так база станет плотнее.",
      "Після кількох раундів корисно пригальмувати й зібрати слабкі місця. Так база стане щільнішою.",
      "Tras varias rondas conviene frenar y juntar los puntos débiles. Así la base queda más firme.",
      "Depois de algumas rodadas vale frear e juntar os pontos fracos. Assim a base fica mais firme.",
      "Sau vài vòng, hãy chậm lại và gom điểm yếu. Nền tảng sẽ chắc hơn.",
      "Setelah beberapa ronde, ada baiknya melambat dan kumpulkan titik lemah. Dasarnya jadi lebih kuat.",
      "Birkaç turdan sonra yavaşlayıp zayıf noktaları toplamak iyi olur. Temel daha sağlam olur.",
      "Po kilku rundach warto zwolnić i zebrać słabe miejsca. Baza będzie mocniejsza.",
    ),
  },
  {
    id: "lessons_8_done",
    priority: 320,
    action: "stats",
    copy: fallbackCopy(
      "Раундов уже достаточно, чтобы видеть закономерности. Твои результаты подскажут, что повторить первым.",
      "Раундів уже достатньо, щоб бачити закономірності. Твої результати підкажуть, що повторити першим.",
      "Ya hay rondas suficientes para ver patrones. Tus resultados te dicen qué repasar primero.",
      "Já há rodadas suficientes para ver padrões. Seus resultados dizem o que repassar primeiro.",
      "Đã đủ vòng để thấy quy luật. Kết quả của bạn sẽ gợi ý nên ôn gì trước.",
      "Sudah cukup ronde untuk melihat pola. Hasilmu menunjukkan apa yang perlu diulang dulu.",
      "Desenleri görmek için yeterince tur var. Sonuçların önce neyi tekrar edeceğini söyler.",
      "Masz już dość rund, by widzieć wzorce. Twoje wyniki podpowiedzą, co powtórzyć najpierw.",
    ),
  },
  {
    id: "flashcards_soft",
    priority: 300,
    action: "flashcards",
    copy: fallbackCopy(
      "Не хочется раунд сегодня? Открой карточки. Это мягкий вход, а память всё равно работает.",
      "Не хочеться раунду сьогодні? Відкрий картки. Це м’який вхід, а пам’ять усе одно працює.",
      "¿Hoy no te apetece una ronda? Abre las tarjetas. Es una entrada suave y la memoria igual trabaja.",
      "Hoje não está a fim de uma rodada? Abra os cartões. É uma entrada leve e a memória trabalha do mesmo jeito.",
      "Hôm nay không muốn một vòng? Mở thẻ ghi nhớ. Vào nhẹ nhàng mà trí nhớ vẫn hoạt động.",
      "Hari ini malas satu ronde? Buka kartu. Masuknya halus tapi memori tetap bekerja.",
      "Bugün tur istemiyor musun? Kartları aç. Yumuşak bir giriş, hafıza yine de çalışır.",
      "Nie chce ci się dziś rundy? Otwórz fiszki. To łagodny start, a pamięć i tak pracuje.",
    ),
  },
  {
    id: "premium_multiplier",
    priority: 295,
    action: "lesson",
    copy: fallbackCopy(
      "Сейчас очки идут быстрее. Потрать это на содержательную практику, а не на быстрые клики.",
      "Зараз очки йдуть швидше. Витрать це на змістовну практику, а не на швидкі кліки.",
      "Ahora los puntos suman más rápido. Aprovéchalo en práctica de verdad, no en clics rápidos.",
      "Agora os pontos sobem mais rápido. Aproveite em prática de verdade, não em cliques rápidos.",
      "Bây giờ điểm cộng nhanh hơn. Dùng cho luyện tập thật sự, đừng chỉ bấm nhanh.",
      "Sekarang poin bertambah lebih cepat. Pakai untuk latihan sungguhan, bukan klik cepat.",
      "Şu an puanlar daha hızlı geliyor. Bunu gerçek pratiğe harca, hızlı tıklara değil.",
      "Teraz punkty lecą szybciej. Wykorzystaj to na sensowną praktykę, nie na szybkie kliki.",
    ),
  },
  {
    id: "new_premium",
    priority: 290,
    action: "stats",
    copy: fallbackCopy(
      "Полный доступ уже у тебя. Сначала загляни в свои результаты и слабые места, чтобы не учиться вслепую.",
      "Повний доступ уже в тебе. Спершу зазирни у свої результати й слабкі місця, щоб не вчитися наосліп.",
      "Ya tienes acceso completo. Primero mira tus resultados y tus puntos débiles para no estudiar a ciegas.",
      "Você já tem acesso completo. Primeiro veja seus resultados e pontos fracos pra não estudar às cegas.",
      "Bạn đã có toàn quyền truy cập. Trước tiên hãy xem kết quả và điểm yếu để khỏi học mò.",
      "Akses penuh sudah di tanganmu. Pertama lihat hasil dan titik lemahmu agar tidak belajar buta.",
      "Tam erişim artık sende. Önce sonuçlarına ve zayıf noktalarına bak ki körlemesine çalışmayasın.",
      "Pełny dostęp już masz. Najpierw zajrzyj do swoich wyników i słabych miejsc, żeby nie uczyć się w ciemno.",
    ),
  },
];

export function getHomeTheoAdvice(ctx: HomeTheoAdvisorContext): HomeTheoAdvice {
  const candidates = [...RULES, ...ROTATION].filter((rule) =>
    matches(ctx, rule.id),
  );
  const maxPriority = Math.max(
    ...candidates.map((candidate) => candidate.priority),
  );
  const top = candidates.filter(
    (candidate) => candidate.priority === maxPriority,
  );
  const salt =
    dailySeed() +
    ctx.level * 7 +
    ctx.streak * 13 +
    ctx.lessonsCompleted * 17 +
    ctx.dueCount * 19;
  return stablePick(top, salt);
}

export function homeTheoText(advice: HomeTheoAdvice, lang: Lang): string {
  return advice.copy[lang] ?? advice.copy.ru;
}

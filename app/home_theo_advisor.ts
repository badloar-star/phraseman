import type { Lang } from '../constants/i18n';
import type { PersonalPlanHomeSnapshot } from './personal_plan_state';

export type HomeTheoAction =
  | 'lesson'
  | 'lessons'
  | 'trainer'
  | 'dailyTasks'
  | 'personalPlan'
  | 'personalPlanSetup'
  | 'stats'
  | 'aiDialog'
  | 'flashcards'
  | 'none';

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
  tasksCompleted: number;
  dailyTaskBarCount: number;
  dueCount: number;
  energyCount: number;
  energyMax: number;
  hasPremiumAccess: boolean;
  isPremium: boolean;
  isVip: boolean;
  onboardingPlanBilling: string | null;
  hadPremiumEver: boolean;
  freezeActive: boolean;
  streakAtRisk: boolean;
  showRepairCard: boolean;
  repairProgress: number;
  hasActivePersonalPlan: boolean;
  personalPlanSnapshot: PersonalPlanHomeSnapshot | null;
  homeXpPercentile: number | null;
  homeLeagueRaceVisible: boolean;
  medalTotal: number;
  weekDone: readonly boolean[];
  totalXPMulti: number;
};

const fallbackCopy = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string): Record<Lang, string> => ({
  ru,
  uk,
  es,
  'pt-BR': pt,
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
  const dailyTasksTotal = Math.max(1, ctx.dailyTaskBarCount);
  switch (ruleId) {
    case 'premium_onboarding':
      return ctx.hasPremiumAccess && Boolean(ctx.onboardingPlanBilling) && ctx.totalXP < 600;
    case 'vip_welcome':
      return ctx.isVip;
    case 'first_visit':
      return ctx.totalXP <= 0 && ctx.lessonsCompleted <= 0 && ctx.lastLessonId == null;
    case 'first_lesson_started':
      return ctx.lessonsCompleted === 0 && ctx.lastLessonId != null && ctx.lastLessonProgress > 0 && ctx.lastLessonProgress < 45;
    case 'finish_near_lesson':
      return ctx.lastLessonId != null && ctx.lastLessonProgress >= 35 && ctx.lastLessonProgress < 45;
    case 'continue_lesson':
      return ctx.lastLessonId != null && ctx.lastLessonProgress > 0;
    case 'no_lesson_yet':
      return ctx.totalXP > 0 && ctx.lastLessonId == null && ctx.lessonsCompleted === 0;
    case 'streak_at_risk':
      return ctx.streakAtRisk;
    case 'freeze_active':
      return ctx.freezeActive;
    case 'repair_available':
      return ctx.showRepairCard;
    case 'trainer_due_many':
      return ctx.dueCount >= 10;
    case 'trainer_due_some':
      return ctx.dueCount > 0;
    case 'daily_tasks_zero':
      return ctx.tasksCompleted === 0;
    case 'daily_tasks_almost':
      return ctx.tasksCompleted > 0 && ctx.tasksCompleted < dailyTasksTotal;
    case 'daily_tasks_done':
      return ctx.tasksCompleted >= dailyTasksTotal;
    case 'personal_plan_today':
      return Boolean(ctx.personalPlanSnapshot) && !ctx.personalPlanSnapshot?.todayDone;
    case 'personal_plan_done':
      return Boolean(ctx.personalPlanSnapshot?.todayDone);
    case 'no_personal_plan_premium':
      return ctx.hasPremiumAccess && !ctx.hasActivePersonalPlan;
    case 'no_personal_plan_free':
      return !ctx.hasPremiumAccess && !ctx.hasActivePersonalPlan && ctx.level >= 2;
    case 'energy_low':
      return !ctx.hasPremiumAccess && ctx.energyCount <= Math.max(1, Math.floor(ctx.energyMax / 3));
    case 'premium_multiplier':
      return ctx.totalXPMulti > 1.01;
    case 'new_premium':
      return ctx.isPremium && ctx.hadPremiumEver && ctx.totalXP < 1500;
    case 'good_streak':
      return ctx.streak >= 7 && ctx.streak < 30;
    case 'big_streak':
      return ctx.streak >= 30;
    case 'new_week':
      return todayDoneCount <= 1 && ctx.weekPoints <= 80;
    case 'week_active':
      return ctx.weekPoints >= 250 && todayDoneCount >= 3;
    case 'percentile_visible':
      return ctx.homeXpPercentile !== null;
    case 'league_visible':
      return ctx.homeLeagueRaceVisible;
    case 'medal_collector':
      return ctx.medalTotal >= 3;
    case 'level_early':
      return ctx.level >= 2 && ctx.level < 5;
    case 'level_mid':
      return ctx.level >= 5 && ctx.level < 10;
    case 'level_high':
      return ctx.level >= 10;
    case 'lessons_3_done':
      return ctx.lessonsCompleted >= 3 && ctx.lessonsCompleted < 8;
    case 'lessons_8_done':
      return ctx.lessonsCompleted >= 8;
    case 'ai_dialog_suggestion':
      return ctx.lessonsCompleted >= 1 && ctx.dueCount === 0 && ctx.tasksCompleted > 0;
    default:
      return true;
  }
}

const RULES: readonly HomeTheoAdvice[] = [
  {
    id: 'premium_onboarding',
    priority: 1000,
    action: 'personalPlanSetup',
    copy: fallbackCopy(
      'Ого, Premium сразу после онбординга. Я бы не распылялся: выбери личный план и дай приложению вести тебя по дням.',
      'Ого, Premium одразу після онбордингу. Я б не розпорошувався: обери особистий план і дай застосунку вести тебе по днях.',
      'Premium right after onboarding. I would start with a personal plan so the app can guide your daily route.',
      'Premium logo no onboarding. Eu começaria pelo plano pessoal para o app guiar sua rotina.',
      'Premium ngay sau onboarding. Mình sẽ bắt đầu bằng kế hoạch cá nhân để app dẫn bạn từng ngày.',
      'Premium langsung setelah onboarding. Mulai dari rencana pribadi agar app memandu latihan harianmu.',
      'Onboarding sonrası Premium güzel hamle. Kişisel planla başla; uygulama günlük rotanı kursun.',
      'Premium od razu po onboardingu. Zacząłbym od planu osobistego, żeby aplikacja prowadziła dzień po dniu.',
    ),
  },
  {
    id: 'vip_welcome',
    priority: 990,
    action: 'stats',
    copy: fallbackCopy(
      'VIP-режим включён. Загляни в статистику: там видно, где прогресс уже сильный, а где лучше добрать повторением.',
      'VIP-режим увімкнено. Зазирни в статистику: там видно, де прогрес сильний, а де варто додати повторення.',
      'VIP is on. Check stats to see what is already strong and what needs a review loop.',
      'VIP ativo. Veja as estatísticas: elas mostram o que já está forte e o que pede revisão.',
      'VIP đã bật. Xem thống kê để biết phần nào mạnh và phần nào cần ôn lại.',
      'VIP aktif. Buka statistik untuk melihat bagian kuat dan bagian yang perlu diulang.',
      'VIP açık. İstatistiklere bak: güçlü yerler ve tekrar isteyen alanlar orada netleşir.',
      'VIP aktywny. Zajrzyj do statystyk: zobaczysz mocne miejsca i te do powtórki.',
    ),
  },
  {
    id: 'first_visit',
    priority: 970,
    action: 'lessons',
    copy: fallbackCopy(
      'Первый раз тут? Начни с первого урока: 6-8 минут дадут мне первые сигналы, что тебе советовать дальше.',
      'Перший раз тут? Почни з першого уроку: 6-8 хвилин дадуть мені перші сигнали, що радити далі.',
      'First time here? Start lesson 1. Six to eight minutes is enough for me to guide the next step.',
      'Primeira vez aqui? Comece pela lição 1. Seis a oito minutos já dão sinal para o próximo passo.',
      'Lần đầu ở đây? Bắt đầu bài 1. Sáu đến tám phút là đủ để gợi ý bước tiếp theo.',
      'Baru pertama kali? Mulai dari pelajaran 1. Enam sampai delapan menit cukup untuk langkah berikutnya.',
      'İlk gelişin mi? 1. dersten başla. Altı sekiz dakika sonraki adımı seçmem için yeter.',
      'Pierwszy raz tutaj? Zacznij od lekcji 1. Sześć do ośmiu minut wystarczy na następny krok.',
    ),
  },
  {
    id: 'first_lesson_started',
    priority: 940,
    action: 'lesson',
    copy: fallbackCopy(
      'Ты уже вошёл в первый урок. Лучше добить его сегодня: мозг любит завершённые маленькие циклы.',
      'Ти вже зайшов у перший урок. Краще добити його сьогодні: мозок любить завершені маленькі цикли.',
      'You already started a lesson. Finish the small loop today; memory likes closed cycles.',
      'Você já começou uma lição. Feche esse ciclo hoje; a memória gosta de blocos completos.',
      'Bạn đã bắt đầu bài học. Hoàn tất vòng nhỏ hôm nay sẽ giúp nhớ tốt hơn.',
      'Kamu sudah mulai pelajaran. Selesaikan hari ini; memori suka siklus kecil yang tuntas.',
      'Derse başladın bile. Bugün küçük döngüyü bitir; hafıza tamamlanan işleri sever.',
      'Lekcja już zaczęta. Dokończ ją dziś; pamięć lubi zamknięte małe cykle.',
    ),
  },
  {
    id: 'finish_near_lesson',
    priority: 930,
    action: 'lesson',
    copy: fallbackCopy(
      'Ты почти закрыл урок. Ещё один короткий подход даст больше пользы, чем начинать новый режим.',
      'Ти майже закрив урок. Ще один короткий підхід дасть більше користі, ніж новий режим.',
      'You are close to finishing the lesson. One short push beats opening a new mode now.',
      'Você está perto de terminar a lição. Um empurrão curto vale mais que trocar de modo agora.',
      'Bạn gần xong bài rồi. Một lượt ngắn nữa tốt hơn mở chế độ mới.',
      'Pelajaran hampir selesai. Satu dorongan pendek lebih baik daripada pindah mode.',
      'Ders bitmek üzere. Şimdi yeni moda geçmek yerine kısa bir hamle daha iyi.',
      'Lekcja prawie zamknięta. Krótki finisz da więcej niż przełączanie trybu.',
    ),
  },
  {
    id: 'streak_at_risk',
    priority: 920,
    action: 'lesson',
    copy: fallbackCopy(
      'Цепочка под угрозой. Сделай самый короткий учебный шаг сейчас: урок, тренажёр или дневное задание.',
      'Ланцюжок під загрозою. Зроби найкоротший навчальний крок зараз: урок, тренажер або щоденне завдання.',
      'Your streak is at risk. Do the shortest useful step now: lesson, trainer, or daily task.',
      'Sua sequência está em risco. Faça o menor passo útil agora: lição, treino ou tarefa diária.',
      'Chuỗi của bạn đang gặp rủi ro. Làm bước ngắn nhất: bài học, luyện tập hoặc nhiệm vụ ngày.',
      'Rangkaianmu berisiko. Ambil langkah paling pendek: pelajaran, trainer, atau tugas harian.',
      'Serin riskte. En kısa faydalı adımı at: ders, trainer veya günlük görev.',
      'Seria jest zagrożona. Zrób najkrótszy sensowny krok: lekcja, trener albo zadanie dnia.',
    ),
  },
  {
    id: 'repair_available',
    priority: 910,
    action: 'lesson',
    copy: fallbackCopy(
      'Вижу шанс восстановить ритм. Пройди ремонт цепочки: так ты вернёшь привычку без чувства “начинать заново”.',
      'Бачу шанс відновити ритм. Пройди ремонт ланцюжка: так легше повернути звичку без старту з нуля.',
      'There is a rhythm repair window. Use it so the habit returns without feeling like a restart.',
      'Há uma chance de reparar o ritmo. Use para voltar ao hábito sem sensação de recomeço.',
      'Có cơ hội sửa nhịp học. Dùng nó để quay lại thói quen mà không phải bắt đầu lại.',
      'Ada peluang memperbaiki ritme. Pakai agar kebiasaan kembali tanpa rasa mulai dari nol.',
      'Ritmi onarma şansı var. Bunu kullan; alışkanlık sıfırdan başlamadan döner.',
      'Jest okno naprawy rytmu. Użyj go, żeby wrócić do nawyku bez startu od zera.',
    ),
  },
  {
    id: 'trainer_due_many',
    priority: 880,
    action: 'trainer',
    copy: fallbackCopy(
      'У тебя накопились слабые места. 10 минут тренажёра сейчас дадут больше роста, чем новый материал.',
      'У тебе накопичилися слабкі місця. 10 хвилин тренажера зараз дадуть більше росту, ніж новий матеріал.',
      'Weak spots are waiting. Ten minutes in Trainer will help more than new material right now.',
      'Há pontos fracos acumulados. Dez minutos no treino ajudam mais que conteúdo novo agora.',
      'Điểm yếu đang chờ. 10 phút luyện tập lúc này tốt hơn học thêm bài mới.',
      'Ada banyak titik lemah. Sepuluh menit di trainer lebih berguna daripada materi baru.',
      'Zayıf noktalar birikmiş. Şimdi 10 dakika trainer yeni konudan daha çok geliştirir.',
      'Słabe miejsca czekają. 10 minut trenera da teraz więcej niż nowy materiał.',
    ),
  },
  {
    id: 'daily_tasks_almost',
    priority: 850,
    action: 'dailyTasks',
    copy: fallbackCopy(
      'Дневные задания почти закрыты. Добей последний кусок: это хороший якорь для ежедневной практики.',
      'Щоденні завдання майже закриті. Добий останній шматок: це добрий якір для щоденної практики.',
      'Daily tasks are almost done. Finish the last bit; it anchors the habit nicely.',
      'As tarefas diárias estão quase prontas. Termine o último pedaço; isso fixa o hábito.',
      'Nhiệm vụ ngày gần xong. Hoàn tất phần cuối để giữ nhịp học.',
      'Tugas harian hampir selesai. Selesaikan bagian terakhir; ini mengunci kebiasaan.',
      'Günlük görevler neredeyse bitti. Son parçayı tamamla; alışkanlığı sağlamlaştırır.',
      'Zadania dnia są prawie gotowe. Domknij ostatni kawałek; to dobry kotwiczący nawyk.',
    ),
  },
  {
    id: 'personal_plan_today',
    priority: 840,
    action: 'personalPlan',
    copy: fallbackCopy(
      'В личном плане есть задача на сегодня. Я бы сделал её первой: там меньше шума и понятнее маршрут.',
      'В особистому плані є задача на сьогодні. Я б зробив її першою: там менше шуму й ясніший маршрут.',
      'Your personal plan has today’s step. I would do it first: less noise, clearer route.',
      'Seu plano pessoal tem uma etapa hoje. Eu faria primeiro: menos ruído, rota mais clara.',
      'Kế hoạch cá nhân có bước hôm nay. Mình sẽ làm trước: ít nhiễu, rõ đường hơn.',
      'Rencana pribadi punya langkah hari ini. Kerjakan dulu: lebih fokus dan jelas.',
      'Kişisel planda bugünün adımı var. Önce onu yapardım: daha az gürültü, daha net rota.',
      'Plan osobisty ma dzisiejszy krok. Zrobiłbym go najpierw: mniej szumu, jaśniejsza trasa.',
    ),
  },
  {
    id: 'energy_low',
    priority: 830,
    action: 'trainer',
    copy: fallbackCopy(
      'Энергии мало. Выбирай короткий режим без разгона: тренажёр ошибок или повторение лучше длинного урока.',
      'Енергії мало. Обери короткий режим без розгону: тренажер помилок або повторення краще за довгий урок.',
      'Energy is low. Choose a short mode: error trainer or review beats a long lesson.',
      'Energia baixa. Escolha um modo curto: treino de erros ou revisão vence uma lição longa.',
      'Năng lượng thấp. Chọn chế độ ngắn: ôn lỗi hoặc luyện tập tốt hơn bài dài.',
      'Energi rendah. Pilih mode pendek: trainer kesalahan atau review lebih baik dari pelajaran panjang.',
      'Enerji az. Kısa mod seç: hata trainer veya tekrar uzun dersten daha iyi.',
      'Mało energii. Wybierz krótki tryb: trener błędów albo powtórka zamiast długiej lekcji.',
    ),
  },
  {
    id: 'no_personal_plan_premium',
    priority: 820,
    action: 'personalPlanSetup',
    copy: fallbackCopy(
      'У тебя есть доступ к Premium-маршруту. Собери личный план: он убирает вопрос “что делать дальше?”.',
      'У тебе є доступ до Premium-маршруту. Збери особистий план: він прибирає питання “що далі?”.',
      'You have access to the Premium route. Build a personal plan and remove the “what next?” question.',
      'Você tem acesso à rota Premium. Monte um plano pessoal e tire a dúvida do próximo passo.',
      'Bạn có lộ trình Premium. Tạo kế hoạch cá nhân để khỏi phải nghĩ bước tiếp theo.',
      'Kamu punya akses rute Premium. Buat rencana pribadi agar tidak bingung langkah berikutnya.',
      'Premium rotaya erişimin var. Kişisel plan kur; “sırada ne var?” sorusu bitsin.',
      'Masz dostęp do trasy Premium. Ułóż plan osobisty i zdejmij pytanie “co dalej?”.',
    ),
  },
  {
    id: 'ai_dialog_suggestion',
    priority: 480,
    action: 'aiDialog',
    copy: fallbackCopy(
      'Когда уроки идут нормально, добавь разговор. Компас тренирует быстрый ответ, а не только узнавание фразы.',
      'Коли уроки йдуть нормально, додай розмову. Компас тренує швидку відповідь, не лише впізнавання фрази.',
      'When lessons feel fine, add conversation. Compass trains fast replies, not just recognition.',
      'Quando as lições fluem, adicione conversa. Compass treina resposta rápida.',
      'Khi bài học ổn, thêm hội thoại. Compass luyện phản xạ trả lời.',
      'Saat pelajaran lancar, tambah percakapan. Compass melatih respons cepat.',
      'Dersler yolundaysa konuşma ekle. Compass hızlı cevap kasını çalıştırır.',
      'Gdy lekcje idą dobrze, dodaj rozmowę. Compass ćwiczy szybkie odpowiedzi.',
    ),
  },
];

const ROTATION: readonly HomeTheoAdvice[] = [
  { id: 'continue_lesson', priority: 500, action: 'lesson', copy: fallbackCopy('Лучший следующий шаг уже открыт: продолжи последний урок, пока контекст ещё тёплый.', 'Найкращий наступний крок уже відкритий: продовж останній урок, доки контекст ще свіжий.', 'The best next step is already open: continue the last lesson while context is fresh.', 'O melhor próximo passo já está aberto: continue a última lição enquanto o contexto está fresco.', 'Bước tốt nhất đã mở sẵn: tiếp tục bài gần nhất khi ngữ cảnh còn mới.', 'Langkah terbaik sudah terbuka: lanjutkan pelajaran terakhir selagi konteks masih segar.', 'En iyi sonraki adım açık: bağlam tazeyken son derse devam et.', 'Najlepszy kolejny krok już czeka: kontynuuj ostatnią lekcję, póki kontekst jest świeży.') },
  { id: 'trainer_due_some', priority: 490, action: 'trainer', copy: fallbackCopy('Есть несколько карточек на повторение. Закрой их до нового урока: так новые фразы лучше цепляются.', 'Є кілька карток на повторення. Закрий їх до нового уроку: так нові фрази краще чіпляються.', 'A few reviews are waiting. Clear them before new material so phrases stick better.', 'Há algumas revisões. Faça antes de conteúdo novo para fixar melhor.', 'Có vài mục cần ôn. Xử lý trước bài mới để nhớ chắc hơn.', 'Ada beberapa review. Selesaikan sebelum materi baru agar frasa lebih nempel.', 'Birkaç tekrar bekliyor. Yeni konudan önce bitir; ifadeler daha iyi tutunur.', 'Czeka kilka powtórek. Zrób je przed nową lekcją, żeby frazy lepiej weszły.') },
  { id: 'daily_tasks_zero', priority: 470, action: 'dailyTasks', copy: fallbackCopy('Начни с одного дневного задания. Это самый быстрый способ включить режим “я сегодня занимался”.', 'Почни з одного щоденного завдання. Це найшвидший спосіб увімкнути режим “я сьогодні займався”.', 'Start with one daily task. It is the fastest way to mark today as a learning day.', 'Comece com uma tarefa diária. É o jeito mais rápido de marcar o dia como estudado.', 'Bắt đầu bằng một nhiệm vụ ngày. Đó là cách nhanh nhất để giữ nhịp hôm nay.', 'Mulai dari satu tugas harian. Itu cara tercepat membuat hari ini jadi hari belajar.', 'Bir günlük görevle başla. Bugünü öğrenme günü yapmanın en hızlı yolu.', 'Zacznij od jednego zadania dnia. To najszybszy sposób, by dziś naprawdę poćwiczyć.') },
  { id: 'daily_tasks_done', priority: 460, action: 'trainer', copy: fallbackCopy('Дневные задания закрыты. Если есть ещё 5 минут, лучше повторить ошибки, а не гнаться за количеством.', 'Щоденні завдання закриті. Якщо є ще 5 хвилин, краще повторити помилки, а не гнатися за кількістю.', 'Daily tasks are done. If you have five more minutes, review mistakes instead of chasing volume.', 'Tarefas concluídas. Se houver mais 5 minutos, revise erros em vez de correr por quantidade.', 'Nhiệm vụ ngày xong. Nếu còn 5 phút, ôn lỗi sẽ tốt hơn chạy theo số lượng.', 'Tugas harian selesai. Jika ada 5 menit, review kesalahan lebih baik daripada mengejar jumlah.', 'Günlük görevler bitti. 5 dakika varsa sayı kovalamak yerine hataları tekrar et.', 'Zadania dnia zrobione. Jeśli masz 5 minut, lepiej powtórzyć błędy niż gonić ilość.') },
  { id: 'personal_plan_done', priority: 450, action: 'aiDialog', copy: fallbackCopy('План на сегодня закрыт. Хороший момент для лёгкого диалога: переведи знание в быстрый ответ.', 'План на сьогодні закрито. Гарний момент для легкого діалогу: переведи знання у швидку відповідь.', 'Today’s plan is done. Try a light dialog and turn knowledge into fast replies.', 'Plano de hoje concluído. Faça um diálogo leve para transformar conhecimento em resposta rápida.', 'Kế hoạch hôm nay xong. Thử hội thoại nhẹ để biến kiến thức thành phản xạ.', 'Rencana hari ini selesai. Coba dialog ringan untuk melatih respons cepat.', 'Bugünün planı bitti. Hafif bir diyalogla bilgiyi hızlı cevaba çevir.', 'Plan na dziś zamknięty. Spróbuj lekkiego dialogu i zamień wiedzę w szybką odpowiedź.') },
  { id: 'no_personal_plan_free', priority: 440, action: 'personalPlanSetup', copy: fallbackCopy('Ты уже не совсем новичок. Личный план поможет не метаться между режимами и учиться ровнее.', 'Ти вже не зовсім новачок. Особистий план допоможе не метатися між режимами й учитися рівніше.', 'You are not a total beginner anymore. A personal plan can keep the route steady.', 'Você já não é iniciante total. Um plano pessoal deixa a rota mais estável.', 'Bạn không còn là người mới hoàn toàn. Kế hoạch cá nhân giúp học đều hơn.', 'Kamu bukan pemula total lagi. Rencana pribadi membuat rute belajar lebih stabil.', 'Artık tamamen yeni değilsin. Kişisel plan rotayı daha dengeli tutar.', 'Nie jesteś już zupełnie początkujący. Plan osobisty ustabilizuje naukę.') },
  { id: 'good_streak', priority: 430, action: 'stats', copy: fallbackCopy('Цепочка уже крепкая. Теперь смотри не только на дни, а на качество: статистика покажет слабые места.', 'Ланцюжок уже міцний. Тепер дивись не лише на дні, а й на якість: статистика покаже слабкі місця.', 'Your streak is solid. Now watch quality too: stats will show weak spots.', 'Sua sequência está firme. Agora olhe qualidade também: estatísticas mostram pontos fracos.', 'Chuỗi đã ổn. Giờ xem cả chất lượng: thống kê sẽ chỉ điểm yếu.', 'Rangkaianmu kuat. Sekarang lihat kualitas juga: statistik menunjukkan titik lemah.', 'Serin sağlam. Artık kaliteye de bak: istatistikler zayıf noktaları gösterir.', 'Seria jest mocna. Teraz patrz też na jakość: statystyki pokażą słabe miejsca.') },
  { id: 'big_streak', priority: 420, action: 'trainer', copy: fallbackCopy('Большая цепочка — это сила. Чтобы она не стала автопилотом, добавь тренажёр ошибок раз в пару дней.', 'Великий ланцюжок — це сила. Щоб не перейти на автопілот, додавай тренажер помилок раз на кілька днів.', 'A big streak is powerful. Keep it from becoming autopilot with mistake training every few days.', 'Uma sequência grande é força. Evite piloto automático com treino de erros a cada poucos dias.', 'Chuỗi dài rất mạnh. Đừng để thành tự động: luyện lỗi vài ngày một lần.', 'Rangkaian panjang itu kuat. Jangan autopilot: latih kesalahan tiap beberapa hari.', 'Büyük seri güçlüdür. Otomatiğe bağlanmasın diye birkaç günde bir hata trainer ekle.', 'Duża seria to siła. Żeby nie wejść w autopilota, dodaj trening błędów co kilka dni.') },
  { id: 'new_week', priority: 410, action: 'dailyTasks', copy: fallbackCopy('Неделя ещё пустая. Один маленький подход сегодня сделает завтра легче: не нужно будет “возвращаться”.', 'Тиждень ще порожній. Один малий підхід сьогодні зробить завтра легшим: не доведеться “повертатися”.', 'The week is still light. One small session today makes tomorrow easier.', 'A semana ainda está leve. Uma sessão pequena hoje facilita amanhã.', 'Tuần còn nhẹ. Một lượt nhỏ hôm nay sẽ làm ngày mai dễ hơn.', 'Minggu masih ringan. Satu sesi kecil hari ini membuat besok lebih mudah.', 'Hafta hafif başladı. Bugün küçük bir çalışma yarını kolaylaştırır.', 'Tydzień jest jeszcze lekki. Mała sesja dziś ułatwi jutro.') },
  { id: 'week_active', priority: 400, action: 'aiDialog', copy: fallbackCopy('Неделя уже активная. Добавь разговорную задачу: это проверит, можешь ли ты доставать фразы без подсказки.', 'Тиждень уже активний. Додай розмовне завдання: це перевірить, чи дістаєш фрази без підказки.', 'This week is active already. Add conversation to test recall without hints.', 'A semana já está ativa. Adicione conversa para testar memória sem pistas.', 'Tuần này đã năng động. Thêm hội thoại để kiểm tra nhớ không cần gợi ý.', 'Minggu ini sudah aktif. Tambah percakapan untuk menguji ingatan tanpa petunjuk.', 'Hafta zaten aktif. İpuçsuz hatırlamayı görmek için konuşma ekle.', 'Tydzień już aktywny. Dodaj rozmowę, żeby sprawdzić przypominanie bez podpowiedzi.') },
  { id: 'percentile_visible', priority: 390, action: 'stats', copy: fallbackCopy('Ты уже в сравнении по XP. Используй это как компас, но решение принимай по слабым местам, не по гонке.', 'Ти вже у порівнянні за XP. Використовуй це як компас, але рішення приймай за слабкими місцями, не за гонкою.', 'Your XP rank is visible. Use it as a compass, but choose work by weak spots, not the race.', 'Seu ranking de XP apareceu. Use como bússola, mas escolha pelo ponto fraco, não pela corrida.', 'Xếp hạng XP đã hiện. Dùng như la bàn, nhưng chọn học theo điểm yếu.', 'Peringkat XP terlihat. Pakai sebagai kompas, tapi pilih latihan dari titik lemah.', 'XP sıralaman görünüyor. Pusula olsun, ama çalışmayı yarışa değil zayıfa göre seç.', 'Ranking XP jest widoczny. Niech będzie kompasem, ale wybieraj po słabych miejscach.') },
  { id: 'league_visible', priority: 380, action: 'stats', copy: fallbackCopy('Лига ожила. Если хочешь подняться без выгорания, делай 2 коротких захода вместо одного длинного.', 'Ліга ожила. Якщо хочеш піднятися без вигорання, роби 2 короткі підходи замість одного довгого.', 'League is moving. To climb without burnout, do two short sessions instead of one long one.', 'A liga está viva. Para subir sem cansar, faça duas sessões curtas em vez de uma longa.', 'Giải đấu đang chạy. Muốn leo mà không mệt, làm hai lượt ngắn thay vì một lượt dài.', 'Liga bergerak. Untuk naik tanpa lelah, lakukan dua sesi pendek daripada satu panjang.', 'Lig hareketli. Tükenmeden yükselmek için bir uzun yerine iki kısa oturum yap.', 'Liga ruszyła. Żeby iść w górę bez zmęczenia, zrób dwie krótkie sesje zamiast jednej długiej.') },
  { id: 'medal_collector', priority: 370, action: 'lessons', copy: fallbackCopy('Медали уже собираются. Следующий рост — не в наградах, а в повторном прохождении сложных мест.', 'Медалі вже збираються. Наступний ріст — не в нагородах, а в повторенні складних місць.', 'Medals are coming in. The next growth comes from replaying hard spots, not collecting more badges.', 'As medalhas já vêm. O próximo avanço está em repetir partes difíceis, não só ganhar prêmios.', 'Huy chương đã có. Bước tiến tiếp theo là ôn phần khó, không chỉ lấy thêm huy hiệu.', 'Medali sudah terkumpul. Pertumbuhan berikutnya dari mengulang bagian sulit, bukan hanya badge.', 'Madalya geliyor. Sonraki gelişim zor yerleri tekrar etmekte, rozet kovalamakta değil.', 'Medale już wpadają. Kolejny wzrost jest w powtórkach trudnych miejsc, nie tylko odznakach.') },
  { id: 'level_early', priority: 360, action: 'lessons', copy: fallbackCopy('На ранних уровнях важнее частота, чем марафон. Один урок + одно повторение — идеальная связка.', 'На ранніх рівнях важливіша частота, ніж марафон. Один урок + одне повторення — ідеальна зв’язка.', 'At early levels, frequency beats marathons. One lesson plus one review is a great pair.', 'Nos níveis iniciais, frequência vence maratona. Uma lição + uma revisão é o par ideal.', 'Ở mức đầu, đều đặn quan trọng hơn học dài. Một bài + một lượt ôn là đủ đẹp.', 'Di level awal, frekuensi lebih penting dari maraton. Satu pelajaran + satu review itu pas.', 'İlk seviyelerde sıklık maratondan iyidir. Bir ders + bir tekrar ideal ikili.', 'Na wczesnych poziomach częstotliwość wygrywa z maratonem. Lekcja + powtórka to dobry zestaw.') },
  { id: 'level_mid', priority: 350, action: 'trainer', copy: fallbackCopy('Уровень растёт. Самый быстрый прирост теперь в ошибках: они показывают, что мозг почти освоил.', 'Рівень росте. Найшвидший приріст тепер у помилках: вони показують, що мозок майже засвоїв.', 'Your level is growing. Mistakes now give the fastest growth; they show what is almost learned.', 'Seu nível cresce. Erros agora dão o maior ganho: mostram o que quase foi aprendido.', 'Cấp độ đang lên. Lỗi giờ giúp tiến nhanh nhất: đó là phần gần thuộc.', 'Level naik. Kesalahan memberi pertumbuhan tercepat: itu bagian yang hampir dikuasai.', 'Seviye artıyor. En hızlı gelişim hatalarda; neredeyse öğrenilenleri gösterir.', 'Poziom rośnie. Najszybszy postęp jest teraz w błędach: pokazują, co prawie weszło.') },
  { id: 'level_high', priority: 340, action: 'aiDialog', copy: fallbackCopy('На твоём уровне пора чаще доставать язык из памяти. Диалог или устный режим даст лучший перенос в речь.', 'На твоєму рівні час частіше діставати мову з пам’яті. Діалог або усний режим краще переносить у мовлення.', 'At your level, pull language from memory more often. Dialog mode transfers best into speech.', 'No seu nível, tire mais frases da memória. Diálogo ajuda melhor a levar para fala.', 'Ở mức này, hãy kéo ngôn ngữ từ trí nhớ nhiều hơn. Hội thoại giúp chuyển sang nói tốt hơn.', 'Di level ini, ambil bahasa dari memori lebih sering. Dialog paling bagus untuk bicara.', 'Bu seviyede dili hafızadan daha sık çağır. Diyalog konuşmaya en iyi aktarımı sağlar.', 'Na tym poziomie częściej wyciągaj język z pamięci. Dialog najlepiej przenosi go do mówienia.') },
  { id: 'lessons_3_done', priority: 330, action: 'trainer', copy: fallbackCopy('После нескольких уроков полезно притормозить и собрать ошибки. Так база станет плотнее.', 'Після кількох уроків корисно пригальмувати й зібрати помилки. Так база стане щільнішою.', 'After a few lessons, slow down and collect mistakes. That makes the base stronger.', 'Depois de algumas lições, desacelere e revise erros. A base fica mais forte.', 'Sau vài bài, chậm lại và gom lỗi. Nền tảng sẽ chắc hơn.', 'Setelah beberapa pelajaran, pelankan dan kumpulkan kesalahan. Dasarnya jadi kuat.', 'Birkaç dersten sonra yavaşla ve hataları topla. Temel daha sağlam olur.', 'Po kilku lekcjach zwolnij i zbierz błędy. Baza będzie mocniejsza.') },
  { id: 'lessons_8_done', priority: 320, action: 'stats', copy: fallbackCopy('Уроков уже достаточно, чтобы искать закономерности. Статистика подскажет, что повторять первым.', 'Уроків уже достатньо, щоб шукати закономірності. Статистика підкаже, що повторювати першим.', 'You have enough lessons for patterns. Stats can tell what to review first.', 'Já há lições suficientes para ver padrões. Estatísticas dizem o que revisar primeiro.', 'Bạn đã có đủ bài để thấy mẫu lỗi. Thống kê sẽ gợi ý ôn gì trước.', 'Pelajaranmu cukup untuk melihat pola. Statistik bisa menentukan review pertama.', 'Desenleri görmek için yeterince ders var. İstatistik önce neyi tekrar edeceğini söyler.', 'Masz już dość lekcji, by szukać wzorców. Statystyki pokażą, co powtórzyć najpierw.') },
  { id: 'flashcards_soft', priority: 300, action: 'flashcards', copy: fallbackCopy('Если сегодня не хочется урок, открой карточки. Это мягкий вход: меньше сопротивления, но память всё равно работает.', 'Якщо сьогодні не хочеться уроку, відкрий картки. Це м’який вхід: менше опору, а пам’ять працює.', 'If a lesson feels heavy today, open flashcards. It is a softer start, but memory still works.', 'Se a lição pesa hoje, abra cartões. É uma entrada leve e a memória ainda trabalha.', 'Nếu hôm nay bài học nặng quá, mở thẻ. Nhẹ hơn nhưng trí nhớ vẫn hoạt động.', 'Kalau pelajaran terasa berat, buka flashcard. Lebih ringan tapi memori tetap bekerja.', 'Bugün ders ağır geliyorsa kartları aç. Daha yumuşak başlar, hafıza yine çalışır.', 'Jeśli lekcja dziś ciąży, otwórz fiszki. To łagodny start, a pamięć nadal pracuje.') },
  { id: 'premium_multiplier', priority: 295, action: 'lesson', copy: fallbackCopy('Сейчас действует усиление XP. Используй его на содержательную практику, а не только на быстрые клики.', 'Зараз діє підсилення XP. Використай його на змістовну практику, не лише на швидкі кліки.', 'XP boost is active. Spend it on meaningful practice, not just quick taps.', 'Bônus de XP ativo. Use em prática real, não só cliques rápidos.', 'Đang có tăng XP. Dùng cho luyện tập thật, không chỉ bấm nhanh.', 'XP boost aktif. Pakai untuk latihan bermakna, bukan sekadar tap cepat.', 'XP artışı aktif. Hızlı dokunuşlara değil anlamlı pratiğe harca.', 'Wzmocnienie XP działa. Użyj go na sensowną praktykę, nie tylko szybkie kliki.') },
  { id: 'new_premium', priority: 290, action: 'stats', copy: fallbackCopy('Premium уже активен. Первое, что я бы открыл: статистику и слабые зоны, чтобы не учиться вслепую.', 'Premium уже активний. Перше, що я б відкрив: статистику й слабкі зони, щоб не вчитися навмання.', 'Premium is active. First thing I would open: stats and weak zones so you do not study blind.', 'Premium ativo. Primeiro eu abriria estatísticas e zonas fracas para não estudar no escuro.', 'Premium đã bật. Mình sẽ mở thống kê và vùng yếu trước để không học mù mờ.', 'Premium aktif. Pertama buka statistik dan area lemah agar tidak belajar membabi buta.', 'Premium aktif. İlk açacağım şey istatistik ve zayıf alanlar olurdu.', 'Premium aktywny. Najpierw otworzyłbym statystyki i słabe obszary, żeby nie uczyć się w ciemno.') },
];

export function getHomeTheoAdvice(ctx: HomeTheoAdvisorContext): HomeTheoAdvice {
  const candidates = [...RULES, ...ROTATION].filter((rule) => matches(ctx, rule.id));
  const maxPriority = Math.max(...candidates.map((candidate) => candidate.priority));
  const top = candidates.filter((candidate) => candidate.priority === maxPriority);
  const salt = dailySeed() + ctx.level * 7 + ctx.streak * 13 + ctx.lessonsCompleted * 17 + ctx.dueCount * 19;
  return stablePick(top, salt);
}

export function homeTheoText(advice: HomeTheoAdvice, lang: Lang): string {
  return advice.copy[lang] ?? advice.copy.ru;
}

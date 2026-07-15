import type { TodayDestinationId, TodayLocalizedCopy } from './types';

export type RecommendationFacts = Readonly<{
  timeBucket: 'morning' | 'midday' | 'evening' | 'night';
  isWeekend: boolean;
  todayStudyMinutes: number | null;
  todayLessons: number | null;
  todayXp: number | null;
  resumeKind: 'lesson' | 'plan';
  streak: number;
  daysSinceLearning: number | null;
  nextLessonId: number | null;
  courseComplete: boolean;
  plan: null | { active: boolean; isCarryover: boolean; remainingTasks: number; remainingMinutes: number; progressPct: number };
  practiceDue: number;
  flashcardCount: number;
  arenaPlaysLeft: number;
  dailyTasksRemaining: number;
  dailyTasksTotal: number;
  availableDestinations: ReadonlySet<TodayDestinationId>;
}>;

export type TodayRecommendationVariant = Readonly<{ variantId: string; copy: TodayLocalizedCopy }>;
export type TodayRecommendationRule = {
  ruleId: string;
  destinationId: TodayDestinationId;
  priority: number;
  cooldownMs: number;
  eligible: (facts: RecommendationFacts) => boolean;
  variants: readonly TodayRecommendationVariant[];
};

const GENERIC_COPY: Record<TodayDestinationId, readonly [Omit<TodayLocalizedCopy, 'ru'>, Omit<TodayLocalizedCopy, 'ru'>]> = {
  lessons: [{ uk: 'Продовж навчання одним зрозумілим уроком.', es: 'Sigue aprendiendo con una lección clara.', 'pt-BR': 'Continue aprendendo com uma lição clara.', vi: 'Tiếp tục với một bài học rõ ràng.', id: 'Lanjutkan dengan satu pelajaran yang jelas.', tr: 'Net bir dersle öğrenmeye devam et.', pl: 'Kontynuuj naukę jednym konkretnym ćwiczeniem.' }, { uk: 'Один урок м’яко поверне тебе в ритм.', es: 'Una lección te devuelve al ritmo con suavidad.', 'pt-BR': 'Uma lição traz você de volta ao ritmo.', vi: 'Một bài học sẽ nhẹ nhàng đưa bạn trở lại nhịp.', id: 'Satu pelajaran membawamu kembali ke ritme.', tr: 'Tek ders seni nazikçe ritmine döndürür.', pl: 'Jedna lekcja łagodnie przywróci rytm.' }],
  plan: [{ uk: 'Наступний крок особистого плану вже готовий.', es: 'Tu siguiente paso personal ya está listo.', 'pt-BR': 'Seu próximo passo pessoal já está pronto.', vi: 'Bước tiếp theo trong kế hoạch đã sẵn sàng.', id: 'Langkah berikutnya di rencanamu sudah siap.', tr: 'Kişisel planındaki sonraki adım hazır.', pl: 'Kolejny krok osobistego planu jest gotowy.' }, { uk: 'Продовж особистий план у зручному темпі.', es: 'Continúa tu plan personal a tu ritmo.', 'pt-BR': 'Continue seu plano pessoal no seu ritmo.', vi: 'Tiếp tục kế hoạch theo nhịp của bạn.', id: 'Lanjutkan rencana pribadimu sesuai ritmemu.', tr: 'Kişisel planına kendi hızında devam et.', pl: 'Kontynuuj osobisty plan we własnym tempie.' }],
  practice: [{ uk: 'Коротка точна практика зміцнить слабкі місця.', es: 'Una práctica breve reforzará tus puntos débiles.', 'pt-BR': 'Uma prática curta reforça seus pontos fracos.', vi: 'Một lượt luyện ngắn sẽ củng cố điểm yếu.', id: 'Latihan singkat akan menguatkan titik lemahmu.', tr: 'Kısa ve net bir pratik zayıf noktaları güçlendirir.', pl: 'Krótka praktyka wzmocni słabsze miejsca.' }, { uk: 'Повтори саме те, що зараз принесе найбільшу користь.', es: 'Repasa justo lo que más te ayudará ahora.', 'pt-BR': 'Revise exatamente o que mais ajuda agora.', vi: 'Ôn đúng phần hữu ích nhất lúc này.', id: 'Ulangi bagian yang paling berguna sekarang.', tr: 'Şimdi en çok fayda sağlayacak kısmı tekrar et.', pl: 'Powtórz dokładnie to, co teraz da najwięcej.' }],
  flashcards: [{ uk: 'Кілька карток освіжать знайомі фрази.', es: 'Unas tarjetas refrescarán frases conocidas.', 'pt-BR': 'Alguns cartões refrescam frases conhecidas.', vi: 'Vài thẻ sẽ làm mới những cụm từ quen thuộc.', id: 'Beberapa kartu akan menyegarkan frasa yang dikenal.', tr: 'Birkaç kart tanıdık ifadeleri tazeler.', pl: 'Kilka fiszek odświeży znane zwroty.' }, { uk: 'Швидко переглянь фрази зі своєї колекції.', es: 'Repasa rápidamente frases de tu colección.', 'pt-BR': 'Revise rapidamente frases da sua coleção.', vi: 'Ôn nhanh vài cụm từ trong bộ sưu tập.', id: 'Tinjau cepat frasa dari koleksimu.', tr: 'Koleksiyonundaki ifadeleri hızlıca gözden geçir.', pl: 'Szybko przejrzyj zwroty ze swojej kolekcji.' }],
  quizzes: [{ uk: 'Короткий виклик покаже, що вже виходить упевнено.', es: 'Un reto breve mostrará lo que ya dominas.', 'pt-BR': 'Um desafio curto mostra o que você já domina.', vi: 'Một thử thách ngắn sẽ cho thấy phần bạn đã vững.', id: 'Tantangan singkat menunjukkan yang sudah kamu kuasai.', tr: 'Kısa bir meydan okuma neyi bildiğini gösterir.', pl: 'Krótki test pokaże, co już umiesz pewnie.' }, { uk: 'Перевір себе без тиску — лише кілька хвилин.', es: 'Ponte a prueba sin presión durante unos minutos.', 'pt-BR': 'Teste-se sem pressão por alguns minutos.', vi: 'Tự kiểm tra nhẹ nhàng trong vài phút.', id: 'Uji dirimu tanpa tekanan selama beberapa menit.', tr: 'Birkaç dakikalığına baskısızca kendini dene.', pl: 'Sprawdź się bez presji przez kilka minut.' }],
  arena: [{ uk: 'Один матч додасть практиці живої швидкості.', es: 'Un partido dará velocidad real a tu práctica.', 'pt-BR': 'Uma partida dá velocidade real à prática.', vi: 'Một trận đấu sẽ thêm nhịp độ thật cho luyện tập.', id: 'Satu pertandingan memberi latihanmu kecepatan nyata.', tr: 'Bir maç pratiğine canlı bir tempo katar.', pl: 'Jeden mecz doda praktyce żywego tempa.' }, { uk: 'Перевір швидкість рішень в одному матчі.', es: 'Comprueba tu rapidez en una partida.', 'pt-BR': 'Teste sua rapidez em uma partida.', vi: 'Kiểm tra tốc độ phản xạ trong một trận.', id: 'Uji kecepatan keputusanmu dalam satu pertandingan.', tr: 'Tek maçta karar hızını dene.', pl: 'Sprawdź szybkość decyzji w jednym meczu.' }],
  daily_tasks: [{ uk: 'Один виклик дня дасть відчуття завершення.', es: 'Un reto diario te dará sensación de avance.', 'pt-BR': 'Um desafio diário traz sensação de progresso.', vi: 'Một thử thách ngày sẽ tạo cảm giác tiến bộ.', id: 'Satu tantangan harian memberi rasa kemajuan.', tr: 'Bir günlük görev ilerleme hissi verir.', pl: 'Jedno wyzwanie dnia da poczucie postępu.' }, { uk: 'Закрий найближчий виклик дня одним кроком.', es: 'Completa el reto diario más cercano.', 'pt-BR': 'Conclua o desafio diário mais próximo.', vi: 'Hoàn thành thử thách ngày gần nhất.', id: 'Selesaikan tantangan harian terdekat.', tr: 'En yakın günlük görevi tek adımda tamamla.', pl: 'Domknij najbliższe wyzwanie dnia.' }],
};

function variants(ruleId: string, destinationId: TodayDestinationId, ruA: string, ruB = `${ruA} Сделай это в удобном темпе.`): readonly TodayRecommendationVariant[] {
  const generic = GENERIC_COPY[destinationId];
  return [
    { variantId: `${ruleId}.a`, copy: { ru: ruA, ...generic[0] } },
    { variantId: `${ruleId}.b`, copy: { ru: ruB, ...generic[1] } },
  ];
}

const HOUR = 60 * 60 * 1000;
const milestone = (id: number | null) => id === 9 || id === 19 || id === 29;
const make = (ruleId: string, destinationId: TodayDestinationId, priority: number, cooldownHours: number, eligible: (facts: RecommendationFacts) => boolean, ruA: string, ruB?: string): TodayRecommendationRule => ({ ruleId, destinationId, priority, cooldownMs: cooldownHours * HOUR, eligible, variants: variants(ruleId, destinationId, ruA, ruB) });

export const TODAY_RECOMMENDATION_RULES: readonly TodayRecommendationRule[] = [
  make('today.plan.carryover','plan',100,24,f=>Boolean(f.plan?.isCarryover),'Сначала закрой хвост прошлого дня — сегодняшний план станет легче.'),
  make('today.plan.one_left','plan',99,24,f=>f.plan?.remainingTasks===1,'В личном плане остался один шаг. Закрой день красиво.'),
  make('today.plan.morning_start','plan',91,36,f=>f.timeBucket==='morning'&&f.plan?.progressPct===0,'Утро подходит для первого шага личного плана.'),
  make('today.plan.midday_resume','plan',90,24,f=>f.timeBucket==='midday'&&Boolean(f.plan&&f.plan.progressPct>0&&f.plan.progressPct<100),'Вернись к личному плану, пока ритм дня ещё с тобой.'),
  make('today.plan.evening_finish','plan',94,24,f=>f.timeBucket==='evening'&&Boolean(f.plan&&f.plan.progressPct>0&&f.plan.progressPct<100),'До конца дня можно спокойно продвинуть личный план.'),
  make('today.plan.short_window','plan',97,24,f=>Boolean(f.plan&&f.plan.remainingMinutes>0&&f.plan.remainingMinutes<=10),'На оставшуюся часть плана хватит короткого окна.'),
  make('today.plan.keep_streak','plan',86,48,f=>f.streak>=3&&f.plan?.progressPct===0,'Поддержи свой ритм одним шагом личного плана.'),
  make('today.plan.weekend','plan',78,72,f=>f.isWeekend&&Boolean(f.plan?.active),'Выходной — хороший момент пройти план без спешки.'),
  make('today.practice.due_20','practice',98,24,f=>f.practiceDue>=20,'В практике накопилось много важного — начни с самых слабых мест.'),
  make('today.practice.due_10','practice',93,24,f=>f.practiceDue>=10&&f.practiceDue<20,'Несколько ошибок готовы к точному повторению.'),
  make('today.practice.due_5','practice',88,24,f=>f.practiceDue>=5&&f.practiceDue<10,'Короткая практика сейчас закрепит то, что уже почти запомнилось.'),
  make('today.practice.after_lesson','practice',92,36,f=>f.todayLessons!==null&&f.todayLessons>0&&f.practiceDue>0,'После урока полезно сразу укрепить сложные места.'),
  make('today.practice.morning','practice',73,48,f=>f.timeBucket==='morning'&&f.practiceDue>0,'Начни с небольшой практики и разбуди язык.'),
  make('today.practice.evening','practice',76,48,f=>f.timeBucket==='evening'&&f.practiceDue>0,'Вечером лучше повторить знакомое, чем перегружать себя новым.'),
  make('today.practice.keep_streak','practice',80,72,f=>f.streak>=5&&f.practiceDue>0,'Твоя серия держится на регулярности — точечная практика поможет.'),
  make('today.practice.short_session','practice',84,24,f=>f.todayStudyMinutes!==null&&f.todayStudyMinutes>0&&f.todayStudyMinutes<10&&f.practiceDue>0,'Добавь к короткой сессии ещё одно точное повторение.'),
  make('today.flashcards.saved_50','flashcards',90,48,f=>f.flashcardCount>=50,'В твоей коллекции уже много фраз — пора освежить несколько.'),
  make('today.flashcards.saved_20','flashcards',84,48,f=>f.flashcardCount>=20&&f.flashcardCount<50,'Карточки готовы превратить знакомство с фразами в память.'),
  make('today.flashcards.saved_5','flashcards',75,48,f=>f.flashcardCount>=5&&f.flashcardCount<20,'Небольшой набор карточек удобно повторить за один подход.'),
  make('today.flashcards.after_lesson','flashcards',86,48,f=>f.todayLessons!==null&&f.todayLessons>0&&f.flashcardCount>=5,'Закрепи урок фразами, которые ты сохранил сам.'),
  make('today.flashcards.morning','flashcards',68,72,f=>f.timeBucket==='morning'&&f.flashcardCount>=5,'Быстрый утренний просмотр карточек мягко включает язык.'),
  make('today.flashcards.evening','flashcards',70,72,f=>f.timeBucket==='evening'&&f.flashcardCount>=5,'Перед завершением дня пролистай несколько знакомых фраз.'),
  make('today.flashcards.weekend','flashcards',66,96,f=>f.isWeekend&&f.flashcardCount>=10,'В выходной можно без спешки разобрать свою коллекцию фраз.'),
  make('today.quizzes.first_today','quizzes',72,48,f=>f.todayStudyMinutes===0,'Небольшой вызов быстро покажет, что уже получается уверенно.'),
  make('today.quizzes.after_lesson','quizzes',83,48,f=>f.todayLessons!==null&&f.todayLessons>0,'Проверь свежие знания в коротком вызове.'),
  make('today.quizzes.short_session','quizzes',77,48,f=>f.todayStudyMinutes!==null&&f.todayStudyMinutes>0&&f.todayStudyMinutes<10,'Заверши короткую сессию быстрой проверкой себя.'),
  make('today.quizzes.weekend','quizzes',64,96,f=>f.isWeekend,'Выходной подходит для спокойной проверки знаний без давления.'),
  make('today.quizzes.morning','quizzes',62,72,f=>f.timeBucket==='morning','Один утренний вызов задаст ясную цель на день.'),
  make('today.quizzes.level_check','quizzes',95,72,f=>milestone(f.nextLessonId),'Перед новым уровнем проверь, насколько уверенно держится база.'),
  make('today.arena.plays_ready','arena',74,72,f=>f.arenaPlaysLeft>0&&f.todayStudyMinutes!==null&&f.todayStudyMinutes>=5,'Готов к живой проверке? Арена покажет скорость твоих решений.'),
  make('today.arena.after_lesson','arena',81,72,f=>f.arenaPlaysLeft>0&&f.todayLessons!==null&&f.todayLessons>0,'Испытай свежие знания в коротком матче на Арене.'),
  make('today.arena.evening','arena',67,96,f=>f.timeBucket==='evening'&&f.arenaPlaysLeft>0,'Вечерний матч добавит практике немного азарта.'),
  make('today.arena.weekend','arena',65,96,f=>f.isWeekend&&f.arenaPlaysLeft>0,'В выходной можно проверить себя в одном спокойном матче.'),
  make('today.daily_tasks.unstarted','daily_tasks',89,24,f=>f.dailyTasksTotal>0&&f.dailyTasksRemaining===f.dailyTasksTotal,'Вызовы дня ещё не начаты — выбери самый лёгкий первый шаг.'),
  make('today.daily_tasks.one_left','daily_tasks',96,24,f=>f.dailyTasksRemaining===1,'Остался один вызов дня. Забери завершение.'),
  make('today.daily_tasks.evening','daily_tasks',87,24,f=>f.timeBucket==='evening'&&f.dailyTasksRemaining>0,'До конца дня ещё можно закрыть один полезный вызов.'),
  make('today.lessons.plan_alternative','lessons',71,48,f=>f.resumeKind==='plan'&&f.nextLessonId!==null,'Хочется сменить ритм? Выбери один урок вместо длинной сессии.'),
  make('today.lessons.comeback','lessons',97,48,f=>f.daysSinceLearning!==null&&f.daysSinceLearning>=2&&f.nextLessonId!==null,'Вернись мягко: один понятный урок лучше большого рывка.'),
  make('today.lessons.next_level','lessons',98,72,f=>milestone(f.nextLessonId),'Впереди новый уровень — посмотри, с какого урока он начинается.'),
  make('today.lessons.course_repeat','lessons',85,72,f=>f.courseComplete,'Курс пройден. Выбери урок, который хочется сделать ещё увереннее.'),
];

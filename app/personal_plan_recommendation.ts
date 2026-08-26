import { getPlanById, type PersonalPlanId, type PlanMinutesChoice } from './personal_plan_catalog';
import { triLang, type Lang } from '../constants/i18n';

/**
 * Канонический выбор плана по теме (Ф5 перестройки планов).
 *
 * 5 тем = 5 планов, один к одному. Тема полностью определяет план; уровень и
 * минуты настраивают темп, но не меняют сам план. И онбординг, и экран
 * настройки плана используют ЭТОТ резолвер — другой логики выбора нет.
 */

export type PersonalPlanSetupGoal = 'series' | 'everyday' | 'travel' | 'words' | 'mind';
export type PersonalPlanSetupLevel = 'a0' | 'a1' | 'a2' | 'b1';

export type PersonalPlanSetupChoice = {
  id: string;
  title: string;
  subtitle: string;
  icon: 'airplane-outline' | 'briefcase-outline' | 'home-outline' | 'school-outline' | 'leaf-outline' | 'book-outline' | 'chatbubble-ellipses-outline' | 'mic-outline' | 'map-outline' | 'flash-outline' | 'ear-outline';
};

// зачем: заголовки шагов мастера показывались по-русски на любом языке
// интерфейса (i18n-аудит) — данные локализованы, доступ через функции ниже.
export function personalPlanSetupGoals(lang: Lang): (PersonalPlanSetupChoice & { id: PersonalPlanSetupGoal })[] {
  return [
    { id: 'series', icon: 'ear-outline', title: triLang(lang, { ru: 'Понимать кино и сериалы', en: 'Understand movies and shows', uk: 'Розуміти кіно і серіали', es: 'Entender películas y series', 'pt-BR': 'Entender filmes e séries', vi: 'Hiểu phim và series', id: 'Memahami film dan serial', tr: 'Film ve dizileri anlamak', pl: 'Rozumieć filmy i seriale' }), subtitle: triLang(lang, { ru: 'Живая речь на слух — без субтитров', en: 'Real speech by ear — no subtitles', uk: 'Жива мова на слух — без субтитрів', es: 'Habla real de oído, sin subtítulos', 'pt-BR': 'Fala real de ouvido, sem legendas', vi: 'Nghe hiểu lời thoại thật — không phụ đề', id: 'Percakapan nyata dari pendengaran — tanpa subtitle', tr: 'Kulaktan gerçek konuşma — altyazısız', pl: 'Żywa mowa ze słuchu — bez napisów' }) },
    { id: 'everyday', icon: 'chatbubble-ellipses-outline', title: triLang(lang, { ru: 'Говорить в обычной жизни', en: 'Speak in everyday life', uk: 'Говорити у звичайному житті', es: 'Hablar en la vida cotidiana', 'pt-BR': 'Falar no dia a dia', vi: 'Nói trong đời sống hàng ngày', id: 'Berbicara dalam kehidupan sehari-hari', tr: 'Günlük hayatta konuşmak', pl: 'Mówić w codziennym życiu' }), subtitle: triLang(lang, { ru: 'Отвечать в разговоре без ступора', en: 'Reply in conversation without freezing up', uk: 'Відповідати в розмові без ступору', es: 'Responder en una conversación sin bloquearte', 'pt-BR': 'Responder numa conversa sem travar', vi: 'Trả lời trong hội thoại mà không bị đơ', id: 'Menjawab dalam percakapan tanpa macet', tr: 'Konuşmada donmadan cevap vermek', pl: 'Odpowiadać w rozmowie bez blokady' }) },
    { id: 'travel', icon: 'airplane-outline', title: triLang(lang, { ru: 'Путешествовать', en: 'Travel', uk: 'Подорожувати', es: 'Viajar', 'pt-BR': 'Viajar', vi: 'Đi du lịch', id: 'Bepergian', tr: 'Seyahat etmek', pl: 'Podróżować' }), subtitle: triLang(lang, { ru: 'Аэропорт, отель, кафе и дорога', en: 'Airport, hotel, café, and the road', uk: 'Аеропорт, готель, кафе і дорога', es: 'Aeropuerto, hotel, café y camino', 'pt-BR': 'Aeroporto, hotel, café e estrada', vi: 'Sân bay, khách sạn, quán cà phê và trên đường', id: 'Bandara, hotel, kafe, dan perjalanan', tr: 'Havalimanı, otel, kafe ve yol', pl: 'Lotnisko, hotel, kawiarnia i droga' }) },
    { id: 'words', icon: 'book-outline', title: triLang(lang, { ru: 'Знать нужные слова', en: 'Know the words you need', uk: 'Знати потрібні слова', es: 'Conocer las palabras necesarias', 'pt-BR': 'Conhecer as palavras necessárias', vi: 'Biết những từ cần thiết', id: 'Mengetahui kata-kata yang dibutuhkan', tr: 'Gerekli kelimeleri bilmek', pl: 'Znać potrzebne słowa' }), subtitle: triLang(lang, { ru: 'Запас на каждый день — и сразу в речь', en: 'Everyday vocabulary, ready to use in speech', uk: 'Запас на кожен день — і одразу в мову', es: 'Vocabulario diario, listo para usar al hablar', 'pt-BR': 'Vocabulário diário, pronto para usar na fala', vi: 'Vốn từ mỗi ngày — và dùng ngay khi nói', id: 'Kosakata harian — langsung dipakai bicara', tr: 'Her gün için kelime dağarcığı — hemen konuşmaya', pl: 'Zapas na każdy dzień — od razu do mowy' }) },
    { id: 'mind', icon: 'school-outline', title: triLang(lang, { ru: 'Заниматься для себя', en: 'Learn for yourself', uk: 'Займатися для себе', es: 'Aprender para ti mismo', 'pt-BR': 'Aprender para si mesmo', vi: 'Học cho chính mình', id: 'Belajar untuk diri sendiri', tr: 'Kendin için çalışmak', pl: 'Uczyć się dla siebie' }), subtitle: triLang(lang, { ru: 'Спокойный темп и польза для ума', en: 'A calm pace, good for the mind', uk: 'Спокійний темп і користь для розуму', es: 'Ritmo tranquilo y beneficio para la mente', 'pt-BR': 'Ritmo tranquilo e benefício para a mente', vi: 'Nhịp độ thư thái và bổ ích cho trí óc', id: 'Ritme santai dan bermanfaat bagi pikiran', tr: 'Sakin tempo ve zihin için fayda', pl: 'Spokojne tempo i korzyść dla umysłu' }) },
  ];
}

export function personalPlanSetupLevels(lang: Lang): (PersonalPlanSetupChoice & { id: PersonalPlanSetupLevel })[] {
  return [
    { id: 'a0', icon: 'leaf-outline', title: triLang(lang, { ru: 'A0: почти с нуля', en: 'A0: almost from zero', uk: 'A0: майже з нуля', es: 'A0: casi desde cero', 'pt-BR': 'A0: quase do zero', vi: 'A0: gần như từ đầu', id: 'A0: hampir dari nol', tr: 'A0: neredeyse sıfırdan', pl: 'A0: prawie od zera' }), subtitle: triLang(lang, { ru: 'Нужны самые базовые фразы', en: 'I need the most basic phrases', uk: 'Потрібні найбазовіші фрази', es: 'Necesito las frases más básicas', 'pt-BR': 'Preciso das frases mais básicas', vi: 'Cần những cụm từ cơ bản nhất', id: 'Butuh frasa paling dasar', tr: 'En temel ifadelere ihtiyacım var', pl: 'Potrzebuję najbardziej podstawowych zwrotów' }) },
    { id: 'a1', icon: 'book-outline', title: triLang(lang, { ru: 'A1: знаю базовые слова', en: 'A1: I know basic words', uk: 'A1: знаю базові слова', es: 'A1: conozco palabras básicas', 'pt-BR': 'A1: conheço palavras básicas', vi: 'A1: biết các từ cơ bản', id: 'A1: tahu kata-kata dasar', tr: 'A1: temel kelimeleri biliyorum', pl: 'A1: znam podstawowe słowa' }), subtitle: triLang(lang, { ru: 'Хочу быстрее собирать фразы', en: 'I want to build phrases faster', uk: 'Хочу швидше складати фрази', es: 'Quiero formar frases más rápido', 'pt-BR': 'Quero formar frases mais rápido', vi: 'Muốn ghép câu nhanh hơn', id: 'Ingin lebih cepat menyusun frasa', tr: 'Cümleleri daha hızlı kurmak istiyorum', pl: 'Chcę szybciej układać zdania' }) },
    { id: 'a2', icon: 'chatbubble-ellipses-outline', title: triLang(lang, { ru: 'A2: понимаю, но не говорю', en: 'A2: I understand but don\'t speak', uk: 'A2: розумію, але не говорю', es: 'A2: entiendo pero no hablo', 'pt-BR': 'A2: entendo mas não falo', vi: 'A2: hiểu nhưng không nói được', id: 'A2: mengerti tapi tidak bisa bicara', tr: 'A2: anlıyorum ama konuşamıyorum', pl: 'A2: rozumiem, ale nie mówię' }), subtitle: triLang(lang, { ru: 'Нужна практика ответов', en: 'I need practice answering', uk: 'Потрібна практика відповідей', es: 'Necesito practicar respuestas', 'pt-BR': 'Preciso praticar respostas', vi: 'Cần luyện tập trả lời', id: 'Butuh latihan menjawab', tr: 'Cevap verme pratiğine ihtiyacım var', pl: 'Potrzebuję ćwiczyć odpowiadanie' }) },
    { id: 'b1', icon: 'mic-outline', title: triLang(lang, { ru: 'B1: хочу увереннее', en: 'B1: I want more confidence', uk: 'B1: хочу впевненіше', es: 'B1: quiero más confianza', 'pt-BR': 'B1: quero mais confiança', vi: 'B1: muốn tự tin hơn', id: 'B1: ingin lebih percaya diri', tr: 'B1: daha kendinden emin olmak istiyorum', pl: 'B1: chcę pewniej' }), subtitle: triLang(lang, { ru: 'Нужен ритм и более живые задания', en: 'I need rhythm and livelier exercises', uk: 'Потрібен ритм і живіші завдання', es: 'Necesito ritmo y ejercicios más dinámicos', 'pt-BR': 'Preciso de ritmo e exercícios mais dinâmicos', vi: 'Cần nhịp độ và bài tập sống động hơn', id: 'Butuh ritme dan latihan yang lebih hidup', tr: 'Ritim ve daha canlı görevlere ihtiyacım var', pl: 'Potrzebuję rytmu i bardziej żywych zadań' }) },
  ];
}

/** Тема → план. Единственное место, где выбирается план. */
export function resolvePersonalPlanForGoal(goal: PersonalPlanSetupGoal): PersonalPlanId {
  switch (goal) {
    case 'series': return 'echo';
    case 'everyday': return 'impuls';
    case 'travel': return 'voyazh';
    case 'words': return 'gavan';
    case 'mind': return 'mitap';
  }
}

export type PersonalPlanRecommendationInput = {
  goal: PersonalPlanSetupGoal;
  level: PersonalPlanSetupLevel;
};

export function recommendPersonalPlan(input: PersonalPlanRecommendationInput): PersonalPlanId {
  // Уровень пока не меняет план — тема решает. Поле в подписи оставлено,
  // чтобы настройка темпа могла учесть его без смены вызовов.
  return resolvePersonalPlanForGoal(input.goal);
}

export function getPlanDefaultMinutes(planId: PersonalPlanId): PlanMinutesChoice {
  return getPlanById(planId).minutesDefault;
}

/**
 * «Что логично пройти после этого плана» — одна умная рекомендация для финального
 * экрана «маршрут пройден». Порядок выстроен по нарастанию: от выживания в поездке
 * к словарному запасу, затем к живому разговору, восприятию речи на слух и, наконец,
 * к спокойной поддерживающей практике. Берём СЛЕДУЮЩИЙ план в этой цепочке после
 * пройденного; дойдя до конца — заворачиваем на начало. Так каждый раз предлагается
 * один осмысленный следующий шаг, а не «выбери сам из пяти».
 */
const PLAN_PROGRESSION_ORDER: readonly PersonalPlanId[] = ['voyazh', 'gavan', 'impuls', 'echo', 'mitap'];

export function recommendNextPlanAfter(completedPlanId: PersonalPlanId): PersonalPlanId {
  const index = PLAN_PROGRESSION_ORDER.indexOf(completedPlanId);
  if (index === -1) return PLAN_PROGRESSION_ORDER[0];
  return PLAN_PROGRESSION_ORDER[(index + 1) % PLAN_PROGRESSION_ORDER.length];
}

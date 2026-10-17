/**
 * Тексты окна Plus по месту входа — УТВЕРЖДЕНЫ владельцем 11.10 (таблица сессии 3:
 * docs/design/v2-app/paywall-context-texts.md; координатор 19:05/19:40/22:20).
 *
 * зачем: окно Plus говорит про то место, откуда человек пришёл (владелец: «ВСЕ ПЕЙВОЛЫ ДОЛЖНЫ БЫТЬ КОНТЕКСТНЫМИ»).
 * Правила текстов: на «ты» (где в языке есть такая форма), заголовок короткий, подзаголовок — одна фраза до ~90 знаков,
 * первая выгода — короткая строка. Числа берутся из констант кода, а не пишутся словами — текст не может разойтись
 * с настоящим лимитом (старые тексты обещали «20 фраз», а в коде действует FREE_SAVED_CARD_LIMIT = 50).
 * Сняты по решению владельца: `theme` (темы в 2.0 бесплатны) и `arena_limit` (Арены нет).
 *
 * Пилюля «что закончилось» (`pill`) — только у входов, где что-то кончилось или закрыто.
 */
import type { PremiumContext } from './premium_context';
import { REVENUE_DAILY_LIMITS, REVENUE_MONTHLY_LIMITS } from './revenue_daily_limits';
import { MONTHLY_TRAINING_SESSION_LIMIT } from './monthly_training_sessions';
import { FREE_SAVED_CARD_LIMIT } from './flashcards/free_limit';
import { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT } from './ai_mistake_explain_flags';

export const PAYWALL_TEXT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type PaywallTextLang = (typeof PAYWALL_TEXT_LANGS)[number];

/** Входы, у которых окна Plus больше нет (решение владельца 11.10). */
export const PAYWALL_RETIRED_CONTEXTS = ['theme', 'arena_limit'] as const;
export type PaywallTextContext = Exclude<PremiumContext, (typeof PAYWALL_RETIRED_CONTEXTS)[number]>;

export type PaywallContextText = Readonly<{ title: string; subtitle: string; benefit: string }>;

/** Факты места входа для пилюли (из параметров маршрута); нет — пилюля без числа. */
export type PaywallEntryFacts = Readonly<{ lessonNumber?: number | null; streakDays?: number | null }>;

const L = Object.freeze({
  mistakes: REVENUE_DAILY_LIMITS.mistake_practice_starts,
  cards: FREE_SAVED_CARD_LIMIT,
  training: MONTHLY_TRAINING_SESSION_LIMIT,
  dialog: REVENUE_MONTHLY_LIMITS.ai_dialog_replies,
  voice: REVENUE_DAILY_LIMITS.speaking_attempts,
  speaking: REVENUE_DAILY_LIMITS.speaking_attempts,
  explain: FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT,
  languages: 1,
  courseLessonsAfterFree: 29,
});

// ── формы слов при числах ───────────────────────────────────────────────────
/** Славянские: [1, 2–4, 5+]; en/es/pt: [1, иначе]; vi/id/tr: одна форма. */
type Forms = Readonly<Record<PaywallTextLang, readonly string[]>>;

function slavicIndex(n: number): 0 | 1 | 2 {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 0;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
  return 2;
}

/** Форма слова при числе n. */
export function pluralWord(lang: PaywallTextLang, n: number, forms: Forms): string {
  const list = forms[lang];
  if (lang === 'ru' || lang === 'uk' || lang === 'pl') return list[slavicIndex(n)] ?? list[list.length - 1];
  if (lang === 'en' || lang === 'es' || lang === 'pt-BR') return n === 1 ? list[0] : (list[1] ?? list[0]);
  return list[0];
}

/** Родительный падеж после «из N» (ru/uk/pl): 1 → ед. ч., иначе мн. ч. */
function ofLimitWord(lang: PaywallTextLang, n: number, genitive: Forms): string {
  const list = genitive[lang];
  if (lang === 'ru' || lang === 'uk' || lang === 'pl') return slavicIndex(n) === 0 ? list[0] : (list[1] ?? list[0]);
  return pluralWord(lang, n, genitive);
}

const OF: Readonly<Record<PaywallTextLang, string>> = {
  ru: 'из', uk: 'з', en: 'of', es: 'de', 'pt-BR': 'de', vi: '/', id: 'dari', tr: '/', pl: 'z',
};

/** «30 из 30 ответов» — на каждом языке по его правилам. */
function usedOf(lang: PaywallTextLang, n: number, genitive: Forms): string {
  const noun = ofLimitWord(lang, n, genitive);
  if (lang === 'vi' || lang === 'tr') return `${n}/${n} ${noun}`;
  return `${n} ${OF[lang]} ${n} ${noun}`;
}

// Существительные: обычные формы при числе (count) и родительный после «из» (of).
const SESSION_COUNT: Forms = { ru: ['подход', 'подхода', 'подходов'], uk: ['підхід', 'підходи', 'підходів'], en: ['session', 'sessions'], es: ['sesión', 'sesiones'], 'pt-BR': ['sessão', 'sessões'], vi: ['lượt'], id: ['sesi'], tr: ['seans'], pl: ['podejście', 'podejścia', 'podejść'] };
const SESSION_OF: Forms = { ru: ['подхода', 'подходов'], uk: ['підходу', 'підходів'], en: ['session', 'sessions'], es: ['sesión', 'sesiones'], 'pt-BR': ['sessão', 'sessões'], vi: ['lượt'], id: ['sesi'], tr: ['seans'], pl: ['podejścia', 'podejść'] };
const PHRASE_COUNT: Forms = { ru: ['фраза', 'фразы', 'фраз'], uk: ['вислів', 'вислови', 'висловів'], en: ['phrase', 'phrases'], es: ['frase', 'frases'], 'pt-BR': ['frase', 'frases'], vi: ['cụm từ'], id: ['frasa'], tr: ['ifade'], pl: ['fraza', 'frazy', 'fraz'] };
const PHRASE_OF: Forms = { ru: ['фразы', 'фраз'], uk: ['вислову', 'висловів'], en: ['phrase', 'phrases'], es: ['frase', 'frases'], 'pt-BR': ['frase', 'frases'], vi: ['cụm từ'], id: ['frasa'], tr: ['ifade'], pl: ['frazy', 'fraz'] };
const TRAINING_COUNT: Forms = { ru: ['тренировка', 'тренировки', 'тренировок'], uk: ['тренування', 'тренування', 'тренувань'], en: ['practice session', 'practice sessions'], es: ['entrenamiento', 'entrenamientos'], 'pt-BR': ['treino', 'treinos'], vi: ['buổi luyện tập'], id: ['sesi latihan'], tr: ['antrenman'], pl: ['trening', 'treningi', 'treningów'] };
const TRAINING_OF: Forms = { ru: ['тренировки', 'тренировок'], uk: ['тренування', 'тренувань'], en: ['practice session', 'practice sessions'], es: ['entrenamiento', 'entrenamientos'], 'pt-BR': ['treino', 'treinos'], vi: ['buổi luyện tập'], id: ['sesi latihan'], tr: ['antrenman'], pl: ['treningu', 'treningów'] };
const REPLY_COUNT: Forms = { ru: ['ответ', 'ответа', 'ответов'], uk: ['відповідь', 'відповіді', 'відповідей'], en: ['reply', 'replies'], es: ['respuesta', 'respuestas'], 'pt-BR': ['resposta', 'respostas'], vi: ['câu trả lời'], id: ['balasan'], tr: ['yanıt'], pl: ['odpowiedź', 'odpowiedzi', 'odpowiedzi'] };
const REPLY_OF: Forms = { ru: ['ответа', 'ответов'], uk: ['відповіді', 'відповідей'], en: ['reply', 'replies'], es: ['respuesta', 'respuestas'], 'pt-BR': ['resposta', 'respostas'], vi: ['câu trả lời'], id: ['balasan'], tr: ['yanıt'], pl: ['odpowiedzi', 'odpowiedzi'] };
const VOICE_COUNT: Forms = { ru: ['реплика', 'реплики', 'реплик'], uk: ['репліка', 'репліки', 'реплік'], en: ['voice reply', 'voice replies'], es: ['respuesta por voz', 'respuestas por voz'], 'pt-BR': ['resposta por voz', 'respostas por voz'], vi: ['câu trả lời bằng giọng nói'], id: ['balasan suara'], tr: ['sesli yanıt'], pl: ['wypowiedź', 'wypowiedzi', 'wypowiedzi'] };
const VOICE_OF: Forms = { ru: ['реплики', 'реплик'], uk: ['репліки', 'реплік'], en: ['voice reply', 'voice replies'], es: ['respuesta por voz', 'respuestas por voz'], 'pt-BR': ['resposta por voz', 'respostas por voz'], vi: ['câu nói'], id: ['balasan suara'], tr: ['sesli yanıt'], pl: ['wypowiedzi', 'wypowiedzi'] };
const ATTEMPT_COUNT: Forms = { ru: ['попытка', 'попытки', 'попыток'], uk: ['спроба', 'спроби', 'спроб'], en: ['attempt', 'attempts'], es: ['intento', 'intentos'], 'pt-BR': ['tentativa', 'tentativas'], vi: ['lượt thử'], id: ['percobaan'], tr: ['deneme'], pl: ['próba', 'próby', 'prób'] };
const ATTEMPT_OF: Forms = { ru: ['попытки', 'попыток'], uk: ['спроби', 'спроб'], en: ['attempt', 'attempts'], es: ['intento', 'intentos'], 'pt-BR': ['tentativa', 'tentativas'], vi: ['lượt thử'], id: ['percobaan'], tr: ['deneme'], pl: ['próby', 'prób'] };
const LANGUAGE_OF: Forms = { ru: ['языка', 'языков'], uk: ['мови', 'мов'], en: ['language', 'languages'], es: ['idioma', 'idiomas'], 'pt-BR': ['idioma', 'idiomas'], vi: ['ngôn ngữ'], id: ['bahasa'], tr: ['dil'], pl: ['języka', 'języków'] };
const DAY_COUNT: Forms = { ru: ['день', 'дня', 'дней'], uk: ['день', 'дні', 'днів'], en: ['day', 'days'], es: ['día', 'días'], 'pt-BR': ['dia', 'dias'], vi: ['ngày'], id: ['hari'], tr: ['gün'], pl: ['dzień', 'dni', 'dni'] };

const n = (lang: PaywallTextLang, count: number, forms: Forms) => `${count} ${pluralWord(lang, count, forms)}`;

type Texts = Readonly<Record<PaywallTextLang, PaywallContextText>>;
const t = (title: string, subtitle: string, benefit: string): PaywallContextText => ({ title, subtitle, benefit });

/** Тексты по входам. Функция — чтобы числа брались из констант и правильно склонялись. */
function buildTexts(): Readonly<Record<PaywallTextContext, Texts>> {
  const c = L.courseLessonsAfterFree;
  return {
    no_energy: {
      ru: t('Энергия закончилась', 'С Plus она не тратится — занимайся дальше сразу.', 'Занятия без ожидания'),
      uk: t('Енергія закінчилася', 'З Plus вона не витрачається — займайся далі одразу.', 'Заняття без очікування'),
      en: t('You’re out of energy', 'With Plus it never runs out — keep going right away.', 'Study without waiting'),
      es: t('Te quedaste sin energía', 'Con Plus no se gasta: sigue estudiando ahora mismo.', 'Estudia sin esperas'),
      'pt-BR': t('Sua energia acabou', 'Com o Plus ela não se gasta — continue agora mesmo.', 'Estude sem esperar'),
      vi: t('Bạn đã hết năng lượng', 'Với Plus, năng lượng không bị tiêu hao — học tiếp ngay.', 'Học không cần chờ'),
      id: t('Energimu habis', 'Dengan Plus energi tidak terpakai — lanjut belajar sekarang.', 'Belajar tanpa menunggu'),
      tr: t('Enerjin bitti', 'Plus ile enerji harcanmaz — hemen devam et.', 'Beklemeden çalış'),
      pl: t('Energia się skończyła', 'Z Plus się nie zużywa — ucz się dalej od razu.', 'Nauka bez czekania'),
    },
    ai_explain: {
      ru: t('Разбор на сегодня закончился', 'С Plus ИИ объяснит каждую ошибку: что не так и как сказать верно.', 'Разбор каждой ошибки сразу после ответа'),
      uk: t('Розбір на сьогодні закінчився', 'З Plus ШІ пояснить кожну помилку: що не так і як сказати правильно.', 'Розбір кожної помилки одразу після відповіді'),
      en: t('No more explanations today', 'With Plus, AI explains every mistake: what’s wrong and how to say it right.', 'An explanation right after every mistake'),
      es: t('Hoy ya no quedan explicaciones', 'Con Plus, la IA explica cada error: qué falla y cómo decirlo bien.', 'Explicación de cada error al momento'),
      'pt-BR': t('As explicações de hoje acabaram', 'Com o Plus, a IA explica cada erro: o que está errado e como dizer certo.', 'Explicação de cada erro na hora'),
      vi: t('Hết lượt giải thích hôm nay', 'Với Plus, AI giải thích mọi lỗi: sai ở đâu và nói sao cho đúng.', 'Giải thích mọi lỗi ngay sau khi trả lời'),
      id: t('Penjelasan hari ini habis', 'Dengan Plus, AI menjelaskan setiap kesalahan: apa yang salah dan cara yang benar.', 'Penjelasan tiap kesalahan langsung'),
      tr: t('Bugünkü açıklamalar bitti', 'Plus ile yapay zekâ her hatayı açıklar: neresi yanlış, doğrusu nasıl.', 'Her hatanın açıklaması hemen'),
      pl: t('Wyjaśnienia na dziś się skończyły', 'Z Plus AI wyjaśni każdy błąd: co jest źle i jak powiedzieć poprawnie.', 'Wyjaśnienie każdego błędu od razu'),
    },
    course_after_lesson3: {
      ru: t('Дальше — в Plus', `Впереди ещё ${n('ru', c, LESSON_COUNT)}: от простых фраз до свободного разговора.`, 'Весь курс целиком'),
      uk: t('Далі — у Plus', `Попереду ще ${n('uk', c, LESSON_COUNT)}: від простих висловів до вільної розмови.`, 'Увесь курс повністю'),
      en: t('The rest is in Plus', `${c} more lessons ahead: from simple phrases to free conversation.`, 'The whole course'),
      es: t('Lo que sigue está en Plus', `Te quedan ${c} lecciones: de frases sencillas a conversar con soltura.`, 'El curso completo'),
      'pt-BR': t('O resto está no Plus', `Ainda faltam ${c} lições: de frases simples à conversa livre.`, 'O curso inteiro'),
      vi: t('Phần tiếp theo có trong Plus', `Còn ${c} bài học nữa: từ câu đơn giản đến trò chuyện tự nhiên.`, 'Trọn khóa học'),
      id: t('Selanjutnya ada di Plus', `Masih ada ${c} pelajaran: dari frasa sederhana sampai bercakap bebas.`, 'Seluruh kursus'),
      tr: t('Devamı Plus’ta', `Önünde ${c} ders daha var: basit ifadelerden serbest sohbete.`, 'Kursun tamamı'),
      pl: t('Dalej — w Plus', `Przed tobą jeszcze ${n('pl', c, LESSON_COUNT)}: od prostych zwrotów do swobodnej rozmowy.`, 'Cały kurs'),
    },
    lesson_b1: {
      ru: t('Уровень B1 — в Plus', 'Продолжай курс с того места, где остановился.', 'Все уроки уровня B1'),
      uk: t('Рівень B1 — у Plus', 'Продовжуй курс з того місця, де зупинився.', 'Усі уроки рівня B1'),
      en: t('Level B1 is in Plus', 'Pick up the course right where you left off.', 'Every B1 lesson'),
      es: t('El nivel B1 está en Plus', 'Sigue el curso justo donde lo dejaste.', 'Todas las lecciones de B1'),
      'pt-BR': t('O nível B1 está no Plus', 'Continue o curso de onde parou.', 'Todas as lições do B1'),
      vi: t('Cấp độ B1 có trong Plus', 'Tiếp tục khóa học ngay từ chỗ bạn dừng lại.', 'Tất cả bài học B1'),
      id: t('Level B1 ada di Plus', 'Lanjutkan kursus dari tempat kamu berhenti.', 'Semua pelajaran B1'),
      tr: t('B1 seviyesi Plus’ta', 'Kursa kaldığın yerden devam et.', 'Tüm B1 dersleri'),
      pl: t('Poziom B1 — w Plus', 'Kontynuuj kurs od miejsca, w którym skończyłeś.', 'Wszystkie lekcje B1'),
    },
    level_up: {
      ru: t('Новый уровень! Идём дальше?', 'Plus открывает весь курс — не останавливайся.', 'Весь курс целиком'),
      uk: t('Новий рівень! Йдемо далі?', 'Plus відкриває увесь курс — не зупиняйся.', 'Увесь курс повністю'),
      en: t('New level! Keep going?', 'Plus opens the whole course — don’t stop now.', 'The whole course'),
      es: t('¡Nuevo nivel! ¿Seguimos?', 'Plus abre el curso completo: no te detengas.', 'El curso completo'),
      'pt-BR': t('Novo nível! Vamos em frente?', 'O Plus abre o curso inteiro — não pare agora.', 'O curso inteiro'),
      vi: t('Lên cấp mới! Học tiếp nhé?', 'Plus mở trọn khóa học — đừng dừng lại.', 'Trọn khóa học'),
      id: t('Level baru! Lanjut?', 'Plus membuka seluruh kursus — jangan berhenti.', 'Seluruh kursus'),
      tr: t('Yeni seviye! Devam mı?', 'Plus kursun tamamını açar — durma.', 'Kursun tamamı'),
      pl: t('Nowy poziom! Idziemy dalej?', 'Plus otwiera cały kurs — nie zatrzymuj się.', 'Cały kurs'),
    },
    free_lessons_complete: {
      ru: t('Бесплатные уроки пройдены', `Дальше ${n('ru', c, LESSON_COUNT)} — открой их с Plus.`, 'Весь курс целиком'),
      uk: t('Безкоштовні уроки пройдено', `Далі ${n('uk', c, LESSON_COUNT)} — відкрий їх з Plus.`, 'Увесь курс повністю'),
      en: t('Free lessons complete', `${c} more lessons ahead — unlock them with Plus.`, 'The whole course'),
      es: t('Terminaste las lecciones gratis', `Siguen ${c} lecciones más: desbloquéalas con Plus.`, 'El curso completo'),
      'pt-BR': t('Lições grátis concluídas', `Vêm aí mais ${c} lições — libere com o Plus.`, 'O curso inteiro'),
      vi: t('Đã xong các bài miễn phí', `Còn ${c} bài học nữa — mở khóa với Plus.`, 'Trọn khóa học'),
      id: t('Pelajaran gratis selesai', `Masih ada ${c} pelajaran — buka dengan Plus.`, 'Seluruh kursus'),
      tr: t('Ücretsiz dersler bitti', `${c} ders daha var — Plus ile aç.`, 'Kursun tamamı'),
      pl: t('Darmowe lekcje ukończone', `Dalej ${n('pl', c, LESSON_COUNT)} — odblokuj je z Plus.`, 'Cały kurs'),
    },
    notification_upsell: {
      ru: t('Продолжим курс?', `Впереди ${n('ru', c, LESSON_COUNT)} — вернись и открой их с Plus.`, 'Весь курс целиком'),
      uk: t('Продовжимо курс?', `Попереду ${n('uk', c, LESSON_COUNT)} — повертайся і відкрий їх з Plus.`, 'Увесь курс повністю'),
      en: t('Ready to continue the course?', `${c} lessons ahead — come back and unlock them with Plus.`, 'The whole course'),
      es: t('¿Seguimos con el curso?', `Te esperan ${c} lecciones: vuelve y desbloquéalas con Plus.`, 'El curso completo'),
      'pt-BR': t('Vamos continuar o curso?', `${c} lições à frente — volte e libere com o Plus.`, 'O curso inteiro'),
      vi: t('Học tiếp khóa học nhé?', `Còn ${c} bài học — quay lại và mở khóa với Plus.`, 'Trọn khóa học'),
      id: t('Lanjutkan kursusnya?', `${c} pelajaran menunggu — kembali dan buka dengan Plus.`, 'Seluruh kursus'),
      tr: t('Kursa devam edelim mi?', `${c} ders seni bekliyor — geri dön, Plus ile aç.`, 'Kursun tamamı'),
      pl: t('Kontynuujemy kurs?', `Przed tobą ${n('pl', c, LESSON_COUNT)} — wróć i odblokuj je z Plus.`, 'Cały kurs'),
    },
    mistake_practice: {
      ru: t('Ошибки — без лимита', `Бесплатно — ${n('ru', L.mistakes, SESSION_COUNT)} в день. С Plus разбирай сколько нужно.`, 'Все ошибки из уроков и карточек в одном месте'),
      uk: t('Помилки — без ліміту', `Безкоштовно — ${n('uk', L.mistakes, SESSION_COUNT)} на день. З Plus розбирай скільки треба.`, 'Усі помилки з уроків і карток в одному місці'),
      en: t('Mistakes with no limit', `Free: ${n('en', L.mistakes, SESSION_COUNT)} a day. With Plus, review as much as you need.`, 'All mistakes from lessons and cards in one place'),
      es: t('Errores sin límite', `Gratis: ${n('es', L.mistakes, SESSION_COUNT)} al día. Con Plus, repasa todo lo que necesites.`, 'Todos los errores de lecciones y tarjetas en un lugar'),
      'pt-BR': t('Erros sem limite', `Grátis: ${n('pt-BR', L.mistakes, SESSION_COUNT)} por dia. Com o Plus, revise quanto precisar.`, 'Todos os erros de lições e cartões em um só lugar'),
      vi: t('Ôn lỗi không giới hạn', `Miễn phí: ${n('vi', L.mistakes, SESSION_COUNT)} mỗi ngày. Với Plus, ôn bao nhiêu tùy bạn.`, 'Mọi lỗi từ bài học và thẻ ở một nơi'),
      id: t('Kesalahan tanpa batas', `Gratis: ${n('id', L.mistakes, SESSION_COUNT)} sehari. Dengan Plus, ulas sebanyak yang kamu mau.`, 'Semua kesalahan dari pelajaran dan kartu di satu tempat'),
      tr: t('Hatalar sınırsız', `Ücretsiz: günde ${n('tr', L.mistakes, SESSION_COUNT)}. Plus ile istediğin kadar çalış.`, 'Ders ve kart hatalarının hepsi tek yerde'),
      pl: t('Błędy bez limitu', `Za darmo — ${n('pl', L.mistakes, SESSION_COUNT)} dziennie. Z Plus ćwicz, ile potrzebujesz.`, 'Wszystkie błędy z lekcji i kart w jednym miejscu'),
    },
    flashcard_limit: {
      ru: t('Место для карточек закончилось', `Бесплатно — ${n('ru', L.cards, PHRASE_COUNT)}. С Plus сохраняй сколько хочешь.`, 'Безлимит на личную базу карточек'),
      uk: t('Місце для карток закінчилося', `Безкоштовно — ${n('uk', L.cards, PHRASE_COUNT)}. З Plus зберігай скільки хочеш.`, 'Безліміт на особисту базу карток'),
      en: t('No room for more cards', `Free: ${n('en', L.cards, PHRASE_COUNT)}. With Plus, save as many as you like.`, 'Unlimited personal card collection'),
      es: t('No queda espacio para tarjetas', `Gratis: ${n('es', L.cards, PHRASE_COUNT)}. Con Plus, guarda todas las que quieras.`, 'Tu colección de tarjetas sin límite'),
      'pt-BR': t('Acabou o espaço para cartões', `Grátis: ${n('pt-BR', L.cards, PHRASE_COUNT)}. Com o Plus, salve quantas quiser.`, 'Sua coleção de cartões sem limite'),
      vi: t('Hết chỗ lưu thẻ', `Miễn phí: ${n('vi', L.cards, PHRASE_COUNT)}. Với Plus, lưu bao nhiêu tùy thích.`, 'Kho thẻ cá nhân không giới hạn'),
      id: t('Tempat kartu sudah penuh', `Gratis: ${n('id', L.cards, PHRASE_COUNT)}. Dengan Plus, simpan sebanyak yang kamu mau.`, 'Koleksi kartu pribadi tanpa batas'),
      tr: t('Kart yeri doldu', `Ücretsiz: ${n('tr', L.cards, PHRASE_COUNT)}. Plus ile istediğin kadar kaydet.`, 'Kişisel kart arşivinde sınır yok'),
      pl: t('Skończyło się miejsce na karty', `Za darmo — ${n('pl', L.cards, PHRASE_COUNT)}. Z Plus zapisuj, ile chcesz.`, 'Własna baza kart bez limitu'),
    },
    flashcard_training: {
      ru: t('Тренировки на месяц закончились', `Бесплатно — ${n('ru', L.training, TRAINING_COUNT)} в месяц. С Plus счётчика нет.`, 'Игровая тренировка сохранённых фраз'),
      uk: t('Тренування на місяць закінчилися', `Безкоштовно — ${n('uk', L.training, TRAINING_COUNT)} на місяць. З Plus лічильника немає.`, 'Ігрове тренування збережених висловів'),
      en: t('This month’s practice is used up', `Free: ${n('en', L.training, TRAINING_COUNT)} a month. With Plus there’s no counter.`, 'Game-style practice of saved phrases'),
      es: t('Se acabaron los entrenamientos del mes', `Gratis: ${n('es', L.training, TRAINING_COUNT)} al mes. Con Plus no hay contador.`, 'Práctica en forma de juego con tus frases'),
      'pt-BR': t('Os treinos do mês acabaram', `Grátis: ${n('pt-BR', L.training, TRAINING_COUNT)} por mês. Com o Plus não há contador.`, 'Treino em forma de jogo com suas frases'),
      vi: t('Hết lượt luyện tập tháng này', `Miễn phí: ${n('vi', L.training, TRAINING_COUNT)} mỗi tháng. Với Plus không giới hạn.`, 'Luyện cụm từ đã lưu như chơi game'),
      id: t('Latihan bulan ini sudah habis', `Gratis: ${n('id', L.training, TRAINING_COUNT)} per bulan. Dengan Plus tanpa batas.`, 'Latihan frasa tersimpan ala permainan'),
      tr: t('Bu ayın antrenmanları bitti', `Ücretsiz: ayda ${n('tr', L.training, TRAINING_COUNT)}. Plus ile sayaç yok.`, 'Kaydedilen ifadelerle oyun gibi antrenman'),
      pl: t('Treningi na ten miesiąc się skończyły', `Za darmo — ${n('pl', L.training, TRAINING_COUNT)} miesięcznie. Z Plus nie ma licznika.`, 'Trening zapisanych zwrotów w formie gry'),
    },
    flashcard_create: {
      ru: t('Добавь свою фразу', 'Услышал в сериале или на работе — сохрани, и приложение будет её тренировать.', 'Свои фразы с переводом и озвучкой'),
      uk: t('Додай свою фразу', 'Почув у серіалі чи на роботі — збережи, і застосунок її тренуватиме.', 'Власні вислови з перекладом і озвученням'),
      en: t('Add your own phrase', 'Heard it in a show or at work? Save it and the app will train it.', 'Your phrases with translation and audio'),
      es: t('Añade tu propia frase', '¿La oíste en una serie o en el trabajo? Guárdala y la app te la hará practicar.', 'Tus frases con traducción y audio'),
      'pt-BR': t('Adicione sua própria frase', 'Ouviu numa série ou no trabalho? Salve e o app vai treinar com você.', 'Suas frases com tradução e áudio'),
      vi: t('Thêm cụm từ của bạn', 'Nghe được trong phim hay ở chỗ làm? Lưu lại, ứng dụng sẽ luyện cho bạn.', 'Cụm từ của bạn có bản dịch và âm thanh'),
      id: t('Tambahkan frasamu sendiri', 'Dengar di serial atau di kantor? Simpan, dan aplikasi akan melatihnya.', 'Frasamu dengan terjemahan dan suara'),
      tr: t('Kendi ifadeni ekle', 'Bir dizide ya da işte mi duydun? Kaydet, uygulama sana çalıştırsın.', 'Çevirili ve seslendirmeli kendi ifadelerin'),
      pl: t('Dodaj własny zwrot', 'Usłyszałeś w serialu albo w pracy? Zapisz, a aplikacja będzie go ćwiczyć.', 'Własne zwroty z tłumaczeniem i nagraniem'),
    },
    pack_create: {
      ru: t('Собери свой набор', 'Фразы для поездки, работы или сериала — в одном месте.', 'Своя колода под любую задачу'),
      uk: t('Збери свій набір', 'Вислови для подорожі, роботи чи серіалу — в одному місці.', 'Власна колода під будь-яку задачу'),
      en: t('Build your own set', 'Phrases for a trip, work or a show — all in one place.', 'Your own deck for any goal'),
      es: t('Arma tu propio set', 'Frases para un viaje, el trabajo o una serie, en un solo lugar.', 'Tu propio mazo para cualquier meta'),
      'pt-BR': t('Monte seu próprio conjunto', 'Frases para viagem, trabalho ou uma série — tudo em um só lugar.', 'Seu baralho para qualquer objetivo'),
      vi: t('Tạo bộ thẻ của bạn', 'Cụm từ cho chuyến đi, công việc hay phim — ở cùng một nơi.', 'Bộ thẻ riêng cho mọi mục tiêu'),
      id: t('Buat set milikmu', 'Frasa untuk liburan, kerja, atau serial — di satu tempat.', 'Dek sendiri untuk tujuan apa pun'),
      tr: t('Kendi setini oluştur', 'Seyahat, iş ya da dizi için ifadeler tek yerde.', 'Her amaç için kendi destesi'),
      pl: t('Zbuduj własny zestaw', 'Zwroty na wyjazd, do pracy albo z serialu — w jednym miejscu.', 'Własna talia pod każdy cel'),
    },
    streak: {
      ru: t('Не потеряй серию', 'Plus защитит её, если пропустишь день.', 'Защита серии даже при пропуске'),
      uk: t('Не втрачай серію', 'Plus захистить її, якщо пропустиш день.', 'Захист серії навіть при пропуску'),
      en: t('Don’t lose your streak', 'Plus protects it if you miss a day.', 'Streak protection even when you skip'),
      es: t('No pierdas tu racha', 'Plus la protege si te saltas un día.', 'Tu racha protegida aunque faltes'),
      'pt-BR': t('Não perca sua sequência', 'O Plus protege se você pular um dia.', 'Sequência protegida mesmo se faltar'),
      vi: t('Đừng mất chuỗi ngày học', 'Plus bảo vệ chuỗi nếu bạn lỡ một ngày.', 'Bảo vệ chuỗi kể cả khi bỏ lỡ'),
      id: t('Jangan putuskan streak-mu', 'Plus melindunginya kalau kamu melewatkan sehari.', 'Streak terlindungi meski terlewat'),
      tr: t('Serini kaybetme', 'Bir gün atlarsan Plus serini korur.', 'Atlasan bile seri korunur'),
      pl: t('Nie strać serii', 'Plus ją ochroni, jeśli opuścisz dzień.', 'Ochrona serii nawet przy przerwie'),
    },
    dialog_limit: {
      ru: t('Ответы в диалогах закончились', `Бесплатно — ${n('ru', L.dialog, REPLY_COUNT)} в месяц. С Plus счётчика нет.`, 'Все сценарии без месячного лимита'),
      uk: t('Відповіді в діалогах закінчилися', `Безкоштовно — ${n('uk', L.dialog, REPLY_COUNT)} на місяць. З Plus лічильника немає.`, 'Усі сценарії без місячного ліміту'),
      en: t('No more dialogue replies', `Free: ${n('en', L.dialog, REPLY_COUNT)} a month. With Plus there’s no counter.`, 'Every scenario with no monthly limit'),
      es: t('Se acabaron las respuestas', `Gratis: ${n('es', L.dialog, REPLY_COUNT)} al mes. Con Plus no hay contador.`, 'Todos los escenarios sin límite mensual'),
      'pt-BR': t('As respostas nos diálogos acabaram', `Grátis: ${n('pt-BR', L.dialog, REPLY_COUNT)} por mês. Com o Plus não há contador.`, 'Todos os cenários sem limite mensal'),
      vi: t('Hết lượt trả lời hội thoại', `Miễn phí: ${n('vi', L.dialog, REPLY_COUNT)} mỗi tháng. Với Plus không giới hạn.`, 'Mọi tình huống, không giới hạn hằng tháng'),
      id: t('Balasan dialog sudah habis', `Gratis: ${n('id', L.dialog, REPLY_COUNT)} per bulan. Dengan Plus tanpa batas.`, 'Semua skenario tanpa batas bulanan'),
      tr: t('Diyalog yanıtların bitti', `Ücretsiz: ayda ${n('tr', L.dialog, REPLY_COUNT)}. Plus ile sayaç yok.`, 'Aylık sınır olmadan tüm senaryolar'),
      pl: t('Odpowiedzi w dialogach się skończyły', `Za darmo — ${n('pl', L.dialog, REPLY_COUNT)} miesięcznie. Z Plus nie ma licznika.`, 'Wszystkie scenariusze bez miesięcznego limitu'),
    },
    dialog_locked_level: {
      ru: t('Сценарий откроется позже', 'Он открывается рангом монеты. Plus откроет все сразу.', 'Ответы в диалогах без месячного лимита'),
      uk: t('Сценарій відкриється пізніше', 'Він відкривається рангом монети. Plus відкриє всі одразу.', 'Відповіді в діалогах без місячного ліміту'),
      en: t('This scenario opens later', 'It unlocks with your coin rank. Plus opens them all now.', 'Dialogue replies with no monthly limit'),
      es: t('Este escenario se abre más tarde', 'Se desbloquea con tu rango de monedas. Plus los abre todos ya.', 'Respuestas en diálogos sin límite mensual'),
      'pt-BR': t('Este cenário abre mais tarde', 'Ele abre com sua patente de moedas. O Plus abre todos agora.', 'Respostas nos diálogos sem limite mensal'),
      vi: t('Tình huống này sẽ mở sau', 'Mở khi bạn đạt hạng xu. Plus mở tất cả ngay.', 'Trả lời hội thoại không giới hạn hằng tháng'),
      id: t('Skenario ini terbuka nanti', 'Terbuka lewat peringkat koinmu. Plus membuka semuanya sekarang.', 'Balasan dialog tanpa batas bulanan'),
      tr: t('Bu senaryo daha sonra açılır', 'Jeton rütbenle açılır. Plus hepsini hemen açar.', 'Aylık sınırsız diyalog yanıtları'),
      pl: t('Ten scenariusz otworzy się później', 'Otwiera się rangą monet. Plus otworzy wszystkie od razu.', 'Odpowiedzi w dialogach bez miesięcznego limitu'),
    },
    dialog_analysis: {
      ru: t('Разбор твоей речи', 'Увидишь, где фраза звучала неестественно и как сказать живее.', 'Разбор на экране завершения'),
      uk: t('Розбір твого мовлення', 'Побачиш, де вислів звучав неприродно і як сказати живіше.', 'Розбір на екрані завершення'),
      en: t('A review of how you spoke', 'See where a phrase sounded unnatural and how to say it more naturally.', 'Review on the finish screen'),
      es: t('Análisis de cómo hablaste', 'Verás dónde una frase sonó poco natural y cómo decirla mejor.', 'Análisis en la pantalla final'),
      'pt-BR': t('Análise da sua fala', 'Veja onde a frase soou estranha e como dizer de um jeito mais natural.', 'Análise na tela final'),
      vi: t('Nhận xét cách bạn nói', 'Xem câu nào nghe chưa tự nhiên và nói sao cho tự nhiên hơn.', 'Nhận xét ở màn hình kết thúc'),
      id: t('Ulasan cara bicaramu', 'Lihat frasa mana yang terdengar kaku dan cara mengucapkannya lebih alami.', 'Ulasan di layar akhir'),
      tr: t('Konuşmanın değerlendirmesi', 'Hangi ifadenin doğal durmadığını ve nasıl daha doğal söyleneceğini gör.', 'Bitiş ekranında değerlendirme'),
      pl: t('Analiza twojej wypowiedzi', 'Zobaczysz, gdzie zwrot brzmiał nienaturalnie i jak powiedzieć to lepiej.', 'Analiza na ekranie końcowym'),
    },
    ai_voice_input: {
      ru: t('Отвечай голосом', `Бесплатно — ${n('ru', L.voice, VOICE_COUNT)} голосом в день. С Plus говори сколько хочешь.`, 'Микрофон прямо в поле ответа'),
      uk: t('Відповідай голосом', `Безкоштовно — ${n('uk', L.voice, VOICE_COUNT)} голосом на день. З Plus говори скільки хочеш.`, 'Мікрофон просто в полі відповіді'),
      en: t('Answer with your voice', `Free: ${n('en', L.voice, VOICE_COUNT)} a day. With Plus, speak as much as you like.`, 'A mic right in the answer field'),
      es: t('Responde con tu voz', `Gratis: ${n('es', L.voice, VOICE_COUNT)} al día. Con Plus, habla todo lo que quieras.`, 'Micrófono en el campo de respuesta'),
      'pt-BR': t('Responda com a voz', `Grátis: ${n('pt-BR', L.voice, VOICE_COUNT)} por dia. Com o Plus, fale quanto quiser.`, 'Microfone direto no campo de resposta'),
      vi: t('Trả lời bằng giọng nói', `Miễn phí: ${n('vi', L.voice, VOICE_COUNT)} mỗi ngày. Với Plus, nói bao nhiêu tùy bạn.`, 'Micro ngay trong ô trả lời'),
      id: t('Jawab dengan suara', `Gratis: ${n('id', L.voice, VOICE_COUNT)} sehari. Dengan Plus, bicara sepuasnya.`, 'Mikrofon langsung di kolom jawaban'),
      tr: t('Sesinle yanıtla', `Ücretsiz: günde ${n('tr', L.voice, VOICE_COUNT)}. Plus ile istediğin kadar konuş.`, 'Yanıt alanında mikrofon'),
      pl: t('Odpowiadaj głosem', `Za darmo — ${n('pl', L.voice, VOICE_COUNT)} głosowe dziennie. Z Plus mów, ile chcesz.`, 'Mikrofon prosto w polu odpowiedzi'),
    },
    speaking: {
      ru: t('Говори вслух сколько нужно', `Бесплатно — ${n('ru', L.speaking, ATTEMPT_COUNT)} в день. С Plus повторяй, пока не получится.`, 'Произноси фразы вслух — приложение слушает'),
      uk: t('Говори вголос скільки треба', `Безкоштовно — ${n('uk', L.speaking, ATTEMPT_COUNT)} на день. З Plus повторюй, поки не вийде.`, 'Вимовляй вислови вголос — застосунок слухає'),
      en: t('Speak out loud as much as you need', `Free: ${n('en', L.speaking, ATTEMPT_COUNT)} a day. With Plus, repeat until you get it.`, 'Say phrases out loud — the app listens'),
      es: t('Habla en voz alta lo que necesites', `Gratis: ${n('es', L.speaking, ATTEMPT_COUNT)} al día. Con Plus, repite hasta que te salga.`, 'Di las frases en voz alta: la app escucha'),
      'pt-BR': t('Fale em voz alta quanto precisar', `Grátis: ${n('pt-BR', L.speaking, ATTEMPT_COUNT)} por dia. Com o Plus, repita até acertar.`, 'Fale as frases em voz alta — o app escuta'),
      vi: t('Nói thành tiếng bao nhiêu tùy bạn', `Miễn phí: ${n('vi', L.speaking, ATTEMPT_COUNT)} mỗi ngày. Với Plus, lặp lại đến khi nói được.`, 'Nói thành tiếng — ứng dụng lắng nghe'),
      id: t('Bicara lantang sesukamu', `Gratis: ${n('id', L.speaking, ATTEMPT_COUNT)} sehari. Dengan Plus, ulangi sampai berhasil.`, 'Ucapkan frasa — aplikasi mendengarkan'),
      tr: t('İstediğin kadar sesli konuş', `Ücretsiz: günde ${n('tr', L.speaking, ATTEMPT_COUNT)}. Plus ile başarana kadar tekrarla.`, 'İfadeleri sesli söyle — uygulama dinler'),
      pl: t('Mów na głos, ile trzeba', `Za darmo — ${n('pl', L.speaking, ATTEMPT_COUNT)} dziennie. Z Plus powtarzaj, aż wyjdzie.`, 'Mów zwroty na głos — aplikacja słucha'),
    },
    mastery: {
      ru: t('Повтори раунд без ограничений', 'Plus открывает повтор любого раунда без списания монет.', 'Безлимит повторов любого урока'),
      uk: t('Повтори раунд без обмежень', 'Plus відкриває повтор будь-якого раунду без списання монет.', 'Безліміт повторів будь-якого уроку'),
      en: t('Replay a round with no limits', 'Plus lets you replay any round without spending coins.', 'Unlimited replays of any lesson'),
      es: t('Repite una ronda sin límites', 'Plus te deja repetir cualquier ronda sin gastar monedas.', 'Repeticiones ilimitadas de cualquier lección'),
      'pt-BR': t('Repita uma rodada sem limites', 'O Plus libera repetir qualquer rodada sem gastar moedas.', 'Repetições ilimitadas de qualquer lição'),
      vi: t('Chơi lại vòng không giới hạn', 'Plus cho chơi lại mọi vòng mà không tốn xu.', 'Ôn lại mọi bài không giới hạn'),
      id: t('Ulangi ronde tanpa batas', 'Plus membuka pengulangan ronde mana pun tanpa memakai koin.', 'Ulang pelajaran apa pun tanpa batas'),
      tr: t('Turu sınırsız tekrarla', 'Plus ile jeton harcamadan istediğin turu tekrarla.', 'Her dersi sınırsız tekrar'),
      pl: t('Powtórz rundę bez ograniczeń', 'Plus pozwala powtórzyć dowolną rundę bez wydawania monet.', 'Bez limitu powtórek każdej lekcji'),
    },
    combined_lesson: {
      ru: t('Несколько тем в одном уроке', 'Выбирай темы сам — урок соберётся под тебя.', 'Темы на выбор'),
      uk: t('Кілька тем в одному уроці', 'Обирай теми сам — урок збереться під тебе.', 'Теми на вибір'),
      en: t('Several topics in one lesson', 'Pick the topics yourself — the lesson builds around you.', 'Topics of your choice'),
      es: t('Varios temas en una lección', 'Elige los temas tú: la lección se arma a tu medida.', 'Temas a tu elección'),
      'pt-BR': t('Vários temas em uma lição', 'Escolha os temas — a lição se monta para você.', 'Temas à sua escolha'),
      vi: t('Nhiều chủ đề trong một bài', 'Tự chọn chủ đề — bài học sẽ được ghép cho bạn.', 'Chủ đề tùy chọn'),
      id: t('Beberapa topik dalam satu pelajaran', 'Pilih topiknya sendiri — pelajaran disusun untukmu.', 'Topik pilihanmu'),
      tr: t('Tek derste birkaç konu', 'Konuları sen seç — ders sana göre hazırlansın.', 'Seçtiğin konular'),
      pl: t('Kilka tematów w jednej lekcji', 'Wybierz tematy sam — lekcja ułoży się pod ciebie.', 'Tematy do wyboru'),
    },
    stats: {
      ru: t('Посмотри, как идут дела', 'Год занятий на одном экране: где шло легко, где буксовало.', 'Карта активности: все 365 дней'),
      uk: t('Подивись, як ідуть справи', 'Рік занять на одному екрані: де йшло легко, а де буксувало.', 'Карта активності: усі 365 днів'),
      en: t('See how you’re doing', 'A year of practice on one screen: where it was easy and where you got stuck.', 'Activity map: all 365 days'),
      es: t('Mira cómo vas', 'Un año de práctica en una pantalla: dónde fue fácil y dónde te atascaste.', 'Mapa de actividad: los 365 días'),
      'pt-BR': t('Veja como você está indo', 'Um ano de estudo numa tela: onde foi fácil e onde travou.', 'Mapa de atividade: os 365 dias'),
      vi: t('Xem bạn đang học thế nào', 'Cả năm học trên một màn hình: chỗ nào dễ, chỗ nào vướng.', 'Bản đồ hoạt động: đủ 365 ngày'),
      id: t('Lihat perkembanganmu', 'Setahun belajar di satu layar: mana yang lancar, mana yang tersendat.', 'Peta aktivitas: 365 hari'),
      tr: t('Nasıl gittiğine bak', 'Bir yıllık çalışma tek ekranda: nerede kolaydı, nerede takıldın.', 'Etkinlik haritası: 365 gün'),
      pl: t('Zobacz, jak ci idzie', 'Rok nauki na jednym ekranie: gdzie szło łatwo, a gdzie się zacinało.', 'Mapa aktywności: wszystkie 365 dni'),
    },
    heatmap: {
      ru: t('Весь год на одном экране', 'Видно каждый день: где была серия, а где перерыв.', '365 дней активности'),
      uk: t('Увесь рік на одному екрані', 'Видно кожен день: де була серія, а де перерва.', '365 днів активності'),
      en: t('Your whole year on one screen', 'Every day is visible: where your streak ran and where you took a break.', '365 days of activity'),
      es: t('Todo el año en una pantalla', 'Se ve cada día: dónde tuviste racha y dónde paraste.', '365 días de actividad'),
      'pt-BR': t('O ano inteiro numa tela', 'Dá para ver cada dia: onde teve sequência e onde parou.', '365 dias de atividade'),
      vi: t('Cả năm trên một màn hình', 'Thấy từng ngày: lúc giữ chuỗi và lúc nghỉ.', '365 ngày hoạt động'),
      id: t('Setahun penuh di satu layar', 'Setiap hari terlihat: kapan streak jalan, kapan istirahat.', '365 hari aktivitas'),
      tr: t('Bütün yıl tek ekranda', 'Her gün görünür: serinin sürdüğü ve ara verdiğin günler.', '365 günlük etkinlik'),
      pl: t('Cały rok na jednym ekranie', 'Widać każdy dzień: gdzie była seria, a gdzie przerwa.', '365 dni aktywności'),
    },
    patterns: {
      ru: t('Что забывается чаще всего', 'Приложение покажет темы, которые не закрепились, и соберёт из них тренировку.', 'Точки роста: что чаще всего проседает'),
      uk: t('Що забувається найчастіше', 'Застосунок покаже теми, що не закріпилися, і збере з них тренування.', 'Точки росту: що найчастіше просідає'),
      en: t('What you forget most often', 'The app shows topics that haven’t stuck and builds practice from them.', 'Growth points: what slips most often'),
      es: t('Lo que más olvidas', 'La app te muestra los temas que no se fijaron y arma práctica con ellos.', 'Puntos de mejora: lo que más falla'),
      'pt-BR': t('O que você mais esquece', 'O app mostra os temas que não fixaram e monta um treino com eles.', 'Pontos de melhora: o que mais falha'),
      vi: t('Điều bạn hay quên nhất', 'Ứng dụng chỉ ra chủ đề chưa nhớ và tạo bài luyện từ đó.', 'Điểm cần cải thiện: điều hay sai nhất'),
      id: t('Yang paling sering terlupa', 'Aplikasi menunjukkan topik yang belum melekat dan membuat latihan darinya.', 'Titik tumbuh: yang paling sering turun'),
      tr: t('En sık unuttukların', 'Uygulama oturmayan konuları gösterir ve onlardan antrenman hazırlar.', 'Gelişim noktaları: en sık düşen konular'),
      pl: t('Co zapominasz najczęściej', 'Aplikacja pokaże tematy, które się nie utrwaliły, i zrobi z nich trening.', 'Punkty wzrostu: co najczęściej kuleje'),
    },
    percentiles: {
      ru: t('Ты идёшь лучше, чем думаешь', 'Твоя серия и темп на фоне других учеников.', 'Твой ранг среди всех учеников'),
      uk: t('Ти йдеш краще, ніж думаєш', 'Твоя серія і темп на тлі інших учнів.', 'Твій ранг серед усіх учнів'),
      en: t('You’re doing better than you think', 'Your streak and pace compared with other learners.', 'Your rank among all learners'),
      es: t('Vas mejor de lo que crees', 'Tu racha y tu ritmo frente a otros estudiantes.', 'Tu puesto entre todos los estudiantes'),
      'pt-BR': t('Você está melhor do que pensa', 'Sua sequência e seu ritmo comparados aos de outros alunos.', 'Sua posição entre todos os alunos'),
      vi: t('Bạn học tốt hơn bạn nghĩ', 'Chuỗi ngày và tốc độ của bạn so với người học khác.', 'Thứ hạng của bạn giữa mọi người học'),
      id: t('Kamu lebih baik dari yang kamu kira', 'Streak dan ritmemu dibanding pelajar lain.', 'Peringkatmu di antara semua pelajar'),
      tr: t('Sandığından iyi gidiyorsun', 'Serin ve hızın diğer öğrencilerle kıyaslanır.', 'Tüm öğrenciler arasındaki sıran'),
      pl: t('Idzie ci lepiej, niż myślisz', 'Twoja seria i tempo na tle innych uczniów.', 'Twoja pozycja wśród wszystkich uczniów'),
    },
    weekly_review: {
      ru: t('Итог недели на одной странице', 'Что укрепилось, где проседает и с чего начать новую неделю.', 'Личный итог недели'),
      uk: t('Підсумок тижня на одній сторінці', 'Що закріпилося, де просідає і з чого почати новий тиждень.', 'Особистий підсумок тижня'),
      en: t('Your week on one page', 'What got stronger, what slips and where to start next week.', 'Your personal weekly summary'),
      es: t('Tu semana en una página', 'Qué se afianzó, qué falla y por dónde empezar la próxima semana.', 'Tu resumen semanal'),
      'pt-BR': t('Sua semana em uma página', 'O que firmou, o que ainda falha e por onde começar a próxima semana.', 'Seu resumo da semana'),
      vi: t('Tổng kết tuần trên một trang', 'Điều đã vững, điều còn yếu và bắt đầu tuần mới từ đâu.', 'Tổng kết tuần của riêng bạn'),
      id: t('Rangkuman minggu di satu halaman', 'Apa yang makin kuat, apa yang turun, dan mulai dari mana minggu depan.', 'Rangkuman mingguan pribadi'),
      tr: t('Haftan tek sayfada', 'Neler oturdu, nerede zayıflık var ve yeni haftaya nereden başlamalı.', 'Kişisel haftalık özet'),
      pl: t('Podsumowanie tygodnia na jednej stronie', 'Co się utrwaliło, co kuleje i od czego zacząć nowy tydzień.', 'Osobiste podsumowanie tygodnia'),
    },
    language_add: {
      ru: t('Учи несколько языков сразу', 'Бесплатно — один язык. С Plus у каждого свой прогресс.', 'Несколько языков в одном аккаунте'),
      uk: t('Вивчай кілька мов одразу', 'Безкоштовно — одна мова. З Plus у кожної свій прогрес.', 'Кілька мов в одному акаунті'),
      en: t('Learn several languages at once', 'Free: one language. With Plus, each one keeps its own progress.', 'Several languages in one account'),
      es: t('Aprende varios idiomas a la vez', 'Gratis: un idioma. Con Plus, cada uno tiene su progreso.', 'Varios idiomas en una cuenta'),
      'pt-BR': t('Aprenda vários idiomas ao mesmo tempo', 'Grátis: um idioma. Com o Plus, cada um tem seu progresso.', 'Vários idiomas em uma conta'),
      vi: t('Học nhiều ngôn ngữ cùng lúc', 'Miễn phí: một ngôn ngữ. Với Plus, mỗi ngôn ngữ có tiến độ riêng.', 'Nhiều ngôn ngữ trong một tài khoản'),
      id: t('Belajar beberapa bahasa sekaligus', 'Gratis: satu bahasa. Dengan Plus, tiap bahasa punya progres sendiri.', 'Beberapa bahasa dalam satu akun'),
      tr: t('Aynı anda birkaç dil öğren', 'Ücretsiz: tek dil. Plus ile her dilin kendi ilerlemesi olur.', 'Tek hesapta birden çok dil'),
      pl: t('Ucz się kilku języków naraz', 'Za darmo — jeden język. Z Plus każdy ma własny postęp.', 'Kilka języków na jednym koncie'),
    },
    avatar_aura: {
      ru: t('Добавь аватару свечение', 'Аура видна у друзей и в списках — тебя заметят сразу.', 'Аура вокруг аватара'),
      uk: t('Додай аватару сяйво', 'Аура видна в друзів і в списках — тебе помітять одразу.', 'Аура навколо аватара'),
      en: t('Give your avatar a glow', 'Your aura shows for friends and in lists — you’ll stand out.', 'An aura around your avatar'),
      es: t('Dale brillo a tu avatar', 'El aura se ve entre amigos y en las listas: te notarán al instante.', 'Un aura alrededor de tu avatar'),
      'pt-BR': t('Dê um brilho ao seu avatar', 'A aura aparece para os amigos e nas listas — você chama atenção.', 'Uma aura em volta do avatar'),
      vi: t('Thêm hào quang cho avatar', 'Hào quang hiện với bạn bè và trong danh sách — nổi bật ngay.', 'Hào quang quanh avatar'),
      id: t('Beri avatarmu cahaya', 'Aura terlihat oleh teman dan di daftar — kamu langsung menonjol.', 'Aura di sekitar avatar'),
      tr: t('Avatarına parıltı ekle', 'Aura arkadaşlarında ve listelerde görünür — hemen fark edilirsin.', 'Avatarının etrafında aura'),
      pl: t('Dodaj awatarowi blask', 'Aurę widać u znajomych i na listach — od razu cię zauważą.', 'Aura wokół awatara'),
    },
    club: {
      ru: t('Занимайся без ограничений', 'Plus открывает курс, разговоры и тренировки без дневных ограничений.', 'Дополнительные возможности сообщества'),
      uk: t('Займайся без обмежень', 'Plus відкриває курс, розмови й тренування без денних обмежень.', 'Додаткові можливості спільноти'),
      en: t('Practice without limits', 'Plus opens the course, conversations and practice with no daily limits.', 'Extra community features'),
      es: t('Practica sin límites', 'Plus abre el curso, las conversaciones y la práctica sin límites diarios.', 'Funciones extra de la comunidad'),
      'pt-BR': t('Estude sem limites', 'O Plus abre o curso, as conversas e os treinos sem limites diários.', 'Recursos extras da comunidade'),
      vi: t('Học không giới hạn', 'Plus mở khóa học, hội thoại và luyện tập không giới hạn mỗi ngày.', 'Tính năng cộng đồng bổ sung'),
      id: t('Belajar tanpa batas', 'Plus membuka kursus, percakapan, dan latihan tanpa batas harian.', 'Fitur komunitas tambahan'),
      tr: t('Sınırsız çalış', 'Plus kursu, sohbetleri ve antrenmanları günlük sınır olmadan açar.', 'Ek topluluk özellikleri'),
      pl: t('Ucz się bez ograniczeń', 'Plus otwiera kurs, rozmowy i treningi bez dziennych limitów.', 'Dodatkowe funkcje społeczności'),
    },
    onboarding_plan: {
      ru: t('Начни говорить, а не зубрить', 'Живые фразы, разговоры вслух и повторы того, что забываешь.', 'Весь курс целиком'),
      uk: t('Почни говорити, а не зубрити', 'Живі вислови, розмови вголос і повтори того, що забуваєш.', 'Увесь курс повністю'),
      en: t('Start speaking, not cramming', 'Real phrases, speaking out loud and reviews of what you forget.', 'The whole course'),
      es: t('Empieza a hablar, no a memorizar', 'Frases reales, práctica en voz alta y repaso de lo que olvidas.', 'El curso completo'),
      'pt-BR': t('Comece a falar, não a decorar', 'Frases reais, fala em voz alta e revisão do que você esquece.', 'O curso inteiro'),
      vi: t('Bắt đầu nói, đừng học vẹt', 'Câu nói thật, luyện nói thành tiếng và ôn điều bạn hay quên.', 'Trọn khóa học'),
      id: t('Mulai bicara, bukan menghafal', 'Frasa nyata, bicara lantang, dan pengulangan yang kamu lupakan.', 'Seluruh kursus'),
      tr: t('Ezberleme, konuşmaya başla', 'Gerçek ifadeler, sesli konuşma ve unuttuklarının tekrarı.', 'Kursun tamamı'),
      pl: t('Zacznij mówić, a nie wkuwać', 'Żywe zwroty, mówienie na głos i powtórki tego, co zapominasz.', 'Cały kurs'),
    },
    intro_ended: {
      ru: t('Пробный доступ закончился', 'Plus вернёт всё: курс, разговоры, тренировки и статистику.', 'Полный доступ возвращается целиком'),
      uk: t('Пробний доступ закінчився', 'Plus поверне все: курс, розмови, тренування і статистику.', 'Повний доступ повертається повністю'),
      en: t('Your trial access has ended', 'Plus brings it all back: course, conversations, practice and stats.', 'Full access comes back completely'),
      es: t('Tu acceso de prueba terminó', 'Plus lo devuelve todo: curso, conversaciones, práctica y estadísticas.', 'El acceso completo vuelve entero'),
      'pt-BR': t('Seu acesso de teste acabou', 'O Plus devolve tudo: curso, conversas, treinos e estatísticas.', 'O acesso completo volta inteiro'),
      vi: t('Quyền dùng thử đã kết thúc', 'Plus mang lại tất cả: khóa học, hội thoại, luyện tập và thống kê.', 'Toàn quyền truy cập trở lại đầy đủ'),
      id: t('Akses uji cobamu sudah berakhir', 'Plus mengembalikan semuanya: kursus, percakapan, latihan, dan statistik.', 'Akses penuh kembali seluruhnya'),
      tr: t('Deneme erişimin bitti', 'Plus her şeyi geri getirir: kurs, sohbetler, antrenman ve istatistikler.', 'Tam erişim eksiksiz geri gelir'),
      pl: t('Dostęp próbny się skończył', 'Plus przywróci wszystko: kurs, rozmowy, treningi i statystyki.', 'Pełny dostęp wraca w całości'),
    },
    premium_expired: {
      ru: t('Всё на месте — продолжим?', 'Серия, фразы и уроки никуда не делись. Подключи Plus и продолжай.', 'Продолжаешь ровно с того места, где остановился'),
      uk: t('Усе на місці — продовжимо?', 'Серія, вислови й уроки нікуди не зникли. Підключи Plus і продовжуй.', 'Продовжуєш саме з того місця, де зупинився'),
      en: t('Everything’s still here — continue?', 'Your streak, phrases and lessons are all here. Turn on Plus and carry on.', 'Pick up exactly where you left off'),
      es: t('Todo sigue aquí, ¿continuamos?', 'Tu racha, frases y lecciones siguen aquí. Activa Plus y sigue.', 'Sigues justo donde lo dejaste'),
      'pt-BR': t('Está tudo aqui — vamos continuar?', 'Sua sequência, frases e lições continuam aqui. Ative o Plus e siga.', 'Continue exatamente de onde parou'),
      vi: t('Mọi thứ vẫn còn — học tiếp nhé?', 'Chuỗi ngày, cụm từ và bài học vẫn còn đó. Bật Plus và học tiếp.', 'Tiếp tục đúng chỗ bạn đã dừng'),
      id: t('Semuanya masih ada — lanjut?', 'Streak, frasa, dan pelajaranmu masih ada. Aktifkan Plus dan lanjutkan.', 'Lanjut tepat dari tempat kamu berhenti'),
      tr: t('Her şey yerinde — devam mı?', 'Serin, ifadelerin ve derslerin duruyor. Plus’ı aç ve devam et.', 'Tam kaldığın yerden devam'),
      pl: t('Wszystko na miejscu — kontynuujemy?', 'Seria, zwroty i lekcje nigdzie nie zniknęły. Włącz Plus i ucz się dalej.', 'Kontynuujesz dokładnie tam, gdzie skończyłeś'),
    },
    vip_expired: {
      ru: t('Бонусный доступ закончился', 'Plus вернёт курс, разговоры, тренировки и статистику.', 'Весь курс и практика снова открыты'),
      uk: t('Бонусний доступ закінчився', 'Plus поверне курс, розмови, тренування і статистику.', 'Увесь курс і практика знову відкриті'),
      en: t('Your bonus access has ended', 'Plus brings back the course, conversations, practice and stats.', 'The whole course and practice open again'),
      es: t('Tu acceso de bonificación terminó', 'Plus te devuelve el curso, las conversaciones, la práctica y las estadísticas.', 'El curso y la práctica, abiertos de nuevo'),
      'pt-BR': t('Seu acesso bônus acabou', 'O Plus devolve o curso, as conversas, os treinos e as estatísticas.', 'Curso e prática liberados de novo'),
      vi: t('Quyền truy cập thưởng đã hết', 'Plus mang lại khóa học, hội thoại, luyện tập và thống kê.', 'Khóa học và luyện tập mở lại'),
      id: t('Akses bonusmu sudah berakhir', 'Plus mengembalikan kursus, percakapan, latihan, dan statistik.', 'Seluruh kursus dan latihan terbuka lagi'),
      tr: t('Bonus erişimin bitti', 'Plus kursu, sohbetleri, antrenmanları ve istatistikleri geri getirir.', 'Kurs ve pratik yeniden açık'),
      pl: t('Dostęp bonusowy się skończył', 'Plus przywróci kurs, rozmowy, treningi i statystyki.', 'Cały kurs i praktyka znów otwarte'),
    },
    referral_ended: {
      ru: t('Бонусный доступ закончился', 'Plus вернёт всё, чем ты пользовался.', 'Всё, чем ты пользовался, снова открыто'),
      uk: t('Бонусний доступ закінчився', 'Plus поверне все, чим ти користувався.', 'Усе, чим ти користувався, знову відкрито'),
      en: t('Your bonus access has ended', 'Plus brings back everything you were using.', 'Everything you used is open again'),
      es: t('Tu acceso de bonificación terminó', 'Plus te devuelve todo lo que usabas.', 'Todo lo que usabas, abierto de nuevo'),
      'pt-BR': t('Seu acesso bônus acabou', 'O Plus devolve tudo o que você usava.', 'Tudo o que você usava liberado de novo'),
      vi: t('Quyền truy cập thưởng đã hết', 'Plus mang lại mọi thứ bạn đã dùng.', 'Mọi thứ bạn đã dùng mở lại'),
      id: t('Akses bonusmu sudah berakhir', 'Plus mengembalikan semua yang kamu pakai.', 'Semua yang kamu pakai terbuka lagi'),
      tr: t('Bonus erişimin bitti', 'Plus kullandığın her şeyi geri getirir.', 'Kullandığın her şey yeniden açık'),
      pl: t('Dostęp bonusowy się skończył', 'Plus przywróci wszystko, z czego korzystałeś.', 'Wszystko, z czego korzystałeś, znów otwarte'),
    },
    winback: {
      ru: t('С возвращением', 'Выученное на месте. Начни с короткого урока — дальше пойдёт само.', 'Всё открыто с первого дня'),
      uk: t('З поверненням', 'Вивчене на місці. Почни з короткого уроку — далі піде само.', 'Усе відкрито з першого дня'),
      en: t('Welcome back', 'What you learned is still here. Start with a short lesson — the rest will follow.', 'Everything open from day one'),
      es: t('Bienvenido de nuevo', 'Lo que aprendiste sigue aquí. Empieza con una lección corta y lo demás vendrá solo.', 'Todo abierto desde el primer día'),
      'pt-BR': t('Que bom te ver de volta', 'O que você aprendeu continua aqui. Comece com uma lição curta — o resto flui.', 'Tudo liberado desde o primeiro dia'),
      vi: t('Chào mừng trở lại', 'Những gì đã học vẫn còn. Bắt đầu bằng một bài ngắn — rồi sẽ quen dần.', 'Mở mọi thứ từ ngày đầu'),
      id: t('Selamat datang kembali', 'Yang sudah kamu pelajari masih ada. Mulai dari pelajaran singkat — sisanya mengalir.', 'Semua terbuka sejak hari pertama'),
      tr: t('Tekrar hoş geldin', 'Öğrendiklerin yerinde. Kısa bir dersle başla — gerisi kendiliğinden gelir.', 'İlk günden her şey açık'),
      pl: t('Witaj z powrotem', 'To, czego się nauczyłeś, zostało. Zacznij od krótkiej lekcji — dalej pójdzie samo.', 'Wszystko otwarte od pierwszego dnia'),
    },
    home_discount_badge: {
      ru: t('Твоя цена на подписку', 'Та же подписка — по сниженной цене.', 'Та же подписка, цена ниже'),
      uk: t('Твоя ціна на передплату', 'Та сама передплата — за зниженою ціною.', 'Та сама передплата, ціна нижча'),
      en: t('Your price for the subscription', 'The same subscription at a lower price.', 'Same subscription, lower price'),
      es: t('Tu precio de suscripción', 'La misma suscripción a un precio más bajo.', 'La misma suscripción, más barata'),
      'pt-BR': t('Seu preço para a assinatura', 'A mesma assinatura por um preço menor.', 'A mesma assinatura, preço menor'),
      vi: t('Giá của bạn cho gói đăng ký', 'Cùng gói đăng ký với giá thấp hơn.', 'Cùng gói, giá thấp hơn'),
      id: t('Harga langgananmu', 'Langganan yang sama dengan harga lebih murah.', 'Langganan sama, harga lebih rendah'),
      tr: t('Abonelik için senin fiyatın', 'Aynı abonelik, daha düşük fiyatla.', 'Aynı abonelik, daha düşük fiyat'),
      pl: t('Twoja cena subskrypcji', 'Ta sama subskrypcja w niższej cenie.', 'Ta sama subskrypcja, niższa cena'),
    },
    generic: {
      ru: t('Всё приложение целиком', 'Весь курс, разговоры вслух, тренировки, коллекция фраз и статистика.', 'Говоришь вслух с первого дня'),
      uk: t('Увесь застосунок повністю', 'Увесь курс, розмови вголос, тренування, колекція висловів і статистика.', 'Говориш уголос із першого дня'),
      en: t('The whole app', 'The full course, speaking out loud, practice, a phrase collection and stats.', 'You speak out loud from day one'),
      es: t('Toda la app, completa', 'Curso completo, práctica oral, entrenamientos, colección de frases y estadísticas.', 'Hablas en voz alta desde el primer día'),
      'pt-BR': t('O app inteiro', 'Curso completo, fala em voz alta, treinos, coleção de frases e estatísticas.', 'Você fala em voz alta desde o primeiro dia'),
      vi: t('Toàn bộ ứng dụng', 'Trọn khóa học, nói thành tiếng, luyện tập, bộ sưu tập cụm từ và thống kê.', 'Nói thành tiếng ngay từ ngày đầu'),
      id: t('Seluruh aplikasi', 'Seluruh kursus, bicara lantang, latihan, koleksi frasa, dan statistik.', 'Bicara lantang sejak hari pertama'),
      tr: t('Uygulamanın tamamı', 'Kursun tamamı, sesli konuşma, antrenman, ifade koleksiyonu ve istatistikler.', 'İlk günden sesli konuşursun'),
      pl: t('Cała aplikacja', 'Cały kurs, mówienie na głos, treningi, kolekcja zwrotów i statystyki.', 'Mówisz na głos od pierwszego dnia'),
    },
  };
}

// «урок» при числе — для «29 уроков» в ru/uk/pl.
const LESSON_COUNT: Forms = { ru: ['урок', 'урока', 'уроков'], uk: ['урок', 'уроки', 'уроків'], en: ['lesson', 'lessons'], es: ['lección', 'lecciones'], 'pt-BR': ['lição', 'lições'], vi: ['bài học'], id: ['pelajaran'], tr: ['ders'], pl: ['lekcja', 'lekcje', 'lekcji'] };

let cachedTexts: Readonly<Record<PaywallTextContext, Texts>> | null = null;
export function paywallContextTexts(): Readonly<Record<PaywallTextContext, Texts>> {
  if (!cachedTexts) cachedTexts = buildTexts();
  return cachedTexts;
}

/** Пилюля «что закончилось / что закрыто». Пустая строка — пилюли нет. */
export function paywallContextPill(ctx: PaywallTextContext, lang: PaywallTextLang, facts: PaywallEntryFacts = {}): string {
  const lesson = facts.lessonNumber && Number.isSafeInteger(facts.lessonNumber) && facts.lessonNumber > 0 ? facts.lessonNumber : null;
  const streak = facts.streakDays && Number.isSafeInteger(facts.streakDays) && facts.streakDays > 0 ? facts.streakDays : null;
  const pick = (map: Readonly<Record<PaywallTextLang, string>>) => map[lang];
  switch (ctx) {
    case 'no_energy':
      return pick({ ru: 'Энергия 0', uk: 'Енергія 0', en: 'Energy 0', es: 'Energía 0', 'pt-BR': 'Energia 0', vi: 'Năng lượng 0', id: 'Energi 0', tr: 'Enerji 0', pl: 'Energia 0' });
    case 'ai_explain':
      return pick({ ru: 'Разбор на сегодня: 0', uk: 'Розбір на сьогодні: 0', en: 'Explanations today: 0', es: 'Explicaciones hoy: 0', 'pt-BR': 'Explicações hoje: 0', vi: 'Giải thích hôm nay: 0', id: 'Penjelasan hari ini: 0', tr: 'Bugünkü açıklama: 0', pl: 'Wyjaśnienia na dziś: 0' });
    case 'course_after_lesson3':
      return lesson
        ? pick({ ru: `Урок ${lesson} закрыт`, uk: `Урок ${lesson} закрито`, en: `Lesson ${lesson} locked`, es: `Lección ${lesson} bloqueada`, 'pt-BR': `Lição ${lesson} bloqueada`, vi: `Bài ${lesson} đã khóa`, id: `Pelajaran ${lesson} terkunci`, tr: `Ders ${lesson} kilitli`, pl: `Lekcja ${lesson} zamknięta` })
        : pick({ ru: 'Урок закрыт', uk: 'Урок закрито', en: 'Lesson locked', es: 'Lección bloqueada', 'pt-BR': 'Lição bloqueada', vi: 'Bài học đã khóa', id: 'Pelajaran terkunci', tr: 'Ders kilitli', pl: 'Lekcja zamknięta' });
    case 'lesson_b1':
      return pick({ ru: 'Уровень B1 закрыт', uk: 'Рівень B1 закрито', en: 'Level B1 locked', es: 'Nivel B1 bloqueado', 'pt-BR': 'Nível B1 bloqueado', vi: 'Cấp B1 đã khóa', id: 'Level B1 terkunci', tr: 'B1 seviyesi kilitli', pl: 'Poziom B1 zamknięty' });
    case 'free_lessons_complete':
      return paywallContextTexts().free_lessons_complete[lang].title;
    case 'mistake_practice':
      return usedOf(lang, L.mistakes, SESSION_OF);
    case 'flashcard_limit':
      return usedOf(lang, L.cards, PHRASE_OF);
    case 'flashcard_training':
      return usedOf(lang, L.training, TRAINING_OF);
    case 'streak':
      return streak
        ? pick({ ru: `Серия ${n('ru', streak, DAY_COUNT)}`, uk: `Серія ${n('uk', streak, DAY_COUNT)}`, en: `${n('en', streak, DAY_COUNT)} streak`, es: `Racha de ${n('es', streak, DAY_COUNT)}`, 'pt-BR': `Sequência de ${n('pt-BR', streak, DAY_COUNT)}`, vi: `Chuỗi ${n('vi', streak, DAY_COUNT)}`, id: `Rangkaian ${n('id', streak, DAY_COUNT)}`, tr: `${n('tr', streak, DAY_COUNT)} seri`, pl: `Seria ${n('pl', streak, DAY_COUNT)}` })
        : pick({ ru: 'Серия под угрозой', uk: 'Серія під загрозою', en: 'Streak at risk', es: 'Racha en riesgo', 'pt-BR': 'Sequência em risco', vi: 'Chuỗi đang gặp nguy', id: 'Rangkaian terancam', tr: 'Seri tehlikede', pl: 'Seria zagrożona' });
    case 'dialog_limit':
      return usedOf(lang, L.dialog, REPLY_OF);
    case 'dialog_locked_level':
      return pick({ ru: 'Сценарий закрыт', uk: 'Сценарій закрито', en: 'Scenario locked', es: 'Escenario bloqueado', 'pt-BR': 'Cenário bloqueado', vi: 'Tình huống đã khóa', id: 'Skenario terkunci', tr: 'Senaryo kilitli', pl: 'Scenariusz zamknięty' });
    case 'ai_voice_input':
      return usedOf(lang, L.voice, VOICE_OF);
    case 'speaking':
      return usedOf(lang, L.speaking, ATTEMPT_OF);
    case 'language_add':
      return usedOf(lang, L.languages, LANGUAGE_OF);
    case 'intro_ended':
    case 'vip_expired':
    case 'referral_ended':
      return paywallContextTexts()[ctx][lang].title;
    case 'premium_expired':
      return pick({ ru: 'Plus закончился', uk: 'Plus закінчився', en: 'Plus has ended', es: 'Plus terminó', 'pt-BR': 'O Plus acabou', vi: 'Plus đã hết hạn', id: 'Plus sudah berakhir', tr: 'Plus sona erdi', pl: 'Plus się skończył' });
    default:
      return '';
  }
}

export function isPaywallTextLang(value: string): value is PaywallTextLang {
  return (PAYWALL_TEXT_LANGS as readonly string[]).includes(value);
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PaywallContextTextsRouteShim() { return null; }

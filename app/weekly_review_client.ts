// ═══════════════════════════════════════════════════════════════════════════
// weekly_review_client.ts — клиентский слой ИИ-разбора ошибок.
//
// Отвечает за: кэш последнего разбора (AsyncStorage), локальный гейт частоты
// (календарное окно + минимум данных — чтобы не дёргать платный CF зря),
// вызов CF weeklyReviewGenerate и маппинг ошибок в мягкие состояния для UI.
//
// SERVER остаётся источником правды по окну (его квота неподделываема). Локальный
// гейт — лишь оптимизация и UX: не показываем кнопку «обновить», пока рано.
// Паттерн callable()/ensureAnonUser следует daily_analytics_sync.ts.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildWeeklyReviewBriefing,
  type WeeklyReviewBriefing,
  type WeeklyReviewRecommendation,
} from './weekly_review_briefing';
import { getLast7DaysXp, getLast7DaysTimeMs } from './daily_analytics_sync';
import { loadActivity365Analytics } from './activity_365_analytics';
import { DebugLogger } from './debug-logger';
import { triLang, type Lang } from '../constants/i18n';
import { weeklyReviewStorageKey, type RuntimeStudyTarget } from './target_storage_keys';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREMIUM_WINDOW_DAYS = 1;
const FREE_WINDOW_DAYS = 7;

export interface WeeklyReview {
  greeting: string;
  paragraphs: string[];
  recommendations: WeeklyReviewRecommendation[];
}

export interface WeeklyReviewStored {
  review: WeeklyReview;
  /** Когда разбор был сгенерирован (мс). */
  generatedAtMs: number;
  /** Когда сервер разрешит следующий (мс). */
  nextAllowedAtMs: number;
  /** За какое окно (дни) собирался. */
  windowDays: number;
  /** Язык, на котором сгенерирован — чтобы не показывать чужой при смене языка. */
  lang: Lang;
}

export type WeeklyReviewState =
  | { kind: 'none'; canGenerate: boolean }
  | { kind: 'cached'; stored: WeeklyReviewStored; canRefresh: boolean; nextAllowedAtMs: number }
  | { kind: 'insufficient_data' }
  | { kind: 'error'; code: WeeklyReviewErrorCode; stored: WeeklyReviewStored | null };

export type WeeklyReviewErrorCode =
  | 'offline'
  | 'not_ready'
  | 'insufficient_data'
  | 'provider_failed'
  | 'unknown';

/** Normalizes a stored/CF review so downstream code can trust its shape. */
function normalizeReview(review: Partial<WeeklyReview> | undefined): WeeklyReview | null {
  if (!review || typeof review.greeting !== 'string' || !review.greeting) return null;
  return {
    greeting: review.greeting,
    paragraphs: Array.isArray(review.paragraphs) ? review.paragraphs.filter((p): p is string => typeof p === 'string') : [],
    recommendations: Array.isArray(review.recommendations)
      ? review.recommendations.filter((r): r is WeeklyReviewRecommendation => !!r && typeof r.microDiagnosisId === 'string' && typeof r.label === 'string')
      : [],
  };
}

async function loadStored(studyTarget?: RuntimeStudyTarget): Promise<WeeklyReviewStored | null> {
  try {
    const raw = await AsyncStorage.getItem(weeklyReviewStorageKey(studyTarget));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WeeklyReviewStored>;
    const review = normalizeReview(parsed?.review);
    if (!review) return null;
    return {
      review,
      generatedAtMs: Number(parsed.generatedAtMs ?? 0),
      nextAllowedAtMs: Number(parsed.nextAllowedAtMs ?? 0),
      windowDays: Number(parsed.windowDays ?? 0),
      lang: (parsed.lang ?? 'ru') as WeeklyReviewStored['lang'],
    };
  } catch {
    return null;
  }
}

async function saveStored(stored: WeeklyReviewStored, studyTarget?: RuntimeStudyTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(weeklyReviewStorageKey(studyTarget), JSON.stringify(stored));
  } catch (err) {
    DebugLogger.error('weekly_review_client:save', err, 'warning');
  }
}

function windowDaysFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_WINDOW_DAYS : FREE_WINDOW_DAYS;
}

/**
 * Локальная оценка: можно ли сейчас сгенерировать новый разбор.
 * true, если разбора ещё не было, или прошло окно с прошлого.
 * (Сервер всё равно перепроверит — это лишь чтобы не дёргать CF впустую.)
 */
function canGenerateNow(stored: WeeklyReviewStored | null, nowMs: number): boolean {
  if (!stored) return true;
  return nowMs >= stored.nextAllowedAtMs;
}

/** Текущее состояние для UI без обращения к сети. */
export async function getWeeklyReviewState(
  studyTarget?: RuntimeStudyTarget,
  lang?: Lang,
  nowMs: number = Date.now(),
): Promise<WeeklyReviewState> {
  const stored = await loadStored(studyTarget);
  if (!stored) return { kind: 'none', canGenerate: true };
  if (lang && stored.lang !== lang) {
    return { kind: 'none', canGenerate: canGenerateNow(stored, nowMs) };
  }
  const canRefresh = canGenerateNow(stored, nowMs);
  return { kind: 'cached', stored, canRefresh, nextAllowedAtMs: stored.nextAllowedAtMs };
}

export interface GenerateOptions {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  isPremium: boolean;
  force?: boolean;
  nowMs?: number;
}

function localText(
  lang: Lang,
  ru: string,
  uk: string,
  es: string,
  ptBR: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): string {
  return triLang(lang, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

export function buildLocalWeeklyReview(briefing: WeeklyReviewBriefing): WeeklyReview {
  const weak = briefing.weakCategories[0];
  const strong = briefing.strongCategories[0] ?? briefing.recoveredCategories[0];
  const lesson = briefing.weakLessons[0];
  const phrase = briefing.topMistakePhrases[0];
  const minutes = Math.max(0, Math.round(briefing.effort.weekMinutes));
  const xp = Math.max(0, Math.round(briefing.effort.weekXp));

  const greeting = localText(
    briefing.lang,
    `Разбор готов: за ${briefing.windowDays} дн. найдено ${briefing.totalMistakes} ошибок.`,
    `Розбір готовий: за ${briefing.windowDays} дн. знайдено ${briefing.totalMistakes} помилок.`,
    `Resumen listo: en ${briefing.windowDays} días encontramos ${briefing.totalMistakes} errores.`,
    `Resumo pronto: em ${briefing.windowDays} dias encontramos ${briefing.totalMistakes} erros.`,
    `Bản tổng kết đã sẵn sàng: trong ${briefing.windowDays} ngày tìm thấy ${briefing.totalMistakes} lỗi.`,
    `Ringkasan siap: dalam ${briefing.windowDays} hari ditemukan ${briefing.totalMistakes} kesalahan.`,
    `Özet hazır: ${briefing.windowDays} günde ${briefing.totalMistakes} hata bulundu.`,
    `Podsumowanie gotowe: w ${briefing.windowDays} dni znaleziono ${briefing.totalMistakes} błędów.`,
  );

  const paragraphs = [
    weak
      ? localText(
          briefing.lang,
          `Главный фокус сейчас: ${weak.label}. На него приходится около ${Math.round(weak.pct)}% ошибок; чаще всего всплывают: ${weak.topWords.join(', ') || 'слова из этой темы'}.`,
          `Головний фокус зараз: ${weak.label}. Це близько ${Math.round(weak.pct)}% помилок; найчастіше трапляються: ${weak.topWords.join(', ') || 'слова з цієї теми'}.`,
          `El foco principal ahora es ${weak.label}. Representa cerca del ${Math.round(weak.pct)}% de tus errores; aparecen más: ${weak.topWords.join(', ') || 'palabras de este tema'}.`,
          `O foco principal agora é ${weak.label}. Ele reúne cerca de ${Math.round(weak.pct)}% dos seus erros; aparecem mais: ${weak.topWords.join(', ') || 'palavras deste tema'}.`,
          `Trọng tâm chính bây giờ là ${weak.label}. Phần này chiếm khoảng ${Math.round(weak.pct)}% lỗi; hay gặp nhất: ${weak.topWords.join(', ') || 'các từ trong chủ đề này'}.`,
          `Fokus utama sekarang: ${weak.label}. Ini sekitar ${Math.round(weak.pct)}% dari kesalahanmu; yang paling sering muncul: ${weak.topWords.join(', ') || 'kata-kata dari topik ini'}.`,
          `Şu an ana odak: ${weak.label}. Hatalarının yaklaşık ${Math.round(weak.pct)}%'i burada; en sık çıkanlar: ${weak.topWords.join(', ') || 'bu konudaki kelimeler'}.`,
          `Główny fokus teraz: ${weak.label}. To około ${Math.round(weak.pct)}% błędów; najczęściej pojawiają się: ${weak.topWords.join(', ') || 'słowa z tego tematu'}.`,
        )
      : localText(
          briefing.lang,
          'Явной слабой зоны нет: ошибки распределены ровно. Лучше закрепить материал короткой повторной практикой.',
          'Явної слабкої зони немає: помилки розподілені рівно. Краще закріпити матеріал короткою повторною практикою.',
          'No hay una zona débil clara: los errores están bastante repartidos. Conviene reforzar con una práctica corta.',
          'Não há uma zona fraca clara: os erros estão bem distribuídos. Vale reforçar com uma prática curta.',
          'Chưa có vùng yếu rõ ràng: lỗi phân bố khá đều. Tốt hơn là củng cố bằng một bài luyện ngắn.',
          'Belum ada area lemah yang jelas: kesalahan tersebar cukup rata. Lebih baik perkuat dengan latihan singkat.',
          'Belirgin bir zayıf alan yok: hatalar dengeli dağılmış. Kısa bir tekrar pratiğiyle pekiştirmek daha iyi.',
          'Nie ma wyraźnie słabszego obszaru: błędy rozkładają się równo. Najlepiej utrwalić materiał krótką powtórką.',
        ),
    lesson
      ? localText(
          briefing.lang,
          `Самый полезный возврат: ${lesson.title}. Этот урок даст быстрый эффект, потому что он связан с текущими ошибками.`,
          `Найкорисніше повернення: ${lesson.title}. Цей урок дасть швидкий ефект, бо він пов'язаний з поточними помилками.`,
          `La mejor vuelta ahora: ${lesson.title}. Esta lección puede ayudarte rápido porque conecta con tus errores actuales.`,
          `A melhor revisão agora: ${lesson.title}. Esta lição pode ajudar rápido porque está ligada aos seus erros atuais.`,
          `Bài nên quay lại nhất: ${lesson.title}. Bài này sẽ có hiệu quả nhanh vì liên quan đến các lỗi hiện tại.`,
          `Pengulangan paling berguna: ${lesson.title}. Pelajaran ini bisa memberi efek cepat karena terkait dengan kesalahanmu sekarang.`,
          `En faydalı dönüş: ${lesson.title}. Bu ders hızlı etki eder çünkü şu anki hatalarınla bağlantılı.`,
          `Najbardziej przydatny powrót: ${lesson.title}. Ta lekcja da szybki efekt, bo łączy się z obecnymi błędami.`,
        )
      : localText(
          briefing.lang,
          'Повтори одну короткую тренировку сегодня: лучше 5 минут точно, чем длинная сессия без фокуса.',
          'Повтори одне коротке тренування сьогодні: краще 5 хвилин точно, ніж довга сесія без фокусу.',
          'Haz una práctica corta hoy: mejor 5 minutos con foco que una sesión larga sin dirección.',
          'Faça uma prática curta hoje: melhor 5 minutos com foco do que uma sessão longa sem direção.',
          'Hôm nay hãy làm một bài luyện ngắn: 5 phút đúng trọng tâm tốt hơn một buổi dài thiếu tập trung.',
          'Ulangi satu latihan singkat hari ini: lebih baik 5 menit tepat sasaran daripada sesi panjang tanpa fokus.',
          'Bugün kısa bir antrenman tekrar et: odaksız uzun bir oturum yerine net 5 dakika daha iyi.',
          'Powtórz dziś jeden krótki trening: lepsze 5 minut celnie niż długa sesja bez fokusu.',
        ),
    strong
      ? localText(
          briefing.lang,
          `Хорошая зона: ${strong.label}. Её можно не трогать глубоко, просто поддерживать лёгким повторением.`,
          `Сильна зона: ${strong.label}. Її не треба чіпати глибоко, достатньо легкого повторення.`,
          `Punto fuerte: ${strong.label}. No hace falta trabajarlo mucho; basta con repasarlo suave.`,
          `Ponto forte: ${strong.label}. Não precisa mexer muito; basta manter com uma revisão leve.`,
          `Vùng mạnh: ${strong.label}. Không cần đào sâu, chỉ cần duy trì bằng ôn nhẹ.`,
          `Area kuat: ${strong.label}. Tidak perlu digali terlalu dalam; cukup dijaga dengan pengulangan ringan.`,
          `Güçlü alan: ${strong.label}. Derin çalışmaya gerek yok; hafif tekrar yeter.`,
          `Mocny obszar: ${strong.label}. Nie trzeba go mocno ruszać, wystarczy lekkie powtarzanie.`,
        )
      : localText(
          briefing.lang,
          `Ритм недели: ${xp} XP и ${minutes} мин. практики. Следующий шаг — один маленький блок без распыления.`,
          `Ритм тижня: ${xp} XP і ${minutes} хв. практики. Наступний крок — один маленький блок без розпорошення.`,
          `Ritmo semanal: ${xp} XP y ${minutes} min de práctica. Siguiente paso: un bloque pequeño y enfocado.`,
          `Ritmo da semana: ${xp} XP e ${minutes} min de prática. Próximo passo: um bloco pequeno e focado.`,
          `Nhịp tuần này: ${xp} XP và ${minutes} phút luyện tập. Bước tiếp theo: một khối nhỏ, không dàn trải.`,
          `Ritme minggu ini: ${xp} XP dan ${minutes} menit latihan. Langkah berikutnya: satu blok kecil tanpa menyebar fokus.`,
          `Haftanın ritmi: ${xp} XP ve ${minutes} dk pratik. Sonraki adım: dağılmadan küçük bir blok.`,
          `Rytm tygodnia: ${xp} XP i ${minutes} min praktyki. Następny krok: jeden mały blok bez rozpraszania.`,
        ),
    phrase
      ? localText(
          briefing.lang,
          `Фраза для перепроверки: “${phrase.phrase}” (${phrase.count}×). Проговори её вслух и собери похожий пример.`,
          `Фраза для перевірки: “${phrase.phrase}” (${phrase.count}×). Проговори її вголос і склади схожий приклад.`,
          `Frase para revisar: “${phrase.phrase}” (${phrase.count}×). Dila en voz alta y crea un ejemplo parecido.`,
          `Frase para revisar: “${phrase.phrase}” (${phrase.count}×). Diga em voz alta e monte um exemplo parecido.`,
          `Cụm từ cần kiểm tra lại: “${phrase.phrase}” (${phrase.count}×). Hãy đọc to và tạo một ví dụ tương tự.`,
          `Frasa untuk dicek ulang: “${phrase.phrase}” (${phrase.count}×). Ucapkan keras-keras dan buat contoh serupa.`,
          `Tekrar kontrol edilecek ifade: “${phrase.phrase}” (${phrase.count}×). Yüksek sesle söyle ve benzer bir örnek kur.`,
          `Fraza do ponownego sprawdzenia: “${phrase.phrase}” (${phrase.count}×). Powiedz ją na głos i ułóż podobny przykład.`,
        )
      : localText(
          briefing.lang,
          'На сегодня хватит одного точного шага: выбери рекомендацию ниже и закрой её без спешки.',
          'На сьогодні достатньо одного точного кроку: обери рекомендацію нижче й закрий її без поспіху.',
          'Por hoy basta un paso concreto: elige una recomendación de abajo y complétala sin prisa.',
          'Por hoje basta um passo concreto: escolha uma recomendação abaixo e conclua sem pressa.',
          'Hôm nay chỉ cần một bước rõ ràng: chọn gợi ý bên dưới và hoàn thành không vội.',
          'Untuk hari ini cukup satu langkah tepat: pilih rekomendasi di bawah dan selesaikan tanpa terburu-buru.',
          'Bugün tek net adım yeter: aşağıdaki önerilerden birini seç ve acele etmeden tamamla.',
          'Na dziś wystarczy jeden konkretny krok: wybierz rekomendację poniżej i zamknij ją bez pośpiechu.',
        ),
  ];

  return {
    greeting,
    paragraphs,
    recommendations: briefing.recommendedLessons,
  };
}

/**
 * Генерирует новый разбор локальным шаблоном (если окно позволяет и данных достаточно).
 * Возвращает обновлённое состояние. При ошибке отдаёт прошлый разбор + код.
 */
export async function generateWeeklyReview(options: GenerateOptions): Promise<WeeklyReviewState> {
  const { lang, isPremium } = options;
  const studyTarget = options.studyTarget;
  const nowMs = options.nowMs ?? Date.now();
  const stored = await loadStored(studyTarget);
  const storedForLang = stored?.lang === lang ? stored : null;

  // Локальный гейт: рано — отдаём кэш, CF не трогаем.
  if (!options.force && !canGenerateNow(stored, nowMs)) {
    if (storedForLang) return { kind: 'cached', stored: storedForLang, canRefresh: false, nextAllowedAtMs: storedForLang.nextAllowedAtMs };
    return { kind: 'none', canGenerate: false };
  }

  // Effort-контекст собираем здесь (Firebase-слой) и передаём в чистый builder.
  const [weekXp, weekTimeMs, activity] = await Promise.all([
    getLast7DaysXp().catch(() => 0),
    getLast7DaysTimeMs().catch(() => 0),
    loadActivity365Analytics().catch(() => null),
  ]);
  const effort = {
    currentStreak: activity?.currentStreak ?? 0,
    longestStreak: activity?.longestStreak ?? 0,
    weekXp,
    weekMinutes: Math.round(weekTimeMs / 60000),
  };

  const briefing = await buildWeeklyReviewBriefing({ lang, studyTarget, isPremium, effort });
  if (!briefing) {
    // Данных мало. Сохраняем «окно» чтобы не пытаться каждую секунду.
    return storedForLang
      ? { kind: 'cached', stored: storedForLang, canRefresh: false, nextAllowedAtMs: storedForLang.nextAllowedAtMs }
      : { kind: 'insufficient_data' };
  }

  const review = buildLocalWeeklyReview(briefing);
  const nextStored: WeeklyReviewStored = {
    review,
    generatedAtMs: nowMs,
    nextAllowedAtMs: nowMs + windowDaysFor(isPremium) * DAY_MS,
    windowDays: briefing.windowDays,
    lang,
  };
  await saveStored(nextStored, studyTarget);
  return { kind: 'cached', stored: nextStored, canRefresh: false, nextAllowedAtMs: nextStored.nextAllowedAtMs };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }

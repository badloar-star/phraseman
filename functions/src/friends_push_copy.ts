/**
 * Тексты пушей и строк ленты «Друзей» на 9 языках интерфейса.
 *
 * зачем (координатор 22.10, Ревизор 🟡): пуши и лента «Друзей» шли только по-русски — человек с английским или польским
 * интерфейсом получал русский пуш. Словарь — ДОСЛОВНО из черновика 10 · ПЕРЕВОДЧИКА
 * (docs/work/tasks/friends-push-copy-9-lang-draft-2026-10-22.md, 9c137f5af); правка текста — только через Переводчика.
 * Язык получателя — та же цепочка, что у админских рассылок (admin_push_jobs.parseAdminPushUser); не найден — ru, как раньше.
 * Склонения: {days}/{coins} по числу {n} (ru/uk/pl — три формы, en/es/pt — две; vi/id/tr не склоняются и метки не несут).
 * Документ получателя функции и так читают ради токена — язык не стоит лишних чтений.
 */

export const FRIENDS_PUSH_LANGS = ['ru', 'uk', 'en', 'es', 'pt', 'vi', 'id', 'tr', 'pl'] as const;
export type FriendsPushLang = typeof FRIENDS_PUSH_LANGS[number];

export const FRIENDS_PUSH_COPY = {
  nudgeStreakTitle: { ru: '{name}: серия вдвоём ждёт', uk: '{name}: серія вдвох чекає', en: '{name}: your streak together is waiting', es: '{name}: su racha juntos te espera', pt: '{name}: a sequência de vocês espera', vi: '{name}: chuỗi chung đang chờ', id: '{name}: rangkaian bersama menunggu', tr: '{name}: birlikte serin bekliyor', pl: '{name}: wasza wspólna seria czeka' },
  // зачем (голос PhraseMan, VOICE.md 25.10): без пафоса «огонь не погаснет» и без «сессии».
  // зачем (координатор 26.10): без «урока» — у курсов es/fr/de/it «Уроков» нет (D129/D130); вторая фраза ×9 дословно
  // из 7398140e4 Переводчика, как у streak_at_risk (614e76486).
  nudgeStreakBody: { ru: '{n} {days} подряд. Пара минут сегодня — и серия растёт.', uk: '{n} {days} поспіль. Кілька хвилин сьогодні — і серія росте.', en: '{n} {days} in a row. A couple of minutes today and your streak grows.', es: '{n} {days} seguidos. Un par de minutos hoy y tu racha crece.', pt: '{n} {days} seguidos. Alguns minutos hoje e sua sequência cresce.', vi: '{n} ngày liên tiếp. Vài phút hôm nay là chuỗi dài thêm.', id: '{n} hari berturut-turut. Beberapa menit hari ini, rangkaianmu bertambah.', tr: '{n} gün üst üste. Bugün birkaç dakika, serin uzar.', pl: '{n} {days} z rzędu. Kilka minut dziś i seria rośnie.' },
  nudgeTitle: { ru: '{name}: пять минут практики?', uk: '{name}: п’ять хвилин практики?', en: '{name}: five minutes of practice?', es: '{name}: ¿cinco minutos de práctica?', pt: '{name}: cinco minutos de prática?', vi: '{name}: năm phút luyện tập nhé?', id: '{name}: latihan lima menit?', tr: '{name}: beş dakika pratik?', pl: '{name}: pięć minut ćwiczeń?' },
  nudgeBody: { ru: 'Одно маленькое занятие.', uk: 'Одне маленьке заняття.', en: 'Just one short session.', es: 'Solo una sesión corta.', pt: 'Só uma sessão curta.', vi: 'Chỉ một buổi học ngắn.', id: 'Cukup satu sesi singkat.', tr: 'Sadece kısa bir oturum.', pl: 'Tylko jedne krótkie zajęcia.' },
  nudgeFeed: { ru: 'Пять минут на практику?', uk: 'П’ять хвилин на практику?', en: 'Five minutes to practice?', es: '¿Cinco minutos para practicar?', pt: 'Cinco minutos para praticar?', vi: 'Năm phút luyện tập nhé?', id: 'Lima menit untuk latihan?', tr: 'Pratik için beş dakika?', pl: 'Pięć minut na ćwiczenia?' },
  highFiveTitle: { ru: '{name} даёт пять', uk: '{name} дає п’ять', en: '{name} gave you a high five', es: '{name} te choca los cinco', pt: '{name} te deu um toque', vi: '{name} đập tay với bạn', id: '{name} memberi tos', tr: '{name} sana çak yaptı', pl: '{name} przybija piątkę' },
  highFiveBody: { ru: 'Пятюня получена.', uk: 'П’ятюню отримано.', en: 'High five received.', es: 'Choque recibido.', pt: 'Toque recebido.', vi: 'Đã nhận cú đập tay.', id: 'Tos diterima.', tr: 'Çak alındı.', pl: 'Piątka odebrana.' },
  highFiveFeed: { ru: 'Пятюня на удачу уже здесь.', uk: 'П’ятюня на щастя вже тут.', en: 'A high five for luck is here.', es: 'Un choque de manos para la suerte.', pt: 'Um toque para dar sorte chegou.', vi: 'Cú đập tay lấy may đã tới.', id: 'Tos keberuntungan sudah datang.', tr: 'Şans için bir çak geldi.', pl: 'Piątka na szczęście już jest.' },
  duelTitle: { ru: '{name} вызывает на дуэль', uk: '{name} викликає на дуель', en: '{name} challenges you to a duel', es: '{name} te reta a un duelo', pt: '{name} desafia você para um duelo', vi: '{name} thách đấu bạn', id: '{name} menantangmu duel', tr: '{name} seni düelloya davet ediyor', pl: '{name} wyzywa cię na pojedynek' },
  duelBody: { ru: '5 фраз · 24 часа на ответ', uk: '5 фраз · 24 години на відповідь', en: '5 phrases · 24 hours to answer', es: '5 frases · 24 horas para responder', pt: '5 frases · 24 horas para responder', vi: '5 câu · 24 giờ để trả lời', id: '5 frasa · 24 jam untuk menjawab', tr: '5 cümle · cevap için 24 saat', pl: '5 fraz · 24 godziny na odpowiedź' },
  duelFeed: { ru: 'Вызов на дуэль', uk: 'Виклик на дуель', en: 'Duel challenge', es: 'Desafío a duelo', pt: 'Desafio para duelo', vi: 'Lời thách đấu', id: 'Tantangan duel', tr: 'Düello daveti', pl: 'Wyzwanie na pojedynek' },
  duelResultTitle: { ru: 'Итог дуэли', uk: 'Підсумок дуелі', en: 'Duel result', es: 'Resultado del duelo', pt: 'Resultado do duelo', vi: 'Kết quả trận đấu', id: 'Hasil duel', tr: 'Düello sonucu', pl: 'Wynik pojedynku' },
  duelResultBody: { ru: '{name}: ответ на дуэль готов', uk: '{name}: відповідь на дуель готова', en: '{name} has played the duel', es: '{name} ya jugó el duelo', pt: '{name} já jogou o duelo', vi: '{name} đã chơi trận đấu', id: '{name} sudah main duel', tr: '{name} düelloyu oynadı', pl: '{name}: odpowiedź na pojedynek gotowa' },
  duelDeclinedFeed: { ru: 'Дуэль не принята', uk: 'Дуель не прийнято', en: 'Duel declined', es: 'Duelo rechazado', pt: 'Duelo recusado', vi: 'Lời thách đấu bị từ chối', id: 'Duel ditolak', tr: 'Düello reddedildi', pl: 'Pojedynek nieprzyjęty' },
  lessonInviteTitle: { ru: '{name} зовёт на занятие', uk: '{name} кличе на заняття', en: '{name} invites you to a session', es: '{name} te invita a una sesión', pt: '{name} chama você para uma sessão', vi: '{name} rủ bạn học cùng', id: '{name} mengajakmu ke sesi', tr: '{name} seni oturuma çağırıyor', pl: '{name} zaprasza cię na zajęcia' },
  lessonInviteBody: { ru: 'Урок {l} · Занятие {s}', uk: 'Урок {l} · Заняття {s}', en: 'Lesson {l} · Session {s}', es: 'Lección {l} · Sesión {s}', pt: 'Lição {l} · Sessão {s}', vi: 'Bài {l} · Buổi {s}', id: 'Pelajaran {l} · Sesi {s}', tr: 'Ders {l} · Oturum {s}', pl: 'Lekcja {l} · Zajęcia {s}' },
  lessonInviteFeed: { ru: 'Зовёт на занятие', uk: 'Кличе на заняття', en: 'Invites you to a session', es: 'Te invita a una sesión', pt: 'Chama você para uma sessão', vi: 'Rủ bạn học cùng', id: 'Mengajakmu ke sesi', tr: 'Seni oturuma çağırıyor', pl: 'Zaprasza na zajęcia' },
  lessonDoneTitle: { ru: 'Занятие вместе', uk: 'Заняття разом', en: 'Session together', es: 'Sesión juntos', pt: 'Sessão juntos', vi: 'Học cùng nhau', id: 'Sesi bersama', tr: 'Birlikte oturum', pl: 'Wspólne zajęcia' },
  lessonDoneBody: { ru: '+{n} {coins} вам обоим', uk: '+{n} {coins} вам обом', en: '+{n} {coins} for both of you', es: '+{n} {coins} para los dos', pt: '+{n} {coins} para vocês dois', vi: '+{n} xu cho cả hai', id: '+{n} koin untuk kalian berdua', tr: 'İkinize de +{n} jeton', pl: '+{n} {coins} dla was obojga' },
  lessonDoneFeed: { ru: '+{n} за занятие вместе', uk: '+{n} за заняття разом', en: '+{n} for a session together', es: '+{n} por una sesión juntos', pt: '+{n} por uma sessão juntos', vi: '+{n} cho buổi học cùng nhau', id: '+{n} untuk sesi bersama', tr: 'Birlikte oturum için +{n}', pl: '+{n} za wspólne zajęcia' },
} as const satisfies Record<string, Record<FriendsPushLang, string>>;

export type FriendsPushKey = keyof typeof FRIENDS_PUSH_COPY;

const PLURAL_WORDS: Readonly<Record<'days' | 'coins', Partial<Record<FriendsPushLang, readonly string[]>>>> = {
  days: {
    ru: ['день', 'дня', 'дней'], uk: ['день', 'дні', 'днів'], pl: ['dzień', 'dni', 'dni'],
    en: ['day', 'days'], es: ['día', 'días'], pt: ['dia', 'dias'],
  },
  coins: {
    ru: ['монета', 'монеты', 'монет'], uk: ['монета', 'монети', 'монет'], pl: ['moneta', 'monety', 'monet'],
    en: ['coin', 'coins'], es: ['moneda', 'monedas'], pt: ['moeda', 'moedas'],
  },
};

/** Индекс формы: ru/uk — 1 / 2–4 / 5+ (кроме 11–14), pl — 1 / 2–4 (кроме 12–14) / прочие; en/es/pt — 1 / прочие. */
function pluralIndex(lang: FriendsPushLang, n: number): number {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (lang === 'ru' || lang === 'uk') return mod10 === 1 && mod100 !== 11 ? 0 : few ? 1 : 2;
  if (lang === 'pl') return abs === 1 ? 0 : few ? 1 : 2;
  return abs === 1 ? 0 : 1;
}

/** Язык из любой записи (ru, en-US, pt_BR, ua…) → один из 9; неизвестный — null. */
export function normalizeFriendsPushLang(raw: unknown): FriendsPushLang | null {
  if (typeof raw !== 'string') return null;
  const base = raw.trim().toLowerCase().replace('_', '-').split('-')[0];
  const mapped = base === 'ua' ? 'uk' : base;
  return (FRIENDS_PUSH_LANGS as readonly string[]).includes(mapped) ? mapped as FriendsPushLang : null;
}

/** Язык получателя по документу users/{uid} — порядок как в admin_push_jobs.parseAdminPushUser; иначе ru. */
export function friendsPushLangOf(user: Readonly<Record<string, unknown>> | undefined | null): FriendsPushLang {
  const progress = user?.progress && typeof user.progress === 'object' ? user.progress as Record<string, unknown> : {};
  for (const raw of [user?.lang, user?.app_lang, user?.pushTokenLang, progress.lang, progress.app_lang]) {
    const lang = normalizeFriendsPushLang(raw);
    if (lang) return lang;
  }
  return 'ru';
}

/** Текст по ключу на языке получателя; {name}/{n}/{l}/{s} — из vars, {days}/{coins} — склонение по vars.n. */
export function friendsPushText(lang: FriendsPushLang, key: FriendsPushKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const template: string = FRIENDS_PUSH_COPY[key][lang] ?? FRIENDS_PUSH_COPY[key].ru;
  const n = Number(vars.n ?? 0);
  return template.replace(/\{([a-z]+)\}/g, (whole, name: string) => {
    if (name === 'days' || name === 'coins') {
      const words = PLURAL_WORDS[name][lang];
      return words ? words[Math.min(pluralIndex(lang, n), words.length - 1)] : whole;
    }
    return vars[name] === undefined ? whole : String(vars[name]);
  });
}

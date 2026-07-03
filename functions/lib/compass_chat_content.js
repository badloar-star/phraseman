"use strict";
// League chat Compass content: one daily conversation starter for every active
// league group. AI is the preferred source; curated fallback keeps the cron safe.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAGUE_COMPASS_GENERATED_KINDS = exports.COMPASS_CHAT_LANGS = void 0;
exports.getDaySeed = getDaySeed;
exports.getUtcDayKey = getUtcDayKey;
exports.pickCompassPostForDay = pickCompassPostForDay;
exports.hasForbiddenDailyLabel = hasForbiddenDailyLabel;
exports.hasForbiddenProgressSummaryClaim = hasForbiddenProgressSummaryClaim;
exports.normalizeGeneratedCompassPost = normalizeGeneratedCompassPost;
exports.buildLeagueCompassDailyPrompt = buildLeagueCompassDailyPrompt;
exports.COMPASS_CHAT_LANGS = [
    'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
];
exports.LEAGUE_COMPASS_GENERATED_KINDS = [
    'discussion',
    'language_fact',
    'mini_challenge',
    'poll',
];
const MAX_TEXT_CHARS = 420;
const MAX_POLL_LABEL_CHARS = 90;
const FALLBACK_POSTS = [
    {
        kind: 'discussion',
        systemType: 'generic',
        i18n: {
            ru: 'Компас подкинул тему: какое английское слово звучит серьёзно, а значит что-то совсем бытовое? Мой кандидат — “deadline”: звучит как финал фильма, а это просто четверг.',
            uk: 'Компас підкинув тему: яке англійське слово звучить серйозно, а означає щось зовсім буденне? Мій кандидат — “deadline”: звучить як фінал фільму, а це просто четвер.',
            es: 'Compass trae tema: ¿qué palabra inglesa suena muy seria, pero significa algo cotidiano? Mi candidata es “deadline”: suena a final de película, y solo es jueves.',
            'pt-BR': 'Compass trouxe pauta: que palavra em inglês parece séria, mas é bem cotidiana? Meu voto é “deadline”: soa como final de filme, mas é só quinta-feira.',
            vi: 'Compass gợi chuyện: từ tiếng Anh nào nghe rất nghiêm trọng nhưng lại rất đời thường? Tôi chọn “deadline”: nghe như đoạn cuối phim, thật ra chỉ là thứ Năm.',
            id: 'Compass bawa topik: kata Inggris apa yang terdengar serius, padahal sehari-hari banget? Pilihan saya “deadline”: terdengar seperti akhir film, padahal cuma hari Kamis.',
            tr: 'Compass konu attı: Hangi İngilizce kelime çok ciddi duyulup aslında günlük bir şey? Adayım “deadline”: film finali gibi, ama sadece perşembe.',
            pl: 'Compass podrzuca temat: które angielskie słowo brzmi poważnie, a znaczy coś zwyczajnego? Mój typ to “deadline”: brzmi jak finał filmu, a to tylko czwartek.',
        },
    },
    {
        kind: 'language_fact',
        systemType: 'generic',
        i18n: {
            ru: 'Английский любит короткие слова с длинной карьерой. “Get” может быть “получить”, “добраться”, “понять” и ещё вагон. Какое “маленькое” слово вас чаще всего сбивает?',
            uk: 'Англійська любить короткі слова з довгою карʼєрою. “Get” може бути “отримати”, “дістатися”, “зрозуміти” і ще купа всього. Яке “маленьке” слово вас найчастіше збиває?',
            es: 'El inglés adora palabras pequeñas con carreras enormes. “Get” puede ser recibir, llegar, entender y más. ¿Qué palabra “pequeña” os confunde más?',
            'pt-BR': 'O inglês adora palavras pequenas com carreiras enormes. “Get” pode ser receber, chegar, entender e mais um monte. Que palavra “pequena” mais confunde você?',
            vi: 'Tiếng Anh mê những từ ngắn nhưng làm rất nhiều việc. “Get” có thể là nhận, đến nơi, hiểu và còn nữa. Từ “nhỏ” nào làm bạn rối nhất?',
            id: 'Bahasa Inggris suka kata kecil dengan pekerjaan besar. “Get” bisa berarti menerima, sampai, mengerti, dan banyak lagi. Kata “kecil” apa yang paling bikin bingung?',
            tr: 'İngilizce kısa ama çok iş yapan kelimeleri sever. “Get” almak, varmak, anlamak ve daha fazlası olabilir. Hangi “küçük” kelime sizi en çok şaşırtıyor?',
            pl: 'Angielski kocha krótkie słowa z wielką karierą. “Get” może znaczyć dostać, dotrzeć, zrozumieć i więcej. Które “małe” słowo myli was najbardziej?',
        },
    },
    {
        kind: 'mini_challenge',
        systemType: 'generic',
        i18n: {
            ru: 'Мини-вызов от Компаса: опишите своё утро одним английским предложением. Можно криво, можно смешно. “I woke up and negotiated with my alarm” уже засчитываю.',
            uk: 'Міні-виклик від Компаса: опишіть свій ранок одним англійським реченням. Можна криво, можна смішно. “I woke up and negotiated with my alarm” уже зараховую.',
            es: 'Mini-reto de Compass: describid vuestra mañana en una frase en inglés. Puede salir torcido o gracioso. “I woke up and negotiated with my alarm” cuenta.',
            'pt-BR': 'Mini-desafio do Compass: descreva sua manhã em uma frase em inglês. Pode sair torto, pode sair engraçado. “I woke up and negotiated with my alarm” vale.',
            vi: 'Thử thách nhỏ từ Compass: mô tả buổi sáng của bạn bằng một câu tiếng Anh. Sai cũng được, buồn cười cũng được. “I woke up and negotiated with my alarm” tính.',
            id: 'Tantangan kecil dari Compass: jelaskan pagimu dalam satu kalimat bahasa Inggris. Boleh miring, boleh lucu. “I woke up and negotiated with my alarm” dihitung.',
            tr: 'Compass’tan mini görev: Sabahınızı tek bir İngilizce cümleyle anlatın. Yamuk da olur, komik de. “I woke up and negotiated with my alarm” kabul.',
            pl: 'Mini-wyzwanie od Compass: opiszcie swój poranek jednym angielskim zdaniem. Może być krzywo, może być zabawnie. “I woke up and negotiated with my alarm” zaliczam.',
        },
    },
    {
        kind: 'poll',
        systemType: 'generic',
        i18n: {
            ru: 'Быстрый опрос: что чаще всего мешает заговорить по-английски вслух? Жмите честно — я потом притворюсь, что не видел вариант “всё сразу”.',
            uk: 'Швидке опитування: що найчастіше заважає заговорити англійською вголос? Тисніть чесно — я потім зроблю вигляд, що не бачив варіант “усе одразу”.',
            es: 'Encuesta rápida: ¿qué os frena más al hablar inglés en voz alta? Votad con sinceridad; luego fingiré no haber visto “todo a la vez”.',
            'pt-BR': 'Enquete rápida: o que mais trava você na hora de falar inglês em voz alta? Vote com sinceridade; depois finjo que não vi “tudo ao mesmo tempo”.',
            vi: 'Khảo sát nhanh: điều gì cản bạn nói tiếng Anh thành tiếng nhiều nhất? Chọn thật nhé; lát nữa tôi sẽ giả vờ không thấy “tất cả cùng lúc”.',
            id: 'Polling cepat: apa yang paling menghambat saat bicara bahasa Inggris keras-keras? Jawab jujur; nanti saya pura-pura tidak melihat “semuanya sekaligus”.',
            tr: 'Hızlı anket: İngilizceyi sesli konuşurken sizi en çok ne durduruyor? Dürüstçe seçin; sonra “hepsi birden” seçeneğini görmemiş gibi yaparım.',
            pl: 'Szybka ankieta: co najbardziej blokuje was przy mówieniu po angielsku na głos? Głosujcie szczerze; potem udam, że nie widziałem “wszystko naraz”.',
        },
        poll: [
            {
                key: 'pronunciation',
                label: {
                    ru: 'Произношение',
                    uk: 'Вимова',
                    es: 'Pronunciación',
                    'pt-BR': 'Pronúncia',
                    vi: 'Phát âm',
                    id: 'Pengucapan',
                    tr: 'Telaffuz',
                    pl: 'Wymowa',
                },
            },
            {
                key: 'word_order',
                label: {
                    ru: 'Порядок слов',
                    uk: 'Порядок слів',
                    es: 'Orden de palabras',
                    'pt-BR': 'Ordem das palavras',
                    vi: 'Thứ tự từ',
                    id: 'Urutan kata',
                    tr: 'Kelime sırası',
                    pl: 'Szyk słów',
                },
            },
            {
                key: 'shyness',
                label: {
                    ru: 'Стеснение',
                    uk: 'Соромʼязливість',
                    es: 'Vergüenza',
                    'pt-BR': 'Vergonha',
                    vi: 'Ngại nói',
                    id: 'Malu',
                    tr: 'Çekinmek',
                    pl: 'Nieśmiałość',
                },
            },
            {
                key: 'all_at_once',
                label: {
                    ru: 'Всё сразу',
                    uk: 'Усе одразу',
                    es: 'Todo a la vez',
                    'pt-BR': 'Tudo ao mesmo tempo',
                    vi: 'Tất cả cùng lúc',
                    id: 'Semuanya sekaligus',
                    tr: 'Hepsi birden',
                    pl: 'Wszystko naraz',
                },
            },
        ],
    },
    {
        kind: 'mini_challenge',
        systemType: 'generic',
        i18n: {
            ru: 'Сегодня играем в “одна фраза — три настроения”. Напишите “I am fine” как радостно, устало или подозрительно. Английский сразу становится живым, почти с бровями.',
            uk: 'Сьогодні граємо в “одна фраза — три настрої”. Напишіть “I am fine” радісно, втомлено або підозріло. Англійська одразу стає живою, майже з бровами.',
            es: 'Hoy jugamos a “una frase, tres humores”. Escribid “I am fine” alegre, cansado o sospechoso. El inglés se vuelve vivo, casi con cejas.',
            'pt-BR': 'Hoje é “uma frase, três humores”. Escreva “I am fine” feliz, cansado ou desconfiado. O inglês fica vivo, quase com sobrancelhas.',
            vi: 'Hôm nay chơi “một câu, ba tâm trạng”. Viết “I am fine” theo kiểu vui, mệt hoặc nghi ngờ. Tiếng Anh sống động hẳn, gần như có lông mày.',
            id: 'Hari ini main “satu kalimat, tiga suasana”. Tulis “I am fine” dengan nada senang, capek, atau curiga. Bahasa Inggris langsung hidup, hampir punya alis.',
            tr: 'Bugün oyun: “bir cümle, üç ruh hâli”. “I am fine” cümlesini mutlu, yorgun ya da şüpheli yazın. İngilizce hemen canlanır, neredeyse kaş çıkarır.',
            pl: 'Dziś gramy w “jedno zdanie, trzy nastroje”. Napiszcie “I am fine” radośnie, zmęczenie albo podejrzliwie. Angielski od razu żyje, prawie ma brwi.',
        },
    },
    {
        kind: 'poll',
        systemType: 'generic',
        i18n: {
            ru: 'Выбираем тему для мини-разговора: что сегодня проще обсудить по-английски? Победивший вариант заберу в следующий заход Компаса.',
            uk: 'Обираємо тему для міні-розмови: що сьогодні простіше обговорити англійською? Переможний варіант заберу в наступний захід Компаса.',
            es: 'Elegimos tema para una mini-charla: ¿qué es más fácil comentar hoy en inglés? Me llevo la opción ganadora para la próxima ronda de Compass.',
            'pt-BR': 'Vamos escolher tema para uma mini-conversa: o que é mais fácil discutir hoje em inglês? Levo a opção vencedora para a próxima rodada do Compass.',
            vi: 'Chọn chủ đề cho cuộc trò chuyện nhỏ: hôm nay nói tiếng Anh về gì dễ nhất? Tôi sẽ lấy lựa chọn thắng cho lượt Compass tiếp theo.',
            id: 'Pilih tema obrolan mini: hari ini paling mudah membahas apa dalam bahasa Inggris? Pilihan menang saya bawa ke giliran Compass berikutnya.',
            tr: 'Mini sohbet için konu seçiyoruz: Bugün İngilizce konuşması en kolay şey ne? Kazanan seçeneği bir sonraki Compass turuna taşırım.',
            pl: 'Wybieramy temat mini-rozmowy: o czym dziś najłatwiej pogadać po angielsku? Zwycięską opcję zabiorę do następnej rundy Compass.',
        },
        poll: [
            {
                key: 'food',
                label: {
                    ru: 'Еда',
                    uk: 'Їжа',
                    es: 'Comida',
                    'pt-BR': 'Comida',
                    vi: 'Đồ ăn',
                    id: 'Makanan',
                    tr: 'Yemek',
                    pl: 'Jedzenie',
                },
            },
            {
                key: 'travel',
                label: {
                    ru: 'Путешествия',
                    uk: 'Подорожі',
                    es: 'Viajes',
                    'pt-BR': 'Viagens',
                    vi: 'Du lịch',
                    id: 'Perjalanan',
                    tr: 'Seyahat',
                    pl: 'Podróże',
                },
            },
            {
                key: 'work',
                label: {
                    ru: 'Работа',
                    uk: 'Робота',
                    es: 'Trabajo',
                    'pt-BR': 'Trabalho',
                    vi: 'Công việc',
                    id: 'Kerja',
                    tr: 'İş',
                    pl: 'Praca',
                },
            },
            {
                key: 'series',
                label: {
                    ru: 'Сериалы',
                    uk: 'Серіали',
                    es: 'Series',
                    'pt-BR': 'Séries',
                    vi: 'Phim bộ',
                    id: 'Serial',
                    tr: 'Diziler',
                    pl: 'Seriale',
                },
            },
        ],
    },
    {
        kind: 'discussion',
        systemType: 'generic',
        i18n: {
            ru: 'Вопрос от Компаса: какую английскую фразу вы бы хотели говорить автоматически, без внутреннего совещания на десять человек? Пишите фразу — соберём народный список.',
            uk: 'Питання від Компаса: яку англійську фразу ви хотіли б говорити автоматично, без внутрішньої наради на десять людей? Пишіть фразу — зберемо народний список.',
            es: 'Pregunta de Compass: ¿qué frase inglesa queréis decir en automático, sin reunión interna de diez personas? Escribidla; hacemos lista popular.',
            'pt-BR': 'Pergunta do Compass: que frase em inglês você queria dizer no automático, sem reunião interna com dez pessoas? Escreva a frase; montamos a lista da turma.',
            vi: 'Câu hỏi từ Compass: bạn muốn câu tiếng Anh nào bật ra tự động, không cần họp nội bộ mười người? Viết câu đó nhé; ta gom thành danh sách chung.',
            id: 'Pertanyaan dari Compass: frasa Inggris apa yang ingin kamu ucapkan otomatis, tanpa rapat batin sepuluh orang? Tulis frasanya; kita bikin daftar bersama.',
            tr: 'Compass sorusu: Hangi İngilizce cümleyi otomatik söylemek isterdiniz, içeride on kişilik toplantı yapmadan? Cümleyi yazın; ortak liste çıkaralım.',
            pl: 'Pytanie od Compass: którą angielską frazę chcecie mówić automatycznie, bez wewnętrznej narady dziesięciu osób? Napiszcie ją; zrobimy listę grupy.',
        },
    },
];
const FORBIDDEN_DAILY_LABELS = [
    'слово дня',
    'фраза дня',
    'вислів дня',
    'головна фраза дня',
    'word of the day',
    'phrase of the day',
    'palabra del día',
    'frase del día',
    'palavra do dia',
    'frase do dia',
    'günün kelimesi',
    'günün ifadesi',
    'słowo dnia',
    'fraza dnia',
];
const FORBIDDEN_PROGRESS_SUMMARY_CLAIMS = [
    'заглянул в ваши успехи',
    'заглянула в ваши успехи',
    'ваши успехи за сегодня',
    'продвинулись',
    'дневную цель',
    'день ещё не кончился',
    'день еще не кончился',
    'я подожду',
    'закрыли цель',
    'закрыли дневную цель',
    'ваші успіхи за сьогодні',
    'денну ціль',
    'день ще не закінчився',
    'your progress today',
    'daily goal',
    'today’s progress',
    "today's progress",
    'meta diaria',
    'progreso de hoy',
    'meta diária',
    'progresso de hoje',
];
const LINK_RE = /\b(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|discord\.gg\/|discord\.com\/invite\/)\S*/i;
function at(items, seed) {
    const idx = ((seed % items.length) + items.length) % items.length;
    return items[idx];
}
function fallbackIndexForSeed(seed) {
    const weekDrift = Math.floor(seed / 7) * 3;
    const monthDrift = Math.floor(seed / 29);
    return seed + weekDrift + monthDrift;
}
function getDaySeed(now = new Date()) {
    return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}
function getUtcDayKey(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        .toISOString()
        .slice(0, 10);
}
function pickCompassPostForDay(seed) {
    return at(FALLBACK_POSTS, fallbackIndexForSeed(seed));
}
function hasForbiddenDailyLabel(text) {
    const lower = String(text || '').toLocaleLowerCase();
    return FORBIDDEN_DAILY_LABELS.some((needle) => lower.includes(needle));
}
function hasForbiddenProgressSummaryClaim(text) {
    const lower = String(text || '').toLocaleLowerCase();
    return FORBIDDEN_PROGRESS_SUMMARY_CLAIMS.some((needle) => lower.includes(needle));
}
function cleanText(value, maxChars) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < 12 || text.length > maxChars)
        return '';
    if (LINK_RE.test(text))
        return '';
    if (hasForbiddenDailyLabel(text))
        return '';
    if (hasForbiddenProgressSummaryClaim(text))
        return '';
    return text;
}
function normalizeI18n(value, maxChars) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const src = value;
    const out = {};
    for (const lang of exports.COMPASS_CHAT_LANGS) {
        const text = cleanText(src[lang], maxChars);
        if (!text)
            return null;
        out[lang] = text;
    }
    return out;
}
function cleanKind(value) {
    const kind = String(value ?? '').trim();
    return exports.LEAGUE_COMPASS_GENERATED_KINDS.includes(kind)
        ? kind
        : null;
}
function extractJsonObject(raw) {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}'))
        return trimmed;
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start)
        return trimmed.slice(start, end + 1);
    return trimmed;
}
function parseMaybeJson(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw))
        return raw;
    if (typeof raw !== 'string')
        return null;
    try {
        const parsed = JSON.parse(extractJsonObject(raw));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
function normalizePollOptions(rawOptions) {
    if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 4)
        return null;
    const out = [];
    const seen = new Set();
    for (let i = 0; i < rawOptions.length; i += 1) {
        const raw = rawOptions[i];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            return null;
        const row = raw;
        const fallbackKey = String.fromCharCode(97 + i);
        const key = String(row.key ?? fallbackKey)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 24) || fallbackKey;
        if (seen.has(key))
            return null;
        seen.add(key);
        const label = normalizeI18n(row.label, MAX_POLL_LABEL_CHARS);
        if (!label)
            return null;
        out.push({ key, label, ...(row.correct === true ? { correct: true } : {}) });
    }
    return out;
}
function normalizeGeneratedCompassPost(raw) {
    const parsed = parseMaybeJson(raw);
    if (!parsed)
        return null;
    const kind = cleanKind(parsed.kind);
    if (!kind)
        return null;
    const i18n = normalizeI18n(parsed.i18n, MAX_TEXT_CHARS);
    if (!i18n)
        return null;
    const post = { kind, systemType: 'generic', i18n };
    if (kind === 'poll') {
        const poll = normalizePollOptions(parsed.poll ?? parsed.options);
        if (!poll)
            return null;
        post.poll = poll;
    }
    return post;
}
function buildLeagueCompassDailyPrompt(input) {
    const formatHint = at([
        'open discussion with a funny English example',
        'mini challenge where learners write one English sentence',
        'light poll with 2-4 short options',
        'surprising but safe English-language fact plus a question',
        'tiny speaking prompt that makes beginners comfortable',
        'false friends / confusing short words / everyday phrasing',
        'pronunciation or listening pain point, framed playfully',
    ], input.seed);
    return [
        'You are "Compass", the lively host of a small league chat inside the Phraseman language app.',
        'Your job today: write ONE fresh system post that starts a friendly discussion about English.',
        '',
        'PRODUCT CONTEXT',
        '- The chat is a weekly league room: learners are trying to speak, compare progress, and feel less alone.',
        '- Learners may be beginners, busy adults, or shy speakers. Some are 50+. Be warm and concrete.',
        '- This is not a classroom lecture. You are the person who nudges the room into talking.',
        '- The app already has a separate "Daily Phrase" card. Do not compete with it.',
        '',
        'TODAY',
        `- UTC date key: ${input.dayKey}.`,
        `- Variety hint for this date: ${formatHint}.`,
        '',
        'VOICE',
        '- Warm, alive, lightly funny. One small joke is welcome; never clownish.',
        '- Speak as Compass in first person only when it feels natural.',
        '- Invite replies. End with a question, challenge, or poll that is easy to answer.',
        '- Make beginners safe: "crooked English is allowed" energy, but do not say it every time.',
        '- No shame, no guilt, no fake urgency, no productivity pressure.',
        '- Avoid corporate motivational slogans and generic "keep going" filler.',
        '- Do not over-explain grammar. One practical example is enough.',
        '',
        'CONTENT IDEAS',
        '- Odd English phrases people actually use.',
        '- False friends, short confusing words, pronunciation traps, tiny speaking wins.',
        '- "Write one sentence" mini games.',
        '- Polls about what blocks speaking, what topic to practice, or which phrase feels more natural.',
        '- Funny but useful comparisons: literal translation vs natural English.',
        '- Everyday scenarios: work chat, cafe, travel, messages, awkward small talk.',
        '',
        'STRICT DO-NOT-SAY LIST',
        '- Do not use the labels "word of the day", "phrase of the day", "Слово дня", "Фраза дня", or local equivalents.',
        '- Do not mention app internals, cron, AI, OpenAI, prompts, scores, XP, subscriptions, premium, or admin tools.',
        '- Do not invent facts that need citation. If unsure, use a practical language observation instead.',
        '- NEVER write progress summaries, daily-goal summaries, leaderboard updates, or named learner achievements. You have no member progress data.',
        '- NEVER say you looked at learners’ progress, saw who moved forward, or will wait for unfinished learners.',
        '- NEVER include learner names unless the user prompt explicitly gives real names. This prompt gives none.',
        '- No external links, handles, emails, phone numbers, politics, insults, sexual content, or medical/legal/financial advice.',
        '',
        'LOCALIZATION',
        '- Return all 8 interface languages: ru, uk, es, pt-BR, vi, id, tr, pl.',
        '- The framing text must be in each interface language.',
        '- English examples stay in English in every locale.',
        '- Keep the meaning aligned across locales, but natural for each language.',
        '- Each main text should be 1-3 short sentences, maximum 420 characters.',
        '',
        'POST TYPES',
        '- kind "discussion": a question or topic that invites text replies.',
        '- kind "language_fact": a safe, practical observation about English plus a question.',
        '- kind "mini_challenge": asks learners to write a tiny English answer.',
        '- kind "poll": includes 2-4 options. Poll options should be short.',
        '- Choose exactly one kind value from: "discussion", "language_fact", "mini_challenge", "poll".',
        '',
        'OUTPUT JSON ONLY. No markdown, no code fence, no comments.',
        'Use this exact shape:',
        '{',
        '  "kind": "discussion",',
        '  "i18n": {',
        '    "ru": "...",',
        '    "uk": "...",',
        '    "es": "...",',
        '    "pt-BR": "...",',
        '    "vi": "...",',
        '    "id": "...",',
        '    "tr": "...",',
        '    "pl": "..."',
        '  },',
        '  "poll": [',
        '    { "key": "a", "label": { "ru": "...", "uk": "...", "es": "...", "pt-BR": "...", "vi": "...", "id": "...", "tr": "...", "pl": "..." } },',
        '    { "key": "b", "label": { "ru": "...", "uk": "...", "es": "...", "pt-BR": "...", "vi": "...", "id": "...", "tr": "...", "pl": "..." } }',
        '  ]',
        '}',
        '',
        'If kind is not "poll", omit "poll".',
    ].join('\n');
}
//# sourceMappingURL=compass_chat_content.js.map
// chapter_exam_v2_l02_c3.ts — банк экзамена v2: урок 2, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 3 урока 2 учит коротко отвечать на вопрос — Yes, I am /
// No, she is not (17–24) — и описывать самочувствие и вещи новыми словами. Короткие ответы проверяются в диалогах (собеседник
// спрашивает) и в «исправь ошибку»; ситуации — описание состояния. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C3: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l02c3_yes', label: { ru: 'коротко «да»: Yes, I am', uk: 'коротко «так»: Yes, I am' }, episodeOrdinals: [17, 18, 20] },
    { id: 'l02c3_no', label: { ru: 'коротко «нет»: No, it is not', uk: 'коротко «ні»: No, it is not' }, episodeOrdinals: [17, 19, 21] },
    { id: 'l02c3_state', label: { ru: 'как ты и как вещь: am / is', uk: 'як ти і як річ: am / is' }, episodeOrdinals: [18, 20, 21] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c3-01', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'У подруги дома кошка, и ты весь вечер чихаешь. Скажи, что у тебя аллергия.', uk: 'У подруги вдома кішка, і ти весь вечір чхаєш. Скажи, що в тебе алергія.' }, accepted: ['I am allergic.', "I'm allergic."] },
    { id: 'l02c3-02', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'Контролёр сомневается в твоём проездном. Скажи, что он действительный.', uk: 'Контролер сумнівається у твоєму проїзному. Скажи, що він дійсний.' }, accepted: ['It is valid.', "It's valid."] },
    { id: 'l02c3-03', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'Сын тайком съел все конфеты и невинно улыбается. Скажи, что он хитрец.', uk: 'Син нишком з’їв усі цукерки й невинно усміхається. Скажи, що він хитрун.' }, accepted: ['He is sneaky.', "He's sneaky."] },
    { id: 'l02c3-04', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'Чайник не греется — вилка лежит рядом с розеткой. Скажи, что он не включён в сеть.', uk: 'Чайник не гріється — вилка лежить біля розетки. Скажи, що він не ввімкнений у мережу.' }, accepted: ['It is unplugged.', "It's unplugged."] },
    { id: 'l02c3-05', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'После уборки стол блестит. Скажи, что он идеально чистый.', uk: 'Після прибирання стіл блищить. Скажи, що він ідеально чистий.' }, accepted: ['It is spotless.', "It's spotless."] },
    { id: 'l02c3-06', type: 'situation', grammarPoint: 'l02c3_state', situation: { ru: 'Гостья пролила кофе на скатерть и расстроилась. Успокой: её можно стирать.', uk: 'Гостя пролила каву на скатертину й засмутилася. Заспокой: її можна прати.' }, accepted: ['It is washable.', "It's washable."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c3-07', type: 'dialogue', grammarPoint: 'l02c3_yes', partnerLine: 'Is he upstairs?', situation: { ru: 'Сын у себя в комнате наверху. Ответь коротко.', uk: 'Син у себе в кімнаті нагорі. Відповідай коротко.' }, accepted: ['Yes, he is.'] },
    { id: 'l02c3-08', type: 'dialogue', grammarPoint: 'l02c3_no', partnerLine: 'Is it broken?', situation: { ru: 'Телефон не сломан, он просто разряжен. Ответь коротко.', uk: 'Телефон не зламаний, він просто розряджений. Відповідай коротко.' }, accepted: ['No, it is not.', "No, it's not."] },
    { id: 'l02c3-09', type: 'dialogue', grammarPoint: 'l02c3_yes', partnerLine: 'Are you well?', situation: { ru: 'Ты отлично себя чувствуешь. Ответь коротко.', uk: 'Ти чудово почуваєшся. Відповідай коротко.' }, accepted: ['Yes, I am.'] },
    { id: 'l02c3-10', type: 'dialogue', grammarPoint: 'l02c3_no', partnerLine: 'Are they together?', situation: { ru: 'Эта пара давно рассталась. Ответь коротко.', uk: 'Ця пара давно розійшлася. Відповідай коротко.' }, accepted: ['No, they are not.', "No, they're not."] },
    { id: 'l02c3-11', type: 'dialogue', grammarPoint: 'l02c3_yes', partnerLine: 'Is it valid?', situation: { ru: 'Паспорт действует ещё пять лет. Ответь коротко.', uk: 'Паспорт дійсний ще п’ять років. Відповідай коротко.' }, accepted: ['Yes, it is.'] },
    { id: 'l02c3-12', type: 'dialogue', grammarPoint: 'l02c3_no', partnerLine: 'Is she guilty?', situation: { ru: 'Подруга тут ни при чём. Ответь коротко.', uk: 'Подруга тут ні до чого. Відповідай коротко.' }, accepted: ['No, she is not.', "No, she's not."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c3-13', type: 'fix', grammarPoint: 'l02c3_yes', wrong: 'Yes, I is.', accepted: ['Yes, I am.'] },
    { id: 'l02c3-14', type: 'fix', grammarPoint: 'l02c3_no', wrong: 'No, he not is.', accepted: ['No, he is not.', "No, he's not."] },
    { id: 'l02c3-15', type: 'fix', grammarPoint: 'l02c3_yes', wrong: 'Yes, they is.', accepted: ['Yes, they are.'] },
    { id: 'l02c3-16', type: 'fix', grammarPoint: 'l02c3_no', wrong: 'No, we is not.', accepted: ['No, we are not.', "No, we're not."] },
  ],
};

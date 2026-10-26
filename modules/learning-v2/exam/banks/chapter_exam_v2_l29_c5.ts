// chapter_exam_v2_l29_c5.ts — банк экзамена v2: урок 29, глава 5 (эпизоды 33–40). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 5 — уточнение без «that / who» («The photo I found», «The ring Grandma gave me»), «whose» (чей) и вежливые вопросы и благодарности («Could I borrow your guitar?», «Thank you for lending me …»). Только слова и формы эпизодов 1–40 урока 29; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L29_C5: ChapterExamV2Bank = {
  lessonOrdinal: 29,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l29c5_contact', label: { ru: 'без that / who: The photo I found / The film we watched', uk: 'без that / who: The photo I found / The film we watched' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
    { id: 'l29c5_whose', label: { ru: 'чей: This is the friend whose recipe we used', uk: 'чий: This is the friend whose recipe we used' }, episodeOrdinals: [35, 36, 37, 38, 39, 40] },
    { id: 'l29c5_requests', label: { ru: 'вопросы и благодарность: Could I borrow …? / Thank you for …', uk: 'запитання й подяка: Could I borrow …? / Thank you for …' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l29c5-01', type: 'situation', grammarPoint: 'l29c5_contact', situation: { ru: 'Ты нашёл снимок, он в этом альбоме. Скажи, что фото, которое ты нашёл, лежит в этом альбоме.', uk: 'Ти знайшов знімок, він у цьому альбомі. Скажи, що фото, яке ти знайшов, лежить у цьому альбомі.' }, accepted: ['The photo I found is in this album.'] },
    { id: 'l29c5-02', type: 'situation', grammarPoint: 'l29c5_contact', situation: { ru: 'Бабушка подарила тебе кольцо. Скажи, что кольцо, которое подарила бабушка, золотое.', uk: 'Бабуся подарувала тобі каблучку. Скажи, що каблучка, яку подарувала бабуся, золота.' }, accepted: ['The ring Grandma gave me is gold.'] },
    { id: 'l29c5-03', type: 'situation', grammarPoint: 'l29c5_whose', situation: { ru: 'Вы готовили по чужому рецепту. Скажи, что это друг, чей рецепт вы использовали.', uk: 'Ви готували за чужим рецептом. Скажи, що це друг, чий рецепт ви використали.' }, accepted: ['This is the friend whose recipe we used.'] },
    { id: 'l29c5-04', type: 'situation', grammarPoint: 'l29c5_whose', situation: { ru: 'Вы нашли мяч. Скажи, что это ребёнок, чей мяч вы нашли.', uk: 'Ви знайшли м’яч. Скажи, що це дитина, чий м’яч ви знайшли.' }, accepted: ['This is the child whose ball we found.'] },
    { id: 'l29c5-05', type: 'situation', grammarPoint: 'l29c5_requests', situation: { ru: 'Ты хочешь поиграть на гитаре друга. Вежливо спроси, можно ли её одолжить.', uk: 'Ти хочеш пограти на гітарі друга. Ввічливо запитай, чи можна її позичити.' }, accepted: ['Could I borrow your guitar?'] },
    { id: 'l29c5-06', type: 'situation', grammarPoint: 'l29c5_requests', situation: { ru: 'Музыка зовёт. Предложи спеть дуэтом.', uk: 'Музика кличе. Запропонуй заспівати дуетом.' }, accepted: ['Shall we sing a duet?'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l29c5-07', type: 'dialogue', grammarPoint: 'l29c5_contact', partnerLine: 'I cherish these memories.', situation: { ru: 'Друг дорожит воспоминаниями. Скажи, что женщина, которую ты встретил вчера, твоя тётя.', uk: 'Друг дорожить спогадами. Скажи, що жінка, яку ти зустрів учора, твоя тітка.' }, accepted: ['The woman I met yesterday is my aunt.'] },
    { id: 'l29c5-08', type: 'dialogue', grammarPoint: 'l29c5_contact', partnerLine: 'I liked the ending.', situation: { ru: 'Друг говорит, что ему понравилась концовка. Скажи, что фильм, который вы смотрели, был смешным.', uk: 'Друг каже, що йому сподобався фінал. Скажи, що фільм, який ви дивилися, був смішним.' }, accepted: ['The film we watched was funny.'] },
    { id: 'l29c5-09', type: 'dialogue', grammarPoint: 'l29c5_whose', partnerLine: 'The book I borrowed was exciting.', situation: { ru: 'Друг говорит, что одолженная книга увлекательная. Скажи, что это автор, чья книга тебе понравилась.', uk: 'Друг каже, що позичена книжка захоплива. Скажи, що це автор, чия книжка тобі сподобалася.' }, accepted: ['This is the author whose book I enjoyed.'] },
    { id: 'l29c5-10', type: 'dialogue', grammarPoint: 'l29c5_whose', partnerLine: 'The memoir I borrowed was moving.', situation: { ru: 'Друг говорит, что мемуары трогают. Скажи, что это женщина, чью историю ты читал.', uk: 'Друг каже, що мемуари зворушують. Скажи, що це жінка, чию історію ти читав.' }, accepted: ['This is the woman whose story I read.'] },
    { id: 'l29c5-11', type: 'dialogue', grammarPoint: 'l29c5_requests', partnerLine: 'Everyone joined in the chorus.', situation: { ru: 'Друг говорит, что все подпевали. Поблагодари за то, что одолжили гитару.', uk: 'Друг каже, що всі підспівували. Подякуй за те, що позичили гітару.' }, accepted: ['Thank you for lending me your guitar.'] },
    { id: 'l29c5-12', type: 'dialogue', grammarPoint: 'l29c5_requests', partnerLine: 'Please do not smirk.', situation: { ru: 'Друг просит не ухмыляться. Вежливо спроси, можно ли пересмотреть сцену.', uk: 'Друг просить не посміхатися глузливо. Ввічливо запитай, чи можна передивитися сцену.' }, accepted: ['Could we watch that scene again?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l29c5-13', type: 'fix', grammarPoint: 'l29c5_contact', wrong: 'The guitar I borrowed it was old.', accepted: ['The guitar I borrowed was old.'] },
    { id: 'l29c5-14', type: 'fix', grammarPoint: 'l29c5_whose', wrong: 'This is the friend who recipe we used.', accepted: ['This is the friend whose recipe we used.'] },
    { id: 'l29c5-15', type: 'fix', grammarPoint: 'l29c5_requests', wrong: 'Could I to borrow your guitar?', accepted: ['Could I borrow your guitar?'] },
    { id: 'l29c5-16', type: 'fix', grammarPoint: 'l29c5_requests', wrong: 'Shall we to sing a duet?', accepted: ['Shall we sing a duet?'] },
  ],
};

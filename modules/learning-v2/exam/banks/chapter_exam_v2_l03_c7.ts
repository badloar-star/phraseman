// chapter_exam_v2_l03_c7.ts — банк экзамена v2: урок 3, глава 7 (эпизоды 49–56, последняя глава урока).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 7 урока 3 ставит признак перед предметом — цвет
// (a red cup, an olive coat), форму, материал и узор (This round table, Those leather gloves) — и спрашивает о признаке
// (The shape is round, What is the material?) (49–56). Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L03_C7: ChapterExamV2Bank = {
  lessonOrdinal: 3,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l03c7_colour', label: { ru: 'цвет перед предметом: a red cup, an olive coat', uk: 'колір перед предметом: a red cup, an olive coat' }, episodeOrdinals: [49, 50, 51] },
    { id: 'l03c7_this_feature', label: { ru: 'This round table, Those leather gloves', uk: 'This round table, Those leather gloves' }, episodeOrdinals: [52, 53, 54] },
    { id: 'l03c7_the_feature', label: { ru: 'The shape is …, What is the material?', uk: 'The shape is …, What is the material?' }, episodeOrdinals: [55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l03c7-01', type: 'situation', grammarPoint: 'l03c7_colour', situation: { ru: 'Ты показываешь продавцу фото дивана, который ищешь. Скажи, что это синий диван.', uk: 'Ти показуєш продавцеві фото дивана, який шукаєш. Скажи, що це синій диван.' }, accepted: ['It is a blue sofa.', "It's a blue sofa.", 'This is a blue sofa.'] },
    { id: 'l03c7-02', type: 'situation', grammarPoint: 'l03c7_colour', situation: { ru: 'Подруга спрашивает, какое пальто ты купила. Скажи, что это оливковое пальто.', uk: 'Подруга питає, яке пальто ти купила. Скажи, що це оливкове пальто.' }, accepted: ['It is an olive coat.', "It's an olive coat.", 'This is an olive coat.'] },
    { id: 'l03c7-03', type: 'situation', grammarPoint: 'l03c7_the_feature', situation: { ru: 'Ты выбираешь ткань для штор и щупаешь образец. Спроси, какой это материал.', uk: 'Ти обираєш тканину для штор і мацаєш зразок. Запитай, який це матеріал.' }, accepted: ['What is the material?'] },
    { id: 'l03c7-04', type: 'situation', grammarPoint: 'l03c7_this_feature', situation: { ru: 'Ты стоишь у круглого стола в мебельном. Скажи, что этот круглый стол новый.', uk: 'Ти стоїш біля круглого столу в меблевому. Скажи, що цей круглий стіл новий.' }, accepted: ['This round table is new.'] },
    { id: 'l03c7-05', type: 'situation', grammarPoint: 'l03c7_this_feature', situation: { ru: 'На дальней полке лежат кожаные перчатки. Шепни мужу, что те кожаные перчатки дорогие.', uk: 'На дальній полиці лежать шкіряні рукавички. Шепни чоловікові, що ті шкіряні рукавички дорогі.' }, accepted: ['Those leather gloves are expensive.'] },
    { id: 'l03c7-06', type: 'situation', grammarPoint: 'l03c7_the_feature', situation: { ru: 'Портниха спрашивает про платье. Скажи, что узор в полоску.', uk: 'Кравчиня питає про сукню. Скажи, що візерунок у смужку.' }, accepted: ['The pattern is striped.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c7-07', type: 'dialogue', grammarPoint: 'l03c7_colour', partnerLine: 'Is it a brown cup?', situation: { ru: 'Чашка у тебя в руке красная. Скажи, что это красная чашка.', uk: 'Чашка в тебе в руці червона. Скажи, що це червона чашка.' }, accepted: ['It is a red cup.', "It's a red cup.", 'This is a red cup.'] },
    { id: 'l03c7-08', type: 'dialogue', grammarPoint: 'l03c7_this_feature', partnerLine: 'Is that high shelf new?', situation: { ru: 'Высокая полка вдали досталась от бабушки. Скажи, что та высокая полка старая.', uk: 'Висока полиця вдалині дісталася від бабусі. Скажи, що та висока полиця стара.' }, accepted: ['That high shelf is old.'] },
    { id: 'l03c7-09', type: 'dialogue', grammarPoint: 'l03c7_the_feature', partnerLine: 'What is the style?', situation: { ru: 'Платье без украшений. Скажи, что стиль простой.', uk: 'Сукня без прикрас. Скажи, що стиль простий.' }, accepted: ['The style is plain.', 'The style is simple.'] },
    { id: 'l03c7-10', type: 'dialogue', grammarPoint: 'l03c7_colour', partnerLine: 'These are white bowls.', situation: { ru: 'Возрази: миски у тебя в руках серые.', uk: 'Заперечи: миски в тебе в руках сірі.' }, accepted: ['These are grey bowls.'] },
    { id: 'l03c7-11', type: 'dialogue', grammarPoint: 'l03c7_this_feature', partnerLine: 'Are these metal boxes light?', situation: { ru: 'Ты еле поднимаешь эти металлические коробки. Скажи, что они тяжёлые.', uk: 'Ти ледве піднімаєш ці металеві коробки. Скажи, що вони важкі.' }, accepted: ['These metal boxes are heavy.', 'They are heavy.', "They're heavy."] },
    { id: 'l03c7-12', type: 'dialogue', grammarPoint: 'l03c7_the_feature', partnerLine: 'Is the shape oval?', situation: { ru: 'Зеркало ровное, как тарелка. Скажи, что форма круглая.', uk: 'Дзеркало рівне, як тарілка. Скажи, що форма кругла.' }, accepted: ['The shape is round.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l03c7-13', type: 'fix', grammarPoint: 'l03c7_colour', wrong: 'It is a olive scarf.', accepted: ['It is an olive scarf.', "It's an olive scarf."] },
    { id: 'l03c7-14', type: 'fix', grammarPoint: 'l03c7_colour', wrong: 'This is a vase yellow.', accepted: ['This is a yellow vase.'] },
    { id: 'l03c7-15', type: 'fix', grammarPoint: 'l03c7_this_feature', wrong: 'That the striped shirt is new.', accepted: ['That striped shirt is new.', 'The striped shirt is new.'] },
    { id: 'l03c7-16', type: 'fix', grammarPoint: 'l03c7_the_feature', wrong: 'What the material is?', accepted: ['What is the material?'] },
  ],
};

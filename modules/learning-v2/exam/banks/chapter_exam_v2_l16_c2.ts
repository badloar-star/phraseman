// chapter_exam_v2_l16_c2.ts — банк экзамена v2: урок 16, глава 2 (эпизоды 9–16). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 2 — «I will / I'll + глагол»: решение прямо сейчас — инструменты, одежда, уборка. Только слова и формы эпизодов 1–16 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C2: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l16c2_tools', label: { ru: "инструменты: I'll get / use / bring …", uk: "інструменти: I'll get / use / bring …" }, episodeOrdinals: [9, 10] },
    { id: 'l16c2_clothes', label: { ru: "одежда: I'll unzip / tuck in / roll up …", uk: "одяг: I'll unzip / tuck in / roll up …" }, episodeOrdinals: [11, 12] },
    { id: 'l16c2_cleaning', label: { ru: "уборка: I'll mop up / wipe down / fill up …", uk: "прибирання: I'll mop up / wipe down / fill up …" }, episodeOrdinals: [13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c2-01', type: 'situation', grammarPoint: 'l16c2_tools', situation: { ru: 'Раковина засорилась. Скажи, что принесёшь вантуз.', uk: 'Раковина засмітилась. Скажи, що принесеш вантуз.' }, accepted: ["I'll get the plunger.", "I'll bring the plunger."] },
    { id: 'l16c2-02', type: 'situation', grammarPoint: 'l16c2_tools', situation: { ru: 'Бутылка не открывается. Скажи, что возьмёшь открывалку.', uk: 'Пляшка не відкривається. Скажи, що візьмеш відкривачку.' }, accepted: ["I'll get the bottle opener.", "I'll use the bottle opener.", "I'll bring the bottle opener."] },
    { id: 'l16c2-03', type: 'situation', grammarPoint: 'l16c2_clothes', situation: { ru: 'Ты идёшь на встречу, а рубашка торчит наружу. Скажи, что заправишь рубашку.', uk: 'Ти йдеш на зустріч, а сорочка стирчить назовні. Скажи, що заправиш сорочку.' }, accepted: ["I'll tuck in my shirt."] },
    { id: 'l16c2-04', type: 'situation', grammarPoint: 'l16c2_clothes', situation: { ru: 'В комнате жарко, а на тебе куртка. Скажи, что расстегнёшь куртку.', uk: 'У кімнаті жарко, а на тобі куртка. Скажи, що розстебнеш куртку.' }, accepted: ["I'll unzip my jacket.", "I'll unzip my coat."] },
    { id: 'l16c2-05', type: 'situation', grammarPoint: 'l16c2_cleaning', situation: { ru: 'На полу разлилась вода. Скажи, что вытрешь воду.', uk: 'На підлозі розлилась вода. Скажи, що витреш воду.' }, accepted: ["I'll mop up the water.", "I'll soak up the water."] },
    { id: 'l16c2-06', type: 'situation', grammarPoint: 'l16c2_cleaning', situation: { ru: 'На столе остались крошки. Скажи, что подметёшь крошки.', uk: 'На столі залишились крихти. Скажи, що змітеш крихти.' }, accepted: ["I'll sweep up the crumbs."] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c2-07', type: 'dialogue', grammarPoint: 'l16c2_tools', partnerLine: 'I think the oven will overheat.', situation: { ru: 'Друг думает, что духовка перегреется. Скажи, что проверишь духовку.', uk: 'Друг думає, що духовка перегріється. Скажи, що перевіриш духовку.' }, accepted: ["I'll check the oven."] },
    { id: 'l16c2-08', type: 'dialogue', grammarPoint: 'l16c2_tools', partnerLine: 'I think the pizza will be chewy.', situation: { ru: 'Друг думает, что пицца будет жёсткой. Скажи, что попробуешь резак для пиццы.', uk: 'Друг думає, що піца буде жорсткою. Скажи, що спробуєш різак для піци.' }, accepted: ["I'll try the pizza cutter.", "I'll use the pizza cutter.", "I'll get the pizza cutter."] },
    { id: 'l16c2-09', type: 'dialogue', grammarPoint: 'l16c2_clothes', partnerLine: 'I think it will be muggy tonight.', situation: { ru: 'Друг говорит, что ночью будет душно. Скажи, что закатаешь рукава.', uk: 'Друг каже, що вночі буде душно. Скажи, що закотиш рукави.' }, accepted: ["I'll roll up my sleeves."] },
    { id: 'l16c2-10', type: 'dialogue', grammarPoint: 'l16c2_clothes', partnerLine: 'I think the beach will be breezy on Sunday.', situation: { ru: 'Друг думает, что в воскресенье на пляже будет ветрено. Скажи, что застегнёшь пальто.', uk: 'Друг думає, що в неділю на пляжі буде вітряно. Скажи, що застебнеш пальто.' }, accepted: ["I'll zip up my coat.", "I'll zip up my jacket."] },
    { id: 'l16c2-11', type: 'dialogue', grammarPoint: 'l16c2_cleaning', partnerLine: 'I think she will overfill the cup.', situation: { ru: 'Друг думает, что она перельёт воду в чашку. Скажи, что вытрешь стол.', uk: 'Друг думає, що вона переллє воду в чашку. Скажи, що витреш стіл.' }, accepted: ["I'll wipe down the table."] },
    { id: 'l16c2-12', type: 'dialogue', grammarPoint: 'l16c2_cleaning', partnerLine: 'I think I will misplace my keys again.', situation: { ru: 'Друг боится, что снова потеряет ключи. Скажи, что вытряхнешь свою сумку.', uk: 'Друг боїться, що знову загубить ключі. Скажи, що витрусиш свою сумку.' }, accepted: ["I'll empty out my bag.", "I'll shake out my bag."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c2-13', type: 'fix', grammarPoint: 'l16c2_tools', wrong: "I'll to get the plunger.", accepted: ["I'll get the plunger."] },
    { id: 'l16c2-14', type: 'fix', grammarPoint: 'l16c2_clothes', wrong: "I'll my unzip jacket.", accepted: ["I'll unzip my jacket."] },
    { id: 'l16c2-15', type: 'fix', grammarPoint: 'l16c2_cleaning', wrong: "I'll wipe down table.", accepted: ["I'll wipe down the table."] },
    { id: 'l16c2-16', type: 'fix', grammarPoint: 'l16c2_cleaning', wrong: "I'll fill the up water bottle.", accepted: ["I'll fill up the water bottle."] },
  ],
};

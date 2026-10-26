// chapter_exam_v2_l24_c1.ts — банк экзамена v2: урок 24, глава 1 (эпизоды 1–8). Подключён в registry_l24_l26.ts.
// зачем: правила фабрики (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md) — только слова и формы эпизодов 1–8 урока 24
// (здесь: have / has + known, lived, worked, studied… и for / since; «not», «no», «your» ещё не встречались), ситуация и ответ
// сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C1: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l24c1_for', label: { ru: 'сколько уже — for', uk: 'скільки вже — for' }, episodeOrdinals: [1, 2, 3] },
    { id: 'l24c1_since', label: { ru: 'с какого момента — since', uk: 'з якого моменту — since' }, episodeOrdinals: [1, 4, 5] },
    { id: 'l24c1_has', label: { ru: 'он / она — has', uk: 'він / вона — has' }, episodeOrdinals: [1, 5, 6] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c1-01', type: 'situation', grammarPoint: 'l24c1_for', situation: { ru: 'Новый знакомый удивляется, что ты знаешь тут каждую улицу. Скажи, что живёшь в этом районе уже три года.', uk: 'Новий знайомий дивується, що ти знаєш тут кожну вулицю. Скажи, що живеш у цьому районі вже три роки.' }, accepted: ['I have lived in this district for three years.', "I've lived in this district for three years.", 'I have lived here for three years.', "I've lived here for three years."] },
    { id: 'l24c1-02', type: 'situation', grammarPoint: 'l24c1_since', situation: { ru: 'Новая коллега спрашивает, давно ли ты в компании. Скажи, что работаешь здесь с июня.', uk: 'Нова колега питає, чи давно ти в компанії. Скажи, що працюєш тут із червня.' }, accepted: ['I have worked here since June.', "I've worked here since June."] },
    { id: 'l24c1-03', type: 'situation', grammarPoint: 'l24c1_for', situation: { ru: 'Друг узнал, что ты учишь турецкий. Скажи, что учишь его уже год.', uk: 'Друг дізнався, що ти вчиш турецьку. Скажи, що вчиш її вже рік.' }, accepted: ['I have studied Turkish for a year.'] },
    { id: 'l24c1-04', type: 'situation', grammarPoint: 'l24c1_has', situation: { ru: 'Расскажи о сестре: она живёт вместе с соседкой по квартире с мая.', uk: 'Розкажи про сестру: вона живе разом із сусідкою по квартирі з травня.' }, accepted: ['She has lived with her roommate since May.', 'She has lived with her flatmate since May.'] },
    { id: 'l24c1-05', type: 'situation', grammarPoint: 'l24c1_has', situation: { ru: 'Расскажи о соседе: жена у него умерла три года назад, и с тех пор он один. Скажи, что он вдовец уже три года.', uk: 'Розкажи про сусіда: дружина в нього померла три роки тому, і відтоді він сам. Скажи, що він вдівець уже три роки.' }, accepted: ['He has been a widower for three years.'] },
    { id: 'l24c1-06', type: 'situation', grammarPoint: 'l24c1_since', situation: { ru: 'Друг удивляется, что ты так долго мечтаешь стать пилотом. Скажи, что у тебя эта цель с детства.', uk: 'Друг дивується, що ти так довго мрієш стати пілотом. Скажи, що в тебе ця мета з дитинства.' }, accepted: ['I have had this goal since childhood.', "I've had this goal since childhood."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c1-07', type: 'dialogue', grammarPoint: 'l24c1_for', partnerLine: 'I have known my flatmate for a year.', situation: { ru: 'Скажи, что ты знаешь своего соседа по квартире дольше — два года.', uk: 'Скажи, що ти знаєш свого сусіда по квартирі довше — два роки.' }, accepted: ['I have known my flatmate for two years.', "I've known my flatmate for two years."] },
    { id: 'l24c1-08', type: 'dialogue', grammarPoint: 'l24c1_has', partnerLine: 'She has worked here for a decade.', situation: { ru: 'Поправь: она работает здесь только с 2020 года.', uk: 'Виправ: вона працює тут лише з 2020 року.' }, accepted: ['She has worked here since 2020.'] },
    { id: 'l24c1-09', type: 'dialogue', grammarPoint: 'l24c1_since', partnerLine: 'I have lived here for two years.', situation: { ru: 'Сосед рассказывает о себе. Скажи, что ты живёшь здесь с мая.', uk: 'Сусід розповідає про себе. Скажи, що ти живеш тут із травня.' }, accepted: ['I have lived here since May.', "I've lived here since May."] },
    { id: 'l24c1-10', type: 'dialogue', grammarPoint: 'l24c1_since', partnerLine: 'I have studied Dutch for three months.', situation: { ru: 'Скажи, что ты учишь голландский с мая.', uk: 'Скажи, що ти вчиш нідерландську з травня.' }, accepted: ['I have studied Dutch since May.', "I've studied Dutch since May."] },
    { id: 'l24c1-11', type: 'dialogue', grammarPoint: 'l24c1_since', partnerLine: 'They have kept their engagement secret for a month.', situation: { ru: 'Признайся, что ты знаешь об их помолвке с понедельника.', uk: 'Зізнайся, що ти знаєш про їхні заручини з понеділка.' }, accepted: ['I have known about their engagement since Monday.', "I've known about their engagement since Monday."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c1-12', type: 'fix', grammarPoint: 'l24c1_for', wrong: 'I have lived here since two years.', accepted: ['I have lived here for two years.', "I've lived here for two years."] },
    { id: 'l24c1-13', type: 'fix', grammarPoint: 'l24c1_since', wrong: 'She has worked here for June.', accepted: ['She has worked here since June.'] },
    { id: 'l24c1-14', type: 'fix', grammarPoint: 'l24c1_has', wrong: 'He have known her for a lifetime.', accepted: ['He has known her for a lifetime.'] },
    { id: 'l24c1-15', type: 'fix', grammarPoint: 'l24c1_has', wrong: 'She have studied Greek since May.', accepted: ['She has studied Greek since May.'] },
  ],
};

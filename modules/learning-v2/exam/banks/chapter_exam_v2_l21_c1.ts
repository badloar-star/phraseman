// chapter_exam_v2_l21_c1.ts — банк экзамена v2: урок 21, глава 1 (эпизоды 1–8).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–8 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 1 — enjoy / finish / avoid / do not mind + -ing (эпизоды 1–8). Ответы о себе: «I enjoy…», «I do not mind…».
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C1: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l21c1_enjoy', label: { ru: 'нравится — I enjoy + -ing', uk: 'подобається — I enjoy + -ing' }, episodeOrdinals: [1, 2, 6, 7, 8] },
    { id: 'l21c1_finish_avoid', label: { ru: 'закончить, избегать — finish / avoid + -ing', uk: 'закінчити, уникати — finish / avoid + -ing' }, episodeOrdinals: [3, 4] },
    { id: 'l21c1_dont_mind', label: { ru: 'не против — I do not mind + -ing', uk: 'не проти — I do not mind + -ing' }, episodeOrdinals: [5] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c1-01', type: 'situation', grammarPoint: 'l21c1_enjoy', situation: { ru: 'Новый коллега спрашивает, как ты проводишь отпуск. Скажи, что любишь открывать новые места.', uk: 'Новий колега питає, як ти проводиш відпустку. Скажи, що любиш відкривати нові місця.' }, accepted: ['I enjoy exploring new places.'] },
    { id: 'l21c1-02', type: 'situation', grammarPoint: 'l21c1_enjoy', situation: { ru: 'Друг удивляется, что ты снова двигаешь шкаф и диван. Скажи, что тебе нравится переставлять мебель.', uk: 'Друг дивується, що ти знову пересуваєш шафу й диван. Скажи, що тобі подобається переставляти меблі.' }, accepted: ['I enjoy rearranging furniture.', 'I enjoy rearranging the furniture.', 'I enjoy rearranging my furniture.'] },
    { id: 'l21c1-03', type: 'situation', grammarPoint: 'l21c1_enjoy', situation: { ru: 'Гости хвалят твой кофе. Скажи, что любишь его варить.', uk: 'Гості хвалять твою каву. Скажи, що любиш її варити.' }, accepted: ['I enjoy brewing coffee.', 'I enjoy making coffee.'] },
    { id: 'l21c1-04', type: 'situation', grammarPoint: 'l21c1_finish_avoid', situation: { ru: 'Коллега зовёт на обед, а ты ещё пишешь краткое изложение. Скажи, что должен его дописать.', uk: 'Колега кличе на обід, а ти ще пишеш короткий виклад. Скажи, що маєш його дописати.' }, accepted: ['I must finish writing the summary.', 'I should finish writing the summary.', 'I must finish the summary.'] },
    { id: 'l21c1-05', type: 'situation', grammarPoint: 'l21c1_finish_avoid', situation: { ru: 'Друг спрашивает, почему ты промолчал на собрании. Скажи, что стараешься не создавать конфликтов.', uk: 'Друг питає, чому ти змовчав на зборах. Скажи, що намагаєшся не створювати конфліктів.' }, accepted: ['I avoid causing conflict.', 'I avoid conflict.', 'I avoid creating conflict.'] },
    { id: 'l21c1-06', type: 'situation', grammarPoint: 'l21c1_dont_mind', situation: { ru: 'Начальник смущается, что критикует твой план. Скажи, что ты не против замечаний.', uk: 'Начальник ніяковіє, що критикує твій план. Скажи, що ти не проти зауважень.' }, accepted: ['I do not mind receiving criticism.', 'I do not mind criticism.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c1-07', type: 'dialogue', grammarPoint: 'l21c1_enjoy', partnerLine: 'I do not enjoy watching drama.', situation: { ru: 'Друг не любит драмы. Скажи, что ты любишь посмотреть хорошую драму.', uk: 'Друг не любить драм. Скажи, що ти любиш подивитися гарну драму.' }, accepted: ['I enjoy watching a good drama.', 'I enjoy watching drama.', 'I enjoy watching good drama.'] },
    { id: 'l21c1-08', type: 'dialogue', grammarPoint: 'l21c1_enjoy', partnerLine: 'You are new.', situation: { ru: 'Тебе говорят, что ты здесь новенький. Скажи, что любишь заводить друзей.', uk: 'Тобі кажуть, що ти тут новенький. Скажи, що любиш заводити друзів.' }, accepted: ['I enjoy making friends.', 'I enjoy getting to know new people.'] },
    { id: 'l21c1-09', type: 'dialogue', grammarPoint: 'l21c1_dont_mind', partnerLine: 'I have a complaint.', situation: { ru: 'Клиент хочет пожаловаться. Скажи, что ты не против выслушать жалобу.', uk: 'Клієнт хоче поскаржитися. Скажи, що ти не проти вислухати скаргу.' }, accepted: ['I do not mind hearing a complaint.'] },
    { id: 'l21c1-10', type: 'dialogue', grammarPoint: 'l21c1_dont_mind', partnerLine: 'We must start again.', situation: { ru: 'Работу прервали, и коллега расстроен, что начинать заново. Скажи, что ты не против начать снова.', uk: 'Роботу перервали, і колега засмучений, що починати заново. Скажи, що ти не проти почати знову.' }, accepted: ['I do not mind starting again.'] },
    { id: 'l21c1-11', type: 'dialogue', grammarPoint: 'l21c1_finish_avoid', partnerLine: 'You must not make a fuss.', situation: { ru: 'Поезд задерживается, и друг просит не поднимать шум. Скажи, что ты и так стараешься не поднимать шум.', uk: 'Потяг затримується, і друг просить не здіймати галасу. Скажи, що ти й так намагаєшся не здіймати галасу.' }, accepted: ['I avoid making a fuss.'] },
    { id: 'l21c1-12', type: 'dialogue', grammarPoint: 'l21c1_finish_avoid', partnerLine: 'We can leave now.', situation: { ru: 'Подруга хочет уйти, а ты ещё заполняешь анкету. Скажи, что тебе нужно закончить её заполнять.', uk: 'Подруга хоче піти, а ти ще заповнюєш анкету. Скажи, що тобі треба закінчити її заповнювати.' }, accepted: ['I must finish filling in the questionnaire.', 'I should finish filling in the questionnaire.', 'I must finish the questionnaire.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c1-13', type: 'fix', grammarPoint: 'l21c1_enjoy', wrong: 'I enjoy to explore new places.', accepted: ['I enjoy exploring new places.'] },
    { id: 'l21c1-14', type: 'fix', grammarPoint: 'l21c1_dont_mind', wrong: 'I do not mind to discuss a disagreement.', accepted: ['I do not mind discussing a disagreement.'] },
    { id: 'l21c1-15', type: 'fix', grammarPoint: 'l21c1_finish_avoid', wrong: 'I avoid to give in to temptation.', accepted: ['I avoid giving in to temptation.'] },
    { id: 'l21c1-16', type: 'fix', grammarPoint: 'l21c1_enjoy', wrong: 'I enjoy decorate my home.', accepted: ['I enjoy decorating my home.'] },
  ],
};

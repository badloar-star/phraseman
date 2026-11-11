/**
 * Банк игры «Собери диалог» — испанский классический курс, уроки 3–8 (D207). 2 диалога из 4 реплик на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: реплики — фразы урока или собраны из слов этого и прошлых уроков; порядок однозначен:
 * первый вопрос называет, о ком речь, ответ повторяет это слово, а третья реплика «¿Y …?» («А …?»)
 * не может стоять ни первой, ни после чужого ответа.
 * Уроков 1–2 здесь нет намеренно: в них ещё нет вопросов, а из одних утверждений порядок не однозначен.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { OrderTask } from '../dialogue_core';
import { orderTask } from './make_es_it';

const task = (lesson: number, n: number, lines: readonly string[]): OrderTask => orderTask('es', lesson, n, lines);

export const ORDER_BANK_ES: Readonly<Record<number, readonly OrderTask[]>> = {
  3: [
    task(3, 1, ['¿Está Ana en casa?', 'Ana no está en casa.', '¿Y Luis?', 'Luis está en la cocina.']),
    task(3, 2, ['¿Están las llaves en la mochila?', 'Las llaves no están en la mochila.', '¿Y el pasaporte?', 'El pasaporte está en el bolso.']),
  ],
  4: [
    task(4, 1, ['¿Ana es médica?', 'Ana es enfermera.', '¿Y Luis?', 'Luis es médico.']),
    task(4, 2, ['¿Ellas son estudiantes?', 'Ellas son profesoras.', '¿Y ellos?', 'Ellos son guías.']),
  ],
  5: [
    task(5, 1, ['¿Dónde está el baño?', 'El baño está allí.', '¿Y el ascensor?', 'El ascensor está cerca.']),
    task(5, 2, ['¿Quién es ella?', 'Ella es Ana.', '¿Y él?', 'Él es el guía.']),
  ],
  6: [
    task(6, 1, ['¿Dónde están las maletas?', 'Las maletas están en el coche.', '¿Y los abrigos?', 'Los abrigos están dentro.']),
    task(6, 2, ['¿Dónde está el mapa?', 'El mapa está en la mochila.', '¿Y las fotos?', 'Las fotos están en la mesa.']),
  ],
  7: [
    task(7, 1, ['¿Hay café en la cocina?', 'No hay café.', '¿Y leche?', 'Hay leche en la cocina.']),
    task(7, 2, ['¿Hay una farmacia cerca?', 'Hay dos farmacias cerca.', '¿Y una tienda?', 'En la estación hay una tienda.']),
  ],
  8: [
    task(8, 1, ['¿Dónde está mi pasaporte?', 'Tu pasaporte está en mi bolso.', '¿Y mis llaves?', 'Tus llaves están en la mesa.']),
    task(8, 2, ['¿Dónde está tu hermana?', 'Mi hermana está en clase.', '¿Y tu madre?', 'Mi madre está en la farmacia.']),
  ],
};

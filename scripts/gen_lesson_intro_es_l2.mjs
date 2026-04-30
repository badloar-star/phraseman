/**
 * Generates app/lesson_intro_screens_es_l2.ts — PROMPT-005 Spanish L2 intro screens.
 * Run: node scripts/gen_lesson_intro_es_l2.mjs
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { INTROS_3_32 } from './intro_es_l2_bulk.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'app', 'lesson_intro_screens_es_l2.ts');

/** @typedef {{ kind: string, titleRU?: string, titleUK?: string, titleES?: string, textRU: string, textUK: string, textES?: string, examples?: { en: string, trRU: string, trUK: string, trES?: string }[] }} Block */

/** @type {Record<number, Block[]>} */
const DATA = {
  1: [
    {
      kind: 'why',
      titleRU: 'Зачем это в испанском',
      titleUK: 'Навіщо це іспанською',
      titleES: 'Por qué en español',
      textRU:
        'Без связки ser / estar и местоимений ты не скажешь по-испански ни профессию, ни место, ни состояние: «я здесь», «она дома», «мы заняты». Это базовый каркас предложения — без него речь не держится.',
      textUK:
        'Без зв\'язки ser / estar і займенників ти не скажеш іспанською ні професію, ні місце, ні стан: «я тут», «вона вдома», «ми зайняті». Це базовий каркас речення.',
      textES:
        'Sin ser/estar y pronombres no puedes decir profesión, lugar ni estado: «estoy aquí», «ella está en casa», «estamos ocupados». Es el esqueleto de casi toda frase.',
    },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Cómo se arma la frase',
      textRU:
        'Ser — про то, «кто / что ты»: soy estudiante. Estar — где ты или как ты себя чувствуешь: estoy aquí, estás cansado. Рядом с местоимением сразу ставится форма глагола: yo soy / tú eres / yo estoy / tú estás.',
      textUK:
        'Ser — «хто / що ти»: soy estudiante. Estar — де ти або як почуваєшся: estoy aquí, estás cansado. Одразу після займенника йде форма дієслова: yo soy / tú eres / yo estoy / tú estás.',
      textES:
        'Ser = identidad o clase; estar = ubicación o estado. Junto al pronombre va la forma conjugada: yo soy / tú eres / yo estoy / tú estás.',
      examples: [
        { en: 'I am a student.', trRU: 'Я студент.', trUK: 'Я студент.', trES: 'Soy estudiante.' },
        { en: 'You are here.', trRU: 'Ты здесь.', trUK: 'Ти тут.', trES: 'Estás aquí.' },
        { en: 'She is tired.', trRU: 'Она устала.', trUK: 'Вона втомилась.', trES: 'Ella está cansada.' },
      ],
    },
    {
      kind: 'trap',
      titleRU: 'Главная ловушка',
      titleUK: 'Головна пастка',
      titleES: 'La trampa principal',
      textRU:
        'Русское «он студент» без глагола в испанском не работает: нельзя *él estudiante*. Нужна связка: Él es estudiante. И не путай ser и estar: профессия почти всегда с ser (soy médico), временное состояние — con estar (estoy enfermo).',
      textUK:
        'Українське «він студент» без дієслова іспанською не працює: не кажи *él estudiante*. Треба зв\'язка: Él es estudiante. Не плутай ser і estar: професія — з ser, тимчасовий стан — з estar.',
      textES:
        'No digas *él estudiante* sin verbo: usa Él es estudiante. Profesión suele ir con ser; estado puntual con estar (estoy cansado vs soy médico).',
    },
    {
      kind: 'mechanic',
      titleRU: 'Как это работает',
      titleUK: 'Як це працює',
      titleES: 'Cómo funciona la app',
      textRU:
        'На экране видишь подсказку на языке интерфейса (русский / украинский / испанский). Собери нужную фразу из слов-кнопок в правильном порядке. Кнопка «½» убирает половину неправильных вариантов. «Теория» открывает эти экраны.',
      textUK:
        'На екрані підказка мовою інтерфейсу (російська / українська / іспанська). Збери потрібну фразу з кнопок у правильному порядку. «½» прибирає половину помилкових варіантів. «Теорія» відкриває ці екрани.',
      textES:
        'Verás la pista en el idioma de la interfaz (RU / UK / ES). Monta la frase correcta tocando las palabras en orden. El botón «½» elimina la mitad de opciones incorrectas. «Teoría» abre estas pantallas.',
    },
  ],
  2: [
    {
      kind: 'why',
      titleRU: 'Зачем это в испанском',
      titleUK: 'Навіщо це іспанською',
      titleES: 'Por qué en español',
      textRU:
        'Чтобы спорить, уточнять и переспрашивать по-испански: «не так», «не готов», «ты дома?». Отрицание и простые вопросы — без них диалог длиной больше двух реплик невозможен.',
      textUK:
        'Щоб сперечатися, уточнювати й перепитувати іспанською: «не так», «не готовий», «ти вдома?». Заперечення й прості питання без них не розженеш діалог.',
      textES:
        'Para contradecir, aclarar y preguntar en español: no es así, no estás listo, ¿estás en casa? Sin negación ni preguntas el diálogo no arranca.',
    },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Cómo se forma',
      textRU:
        'Отрицание: no ставится перед всей формой глагола: no soy / no estás / no es. Вопрос с да/нет: инверсия или интонация — ¿Eres estudiante? ¿Estás aquí? Ответы короткие: чаще всего Sí / No.',
      textUK:
        'Заперечення: no перед усією формою дієслова: no soy / no estás / no es. Питання так/ні: інверсія або інтонація — ¿Eres estudiante? Відповіді короткі: Sí / No.',
      textES:
        'Negación: no delante del verbo conjugado (no soy, no estás). Pregunta de sí/no: ¿Eres…?, ¿Estás…? Respuestas cortas: Sí / No.',
      examples: [
        { en: 'I am not ready.', trRU: 'Я не готов.', trUK: 'Я не готовий.', trES: 'No estoy listo.' },
        { en: 'Are you at home?', trRU: 'Ты дома?', trUK: 'Ти вдома?', trES: '¿Estás en casa?' },
        { en: 'She is not busy.', trRU: 'Она не занята.', trUK: 'Вона не зайнята.', trES: 'Ella no está ocupada.' },
      ],
    },
    {
      kind: 'trap',
      titleRU: 'Главная ловушка',
      titleUK: 'Головна пастка',
      titleES: 'La trampa principal',
      textRU:
        'В испанском один маркер no на глагол не надо «усиливать» вторым перед именем как кальку с русского двойного «не»: скажи No soy médico, а не *No no soy*. И помни знак вопроса ¿…? в начале длинных вопросов — иначе для носителя это выглядит как заготовка из чата без пунктуации.',
      textUK:
        'Один no перед дієсловом достатньо; не калькуй подвійне «не» російською. І став знаки ¿ … ? у письмі — це норма іспанської.',
      textES:
        'Un solo no basta delante del verbo; evita calcos del doble «не» eslavo. En escritura usa ¿ … ? en preguntas.',
    },
    {
      kind: 'tip',
      titleRU: 'Полезно знать',
      titleUK: 'Корисно знати',
      titleES: 'Dato útil',
      textRU:
        'В коротком ответе на вопрос с ser/estar можно опустить повтор: ¿Estás cansado? — Sí. Вежливость добавляет por favor в просьбах с infinitivo/imperativo на следующих уроках.',
      textUK:
        'У короткій відповіді часто достатньо Sí / No без повного повтору фрази.',
      textES:
        'En respuestas cortas basta Sí/No sin repetir todo; suma cortesía con por favor cuando pidas algo.',
    },
  ],
  ...INTROS_3_32,
};

function esc(s) {
  return JSON.stringify(s);
}

function blockToTs(b, idx, lessonId) {
  const lines = [`  {`];
  lines.push(`    kind: ${esc(b.kind)},`);
  if (b.titleRU) lines.push(`    titleRU: ${esc(b.titleRU)},`);
  if (b.titleUK) lines.push(`    titleUK: ${esc(b.titleUK)},`);
  if (b.titleES) lines.push(`    titleES: ${esc(b.titleES)},`);
  lines.push(`    textRU: ${esc(b.textRU)},`);
  lines.push(`    textUK: ${esc(b.textUK)},`);
  if (b.textES) lines.push(`    textES: ${esc(b.textES)},`);
  if (b.examples?.length) {
    lines.push(`    examples: [`);
    for (const ex of b.examples) {
      lines.push(`      { en: ${esc(ex.en)}, trRU: ${esc(ex.trRU)}, trUK: ${esc(ex.trUK)}${ex.trES ? `, trES: ${esc(ex.trES)}` : ''} },`);
    }
    lines.push(`    ],`);
  }
  lines.push(`  },`);
  return lines.join('\n');
}

// Minimal stub if lesson missing — should not happen after fill
function placeholderLesson(id) {
  return [
    {
      kind: 'why',
      textRU: `Урок ${id}: загрузите блок из PROMPT-005.`,
      textUK: `Урок ${id}: завантажте блок.`,
      textES: `Lección ${id}: pendiente.`,
    },
  ];
}

const HEADER = `/**
 * PROMPT-005 — Intro screens Spanish L2 (RU/UK explanations → español meta).
 * HYP-A: campo \`en\` en ejemplos = referencia en inglés / puente; \`trES\` = español meta.
 * Riesgo: si la UI aún arma frases EN, el texto de práctica puede no coincidir hasta migración de LessonPhrase.
 */
import type { LessonIntroScreen } from './lesson_data_types';

`;

let body = '';

for (let id = 1; id <= 32; id++) {
  const blocks = DATA[id] || placeholderLesson(id);
  const name =
    id >= 17 ? `LESSON_${id}_INTRO_EXTRA` : `LESSON_${id}_INTRO_SCREENS`;
  body += `export const ${name}: LessonIntroScreen[] = [\n`;
  body += blocks.map((b) => blockToTs(b)).join('\n');
  body += `\n];\n\n`;
}

writeFileSync(outPath, HEADER + body, 'utf8');
console.log('Wrote', outPath, 'lessons:', Object.keys(DATA).length);

/**
 * Эвал промпта «Объясни проще» на реальных фразах — БЕЗ деплоя и без Firestore.
 *
 * Гоняет БОЕВОЙ buildExplainPrompt (из собранного functions/lib) через тот же
 * gpt-4o-mini с теми же параметрами, что CF explainPhrase (temp 0.7, max_tokens 240),
 * и печатает результаты для ручной оценки: объясняет ли ГРАММАТИКУ английской фразы
 * (слова/порядок/форма), а не пересказывает смысл.
 *
 * Запуск (ключ НЕ хардкодим — берём из окружения):
 *   cd functions && npm run build && \
 *   OPENAI_API_KEY=... node scripts/eval_explain_prompt.mjs
 */
import { createRequire } from 'node:module';
import { requireCodexOpenAiTtsOnly } from '../../scripts/openai-dev-guard.mjs';

const require = createRequire(import.meta.url);
const { buildExplainPrompt } = require('../lib/explain/explain_prompts.js');

requireCodexOpenAiTtsOnly({
  action: 'Explain prompt local eval',
  endpoint: 'chat/completions',
});

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('OPENAI_API_KEY не задан в окружении');
  process.exit(1);
}

// Параметры строго как в CF (functions/src/explain_phrase.ts).
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 240;
const TEMPERATURE = 0.7;

/** Репрезентативный срез фраз уроков: связки am/is/are, do-отрицание, вопросы,
 *  3-е лицо -s, there is, present perfect + 2 испанских кейса (проверка языковой карты). */
const CASES = [
  { phraseEn: "I'm ready", meaning: 'Я готов', lang: 'ru' },
  { phraseEn: 'It sounds good', meaning: 'Это звучит хорошо', lang: 'ru' },
  { phraseEn: 'She is ready', meaning: 'Она готова', lang: 'ru' },
  { phraseEn: 'We are together', meaning: 'Мы вместе', lang: 'ru' },
  { phraseEn: 'I want to go home', meaning: 'Я хочу пойти домой', lang: 'ru' },
  { phraseEn: 'Can you help me?', meaning: 'Можешь мне помочь?', lang: 'ru' },
  { phraseEn: "I don't like it", meaning: 'Мне это не нравится', lang: 'ru' },
  { phraseEn: 'He works every day', meaning: 'Он работает каждый день', lang: 'ru' },
  { phraseEn: 'There is a problem', meaning: 'Есть проблема', lang: 'ru' },
  { phraseEn: 'What time is it?', meaning: 'Который час?', lang: 'ru' },
  { phraseEn: 'I have been there', meaning: 'Я там бывал', lang: 'ru' },
  { phraseEn: "Don't worry about it", meaning: 'Не переживай об этом', lang: 'ru' },
  // Языковая карта: испанец должен получить ИСПАНСКОЕ объяснение.
  { phraseEn: 'It sounds good', meaning: 'Suena bien', lang: 'es' },
  { phraseEn: "I'm ready", meaning: 'Estoy listo', lang: 'es' },
];

async function generate({ phraseEn, meaning, lang }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      messages: [{ role: 'user', content: buildExplainPrompt(phraseEn, meaning, lang) }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? '').trim();
}

const results = [];
for (const c of CASES) {
  try {
    const text = await generate(c);
    results.push({ ...c, text });
    console.log(`\n=== [${c.lang}] ${c.phraseEn} ===\n${text}`);
  } catch (err) {
    results.push({ ...c, text: `ERROR: ${err.message}` });
    console.log(`\n=== [${c.lang}] ${c.phraseEn} ===\nERROR: ${err.message}`);
  }
}

// Грубые автопроверки-флаги (ручная оценка всё равно обязательна).
console.log('\n\n===== АВТОФЛАГИ =====');
for (const r of results) {
  const flags = [];
  if (r.text.startsWith('ERROR')) flags.push('ERROR');
  // Пересказ смысла: текст почти дословно содержит meaning.
  const meaningCore = r.meaning.toLowerCase().replace(/[.!?]/g, '');
  if (meaningCore.length > 6 && r.text.toLowerCase().includes(meaningCore)) flags.push('ECHOES_MEANING');
  const words = r.text.split(/\s+/).length;
  if (words > 90) flags.push(`LONG(${words}w)`);
  if (r.lang === 'es' && /[А-Яа-яЁё]{3,}/.test(r.text)) flags.push('RUSSIAN_IN_ES');
  console.log(`[${flags.length ? flags.join(',') : 'ok'}] (${r.lang}) ${r.phraseEn}`);
}

/**
 * Компас — промпт тёплого комментария дня. PURE, без firebase-admin.
 *
 * Модель пишет ОДНУ короткую тёплую фразу про сегодняшний день в духе Тренера
 * (Библия Phraseman): на «ты», поддержка, gain-framing, ≤2 коротких предложения,
 * без слов «урок/ошибка/статистика/купить». Модель видит только briefing-числа
 * (тип дня + темы), НЕ сырые логи — дёшево, приватно, предсказуемо.
 */
import { PROMPT_LANGUAGES, resolvePromptLangKey } from '../explain/explain_prompts';

function lang(langKey: string): { name: string; writeIn: string } {
  return PROMPT_LANGUAGES[resolvePromptLangKey(langKey)];
}

export interface CompassBriefingInput {
  dayType: string; // easy | deep_dive | repair | comeback
  topics: string[]; // человеческие/ключевые темы дня
  lang: string;
}

export function buildCompassPrompt(input: CompassBriefingInput): string {
  const target = lang(input.lang);
  const topicList = input.topics.filter(Boolean).slice(0, 4).join(', ');
  const mood: Record<string, string> = {
    easy: 'a calm, light day — reinforce yesterday, no rush',
    deep_dive: 'a day to go deeper into a new topic, gently invite to a learning session',
    repair: 'a day to fix a couple of phrases that keep slipping, calmly and kindly',
    comeback: 'the learner is back after a pause — warm welcome, start small',
  };

  return [
    `You are "Компас" (Compass), a warm, calm coach in the Phraseman app. Voice: like a person who believes in the learner. Address them informally ("ты"-style), never condescend.`,
    `Write ONE short, warm line (max 2 tiny sentences) for today's briefing.`,
    `Today is ${mood[input.dayType] ?? mood.easy}.`,
    topicList ? `Today's focus topics: ${topicList}.` : ``,
    `Rules (strict): gain-framing (what they gain, never what they lose). Plain, simple words. No grammar jargon. Encourage, don't pressure. No fake urgency, no scaring. At most one emoji (🔥), usually none.`,
    `Do NOT use the words "lesson", "mistake", "statistics", "buy", "price". Speak about a "session", "your phrases", "your path".`,
    `${target.writeIn}`,
    `Output ONLY the line — plain text, no quotes, no markdown, no labels.`,
  ]
    .filter((l) => l && l.length > 0)
    .join('\n');
}

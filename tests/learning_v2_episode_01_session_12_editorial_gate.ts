import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { EDITORIAL_INTRO_BODIES_11_TO_15_V3 } from '../modules/learning-v2/content/source/episode_01_editorial_intro_bodies_11_15_v3';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[11];

assert.equal(source?.requiredSessionOrdinal, 12);
assert.equal(EDITORIAL_INTRO_BODIES_11_TO_15_V3[12]?.length, 3,
  'session 12 must use three explicit editorial intro bodies');

for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 300, `${page.kind}.${locale} must keep the approved intro depth`);
    assert.ok((body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4,
      `${page.kind}.${locale} must be a causal paragraph, not a note`);
  }
}

const expectedMeanings: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'Am I tired?': { ru: 'Я устал?', uk: 'Я втомився?', es: '¿Estoy cansado?', 'pt-BR': 'Estou cansado?', vi: 'Tôi có mệt không?', id: 'Apakah saya lelah?', tr: 'Yorgun muyum?', pl: 'Czy jestem zmęczony?' },
  'Am I warm?': { ru: 'Мне тепло?', uk: 'Мені тепло?', es: '¿Tengo calor?', 'pt-BR': 'Estou com calor?', vi: 'Tôi có thấy ấm không?', id: 'Apakah saya merasa hangat?', tr: 'İçim sıcak mı?', pl: 'Czy jest mi ciepło?' },
  'Am I not ready?': { ru: 'Я не готов?', uk: 'Я не готовий?', es: '¿No estoy listo?', 'pt-BR': 'Não estou pronto?', vi: 'Tôi chưa sẵn sàng phải không?', id: 'Apakah saya belum siap?', tr: 'Hazır değil miyim?', pl: 'Czy nie jestem gotowy?' },
  'Am I not sure?': { ru: 'Я не уверен?', uk: 'Я не впевнений?', es: '¿No estoy seguro?', 'pt-BR': 'Não tenho certeza?', vi: 'Tôi không chắc phải không?', id: 'Apakah saya tidak yakin?', tr: 'Emin değil miyim?', pl: 'Czy nie jestem pewny?' },
};

for (const [english, byLocale] of Object.entries(expectedMeanings)) {
  const phrase = source.phrases.find((entry) => entry.english === english);
  assert.ok(phrase, `missing phrase ${english}`);
  for (const locale of LOCALES) {
    assert.equal(phrase.localizedDetails?.[locale]?.meaning, byLocale[locale], `${english}.${locale}`);
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map((phrase) => phrase.localizedDetails?.[locale]?.explanation ?? '');
  assert.equal(new Set(explanations).size, 15, `all phrase explanations must be individually authored for ${locale}`);
  explanations.forEach((text) => {
    assert.ok(text.length >= 80, `phrase explanation is too thin for ${locale}`);
    assert.doesNotMatch(text, /Верно: форма связки|Добр(?:е|о): форма|Correcto: la forma|Certo: a forma|Benar: bentuk|Doğru: be biçimi/u);
  });
}

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(shard, 'ru', 'lesson-01:session:12');
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const actualFamilies = children.learner.interactions.map((entry) => entry.family);
assert.deepEqual(actualFamilies, [
  'listen_choose', 'phrase_builder', 'context_gap_grammar', 'listen_choose',
  'phrase_builder', 'context_gap_grammar', 'speed_match', 'phrase_builder',
  'listen_build_dictation', 'context_gap_grammar', 'listen_build_dictation', 'phrase_builder',
]);

const taskByTarget = (target: string) => {
  const index = practiceCards.findIndex((card) => card.contentItem.target.text === target);
  assert.notEqual(index, -1, `missing task ${target}`);
  return { card: practiceCards[index]!, interaction: children.learner.interactions[index]! };
};

assert.deepEqual(
  taskByTarget('Am I tired?').interaction.responseOptions.map((option) => option.text),
  ['Am', 'I', 'tired', 'Is', 'Are'],
);
assert.deepEqual(
  taskByTarget('Am I happy?').interaction.responseOptions.map((option) => option.text),
  ['Am', 'Is', 'Are'],
);
assert.deepEqual(
  taskByTarget('Am I at home?').interaction.responseOptions.map((option) => option.text),
  ['Am I at home?', 'Am I in home?', 'Am I on home?'],
);

for (const interaction of children.learner.interactions) {
  const card = practiceCards.find((entry) => entry.cardId === interaction.interactionId.replace(/^interaction-/u, ''));
  const target = card?.contentItem.target.text ?? '';
  const success = card?.successMessageByLocale.ru ?? '';
  assert.equal(success.split(target).length - 1, 1, `success must show ${target} exactly once`);
}

const allRuFeedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}).map((localized) => localized.ru),
);
assert.ok(allRuFeedback.length >= 20, 'every visible wrong option needs feedback');
assert.ok(allRuFeedback.every((text) => !text.includes('тема близкая, но изменившееся слово')),
  'session 12 semantic feedback must be written for the exact trap');
assert.ok(allRuFeedback.every((text) => !text.includes('похоже по грамматической роли')),
  'session 12 form feedback must name why is/are cannot pair with I');

const realMockBuilder = readFileSync('scripts/build_learning_v2_lesson1_real_session_mock.mjs', 'utf8');
assert.doesNotMatch(realMockBuilder, /attempts>1\?/u,
  'the first wrong attempt must show the selected option’s exact authored trap explanation');

console.log('Learning V2 session 12 editorial gate: PASS');

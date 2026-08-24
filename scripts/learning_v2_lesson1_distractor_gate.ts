import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TRAP_TYPES = new Set([
  'grammar', 'semantic_neighbor', 'collocation_pragmatics', 'phonetic',
  'orthographic', 'l1_transfer', 'phrase_assembly',
]);
const GENERIC_CODES = new Set([
  'approved_candidate_distractor', 'wrong_token', 'wrong_token_for_position',
]);

function normalized(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

let total = 0;
let localizedTotal = 0;
let findingCount = 0;
const sample: string[] = [];
const trapTypesSeen = new Set<string>();
const optionSetTargets = new Map<string, string>();

function finding(path: string, code: string): void {
  findingCount += 1;
  if (sample.length < 30) sample.push(`${path}:${code}`);
}

for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  for (const phrase of source.phrases) {
    phrase.words.forEach((word, wordIndex) => {
      const path = `S${source.requiredSessionOrdinal}/${phrase.id}/w${wordIndex + 1}`;
      const signature = word.distractors.map((item) => normalized(item.value)).join('|');
      const target = normalized(word.correct);
      const previousTarget = optionSetTargets.get(signature);
      if (previousTarget && previousTarget !== target) finding(path, 'copied_option_set');
      else optionSetTargets.set(signature, target);

      word.distractors.forEach((item, distractorIndex) => {
        total += 1;
        const itemPath = `${path}/d${distractorIndex + 1}`;
        if (!item.trapType || !TRAP_TYPES.has(item.trapType)) finding(itemPath, 'trap_type');
        else trapTypesSeen.add(item.trapType);
        if (GENERIC_CODES.has(item.reasonCode)) finding(itemPath, 'generic_reason_code');
        const reason = normalized(item.why);
        if (!reason.includes(normalized(item.value)) || !reason.includes(target))
          finding(itemPath, 'feedback_not_pair_specific');
        const mechanicalSuffix = target.length >= 3 && (
          normalized(item.value) === `${target}s` ||
          normalized(item.value) === `${target}ed` ||
          normalized(item.value) === `${target}ing`
        );
        if (
          mechanicalSuffix &&
          item.trapType !== 'grammar' &&
          item.trapType !== 'orthographic' &&
          item.trapType !== 'collocation_pragmatics'
        )
          finding(itemPath, 'mechanical_suffix');
      });

      for (const locale of LOCALES) {
        const localizedWord = phrase.localizedDetails?.[locale]?.words[wordIndex];
        if (!localizedWord) {
          finding(`${path}/${locale}`, 'localized_word_missing');
          continue;
        }
        const reasons = new Set<string>();
        localizedWord.distractors.forEach((item, distractorIndex) => {
          localizedTotal += 1;
          const itemPath = `${path}/${locale}/d${distractorIndex + 1}`;
          if (!item.trapType || !TRAP_TYPES.has(item.trapType)) finding(itemPath, 'localized_trap_type');
          const reason = normalized(item.reason);
          if (!reason.includes(normalized(item.value)) || !reason.includes(normalized(localizedWord.correct)))
            finding(itemPath, 'localized_feedback_not_pair_specific');
          if (reasons.has(reason)) finding(itemPath, 'localized_feedback_copied');
          reasons.add(reason);
        });
      }
    });
  }
}

for (const requiredType of TRAP_TYPES) {
  if (!trapTypesSeen.has(requiredType)) finding('lesson1', `trap_type_not_covered=${requiredType}`);
}

const report = {
  ok: findingCount === 0,
  sessions: AUTHORED_EPISODE_01_SESSIONS.length,
  distractors: total,
  localizedDistractors: localizedTotal,
  trapTypes: [...trapTypesSeen].sort(),
  findingCount,
  sample,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;

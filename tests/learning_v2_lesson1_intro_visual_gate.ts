import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function occurrences(text: string, term: string): readonly number[] {
  const starts: number[] = [];
  let cursor = 0;
  while (cursor <= text.length - term.length) {
    const start = text.indexOf(term, cursor);
    if (start < 0) break;
    starts.push(start);
    cursor = start + term.length;
  }
  return starts;
}

const findings: string[] = [];

for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  // Sessions 1–10 are an owner-approved immutable calibration fixture. This
  // gate protects newly authored pages without retrospectively redefining it.
  if (source.requiredSessionOrdinal <= 10) continue;
  const shard = buildSessionShardFromSource(source);
  for (const page of shard.intro.pages) {
    for (const locale of LOCALES) {
      const body = page.bodyByLocale[locale];
      const runs = page.bodyRunsByLocale?.[locale] ?? [];
      const semanticAt: string[] = [];
      for (const run of runs) {
        semanticAt.push(...Array.from({ length: run.text.length }, () => run.semantic));
      }
      if (runs.map((run) => run.text).join('') !== body) {
        findings.push(`runs_do_not_rebuild_body:s${source.requiredSessionOrdinal}:p${page.pageOrdinal}:${locale}`);
        continue;
      }
      const terms = new Set<string>([
        ...source.phrases.map((phrase) => phrase.english),
        ...page.question.choicesByLocale[locale],
      ].filter((term) => term.length >= 4 && /[\s?!.'’]/u.test(term)));
      for (const term of terms) {
        for (const start of occurrences(body, term)) {
          const covered = semanticAt
            .slice(start, start + term.length)
            .every((semantic) => semantic === 'targetCorrect' || semantic === 'targetWrong');
          if (!covered) {
            findings.push(`uncolored_target:s${source.requiredSessionOrdinal}:p${page.pageOrdinal}:${locale}:${term}`);
          }
        }
      }
    }
  }
}

if (findings.length > 0) {
  throw new Error(`LESSON 1 INTRO VISUAL GATE: HOLD\n${findings.slice(0, 60).join('\n')}\nfindings=${findings.length}`);
}

process.stdout.write('LESSON 1 INTRO VISUAL GATE: PASS\n');

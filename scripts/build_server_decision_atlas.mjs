import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { buildServerDecisionAtlas } from './server_decision_atlas/catalog.mjs';
import { renderServerDecisionAtlas } from './server_decision_atlas/render.mjs';

const outputPath = resolve(process.cwd(), '.codex-tmp', 'server-decision-atlas', 'index.html');
const bundle = buildServerDecisionAtlas(process.cwd());

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, renderServerDecisionAtlas(bundle), 'utf8');

process.stdout.write(`SERVER DECISION ATLAS: BUILT records=${bundle.records.length} path=${outputPath}\n`);

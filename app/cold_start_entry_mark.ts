/**
 * Самая ранняя отметка JS-старта для [COLD-START].
 *
 * зачем (координатор 04.10, холодный старт п.1, «сперва логи»): BOOT_T0 в _layout ставится уже ПОСЛЕ всех
 * статических импортов корня, а performance.now в RN — общие часы, не время от старта процесса. Поэтому
 * цену графа импортов (в т.ч. модальных хостов) было не видно. Этот модуль импортируется ПЕРВЫМ в index.js
 * и запоминает время входа; _layout пишет layout.module_imports:done с entryToImportsMs.
 */
const holder = globalThis as { __phrasemanEntryEpochMs?: number };
if (typeof holder.__phrasemanEntryEpochMs !== 'number') holder.__phrasemanEntryEpochMs = Date.now();

export function msSinceJsEntry(): number {
  const entry = holder.__phrasemanEntryEpochMs;
  return typeof entry === 'number' ? Date.now() - entry : -1;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ColdStartEntryMarkRouteShim() {
  return null;
}

// PM-229 — ратчет «не подавлять ошибки молча».
//
// зачем: PM-229 (A1) — в очередях, outbox, синхронизации и фоновых работах не
// должно быть `catch {}` и `.catch(() => {})` без причины в логе. Годами так
// умирали целые механизмы (прогрев картинок, почта) — и никто не видел.
// Проба считает немые обработчики в app/, components/, modules/, hooks/ и роняет
// прогон, если их больше, чем записано в BASELINE. Список может только
// сокращаться: устаревшая запись (стало меньше) тоже роняет пробу.
//
// Немой = `catch {}` / `catch (e) {}` с пустым телом (комментарии не считаются
// действием) ИЛИ `.catch(() => {})` / `.catch(() => null|undefined|[]|{}|false|0)`
// без единого вызова внутри.
//
// Запуск: npx tsx tests/pm229_silent_catch.probe.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks'] as const;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'graphify-out', '__mocks__']);

// Ключ — файл, значение — сколько немых обработчиков разрешено (долг).
// Только сокращать. Новые файлы сюда не добавлять — логируй причину.
const BASELINE: Record<string, number> = {
  'app/(tabs)/friends.tsx': 7, // FINAL_PHASE п.7 2026-10-02: 9 → 7 (заявка в друзья)
  'app/(tabs)/home.tsx': 4, // PM-289 2026-10-02: 5 → 4 (снято начисление жемчуга за серию)
  'app/(tabs)/lessons.tsx': 1,
  'app/(tabs)/settings.tsx': 1, // FINAL_PHASE п.7 2026-10-02: 4 → 1
  'app/_layout.tsx': 112, // PM-229 2026-10-02: 115 → 112
  'app/account_switch_quarantine.ts': 3,
  'app/achievements_screen.tsx': 1,
  'app/ai_companion_session.tsx': 1,
  'app/ai_dialog_session.tsx': 5,
  'app/app_snapshot_bootstrap.ts': 5, // Q5: чтение Avatar DNA на старте удалено
  'app/auth_provider.ts': 26,
  'app/coin_rank.tsx': 1,
  'app/community_pack_create.tsx': 1,
  'app/community_packs/CommunityPackSocialBar.tsx': 2,
  'app/community_packs/PackCommentsSheet.tsx': 1,
  'app/debug-logger.ts': 2, // PM-228 2026-10-01: 7 → 2 (остались .catch(() => undefined) в цепочке очереди — намеренный разрыв цепочки)
  'app/diagnostic_test.tsx': 2,
  'app/exam.tsx': 3,
  'app/flashcards/CollectionListView.tsx': 1,
  'app/flashcards/FlashcardsHubScreen.tsx': 4,
  'app/flashcards/PhraseCard.tsx': 1,
  'app/flashcards_blitz_session.tsx': 4, // FINAL_PHASE п.7 2026-10-02: 12 → 4
  'app/flashcards_collection.tsx': 2,
  'app/flashcards_my_packs.tsx': 4, // FINAL_PHASE п.7 2026-10-02: 5 → 4 (удаление набора)
  'app/flashcards_packs.tsx': 7,
  'app/flashcards_speaking_session.tsx': 4, // FINAL_PHASE п.7 2026-10-02: 10 → 4
  'app/flashcards_swipe.tsx': 13, // FINAL_PHASE п.7 2026-10-02: 23 → 13
  'app/flashcards_training_setup.tsx': 1,
  'app/interactive_network_quiet.ts': 1,
  'app/learning-v2/lesson/[id].tsx': 4,
  'app/learning-v2/session/[id].tsx': 3,
  'app/learning_v2_direct_session_player_v1.tsx': 1,
  'app/lesson1.tsx': 30,
  'app/lesson_complete.tsx': 17, // PM-233 D140 2026-10-01: 18 → 17 (снят дроп коллекции)
  'app/lesson_irregular_verbs.tsx': 1, // PM-233 D140: 2 → 1 (снят дроп коллекции)
  'app/lesson_menu.tsx': 4,
  'app/lesson_words.tsx': 2, // PM-233 D140: 3 → 2 (снят дроп коллекции)
  'app/level_exam.tsx': 3,
  'app/manage_subscription.tsx': 3,
  'app/preposition_drill.tsx': 2, // PM-233 D140: 3 → 2 (снят дроп коллекции)
  'app/promo_code_entry.tsx': 1,
  'app/statsCache.ts': 3,
  'app/streak_stats.tsx': 4, // D49 2026-10-01: 7 → 4 (удалена кнопка «Подарки»)
  'app/support_report.tsx': 2,
  'components/AddToFlashcard.tsx': 1,
  'components/AiLimitUpsellCard.tsx': 1,
  'components/CleanOnboarding.tsx': 27, // D126: 3 немых catch выбора языка теперь логируют причину
  'components/DailyPhraseCard.tsx': 6,
  'components/DialogsTabContent.tsx': 1,
  'components/ErrorBoundary.tsx': 1,
  'components/ExamResultPreviewAdminModal.tsx': 1,
  'components/ForceUpdateGate.tsx': 1,
  'components/RegistrationPromptModal.tsx': 4,
  'components/ScreenGradient.tsx': 1,
  'components/SoftContextualUpsellCard.tsx': 1,
  'components/SpeakingPanel.tsx': 2,
  'components/VipSurveyReviewPromptModal.tsx': 4,
  'components/dev/DevHubSheet.tsx': 1,
  'components/level-exam/LevelExamIntro.tsx': 1,
  'components/level-exam/LevelExamV2.tsx': 5,
  'components/prize_arc.tsx': 1,
  'components/theory/TheoryLessonView.tsx': 1,
  'components/youtube/YoutubePremiereHero.tsx': 2,
  'components/youtube/YoutubeVideoPhrases.tsx': 1,
  'modules/phone-state/keyed_exclusive_transaction.ts': 1,
  'modules/account-session-v2/account_detach_latch.ts': 1, // E22 2026-10-01: намеренный разрыв цепочки очереди (tail = next.catch(...))
};

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(abs);
    }
  };
  for (const dir of SCAN_DIRS) walk(path.join(root, dir));
  return out;
}

function isSilentValue(expr: ts.Expression): boolean {
  let e = expr;
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
  if (ts.isVoidExpression(e)) return isSilentValue(e.expression);
  if (e.kind === ts.SyntaxKind.NullKeyword || e.kind === ts.SyntaxKind.TrueKeyword
    || e.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isIdentifier(e) && e.text === 'undefined') return true;
  if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return true;
  if (ts.isArrayLiteralExpression(e)) return e.elements.length === 0;
  if (ts.isObjectLiteralExpression(e)) return e.properties.length === 0;
  return false;
}

function isSilentHandler(fn: ts.Expression): boolean {
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return false;
  if (ts.isBlock(fn.body)) return fn.body.statements.length === 0;
  return isSilentValue(fn.body);
}

export function countSilent(source: string, fileName = 'x.ts'): number {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node) && node.block.statements.length === 0) n += 1;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'catch' && node.arguments.length === 1
      && isSilentHandler(node.arguments[0]!)) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

if (require.main === module || process.argv[1]?.endsWith('pm229_silent_catch.probe.ts')) {
  const found: Record<string, number> = {};
  let total = 0;
  for (const abs of listSourceFiles()) {
    const n = countSilent(readFileSync(abs, 'utf8'), abs);
    if (n > 0) { found[path.relative(root, abs).replace(/\\/g, '/')] = n; total += n; }
  }
  if (process.argv.includes('--print')) {
    for (const [f, n] of Object.entries(found).sort()) console.log(`  '${f}': ${n},`);
    console.log(`TOTAL ${total}`);
  } else {
    const violations = Object.entries(found)
      .filter(([f, n]) => n > (BASELINE[f] ?? 0))
      .map(([f, n]) => `${f}: немых catch ${n}, разрешено ${BASELINE[f] ?? 0}`);
    const stale = Object.entries(BASELINE)
      .filter(([f, n]) => (found[f] ?? 0) < n)
      .map(([f, n]) => `${f}: осталось ${found[f] ?? 0} из ${n} — сократи BASELINE (ратчет)`);
    if (violations.length + stale.length > 0) {
      console.error('[PM-229] silent catch ratchet:');
      for (const l of [...violations, ...stale]) console.error(`  - ${l}`);
    }
    assert.equal(violations.length, 0, 'PM-229: новые немые catch — залогируй причину (DebugLogger / console.warn с префиксом)');
    assert.equal(stale.length, 0, 'PM-229: BASELINE устарел — сократи (ратчет только уменьшается)');
    console.log(`PM-229 PROBE PASS: silentCatch=${total} files=${Object.keys(found).length}`);
  }
}

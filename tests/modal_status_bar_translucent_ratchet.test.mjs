// зачем (правило владельца «фон идёт под статус-баром на каждом экране, никакой цветной полосы safe-area»; safe-area гейт OTA 25.10,
// docs/work/release/ota-safe-area-gate-2026-10-25.md): прозрачный <Modal> без statusBarTranslucent на Android не заводит своё
// затемнение под статус-бар — сверху остаётся светлая полоса. 25.10 флаг поставлен общей оболочке HybridAlertShell (все окна-
// предупреждения), итогу урока и «Нет энергии». Храповик: новые прозрачные модалки обязаны нести statusBarTranslucent; список
// старых может только сокращаться (исправил файл — убери строку). Разбор — по дереву TypeScript, не регуляркой
// (в атрибутах бывают стрелки с «>»).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// база на 25.10 (после исправлений этого дня); онбординг — до выбора темы (theme-exempt), остальное — хозяевам через координатора
const ALLOWED = {
  'app/(tabs)/home.tsx': 1,
  'components/account/NicknameEditModal.tsx': 1,
  'components/CertificateNameModal.tsx': 1,
  'components/CleanOnboarding.tsx': 2,
  'components/home/HomeMistakesLockedSheet.tsx': 1,
  'components/learning-v2/horizons/LearningV2Horizons.tsx': 1,
  'components/ReportUserModal.tsx': 1,
  'components/ui/v2_sheet.tsx': 1,
  // ждёт проверки клавиатуры Сверкой (решение координатора 26.10): форма с полем + KeyboardAvoidingView — флаг сдвигает
  // систему координат окна на Android; вернуть флаг только после кадров «клавиатура открыта, видны поле и кнопка»
  'components/ExplainReportButton.tsx': 1,
  'components/ReportErrorButton.tsx': 1,
};
const MUST_HAVE = ['components/modal_fx/HybridAlertShell.tsx', 'app/lesson_complete.tsx', 'components/NoEnergyModal.tsx', 'components/ThemedConfirmModal.tsx', 'components/ThemedChoiceModal.tsx'];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(p);
  }
  return out;
}
function opaqueBandModals(abs) {
  const sf = ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let n = 0;
  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sf) === 'Modal') {
      const names = node.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText(sf));
      if (names.includes('transparent') && !names.includes('statusBarTranslucent')) n++;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}
const found = {};
for (const d of ['app', 'components', 'modules']) {
  for (const abs of walk(join(ROOT, d), [])) {
    const n = opaqueBandModals(abs);
    if (n) found[relative(ROOT, abs).split(sep).join('/')] = n;
  }
}

test('прозрачные модалки без statusBarTranslucent не прибавляются', () => {
  const grown = Object.entries(found).filter(([f, n]) => n > (ALLOWED[f] ?? 0));
  assert.deepEqual(grown, [], `прозрачная <Modal> без statusBarTranslucent даёт полосу у статус-бара на Android: ${JSON.stringify(grown)}`);
});

test('список старых не завышен: исправленный файл убран из ALLOWED', () => {
  const stale = Object.entries(ALLOWED).filter(([f, n]) => (found[f] ?? 0) < n);
  assert.deepEqual(stale, [], `понизь или убери из ALLOWED: ${JSON.stringify(stale)}`);
});

test('исправленные 25.10 оболочки держат флаг', () => {
  for (const f of MUST_HAVE) assert.equal(found[f] ?? 0, 0, `${f}: прозрачная <Modal> снова без statusBarTranslucent`);
});

import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const modal = fs.readFileSync('app/community_packs/ReportCommentModal.tsx', 'utf8');
const sheet = fs.readFileSync('app/community_packs/PackCommentsSheet.tsx', 'utf8');

test('PM-107: report control is wired, labelled and submits', () => {
  assert.match(sheet, /onPress=\{\(\) => \{[^}]*setReportFor\(c\)/s);
  assert.match(sheet, /Ionicons name="flag-outline"/);
  assert.match(modal, /submitPackCommentReport\(/);
  assert.match(modal, /accessibilityLabel=\{triLang\(lang, \{[^}]*Comment for the report/s);
  assert.match(modal, /onPress=\{handleSend\}/);
});


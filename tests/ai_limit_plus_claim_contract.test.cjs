const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const copy = fs.readFileSync(path.join(root, 'app/ai_kill_switch_copy.ts'), 'utf8');
const card = fs.readFileSync(path.join(root, 'components/AiLimitUpsellCard.tsx'), 'utf8');
const limitVariants = copy.split('const PERSONAL_LIMIT_VARIANTS: readonly MultiLangPair[] = [')[1]
  ?.split('const GLOBAL_BUDGET_VARIANTS: readonly MultiLangPair[] = [')[0];

test('personal AI-limit copy retains variants without claiming Plus changes the limit', () => {
  assert.ok(limitVariants, 'personal-limit variants must exist');
  assert.equal((limitVariants.match(/title: \{/g) || []).length, 3);
  assert.equal((limitVariants.match(/message: \{/g) || []).length, 3);
  assert.doesNotMatch(limitVariants, /\bPlus\b|безлимит|бесконечн|unlimit|never takes a day off|never runs out/i);
});

test('AI-limit card offers Plus details without claiming immediate full access', () => {
  assert.match(card, /ru: 'Посмотреть Plus'/);
  assert.doesNotMatch(card, /Открыть полный доступ|Get full access|Obtener acceso completo/);
  assert.match(card, /pathname: '\/premium_modal'/);
  assert.match(card, /paywallContext/);
  assert.match(card, /paywallSource/);
  assert.match(card, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.doesNotMatch(card, /#FFD66B|#79D6FF/);
  assert.doesNotMatch(card, /numberOfLines=\{1\}/);
});

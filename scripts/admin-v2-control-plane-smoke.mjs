import fs from 'node:fs';

const html = fs.readFileSync('admin/v2/index.html', 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const routes = [...html.matchAll(/data-route="([^"]+)"/g)].map((match) => match[1]);
const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);

assert(html.includes('name="viewport"'), 'responsive viewport is missing');
assert(routes.length === 7, `expected seven primary sections, got ${routes.length}`);
assert(new Set(routes).size === 7, 'primary sections are not unique');
assert(['overview', 'app', 'users', 'money', 'content', 'community', 'diagnostics'].every((route) => routes.includes(route)), 'control-plane sections are incomplete');
assert(html.includes('data-factory="language"') && html.includes('data-factory="publish"'), 'language factory workflow is incomplete');
assert(html.includes('Создать draft job') && html.includes('QA и источники'), 'language factory draft/QA controls are missing');
assert(html.includes('server command') && html.includes('rollback'), 'server-side and rollback safety copy is missing');
assert(!/[😀-🙏🌀-🫿]/u.test(html), 'emoji are used as interface icons');
assert(buttons.every((button) => button.includes('title=') || button.includes('aria-label=')), 'a button lacks tooltip or aria-label');
assert(html.includes('prefers-reduced-motion') === false || html.includes('prefers-reduced-motion'), 'motion policy must be explicit when animation is added');

const result = { verdict: failures.length ? 'FAIL' : 'PASS', failures, routes };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);

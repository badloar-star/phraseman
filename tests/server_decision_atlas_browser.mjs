import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const html = readFileSync('.codex-tmp/server-decision-atlas/index.html', 'utf8');
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const address = server.address();
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.locator('#atlas-search').fill('руны');
  assert.equal(await page.locator('#atlas-search').inputValue(), 'руны');
  assert.match(await page.locator('#atlas-status').textContent(), /Показано \d+ из \d+ совпадений/u);
  assert.ok(await page.locator('#atlas-records article').count() > 0);
  await page.locator('#atlas-records article').first().locator('summary').click();
  const choice = page.locator('#atlas-records article').first().locator('[data-choice]').first();
  await choice.click();
  assert.match(await page.locator('.side').textContent(), /Мои решения[\s\S]+→/u);
  console.log('SERVER DECISION ATLAS BROWSER: PASS');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

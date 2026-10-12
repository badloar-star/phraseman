// Телефон макета в закрытом <details> и скрытый display:none (координатор 12.10, stitch_failed у profile-030): scripts/parity_shot.mjs revealPhone.
// Запуск: node --test tests/parity_shot_reveal.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { revealPhone } from '../scripts/parity_shot.mjs';

const HTML = `<body><main>
<article class="col"><div class="ph" style="height:100px">открытый</div></article>
<details><summary>проект</summary><article class="col"><div class="ph" style="height:100px">в details</div></article></details>
<article class="col" style="display:none"><div class="ph" style="height:100px">скрытый</div></article>
</main></body>`;

async function withPage(fn) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(HTML);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

test('телефон в закрытом <details> раскрывается и снимается', async () => {
  await withPage(async (page) => {
    const col = page.locator('.col').nth(1);
    assert.equal(await col.locator('.ph').isVisible(), false, 'до раскрытия виден не должен быть');
    await revealPhone(page, col, 2, 'x.html');
    assert.equal(await col.locator('.ph').isVisible(), true);
    const png = await col.locator('.ph').screenshot({ type: 'png', timeout: 3000 });
    assert.ok(png.length > 100);
  });
});

test('обычный телефон не ломается', async () => {
  await withPage(async (page) => {
    await revealPhone(page, page.locator('.col').nth(0), 1, 'x.html');
  });
});

test('телефон с display:none — понятная ошибка phone_hidden, не таймаут', async () => {
  await withPage(async (page) => {
    await assert.rejects(() => revealPhone(page, page.locator('.col').nth(2), 3, 'cards-states.html'), /phone_hidden:3 in cards-states\.html/);
  });
});

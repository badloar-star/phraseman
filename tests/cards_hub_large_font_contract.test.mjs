import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10, FONTSCALE2; переписано под «Карточки 2.0» 12.10): хаб «Карточки» при системном шрифте 2.0 не режет текст — подписи идут через FlowText (переносятся),
// hero растёт вместе с системным шрифтом, хаб всегда прокручивается (ScrollView), шрифт не сжимаем.
// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const source = fs.readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8').replace(/\r\n/g, '\n');

test('hero height grows with the system font, text is never shrunk', () => {
  assert.match(source, /const heroH = Math\.round\(192 \* \(fs > 1 \? Math\.min\(fs, 1\.4\) : 1\)\)/);
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
});

test('titles and captions wrap through FlowText; only single-word chips are clamped', () => {
  for (const style of ['styles.hw', 'styles.hs', 'styles.ctaText', 'styles.ytt', 'styles.vt', 'styles.crTitle']) {
    const wraps = source.includes(`provenance="external" style={[${style},`) || source.includes(`provenance="authored" style={[${style},`);
    assert.ok(wraps, `${style} wraps through FlowText`);
  }
});

test('the hub scrolls always, so nothing is cut at large fonts', () => {
  assert.match(source, /<ScrollView testID="fc-cards-hub-v2"/);
});

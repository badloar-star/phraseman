import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/home/v2/HomeV2FeatureTiles.tsx', import.meta.url), 'utf8');

// зачем (владелец 11.11: «всегда иконки должны быть отцентрированы»; макет home_tiles_mockup утверждён): прежний пин «предмет прижат влево» заменён —
// предмет и название стоят по центру плитки в рядах из двух, трёх и четырёх плиток.
test('active V2 feature tiles keep art and title centered and never clip their copy', () => {
  assert.doesNotMatch(source, /alignItems: 'flex-start'/);
  assert.doesNotMatch(source, /paddingLeft:/);
  assert.match(source, /art: \{[^}]*alignItems: 'center', justifyContent: 'center'/);
  for (const name of ['title', 'titleDense', 'sceneTileTitle', 'iconTitle']) {
    assert.match(source, new RegExp(`${name}: \\{[^}]*textAlign: 'center'`), `${name}: название по центру`);
  }
  // зачем (17.10): арт плиток рисует ThemedArtLayers — по умолчанию contentFit 'contain'; запрещаем только обрезку («cover»)
  const artLayers = readFileSync(new URL('../components/theme/ThemedArtLayers.tsx', import.meta.url), 'utf8');
  assert.ok(/contentFit="contain"/.test(source) || (/<ThemedArtLayers /.test(source) && /contentFit = 'contain'/.test(artLayers)), 'арт плиток должен вписываться (contain)');
  assert.doesNotMatch(source, /contentFit="cover"/);
  assert.doesNotMatch(source, /numberOfLines=/);
  // зачем (владелец 04.10: «убери подтексты, убери стрелочки, сделай их равными, как квадраты»):
  // плитка — квадрат; подписи и круглой стрелки на плитке нет (подпись осталась только для диктора).
  assert.match(source, /aspectRatio: 1/);
  assert.doesNotMatch(source, /\{tile\.subtitle\}<\/Text>/);
  assert.doesNotMatch(source, /chevron-forward/);
});

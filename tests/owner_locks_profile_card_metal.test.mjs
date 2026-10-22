// Сторожа замков владельца (реестр docs/work/OWNER_LOCKS.md; правило 22.10 «чтобы правки, что я сделаю, потом никто не перезаписал»).
// Ослабить или удалить — только по новому слову владельца; слово сессии или координатора этого не разрешает.
//
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «палитры визиток — свои» — виды визитки (profile_card_looks, ProfileCardBackdrop) держат свои палитры,
// а не токены текущей темы (кнопка владельца на вопрос МОМЕНТОВ после волны 1 цветов).
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «металл рангов оставить» — монета ранга рисуется своим ассетом без перекраски, золотое кольцо «Обсидиана»
// и тёплый свет повышения ранга — металл (кнопка владельца на тот же вопрос).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const THEME_TOKENS = /liquidGlassThemePalette|liquidGlassTokens|useShadowGlass|useFriendsGlass|useTheme\(/;

test('ЗАМОК ВЛАДЕЛЬЦА 22.10 «палитры визиток — свои»: виды визитки не берут цвета из темы', () => {
  for (const rel of ['components/profile-card/profile_card_looks.ts', 'components/profile-card/ProfileCardBackdrop.tsx']) {
    const src = read(rel);
    assert.doesNotMatch(src, THEME_TOKENS, `${rel}: палитра вида визитки перешла на токены темы — замок владельца`);
    assert.match(src, /ЗАМОК ВЛАДЕЛЬЦА 22\.10: «палитры визиток — свои»/, `${rel}: нет пометки замка`);
  }
  const bgs = [...read('components/profile-card/profile_card_looks.ts').matchAll(/\bbg: '(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1]);
  assert.ok(bgs.length >= 7, `видов визитки со своим фоном ${bgs.length}, ожидалось не меньше 7`);
});

test('ЗАМОК ВЛАДЕЛЬЦА 22.10 «металл рангов оставить»: монета — ассет без перекраски, кольцо и свет повышения — золото', () => {
  const coin = read('components/profile-card/ProfileCardCoin.tsx');
  assert.match(coin, /source=\{row\.source\}/, 'монета визитки рисуется не ассетом ранга');
  assert.doesNotMatch(coin, /tintColor/, 'монету визитки перекрасили');
  assert.match(coin, /colors=\{\['#FFF1C9', '#B58A3E', '#F6DC9C', '#7A5A26', '#E9C983'\]\}/, 'золотое кольцо «Обсидиана» больше не металл');
  assert.match(coin, /ЗАМОК ВЛАДЕЛЬЦА 22\.10: «металл рангов оставить»/);

  const rankUp = read('components/profile-card/ProfileCardRankUp.tsx');
  for (const gold of ['#FFECBE', '#FFF0C8', '#FFD278', '#FFF8E4', '#FFF3CF', '#FFDC96', '#FFE6AA']) {
    assert.ok(rankUp.includes(gold), `свет повышения ранга потерял золото ${gold}`);
  }
  assert.match(rankUp, /ЗАМОК ВЛАДЕЛЬЦА 22\.10: «металл рангов оставить»/);

  const momentCoin = read('components/moments/MomentCoin.tsx');
  assert.match(momentCoin, /<SpireRankCoin rank=\{rank\} size=\{size\} \/>/, 'монета моментов рисуется не ассетом ранга');
  assert.doesNotMatch(momentCoin, /tintColor/, 'монету моментов перекрасили');
  assert.match(momentCoin, /ЗАМОК ВЛАДЕЛЬЦА 22\.10: «металл рангов оставить»/);
});

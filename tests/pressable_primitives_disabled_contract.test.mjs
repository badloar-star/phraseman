// зачем (координатор 13.10, по следам регрессии 21cf84b2e): с 10.10 V2Pressable ставил `[style, { opacity }]` — прозрачность
// нажатия перекрывала приглушение вызывающего, и «недоступные» кнопки по всему приложению выглядели активными. Сторож на каждую
// общую нажимаемую обёртку: (1) `disabled` доходит до нажимаемого элемента — кнопка не нажимается; (2) прозрачность из стиля
// вызывающего не затирается прозрачностью нажатия — кнопка гаснет. Анимации в тестовой среде подменены, поэтому сторож по исходнику.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const PRIMITIVES = [
  {
    file: 'components/v2/V2Pressable.tsx',
    disabled: /disabled=\{disabled\}/,
    // прозрачность стиля умножается на прозрачность нажатия
    keepsDim: /Animated\.multiply\(opacity, baseOpacity\)[\s\S]*opacity: layerOpacity/,
  },
  {
    file: 'components/KitTouchable.tsx',
    disabled: /disabled=\{disabled\}/,
    keepsDim: /Animated\.multiply\(pressOpacity, baseOpacity\)/,
  },
  {
    file: 'components/DuoPressable.tsx',
    disabled: /disabled=\{disabled\}/,
    // прозрачность из стиля поверхности переносится на внешний слой
    keepsDim: /surfaceOpacityStyle[\s\S]*style=\{\[styles\.wrap,[^\]]*surfaceOpacityStyle/,
  },
  {
    file: 'components/PressableHybrid.tsx',
    disabled: /disabled=\{unavailable\}/,
    // стиль вызывающего — на самом Pressable, анимируется только внутренний слой
    keepsDim: /style=\{\[\{ alignSelf: 'stretch' \}, style\]\}/,
  },
  {
    file: 'components/PressableScale.tsx',
    disabled: /disabled=\{unavailable\}/,
    keepsDim: /style=\{\[\{ alignSelf: 'stretch' \}, style\]\}/,
  },
  {
    file: 'components/TapScale.tsx',
    disabled: /disabled=\{disabled\}/,
    keepsDim: /<Pressable[\s\S]*?style=\{style\}/,
  },
];

for (const p of PRIMITIVES) {
  test(`${p.file}: disabled не нажимается и гаснет`, () => {
    const src = read(p.file);
    assert.match(src, p.disabled, 'disabled не доходит до нажимаемого элемента');
    assert.match(src, p.keepsDim, 'прозрачность вызывающего может затираться прозрачностью нажатия');
  });
}

// Форма самой регрессии: стиль вызывающего, а за ним голое значение прозрачности нажатия — оно перекрывает приглушение.
const BUG_SHAPE = /style=\{\[\s*style,\s*\{\s*opacity(?:\s*:\s*(?:opacity|pressOpacity))?\s*,\s*transform/;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

test('нигде в components/ нет `[style, { opacity, transform }]` — прозрачность нажатия поверх приглушения', () => {
  const offenders = walk(path.join(root, 'components'), [])
    // KitTouchable называет `opacity` уже перемноженный узел — такое место честное.
    .filter((file) => { const src = fs.readFileSync(file, 'utf8'); return BUG_SHAPE.test(src) && !/Animated\.multiply\(/.test(src); })
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, [], `затирают приглушение: ${offenders.join(', ')}`);
});

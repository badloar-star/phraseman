'use strict';

function connectedLightNeutralBackground(data, width, height, channels) {
  const pixelCount = width * height;
  const background = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const isLightNeutral = (index) => {
    const offset = index * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= 222 && max - min <= 18;
  };
  const enqueue = (index) => {
    if (background[index] || !isLightNeutral(index)) return;
    background[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const current = queue[head++];
    const x = current % width;
    if (x > 0) enqueue(current - 1);
    if (x + 1 < width) enqueue(current + 1);
    if (current >= width) enqueue(current - width);
    if (current + width < pixelCount) enqueue(current + width);
  }

  return background;
}

module.exports = { connectedLightNeutralBackground };

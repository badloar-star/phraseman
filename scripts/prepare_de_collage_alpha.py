"""Create RGBA copies of the 50 DE collage illustrations without touching sources.

The generated source art has a solid bright-blue key field at the left.  We remove
only blue pixels connected to the left edge, which preserves blue objects inside
the actual illustration on the right side.  The white torn-paper edge remains.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_key_blue(red: int, green: int, blue: int) -> bool:
    """Return true for the deliberately saturated chroma-blue backdrop only."""
    return blue >= 135 and blue >= red * 1.45 and blue >= green * 1.20


def remove_left_connected_key(source: Path, destination: Path) -> tuple[int, int]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    for y in range(height):
        red, green, blue, _ = pixels[0, y]
        if is_key_blue(red, green, blue):
            queue.append((0, y))

    removed = 0
    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if visited[index]:
            continue
        visited[index] = 1
        red, green, blue, alpha = pixels[x, y]
        if not is_key_blue(red, green, blue):
            continue
        pixels[x, y] = (red, green, blue, 0)
        removed += 1
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                next_index = next_y * width + next_x
                if not visited[next_index]:
                    queue.append((next_x, next_y))

    destination.parent.mkdir(parents=True, exist_ok=True)
    # PNG optimisation is intentionally omitted: it is much slower than the
    # keying itself and does not affect how CapCut renders the alpha channel.
    image.save(destination)
    return width * height, removed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    sources = sorted(args.source.glob("*.png"))
    if len(sources) != 50:
        raise SystemExit(f"Expected 50 source PNGs, found {len(sources)} in {args.source}")

    total = 0
    removed = 0
    for source in sources:
        pixels, transparent = remove_left_connected_key(source, args.destination / source.name)
        total += pixels
        removed += transparent

    print(f"Prepared {len(sources)} RGBA PNGs; transparent pixels: {removed}/{total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

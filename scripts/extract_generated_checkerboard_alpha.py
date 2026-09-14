"""Convert the generator's baked neutral checkerboard preview into real PNG alpha.

The image generator can return an RGB image with a white/grey checkerboard painted
into its background.  This script removes only neutral light/grey pixels connected
to the outside canvas, preserving the rendered subjects and props.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


def looks_like_checkerboard_background(red: int, green: int, blue: int) -> bool:
    """The preview squares are near-neutral and bright/medium grey."""
    return max(red, green, blue) - min(red, green, blue) <= 10 and min(red, green, blue) >= 155


def extract_alpha(source: Path, destination: Path, key_green: bool = False) -> tuple[int, int]:
    source_image = Image.open(source).convert("RGBA")
    image = source_image.convert("RGB")
    width, height = image.size
    pixels = image.load()
    transparent = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def is_background(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        if key_green:
            # Chroma key: retain only the intentionally saturated green backdrop.
            return green >= 150 and green >= red * 1.55 and green >= blue * 1.55
        return looks_like_checkerboard_background(red, green, blue)

    def add_if_background(x: int, y: int) -> None:
        index = y * width + x
        if transparent[index]:
            return
        if is_background(x, y):
            transparent[index] = 1
            queue.append((x, y))

    for x in range(width):
        add_if_background(x, 0)
        add_if_background(x, height - 1)
    for y in range(height):
        add_if_background(0, y)
        add_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                add_if_background(nx, ny)

    rgba = source_image.copy()
    alpha = rgba.getchannel("A")
    alpha_data = bytearray(alpha.tobytes())
    for index, is_background in enumerate(transparent):
        if is_background:
            alpha_data[index] = 0
    alpha.frombytes(bytes(alpha_data))
    rgba.putalpha(alpha)
    destination.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(destination)
    return sum(transparent), width * height


def remove_all_green(source: Path, destination: Path) -> tuple[int, int, int, int, int]:
    """Remove every chroma-green island and neutralize weak green edge spill.

    Flood fill is deliberately not used here: furniture and crossed limbs can
    enclose pieces of the green screen, making them disconnected from the
    canvas edge. The generation prompts forbid green subjects and props, so a
    global chroma mask is the correct invariant for this asset set.
    """
    rgba = np.array(Image.open(source).convert("RGBA"), dtype=np.uint8)
    red = rgba[:, :, 0].astype(np.int32)
    green = rgba[:, :, 1].astype(np.int32)
    blue = rgba[:, :, 2].astype(np.int32)
    alpha = rgba[:, :, 3]
    max_rb = np.maximum(red, blue)
    dominance = green - max_rb

    # Strong chroma green becomes fully transparent everywhere, including
    # enclosed holes between chairs, tables, arms, and other props.
    chroma = (
        (alpha > 0)
        & (green >= 60)
        & (dominance >= 8)
        & (green * 100 >= max_rb * 108)
    )
    removed = int(np.count_nonzero(chroma))
    rgba[:, :, 3][chroma] = 0

    # Remove the remaining weak green halo without eroding subject opacity.
    visible = rgba[:, :, 3] > 0
    weak_spill = visible & (green > max_rb)
    spill_count = int(np.count_nonzero(weak_spill))
    rgba[:, :, 1][weak_spill] = np.clip(max_rb[weak_spill], 0, 255).astype(np.uint8)

    # Baked chroma also contaminates antialiased hair/fabric edges without
    # remaining the strongest RGB channel. Compare each boundary pixel with
    # the nearest opaque interior pixel: only extra green relative to that
    # local material colour is removed, so genuinely yellow props stay yellow.
    red = rgba[:, :, 0].astype(np.float32)
    green = rgba[:, :, 1].astype(np.float32)
    blue = rgba[:, :, 2].astype(np.float32)
    alpha_float = rgba[:, :, 3].astype(np.float32)
    visible = alpha_float > 0
    distance_to_alpha_edge = distance_transform_edt(visible)
    edge = visible & (distance_to_alpha_edge <= 7)
    core = visible & (distance_to_alpha_edge > 9)
    distance_to_core, nearest_core = distance_transform_edt(~core, return_indices=True)
    reference_red = red[nearest_core[0], nearest_core[1]]
    reference_green = green[nearest_core[0], nearest_core[1]]
    reference_blue = blue[nearest_core[0], nearest_core[1]]

    green_index = (2 * green - red - blue) / (red + green + blue + 60)
    reference_green_index = (
        (2 * reference_green - reference_red - reference_blue)
        / (reference_red + reference_green + reference_blue + 60)
    )
    extra_green = green_index - reference_green_index
    edge_spill = (
        edge
        & (distance_to_core <= 22)
        & (extra_green > 0.055)
        & (green >= 35)
    )
    edge_spill_count = int(np.count_nonzero(edge_spill))
    target_green = (
        reference_green_index * (red + blue + 60) + red + blue
    ) / (2 - reference_green_index)
    rgba[:, :, 1][edge_spill] = np.clip(
        np.minimum(green[edge_spill], target_green[edge_spill]), 0, 255
    ).astype(np.uint8)

    spill_strength = (
        np.clip((extra_green - 0.055) / 0.35, 0, 0.68)
        * np.clip((8 - distance_to_alpha_edge) / 7, 0, 1)
    )
    target_alpha = 255 * (1 - spill_strength)
    alpha_float[edge_spill] = np.minimum(
        alpha_float[edge_spill], target_alpha[edge_spill]
    )

    # A two-pixel idempotent feather replaces the generator's hard opaque rim.
    feather = visible & (distance_to_alpha_edge < 2.25)
    feather_count = int(np.count_nonzero(feather))
    feather_curve = np.clip((distance_to_alpha_edge - 0.35) / 1.9, 0.22, 1.0)
    alpha_float[feather] = np.minimum(
        alpha_float[feather], 255 * feather_curve[feather]
    )
    rgba[:, :, 3] = np.clip(alpha_float, 0, 255).astype(np.uint8)

    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(destination)
    return (
        removed,
        spill_count,
        edge_spill_count,
        feather_count,
        rgba.shape[0] * rgba.shape[1],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--key-green", action="store_true")
    parser.add_argument("--remove-all-green", action="store_true")
    args = parser.parse_args()
    if args.remove_all_green:
        removed, spill_count, edge_spill_count, feather_count, total = remove_all_green(
            args.source, args.destination
        )
    else:
        removed, total = extract_alpha(args.source, args.destination, args.key_green)
        spill_count = 0
        edge_spill_count = 0
        feather_count = 0
    result = Image.open(args.destination)
    assert result.mode == "RGBA"
    assert result.getchannel("A").getextrema()[0] == 0
    print(
        f"removed_background_pixels={removed}; despilled_pixels={spill_count}; "
        f"edge_despilled_pixels={edge_spill_count}; feathered_pixels={feather_count}; "
        f"total_pixels={total}; mode={result.mode}"
    )


if __name__ == "__main__":
    main()

"""Restore raw Codex image results that were generated but not copied to the A1 pack."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageOps


TARGET = Path(r"C:\Users\badlo\Desktop\A1_RU_300_3D_9x16")
BLOCKS = (
    (101, 200, Path(r"C:\Users\badlo\.codex\generated_images\019ff744-8ed4-7373-b636-6b7b5ad0cfef")),
    (201, 300, Path(r"C:\Users\badlo\.codex\generated_images\019ff744-e460-7630-8ccd-e2d6dc33269d")),
)


def normalized_pixels(path: Path) -> bytes:
    with Image.open(path) as image:
        fitted = ImageOps.fit(image.convert("RGB"), (32, 32), method=Image.Resampling.LANCZOS)
        return fitted.tobytes()


def mse(left: bytes, right: bytes) -> float:
    return sum((a - b) ** 2 for a, b in zip(left, right, strict=True)) / len(left)


def write_normalized(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        fitted = ImageOps.fit(image.convert("RGB"), (1080, 1920), method=Image.Resampling.LANCZOS)
        fitted.save(destination, format="PNG", optimize=True)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    restored: list[str] = []
    for start, end, source_dir in BLOCKS:
        raw = sorted(source_dir.glob("*.png"), key=lambda path: path.stat().st_mtime)
        if len(raw) != 100:
            raise RuntimeError(f"{source_dir} has {len(raw)} raw images instead of 100")
        # Prove that the saved prefix follows the session's chronological result order.
        existing = [number for number in range(start, end + 1) if (TARGET / f"{number:03d}.png").exists()]
        for number in existing:
            rank = number - start
            score = mse(normalized_pixels(TARGET / f"{number:03d}.png"), normalized_pixels(raw[rank]))
            if score > 5.0:
                raise RuntimeError(f"session ordering no longer matches saved image {number:03d} (MSE {score:.2f})")
        for number in range(start, end + 1):
            destination = TARGET / f"{number:03d}.png"
            if destination.exists():
                continue
            write_normalized(raw[number - start], destination)
            restored.append(destination.name)
    numbers = {int(path.stem) for path in TARGET.glob("[0-9][0-9][0-9].png")}
    missing = [number for number in range(1, 301) if number not in numbers]
    invalid = []
    for number in range(1, 301):
        path = TARGET / f"{number:03d}.png"
        with Image.open(path) as image:
            if image.size != (1080, 1920):
                invalid.append(path.name)
    if missing or invalid:
        raise RuntimeError(f"pack validation failed; missing={missing}, invalid={invalid}")
    print({"restored": restored, "count": len(restored), "total": len(numbers)})


if __name__ == "__main__":
    main()

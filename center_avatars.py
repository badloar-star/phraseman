"""
Re-centers avatar images by finding the bounding box of non-transparent
pixels and placing the content at the center of the canvas.
Works with both static PNG and animated GIF files.
"""
import os
import sys
from PIL import Image

ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'images', 'levels')
MARGIN = 8   # pixels of transparent padding to keep around the content


def bbox_all_frames(img):
    """Return the union bounding box of visible (alpha>0) pixels across all frames."""
    left, upper, right, lower = 9999, 9999, 0, 0
    n = getattr(img, 'n_frames', 1)
    for f in range(n):
        img.seek(f)
        frame = img.convert('RGBA')
        r, g, b, a = frame.split()
        bb = a.getbbox()
        if bb:
            left  = min(left,  bb[0])
            upper = min(upper, bb[1])
            right = max(right, bb[2])
            lower = max(lower, bb[3])
    return (left, upper, right, lower) if right > 0 else None


def center_static(img):
    """Center a static RGBA image on its canvas."""
    rgba = img.convert('RGBA')
    bb = rgba.split()[3].getbbox()
    if not bb:
        return img

    cx = (bb[0] + bb[2]) / 2
    cy = (bb[1] + bb[3]) / 2
    w, h = rgba.size
    dx = round(w / 2 - cx)
    dy = round(h / 2 - cy)

    if abs(dx) < 2 and abs(dy) < 2:
        print(f'  -> already centered (dx={dx}, dy={dy}), skip')
        return img

    print(f'  -> shifting dx={dx}, dy={dy}')
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(rgba, (dx, dy))
    return out


def center_gif(img):
    """Center an animated GIF. Returns list of RGBA frames + durations."""
    bb = bbox_all_frames(img)
    if not bb:
        return None

    w, h = img.size
    cx = (bb[0] + bb[2]) / 2
    cy = (bb[1] + bb[3]) / 2
    dx = round(w / 2 - cx)
    dy = round(h / 2 - cy)

    if abs(dx) < 2 and abs(dy) < 2:
        print(f'  -> already centered (dx={dx}, dy={dy}), skip')
        return None

    print(f'  -> shifting dx={dx}, dy={dy}')
    frames, durations = [], []
    n = getattr(img, 'n_frames', 1)
    for f in range(n):
        img.seek(f)
        duration = img.info.get('duration', 100)
        frame = img.convert('RGBA')
        out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        out.paste(frame, (dx, dy))
        frames.append(out)
        durations.append(duration)
    return frames, durations


def process_file(path):
    fname = os.path.basename(path)
    print(f'Processing {fname}...')
    img = Image.open(path)

    is_gif = path.lower().endswith('.gif')
    if is_gif and getattr(img, 'n_frames', 1) > 1:
        result = center_gif(img)
        if result is None:
            return
        frames, durations = result
        # Save as GIF (convert RGBA → P with transparency)
        frames[0].save(
            path,
            save_all=True,
            append_images=frames[1:],
            loop=0,
            duration=durations,
            disposal=2,
            optimize=False,
        )
    else:
        centered = center_static(img)
        if centered is img:
            return
        centered.save(path)


def main():
    files = sorted(f for f in os.listdir(ASSETS_DIR) if f.endswith(('.png', '.gif')))
    print(f'Found {len(files)} files in {ASSETS_DIR}\n')
    for fname in files:
        process_file(os.path.join(ASSETS_DIR, fname))
    print('\nDone.')


if __name__ == '__main__':
    main()

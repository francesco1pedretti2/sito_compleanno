#!/usr/bin/env python3
"""
Prepara una foto gigante per lo zoom "infinito" del sito.

Uso:   python3 crea_tasselli.py foto/mosaico.jpg
Serve: pip install pillow

Crea accanto alla foto:
  - <nome>_preview.jpg   versione leggera (max 2800 px) mostrata nella pagina
  - <nome>_tiles/        piramide di tasselli 512x512 (livello 0 = risoluzione piena)

Alla fine stampa gli attributi da copiare sul <button id="mosaicZoomOpen"> in index.html.
"""
import math
import os
import shutil
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

TILE = 512            # lato dei tasselli
MIN_LEVEL_WIDTH = 2000  # sotto questa larghezza basta l'anteprima, niente altri livelli
PREVIEW_SIDE = 2800   # lato lungo dell'anteprima
TILE_QUALITY = 82
PREVIEW_QUALITY = 85


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    base = os.path.splitext(src)[0]
    out_dir = base + "_tiles"
    preview_path = base + "_preview.jpg"

    img = Image.open(src).convert("RGB")
    width, height = img.size
    print(f"Foto: {width}x{height}")

    # Anteprima leggera
    scale = min(1.0, PREVIEW_SIDE / max(width, height))
    preview = img.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
    preview.save(preview_path, "JPEG", quality=PREVIEW_QUALITY, optimize=True, progressive=True)
    print(f"Anteprima: {preview_path} ({preview.size[0]}x{preview.size[1]})")

    # Piramide di tasselli
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)

    level = 0
    current = img
    total = 0
    while True:
        lw, lh = current.size
        folder = os.path.join(out_dir, str(level))
        os.makedirs(folder, exist_ok=True)
        cols, rows = math.ceil(lw / TILE), math.ceil(lh / TILE)
        for ty in range(rows):
            for tx in range(cols):
                box = (tx * TILE, ty * TILE, min((tx + 1) * TILE, lw), min((ty + 1) * TILE, lh))
                current.crop(box).save(
                    os.path.join(folder, f"{tx}_{ty}.jpg"), "JPEG", quality=TILE_QUALITY, optimize=True
                )
                total += 1
        print(f"Livello {level}: {lw}x{lh} -> {cols * rows} tasselli")
        next_w, next_h = math.ceil(lw / 2), math.ceil(lh / 2)
        if next_w < MIN_LEVEL_WIDTH:
            break
        current = current.resize((next_w, next_h), Image.LANCZOS)
        level += 1

    print(f"\nTasselli totali: {total}")
    print("\nAttributi per il <button id=\"mosaicZoomOpen\"> in index.html:")
    print(
        f'data-tiles="{out_dir.replace(os.sep, "/")}" data-width="{width}" '
        f'data-height="{height}" data-tile-size="{TILE}" data-levels="{level + 1}"'
    )
    print(f'\nE come src della foto nella pagina: {preview_path.replace(os.sep, "/")}')


if __name__ == "__main__":
    main()

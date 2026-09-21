#!/usr/bin/env python3
"""
把任意图片转成网页用的像素矩阵（JS 数组）。

────────────────────────────────────────────────────────
为什么矩阵是 79 列 x 36 行而不是正方形？
────────────────────────────────────────────────────────
网页上每个"像素"其实是一个 `█` 字符，字符格子不是正方形，
而是 **6px 宽 x 13px 高**（宽高比 0.46，竖长条）。

所以要让画面显示成正常比例，矩阵本身就得反过来提前拉宽：

        列数 = 行数 x (图宽/图高) x (格子高/格子宽)
             = 行数 x (图宽/图高) x (13/6)

1:1 的正方图、36 行 → 36 x 1 x 2.1667 = 78 列。
渲染成 78x6 = 468px 宽、36x13 = 468px 高，正好还原成正方形。

这一步是整站最容易踩坑的地方：矩阵比例错了，画面就会横向拉长。

用法：
    python3 tools/make-pixels.py                  # 读 public/avatar.png
    python3 tools/make-pixels.py 路径/照片.jpg     # 指定图片
    python3 tools/make-pixels.py --rows 48        # 提高精度（列数自动跟着变）
    python3 tools/make-pixels.py --placeholder    # 生成程序化占位图
"""

import os
import sys
import math
import json
import zlib
import struct
import argparse

# 一个"像素"字符的实际显示尺寸，必须和 src/styles/global.css 里的 .pixel 保持一致
CELL_W = 6
CELL_H = 13

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JS = os.path.join(ROOT, 'src', 'data', 'pixels.js')
PREVIEW = os.path.join(ROOT, 'tools', 'preview.png')
CUTOUT = os.path.join(ROOT, 'public', 'avatar-cutout.png')


def save_cutout(img, path):
    """把抠成纯黑的背景转成真透明，存成 PNG 给窄屏的圆形头像用。

    只在原分辨率上做（不经过降采样），所以不会误伤主体 ——
    这张皮肤最深的地方是 rgb(40,37,59)，不是纯黑。
    """
    rgba = img.convert('RGBA')
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            if r == 0 and g == 0 and b == 0:
                px[x, y] = (0, 0, 0, 0)
    rgba.save(path)


# ──────────────────────────── 输出 ────────────────────────────

def write_png(path, cols, rows, pixels, zoom=2):
    """纯标准库写 PNG，不依赖 Pillow。

    按字符格子的真实比例（6 : 13）渲染，所以输出来的就是网页上肉眼看到的画面。
    """
    cw, ch = CELL_W * zoom, CELL_H * zoom
    W, H = cols * cw, rows * ch
    raw = bytearray()
    for y in range(H):
        raw.append(0)                       # filter: none
        base = (y // ch) * cols
        for x in range(W):
            raw += bytes(pixels[base + x // cw])

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def emit_js(cols, rows, pixels, path):
    lines = [
        '// 本文件由 tools/make-pixels.py 自动生成，不要手改',
        '// 换头像：覆盖 public/avatar.png 后运行 `npm run pixels`',
        '',
        f'export const pixelCols = {cols}',
        f'export const pixelRows = {rows}',
        '',
        'export const pixels = [',
    ]
    for y in range(rows):
        row = pixels[y * cols:(y + 1) * cols]
        lines.append('  [' + ','.join(f'[{r},{g},{b}]' for r, g, b in row) + '],')
    lines.append(']')
    lines.append('')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


# ──────────────────────────── 图片处理 ────────────────────────────

def compute_grid(img_w, img_h, rows):
    """按字符格子宽高比反推列数，保证显示不变形。"""
    cols = round(rows * (img_w / img_h) * (CELL_H / CELL_W))
    return max(8, min(cols, 400))


def placeholder_pixels(cols, rows):
    """程序化生成一张占位图：深底 + 渐变球体 + 高光。"""
    Wd, Hd = cols * CELL_W, rows * CELL_H
    cx, cy = Wd / 2, Hd / 2
    R = min(Wd, Hd) * 0.44
    out = []
    for y in range(rows):
        for x in range(cols):
            dx = x * CELL_W + CELL_W / 2 - cx
            dy = y * CELL_H + CELL_H / 2 - cy
            d = math.hypot(dx, dy)

            if d > R:
                # 背景：极暗带一点点网格感
                v = 10 if (x + y) % 2 == 0 else 13
                out.append((v, v, v + 2))
                continue

            # 球面法线 → 简单朗伯光照
            z = math.sqrt(max(0.0, 1 - (d / R) ** 2))
            lx, ly, lz = -0.6, -0.7, 0.55          # 光从左上来
            nl = max(0.0, (dx / R) * lx + (dy / R) * ly + z * lz)
            shade = 0.22 + 0.78 * nl

            t = d / R                               # 0 中心 → 1 边缘
            r = (0x7F * (1 - t) + 0x1D * t) * shade
            g = (0x77 * (1 - t) + 0x9E * t) * shade
            b = (0xDD * (1 - t) + 0x75 * t) * shade

            # 边缘加一点暗角
            if t > 0.85:
                k = (t - 0.85) / 0.15
                r, g, b = r * (1 - 0.5 * k), g * (1 - 0.5 * k), b * (1 - 0.5 * k)

            out.append((int(max(0, min(255, r))),
                        int(max(0, min(255, g))),
                        int(max(0, min(255, b)))))
    return out


def prepare(img, remove_bg=True, trim=True, tolerance=30):
    """抠掉边缘连通的纯色背景，再把画面裁到主体、扩成正方形。

    抠底用 flood-fill 从四角往里吃，只吃「与边缘连通」的背景，
    所以主体内部的同色区域不会被误伤（比全局替换某个颜色安全得多）。
    填成纯黑之后，getbbox() 天然会把黑色当空白，主体包围盒直接就有了。
    """
    from PIL import ImageDraw

    if remove_bg:
        w, h = img.size
        for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
            try:
                ImageDraw.floodfill(img, seed, (0, 0, 0), thresh=tolerance)
            except Exception:
                pass

    if trim:
        bbox = img.getbbox()
        if bbox:
            left, top, right, bottom = bbox
            # 扩成正方形，四周留 6% 呼吸空间
            side = int(max(right - left, bottom - top) * 1.12)
            cx, cy = (left + right) // 2, (top + bottom) // 2
            img = img.crop((cx - side // 2, cy - side // 2,
                            cx + side // 2, cy + side // 2))

    return img


def from_image(path, rows, remove_bg=True, trim=True):
    try:
        from PIL import Image
    except ImportError:
        sys.exit(
            '需要 Pillow 来读取图片。装一下：\n'
            '  pip install Pillow\n'
            '或者先用 --placeholder 生成占位矩阵。'
        )

    with Image.open(path) as im:
        img = im.convert('RGB')
        original = img.size

    img = prepare(img, remove_bg=remove_bg, trim=trim)

    # 抠底裁剪之后尺寸变了，列数要按新尺寸重新算
    cols = compute_grid(img.size[0], img.size[1], rows)
    small = img.resize((cols, rows), Image.LANCZOS)
    # Pillow 12 把 getdata() 改名成 get_flattened_data()，这里两个都兼容
    if hasattr(small, 'get_flattened_data'):
        px = list(small.get_flattened_data())
    else:
        px = list(small.getdata())
    return px, original, img, cols


def find_avatar():
    for name in ('avatar.png', 'avatar.jpg', 'avatar.jpeg', 'avatar.webp'):
        p = os.path.join(ROOT, 'public', name)
        if os.path.exists(p):
            return p
    return None


# ──────────────────────────── 主流程 ────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='生成像素矩阵')
    ap.add_argument('image', nargs='?', help='图片路径，默认 public/avatar.png')
    ap.add_argument('--rows', type=int, default=36, help='矩阵行数，默认 36')
    ap.add_argument('--placeholder', action='store_true', help='忽略图片，生成程序化占位图')
    ap.add_argument('--no-bg', action='store_true', help='不抠背景（默认抠掉边缘连通的纯色底）')
    ap.add_argument('--no-trim', action='store_true', help='不裁剪到主体')
    args = ap.parse_args()

    if args.placeholder:
        cols = compute_grid(1, 1, args.rows)        # 按正方形算
        rows = args.rows
        px = placeholder_pixels(cols, rows)
        src = '程序化占位图'
        # 没有头像时补一张占位图（已经有就绝不覆盖，免得盖掉你放的照片）
        placeholder_avatar = os.path.join(ROOT, 'public', 'avatar.png')
        if not os.path.exists(placeholder_avatar):
            write_png(placeholder_avatar, cols, rows, px, 2)
            print(f'已生成占位头像  public/avatar.png')
    else:
        img_path = args.image or find_avatar()
        if not img_path or not os.path.exists(img_path):
            sys.exit(f'找不到图片：{img_path}\n放一张 public/avatar.png，或用 --placeholder。')

        rows = args.rows
        px, original, processed, cols = from_image(
            img_path, rows, remove_bg=not args.no_bg, trim=not args.no_trim
        )
        src = f'{os.path.relpath(img_path, ROOT)}  ({original[0]}x{original[1]})'
        if original != processed.size:
            src += f'  →  抠底裁剪后 {processed.size[0]}x{processed.size[1]}'

        # 顺手给窄屏的圆形头像备一份：抠底时存成真透明，
        # 没抠底就直接拷贝一份，保证配置里引用的文件一定存在
        if args.no_bg:
            processed.convert('RGBA').save(CUTOUT)
        else:
            save_cutout(processed, CUTOUT)

    emit_js(cols, rows, px, OUT_JS)
    write_png(PREVIEW, cols, rows, px, 2)

    disp_w, disp_h = cols * CELL_W, rows * CELL_H
    print(f'源          {src}')
    print(f'矩阵        {cols} 列 x {rows} 行 = {cols * rows} 个像素')
    print(f'显示尺寸    {disp_w} x {disp_h} px   比例 {disp_w / disp_h:.3f}')
    print(f'矩阵比例    {cols / rows:.3f}   (字符宽高比 {CELL_W / CELL_H:.3f} 已抵消)')
    print(f'已写入      {os.path.relpath(OUT_JS, ROOT)}')
    print(f'预览图      {os.path.relpath(PREVIEW, ROOT)}  (按真实观感渲染，放大 2 倍)')


if __name__ == '__main__':
    main()

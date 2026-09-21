#!/usr/bin/env python3
"""
把 QQ / 微信的联系方式图处理成站点用的 public/contact.jpg。

两种情况都覆盖：
  · 名片式长图（头像 + 昵称 + QQ 号 + 二维码 + 水印）→ 默认**保持原本的长方形**
  · 纯二维码图 → 用 --qr-only 只留二维码，再配 --square 补静默区

处理的事：
  1. 自动去掉多余背景（QQ 界面、桌面、阴影）
  2. 裁到内容（默认整张卡片；--qr-only 则只留二维码）
  3. --square 时补静默区 —— 二维码四周必须留白才扫得出来，
     自己截图裁太紧贴上去会扫不出来，这是最常见的翻车点
  4. 等比缩到合适宽度后覆盖 public/contact.jpg

用法：
    python3 tools/import-contact.py                      # 自动找最新截图，保留整张卡片
    python3 tools/import-contact.py 图片路径
    python3 tools/import-contact.py --clipboard          # 取剪贴板（Cmd+Ctrl+Shift+4 截的）
    python3 tools/import-contact.py --qr-only --square   # 只要二维码，并补静默区
"""

import os
import sys
import glob
import argparse
import subprocess

try:
    from PIL import Image, ImageChops, ImageOps
except ImportError:  # 缺依赖先不崩，等 main 里给人话提示
    Image = ImageChops = ImageOps = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'contact.jpg')
CLIP_TMP = '/tmp/cangjie-clipboard.png'


def from_clipboard():
    """用 osascript 把剪贴板里的图片导出来 —— 这条路不需要屏幕录制权限。"""
    if os.path.exists(CLIP_TMP):
        os.remove(CLIP_TMP)
    script = [
        '-e',
        f'set theFile to (open for access POSIX file "{CLIP_TMP}" with write permission)',
        '-e',
        'write (the clipboard as «class PNGf») to theFile',
        '-e',
        'close access theFile',
    ]
    r = subprocess.run(['osascript', *script], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(CLIP_TMP):
        sys.exit('剪贴板里没有图片。先用 Cmd+Ctrl+Shift+4 框选二维码，再跑这条命令。')
    return CLIP_TMP


def newest_screenshot():
    """在桌面/下载目录里找最新的系统截图。"""
    home = os.path.expanduser('~')
    patterns = ['截屏*.png', '截屏*.jpg', '截屏*.jpeg',
                'Screen Shot*.png', 'Screenshot*.png', 'CleanShot*.png']
    found = []
    for folder in (os.path.join(home, 'Desktop'), os.path.join(home, 'Downloads')):
        for pat in patterns:
            found += glob.glob(os.path.join(folder, pat))
    return max(found, key=os.path.getmtime) if found else None


def _pixels(im):
    """兼容 Pillow 12 把 getdata() 改名成 get_flattened_data()。"""
    if hasattr(im, 'get_flattened_data'):
        return list(im.get_flattened_data())
    return list(im.getdata())


def detect_background(rgb):
    """四角各取一小块，众数当作背景色。"""
    w, h = rgb.size
    pad = min(14, w // 8, h // 8)
    samples = []
    for box in ((0, 0, pad, pad), (w - pad, 0, w, pad),
                (0, h - pad, pad, h), (w - pad, h - pad, w, h)):
        samples += _pixels(rgb.crop(box))
    return max(set(samples), key=samples.count)


def find_color_region(rgb, min_sat=28, min_ratio=0.25):
    """找高饱和像素最密集的那块区域 —— 二维码通常是图里唯一的大色块。

    QQ / 微信分享出来的二维码图都长这样：上面是头像和昵称、下面是「扫一扫」之类的水印，
    直接求"非背景包围盒"会把它们全框进来。这里改用饱和度当线索把二维码单独拎出来。

    返回 (left, top, right, bottom)，找不到就返回 None。
    """
    r, g, b = rgb.split()
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    mask = ImageChops.subtract(mx, mn).point(lambda v: 255 if v > min_sat else 0)

    w, h = mask.size
    mpx = mask.load()
    step = 2

    # 逐行数饱和像素。用「超过峰值一定比例的行」的 min/max 定上下边界，
    # 而不是找连续段 —— 圆点风格的二维码行与行之间有间隙，连续段会被切碎。
    rows = [sum(1 for x in range(0, w, step) if mpx[x, y]) for y in range(0, h, step)]
    if not rows or max(rows) == 0:
        return None
    row_threshold = max(rows) * min_ratio
    ys = [i * step for i, c in enumerate(rows) if c > row_threshold]
    if not ys:
        return None
    top, bottom = min(ys), max(ys)

    # 在纵向范围内再逐列数一次，定左右边界
    cols = [sum(1 for y in range(top, bottom + 1, step) if mpx[x, y]) for x in range(0, w, step)]
    if not cols or max(cols) == 0:
        return None
    col_threshold = max(cols) * min_ratio
    xs = [i * step for i, c in enumerate(cols) if c > col_threshold]
    if not xs:
        return None

    return (min(xs), top, max(xs) + 1, bottom + 1)


def crop_to_content(rgb, tolerance=40, qr_only=False):
    """默认裁到整张卡片的内容包围盒；qr_only=True 时只把二维码那一块拎出来。"""
    if qr_only:
        region = find_color_region(rgb)
        if region:
            left, top, right, bottom = region
            w, h = right - left, bottom - top
            # 二维码是正方形的，偏差太大说明认错了，退回通用逻辑
            if min(w, h) / max(w, h) > 0.75:
                return rgb.crop(region), detect_background(rgb)

    bg = detect_background(rgb)
    diff = ImageChops.difference(rgb, Image.new('RGB', rgb.size, bg)).convert('L')
    mask = diff.point(lambda v: 255 if v > tolerance else 0)
    bbox = mask.getbbox()
    return (rgb.crop(bbox) if bbox else rgb), bg


def square_with_quiet_zone(img, bg, quiet_ratio=0.08):
    """放进正方形画布，四周留出静默区（默认各边 8%）。"""
    w, h = img.size
    side = int(max(w, h) * (1 + quiet_ratio * 2))
    canvas = Image.new('RGB', (side, side), bg)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    return canvas


def pad_with_bg(img, bg, ratio=0.03):
    """四周补一点背景色留白，**保持原本的长宽比**（名片式长图走这条）。

    留白按短边算 —— 按最长边算的话，竖图左右会空出一大条。
    """
    m = int(min(img.size) * ratio)
    canvas = Image.new('RGB', (img.width + m * 2, img.height + m * 2), bg)
    canvas.paste(img, (m, m))
    return canvas


def main():
    ap = argparse.ArgumentParser(description='导入 QQ / 微信的联系方式图')
    ap.add_argument('image', nargs='?', help='图片路径，省略则自动找最新截图')
    ap.add_argument('--clipboard', action='store_true', help='从剪贴板取图')
    ap.add_argument('--qr-only', action='store_true',
                    help='只保留二维码那一块；默认保留整张卡片（带昵称头像那种名片图）')
    ap.add_argument('--square', action='store_true',
                    help='补成正方形并加静默区，适合纯二维码；默认保持原本的长宽比')
    ap.add_argument('--quiet', type=float, default=0.08, help='--square 时的静默区占比，默认 0.08')
    ap.add_argument('--pad', type=float, default=0.03, help='保持长宽比时的四周留白占比，默认 0.03')
    ap.add_argument('--width', type=int, default=720, help='输出宽度上限，默认 720')
    ap.add_argument('--quality', type=int, default=90, help='JPEG 质量，默认 90')
    ap.add_argument('--out', default=OUT, help='输出路径')
    args = ap.parse_args()

    if Image is None:
        sys.exit('需要 Pillow：pip install Pillow')

    if args.clipboard:
        src = from_clipboard()
    else:
        src = args.image or newest_screenshot()
        if not src or not os.path.exists(src):
            sys.exit(f'没找到图片：{src}\n试试 `--clipboard`，或直接把路径传进来。')

    with Image.open(src) as im:
        original_size = im.size
        rgb = ImageOps.exif_transpose(im).convert('RGB')

    cropped, bg = crop_to_content(rgb, qr_only=args.qr_only)

    if args.square:
        final = square_with_quiet_zone(cropped, bg, args.quiet)
        mode = f'补正方形 + 静默区 {args.quiet * 100:.0f}%'
    else:
        final = pad_with_bg(cropped, bg, args.pad)
        mode = f'保持长宽比 + 四周留白 {args.pad * 100:.0f}%'

    if final.width > args.width:
        scale = args.width / final.width
        final = final.resize((args.width, round(final.height * scale)), Image.LANCZOS)

    if os.path.splitext(args.out)[1].lower() in ('.jpg', '.jpeg'):
        final.save(args.out, quality=args.quality, optimize=True, subsampling=1)
    else:
        final.save(args.out)

    print(f'源文件      {src}  ({original_size[0]}x{original_size[1]})')
    print(f'检测背景色  rgb{bg}')
    print(f'裁到主体    {cropped.size[0]}x{cropped.size[1]}')
    print(f'处理方式    {mode}')
    print(f'输出        {final.size[0]}x{final.size[1]}   比例 {final.width / final.height:.3f}   {os.path.getsize(args.out):,} bytes')
    print(f'已写入      {os.path.relpath(args.out, ROOT)}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""すくすく（SuQSuQ）のアイコン・ロゴ・OGP を作る。

名前は「すくすく」。「く」を Q にして SuQSuQ（おくるん＝OQRN・キロっく＝kiloQ と同じ作り方）。
キャッチコピーは「すくすく、まいにちが記念日」。
アイコンはおくるんと同じ角の丸い四角に、やわらかいピーチ色。Q の輪のてっぺんから、ふたばの芽（すくすく育つ）。

  icon.svg・icon-32.png・apple-touch-icon.png・icon-512.png・icon-maskable-512.png … アイコン
  logo.svg … 横長のロゴ「SuQ²」（SuQ の2乗で SuQSuQ。Q はアイコンと同じふたばの芽、右上に小さな 2。S・u・2 は Jua）
             ほかの候補（天秤の SuQsuQ など）は tools/logo_variants.py → design/logo-candidates/
  ogp.png  … 共有したときの画像（1200×630）

使い方: python3 tools/icon.py（となりのおくるん（q-oqrn）の tools/brandkit.py を使う）
"""
import math
import re
from pathlib import Path

import brandkit_path  # noqa: F401（となりのおくるん（q-oqrn）の tools/brandkit.py を読めるようにする）
from brandkit import Brand, centered, polar

ROOT = Path(__file__).resolve().parent.parent
BRAND = Brand(light=(255, 178, 150), dark=(233, 112, 88))  # ピーチ（style.css の --accent #e9735a）

C = (50, 60)  # 輪の中心
R, RING_W = 21, 10  # 輪の半径（線の真ん中）・太さ
TAIL_DIR = 45  # しっぽの向き（右下）


def leaf(base, tip, width, n=10):
    """base から tip へのびる葉っぱ（両がわをふくらませた形）"""
    (bx, by), (tx, ty) = base, tip
    dx, dy = tx - bx, ty - by
    length = math.hypot(dx, dy)
    nx, ny = -dy / length, dx / length  # 横向き
    side = lambda s: [  # noqa: E731
        (bx + dx * t + nx * s * width * math.sin(math.pi * t) ** 0.8, by + dy * t + ny * s * width * math.sin(math.pi * t) ** 0.8)
        for t in (i / n for i in range(n + 1))
    ]
    return side(1) + side(-1)[::-1]


def build():
    """Q の形。外形（芽・しっぽを含む）の真ん中をアイコンの真ん中にそろえる（ロゴも同じ形を使う）"""
    top = (C[0], C[1] - R)
    stem_top = (C[0], C[1] - R - 12)
    return centered([
        {"t": "circle", "c": C, "r": R, "alpha": 0.16},  # 輪の内側（うっすら）
        {"t": "line", "p": [top, stem_top], "w": 5},  # 芽のくき
        {"t": "poly", "p": leaf(stem_top, (C[0] - 17, C[1] - R - 22), 6)},  # 左の葉
        {"t": "poly", "p": leaf(stem_top, (C[0] + 15, C[1] - R - 25), 6.5)},  # 右の葉（少し大きく）
        {"t": "ring", "c": C, "r": R, "w": RING_W},  # Q の輪
        {"t": "circle", "c": C, "r": 5.5},  # 輪の真ん中に、小さな丸（赤ちゃんの顔・たね）
        {"t": "line", "p": [polar(C, TAIL_DIR, R - 3), polar(C, TAIL_DIR, R + 10)], "w": RING_W + 2},  # Q のしっぽ
    ])


SHAPES, (_DX, _DY) = build()
C0 = C
C = (C[0] + _DX, C[1] + _DY)
RING_OUTER = R + RING_W / 2


def band(a, b, half):
    """a から b への、太さ half*2 の四角（角はとがったまま）"""
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    nx, ny = -dy / n * half, dx / n * half
    return [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]


def logo_square():
    """横ロゴ「SuQ²」：SuQ の2乗で SuQSuQ（すくすく＝同じものを2回）。Q はアイコンと同じふたば、右上に小さな 2（Jua）。
    返すのは (svg, 横÷縦)"""
    from brandkit import FONT_PATH, shapes_bounds
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont

    svg, _ = BRAND.logo_svg("SuQ", SHAPES, C, RING_OUTER, "SuQ²（すくすく）")
    font = TTFont(str(FONT_PATH))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()

    def bounds(ch):
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(ch)]].draw(pen)
        return pen.bounds

    # brandkit.logo_svg と同じ決まりで、Q の輪の右はし・しっぽの右はしを出す（字の高さ＝輪の直径、字のあいだは高さの 0.09）
    h = bounds("I")[3] - bounds("I")[1]
    k = (h / 2) / RING_OUTER
    gap = h * 0.09
    x = sum(bounds(ch)[2] - bounds(ch)[0] + gap for ch in "Su")
    bx0, _, bx1, _ = shapes_bounds(SHAPES)
    q_cx = x - (bx0 - C[0]) * k
    ring_right = q_cx + RING_OUTER * k
    tail_right = q_cx + (bx1 - C[0]) * k
    b2 = bounds("2")
    sc = 0.55  # 2 の大きさ（字の高さの半分くらい）
    w2 = (b2[2] - b2[0]) * sc
    x2 = max(ring_right + h * 0.06, tail_right - w2 * 0.15)  # 輪の右、しっぽの上
    top = -h * 0.06  # 2 の上（字の上より少し上）
    sp = SVGPathPen(glyphs)
    glyphs[cmap[ord("2")]].draw(TransformPen(sp, (sc, 0, 0, -sc, x2 - b2[0] * sc, top + b2[3] * sc)))
    two = f'<path d="{sp.getCommands()}" fill="#ffffff" stroke="#ffffff" stroke-width="{h * 0.035:.1f}" stroke-linejoin="round"/>'  # 細く見えないよう、白でふちどり
    # 2 の分だけ、右へ広げる（viewBox・背景の四角・背景のグラデーション）
    vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', svg)
    x0, y0, w, hh = map(float, vb.groups())
    add = max(0, x2 + w2 + h * 0.55 - (x0 + w))
    svg = svg.replace(vb.group(0), f'viewBox="{x0} {y0} {w + add:.2f} {hh}"', 1)
    svg = re.sub(r'(<rect x="[-\d.]+" y="[-\d.]+" width=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) + add:.2f}{m.group(3)}", svg, count=1)
    svg = re.sub(r'(<linearGradient id="g" [^>]*x2=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) + add:.2f}{m.group(3)}", svg, count=1)
    return svg.replace("</svg>", two + "</svg>"), (w + add) / hh


def main():
    BRAND.write_icons(ROOT, SHAPES)
    logo, ratio = logo_square()
    (ROOT / "logo.svg").write_text(logo, encoding="utf-8")
    BRAND.write_ogp(
        ROOT / "ogp.png", SHAPES, "すくすく", "SuQSuQ",
        ["生まれて◯日・妊娠◯週を", "写真と動画にそのまま入れて残せる"],
        copy="すくすく、まいにちが記念日",
    )
    print(f"アイコン・logo.svg（高さ 28px なら幅 {28 * ratio:.0f}px）・ogp.png を書き出しました")


if __name__ == "__main__":
    main()

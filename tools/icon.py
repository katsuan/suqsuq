#!/usr/bin/env python3
"""すくすく（SuQSuQ）のアイコン・ロゴ・OGP を作る。

名前は「すくすく」。「く」を Q にして SuQSuQ（おくるん＝OQRN・キロっく＝kiloQ と同じ作り方）。
キャッチコピーは「すくすく、まいにちが記念日」。
アイコンはおくるんと同じ角の丸い四角に、やわらかいピーチ色。Q の輪のてっぺんから、ふたばの芽（すくすく育つ）。

  icon.svg・icon-32.png・apple-touch-icon.png・icon-512.png・icon-maskable-512.png … アイコン
  logo.svg … 横長のロゴ「SuQSuQ」（2つの Q はアイコンと同じ形、S・u は Jua）
  ogp.png  … 共有したときの画像（1200×630）

使い方: python3 tools/icon.py（となりのおくるん（q-oqrn）の tools/brandkit.py を使う）
"""
import math
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
C = (C[0] + _DX, C[1] + _DY)
RING_OUTER = R + RING_W / 2


def main():
    BRAND.write_icons(ROOT, SHAPES)
    logo, ratio = BRAND.logo_svg("SuQSuQ", SHAPES, C, RING_OUTER, "SuQSuQ（すくすく）")
    (ROOT / "logo.svg").write_text(logo, encoding="utf-8")
    BRAND.write_ogp(
        ROOT / "ogp.png", SHAPES, "すくすく", "SuQSuQ",
        ["生まれて◯日・妊娠◯週を", "写真と動画にそのまま入れて残せる"],
        copy="すくすく、まいにちが記念日",
    )
    print(f"アイコン・logo.svg（高さ 28px なら幅 {28 * ratio:.0f}px）・ogp.png を書き出しました")


if __name__ == "__main__":
    main()

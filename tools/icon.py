#!/usr/bin/env python3
"""すくすく（SuQSuQ）のアイコン・ロゴ・OGP を作る。

名前は「すくすく」。「く」を Q にして SuQSuQ（おくるん＝OQRN・キロっく＝kiloQ と同じ作り方）。
キャッチコピーは「すくすく、まいにちが記念日」。
アイコンはおくるんと同じ角の丸い四角に、やわらかいピーチ色。Q の輪のてっぺんから、ふたばの芽（すくすく育つ）。

  icon.svg・icon-32.png・apple-touch-icon.png・icon-512.png・icon-maskable-512.png … アイコン
  logo.svg … 横長のロゴ「SuQSuQ」（1つ目の Q はアイコンと同じふたばの芽、2つ目はメジャー（目盛りのテープがしっぽ）。S・u は Jua）
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
C0 = C
C = (C[0] + _DX, C[1] + _DY)
RING_OUTER = R + RING_W / 2


def band(a, b, half):
    """a から b への、太さ half*2 の四角（角はとがったまま）"""
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    nx, ny = -dy / n * half, dx / n * half
    return [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]


def build_tape():
    """ロゴの2つ目の Q：メジャー（すくすく育つのを測る）。輪はケース、しっぽは引き出したテープ（目盛りつき）と先の金具。
    輪の中心・太さはふたばの Q と同じ（ロゴで同じ大きさに並ぶように）。ふたばの Q と同じだけずらす"""
    c = C0
    half = RING_W / 2 + 0.5
    start, end = R - 2, R + 24  # テープの、輪の中心からの距離
    tape = [
        {"t": "circle", "c": c, "r": R, "alpha": 0.16},  # 輪の内側（うっすら）
        {"t": "poly", "p": band(polar(c, TAIL_DIR, start), polar(c, TAIL_DIR, end), half)},  # テープ
        {"t": "ring", "c": c, "r": R, "w": RING_W},  # ケース（Q の輪）
        {"t": "circle", "c": c, "r": 6},  # まんなかの軸
        {"t": "circle", "c": c, "r": 2.2, "fill": "bg"},  # 軸のねじ
        {"t": "poly", "p": band(polar(c, TAIL_DIR, end - 1), polar(c, TAIL_DIR, end + 2.5), half + 2.5)},  # 先の金具
    ]
    # 目盛り：テープの片がわから、長い・短いを交互に
    for i, dist in enumerate(range(R + 7, end - 1, 4)):
        p = polar(c, TAIL_DIR, dist)
        edge = polar(p, TAIL_DIR - 90, half)
        tip = polar(edge, TAIL_DIR + 90, half * (1.1 if i % 2 == 0 else 0.6))
        tape.append({"t": "line", "p": [edge, tip], "w": 1.8, "fill": "bg"})
    return [{**sh, **({"c": (sh["c"][0] + _DX, sh["c"][1] + _DY)} if "c" in sh else {}), **({"p": [(x + _DX, y + _DY) for x, y in sh["p"]]} if "p" in sh else {})} for sh in tape]


TAPE = build_tape()


def main():
    BRAND.write_icons(ROOT, SHAPES)
    logo, ratio = BRAND.logo_svg("SuQSuQ", [SHAPES, TAPE], C, RING_OUTER, "SuQSuQ（すくすく）")  # 1つ目の Q はふたばの芽、2つ目はメジャー
    (ROOT / "logo.svg").write_text(logo, encoding="utf-8")
    BRAND.write_ogp(
        ROOT / "ogp.png", SHAPES, "すくすく", "SuQSuQ",
        ["生まれて◯日・妊娠◯週を", "写真と動画にそのまま入れて残せる"],
        copy="すくすく、まいにちが記念日",
    )
    print(f"アイコン・logo.svg（高さ 28px なら幅 {28 * ratio:.0f}px）・ogp.png を書き出しました")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""すくすく（SuQSuQ）のアイコン・ロゴ・OGP を作る。

名前は「すくすく」。「く」を Q にして SuQSuQ（おくるん＝OQRN・キロっく＝kiloQ と同じ作り方）。
キャッチコピーは「すくすく、まいにちが記念日」。
アイコンはおくるんと同じ角の丸い四角に、やわらかいピーチ色。Q の輪のてっぺんから、ふたばの芽（すくすく育つ）。

  icon.svg・icon-32.png・apple-touch-icon.png・icon-512.png・icon-maskable-512.png … アイコン
  logo.svg … 横長のロゴ「SuQSuQ」（1つ目の Q はメジャー（目盛りのテープが「Su」の下をゆるく波打って通り、先が持ち上がって次の Q の手前まで）、最後の Q はアイコンと同じふたばの芽。S・u は Jua）
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


def tape_reach():
    """ロゴで、1つ目の Q（メジャー）の真ん中から、2つ目の Q の輪の左はしまでの長さ（アイコンの座標で）。
    brandkit.logo_svg と同じ決まり（字の高さ＝輪の直径、字のあいだは高さの 0.09）で「S」「u」の幅を足す"""
    from brandkit import FONT_PATH
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.ttLib import TTFont

    font = TTFont(str(FONT_PATH))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()

    def bounds(ch):
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(ch)]].draw(pen)
        return pen.bounds

    h = bounds("I")[3] - bounds("I")[1]
    k = (h / 2) / RING_OUTER
    gap = h * 0.09
    dist = RING_OUTER * k + gap + sum(bounds(ch)[2] - bounds(ch)[0] + gap for ch in "Su")
    return dist / k


def build_tape():
    """ロゴの1つ目の Q：メジャー（すくすく育つのを測る）。輪はケース。テープはケースの中（輪の下がわ）から
    輪にそって出てきて（参考：巻き尺のケースのすき間からテープが出る絵）、「Su」の下をゆるくたわみながら通り、
    2つ目の Q（ふたばの芽）の手前まで。テープのまわりに背景の色のふちをつけて、輪に差しこまれているように見せる。
    テープは "free"（次の字の位置をずらさない）。輪の中心・太さはふたばの Q と同じ。ふたばの Q と同じだけずらす"""
    c = C0
    tape_w = 7
    base = c[1] + RING_OUTER + tape_w / 2 - 1  # 輪を出たあとのテープの真ん中の高さ
    x1 = c[0] + tape_reach() - 4

    # 1) ケースの中：輪の線の上を、左下（140°）から真下の少し右（80°）へ（y が下向きなので、角度をへらすと右へ進む）
    arc_pts = [polar(c, a, R + 1) for a in range(140, 79, -5)]
    ax, ay = arc_pts[-1]

    # 2) ケースの外：輪を出て、少し下がりながら「Su」の下へ。まんなかで少したるむ
    def at(t):
        x = ax + (x1 - ax) * t
        ease = min(1, t / 0.22)
        ease = ease * ease * (3 - 2 * ease)  # はじめはなめらかに下りる
        y = ay + (base + 1 - ay) * ease + 3.5 * math.sin(math.pi * t) - 1.5 * max(0, t - 0.8) ** 2 / 0.04
        return (x, y)

    n = 44
    out = [at(k / n) for k in range(n + 1)]
    path = arc_pts + out[1:]
    tape = [
        {"t": "circle", "c": c, "r": R, "alpha": 0.16},  # 輪の内側（うっすら）
        {"t": "ring", "c": c, "r": R, "w": RING_W},  # ケース（Q の輪）
        {"t": "circle", "c": c, "r": 6},  # まんなかの軸
        {"t": "circle", "c": c, "r": 2.2, "fill": "bg"},  # 軸のねじ
        {"t": "line", "p": path, "w": tape_w + 2.6, "fill": "bg", "free": True},  # テープのふち（輪に差しこまれたすき間に見える）
        {"t": "line", "p": path, "w": tape_w, "free": True},  # テープ
    ]

    def normal(t):
        (px, py), (qx, qy) = at(max(0, t - 0.01)), at(min(1, t + 0.01))
        d = math.hypot(qx - px, qy - py)
        return (-(qy - py) / d, (qx - px) / d)  # 下向きの法線

    # 先の金具（つめ）：テープの向きに直角に、下へ
    nx, ny = normal(1)
    ex, ey = out[-1]
    tape.append({"t": "line", "p": [(ex - nx * 2, ey - ny * 2), (ex + nx * 7, ey + ny * 7)], "w": 3.2, "free": True})
    # 目盛り：輪の外に出てから。テープの上のふちから直角に、長い・短いを交互に
    t, k = (c[0] + RING_OUTER + 3 - ax) / (x1 - ax), 0
    while t < 0.95:
        (px, py), (nx, ny) = at(t), normal(t)
        top = (px - nx * (tape_w / 2 - 0.7), py - ny * (tape_w / 2 - 0.7))
        ln = 3.4 if k % 2 == 0 else 1.9
        tape.append({"t": "line", "p": [top, (top[0] + nx * ln, top[1] + ny * ln)], "w": 1.3, "fill": "bg", "free": True})
        t += 4 / (x1 - ax)
        k += 1
    move = lambda pt: (pt[0] + _DX, pt[1] + _DY)  # noqa: E731
    return [{**sh, **({"c": move(sh["c"])} if "c" in sh else {}), **({"p": [move(q) for q in sh["p"]]} if "p" in sh else {})} for sh in tape]


TAPE = build_tape()


def main():
    BRAND.write_icons(ROOT, SHAPES)
    logo, ratio = BRAND.logo_svg("SuQSuQ", [TAPE, SHAPES], C, RING_OUTER, "SuQSuQ（すくすく）")  # 1つ目の Q はメジャー、2つ目（最後）はアイコンと同じふたばの芽
    (ROOT / "logo.svg").write_text(logo, encoding="utf-8")
    BRAND.write_ogp(
        ROOT / "ogp.png", SHAPES, "すくすく", "SuQSuQ",
        ["生まれて◯日・妊娠◯週を", "写真と動画にそのまま入れて残せる"],
        copy="すくすく、まいにちが記念日",
    )
    print(f"アイコン・logo.svg（高さ 28px なら幅 {28 * ratio:.0f}px）・ogp.png を書き出しました")


if __name__ == "__main__":
    main()

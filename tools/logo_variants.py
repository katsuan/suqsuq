"""すくすくのロゴの候補（見くらべ用）。tools/icon.py の形を使って、design/logo-candidates/ に書き出す。

  logo-a … 2つともふたばの Q
  logo-b … u を天秤（つり下げ）のお皿に、最後の Q はメジャー
  logo-c … u を上皿天秤（u の下に板と支柱）
  logo-tilt-left / right / even … u に天秤を直接つないで、左が重い／右が重い／つりあい
  logo-plate-left … SuQ ごとに皿（下線）、左が重い
  logo-plate-light … 候補：SuQsuQ（右を小文字で軽く。右の s の上と左の Q の上をそろえる）
  logo-square … 候補：SuQ²（SuQ の2乗で SuQSuQ）

使い方: python3 tools/logo_variants.py（いまページで使うロゴは tools/icon.py の logo.svg）
"""
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import icon  # noqa: E402
from brandkit import FONT_PATH, polar, shapes_bounds  # noqa: E402
from fontTools.pens.boundsPen import BoundsPen  # noqa: E402
from fontTools.ttLib import TTFont  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "design" / "logo-candidates"
OUT.mkdir(parents=True, exist_ok=True)
B = icon.BRAND
c0 = icon.C0
R, RW, RO = icon.R, icon.RING_W, icon.RING_OUTER


def shift(shapes):
    mv = lambda p: (p[0] + icon._DX, p[1] + icon._DY)  # noqa: E731
    return [{**s, **({"c": mv(s["c"])} if "c" in s else {}), **({"p": [mv(q) for q in s["p"]]} if "p" in s else {})} for s in shapes]


def tape_tail():
    """最後の Q：メジャー。テープが Q のしっぽの位置で O に刺さり、右下へ出て横に少しのびる（目盛り・つめ）"""
    c = c0
    tw = 7
    start = polar(c, 45, R - RW / 2 - 3)
    ex = polar(c, 45, RO + 3)
    end = (ex[0] + 14, ex[1] + 4)

    def bez(t):
        p0, p1, p2, p3 = ex, polar(ex, 45, 4), (end[0] - 6, end[1]), end
        u = 1 - t
        return tuple(u**3 * a + 3 * u * u * t * b + 3 * u * t * t * cc + t**3 * d for a, b, cc, d in zip(p0, p1, p2, p3))

    path = [start] + [bez(k / 16) for k in range(17)]
    sh = [
        {"t": "circle", "c": c, "r": R, "alpha": 0.16},
        {"t": "ring", "c": c, "r": R, "w": RW},
        {"t": "circle", "c": c, "r": 6},
        {"t": "circle", "c": c, "r": 2.2, "fill": "bg"},
        {"t": "line", "p": path, "w": tw + 2.4, "fill": "bg"},
        {"t": "line", "p": path, "w": tw},
    ]
    seg = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:])]
    total = sum(seg)

    def along(d):
        for (a, b), L in zip(zip(path, path[1:]), seg):
            if d <= L:
                t = d / L
                return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), (-(b[1] - a[1]) / L, (b[0] - a[0]) / L)
            d -= L
        a, b = path[-2], path[-1]
        return b, (-(b[1] - a[1]) / seg[-1], (b[0] - a[0]) / seg[-1])

    (px, py), (nx, ny) = along(total)
    sh.append({"t": "line", "p": [(px - nx * 2, py - ny * 2), (px + nx * 6.5, py + ny * 6.5)], "w": 3})
    d, k = RO + 2.5 - (R - RW / 2 - 3), 0
    while d < total - 2.5:
        (px, py), (nx, ny) = along(d)
        top = (px - nx * (tw / 2 - 0.6), py - ny * (tw / 2 - 0.6))
        ln = 2.6 if k % 2 == 0 else 1.5
        sh.append({"t": "line", "p": [top, (top[0] + nx * ln, top[1] + ny * ln)], "w": 1, "fill": "bg", "alpha": 0.7})
        d += 3.2
        k += 1
    return shift(sh)


def glyph_layout(word, marks):
    """brandkit.logo_svg と同じ決まりで、字ごとの左右（logo の座標）と、u の上の高さを出す"""
    font = TTFont(str(FONT_PATH))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()

    def bounds(ch):
        pen = BoundsPen(glyphs)
        glyphs[cmap[ord(ch)]].draw(pen)
        return pen.bounds

    top, bottom = bounds("I")[3], bounds("I")[1]
    h = top - bottom
    gap = h * 0.09
    k = (h / 2) / RO
    x, qn, out = 0.0, 0, []
    for ch in word:
        if ch == "Q":
            m = [s for s in marks[min(qn, len(marks) - 1)] if not s.get("free")]
            bx0, _, bx1, _ = shapes_bounds(m)
            cx = x - (bx0 - icon.C[0]) * k
            out.append(("Q", cx - RO * k, cx + RO * k))
            x = cx + (bx1 - icon.C[0]) * k + gap
            qn += 1
            continue
        b = bounds(ch)
        origin = x - b[0]
        out.append((ch, origin + b[0], origin + b[2], top - b[3]))  # 字の左・右・上（svg の y）
        x = origin + b[2] + gap
    return out, h


def write(name, svg):
    (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")


def variant_a():
    svg, _ = B.logo_svg("SuQSuQ", icon.SHAPES, icon.C, RO, "SuQSuQ（すくすく）")
    write("logo-a", svg)


def variant_b():
    marks = [icon.SHAPES, tape_tail()]
    svg, _ = B.logo_svg("SuQSuQ", marks, icon.C, RO, "SuQSuQ（すくすく）")
    lay, h = glyph_layout("SuQSuQ", marks)
    us = [g for g in lay if g[0] == "u"]
    sw = h * 0.07  # 線の太さ
    # 天秤：2つの u をお皿に。u の両うでの先から糸をのばして、u の上で1点に。2つの点を横の棒（さお）でつなぎ、まんなかにつり手
    u_top = us[0][3]
    k = (h / 2) / RO
    sprout_top = h / 2 + (shapes_bounds(icon.SHAPES)[1] - icon.C[1]) * k  # ふたばの葉のいちばん上
    hang = sprout_top - h * 0.14  # 糸がまとまる高さ（棒の高さ）。ふたばの葉の上を通す
    lines = []
    ends = []
    for _, l, r, t in us:
        mid = (l + r) / 2
        arm = sw * 0.9
        lines.append(f'<path d="M{l + arm:.1f} {t + sw * 0.4:.1f}L{mid:.1f} {hang:.1f}L{r - arm:.1f} {t + sw * 0.4:.1f}" fill="none" stroke="#fff" stroke-width="{sw * 0.55:.1f}" stroke-linejoin="round" stroke-linecap="round"/>')
        ends.append(mid)
    cx = (ends[0] + ends[1]) / 2
    lines.append(f'<path d="M{ends[0]:.1f} {hang:.1f}L{ends[1]:.1f} {hang:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    lines.append(f'<path d="M{cx:.1f} {hang:.1f}L{cx:.1f} {hang - h * 0.16:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    lines.append(f'<circle cx="{cx:.1f}" cy="{hang - h * 0.22:.1f}" r="{h * 0.07:.1f}" fill="none" stroke="#fff" stroke-width="{sw * 0.8:.1f}"/>')
    for e in ends:  # 糸のむすび目
        lines.append(f'<circle cx="{e:.1f}" cy="{hang:.1f}" r="{sw * 0.9:.1f}" fill="#fff"/>')
    # 上に足した分だけ、viewBox と背景を上へひろげる
    vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', svg)
    x0, y0, w, hh = map(float, vb.groups())
    need = hang - h * 0.32 - h * 0.25
    if need < y0:
        add = y0 - need
        svg = svg.replace(vb.group(0), f'viewBox="{x0} {y0 - add} {w} {hh + add}"', 1)
        svg = re.sub(r'(<rect x="[-\d.]+" y=")([-\d.]+)(" width="[-\d.]+" height=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) - add}{m.group(3)}{float(m.group(4)) + add}{m.group(5)}", svg, count=1)
    svg = svg.replace("</svg>", "".join(lines) + "</svg>")
    write("logo-b", svg)


variant_a()
variant_b()
print("ok")


def tape_v1():
    """気に入った版のメジャー（最後の Q）：テープは Q のしっぽの向き（右下）に短く、目盛り（くし）と先の金具"""
    c = c0
    half = RW / 2 - 0.5
    start, end = R - 2, R + 17
    sh = [
        {"t": "circle", "c": c, "r": R, "alpha": 0.16},
        {"t": "poly", "p": icon.band(polar(c, 45, start), polar(c, 45, end), half)},
        {"t": "ring", "c": c, "r": R, "w": RW},
        {"t": "circle", "c": c, "r": 6},
        {"t": "circle", "c": c, "r": 2.2, "fill": "bg"},
        {"t": "poly", "p": icon.band(polar(c, 45, end - 1), polar(c, 45, end + 2.5), half + 2.5)},
    ]
    for i, dist in enumerate(range(R + 6, end - 1, 3)):
        p = polar(c, 45, dist)
        edge = polar(p, -45, half)
        tip = polar(edge, 135, half * (1.1 if i % 2 == 0 else 0.6))
        sh.append({"t": "line", "p": [edge, tip], "w": 1.3, "fill": "bg"})
    return shift(sh)


def variant_c():
    """u を上皿天秤のお皿に：2つの u の下に支柱、支柱を横の棒（さお）でつなぎ、まんなかに台。最初の Q はふたば、最後はメジャー"""
    marks = [icon.SHAPES, tape_v1()]
    svg, _ = B.logo_svg("SuQSuQ", marks, icon.C, RO, "SuQSuQ（すくすく）")
    lay, h = glyph_layout("SuQSuQ", marks)
    us = [g for g in lay if g[0] == "u"]
    sw = h * 0.075
    base_y = h  # 字の下（ベースライン）
    beam_y = base_y + h * 0.28
    foot_y = base_y + h * 0.5
    mids = [(l + r) / 2 for _, l, r, _ in us]
    cx = (mids[0] + mids[1]) / 2
    el = []
    plate_y = base_y + sw * 0.75  # お皿の板（u の下に平らな板）
    for (_, l, r, _), m in zip(us, mids):
        el.append(f'<path d="M{l - sw * 0.6:.1f} {plate_y:.1f}L{r + sw * 0.6:.1f} {plate_y:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
        el.append(f'<path d="M{m:.1f} {plate_y:.1f}L{m:.1f} {beam_y:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')  # 支柱
    el.append(f'<path d="M{mids[0]:.1f} {beam_y:.1f}L{mids[1]:.1f} {beam_y:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')  # さお
    el.append(f'<circle cx="{cx:.1f}" cy="{beam_y:.1f}" r="{sw * 1.1:.1f}" fill="#fff"/>')  # 支点
    tw = h * 0.42  # 台（下が広い台形）
    el.append(f'<path d="M{cx:.1f} {beam_y:.1f}L{cx:.1f} {foot_y - sw:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    el.append(f'<path d="M{cx - tw * 0.3:.1f} {foot_y - sw * 1.2:.1f}L{cx + tw * 0.3:.1f} {foot_y - sw * 1.2:.1f}L{cx + tw / 2:.1f} {foot_y:.1f}L{cx - tw / 2:.1f} {foot_y:.1f}Z" fill="#fff" stroke="#fff" stroke-width="{sw * 0.6:.1f}" stroke-linejoin="round"/>')
    # 下に足した分だけ、viewBox と背景を下へひろげる
    vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', svg)
    x0, y0, w, hh = map(float, vb.groups())
    need = foot_y + h * 0.3
    if need > y0 + hh:
        add = need - (y0 + hh)
        svg = svg.replace(vb.group(0), f'viewBox="{x0} {y0} {w} {hh + add}"', 1)
        svg = re.sub(r'(<rect x="[-\d.]+" y="[-\d.]+" width="[-\d.]+" height=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) + add}{m.group(3)}", svg, count=1)
    svg = svg.replace("</svg>", "".join(el) + "</svg>")
    write("logo-c", svg)


variant_c()


def sub_svg(word, marks, tag):
    """1つのまとまり（SuQ）の svg から、中身（背景の四角をのぞく）と、使う色の定義を取り出す（id は tag つきに）"""
    svg, _ = B.logo_svg(word, marks, icon.C, RO, word)
    vb = tuple(map(float, re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', svg).groups()))
    rx = float(re.search(r'<rect [^>]*rx="([-\d.]+)"', svg).group(1))
    defs = re.search(r"<defs>(.*)</defs>", svg).group(1)
    body = re.split(r"<rect [^>]*/>", svg.split("</defs>", 1)[1], maxsplit=1)[1].replace("</svg>", "")
    # 字のふちは、全体の背景と同じ色（url(#g)）のまま。Q の中の色（gm）だけ、まとまりごとの id に
    defs = "".join(re.findall(r'<linearGradient id="gm".*?</linearGradient>', defs, flags=re.S)).replace('id="gm"', f'id="gm{tag}"')
    body = body.replace("url(#gm)", f"url(#gm{tag})")
    return defs, body, vb, rx


def variant_tilt(name, tilt, plate=False, right_word="SuQ"):
    """u に天秤を直接つなぐ。tilt：+1 左の SuQ が重い（左が下がる）／-1 右が重い／0 つりあい"""
    left = sub_svg("SuQ", [icon.SHAPES], "L")
    right = sub_svg(right_word, [tape_v1()], "R")
    lay, h = glyph_layout("SuQ" + right_word, [icon.SHAPES, tape_v1()])
    off = lay[3][1]  # 右の S（s）の左はし（右のまとまりを、ここへずらす）
    d = h * 0.12 * tilt
    dl, dr = d, -d
    if right_word[0].islower():
        # 右が軽い：小文字の s の上が、左の Q（輪）の上と同じ高さになるまで、右のまとまりを上げる
        dr = dl - lay[3][3]
    sw = h * 0.075
    us = [g for g in lay if g[0] == "u"]
    mids = [(l + r) / 2 for _, l, r, _ in us]
    beam = h * 1.3  # つりあいのときのさおの高さ
    foot = beam + h * 0.3
    el = []
    if plate:
        # SuQ ごとに、下に皿（下線）。支柱は皿のまんなかから
        groups = [(lay[0][1], lay[2][2]), (lay[3][1], lay[5][2])]
        plate_y = h * 1.2
        beam = h * 1.5
        foot = beam + h * 0.3
        mids = []
        for (l, r), dy in zip(groups, (dl, dr)):
            m = (l + r) / 2
            mids.append(m)
            el.append(f'<path d="M{l + sw * 0.5:.1f} {plate_y + dy:.1f}L{r - sw * 0.5:.1f} {plate_y + dy:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
            el.append(f'<path d="M{m:.1f} {plate_y + dy:.1f}L{m:.1f} {beam + dy:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    else:
        for m, dy in zip(mids, (dl, dr)):  # u の底から、まっすぐ下へ支柱
            el.append(f'<path d="M{m:.1f} {h + dy - sw * 0.6:.1f}L{m:.1f} {beam + dy:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    cx = (mids[0] + mids[1]) / 2
    el.append(f'<path d="M{mids[0]:.1f} {beam + dl:.1f}L{mids[1]:.1f} {beam + dr:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    el.append(f'<circle cx="{cx:.1f}" cy="{beam:.1f}" r="{sw * 1.2:.1f}" fill="#fff"/>')
    tw = h * 0.42
    el.append(f'<path d="M{cx:.1f} {beam:.1f}L{cx:.1f} {foot - sw:.1f}" stroke="#fff" stroke-width="{sw:.1f}" stroke-linecap="round"/>')
    el.append(f'<path d="M{cx - tw * 0.3:.1f} {foot - sw * 1.2:.1f}L{cx + tw * 0.3:.1f} {foot - sw * 1.2:.1f}L{cx + tw / 2:.1f} {foot:.1f}L{cx - tw / 2:.1f} {foot:.1f}Z" fill="#fff" stroke="#fff" stroke-width="{sw * 0.6:.1f}" stroke-linejoin="round"/>')
    (lx, ly, lw, lh), (rx_, ry, rw, rh) = left[2], right[2]
    x0 = lx
    x1 = rx_ + off + rw
    y0 = min(ly + dl, ry + dr)
    pad = h * 0.3
    y1 = max(ly + lh + dl, ry + rh + dr, foot + pad)
    w, hh = x1 - x0, y1 - y0
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {hh:.1f}" role="img" aria-label="SuQSuQ（すくすく）">'
        # 字のふちの色：ずらしたまとまりの中でも、背景と同じ場所の色になるよう、同じだけずらしたグラデーション
        f"<defs>{B.gradient_svg(x0, y0, w, hh)}{B.gradient_svg(x0, y0 - dl, w, hh, gid='gL0')}{B.gradient_svg(x0 - off, y0 - dr, w, hh, gid='gR0')}{left[0]}{right[0]}</defs>"
        f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{hh:.1f}" rx="{left[3]:.1f}" fill="url(#g)"/>'
        f'<g transform="translate(0 {dl:.1f})">{left[1].replace("url(#g)", "url(#gL0)")}</g>'
        f'<g transform="translate({off:.1f} {dr:.1f})">{right[1].replace("url(#g)", "url(#gR0)")}</g>'
        + "".join(el)
        + "</svg>\n"
    )
    write(name, svg)


for nm, t in (("logo-tilt-left", 1), ("logo-tilt-right", -1), ("logo-tilt-even", 0)):
    variant_tilt(nm, t)
variant_tilt("logo-plate-left", 1, plate=True)
variant_tilt("logo-plate-light", 1, plate=True, right_word="suQ")


def variant_square(name="logo-square"):
    """SuQ の2乗（SuQ²）で SuQSuQ を表す横ロゴ。Q はふたば。右上に小さな 2"""
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen

    svg, _ = B.logo_svg("SuQ", icon.SHAPES, icon.C, RO, "SuQ²（すくすく）")
    lay, h = glyph_layout("SuQ", [icon.SHAPES])
    font = TTFont(str(FONT_PATH))
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    g2 = glyphs[cmap[ord("2")]]
    pen = BoundsPen(glyphs)
    g2.draw(pen)
    bx0, by0, bx1, by1 = pen.bounds
    sc = 0.55  # 字の高さの半分くらい
    k = (h / 2) / RO
    tail_right = lay[2][1] + RO * k + (shapes_bounds([s for s in icon.SHAPES if not s.get("free")])[2] - icon.C[0] - RO) * k
    x = max(lay[2][2] + h * 0.06, tail_right - (bx1 - bx0) * sc * 0.15)  # 輪の右、しっぽの上
    top = -h * 0.06  # 2 の上（字の上より少し上）
    sp = SVGPathPen(glyphs)
    g2.draw(TransformPen(sp, (sc, 0, 0, -sc, x - bx0 * sc, top + by1 * sc)))
    w2 = (bx1 - bx0) * sc
    path = f'<path d="{sp.getCommands()}" fill="#ffffff" stroke="#ffffff" stroke-width="{h * 0.035:.1f}" stroke-linejoin="round"/>'
    vb = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', svg)
    x0, y0, w, hh = map(float, vb.groups())
    need = x + w2 + h * 0.55
    if need > x0 + w:
        add = need - (x0 + w)
        svg = svg.replace(vb.group(0), f'viewBox="{x0} {y0} {w + add} {hh}"', 1)
        svg = re.sub(r'(<rect x="[-\d.]+" y="[-\d.]+" width=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) + add}{m.group(3)}", svg, count=1)
        # 背景のグラデーションも広げる
        svg = re.sub(r'(<linearGradient id="g" [^>]*x2=")([-\d.]+)(")', lambda m: f"{m.group(1)}{float(m.group(2)) + add}{m.group(3)}", svg, count=1)
    svg = svg.replace("</svg>", path + "</svg>")
    write(name, svg)


variant_square()

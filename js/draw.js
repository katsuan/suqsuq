// 描く：映像（または写真）→ 動くスタンプ → 文字（テンプレート）の順に、1枚のキャンバスへ。
// 見本（はじめの画面）・撮る画面・写真・動画で、同じ drawScene を使う（だから見たとおりに残る）。
"use strict";

// 画面の形（キャンバスの大きさ）。短いほうを 1080 に
const ASPECTS = {
  "9:16": [1080, 1920],
  "3:4": [1080, 1440],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080]
};
const ASPECT_ORDER = Object.keys(ASPECTS);

// 色の選び方（文字・飾りの色）
const LOOK_COLORS = ["#e9735a", "#ff8fab", "#f4b740", "#5cb85c", "#5aa9e6", "#9b7fe0", "#ffffff", "#4a3a33"];

// 写真に入れる字（index.html で Google Fonts から読みこむ）
const FONTS = {
  round: '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif',
  pop: '"Mochiy Pop One", "M PLUS Rounded 1c", sans-serif',
  hand: '"Yomogi", "M PLUS Rounded 1c", sans-serif',
  mincho: '"Shippori Mincho", "Hiragino Mincho ProN", serif',
  serif: '"Cormorant Garamond", "Shippori Mincho", serif'
};
// 字が読みこめてから描きなおす（読みこむ前は、ちがう字で描かれる）
const fontsReady = Promise.all(
  [
    `800 40px ${FONTS.round}`,
    `40px ${FONTS.pop}`,
    `40px ${FONTS.hand}`,
    `600 40px ${FONTS.mincho}`,
    `italic 600 40px ${FONTS.serif}`
  ].map((f) => document.fonts?.load(f, "生まれて100日目週さいか月Days").catch(() => null))
);

const isLatin = (s) => /^[\x20-\x7e]*$/.test(s);
const lightColor = (hex) => {
  const n = parseInt(String(hex).replace("#", ""), 16) || 0;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.7;
};
const easeOutBack = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---- テンプレート ----
// rows：上の行（top）・まんなかの行（big＋unit＋small）・下の行（foot）の字の形。sz は 1080 のときの大きさ
// deco：文字の後ろの飾り（box は文字のまとまりの範囲）。fixed：位置を動かせない（フレーム）
const TEMPLATES = [
  {
    id: "fuwari",
    label: "ふんわり",
    pos: [0.5, 0.8],
    font: FONTS.round,
    weight: 800,
    sz: { top: 54, big: 230, unit: 84, small: 64, foot: 40 },
    fill: () => "#ffffff",
    glow: true
  },
  {
    id: "pop",
    label: "ポップ",
    pos: [0.5, 0.78],
    font: FONTS.pop,
    weight: 400,
    sz: { top: 46, big: 210, unit: 80, small: 60, foot: 38 },
    fill: () => "#ffffff",
    stroke: (c) => (lightColor(c) ? "#e9735a" : c),
    strokeW: 0.13,
    topPill: true
  },
  {
    id: "hand",
    label: "てがき",
    pos: [0.5, 0.8],
    font: FONTS.hand,
    weight: 400,
    sz: { top: 50, big: 190, unit: 72, small: 56, foot: 38 },
    fill: (c, part) => (part === "big" || part === "unit" || part === "small" ? (lightColor(c) ? "#e9735a" : c) : "#5a4a42"),
    paper: true
  },
  {
    id: "elegant",
    label: "エレガント",
    pos: [0.5, 0.8],
    font: FONTS.mincho,
    weight: 600,
    numFont: FONTS.serif,
    numStyle: "italic",
    sz: { top: 44, big: 270, unit: 92, small: 64, foot: 34 },
    fill: (c, part) => (part === "top" || part === "foot" ? c : "#ffffff"),
    shade: true,
    rules: true
  },
  {
    id: "badge",
    label: "まるバッジ",
    pos: [0.76, 0.2],
    font: FONTS.round,
    weight: 800,
    sz: { top: 44, big: 180, unit: 64, small: 50, foot: 32 },
    fill: (c) => (lightColor(c) ? "#4a3a33" : "#ffffff"),
    circle: true
  },
  {
    id: "frame",
    label: "フレーム",
    font: FONTS.round,
    weight: 800,
    sz: { top: 44, big: 150, unit: 64, small: 50, foot: 32 },
    fill: (c, part) => (part === "foot" || part === "top" ? "#8a7a72" : lightColor(c) ? "#e9735a" : c),
    frame: true,
    fixed: true
  }
];
const tplOf = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

// ---- 動くスタンプ ----
const STAMPS = [
  { id: "sparkle", label: "✨ キラキラ" },
  { id: "heart", label: "💗 ハート" },
  { id: "bubble", label: "🫧 しゃぼん玉" },
  { id: "petal", label: "🌸 はなびら" },
  { id: "star", label: "⭐ ほし" },
  { id: "confetti", label: "🎊 紙ふぶき" },
  { id: "balloon", label: "🎈 ふうせん" }
];
// 文字の動き（動画のとき。写真では止まった形）
const MOTIONS = [
  { id: "none", label: "なし" },
  { id: "float", label: "ふわふわ" },
  { id: "pop", label: "ぽよん" },
  { id: "count", label: "カウントアップ" },
  { id: "wave", label: "なみ" }
];

// いつも同じになる乱数（i 番目のつぶの k 番目の値）
const rnd = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.closePath();
}
function starPath(ctx, r, points, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}
// キラッ（4つの角が細い星）
function twinklePath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.closePath();
}

// 下から上へ（または上から下へ）流れるつぶの、いまの位置（0〜1）
const flow = (t, i, period) => (t / period + rnd(i, 3)) % 1;

function drawStamp(ctx, id, W, H, t, color) {
  const u = Math.min(W, H) / 1080;
  ctx.save();
  if (id === "sparkle" || id === "star") {
    const n = id === "sparkle" ? 16 : 12;
    for (let i = 0; i < n; i++) {
      const speed = 1.2 + rnd(i, 5) * 1.6;
      const ph = t * speed + rnd(i, 3) * 6.28;
      const cycle = Math.floor(ph / 6.28);
      const s = Math.max(0, Math.sin(ph));
      const x = rnd(i + cycle * 31, 1) * W, y = rnd(i + cycle * 31, 2) * H;
      const r = (24 + rnd(i, 4) * 34) * u * s;
      if (r < 1) continue;
      ctx.save();
      ctx.translate(x, y);
      if (id === "sparkle") {
        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 18 * u;
        ctx.fillStyle = "#ffffff";
        twinklePath(ctx, r);
      } else {
        ctx.rotate(t * 0.8 + i);
        ctx.shadowColor = "rgba(255,200,80,0.7)";
        ctx.shadowBlur = 14 * u;
        ctx.fillStyle = "#ffd56b";
        starPath(ctx, r * 0.8, 5, 0.48);
      }
      ctx.fill();
      ctx.restore();
    }
  } else if (id === "heart") {
    const colors = ["#ff8fab", "#ff6b8b", "#ffc2d1", color];
    for (let i = 0; i < 12; i++) {
      const p = flow(t, i, 6 + rnd(i, 5) * 4);
      const x = rnd(i, 1) * W + Math.sin(t * 1.5 + i) * 30 * u;
      const y = H * (1.08 - p * 1.25);
      const s = (30 + rnd(i, 4) * 34) * u;
      ctx.save();
      ctx.globalAlpha = clamp01(Math.min((1 - p) * 3, p * 8)) * 0.9;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 2 + i) * 0.25);
      ctx.fillStyle = colors[i % colors.length];
      heartPath(ctx, s);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === "bubble") {
    for (let i = 0; i < 14; i++) {
      const p = flow(t, i, 7 + rnd(i, 5) * 5);
      const r = (18 + rnd(i, 4) * 46) * u;
      const x = rnd(i, 1) * W + Math.sin(t * 1.2 + i * 2) * 40 * u;
      const y = H * (1.08 - p * 1.25);
      ctx.save();
      ctx.globalAlpha = clamp01(Math.min((1 - p) * 4, p * 8));
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(0.75, "rgba(200,230,255,0.18)");
      g.addColorStop(1, "rgba(255,255,255,0.55)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2.5 * u;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.4, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === "petal") {
    for (let i = 0; i < 16; i++) {
      const p = flow(t, i, 8 + rnd(i, 5) * 5);
      const s = (16 + rnd(i, 4) * 16) * u;
      const x = rnd(i, 1) * W + Math.sin(t * 0.9 + i) * 70 * u;
      const y = H * (-0.08 + p * 1.2);
      ctx.save();
      ctx.globalAlpha = clamp01(Math.min((1 - p) * 5, p * 10)) * 0.95;
      ctx.translate(x, y);
      ctx.rotate(t * (0.6 + rnd(i, 6)) + i);
      ctx.scale(1, 0.55 + 0.45 * Math.cos(t * 2 + i)); // ひらひら
      ctx.fillStyle = i % 3 ? "#ffc8d6" : "#ffb0c4";
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.quadraticCurveTo(s * 1.1, -s * 0.2, 0, s * 1.1);
      ctx.quadraticCurveTo(-s * 1.1, -s * 0.2, 0, -s * 1.2);
      ctx.fill();
      ctx.restore();
    }
  } else if (id === "confetti") {
    const colors = ["#ff8fab", "#ffd56b", "#7fd1ae", "#7cb8f0", "#b39ddb", color];
    for (let i = 0; i < 40; i++) {
      const p = flow(t, i, 5 + rnd(i, 5) * 4);
      const x = rnd(i, 1) * W + Math.sin(t * 1.3 + i) * 40 * u;
      const y = H * (-0.05 + p * 1.12);
      const s = (10 + rnd(i, 4) * 10) * u;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (1 + rnd(i, 6) * 2) + i);
      ctx.scale(1, Math.cos(t * 4 + i * 1.7));
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-s, -s * 0.5, s * 2, s);
      ctx.restore();
    }
  } else if (id === "balloon") {
    const colors = ["#ff8fab", "#ffd56b", "#7cb8f0", "#7fd1ae", "#b39ddb", color];
    for (let i = 0; i < 6; i++) {
      const p = flow(t, i, 11 + rnd(i, 5) * 6);
      const r = (46 + rnd(i, 4) * 26) * u;
      const x = (0.08 + 0.84 * rnd(i, 1)) * W + Math.sin(t * 0.8 + i) * 30 * u;
      const y = H * (1.15 - p * 1.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 0.9 + i) * 0.08);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.moveTo(0, r * 1.2);
      ctx.bezierCurveTo(r * 0.3, r * 1.8, -r * 0.3, r * 2.3, r * 0.1, r * 3);
      ctx.stroke();
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); // むすび目
      ctx.moveTo(-r * 0.12, r * 1.26);
      ctx.lineTo(r * 0.12, r * 1.26);
      ctx.lineTo(0, r * 1.14);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.16, r * 0.3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

// ---- 文字 ----
function fontFor(tpl, part, size, text) {
  if (part === "big" && tpl.numFont && isLatin(text)) return `${tpl.numStyle || ""} 600 ${size}px ${tpl.numFont}`;
  if (part === "unit" && tpl.numFont && isLatin(text)) return `${tpl.numStyle || ""} 600 ${size}px ${tpl.numFont}`;
  if (part === "small" && tpl.numFont && isLatin(text)) return `${tpl.numStyle || ""} 600 ${size}px ${tpl.numFont}`;
  return `${tpl.weight} ${size}px ${tpl.font}`;
}

// 行ごとの字のまとまり（文字・大きさ・幅）を作る
function layoutRows(ctx, tpl, label, k) {
  const part = (name, text) => {
    const size = tpl.sz[name] * k;
    ctx.font = fontFor(tpl, name, size, text);
    return { name, text, size, font: ctx.font, w: ctx.measureText(text).width };
  };
  // memo（ひとこと）は上の行と同じ字の形、stats（うまれたときの記録）は下の行と同じ字の形。kind で見分ける
  const rows = [];
  if (label.memo) rows.push({ parts: [part("top", label.memo)], gap: 0, kind: "memo" });
  if (label.top) rows.push({ parts: [part("top", label.top)], gap: 0, kind: "top" });
  const mid = [part("big", label.big)];
  if (label.unit) mid.push(part("unit", label.unit));
  if (label.small) mid.push(part("small", label.small));
  rows.push({ parts: mid, gap: 0.12, main: true });
  if (label.stats) rows.push({ parts: [part("foot", label.stats)], gap: 0, kind: "stats" });
  if (label.foot) rows.push({ parts: [part("foot", label.foot)], gap: 0, kind: "foot" });
  for (const r of rows) {
    const space = r.main ? tpl.sz.unit * k * 0.12 : 0;
    r.w = r.parts.reduce((a, p) => a + p.w, 0) + space * (r.parts.length - 1);
    r.space = space;
    r.h = Math.max(...r.parts.map((p) => p.size));
  }
  return rows;
}

// まとまりの高さ（行の間を少しつめる）
const LINE = { top: 1.25, big: 0.98, foot: 1.5 };
function rowsHeight(rows) {
  return rows.reduce((a, r) => a + r.h * (r.main ? LINE.big : r.parts[0].name === "top" ? LINE.top : LINE.foot), 0);
}

function drawText(ctx, tpl, part, text, x, y, color, k, t, wave) {
  ctx.font = part.font;
  const fill = tpl.fill(color, part.name);
  const chars = wave && part.name === "big" ? [...text] : [text];
  let cx = x;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = ctx.measureText(ch).width;
    const dy = chars.length > 1 ? Math.sin(t * 5 - i * 0.9) * part.size * 0.07 : 0;
    if (tpl.stroke) {
      ctx.lineJoin = "round";
      ctx.lineWidth = part.size * tpl.strokeW;
      ctx.strokeStyle = tpl.stroke(color);
      ctx.strokeText(ch, cx, y + dy);
    }
    ctx.fillStyle = fill;
    ctx.fillText(ch, cx, y + dy);
    cx += w;
  }
}

// 文字のまとまりを (cx, cy) を真ん中に描く。返すのは、ドラッグに使う範囲
function drawLabel(ctx, W, H, look, label, t, still) {
  const tpl = tplOf(look.tpl);
  const color = look.color;
  const base = Math.min(W, H) / 1080;
  // カウントアップ：はじめの 1.8 秒で 1 からその数まで
  let shown = label;
  if (!still && look.motion === "count" && label.num != null) {
    const p = clamp01(t / 1.8);
    shown = { ...label, big: String(Math.max(1, Math.round(label.num * (1 - Math.pow(1 - p, 3))))) };
  }
  let k = base * (tpl.fixed ? 1 : look.size);
  let rows = layoutRows(ctx, tpl, shown, k);
  const final = shown === label ? rows : layoutRows(ctx, tpl, label, k); // 幅は数えおわったときに合わせる（動いても横にゆれない）
  let bw = Math.max(...final.map((r) => r.w));
  let bh = rowsHeight(rows);
  // 画面からはみ出さないように縮める
  const maxW = W * (tpl.circle ? 0.5 : 0.9);
  if (bw > maxW) {
    k *= maxW / bw;
    rows = layoutRows(ctx, tpl, shown, k);
    bw = maxW;
    bh = rowsHeight(rows);
  }

  let cx, cy;
  if (tpl.frame) {
    // フレーム：白いふち（下を広く）の中に文字。位置は動かせない
    const side = Math.min(W, H) * 0.045;
    const band = H * (W > H ? 0.2 : 0.17);
    ctx.save();
    ctx.fillStyle = "#fffdf9";
    ctx.fillRect(0, 0, W, side);
    ctx.fillRect(0, 0, side, H);
    ctx.fillRect(W - side, 0, side, H);
    ctx.fillRect(0, H - band, W, band);
    ctx.restore();
    const fit = Math.min(1, (band * 0.82) / bh, (W * 0.86) / bw);
    if (fit < 1) {
      k *= fit;
      rows = layoutRows(ctx, tpl, shown, k);
      bw *= fit;
      bh = rowsHeight(rows);
    }
    cx = W / 2;
    cy = H - band / 2;
  } else {
    const [px, py] = look.x == null ? tpl.pos : [look.x, look.y];
    // 飾りごと画面の中におさめる（はしに寄せても切れない）
    const hw = tpl.circle ? badgeR(bw, bh, k) + 4 * k : bw / 2 + 20 * k;
    const hh = tpl.circle ? hw : bh / 2 + 20 * k;
    const fit = (v, half, size) => (half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, v)));
    cx = fit(px * W, hw, W);
    cy = fit(py * H, hh, H);
  }

  ctx.save();
  ctx.translate(cx, cy);
  // 文字の動き（写真のときは止まった形）
  if (!still && !tpl.fixed) {
    if (look.motion === "float") {
      ctx.translate(0, Math.sin(t * 1.6) * 12 * base);
      ctx.rotate((Math.sin(t * 1.1) * 1.5 * Math.PI) / 180);
    } else if (look.motion === "pop" || look.motion === "count") {
      const enter = look.motion === "pop" ? 0.7 : 0;
      let s = 1;
      if (enter && t < enter) s = Math.max(0.01, easeOutBack(t / enter));
      const at = look.motion === "pop" ? (t - enter) % 3.5 : t - 1.8; // ぽよん：3.5 秒ごと／カウントアップ：数えおわりに1回
      if (at > 0 && at < 0.5) s *= 1 + Math.sin((at / 0.5) * Math.PI) * 0.09;
      ctx.scale(s, s);
    }
  }

  // 後ろの飾り
  const padX = 60 * k, padY = 44 * k;
  if (tpl.paper) {
    ctx.save();
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 24 * k;
    ctx.shadowOffsetY = 8 * k;
    ctx.fillStyle = "#fffaf0";
    roundRect(ctx, -bw / 2 - padX, -bh / 2 - padY, bw + padX * 2, bh + padY * 2, 22 * k);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 0.6; // マスキングテープ
    ctx.fillStyle = lightColor(color) ? "#f4b740" : color;
    ctx.rotate((5 * Math.PI) / 180);
    ctx.fillRect(-90 * k, -bh / 2 - padY - 26 * k, 180 * k, 52 * k);
    ctx.restore();
  }
  if (tpl.circle) {
    const r = badgeR(bw, bh, k);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 24 * k;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 8 * k;
    ctx.setLineDash([2 * k, 16 * k]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r - 22 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 行を上から描く（字の下のそろえ方は alphabetic。大きな数字の行は、字の下をそろえる）
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const passes = [];
  if (tpl.glow) passes.push({ color: "rgba(0,0,0,0.28)", blur: 14 * k }, { color, blur: 34 * k });
  else if (tpl.shade) passes.push({ color: "rgba(0,0,0,0.4)", blur: 18 * k });
  else if (tpl.stroke) passes.push({ color: "rgba(0,0,0,0.2)", blur: 6 * k, dy: 8 * k });
  else passes.push(null);

  let y = -bh / 2;
  for (const r of rows) {
    const lh = r.h * (r.main ? LINE.big : r.parts[0].name === "top" ? LINE.top : LINE.foot);
    const baseline = y + lh * (r.main ? 0.86 : 0.8);
    let x = -r.w / 2;
    // ポップ：上の行は色の帯の中に白い字
    if (tpl.topPill && r.kind === "top") {
      ctx.save();
      ctx.fillStyle = tpl.stroke(color);
      const ph = r.h * 1.3;
      roundRect(ctx, x - r.h * 0.6, baseline - r.h * 0.95, r.w + r.h * 1.2, ph, ph / 2);
      ctx.fill();
      ctx.font = r.parts[0].font;
      ctx.fillStyle = "#fff";
      ctx.fillText(r.parts[0].text, x, baseline);
      ctx.restore();
      y += lh;
      continue;
    }
    // エレガント：上の行の左右に細い線
    if (tpl.rules && r.kind === "top") {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * k;
      const my = baseline - r.h * 0.35;
      ctx.beginPath();
      ctx.moveTo(x - 110 * k, my);
      ctx.lineTo(x - 26 * k, my);
      ctx.moveTo(-x + 26 * k, my);
      ctx.lineTo(-x + 110 * k, my);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of r.parts) {
      for (const pass of passes) {
        ctx.save();
        if (pass) {
          ctx.shadowColor = pass.color;
          ctx.shadowBlur = pass.blur;
          ctx.shadowOffsetY = pass.dy || 0;
        }
        drawText(ctx, tpl, p, p.text, x, baseline, color, k, t, !still && look.motion === "wave");
        ctx.restore();
      }
      x += p.w + r.space;
    }
    y += lh;
  }
  ctx.restore();
  return { x: cx - bw / 2 - padX, y: cy - bh / 2 - padY, w: bw + padX * 2, h: bh + padY * 2, fixed: !!tpl.fixed };
}

// まるバッジの丸の半径：文字のまとまりの四すみが入る大きさ（対角線の半分）に少し余白
const badgeR = (bw, bh, k) => Math.hypot(bw, bh) / 2 + 26 * k;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 映像・写真を、キャンバスいっぱいに（はみ出す分は切る）
function drawCover(ctx, src, W, H, mirror) {
  const sw = src.videoWidth || src.naturalWidth || src.width;
  const sh = src.videoHeight || src.naturalHeight || src.height;
  if (!sw || !sh) return false;
  const s = Math.max(W / sw, H / sh);
  const dw = sw * s, dh = sh * s;
  ctx.save();
  if (mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

// 写真がないときの見本の背景（やわらかいピーチ）
function drawPlaceholder(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#ffe9df");
  g.addColorStop(0.55, "#ffd3c4");
  g.addColorStop(1, "#f6b3a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const u = Math.min(W, H) / 1080;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  [[0.2, 0.25, 260], [0.85, 0.4, 200], [0.4, 0.55, 140]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x * W, y * H, r * u, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 1コマ描く。src は video・img（なければ見本の背景）。t は動きの時間（秒）。still は写真（止まった形）
function drawScene(ctx, W, H, { src, mirror, t, look, label, still }) {
  ctx.clearRect(0, 0, W, H);
  if (!src || !drawCover(ctx, src, W, H, mirror)) drawPlaceholder(ctx, W, H);
  const tt = still ? 3.3 : t;
  for (const id of look.stamps) drawStamp(ctx, id, W, H, tt, look.color);
  if (!label) return null;
  return drawLabel(ctx, W, H, look, label, tt, still);
}

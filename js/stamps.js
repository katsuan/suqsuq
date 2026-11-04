// すくすく：動くスタンプ（キラキラ・ハート・しゃぼん玉・はなびら・ほし・紙ふぶき・ふうせん）の一覧と描き方
// 読まれるところ：index.html（js/draw.js のすぐあと。clamp01 は js/draw.js）。描くのは js/draw.js の drawScene
"use strict";

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

// ハートの道を作る
function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.closePath();
}
// 星の道を作る（points 個のとがり）
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

// キラキラ・ほし：ふっと光って消える
function stampTwinkles(ctx, id, W, H, t, color, u) {
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
}

// ハート：下から上へゆらゆら
function stampHearts(ctx, id, W, H, t, color, u) {
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
}

// しゃぼん玉：下から上へ
function stampBubbles(ctx, id, W, H, t, color, u) {
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
}

// はなびら：上から下へひらひら
function stampPetals(ctx, id, W, H, t, color, u) {
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
}

// 紙ふぶき：上から下へくるくる
function stampConfetti(ctx, id, W, H, t, color, u) {
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
}

// ふうせん：下から上へ
function stampBalloons(ctx, id, W, H, t, color, u) {
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

// スタンプの id → 描く関数（キラキラとほしは同じ動き）
const STAMP_DRAW = { sparkle: stampTwinkles, star: stampTwinkles, heart: stampHearts, bubble: stampBubbles, petal: stampPetals, confetti: stampConfetti, balloon: stampBalloons };

// 動くスタンプを1つ描く（t 秒の時点の形で）
function drawStamp(ctx, id, W, H, t, color) {
  const u = Math.min(W, H) / 1080;
  ctx.save();
  STAMP_DRAW[id]?.(ctx, id, W, H, t, color, u);
  ctx.restore();
}

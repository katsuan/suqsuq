// すくすく（SuQSuQ）：生まれて◯日・生後◯か月・妊娠◯週を、写真や動画にそのまま入れて残す。
// しくみ：カメラの映像（または選んだ写真）と文字・スタンプを1つのキャンバスに描く。
// 写真はそのキャンバスを画像に、動画はキャンバス（＋音）を MediaRecorder で録る（ろくがと同じ形）。
// 写真・動画はこの端末にだけ残す（保存・共有メニュー、ダウンロード）。サーバーには送らない。
//
// ファイル（js/。この順に読む。index.html の <script>）：
//   core.js   共通の道具・覚えておくこと（state）・日数の計算  ← このファイル
//   draw.js   描く（テンプレート・動くスタンプ・文字の動き）
//   setup.js  はじめの画面（なまえ・日付・文字の形・見本）
//   calendar.js 節目をカレンダーに（.ics・Google カレンダー）
//   shoot.js  撮る画面（カメラ・写真・動画・できたもの）
//   main.js   はじめに一度だけ動かすこと
"use strict";

const $ = (id) => document.getElementById(id);
const DAY = 86400000;
const pad2 = (n) => String(n).padStart(2, "0");
const clock = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`;
// "2026-10-22" ⇄ 日付（時差でずれないよう、UTC の 0 時で扱う）
const parseDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const dotDay = (s) => (s ? s.replace(/-/g, ".") : "");

// ---- 覚えておくこと（state）。この端末の localStorage に残す ----
const STORE_KEY = "suqsuq:state";
const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
};
const saved = loadStore();
const state = {
  mode: saved.mode === "womb" ? "womb" : "born", // 生まれてから／おなかの中
  name: saved.name || "",
  birth: saved.birth || "",
  due: saved.due || "",
  day: "", // 数える日（空ならきょう）。覚えない（次に開いたときは、きょう）
  dayOne: saved.dayOne !== false, // 生まれた日を1日目と数える
  fmtBorn: saved.fmtBorn || "days",
  fmtWomb: saved.fmtWomb || "weeks",
  // 文字の形（テンプレート・色・位置・大きさ・いっしょに入れるもの・スタンプ・動き）。マイテンプレートにはこのまとまりを覚える
  look: Object.assign(
    { tpl: "fuwari", color: "#e9735a", x: null, y: null, size: 1, showName: true, showDate: true, showStats: true, stamps: ["sparkle"], motion: "float" },
    saved.look || {}
  ),
  myLooks: Array.isArray(saved.myLooks) ? saved.myLooks : [],
  aspect: saved.aspect || "9:16",
  kind: saved.kind === "video" ? "video" : "photo",
  facing: saved.facing === "user" ? "user" : "environment",
  sound: saved.sound !== false, // 動画に音も入れる
  memo: saved.memo || "", // ひとこと（写真に入れる好きな文字）
  bTime: saved.bTime || "", // うまれたときの記録：時刻・体重（g）・身長（cm）
  bWeight: saved.bWeight || "",
  bLength: saved.bLength || "",
  timer: [0, 3, 10].includes(saved.timer) ? saved.timer : 0, // セルフタイマー（秒）
  saveRaw: saved.saveRaw === true, // 文字・スタンプ入りに加えて、加工なしの元の写真・動画も残す（はじめはオフ）
  remind: saved.remind || "morning", // 節目のお知らせ（js/calendar.js の REMINDS）
  calWeekly: saved.calWeekly === true // おなかの中：毎週の◯週もカレンダーに
};
const save = () => {
  try {
    const { day, ...rest } = state;
    localStorage.setItem(STORE_KEY, JSON.stringify(rest));
  } catch {
    // 残せなくても使える
  }
};

// ---- 日数の計算 ----
// 年・月・日の差（生後◯か月◯日・◯さい◯か月）
function ymd(from, to) {
  const a = new Date(from), b = new Date(to);
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    m -= 1;
    d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); // 前の月の日数
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}

// 表示の選び方（表示のチップ）。big が大きな数字、unit がそのとなり、small がさらに小さく
const FORMATS = {
  born: [
    { id: "days", label: "100 Days" },
    { id: "nichime", label: "100日目" },
    { id: "months", label: "3か月 8日" },
    { id: "age", label: "1さい 2か月" }
  ],
  womb: [
    { id: "weeks", label: "24週 3日" },
    { id: "wd", label: "24w3d" },
    { id: "left", label: "あと◯日" }
  ]
};

// いまの設定で、写真に入れる文字のまとまりを作る。null は日付がまだないとき
// { memo: ひとこと, top: 上の小さな行, big: 大きな数字, unit: 数字のとなり, small: さらに小さく, num: 数えあげる数（動き用）,
//   stats: うまれたときの記録, foot: 名前・日付 }
function countLabel(s = state) {
  const L = baseLabel(s);
  return L && { ...L, memo: s.memo || "", stats: statsText(s) };
}
// うまれたときの記録（3,120g ・ 49.5cm ・ 4:32 生まれ）。生まれてからのときだけ
function statsText(s = state) {
  if (s.mode !== "born" || !s.look.showStats) return "";
  let w = Number(String(s.bWeight).replace(/[^\d.]/g, ""));
  if (w && w < 20) w *= 1000; // 3.12 のように kg で入れたとき
  const l = Number(String(s.bLength).replace(/[^\d.]/g, ""));
  return [w ? `${Math.round(w).toLocaleString("ja-JP")}g` : "", l ? `${l}cm` : "", s.bTime ? `${s.bTime.replace(/^0(?=\d)/, "")} 生まれ` : ""].filter(Boolean).join(" ・ ");
}
function baseLabel(s) {
  const dayStr = s.day || todayStr();
  const day = parseDay(dayStr);
  const foot = [s.look.showName ? s.name : "", s.look.showDate ? dotDay(dayStr) : ""].filter(Boolean).join("  ");
  if (s.mode === "womb") {
    const due = parseDay(s.due);
    if (isNaN(due)) return null;
    const left = Math.round((due - day) / DAY);
    const g = 280 - left; // 妊娠の日数（予定日が 40週0日）
    if (s.fmtWomb === "left" || g < 0) {
      if (left <= 0) return { top: "", big: "きょう", unit: "", small: "会える日", num: null, foot };
      return { top: "会えるまで あと", big: String(left), unit: "日", small: "", num: left, foot };
    }
    const w = Math.floor(g / 7), d = g % 7;
    if (s.fmtWomb === "wd") return { top: "おなかの中で", big: String(w), unit: "w", small: `${d}d`, num: w, foot };
    return { top: "妊娠", big: String(w), unit: "週", small: d ? `${d}日` : "", num: w, foot };
  }
  const birth = parseDay(s.birth);
  if (isNaN(birth)) return null;
  const diff = Math.round((day - birth) / DAY);
  if (diff < 0) return { top: "生まれるまで あと", big: String(-diff), unit: "日", small: "", num: -diff, foot };
  const n = diff + (s.dayOne ? 1 : 0);
  if (s.fmtBorn === "nichime") return { top: "生まれて", big: String(n), unit: "日目", small: "", num: n, foot };
  if (s.fmtBorn === "months" || s.fmtBorn === "age") {
    const { y, m, d } = ymd(birth, day);
    if (s.fmtBorn === "age" && y > 0) return { top: "", big: String(y), unit: "さい", small: m ? `${m}か月` : "", num: y, foot };
    const months = y * 12 + m;
    if (months === 0) return { top: "生まれて", big: String(n), unit: "日目", small: "", num: n, foot };
    return { top: "生後", big: String(months), unit: "か月", small: d ? `${d}日` : "", num: months, foot };
  }
  return { top: "生まれて", big: String(n), unit: n === 1 ? "Day" : "Days", small: "", num: n, foot };
}

// つぎの節目（はじめの画面の「いまの数え」の下に出す。一覧は js/calendar.js の milestoneList）
function nextMilestone(s = state) {
  if (s.mode === "womb") {
    const due = parseDay(s.due);
    if (isNaN(due)) return "";
    const g = 280 - Math.round((due - parseDay(s.day || todayStr())) / DAY);
    if (g < 0 || g >= 280) return "";
    const nextW = Math.floor(g / 7) + 1;
    return `${nextW}週まで あと${nextW * 7 - g}日 ・ 予定日まで あと${280 - g}日`;
  }
  const next = milestoneList(s).find((m) => m.days > 0);
  return next ? `つぎの節目：${next.label}${next.note ? `（${next.note}）` : ""}まで あと${next.days}日` : "";
}

// 小さな知らせ（下に少し出して消える）
let toastTimer = 0;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

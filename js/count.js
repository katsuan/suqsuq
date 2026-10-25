// すくすく：日付と、写真に入れる数え（生まれて◯日・生後◯か月・妊娠◯週・記念日から◯日）を作る（画面には触らない）
// ファイル（index.html でこの順に読む）：js/count.js 数える → js/store.js 端末に残す → js/link.js リンク → js/ui.js 画面の小さな道具
//   → js/draw.js 描く → js/setup.js はじめの画面 → js/calendar.js 節目をカレンダーに → js/shoot.js 撮る画面 → app.js はじめに一度だけ
"use strict";

const DAY = 86400000;
const pad2 = (n) => String(n).padStart(2, "0");
// "2026-10-22" ⇄ 日付（時差でずれないよう、UTC の 0 時で扱う）
const parseDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return new Date(t).getUTCDate() === +m[3] && new Date(t).getUTCMonth() === +m[2] - 1 ? t : NaN; // 2027-13-99 のような日は読まない
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const dotDay = (s) => (s ? s.replace(/-/g, ".") : "");

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
  ],
  anniv: [
    { id: "nichime", label: "100日目" },
    { id: "ym", label: "1年 2か月" }
  ]
};
// 数えかた（タブ）ごとの、はじまりの日の呼び名・入力欄・表示の選び方を覚える名前
const MODES = {
  born: { dateWord: "生まれた日", input: "birth", fmtKey: "fmtBorn" },
  womb: { dateWord: "出産予定日", input: "due", fmtKey: "fmtWomb" },
  anniv: { dateWord: "記念日", input: "since", fmtKey: "fmtAnniv" }
};

// ---- 日数の計算 ----
// n か月あとの日。31日生まれの「1か月」は、その月の終わりの日（カレンダーの節目と同じ数え方）
const addMonths = (ms, n) => {
  const d = new Date(ms);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, last));
};

// 年・月・日の差（生後◯か月◯日・◯さい◯か月）。いちばん近い「◯か月の日」（addMonths）から何日たったか
function ymd(from, to) {
  const a = new Date(from), b = new Date(to);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (addMonths(from, months) > to) months -= 1;
  const d = Math.round((to - addMonths(from, months)) / DAY);
  return { y: Math.floor(months / 12), m: months % 12, d };
}

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
  if (s.mode === "anniv") return annivLabel(s, day, foot);
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

// 記念日から：「付き合った日から 100日目」「1年 2か月」。その日より前なら「あと◯日」
function annivLabel(s, day, foot) {
  const since = parseDay(s.since);
  if (isNaN(since)) return null;
  const title = s.sinceTitle || "記念日";
  const diff = Math.round((day - since) / DAY);
  if (diff < 0) return { top: `${title}まで あと`, big: String(-diff), unit: "日", small: "", num: -diff, foot };
  const n = diff + (s.dayOne ? 1 : 0);
  if (s.fmtAnniv === "ym") {
    const { y, m, d } = ymd(since, day);
    if (y > 0) return { top: `${title}から`, big: String(y), unit: "年", small: m ? `${m}か月` : "", num: y, foot };
    if (m > 0) return { top: `${title}から`, big: String(m), unit: "か月", small: d ? `${d}日` : "", num: m, foot };
  }
  return { top: `${title}から`, big: String(n), unit: "日目", small: "", num: n, foot };
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

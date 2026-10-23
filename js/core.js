// すくすく（SuQSuQ）：生まれて◯日・生後◯か月・妊娠◯週・記念日から◯日を、写真や動画にそのまま入れて残す。
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

// ---- 覚えておくこと（state）。この端末の localStorage に残す ----
const STORE_KEY = "suqsuq:state";
const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
};
// 外から来た文字（リンク・端末に残した中身）：文字だけにし、改行などの見えない文字を外して、長さを決める
const cleanText = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ").slice(0, max) : "");
const cleanDay = (v) => (typeof v === "string" && !isNaN(parseDay(v)) ? v : "");
const LOOK_DEFAULT = { tpl: "fuwari", color: "#e9735a", x: null, y: null, size: 1, showName: true, showDate: true, showStats: true, stamps: ["sparkle"], motion: "float" };
// 文字の形（look）を決まった形にそろえる（形のちがう値は、はじめの値に）
function cleanLook(raw) {
  const l = raw && typeof raw === "object" ? raw : {};
  const pos = (v) => (typeof v === "number" && v >= 0 && v <= 1 ? v : null);
  const x = pos(l.x), y = pos(l.y);
  return {
    tpl: typeof l.tpl === "string" && /^[a-z0-9_-]{1,24}$/i.test(l.tpl) ? l.tpl : LOOK_DEFAULT.tpl,
    color: typeof l.color === "string" && /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : LOOK_DEFAULT.color,
    x: x != null && y != null ? x : null,
    y: x != null && y != null ? y : null,
    size: typeof l.size === "number" && l.size >= 0.5 && l.size <= 1.8 ? l.size : 1,
    showName: l.showName !== false,
    showDate: l.showDate !== false,
    showStats: l.showStats !== false,
    stamps: Array.isArray(l.stamps) ? l.stamps.filter((id) => typeof id === "string" && /^[a-z0-9_-]{1,24}$/i.test(id)).slice(0, 12) : [...LOOK_DEFAULT.stamps],
    motion: typeof l.motion === "string" && /^[a-z0-9_-]{1,24}$/i.test(l.motion) ? l.motion : LOOK_DEFAULT.motion
  };
}
const saved = loadStore();
const state = {
  mode: MODES[saved.mode] ? saved.mode : "born", // 生まれてから／おなかの中／記念日から
  name: cleanText(saved.name, 16),
  birth: cleanDay(saved.birth),
  due: cleanDay(saved.due),
  since: cleanDay(saved.since), // 記念日から：はじまりの日と、その名前（付き合った日・結婚記念日など）
  sinceTitle: cleanText(saved.sinceTitle, 16),
  day: "", // 数える日（空ならきょう）。覚えない（次に開いたときは、きょう）
  dayOne: saved.dayOne !== false, // 生まれた日を1日目と数える
  fmtBorn: FORMATS.born.some((f) => f.id === saved.fmtBorn) ? saved.fmtBorn : "days",
  fmtWomb: FORMATS.womb.some((f) => f.id === saved.fmtWomb) ? saved.fmtWomb : "weeks",
  fmtAnniv: FORMATS.anniv.some((f) => f.id === saved.fmtAnniv) ? saved.fmtAnniv : "nichime",
  // 文字の形（テンプレート・色・位置・大きさ・いっしょに入れるもの・スタンプ・動き）。マイテンプレートにはこのまとまりを覚える
  look: cleanLook(saved.look),
  myLooks: (Array.isArray(saved.myLooks) ? saved.myLooks : [])
    .filter((m) => m && typeof m === "object" && cleanText(m.name, 12))
    .slice(0, 8)
    .map((m) => ({ name: cleanText(m.name, 12), look: cleanLook(m.look) })),
  aspect: ["9:16", "3:4", "1:1", "16:9"].includes(saved.aspect) ? saved.aspect : "9:16",
  kind: saved.kind === "video" ? "video" : "photo",
  facing: saved.facing === "user" ? "user" : "environment",
  sound: saved.sound !== false, // 動画に音も入れる
  memo: cleanText(saved.memo, 24), // ひとこと（写真に入れる好きな文字）
  bTime: /^\d{1,2}:\d{2}$/.test(saved.bTime || "") ? saved.bTime : "", // うまれたときの記録：時刻・体重（g）・身長（cm）
  bWeight: cleanText(saved.bWeight, 6),
  bLength: cleanText(saved.bLength, 5),
  designTab: ["look", "text", "deco", "save"].includes(saved.designTab) ? saved.designTab : "look", // 文字の形のタブ
  timer: [0, 3, 10].includes(saved.timer) ? saved.timer : 0, // セルフタイマー（秒）
  saveRaw: saved.saveRaw === true, // 文字・スタンプ入りに加えて、加工なしの元の写真・動画も残す（はじめはオフ）
  remind: ["morning", "eve", "none"].includes(saved.remind) ? saved.remind : "morning", // 節目のお知らせ（js/calendar.js の REMINDS）
  calWeekly: saved.calWeekly === true // おなかの中：毎週の◯週もカレンダーに
};
// リンクで日付を受けとる（くろのすの「すくすくで写真に入れる」など）：?birth=2026-07-14 ／ ?due=2027-03-01 ／ &name=はると
//   記念日から：?since=2020-04-01&title=付き合った日
// 受けとったら覚えて、アドレスからは消す（再読みこみで上書きしないように）
const fromLink = (() => {
  const q = new URLSearchParams(location.search);
  const ok = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !isNaN(parseDay(v));
  let got = "";
  if (ok(q.get("birth"))) {
    state.mode = "born";
    state.birth = q.get("birth");
    got = "生まれた日";
  } else if (ok(q.get("due"))) {
    state.mode = "womb";
    state.due = q.get("due");
    got = "出産予定日";
  } else if (ok(q.get("since"))) {
    state.mode = "anniv";
    state.since = q.get("since");
    state.sinceTitle = cleanText(q.get("title"), 16).trim();
    got = state.sinceTitle || "記念日";
  }
  if (got && q.get("name")) state.name = cleanText(q.get("name"), 16).trim();
  if (["birth", "due", "since", "title", "name"].some((k) => q.has(k))) {
    // 名前や誕生日が入ったリンクは、検索に出さない
    document.head.append(Object.assign(document.createElement("meta"), { name: "robots", content: "noindex" }));
    history.replaceState(null, "", location.pathname);
  }
  return got;
})();
const save = () => {
  try {
    const { day, ...rest } = state;
    localStorage.setItem(STORE_KEY, JSON.stringify(rest));
  } catch {
    // 残せなくても使える
  }
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

// 小さな知らせ（下に少し出して消える）。Q キットのトースト（新しいのが来たら前のは消える）
function toast(msg) {
  window.LineShareUI?.toast(msg, { ms: 2600 });
}

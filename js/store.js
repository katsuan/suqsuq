// すくすく：覚えておくこと（state）。この端末の localStorage（suqsuq:state）に残す。形のちがう値は、はじめの値にそろえる
// 読まれるところ：index.html（js/count.js のあと）。テストからも読む
"use strict";

const STORE_KEY = "suqsuq:state";
// 端末に残した中身を読む（読めないときは空）
const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
};
// 外から来た文字（リンク・端末に残した中身）：文字だけにし、改行などの見えない文字を外して、長さを決める
// 長さは文字で数える（絵文字を半分に切らない）
const cleanText = (v, max) => (typeof v === "string" ? Array.from(v.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")).slice(0, max).join("") : "");
// 正しい日付ならそのまま、ちがえば空
const cleanDay = (v) => (typeof v === "string" && !isNaN(parseDay(v)) ? v : "");
const LOOK_DEFAULT = { tpl: "fuwari", color: "#e9735a", x: null, y: null, size: 1, showName: true, showDate: true, showStats: true, stamps: ["sparkle"], motion: "float" };
// 文字の形（look）を決まった形にそろえる（形のちがう値は、はじめの値に）
function cleanLook(raw) {
  const l = raw && typeof raw === "object" ? raw : {};
  // 0〜1 の位置ならそのまま、ちがえば null
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
// いまの state を端末に残す（数える日は残さない）
const save = () => {
  try {
    const { day, ...rest } = state;
    localStorage.setItem(STORE_KEY, JSON.stringify(rest));
  } catch {
    // 残せなくても使える
  }
};

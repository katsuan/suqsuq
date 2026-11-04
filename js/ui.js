// すくすく：画面の小さな道具（要素を取る・時間の表示・HTML に入れる文字・知らせ）
// 読まれるところ：index.html（js/link.js のあと）
"use strict";

// id の要素を返す
const $ = (id) => document.getElementById(id);
// 秒を「分:秒」の文字にする
const clock = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`;
// HTML に入れる文字（innerHTML のとき）
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
// Q キットの線アイコン（ui.css の .ls-icon。名前は kit.html の「線アイコン」）。読み上げはしない
const lineIcon = (name) => {
  const el = document.createElement("span");
  el.className = "ls-icon";
  el.dataset.icon = name;
  el.setAttribute("aria-hidden", "true");
  return el;
};

// うれしい知らせに、季節の絵文字をときどき（Q キットの season.js。読めていなければそのまま）
const season = (text) => (window.QSeason ? window.QSeason.decorate(text) : text);
// 下に少し出して消える知らせ（Q キットのトースト。新しいのが来たら前のは消える）
function toast(msg) {
  window.LineShareUI?.toast(msg, { ms: 2600 });
}

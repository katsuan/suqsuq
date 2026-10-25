// すくすく：画面の小さな道具（要素を取る・時間の表示・HTML に入れる文字・知らせ）
"use strict";

const $ = (id) => document.getElementById(id);
const clock = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`;
// HTML に入れる文字（innerHTML のとき）
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// 小さな知らせ（下に少し出して消える）。Q キットのトースト（新しいのが来たら前のは消える）
// うれしい知らせに、季節の絵文字をときどき（Q キットの season.js。読めていなければそのまま）
const season = (text) => (window.QSeason ? window.QSeason.decorate(text) : text);
function toast(msg) {
  window.LineShareUI?.toast(msg, { ms: 2600 });
}

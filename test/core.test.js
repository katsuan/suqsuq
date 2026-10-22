// すくすく：端末に残した中身・リンクの読みこみ、日数の計算、カレンダーのファイルのテスト（画面に触らない部分）
//   node --test test/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const XSS = "<img src=x onerror=alert(1)>";
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

// core.js と calendar.js を、偽の localStorage・URL で読む
function load({ stored = null, search = "" } = {}) {
  const store = new Map(stored == null ? [] : [["suqsuq:state", typeof stored === "string" ? stored : JSON.stringify(stored)]]);
  const head = [];
  const ctx = {
    URLSearchParams,
    console,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    location: { search, pathname: "/suqsuq/" },
    history: { replaced: null, replaceState(_, __, url) { this.replaced = url; } },
    document: { head: { append: (el) => head.push(el) }, createElement: (tag) => ({ tag }), getElementById: () => null },
    window: {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/core.js") + "\n" + read("js/calendar.js") + "\n;globalThis.__ = { state, fromLink, countLabel, milestoneList, icsFor, save };", ctx);
  return { ...ctx.__, head, history: ctx.history, store };
}

test("ふつうに開くと、はじめの値", () => {
  const { state, fromLink, head } = load();
  assert.equal(state.mode, "born");
  assert.equal(state.name, "");
  assert.equal(fromLink, "");
  assert.equal(head.length, 0);
});

test("壊れた中身（JSON でない）でも落ちない", () => {
  const { state } = load({ stored: "{not json" });
  assert.equal(state.look.tpl, "fuwari");
});

test("端末に残した中身の形がちがうときは、はじめの値にそろえる", () => {
  const { state } = load({
    stored: {
      name: { a: 1 },
      birth: XSS,
      memo: "x".repeat(500),
      aspect: "4:5",
      fmtBorn: XSS,
      look: { tpl: XSS, color: "red;background:url(x)", size: 99, x: 5, y: 0.5, stamps: [XSS, "heart", 3], motion: null },
      myLooks: [null, { name: XSS, look: "x" }, ...Array.from({ length: 20 }, (_, i) => ({ name: "m" + i, look: {} }))]
    }
  });
  assert.equal(state.name, "");
  assert.equal(state.birth, "");
  assert.equal(state.memo.length, 24);
  assert.equal(state.aspect, "9:16");
  assert.equal(state.fmtBorn, "days");
  assert.deepEqual(JSON.parse(JSON.stringify(state.look)), { tpl: "fuwari", color: "#e9735a", x: null, y: null, size: 1, showName: true, showDate: true, showStats: true, stamps: ["heart"], motion: "float" });
  assert.equal(state.myLooks.length, 8);
  assert.ok(state.myLooks.every((m) => m.name.length <= 12 && typeof m.look === "object"));
});

test("リンクの日付と名前：受けとって、アドレスから消し、検索に出さない印を付ける", () => {
  const { state, fromLink, head, history } = load({ search: "?birth=2026-07-14&name=" + encodeURIComponent("はると\r\nX") });
  assert.equal(fromLink, "生まれた日");
  assert.equal(state.birth, "2026-07-14");
  assert.equal(state.name, "はると  X");
  assert.equal(history.replaced, "/suqsuq/");
  assert.ok(head.some((m) => m.name === "robots" && m.content === "noindex"));
});

test("リンクのおかしな日付は受けとらない。名前はそのまま文字で、長さは 16 まで", () => {
  assert.equal(load({ search: "?birth=" + encodeURIComponent(XSS) }).fromLink, "");
  assert.equal(load({ search: "?due=2027-13-99" }).fromLink, "");
  const { state } = load({ search: "?due=2027-03-01&name=" + encodeURIComponent(XSS + XSS) });
  assert.equal(state.mode, "womb");
  assert.equal(state.name, (XSS + XSS).slice(0, 16));
});

test("日数の計算", () => {
  const { state, countLabel } = load({ stored: { birth: "2026-01-01" } });
  state.day = "2026-04-10";
  assert.equal(countLabel().big, "100"); // 生まれた日を1日目
  state.fmtBorn = "months";
  assert.equal(countLabel().big, "3");
  state.mode = "womb";
  state.due = "2026-07-05";
  state.day = "2026-07-05";
  assert.equal(countLabel().big, "40");
});

test("カレンダーのファイル：名前に改行やカンマが入っても行が崩れない", () => {
  const { state, milestoneList, icsFor } = load({ stored: { birth: "2026-01-01" } });
  state.day = "2026-01-01";
  state.name = "a\r\nATTACH:x,;";
  const ics = icsFor(milestoneList().slice(0, 2));
  const lines = ics.split("\r\n");
  assert.ok(lines.every((l) => !l.startsWith("ATTACH")));
  assert.ok(lines.some((l) => l.startsWith("SUMMARY:") && l.includes("\\n") && l.includes("\\,") && l.includes("\;")));
});

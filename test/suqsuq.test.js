// すくすく：端末に残した中身・リンクの読みこみ、日数の計算、カレンダーのファイルのテスト（画面に触らない部分）
//   node --test test/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const XSS = "<img src=x onerror=alert(1)>"; // qcheck-ok: W8 外からの文字の見本
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
  vm.runInContext(["js/count.js", "js/store.js", "js/link.js", "js/calendar.js"].map(read).join("\n") + "\n;globalThis.__ = { state, fromLink, linkBefore, countLabel, milestoneList, icsFor, save, qronosLinks };", ctx);
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

test("月の終わり・うるう年に生まれた子の「生後◯か月◯日」「◯さい」も、マイナスにならずカレンダーの節目とそろう", () => {
  const { state, countLabel, milestoneList } = load({ stored: { birth: "2026-01-31" } });
  const at = (day, fmt = "months") => {
    state.day = day;
    state.fmtBorn = fmt;
    const L = countLabel();
    return `${L.big}${L.unit}${L.small}`;
  };
  assert.equal(at("2026-02-27"), "28日目");
  assert.equal(at("2026-02-28"), "1か月", "31日生まれの1か月は、2月の終わりの日（カレンダーの節目と同じ）");
  assert.equal(at("2026-03-01"), "1か月1日");
  assert.equal(at("2026-03-31"), "2か月");
  state.day = "2026-01-31";
  assert.equal(milestoneList().find((m) => m.label === "生後1か月").date, "2026-02-28");
  state.birth = "2024-02-29";
  assert.equal(at("2025-02-27", "age"), "11か月29日");
  assert.equal(at("2025-02-28", "age"), "1さい");
  assert.equal(at("2028-02-29", "age"), "4さい");
  state.birth = "2026-05-15";
  assert.equal(at("2026-06-14"), "31日目");
  assert.equal(at("2026-06-15"), "1か月");
  assert.equal(at("2027-07-20", "age"), "1さい2か月");
});

test("かぞく（KazoQ）のリンクの形：?due= ／ ?birth= だけでも受けとる", () => {
  const due = load({ search: "?due=2027-03-01" });
  assert.equal(due.fromLink, "出産予定日");
  assert.equal(due.state.mode, "womb");
  assert.equal(due.state.due, "2027-03-01");
  const birth = load({ search: "?birth=2026-07-14" });
  assert.equal(birth.state.mode, "born");
  assert.equal(birth.state.birth, "2026-07-14");
});

test("くろのすへ：おなかの中は出産予定日まで、生まれてからはつぎの節目と毎年の誕生日（日付と名前を渡す）", () => {
  const future = new Date(Date.now() + 100 * 864e5).toISOString().slice(0, 10);
  const womb = load({ stored: { mode: "womb", due: future, name: "ひな" } });
  const [w] = womb.qronosLinks();
  const wq = new URL(w.url).searchParams;
  assert.equal(wq.get("type"), "until");
  assert.equal(wq.get("date"), future);
  assert.equal(wq.get("title"), "ひなに会える日");
  const past = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const born = load({ stored: { mode: "born", birth: past, name: "はると" } });
  const links = born.qronosLinks();
  assert.equal(links.length, 2);
  const yq = new URL(links[1].url).searchParams;
  assert.equal(yq.get("type"), "yearly");
  assert.equal(yq.get("date"), past);
  assert.equal(yq.get("title"), "はるとの誕生日");
  assert.equal(new URL(links[0].url).searchParams.get("type"), "until");
  // 日付がない・過ぎた予定日なら出さない
  assert.equal(load({ stored: { mode: "born" } }).qronosLinks().length, 0);
  assert.equal(load({ stored: { mode: "womb", due: past } }).qronosLinks().length, 0);
  // 名前に危ない文字が入っていても、URL の中身として渡るだけ
  const x = load({ stored: { mode: "born", birth: past, name: XSS } }).qronosLinks();
  assert.ok(x[1].url.startsWith("https://katsuan.github.io/countdown/index.html?"));
});

test("記念日から：「付き合った日から 100日目」「1年 2か月」。その日より前は「あと◯日」", () => {
  const t = load({ stored: { mode: "anniv", since: "2025-01-01", sinceTitle: "付き合った日", dayOne: true } });
  t.state.day = "2025-04-10"; // 99日たった日（1日目と数えて 100日目）
  let L = t.countLabel();
  assert.equal(L.top, "付き合った日から");
  assert.equal(L.big, "100");
  assert.equal(L.unit, "日目");
  t.state.fmtAnniv = "ym";
  t.state.day = "2026-03-15";
  L = t.countLabel();
  assert.deepEqual([L.big, L.unit, L.small], ["1", "年", "2か月"]);
  t.state.day = "2024-12-25";
  L = t.countLabel();
  assert.deepEqual([L.top, L.big], ["付き合った日まで あと", "7"]);
  // 名前がないときは「記念日から」
  const u = load({ stored: { mode: "anniv", since: "2025-01-01" } });
  assert.equal(u.countLabel().top, "記念日から");
});

test("記念日から：リンク（?since=&title=）で受けとり、節目（100日・◯周年）とくろのすへのボタンが出る", () => {
  const t = load({ search: `?since=2025-01-01&title=${encodeURIComponent("付き合った日")}` });
  assert.equal(t.state.mode, "anniv");
  assert.equal(t.state.since, "2025-01-01");
  assert.equal(t.state.sinceTitle, "付き合った日");
  assert.equal(t.history.replaced, "/suqsuq/");
  const list = t.milestoneList({ ...t.state, day: "2025-01-01" });
  assert.ok(list.some((m) => m.label === "付き合った日から100日"));
  assert.ok(list.some((m) => m.note === "1周年" && m.date === "2026-01-01"));
  const links = t.qronosLinks();
  const yearly = new URL(links[links.length - 1].url).searchParams;
  assert.deepEqual([yearly.get("type"), yearly.get("date"), yearly.get("title")], ["yearly", "2025-01-01", "付き合った日"]);
  // 壊れた・長すぎる名前はそろえる
  const x = load({ search: `?since=2025-01-01&title=${encodeURIComponent(XSS + "あ".repeat(40))}` });
  assert.ok(x.state.sinceTitle.length <= 16);
});

test("リンクの名前が16文字目で絵文字にかかっても、絵文字を半分に切らない", () => {
  const title = "あ".repeat(15) + "🎉おめでとう";
  const { state } = load({ search: `?since=2025-01-01&title=${encodeURIComponent(title)}` });
  assert.equal(state.sinceTitle, "あ".repeat(15) + "🎉");
  const kid = load({ search: `?birth=2026-07-14&name=${encodeURIComponent("あ".repeat(15) + "👶ちゃん")}` });
  assert.equal(kid.state.name, "あ".repeat(15) + "👶");
});

test("リンクで前の日付を書きかえたときだけ、元に戻せるように前のものを覚える", () => {
  // はじめての人（何も入れていない）には「元に戻す」を出さない
  const fresh = load({ search: "?birth=2026-07-14" });
  assert.equal(fresh.fromLink, "生まれた日");
  assert.equal(fresh.linkBefore, null);
  // 前にちがう子の日付を入れていた人には、前のものを覚えておく
  const saved = JSON.stringify({ mode: "born", birth: "2024-01-02", name: "ひな" });
  const over = load({ search: "?birth=2026-07-14&name=" + encodeURIComponent("はると"), stored: saved });
  assert.equal(over.state.birth, "2026-07-14");
  assert.equal(over.linkBefore.birth, "2024-01-02");
  assert.equal(over.linkBefore.name, "ひな");
  // 同じ日付・名前なら、覚えない
  const same = load({ search: "?birth=2024-01-02&name=" + encodeURIComponent("ひな"), stored: saved });
  assert.equal(same.linkBefore, null);
});

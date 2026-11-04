// ファイルを読む順番：動くスタンプ（js/stamps.js）は js/draw.js のあと、app.js の前。前の index.html のために js/main.js からも読む
//   node --test test/
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("読む順番：js/draw.js → js/stamps.js → app.js。前の名前の js/main.js も js/stamps.js を読んでから app.js", () => {
  const html = read("index.html");
  const at = (f) => html.indexOf(`src="${f}`);
  assert.ok(at("js/draw.js") > 0 && at("js/draw.js") < at("js/stamps.js") && at("js/stamps.js") < at("app.js"), "読む順番がちがう");
  const stub = read("js/main.js");
  assert.ok(stub.indexOf('src="js/stamps.js"') > 0 && stub.indexOf('src="js/stamps.js"') < stub.indexOf('src="app.js"'), "js/main.js が js/stamps.js を読まない");
});

test("動くスタンプ：一覧（STAMPS）の id には、どれも描き方がある", () => {
  const src = read("js/stamps.js");
  const ids = [...src.slice(src.indexOf("const STAMPS"), src.indexOf("];", src.indexOf("const STAMPS"))).matchAll(/id: "([a-z]+)"/g)].map((m) => m[1]);
  const table = src.slice(src.indexOf("const STAMP_DRAW"), src.indexOf("};", src.indexOf("const STAMP_DRAW")));
  assert.ok(ids.length >= 7);
  for (const id of ids) assert.match(table, new RegExp(`\\b${id}: stamp`), `${id} の描き方がない`);
});

// すくすく：リンクの受け渡し。リンクで日付を受けとる（?birth= ／ ?due= ／ ?since=&title= ／ &name=）と、くろのすを開くリンク
// 読まれるところ：index.html（js/store.js のあと）。テストからも読む
"use strict";

// リンクで日付を受けとる（くろのすの「すくすくで写真に入れる」など）：?birth=2026-07-14 ／ ?due=2027-03-01 ／ &name=はると
//   記念日から：?since=2020-04-01&title=付き合った日
// 受けとったら覚えて、アドレスからは消す（再読みこみで上書きしないように）
const fromLink = (() => {
  const q = new URLSearchParams(location.search);
  // 正しい日付（YYYY-MM-DD）か
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

// きょうから見て、つぎの節目（数える日をずらしていても、きょうから）
const upcomingMilestone = (s) => milestoneList({ ...s, day: "" }).find((m) => m.days > 0);

// くろのす（Qronos）で「あと何日？」を数えるページ。日付・名前を入れた状態で開く
// おなかの中：出産予定日まで。生まれてから：つぎの節目まで・毎年の誕生日
const QRONOS_URL = "https://katsuan.github.io/countdown/index.html";
// くろのすで「あと何日？」を数えるページのリンク（{ label, url } の並び）。日付がなければ空
function qronosLinks(s = state) {
  const who = s.name ? `${s.name}の` : "";
  // くろのすのページの URL（色はすくすくに近い sunset）
  const url = (q) => `${QRONOS_URL}?${new URLSearchParams({ ...q, color: "sunset" })}`;
  if (s.mode === "womb") {
    const due = parseDay(s.due);
    if (isNaN(due) || due < parseDay(todayStr())) return [];
    return [{ label: "👶 出産予定日まで", url: url({ type: "until", date: s.due, title: `${s.name ? s.name + "に" : "赤ちゃんに"}会える日`, emoji: "👶" }) }];
  }
  if (s.mode === "anniv") {
    if (isNaN(parseDay(s.since))) return [];
    const title = s.sinceTitle || "記念日";
    const next = upcomingMilestone(s);
    const out = [];
    if (next) out.push({ label: `🎉 ${next.note || next.label.replace(`${title}から`, "")}まで`, url: url({ type: "until", date: next.date, title: next.note ? `${title}の${next.note}` : next.label, emoji: "🎉" }) });
    out.push({ label: "💞 毎年の記念日", url: url({ type: "yearly", date: s.since, title, emoji: "💞" }) });
    return out;
  }
  if (isNaN(parseDay(s.birth))) return [];
  const links = [];
  const next = upcomingMilestone(s);
  if (next) links.push({ label: `🎉 ${next.note || next.label}まで`, url: url({ type: "until", date: next.date, title: `${who}${next.note || next.label}`, emoji: "🎉" }) });
  links.push({ label: "🎂 毎年の誕生日", url: url({ type: "yearly", date: s.birth, title: `${who}誕生日`, emoji: "🎂" }) });
  return links;
}

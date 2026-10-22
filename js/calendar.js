// 節目をカレンダーに：これからの節目（100日・ハーフバースデー・妊娠◯週など）を、
// まとめてカレンダーのファイル（.ics。お知らせつき）に、または1件ずつ Google カレンダーの予定作成画面に。
// GitHub Pages だけではお知らせ（push）を送れないので、カレンダーのお知らせで知らせる（作りはくろのすの calendarUrl・icsText と同じ）。
"use strict";

const PAGE_URL = "https://katsuan.github.io/suqsuq/";
const dayStr = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
const addMonths = (ms, n) => {
  const d = new Date(ms);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // 31日生まれの「1か月」は、その月の終わりの日
  return Date.UTC(y, m, Math.min(day, last));
};

// 節目の一覧（数える日から先のもの）。{ date: "2026-10-22", label: "生まれて100日", note: "お食い初め" }
function milestoneList(s = state) {
  const from = parseDay(s.day || todayStr());
  const list = [];
  if (s.mode === "womb") {
    const due = parseDay(s.due);
    if (isNaN(due)) return [];
    const weekDay = (w) => due - (280 - w * 7) * DAY;
    const notes = { 16: "安定期のころ", 20: "折り返し", 28: "妊娠後期", 36: "臨月", 37: "正期産", 40: "出産予定日" };
    for (let w = 4; w <= 41; w++) {
      if (!notes[w] && !s.calWeekly) continue;
      list.push({ date: weekDay(w), label: `妊娠${w}週`, note: notes[w] || "" });
    }
  } else {
    const birth = parseDay(s.birth);
    if (isNaN(birth)) return [];
    const nth = (n) => birth + (n - (s.dayOne ? 1 : 0)) * DAY; // ◯日目の日
    list.push({ date: nth(7), label: "生まれて7日", note: "お七夜" });
    for (const [n, note] of [[100, "お食い初め"], [200, ""], [300, ""], [500, ""], [1000, ""]]) list.push({ date: nth(n), label: `生まれて${n}日`, note });
    for (let m = 1; m <= 11; m++) list.push({ date: addMonths(birth, m), label: `生後${m}か月`, note: m === 1 ? "お宮参りのころ" : m === 6 ? "ハーフバースデー" : "" });
    for (let y = 1; y <= 6; y++) list.push({ date: addMonths(birth, y * 12), label: `${y}さいの誕生日`, note: "" });
  }
  return list
    .filter((m) => m.date >= from)
    .sort((a, b) => a.date - b.date)
    .map((m) => ({ ...m, date: dayStr(m.date), days: Math.round((m.date - from) / DAY) }));
}

const eventTitle = (m, s = state) => `🌱 ${s.name ? s.name + " " : ""}${m.label}${m.note ? `（${m.note}）` : ""}`;
const eventDetails = () => `すくすくで、きょうの写真を撮ろう\n${PAGE_URL}`;
const compact = (d) => d.replace(/-/g, "");
const nextDay = (d) => compact(dayStr(parseDay(d) + DAY));

// Google カレンダーの予定作成画面（終日の予定。お知らせは Google カレンダーの決まりのもの）
function googleCalendarUrl(m) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: eventTitle(m), dates: `${compact(m.date)}/${nextDay(m.date)}`, details: eventDetails() });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// お知らせの時間（終日の予定の 0 時からのずれ）
const REMINDS = [
  { id: "morning", label: "当日の朝 9時", trigger: "PT9H" },
  { id: "eve", label: "前の日の夜 8時", trigger: "-PT4H" },
  { id: "none", label: "なし", trigger: "" }
];

// まとめたカレンダーのファイル（.ics）。iPhone は開くと「すべてを追加」、Android・パソコンはカレンダーに読みこむ
function icsFor(list, s = state) {
  const esc = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n|\r/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const trigger = (REMINDS.find((r) => r.id === s.remind) || REMINDS[0]).trigger;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//katsuan//suqsuq//JA", "CALSCALE:GREGORIAN", "X-WR-CALNAME:すくすく"];
  for (const m of list) {
    lines.push(
      "BEGIN:VEVENT",
      // 同じ節目を2回入れても1つになるよう、UID は中身から決める
      `UID:suqsuq-${s.mode}-${compact(m.date)}-${encodeURIComponent(m.label).replace(/%/g, "")}@katsuan.github.io`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(m.date)}`,
      `DTEND;VALUE=DATE:${nextDay(m.date)}`,
      `SUMMARY:${esc(eventTitle(m, s))}`,
      `DESCRIPTION:${esc(eventDetails())}`,
      `URL:${PAGE_URL}`,
      "TRANSP:TRANSPARENT"
    );
    if (trigger) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(eventTitle(m, s))}`, `TRIGGER:${trigger}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

function downloadIcs(list) {
  const blob = new Blob([icsFor(list)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `suqsuq${state.name ? "-" + state.name : ""}-節目.ics` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---- 画面（はじめの画面の「🔔 節目をカレンダーに」） ----
const calOff = new Set(); // 入れないことにした節目（日付＋名前）
const calKey = (m) => `${m.date}|${m.label}`;

function renderCalendar() {
  const list = milestoneList();
  $("calMeta").textContent = list.length ? `${list.length}件` : "";
  $("calWeeklyRow").hidden = state.mode !== "womb";
  $("calWeekly").checked = !!state.calWeekly;
  const box = $("calList");
  box.replaceChildren();
  if (!list.length) {
    box.append(Object.assign(document.createElement("p"), { className: "ls-hint", textContent: `${state.mode === "womb" ? "出産予定日" : "生まれた日"}を入れると、これからの節目が出ます。` }));
  }
  for (const m of list) {
    const row = document.createElement("div");
    row.className = "cal-row";
    const check = Object.assign(document.createElement("input"), { type: "checkbox", checked: !calOff.has(calKey(m)) });
    check.setAttribute("aria-label", `${m.label}を入れる`);
    check.addEventListener("change", () => {
      check.checked ? calOff.delete(calKey(m)) : calOff.add(calKey(m));
      renderCalCount();
    });
    const text = document.createElement("label");
    text.className = "cal-text";
    text.append(check);
    const body = document.createElement("span");
    body.innerHTML = `<b></b><small></small>`;
    body.querySelector("b").textContent = m.label + (m.note ? `（${m.note}）` : "");
    body.querySelector("small").textContent = `${dotDay(m.date)}・${m.days === 0 ? "きょう" : `あと${m.days}日`}`;
    text.append(body);
    const g = Object.assign(document.createElement("a"), { className: "cal-g", href: googleCalendarUrl(m), target: "_blank", rel: "noopener", textContent: "Google" });
    g.setAttribute("aria-label", `${m.label}を Google カレンダーに入れる`);
    row.append(text, g);
    box.append(row);
  }
  const reminds = $("calRemind");
  reminds.replaceChildren();
  for (const r of REMINDS) {
    reminds.append(chip(r.label, (state.remind || "morning") === r.id, () => {
      state.remind = r.id;
      save();
      renderCalendar();
    }));
  }
  renderCalCount();
}
function renderCalCount() {
  const n = milestoneList().filter((m) => !calOff.has(calKey(m))).length;
  $("calIcs").disabled = n === 0;
  $("calIcs").textContent = `📥 ${n}件をまとめてカレンダーに入れる`;
}

function bindCalendar() {
  $("calIcs").addEventListener("click", () => {
    const list = milestoneList().filter((m) => !calOff.has(calKey(m)));
    if (!list.length) return;
    downloadIcs(list);
    toast("カレンダーのファイルを作りました。開くと追加できます");
  });
  $("calWeekly").addEventListener("change", () => {
    state.calWeekly = $("calWeekly").checked;
    save();
    renderCalendar();
  });
}

// はじめの画面：なまえ・日付・表示の選び方・文字の形（テンプレート・色・大きさ・スタンプ・動き・マイテンプレート）と見本。
// 文字の形の欄（#design）は、撮る画面でも下から出るシートに移して使う。
"use strict";

const chip = (label, pressed, onClick, extra = "") => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `ls-chip ${extra}`.trim();
  b.textContent = label;
  b.setAttribute("aria-pressed", String(!!pressed));
  b.addEventListener("click", onClick);
  return b;
};

// 文字の形が変わったら：覚えて、チップを選びなおす（描きなおしは毎フレームのループで）
function lookChanged() {
  save();
  renderDesign();
  renderExamples();
}

// ひとことの例（押すと入る）
const MEMO_EXAMPLES = {
  born: ["はじめまして", "ようこそ わが家へ", "お食い初め", "ハーフバースデー", "はじめての寝がえり", "はじめてのおすわり", "はじめての一歩", "1さい おめでとう", "すやすや"],
  womb: ["おなかの中から こんにちは", "もうすぐ会えるね", "安定期に入りました", "はじめての胎動", "マタニティフォト", "あと少し！"],
  anniv: ["いつもありがとう", "これからもよろしくね", "記念日おめでとう", "100日記念", "ふたりの記念日", "つづけてきたね"]
};
// おすすめの組み合わせ（スタンプ・文字の見本）。押すと形・色・スタンプ・動き・ひとことをまとめて入れる
const RECIPES = {
  born: [
    { label: "👋 はじめまして", tpl: "frame", color: "#e9735a", stamps: ["sparkle"], motion: "none", memo: "はじめまして" },
    { label: "🍚 お食い初め", tpl: "fuwari", color: "#e9735a", stamps: ["petal", "sparkle"], motion: "float", memo: "お食い初め" },
    { label: "🎈 ハーフバースデー", tpl: "badge", color: "#5aa9e6", stamps: ["balloon", "confetti"], motion: "count", memo: "ハーフバースデー" },
    { label: "🎂 1さいの誕生日", tpl: "pop", color: "#f4b740", stamps: ["confetti", "balloon"], motion: "pop", memo: "1さい おめでとう" },
    { label: "🌙 ねんね", tpl: "elegant", color: "#9b7fe0", stamps: ["star", "sparkle"], motion: "float", memo: "すやすや" },
    { label: "👣 はじめての", tpl: "hand", color: "#5cb85c", stamps: ["sparkle", "heart"], motion: "wave", memo: "はじめての寝がえり" }
  ],
  womb: [
    { label: "💗 マタニティ", tpl: "elegant", color: "#ff8fab", stamps: ["heart", "bubble"], motion: "float", memo: "もうすぐ会えるね" },
    { label: "🫧 おなかの中", tpl: "fuwari", color: "#5aa9e6", stamps: ["bubble", "sparkle"], motion: "float", memo: "おなかの中から こんにちは" },
    { label: "🌸 安定期", tpl: "hand", color: "#ff8fab", stamps: ["petal"], motion: "float", memo: "安定期に入りました" },
    { label: "⏳ あと少し", tpl: "badge", color: "#e9735a", stamps: ["sparkle", "star"], motion: "count", memo: "あと少し！" }
  ],
  anniv: [
    { label: "💞 ふたりの記念日", tpl: "elegant", color: "#ff8fab", stamps: ["heart", "sparkle"], motion: "float", memo: "ふたりの記念日" },
    { label: "💯 100日記念", tpl: "badge", color: "#e9735a", stamps: ["confetti", "sparkle"], motion: "count", memo: "100日記念" },
    { label: "🎉 ◯周年", tpl: "pop", color: "#f4b740", stamps: ["confetti", "balloon"], motion: "pop", memo: "記念日おめでとう" },
    { label: "🌱 つづけてきた", tpl: "hand", color: "#5cb85c", stamps: ["sparkle", "star"], motion: "wave", memo: "つづけてきたね" }
  ]
};
function setMemo(text) {
  state.memo = text;
  $("memo").value = text;
  save();
  renderExamples();
}
function renderExamples() {
  const memo = $("memoChips");
  memo.replaceChildren();
  for (const t of MEMO_EXAMPLES[state.mode]) memo.append(chip(t, state.memo === t, () => setMemo(state.memo === t ? "" : t)));
  if (state.memo && !MEMO_EXAMPLES[state.mode].includes(state.memo)) memo.append(chip("✕ けす", false, () => setMemo("")));
  const rec = $("recipeChips");
  rec.replaceChildren();
  for (const r of RECIPES[state.mode]) {
    rec.append(chip(r.label, false, () => {
      Object.assign(state.look, { tpl: r.tpl, color: r.color, stamps: [...r.stamps], motion: r.motion, x: null, y: null, size: 1 });
      setMemo(r.memo);
      restartMotion();
      lookChanged();
      toast(`「${r.label.replace(/^\S+ /, "")}」の組み合わせにしました`);
    }));
  }
}

function renderFormats() {
  const box = $("fmtChips");
  box.replaceChildren();
  const key = MODES[state.mode].fmtKey;
  for (const f of FORMATS[state.mode]) {
    box.append(chip(f.label, state[key] === f.id, () => {
      state[key] = f.id;
      save();
      renderAll();
    }));
  }
}

function renderDesign() {
  const look = state.look;
  // テンプレート：そのテンプレートの字で名前を出す
  const tpls = $("tplChips");
  tpls.replaceChildren();
  for (const t of TEMPLATES) {
    const b = chip(t.label, look.tpl === t.id, () => {
      look.tpl = t.id;
      look.x = look.y = null; // テンプレートの決まりの位置へ
      lookChanged();
    }, "tpl-chip");
    b.style.fontFamily = t.font;
    b.style.fontWeight = t.weight;
    tpls.append(b);
  }
  const colors = $("colorChips");
  colors.replaceChildren();
  for (const c of LOOK_COLORS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ls-swatch";
    b.style.setProperty("--swatch", c);
    b.setAttribute("aria-label", c);
    b.setAttribute("aria-pressed", String(look.color === c));
    b.addEventListener("click", () => {
      look.color = c;
      lookChanged();
    });
    colors.append(b);
  }
  // カスタム：好きな色（色見本を押すと、端末の色えらびが開く）
  const custom = !LOOK_COLORS.includes(look.color);
  const cb = document.createElement("label");
  cb.className = `ls-swatch is-custom${custom ? " is-selected" : ""}`;
  cb.style.setProperty("--swatch", look.color);
  cb.title = "好きな色";
  const picker = Object.assign(document.createElement("input"), { type: "color", value: look.color });
  picker.setAttribute("aria-label", "好きな色");
  picker.addEventListener("input", () => {
    look.color = picker.value;
    cb.classList.add("is-selected");
    cb.style.setProperty("--swatch", picker.value);
    colors.querySelectorAll("button.ls-swatch").forEach((x) => x.setAttribute("aria-pressed", "false"));
    save();
  });
  picker.addEventListener("change", lookChanged);
  cb.append(picker);
  colors.append(cb);
  $("size").value = look.size;
  $("size").disabled = tplOf(look.tpl).fixed;
  $("center").disabled = tplOf(look.tpl).fixed;

  const extra = $("extraChips");
  extra.replaceChildren(
    chip("なまえ", look.showName, () => {
      look.showName = !look.showName;
      lookChanged();
    }),
    chip("日付", look.showDate, () => {
      look.showDate = !look.showDate;
      lookChanged();
    })
  );
  if (state.mode === "born") {
    extra.append(chip("うまれたときの記録", look.showStats, () => {
      look.showStats = !look.showStats;
      lookChanged();
    }));
  }

  const stamps = $("stampChips");
  stamps.replaceChildren();
  for (const s of STAMPS) {
    const on = look.stamps.includes(s.id);
    stamps.append(chip(s.label, on, () => {
      look.stamps = on ? look.stamps.filter((x) => x !== s.id) : [...look.stamps, s.id];
      lookChanged();
    }));
  }
  const motions = $("motionChips");
  motions.replaceChildren();
  for (const m of MOTIONS) {
    motions.append(chip(m.label, look.motion === m.id, () => {
      look.motion = m.id;
      restartMotion();
      lookChanged();
    }));
  }

  // マイテンプレート：押すとその形に。長押し（右クリック）で消す
  const my = $("myChips");
  my.replaceChildren();
  state.myLooks.forEach((m, i) => {
    let held = false; // 長押しで消したあとの「押した」は使わない
    let hold = 0;
    const b = chip(`★ ${m.name}`, false, () => {
      if (held) return (held = false);
      state.look = Object.assign({}, state.look, m.look);
      restartMotion();
      lookChanged();
      toast(`「${m.name}」の形にしました`);
    });
    const del = (e) => {
      e.preventDefault();
      clearTimeout(hold);
      held = true;
      // 聞かずに消して、「元に戻す」を出す
      state.myLooks.splice(i, 1);
      lookChanged();
      LineShareUI.toast(`「${m.name}」を消しました`, {
        actionLabel: "元に戻す",
        onAction: () => {
          state.myLooks.splice(i, 0, m);
          lookChanged();
        }
      });
    };
    b.addEventListener("contextmenu", del);
    b.addEventListener("pointerdown", () => (hold = setTimeout(() => del(new Event("x")), 700)));
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(hold)));
    my.append(b);
  });
  if (state.myLooks.length < 8) {
    my.append(chip("＋ いまの形を保存", false, async () => {
      const name = await LineShareUI.ask({ title: "名前をつけてね", text: "例：100日の記念", input: `${tplOf(look.tpl).label}${state.myLooks.length + 1}`, ok: "保存", maxLength: 12 });
      if (!name) return;
      state.myLooks.push({ name: name.slice(0, 12), look: JSON.parse(JSON.stringify(look)) });
      lookChanged();
      toast("マイテンプレートに保存しました（長押しで消せます）");
    }, "is-add"));
  }
}

// うまれたときの記録の見出しの右（入れたものを短く）
function renderStatsMeta() {
  $("statsMeta").textContent = statsText({ ...state, mode: "born", look: { showStats: true } }) || "";
}

// いまの数え（大きく）と、つぎの節目
function renderToday() {
  const L = countLabel();
  if (L) $("dateError").hidden = true;
  const box = $("today");
  if (!L) {
    // qcheck-ok: W1 決まった文字だけ
    box.innerHTML = `<p class="ls-hint">${MODES[state.mode].dateWord}を入れると、ここに数えた日が出ます。</p>`;
    $("cameraOpen").textContent = "📅 まず日付を入れる";
    return;
  }
  $("cameraOpen").textContent = "📷 カメラを開く";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  box.innerHTML =
    `<p class="today-main">${state.day ? "その日は" : "きょうは"} <span>${esc(L.top)}</span> <span class="nw"><b>${esc(L.big)}</b><span>${esc(L.unit)}</span></span> <span>${esc(L.small)}</span></p>` +
    `<p class="ls-hint">${esc(nextMilestone())}</p>` +
    qronosRow();
}

// くろのすで「あと何日？」を数えるページを開く（日付と名前を入れて）
function qronosRow() {
  const links = qronosLinks();
  if (!links.length) return "";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return (
    `<div class="qronos-links"><span class="ls-hint">⏳ くろのすで数える</span>` +
    links.map((l) => `<a class="ls-chip is-small" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("") +
    "</div>"
  );
}

// 文字の形のタブ（形・文字・かざり・保存）
function renderDesignTab() {
  document.querySelectorAll("[data-dtab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.dtab === state.designTab)));
  document.querySelectorAll("[data-group]").forEach((g) => (g.hidden = g.dataset.group !== state.designTab));
}

// 日付がまだないとき：カメラ・写真のボタンを押したら、日付の欄へ案内する
function needDate() {
  if (countLabel()) return false;
  const input = $(MODES[state.mode].input);
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.classList.add("is-need");
  setTimeout(() => input.classList.remove("is-need"), 1600);
  $("dateError").textContent = `さきに${MODES[state.mode].dateWord}を入れてね`;
  $("dateError").hidden = false;
  return true;
}

function renderMode() {
  document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === state.mode)));
  // data-mode-only="born anniv" のように、空白で区切って複数の数えかたで出せる
  document.querySelectorAll("[data-mode-only]").forEach((el) => (el.hidden = !el.dataset.modeOnly.split(" ").includes(state.mode)));
}

function renderAll() {
  renderMode();
  renderFormats();
  renderDesign();
  renderExamples();
  renderDesignTab();
  renderToday();
  renderCalendar();
  $("dayMeta").textContent = state.day ? dotDay(state.day) : "きょう";
  $("day").value = state.day || todayStr();
}

// ---- ドラッグで文字を動かす・2本指で大きさを変える（見本・撮る画面の両方） ----
function attachDrag(canvas, getBox, onStart) {
  const pts = new Map();
  let drag = null, pinch = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
  };
  canvas.addEventListener("pointerdown", (e) => {
    const box = getBox();
    if (!box || box.fixed) return;
    pts.set(e.pointerId, toCanvas(e));
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), size: state.look.size };
      drag = null;
      return;
    }
    const [x, y] = toCanvas(e);
    const m = Math.max(box.w, box.h) * 0.12;
    if (x < box.x - m || x > box.x + box.w + m || y < box.y - m || y > box.y + box.h + m) return;
    const tpl = tplOf(state.look.tpl);
    const [px, py] = state.look.x == null ? tpl.pos : [state.look.x, state.look.y];
    drag = { x, y, px, py };
    canvas.setPointerCapture(e.pointerId);
    onStart?.();
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, toCanvas(e));
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      state.look.size = Math.min(1.8, Math.max(0.5, pinch.size * (d / pinch.d)));
      $("size").value = state.look.size;
      return;
    }
    if (!drag) return;
    const [x, y] = toCanvas(e);
    state.look.x = Math.min(0.97, Math.max(0.03, drag.px + (x - drag.x) / canvas.width));
    state.look.y = Math.min(0.97, Math.max(0.03, drag.py + (y - drag.y) / canvas.height));
  });
  const end = (e) => {
    pts.delete(e.pointerId);
    if (drag || pinch) save();
    if (pts.size < 2) pinch = null;
    if (!pts.size) drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

// ---- 見本（はじめの画面）。短いほうを 540 にして軽く ----
let previewBox = null;
function sizePreview() {
  const [w, h] = ASPECTS[state.aspect];
  $("preview").width = w / 2;
  $("preview").height = h / 2;
}

// 動き（カウントアップ・ぽよん）を、はじめから見せなおす
let motionStart = performance.now();
const restartMotion = () => (motionStart = performance.now());

function bindSetup() {
  document.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      state.mode = b.dataset.mode;
      save();
      renderAll();
    })
  );
  document.querySelectorAll("[data-dtab]").forEach((b) =>
    b.addEventListener("click", () => {
      state.designTab = b.dataset.dtab;
      save();
      renderDesignTab();
    })
  );
  $("name").value = state.name;
  $("memo").value = state.memo;
  $("saveRaw").checked = state.saveRaw;
  $("saveRaw").addEventListener("change", () => {
    state.saveRaw = $("saveRaw").checked;
    save();
    toast(state.saveRaw ? "加工なしの元の写真・動画も残します" : "文字・スタンプ入りだけ残します");
  });
  $("memo").addEventListener("input", () => {
    state.memo = $("memo").value;
    save();
    renderExamples();
  });
  for (const id of ["bTime", "bWeight", "bLength"]) {
    $(id).value = state[id];
    $(id).addEventListener("input", () => {
      state[id] = $(id).value.trim();
      save();
      renderStatsMeta();
    });
  }
  renderStatsMeta();
  $("birth").value = state.birth;
  $("due").value = state.due;
  $("since").value = state.since;
  $("sinceTitle").value = state.sinceTitle;
  $("sinceTitle").addEventListener("input", () => {
    state.sinceTitle = $("sinceTitle").value.trim();
    save();
    renderToday();
    renderCalendar();
  });
  $("dayOne").checked = state.dayOne;
  $("name").addEventListener("input", () => {
    state.name = $("name").value.trim();
    save();
    renderToday();
    renderCalendar();
  });
  for (const id of ["birth", "due", "since"]) {
    $(id).addEventListener("change", () => {
      state[id] = $(id).value;
      save();
      renderToday();
      renderCalendar();
    });
  }
  $("day").addEventListener("change", () => {
    state.day = $("day").value === todayStr() ? "" : $("day").value;
    renderAll();
  });
  $("dayToday").addEventListener("click", () => {
    state.day = "";
    renderAll();
  });
  $("dayOne").addEventListener("change", () => {
    state.dayOne = $("dayOne").checked;
    save();
    renderToday();
    renderCalendar();
  });
  $("size").addEventListener("input", () => {
    state.look.size = Number($("size").value);
    save();
  });
  $("center").addEventListener("click", () => {
    state.look.x = state.look.y = null;
    state.look.size = 1;
    lookChanged();
  });
  attachDrag($("preview"), () => previewBox);
  // 入力中は下の帯を隠す（キーボードと重ならないように。Q キットの body.is-typing）
  document.addEventListener("focusin", (e) => e.target.matches("input:not([type=range]):not([type=checkbox])") && document.body.classList.add("is-typing"));
  document.addEventListener("focusout", () => document.body.classList.remove("is-typing"));
}

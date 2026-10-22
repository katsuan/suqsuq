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
}

function renderFormats() {
  const box = $("fmtChips");
  box.replaceChildren();
  const key = state.mode === "womb" ? "fmtWomb" : "fmtBorn";
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
      if (confirm(`マイテンプレート「${m.name}」を消しますか？`)) {
        state.myLooks.splice(i, 1);
        lookChanged();
      }
    };
    b.addEventListener("contextmenu", del);
    b.addEventListener("pointerdown", () => (hold = setTimeout(() => del(new Event("x")), 700)));
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(hold)));
    my.append(b);
  });
  if (state.myLooks.length < 8) {
    my.append(chip("＋ いまの形を保存", false, () => {
      const name = prompt("名前をつけてください（例：100日の記念）", `${tplOf(look.tpl).label}${state.myLooks.length + 1}`);
      if (!name) return;
      state.myLooks.push({ name: name.slice(0, 12), look: JSON.parse(JSON.stringify(look)) });
      lookChanged();
      toast("マイテンプレートに保存しました（長押しで消せます）");
    }, "is-add"));
  }
}

// いまの数え（大きく）と、つぎの節目
function renderToday() {
  const L = countLabel();
  const box = $("today");
  if (!L) {
    box.innerHTML = `<p class="ls-hint">${state.mode === "womb" ? "出産予定日" : "生まれた日"}を入れると、ここに数えた日が出ます。</p>`;
    return;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  box.innerHTML =
    `<p class="today-main">${state.day ? "その日は" : "きょうは"} <span>${esc(L.top)}</span> <b>${esc(L.big)}</b><span>${esc(L.unit)}</span> <span>${esc(L.small)}</span></p>` +
    `<p class="ls-hint">${esc(nextMilestone())}</p>`;
}

function renderMode() {
  document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === state.mode)));
  document.querySelectorAll("[data-mode-only]").forEach((el) => (el.hidden = el.dataset.modeOnly !== state.mode));
}

function renderAll() {
  renderMode();
  renderFormats();
  renderDesign();
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
  $("name").value = state.name;
  $("birth").value = state.birth;
  $("due").value = state.due;
  $("dayOne").checked = state.dayOne;
  $("name").addEventListener("input", () => {
    state.name = $("name").value.trim();
    save();
    renderToday();
    renderCalendar();
  });
  for (const id of ["birth", "due"]) {
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

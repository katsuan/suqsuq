// 撮る画面：カメラの映像（または選んだ写真）に文字・スタンプを重ねて、写真か動画にする。
// 写真：同じ絵を大きなキャンバスに止まった形で描いて画像に。動画：表示しているキャンバス（＋音）を MediaRecorder で録る。
"use strict";

const camVideo = document.createElement("video");
camVideo.muted = true;
camVideo.playsInline = true;
camVideo.setAttribute("playsinline", "");

let camStream = null; // カメラ
let picked = null; // 選んだ写真（img）。あればカメラの代わりに使う
let stageBox = null; // 文字の範囲（ドラッグ用）
let recorder = null;
let rawRecorder = null; // 加工なしの元の動画（設定でオンのとき）
let recStart = 0;
let micStream = null;
let wakeLock = null;
let lastResult = null; // { blob, name, url }

const source = () => picked || (camStream ? camVideo : null);
const mirrored = () => !picked && state.facing === "user";

// 映像を、上下のボタンのあいだの欄に収める（縦横の比はそのまま）
function fitStage() {
  const box = document.querySelector(".shoot-stage").getBoundingClientRect();
  const c = $("stage");
  if (!box.width || !box.height) return;
  const s = Math.min((box.width - 16) / c.width, box.height / c.height);
  c.style.width = `${Math.floor(c.width * s)}px`;
  c.style.height = `${Math.floor(c.height * s)}px`;
  $("guide").style.width = c.style.width; // 構図のガイドも同じ大きさで重ねる
  $("guide").style.height = c.style.height;
}
window.addEventListener("resize", fitStage);
window.visualViewport?.addEventListener("resize", fitStage);

function sizeStage() {
  const [w, h] = ASPECTS[state.aspect];
  $("stage").width = w;
  $("stage").height = h;
  $("aspect").textContent = state.aspect;
  sizePreview();
  fitStage();
}

async function startCamera() {
  stopCamera();
  $("shootMsg").hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) {
    showShootMsg("この画面ではカメラを使えません。🖼 で写真を選べます。");
    return;
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    camVideo.srcObject = camStream;
    await camVideo.play().catch(() => {});
  } catch (err) {
    camStream = null;
    showShootMsg("カメラを使えませんでした（カメラの許可を確かめてください）。🖼 で写真を選べます。");
  }
}
function stopCamera() {
  camStream?.getTracks().forEach((t) => t.stop());
  camStream = null;
  camVideo.srcObject = null;
}
function showShootMsg(text) {
  $("shootMsg").textContent = text;
  $("shootMsg").hidden = false;
}

function openShoot() {
  $("setup").hidden = true;
  $("setupBar").hidden = true;
  $("shoot").hidden = false;
  document.body.classList.add("is-shooting");
  sizeStage();
  requestAnimationFrame(fitStage); // 画面を出してから、欄の大きさを測る
  renderKind();
  restartMotion();
  if (!picked) startCamera();
  if (!countLabel()) toast(`${state.mode === "womb" ? "出産予定日" : "生まれた日"}を入れると、数字が入ります`);
  // はじめてのときだけ「文字は指で動かせます」
  try {
    if (!localStorage.getItem("suqsuq:dragHint")) {
      $("dragHint").hidden = false;
      setTimeout(() => ($("dragHint").hidden = true), 3500);
      localStorage.setItem("suqsuq:dragHint", "1");
    }
  } catch {}
}
function closeShoot() {
  if (recorder) return;
  cancelCountdown();
  closeDesign();
  stopCamera();
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  picked = null;
  $("shoot").hidden = true;
  $("setup").hidden = false;
  $("setupBar").hidden = false;
  document.body.classList.remove("is-shooting");
}

// 写真を選ぶ（撮った写真にあとから入れる。動画にすれば、写真の上でスタンプが動く短い動画になる）
function pickPhoto() {
  if (recorder) return;
  $("pickFile").value = "";
  $("pickFile").click();
}
$("pickFile").addEventListener("change", () => {
  const file = $("pickFile").files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    picked = img;
    stopCamera();
    $("shootMsg").hidden = true;
    if ($("shoot").hidden) openShoot();
    toast("選んだ写真に入れます（🔄 でカメラにもどる）");
  };
  img.onerror = () => toast("この写真は開けませんでした");
  img.src = URL.createObjectURL(file);
});

function renderKind() {
  document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind)));
  $("shutter").classList.toggle("is-video", state.kind === "video");
  $("shutter").setAttribute("aria-label", state.kind === "video" ? "録画をはじめる" : "撮る");
  $("sound").hidden = state.kind !== "video";
  $("sound").textContent = state.sound ? "🎙" : "🔇";
  $("sound").setAttribute("aria-label", state.sound ? "音も録る（押すと音なし）" : "音なし（押すと音も録る）");
}

// ---- 写真 ----
function fileName(ext, suffix = "") {
  const L = countLabel();
  const tag = L ? `${L.big}${L.unit}${L.small}`.replace(/\s/g, "") : "";
  return `suqsuq${state.name ? "-" + state.name : ""}${tag ? "-" + tag : ""}-${(state.day || todayStr()).replace(/-/g, "")}${suffix ? "-" + suffix : ""}.${ext}`;
}
function takePhoto() {
  const [w, h] = ASPECTS[state.aspect];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  drawScene(c.getContext("2d"), w, h, { src: source(), mirror: mirrored(), t: 0, look: state.look, label: countLabel(), still: true });
  const raw = rawPhotoCanvas(); // 文字を描く前の、同じ瞬間の映像
  flash();
  const toBlob = (cv) => new Promise((ok) => (cv ? cv.toBlob(ok, "image/jpeg", 0.95) : ok(null)));
  Promise.all([toBlob(c), toBlob(raw)]).then(([blob, rawBlob]) => {
    if (blob) showResult(blob, fileName("jpg"), rawBlob && { blob: rawBlob, name: fileName("jpg", "raw") });
  });
}
// 加工なしの元の写真：カメラの映像そのもの（元の大きさ・切らない・左右もそのまま）。カメラのときで、設定がオンのときだけ
function rawPhotoCanvas() {
  if (!state.saveRaw || picked || !camStream || !camVideo.videoWidth) return null;
  const c = document.createElement("canvas");
  c.width = camVideo.videoWidth;
  c.height = camVideo.videoHeight;
  c.getContext("2d").drawImage(camVideo, 0, 0);
  return c;
}
function flash() {
  const st = $("stage");
  st.classList.remove("is-flash");
  void st.offsetWidth;
  st.classList.add("is-flash");
}

// ---- 動画 ----
function pickMimeType() {
  const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
}
async function startRecording() {
  if (!window.MediaRecorder || !$("stage").captureStream) {
    toast("この画面では動画を録れません（写真はとれます）");
    return;
  }
  const stream = $("stage").captureStream(30);
  if (state.sound && !picked) {
    try {
      micStream = micStream || (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }));
      micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      toast("マイクを使えないので、音なしで録ります");
    }
  }
  const main = makeRecorder(stream, 8_000_000);
  recorder = main.rec;
  // 加工なしの元の動画：カメラの映像（＋同じ音）を、もう1つの録画でそのまま録る（設定がオンで、カメラのとき）
  let raw = null;
  if (state.saveRaw && !picked && camStream) {
    const rawStream = new MediaStream([...camStream.getVideoTracks(), ...stream.getAudioTracks()]);
    try {
      raw = makeRecorder(rawStream, 10_000_000);
      rawRecorder = raw.rec;
    } catch {
      raw = null;
    }
  }
  Promise.all([main.done, raw ? raw.done : null]).then(([blob, rawBlob]) => {
    recorder = rawRecorder = null;
    renderRecording();
    const ext = (b) => (b.type.includes("mp4") ? "mp4" : "webm");
    showResult(blob, fileName(ext(blob)), rawBlob && { blob: rawBlob, name: fileName(ext(rawBlob), "raw") });
  });
  restartMotion(); // 動き（カウントアップ・ぽよん）は録りはじめから
  recorder.start(1000);
  rawRecorder?.start(1000);
  recStart = performance.now();
  renderRecording();
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {}
}
// 録画を1つ作る。done は止まったときの動画（Blob）
function makeRecorder(stream, bits) {
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: bits });
  const parts = [];
  rec.addEventListener("dataavailable", (e) => e.data.size && parts.push(e.data));
  const done = new Promise((ok) => rec.addEventListener("stop", () => ok(new Blob(parts, { type: rec.mimeType || parts[0]?.type || "video/webm" }))));
  return { rec, done };
}
function stopRecording() {
  if (recorder?.state === "inactive") return;
  recorder?.stop();
  if (rawRecorder?.state !== "inactive") rawRecorder?.stop();
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}
function renderRecording() {
  const on = !!recorder;
  $("shoot").classList.toggle("is-recording", on);
  $("recTime").hidden = !on;
  $("shutter").setAttribute("aria-label", on ? "録画を止める" : state.kind === "video" ? "録画をはじめる" : "撮る");
  if (on) closeDesign();
}

// ---- セルフタイマー ----
let countdown = 0;
function renderTimer() {
  $("timerBtn").querySelector("small").textContent = state.timer ? `${state.timer}秒` : "なし";
  $("timerBtn").classList.toggle("is-on", !!state.timer);
}
function startCountdown(sec, go) {
  let left = sec;
  $("countdown").textContent = left;
  $("countdown").hidden = false;
  $("shoot").classList.add("is-counting");
  countdown = setInterval(() => {
    left -= 1;
    if (left > 0) return ($("countdown").textContent = left);
    cancelCountdown();
    go();
  }, 1000);
}
function cancelCountdown() {
  clearInterval(countdown);
  countdown = 0;
  $("countdown").hidden = true;
  $("shoot").classList.remove("is-counting");
}

// ---- できた写真・動画 ----
let lastRaw = null; // 加工なしの元の写真・動画 { blob, name }
function showResult(blob, name, raw = null) {
  if (lastResult) URL.revokeObjectURL(lastResult.url);
  lastRaw = raw;
  $("rawRow").hidden = !raw;
  $("rawKind").textContent = blob.type.startsWith("video") ? "動画" : "写真";
  const url = URL.createObjectURL(blob);
  lastResult = { blob, name, url };
  const media = $("resultMedia");
  media.replaceChildren();
  if (blob.type.startsWith("video")) {
    const v = document.createElement("video");
    Object.assign(v, { src: url, controls: true, playsInline: true, loop: true, autoplay: true, muted: true });
    v.setAttribute("playsinline", "");
    media.append(v);
  } else {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "できた写真";
    media.append(img);
  }
  const file = new File([blob], name, { type: blob.type });
  const canShare = !!navigator.canShare?.({ files: [file] });
  $("share").hidden = !canShare;
  $("download").href = url;
  $("download").download = name;
  $("download").classList.toggle("is-primary", !canShare);
  $("result").hidden = false;
}
$("share").addEventListener("click", async () => {
  if (!lastResult) return;
  const file = new File([lastResult.blob], lastResult.name, { type: lastResult.blob.type });
  try {
    await navigator.share({ files: [file] });
    toast("✓ 共有できました");
  } catch (err) {
    if (err?.name !== "AbortError") toast("共有できませんでした。⬇️ で保存してください");
  }
});
// 加工なしも保存：共有できる端末は共有メニュー（写真へ保存など）、できなければダウンロード
$("rawSave").addEventListener("click", async () => {
  if (!lastRaw) return;
  const file = new File([lastRaw.blob], lastRaw.name, { type: lastRaw.blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      toast("✓ 加工なしも保存できました");
    } catch (err) {
      if (err?.name !== "AbortError") toast("共有できませんでした");
    }
    return;
  }
  const url = URL.createObjectURL(lastRaw.blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: lastRaw.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});
$("again").addEventListener("click", () => {
  $("result").hidden = true;
  $("resultMedia").replaceChildren();
});

// ---- 文字の形のシート（はじめの画面の #design を移す） ----
function openDesign() {
  $("designSlot").append($("design"));
  $("designSheet").hidden = false;
}
function closeDesign() {
  if ($("designSheet").hidden) return;
  $("designSheet").hidden = true;
  $("preview").closest(".ls-panel").append($("design"));
}

function bindShoot() {
  $("cameraOpen").addEventListener("click", () => {
    picked = null;
    openShoot();
  });
  $("pickOpen").addEventListener("click", pickPhoto);
  $("shootPick").addEventListener("click", pickPhoto);
  $("shootHome").addEventListener("click", closeShoot);
  $("flip").addEventListener("click", () => {
    if (recorder) return;
    if (picked) picked = null; // 写真からカメラへもどる
    else state.facing = state.facing === "user" ? "environment" : "user";
    save();
    startCamera();
  });
  $("aspect").addEventListener("click", () => {
    if (recorder) return;
    state.aspect = ASPECT_ORDER[(ASPECT_ORDER.indexOf(state.aspect) + 1) % ASPECT_ORDER.length];
    save();
    sizeStage();
  });
  document.querySelectorAll("[data-kind]").forEach((b) =>
    b.addEventListener("click", () => {
      if (recorder) return;
      state.kind = b.dataset.kind;
      save();
      renderKind();
      restartMotion();
    })
  );
  $("shutter").addEventListener("click", () => {
    if (countdown) return cancelCountdown(); // タイマーの途中で押したら、やめる
    if (recorder) return stopRecording();
    const go = state.kind === "photo" ? takePhoto : startRecording;
    if (state.timer) startCountdown(state.timer, go);
    else go();
  });
  // セルフタイマー：なし → 3秒 → 10秒（写真も、動画の録りはじめも）
  $("timerBtn").addEventListener("click", () => {
    state.timer = state.timer === 0 ? 3 : state.timer === 3 ? 10 : 0;
    save();
    renderTimer();
    toast(state.timer ? `⏱ ${state.timer}秒後に${state.kind === "photo" ? "撮ります" : "録りはじめます"}` : "セルフタイマーなし");
  });
  renderTimer();
  // 構図のガイド：前に撮った写真を選んで、うっすら重ねる（同じ向き・同じ大きさで撮りやすく）。もう一度押すと消す
  $("guideBtn").addEventListener("click", () => {
    if (!$("guide").hidden) {
      $("guide").hidden = true;
      $("guide").removeAttribute("src");
      $("guideBtn").classList.remove("is-on");
      return;
    }
    $("guideFile").value = "";
    $("guideFile").click();
  });
  $("guideFile").addEventListener("change", () => {
    const file = $("guideFile").files?.[0];
    if (!file) return;
    $("guide").src = URL.createObjectURL(file);
    $("guide").hidden = false;
    $("guideBtn").classList.add("is-on");
    fitStage();
    toast("前の写真をうっすら重ねました（写真・動画には入りません）");
  });
  $("sound").addEventListener("click", () => {
    if (recorder) return;
    state.sound = !state.sound;
    save();
    renderKind();
    toast(state.sound ? "🎙 音も録ります" : "🔇 音なしで録ります");
  });
  $("designOpen").addEventListener("click", () => ($("designSheet").hidden ? openDesign() : closeDesign()));
  $("designClose").addEventListener("click", closeDesign);
  attachDrag($("stage"), () => stageBox, () => ($("dragHint").hidden = true));
  // 別のアプリに切りかえたら、録画を止める（映像が止まるので）
  document.addEventListener("visibilitychange", () => document.hidden && recorder && stopRecording());
}

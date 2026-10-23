// はじめに一度だけ動かすこと（ほかのファイルの関数を使うので、全部読んでから）
"use strict";

bindSetup();
bindShoot();
bindCalendar();
sizeStage();
renderAll();
fontsReady.then(renderAll);
if (fromLink) save();
// 開いたまま日付が変わって戻ってきたら、「きょう」の数えを描きなおす
let shownDay = todayStr();
document.addEventListener("visibilitychange", () => {
  if (document.hidden || shownDay === todayStr()) return;
  shownDay = todayStr();
  renderAll();
});
// Q キット（ui.js）は defer なので、読み終わってから知らせ・はじめての案内を出す
document.addEventListener("DOMContentLoaded", () => {
  if (fromLink) toast(`リンクから${fromLink}を入れました`);
  window.LineShareUI?.firstTip(
    "suqsuq",
    ["生まれた日（おなかの中なら出産予定日）を入れると、数字が入ります", "🎨 で文字の形を選べます。見本の文字は指で動かせます", "📷 で撮るか 🖼 で写真を選ぶと、数字入りで残せます。写真はこの端末の中だけで作ります"],
    document.querySelector(".ls-tabs")
  );
});

// 毎フレーム描く：見えているほう（見本か撮る画面）だけ
function frame(now) {
  const t = (now - motionStart) / 1000;
  const label = countLabel();
  if (!$("shoot").hidden) {
    const c = $("stage");
    stageBox = drawScene(c.getContext("2d"), c.width, c.height, { src: source(), mirror: mirrored(), t, look: state.look, label });
    if (recorder) $("recTime").textContent = clock(Math.floor((now - recStart) / 1000));
  } else {
    const c = $("preview");
    // 見本はピーチの背景。日付がまだないときは、見本の数字で
    previewBox = drawScene(c.getContext("2d"), c.width, c.height, { src: null, t, look: state.look, label: label || SAMPLE_LABEL() });
  }
  requestAnimationFrame(frame);
}
// 日付がまだないときの見本の文字
const SAMPLE_LABEL = () => countLabel({ ...state, day: "", birth: "2026-01-01", due: "2026-12-31", since: "2026-01-01", ...(state.mode === "womb" ? { day: "2026-07-05" } : { day: "2026-04-10" }) });
requestAnimationFrame(frame);

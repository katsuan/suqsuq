// はじめに一度だけ動かすこと（ほかのファイルの関数を使うので、全部読んでから）
"use strict";

bindSetup();
bindShoot();
sizeStage();
renderAll();
fontsReady.then(renderAll);

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
const SAMPLE_LABEL = () => countLabel({ ...state, day: "", birth: "2026-01-01", due: "2026-12-31", ...(state.mode === "born" ? { day: "2026-04-10" } : { day: "2026-07-05" }) });
requestAnimationFrame(frame);

// 前の名前のファイル（2026-11-25 ごろ消す）。新しいファイル（js/count.js・js/store.js・js/link.js・js/ui.js）を読むだけ
// 前の index.html を覚えているブラウザ（LINE の中など）でも開けるように
["js/count.js", "js/store.js", "js/link.js", "js/ui.js"].forEach(function (src) {
  document.write('<script src="' + src + '"><\/script>');
});

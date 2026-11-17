// すくすく：画面・カレンダーの予定に出す名前（自分の名前と、つなぐツールの名前）。名前はここにだけ書き、ほかは NAMES から読む
// index.html でいちばん先に読む。直書きがないかは q-dev の test/service-names.test.mjs が見る（なかまの名前は q-oqrn の data/hub-links.json と同じか）
"use strict";

// <service-names>
const NAMES = {
  app: "すくすく",
  en: "SuQSuQ",
  qronos: "くろのす"
};
// </service-names>

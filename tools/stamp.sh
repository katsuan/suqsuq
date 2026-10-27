#!/bin/sh
# 公開する前に、読み込むファイルに版の番号（?v=UTC の年月日時分）を付け直す。
# 付けないと、スマホのブラウザ・LINE の中のブラウザが前のロゴ・アイコン・JS・CSS を使いつづけて、直したのに変わらないことがある。
#   JS・CSS はおくるんの tools/qstamp.py、ロゴ・アイコンの画像はここで。
# 使い方（このフォルダで）: sh tools/stamp.sh
set -e
cd "$(dirname "$0")/.."
python3 ../q-oqrn/tools/qstamp.py index.html
# ロゴ・アイコンも、qstamp.py が JS・CSS に付けたのと同じ版にそろえる（前より大きい値を qstamp.py が決める）
V=$(grep -oE 'app\.js\?v=[0-9]+' index.html | head -1 | sed 's/.*v=//')
sed -i '' -E "s#(src|href)=\"(logo\.svg|icon\.svg|icon-32\.png|apple-touch-icon\.png)(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" index.html
echo "ロゴ・アイコン: ?v=$V"

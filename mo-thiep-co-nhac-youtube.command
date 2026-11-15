#!/bin/bash
cd "$(dirname "$0")" || exit 1
PORT=8828
echo "Đang mở thiệp cưới Thu Trang & Long Vũ tại http://localhost:$PORT ..."
(sleep 1 && open "http://localhost:$PORT/") &
python3 -m http.server "$PORT"
